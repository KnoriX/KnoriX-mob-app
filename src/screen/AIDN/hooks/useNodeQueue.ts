import { useReducer, useCallback } from 'react';
import { AIDNNode } from '../types/node.types';
import { RendererNode } from '../types/node.types';
import { parseNodes, patchNode, parseNode } from '../utils/nodeParser';

// ─── State & Actions ──────────────────────────────────────────────────────

interface NodeQueueState {
  nodes: Record<string, RendererNode>; // id → node (O(1) lookup)
  orderedIds: string[];                // ordered array of ids for render order
}

type NodeQueueAction =
  | { type: 'INIT'; raw: unknown[] }
  | { type: 'ADD'; node: AIDNNode }
  | { type: 'UPDATE'; nodeId: string; patch: Partial<AIDNNode> }
  | { type: 'REMOVE'; nodeId: string }
  | { type: 'SET_STATUS'; nodeId: string; status: RendererNode['status'] }
  | { type: 'RESET' };

function reducer(state: NodeQueueState, action: NodeQueueAction): NodeQueueState {
  switch (action.type) {
    case 'INIT': {
      const parsed = parseNodes(action.raw);
      const nodes: Record<string, RendererNode> = {};
      const orderedIds: string[] = [];
      for (const n of parsed) {
        nodes[n.id] = { ...n, status: 'pending' };
        orderedIds.push(n.id);
      }
      return { nodes, orderedIds };
    }

    case 'ADD': {
      if (state.nodes[action.node.id]) return state; // dedupe
      const rendererNode: RendererNode = { ...action.node, status: 'pending' };
      const newNodes = { ...state.nodes, [action.node.id]: rendererNode };
      // Insert at correct position by order field
      const newIds = [...state.orderedIds, action.node.id].sort(
        (a, b) => (newNodes[a]?.order ?? 0) - (newNodes[b]?.order ?? 0),
      );
      return { nodes: newNodes, orderedIds: newIds };
    }

    case 'UPDATE': {
      const existing = state.nodes[action.nodeId];
      if (!existing) return state;
      const updated = patchNode(existing, action.patch) as RendererNode;
      return { ...state, nodes: { ...state.nodes, [action.nodeId]: updated } };
    }

    case 'REMOVE': {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.nodeId]: _removed, ...remaining } = state.nodes;
      return {
        nodes: remaining,
        orderedIds: state.orderedIds.filter(id => id !== action.nodeId),
      };
    }

    case 'SET_STATUS': {
      const node = state.nodes[action.nodeId];
      if (!node) return state;
      return {
        ...state,
        nodes: { ...state.nodes, [action.nodeId]: { ...node, status: action.status } },
      };
    }

    case 'RESET':
      return { nodes: {}, orderedIds: [] };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useNodeQueue() {
  const [state, dispatch] = useReducer(reducer, { nodes: {}, orderedIds: [] });

  const initFromRaw = useCallback((rawNodes: unknown[]) => {
    dispatch({ type: 'INIT', raw: rawNodes });
  }, []);

  const addNode = useCallback((rawNode: Record<string, unknown>) => {
    const parsed = parseNode(rawNode);
    if (parsed) dispatch({ type: 'ADD', node: parsed });
  }, []);

  const updateNode = useCallback((nodeId: string, patch: Partial<AIDNNode>) => {
    dispatch({ type: 'UPDATE', nodeId, patch });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: 'REMOVE', nodeId });
  }, []);

  const setNodeStatus = useCallback((nodeId: string, status: RendererNode['status']) => {
    dispatch({ type: 'SET_STATUS', nodeId, status });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    nodes: state.nodes,
    orderedIds: state.orderedIds,
    nodeList: state.orderedIds.map(id => state.nodes[id]).filter(Boolean) as RendererNode[],
    initFromRaw,
    addNode,
    updateNode,
    removeNode,
    setNodeStatus,
    reset,
  };
}
