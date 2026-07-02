// ─────────────────────────────────────────────────────────────
// hooks/useRealtimeSession.ts
// Orchestrates WS events → state for RealtimeNode
// FastAPI used for heavy calls: hint, chat submit
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RealtimePayload,
  RealtimeMode,
  QAMessage,
  WhiteboardCommand,
  RealtimeWSEvent,
} from '../types/realtime.types';

// ─── State shape ─────────────────────────────────────────────

export interface RealtimeState {
  mode: RealtimeMode;

  // Mentor stream
  streamedText: string;
  isThinking: boolean;
  isStreaming: boolean;
  isPaused: boolean;

  // Whiteboard
  wbCommands: WhiteboardCommand[];

  // QA Chat
  messages: QAMessage[];
  quickReplies: string[];
  isSending: boolean;

  // Common
  isDone: boolean;
  error: string | null;
}

const initialState = (mode: RealtimeMode): RealtimeState => ({
  mode,
  streamedText: '',
  isThinking: false,
  isStreaming: false,
  isPaused: false,
  wbCommands: [],
  messages: [],
  quickReplies: [],
  isSending: false,
  isDone: false,
  error: null,
});

// ─── Hook ────────────────────────────────────────────────────

export function useRealtimeSession(
  payload: RealtimePayload,
  /** Already-connected WebSocket from useWebSocket hook */
  ws: WebSocket | null,
  onDone: () => void,
) {
  const [state, setState] = useState<RealtimeState>(initialState(payload.mode));
  const streamBufferRef = useRef('');
  const pausedRef = useRef(false);
  const pendingTokensRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Token drip (smooth streaming even when WS bursts) ──

  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      if (pendingTokensRef.current.length === 0) return;
      const next = pendingTokensRef.current.shift()!;
      setState(s => ({ ...s, streamedText: s.streamedText + next }));
    }, 18); // ~55 chars/sec — readable speed

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, []);

  // ─── WS message handler ──────────────────────────────────

  const handleWSMessage = useCallback(
    (raw: RealtimeWSEvent) => {
      switch (raw.event) {

        case 'rt_thinking':
          setState(s => ({ ...s, isThinking: raw.data.active, isStreaming: !raw.data.active }));
          break;

        case 'rt_token':
          setState(s => ({ ...s, isThinking: false, isStreaming: true }));
          // Buffer tokens → drip timer releases them smoothly
          pendingTokensRef.current.push(raw.data.token);
          if (raw.data.flush) {
            // Fast-flush remaining buffer on paragraph end
            pendingTokensRef.current.push('\n');
          }
          break;

        case 'rt_stream_done':
          // Drain remaining buffer instantly then mark done
          setState(s => ({
            ...s,
            streamedText: s.streamedText + pendingTokensRef.current.join(''),
            isStreaming: false,
            isThinking: false,
          }));
          pendingTokensRef.current = [];
          break;

        case 'rt_wb_cmd':
          setState(s => ({ ...s, wbCommands: [...s.wbCommands, raw.data] }));
          break;

        case 'rt_qa_msg':
          setState(s => ({ ...s, messages: [...s.messages, raw.data], isSending: false }));
          break;

        case 'rt_quick_replies':
          setState(s => ({ ...s, quickReplies: raw.data.replies }));
          break;

        case 'rt_switch_mode':
          setTimeout(() => {
            setState(s => ({
              ...s,
              mode: raw.data.switchTo,
              // Reset sub-state for new mode
              streamedText: '',
              wbCommands: [],
              quickReplies: [],
            }));
          }, raw.data.transitionMs ?? 300);
          break;

        case 'rt_node_done':
          setState(s => ({ ...s, isDone: true }));
          onDone();
          break;
      }
    },
    [onDone],
  );

  // ─── Attach listener to WS ───────────────────────────────

  useEffect(() => {
    if (!ws) return;
    const listener = (e: MessageEvent) => {
      try {
        const parsed: RealtimeWSEvent = JSON.parse(e.data);
        handleWSMessage(parsed);
      } catch {
        // non-RT event — ignore
      }
    };
    ws.addEventListener('message', listener);
    return () => ws.removeEventListener('message', listener);
  }, [ws, handleWSMessage]);

  // ─── Actions ─────────────────────────────────────────────

  const sendWS = useCallback(
    (data: object) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    },
    [ws],
  );

  const pause = useCallback(() => {
    pausedRef.current = true;
    setState(s => ({ ...s, isPaused: true }));
    sendWS({ event: 'rt_interrupt', data: { sessionId: payload.sessionId } });
  }, [payload.sessionId, sendWS]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState(s => ({ ...s, isPaused: false }));
    sendWS({ event: 'rt_resume', data: { sessionId: payload.sessionId } });
  }, [payload.sessionId, sendWS]);

  const skip = useCallback(() => {
    sendWS({ event: 'rt_node_skip', data: { sessionId: payload.sessionId } });
    setState(s => ({ ...s, isDone: true }));
    onDone();
  }, [payload.sessionId, sendWS, onDone]);

  const sendQuickReply = useCallback(
    (reply: string) => {
      setState(s => ({ ...s, quickReplies: [], isSending: true }));
      sendWS({ event: 'rt_quick_reply', data: { sessionId: payload.sessionId, reply } });
    },
    [payload.sessionId, sendWS],
  );

  /** Heavy chat submit — goes via FastAPI, not WS */
  const sendStudentMessage = useCallback(
    async (text: string) => {
      setState(s => ({
        ...s,
        isSending: true,
        messages: [
          ...s.messages,
          { id: Date.now().toString(), role: 'student', text, timestamp: Date.now() },
        ],
      }));
      try {
        await fetch(`${payload.apiBaseUrl}/realtime/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: payload.sessionId, text }),
        });
        // AI response comes back via WS rt_qa_msg
      } catch {
        setState(s => ({ ...s, isSending: false, error: 'Message failed. Try again.' }));
      }
    },
    [payload.sessionId, payload.apiBaseUrl],
  );

  return { state, pause, resume, skip, sendQuickReply, sendStudentMessage };
}
