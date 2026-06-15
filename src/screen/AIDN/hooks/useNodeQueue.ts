import { useCallback, useReducer, useRef } from 'react';
import { validateNode, AnyNodeData } from '../registry/nodeRegistry';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NodeQueueState {
  queue:      AnyNodeData[];   // pending nodes
  current:    AnyNodeData | null;
  history:    AnyNodeData[];   // completed nodes
  isComplete: boolean;         // lesson complete
}

type NodeQueueAction =
  | { type: 'ENQUEUE';  payload: AnyNodeData   }
  | { type: 'COMPLETE'; nodeId: string          }
  | { type: 'RESET'                             }
  | { type: 'LESSON_COMPLETE'                   };

interface UseNodeQueueReturn {
  current:       AnyNodeData | null;
  queue:         AnyNodeData[];
  history:       AnyNodeData[];
  isComplete:    boolean;
  enqueue:       (rawPayload: unknown) => void;
  completeNode:  (nodeId: string) => void;
  reset:         () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const INITIAL_STATE: NodeQueueState = {
  queue:      [],
  current:    null,
  history:    [],
  isComplete: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function nodeQueueReducer(
  state: NodeQueueState,
  action: NodeQueueAction
): NodeQueueState {

  switch (action.type) {

    case 'ENQUEUE': {
      const node = action.payload;

      // If nothing is playing — set as current directly
      if (!state.current) {
        return { ...state, current: node };
      }

      // Otherwise push to queue
      return { ...state, queue: [...state.queue, node] };
    }

    case 'COMPLETE': {
      // Move completed node to history
      const completed = state.current;
      if (!completed || completed.id !== action.nodeId) return state;

      // Pull next from queue
      const [next, ...remaining] = state.queue;

      return {
        ...state,
        current: next ?? null,
        queue:   remaining,
        history: completed ? [...state.history, completed] : state.history,
      };
    }

    case 'LESSON_COMPLETE': {
      return { ...state, isComplete: true };
    }

    case 'RESET': {
      return INITIAL_STATE;
    }

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNodeQueue(): UseNodeQueueReturn {
  const [state, dispatch] = useReducer(nodeQueueReducer, INITIAL_STATE);
  const processedIds      = useRef<Set<string>>(new Set()); // dedupe

  // ── Enqueue — validates + dedupes incoming WebSocket payloads ─────────────

  const enqueue = useCallback((rawPayload: unknown) => {
    const node = validateNode(rawPayload);

    if (!node) {
      console.warn('[useNodeQueue] Invalid node payload — dropped:', rawPayload);
      return;
    }

    // Dedupe — same node id should never render twice
    if (processedIds.current.has(node.id)) {
      console.warn('[useNodeQueue] Duplicate node id — dropped:', node.id);
      return;
    }

    processedIds.current.add(node.id);
    dispatch({ type: 'ENQUEUE', payload: node });
  }, []);

  // ── Complete — called by node when done ───────────────────────────────────

  const completeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'COMPLETE', nodeId });
  }, []);

  // ── Reset — new lesson ────────────────────────────────────────────────────

  const reset = useCallback(() => {
    processedIds.current.clear();
    dispatch({ type: 'RESET' });
  }, []);

  return {
    current:      state.current,
    queue:        state.queue,
    history:      state.history,
    isComplete:   state.isComplete,
    enqueue,
    completeNode,
    reset,
  };
}
