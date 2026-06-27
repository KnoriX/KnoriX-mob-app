import { useCallback, useEffect, useState } from 'react';
import { useNodeQueue } from './useNodeQueue';
import { useWebSocket } from './useWebSocket';
import { fetchLessonPlan } from '../services/lessonService';
import { ServerMessage } from '../types/websocket.types';
import { SOCKET_EVENTS } from '../constants/socketEvents';
import { LessonPlan } from '../types/node.types';

interface UseRendererOptions {
  wsUrl: string;
  lessonId: string;
  studentId: string;
  authToken: string;
}

interface UseRendererReturn {
  nodeList: ReturnType<typeof useNodeQueue>['nodeList'];
  nodes: ReturnType<typeof useNodeQueue>['nodes'];
  orderedIds: ReturnType<typeof useNodeQueue>['orderedIds'];
  connectionState: ReturnType<typeof useWebSocket>['connectionState'];
  lessonPlan: LessonPlan | null;
  isLoading: boolean;
  error: string | null;
  sendInteraction: ReturnType<typeof useWebSocket>['sendInteraction'];
  ackNode: ReturnType<typeof useWebSocket>['ackNode'];
  setNodeStatus: ReturnType<typeof useNodeQueue>['setNodeStatus'];
}

export function useRenderer({
  wsUrl,
  lessonId,
  studentId,
  authToken,
}: UseRendererOptions): UseRendererReturn {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState('');

  const queue = useNodeQueue();

  // ─── Step 1: Fetch initial lesson plan via REST ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        setError(null);
        const plan = await fetchLessonPlan({ lessonId, studentId, authToken });

        if (cancelled) return;

        setLessonPlan(plan);
        setSessionToken(plan.sessionToken);
        queue.initFromRaw(plan.nodes as unknown as unknown[]);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Failed to load lesson';
          setError(msg);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [lessonId, studentId, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Step 2: Handle incoming WS messages ─────────────────────────────────
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.event) {
      case SOCKET_EVENTS.NODE_PUSH:
        queue.addNode(msg.payload as Record<string, unknown>);
        break;

      case SOCKET_EVENTS.NODE_UPDATE:
        queue.updateNode(msg.payload.nodeId, msg.payload.patch);
        break;

      case SOCKET_EVENTS.NODE_REMOVE:
        queue.removeNode(msg.payload.nodeId);
        break;

      case SOCKET_EVENTS.LAYOUT_UPDATE:
        queue.updateNode(msg.payload.nodeId, { layout: msg.payload.layout });
        break;

      case SOCKET_EVENTS.SESSION_END:
        console.log('[AIDN] Session ended:', msg.payload.reason);
        break;

      case SOCKET_EVENTS.ERROR:
        setError(msg.payload.message);
        break;

      default:
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Step 3: Connect WS (enabled only after plan is loaded) ──────────────
  const { connectionState, sendInteraction, ackNode } = useWebSocket({
    url: wsUrl,
    lessonId,
    sessionToken,
    studentId,
    onMessage: handleMessage,
    enabled: !!sessionToken,
  });

  return {
    nodeList: queue.nodeList,
    nodes: queue.nodes,
    orderedIds: queue.orderedIds,
    connectionState,
    lessonPlan,
    isLoading,
    error,
    sendInteraction,
    ackNode,
    setNodeStatus: queue.setNodeStatus,
  };
}
