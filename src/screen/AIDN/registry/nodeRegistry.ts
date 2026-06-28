// ─────────────────────────────────────────────────────────────
// registry/nodeRegistry.ts
// Best of both versions:
// ✅ React.lazy (code-split, faster initial load)
// ✅ Runtime validators (catch bad WS payloads early)
// ✅ resolveNode + validateNode both available
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { NODE_TYPES, NodeType } from '../constants/nodeTypes';
import type { AIDNNode } from '../types/node.types';

// ─── Lazy imports (code-split per module) ────────────────────
// RN Metro bundler splits each into its own chunk → faster TTI

const MarkdownNode  = React.lazy(() => import('../modules/markdown/markdownNode'));
const MCQNode       = React.lazy(() => import('../modules/MCQ/mcqNode'));
const SkiaNode      = React.lazy(() => import('../modules/Skia/skiaNode'));
const KaTeXNode     = React.lazy(() => import('../modules/KaTex/formulaNode'));
const AudioNode     = React.lazy(() => import('../modules/AudioNode'));
const RealtimeNode  = React.lazy(() => import('../modules/websocket/RealtimeNode'));

// Uncomment as you build:
// const VideoNode   = React.lazy(() => import('../modules/video/videoNode'));
// const SVGNode     = React.lazy(() => import('../modules/svg/svgNode'));
// const MermaidNode = React.lazy(() => import('../modules/Mermaid/mermaidNode'));

// ─── Component type ──────────────────────────────────────────

export type NodeComponent = React.ComponentType<{
  node: AIDNNode;
  onDone?: () => void;
  ws?: WebSocket | null;
  dispatcher?: Record<string, unknown>;
}>;

// ─── Runtime validators ──────────────────────────────────────
// Catch malformed backend payloads before they crash the canvas

function isObject(d: unknown): d is Record<string, unknown> {
  return typeof d === 'object' && d !== null;
}

const validators: Record<NodeType, (payload: unknown) => boolean> = {

  [NODE_TYPES.MARKDOWN]: (d) =>
    isObject(d) && typeof d.content === 'string',

  [NODE_TYPES.MCQ]: (d) =>
    isObject(d) &&
    typeof d.question === 'string' &&
    Array.isArray(d.options) &&
    d.options.length >= 2,

  [NODE_TYPES.SKIA]: (d) =>
    isObject(d) && Array.isArray(d.commands),

  [NODE_TYPES.KATEX]: (d) =>
    isObject(d) &&
    (typeof d.latex === 'string' || typeof d.html === 'string'),

  [NODE_TYPES.AUDIO]: (d) =>
    isObject(d) &&
    typeof d.audioFetchUrl === 'string' &&
    typeof d.sessionId === 'string' &&
    Array.isArray(d.timestamps),

  [NODE_TYPES.REALTIME]: (d) =>
    isObject(d) &&
    typeof d.sessionId === 'string' &&
    typeof d.mode === 'string',

  [NODE_TYPES.VIDEO]: (d) =>
    isObject(d) && typeof d.uri === 'string',

  [NODE_TYPES.SVG]: (d) =>
    isObject(d) && typeof d.svgContent === 'string',

  [NODE_TYPES.MERMAID]: (d) =>
    isObject(d) && typeof d.diagram === 'string',
};

// ─── Registry map ─────────────────────────────────────────────

const NODE_REGISTRY: Partial<Record<NodeType, NodeComponent>> = {
  [NODE_TYPES.MARKDOWN]:  MarkdownNode  as unknown as NodeComponent,
  [NODE_TYPES.MCQ]:       MCQNode       as unknown as NodeComponent,
  [NODE_TYPES.SKIA]:      SkiaNode      as unknown as NodeComponent,
  [NODE_TYPES.KATEX]:     KaTeXNode     as unknown as NodeComponent,
  [NODE_TYPES.AUDIO]:     AudioNode     as unknown as NodeComponent,
  [NODE_TYPES.REALTIME]:  RealtimeNode  as unknown as NodeComponent,

  // Uncomment as you build:
  // [NODE_TYPES.VIDEO]:   VideoNode   as unknown as NodeComponent,
  // [NODE_TYPES.SVG]:     SVGNode     as unknown as NodeComponent,
  // [NODE_TYPES.MERMAID]: MermaidNode as unknown as NodeComponent,
};

// ─── Fallback component ───────────────────────────────────────

export const UnknownNodeFallback: NodeComponent = ({ node }) => null;
// Canvas shows its own error UI — this just prevents crash

// ─── Public API ───────────────────────────────────────────────

/**
 * Resolve node type string → lazy component.
 * Returns fallback if type is unregistered.
 */
export function resolveNode(type: string): NodeComponent {
  return (NODE_REGISTRY[type as NodeType] ?? UnknownNodeFallback);
}

/**
 * Validate incoming payload before rendering.
 * Returns true if payload is safe to pass to component.
 * Returns false → canvas shows error state instead of crashing.
 */
export function validatePayload(type: string, payload: unknown): boolean {
  const validator = validators[type as NodeType];
  if (!validator) {
    console.warn(`[NodeRegistry] No validator for type: "${type}"`);
    return false;
  }
  const valid = validator(payload);
  if (!valid) {
    console.warn(`[NodeRegistry] Invalid payload for type: "${type}"`, payload);
  }
  return valid;
}

/**
 * Check if a node type is registered.
 */
export function isNodeSupported(type: string): type is NodeType {
  return type in NODE_REGISTRY;
}

/**
 * Get all registered node types (useful for debugging).
 */
export function getRegisteredTypes(): NodeType[] {
  return Object.keys(NODE_REGISTRY) as NodeType[];
}

export default NODE_REGISTRY;
