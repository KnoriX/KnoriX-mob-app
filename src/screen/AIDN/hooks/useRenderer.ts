import { useCallback, useEffect, useRef, useState } from 'react';
import { useWebSocket }  from './useWebSocket';
import { useNodeQueue }  from './useNodeQueue';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { AnyNodeData }   from '../registry/nodeRegistry';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeedbackState = 'correct' | 'incorrect' | 'partial' | null;

interface RendererState {
  current:       AnyNodeData | null;
  isHandRaised:  boolean;
  isPaused:      boolean;
  feedback:      FeedbackState;
  wsStatus:      'connecting' | 'connected' | 'disconnected' | 'error';
  isComplete:    boolean;
}

interface UseRendererOptions {
  wsUrl:     string;
  lessonId:  string;
  studentId: string;
}

interface UseRendererReturn extends RendererState {
  // Node lifecycle
  handleNodeComplete:  (nodeId: string) => void;

  // Hand raise
  handleHandRaise:     (nodeId: string) => void;
  handleResumeLesson:  () => void;

  // MCQ
  handleMcqSubmit:     (nodeId: string, selectedIds: string[]) => void;

  // WebSocket
  sendMessage:         (msg: object) => void;
  reconnect:           () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useRenderer(options: UseRendererOptions): UseRendererReturn {
  const { wsUrl, lessonId, studentId } = options;

  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [feedback, setFeedback]         = useState<FeedbackState>(null);

  const currentNodeIdRef = useRef<string | null>(null);

  // ── WebSocket ─────────────────────────────────────────────────────────────

  const { status, lastMessage, sendMessage, reconnect } = useWebSocket({
    url: wsUrl,
    onOpen: () => {
      // Identify session on connect
      sendMessage({
        type:      SOCKET_EVENTS.SESSION_INIT,
        lessonId,
        studentId,
      });
    },
  });

  // ── Node Queue ────────────────────────────────────────────────────────────

  const { current, queue, isComplete, enqueue, completeNode, reset } =
    useNodeQueue();

  // ── Handle Incoming WebSocket Messages ────────────────────────────────────

  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {

      // Backend pushes next node
      case SOCKET_EVENTS.NODE_PUSH: {
        enqueue(lastMessage.payload);
        break;
      }

      // Backend sends MCQ feedback
      case SOCKET_EVENTS.MCQ_FEEDBACK: {
        setFeedback(lastMessage.result as FeedbackState);
        break;
      }

      // Backend resumes lesson after doubt solved
      case SOCKET_EVENTS.DOUBT_RESOLVED: {
        setIsHandRaised(false);
        setIsPaused(false);
        break;
      }

      // Backend signals lesson end
      case SOCKET_EVENTS.LESSON_COMPLETE: {
        reset();
        break;
      }

      default:
        break;
    }
  }, [lastMessage]);

  // ── Track current node id ─────────────────────────────────────────────────

  useEffect(() => {
    if (current) {
      currentNodeIdRef.current = current.id;
      // Reset feedback when new node loads
      setFeedback(null);
    }
  }, [current]);

  // ── Node Complete ─────────────────────────────────────────────────────────

  const handleNodeComplete = useCallback((nodeId: string) => {
    completeNode(nodeId);

    // Tell backend — it decides what comes next
    sendMessage({
      type:      SOCKET_EVENTS.NODE_COMPLETE,
      nodeId,
      lessonId,
      studentId,
    });
  }, [completeNode, sendMessage, lessonId, studentId]);

  // ── Hand Raise ────────────────────────────────────────────────────────────

  const handleHandRaise = useCallback((nodeId: string) => {
    setIsHandRaised(true);
    setIsPaused(true);

    sendMessage({
      type:      SOCKET_EVENTS.HAND_RAISE,
      nodeId,
      lessonId,
      studentId,
    });
  }, [sendMessage, lessonId, studentId]);

  const handleResumeLesson = useCallback(() => {
    setIsHandRaised(false);
    setIsPaused(false);

    sendMessage({
      type:      SOCKET_EVENTS.LESSON_RESUME,
      lessonId,
      studentId,
    });
  }, [sendMessage, lessonId, studentId]);

  // ── MCQ Submit ────────────────────────────────────────────────────────────

  const handleMcqSubmit = useCallback((nodeId: string, selectedIds: string[]) => {
    sendMessage({
      type:      SOCKET_EVENTS.MCQ_SUBMIT,
      nodeId,
      selectedIds,
      lessonId,
      studentId,
    });
    // Backend will respond with MCQ_FEEDBACK event
  }, [sendMessage, lessonId, studentId]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    current,
    isHandRaised,
    isPaused,
    feedback,
    wsStatus:           status,
    isComplete,
    handleNodeComplete,
    handleHandRaise,
    handleResumeLesson,
    handleMcqSubmit,
    sendMessage,
    reconnect,
  };
}
