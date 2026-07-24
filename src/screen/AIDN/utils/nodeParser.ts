import { AIDNNode } from '../types/node.types';
import { LAYOUT_MODES, LayoutMode } from '../constants/nodeTypes';
import { isNodeSupported } from '../registry/nodeRegistry';

/**
 * Parse raw backend JSON array into validated AIDNNode[].
 * Invalid nodes are skipped with a console warning (never crash the canvas).
 */
export function parseNodes(raw: unknown): AIDNNode[] {
  if (!Array.isArray(raw)) {
    console.warn('[AIDN] parseNodes: expected array, got', typeof raw);
    return [];
  }

  const nodes: AIDNNode[] = [];

  for (const item of raw) {
    try {
      const node = parseNode(item);
      if (node) nodes.push(node);
    } catch (e) {
      console.warn('[AIDN] parseNodes: skipping invalid node', item, e);
    }
  }

  // Sort by AI-assigned order
  return nodes.sort((a, b) => a.order - b.order);
}

/**
 * Parse and validate a single raw node object.
 */
export function parseNode(raw: Record<string, unknown>): AIDNNode | null {
  if (!raw || typeof raw !== 'object') return null;

  const { id, type, payload, layout, order, transition, meta } = raw as Record<string, unknown>;

  // Required fields
  if (typeof id !== 'string' || !id) {
    console.warn('[AIDN] Node missing id', raw);
    return null;
  }
  if (typeof type !== 'string' || !isNodeSupported(type)) {
    console.warn('[AIDN] Unknown or missing node type:', type);
    return null;
  }
  if (!payload || typeof payload !== 'object') {
    console.warn('[AIDN] Node missing payload', raw);
    return null;
  }

  return {
    id,
    type,
    payload: payload as AIDNNode['payload'],
    layout: isValidLayout(layout) ? layout : LAYOUT_MODES.FULL,
    order: typeof order === 'number' ? order : 0,
    transition: transition === 'none' ? 'none' : 'fade',
    meta: parseMeta(meta),
  };
}

/**
 * Patch-merge an existing node with a partial update from WS.
 */
export function patchNode(existing: AIDNNode, patch: Partial<AIDNNode>): AIDNNode {
  return {
    ...existing,
    ...patch,
    payload: {
      ...existing.payload,
      ...(patch.payload ?? {}),
    },
    meta: {
      ...existing.meta,
      ...(patch.meta ?? {}),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isValidLayout(val: unknown): val is AIDNNode['layout'] {
  return typeof val === 'string' && Object.values(LAYOUT_MODES).includes(val as AIDNNode['layout']);
}

function parseMeta(raw: unknown): AIDNNode['meta'] {
  if (!raw || typeof raw !== 'object') return {};
  const { title, duration, tags } = raw as Record<string, unknown>;
  return {
    title: typeof title === 'string' ? title : undefined,
    duration: typeof duration === 'number' ? duration : undefined,
    tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : undefined,
  };
}
