import { useEffect, useRef, useState, useCallback } from 'react';
import { SOCKET_EVENTS } from '../constants/socketEvents';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsMessage {
  type:     string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  url:              string;
  reconnectDelay?:  number;   // ms — default 2000
  maxRetries?:      number;   // default 5
  onOpen?:          () => void;
  onClose?:         () => void;
  onError?:         (error: Event) => void;
}

interface UseWebSocketReturn {
  status:      ConnectionStatus;
  lastMessage: WsMessage | null;
  sendMessage: (msg: object) => void;
  disconnect:  () => void;
  reconnect:   () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    url,
    reconnectDelay = 2000,
    maxRetries     = 5,
    onOpen,
    onClose,
    onError,
  } = options;

  const [status, setStatus]           = useState<ConnectionStatus>('connecting');
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

  const wsRef          = useRef<WebSocket | null>(null);
  const retriesRef     = useRef(0);
  const manualCloseRef = useRef(false);
  const messageQueue   = useRef<object[]>([]);  // queue if ws not ready yet

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
      onOpen?.();

      // Flush queued messages
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        if (msg) ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (event) => {
      try {
        // Handle binary (audio PCM chunks)
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          setLastMessage({ type: SOCKET_EVENTS.AUDIO_CHUNK, data: event.data });
          return;
        }
        const parsed: WsMessage = JSON.parse(event.data);
        setLastMessage(parsed);
      } catch {
        console.warn('[useWebSocket] Failed to parse message:', event.data);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      onClose?.();

      // Auto reconnect unless manually closed or max retries hit
      if (!manualCloseRef.current && retriesRef.current < maxRetries) {
        retriesRef.current += 1;
        setTimeout(connect, reconnectDelay);
      }
    };

    ws.onerror = (error) => {
      setStatus('error');
      onError?.(error);
    };
  }, [url, reconnectDelay, maxRetries, onOpen, onClose, onError]);

  // ── Init + Cleanup ────────────────────────────────────────────────────────

  useEffect(() => {
    manualCloseRef.current = false;
    connect();

    return () => {
      manualCloseRef.current = true;
      wsRef.current?.close();
    };
  }, [url]);

  // ── Send ──────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      // Queue message — will flush on reconnect
      messageQueue.current.push(msg);
    }
  }, []);

  // ── Manual Controls ───────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    wsRef.current?.close();
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    manualCloseRef.current = false;
    retriesRef.current     = 0;
    wsRef.current?.close();
    connect();
  }, [connect]);

  return { status, lastMessage, sendMessage, disconnect, reconnect };
}
