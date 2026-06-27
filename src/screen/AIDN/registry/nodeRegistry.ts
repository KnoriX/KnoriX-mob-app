import React from 'react';
import { NODE_TYPES, NodeType } from '../constants/nodeTypes';
import { AIDNNode } from '../types/node.types';

// ─── Lazy imports (code-split each module) ────────────────────────────────
// Replace with your actual component imports

const MarkdownNode = React.lazy(() => import('../modules/markdown/markdownNode'));
const MCQNode      = React.lazy(() => import('../modules/MCQ/mcqNode'));
const VideoNode    = React.lazy(() => import('../modules/video/videoNode'));
const KatexNode    = React.lazy(() => import('../modules/KaTex/formulaNode'));
const MermaidNode  = React.lazy(() => import('../modules/Mermaid/mermaidNode'));
const SkiaNode     = React.lazy(() => import('../modules/Skia/skiaNode'));
const SvgNode      = React.lazy(() => import('../modules/svg/svgNode'));
const AudioNode    = React.lazy(() => import('../modules/AudioNode'));
const RealtimeNode = React.lazy(() => import('../modules/websockte/RealtimeNode'));

// ─── Registry map ─────────────────────────────────────────────────────────

type NodeComponent = React.ComponentType<{ node: AIDNNode; onDone?: () => void }>;

const NODE_REGISTRY: Record<NodeType, NodeComponent> = {
  [NODE_TYPES.MARKDOWN]: MarkdownNode as unknown as NodeComponent,
  [NODE_TYPES.MCQ]:      MCQNode      as unknown as NodeComponent,
  [NODE_TYPES.VIDEO]:    VideoNode    as unknown as NodeComponent,
  [NODE_TYPES.KATEX]:    KatexNode    as unknown as NodeComponent,
  [NODE_TYPES.MERMAID]:  MermaidNode  as unknown as NodeComponent,
  [NODE_TYPES.SKIA]:     SkiaNode     as unknown as NodeComponent,
  [NODE_TYPES.SVG]:      SvgNode      as unknown as NodeComponent,
  [NODE_TYPES.AUDIO]:    AudioNode    as unknown as NodeComponent,
  [NODE_TYPES.REALTIME]: RealtimeNode as unknown as NodeComponent,
};

/**
 * Resolve node type string → React component.
 * Returns null if type is unregistered (canvas will show fallback).
 */
export function resolveNode(type: NodeType): NodeComponent | null {
  return NODE_REGISTRY[type] ?? null;
}

/**
 * Check if a node type is supported in the registry.
 */
export function isNodeSupported(type: string): type is NodeType {
  return type in NODE_REGISTRY;
}

export default NODE_REGISTRY;









/** import React from 'react';

// ─── Node Components ──────────────────────────────────────────────────────────
import VideoNode,    { VideoNodeData }    from '../modules/VideoNode';
import MarkdownNode, { MarkdownNodeData } from '../modules/MarkdownNode';
import FormulaNode,  { FormulaNodeData }  from '../modules/FormulaNode';
import SvgNode,      { SvgNodeData }      from '../modules/SvgNode';
import McqNode,      { McqNodeData }      from '../modules/McqNode';
import AudioNode,    { AudioNodeData }    from '../modules/AudioNode';

// ─── Node Types ───────────────────────────────────────────────────────────────
import { NODE_TYPES } from '../constants/nodeTypes';

// ─── Base Node Data ───────────────────────────────────────────────────────────

export type AnyNodeData =
  | VideoNodeData
  | MarkdownNodeData
  | FormulaNodeData
  | SvgNodeData
  | McqNodeData
  | AudioNodeData;

// ─── Shared Props every node receives ────────────────────────────────────────

export interface BaseNodeProps {
  onComplete:   (nodeId: string) => void;
  onHandRaise?: (nodeId: string) => void;
  onError?:     (nodeId: string, error: string) => void;
  paused?:      boolean;
}

// ─── Registry Entry ───────────────────────────────────────────────────────────

interface RegistryEntry<T extends AnyNodeData> {
  component: React.ComponentType<{ data: T } & BaseNodeProps & Record<string, any>>;
  validate:  (data: unknown) => data is T;
}

// ─── Validators ───────────────────────────────────────────────────────────────
// Lightweight runtime checks — catch malformed WebSocket payloads early

function isVideoNodeData(data: unknown): data is VideoNodeData {
  const d = data as VideoNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.VIDEO &&
    typeof d.id  === 'string' &&
    typeof d.url === 'string'
  );
}

function isMarkdownNodeData(data: unknown): data is MarkdownNodeData {
  const d = data as MarkdownNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.MARKDOWN &&
    typeof d.id    === 'string' &&
    typeof d.topic === 'string' &&
    Array.isArray(d.sections)
  );
}

function isFormulaNodeData(data: unknown): data is FormulaNodeData {
  const d = data as FormulaNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.FORMULA &&
    typeof d.id    === 'string' &&
    typeof d.topic === 'string' &&
    Array.isArray(d.sections)
  );
}

function isSvgNodeData(data: unknown): data is SvgNodeData {
  const d = data as SvgNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.SVG &&
    typeof d.id    === 'string' &&
    typeof d.topic === 'string' &&
    Array.isArray(d.sections)
  );
}

function isMcqNodeData(data: unknown): data is McqNodeData {
  const d = data as McqNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.MCQ &&
    typeof d.id       === 'string' &&
    typeof d.question === 'string' &&
    Array.isArray(d.options)
  );
}

function isAudioNodeData(data: unknown): data is AudioNodeData {
  const d = data as AudioNodeData;
  return (
    typeof d === 'object' &&
    d !== null &&
    d.type === NODE_TYPES.AUDIO &&
    typeof d.id   === 'string' &&
    typeof d.mode === 'string' &&
    (d.mode === 'url' || d.mode === 'duplex')
  );
}

// ─── Registry Map ─────────────────────────────────────────────────────────────

const NODE_REGISTRY: {
  [NODE_TYPES.VIDEO]:    RegistryEntry<VideoNodeData>;
  [NODE_TYPES.MARKDOWN]: RegistryEntry<MarkdownNodeData>;
  [NODE_TYPES.FORMULA]:  RegistryEntry<FormulaNodeData>;
  [NODE_TYPES.SVG]:      RegistryEntry<SvgNodeData>;
  [NODE_TYPES.MCQ]:      RegistryEntry<McqNodeData>;
  [NODE_TYPES.AUDIO]:    RegistryEntry<AudioNodeData>;
} = {
  [NODE_TYPES.VIDEO]: {
    component: VideoNode,
    validate:  isVideoNodeData,
  },
  [NODE_TYPES.MARKDOWN]: {
    component: MarkdownNode,
    validate:  isMarkdownNodeData,
  },
  [NODE_TYPES.FORMULA]: {
    component: FormulaNode,
    validate:  isFormulaNodeData,
  },
  [NODE_TYPES.SVG]: {
    component: SvgNode,
    validate:  isSvgNodeData,
  },
  [NODE_TYPES.MCQ]: {
    component: McqNode,
    validate:  isMcqNodeData,
  },
  [NODE_TYPES.AUDIO]: {
    component: AudioNode,
    validate:  isAudioNodeData,
  },
};

// ─── Registry API ─────────────────────────────────────────────────────────────

/**
 * Get component for a node type.
 * Returns null if type is not registered.
 */
export function getNodeComponent(
  type: string
): React.ComponentType<any> | null {
  const entry = NODE_REGISTRY[type as keyof typeof NODE_REGISTRY];
  return entry?.component ?? null;
}

/**
 * Validate incoming WebSocket payload.
 * Returns typed data or null if invalid.
 */
export function validateNode(data: unknown): AnyNodeData | null {
  if (typeof data !== 'object' || data === null) return null;

  const type = (data as { type?: string }).type;
  if (!type) return null;

  const entry = NODE_REGISTRY[type as keyof typeof NODE_REGISTRY];
  if (!entry) {
    console.warn(`[NodeRegistry] Unknown node type: "${type}"`);
    return null;
  }

  if (!entry.validate(data)) {
    console.warn(`[NodeRegistry] Invalid payload for node type: "${type}"`, data);
    return null;
  }

  return data as AnyNodeData;
}

/**
 * Check if a node type is registered.
 */
export function isRegisteredType(type: string): boolean {
  return type in NODE_REGISTRY;
}

/**
 * Get all registered node types.
 */
export function getRegisteredTypes(): string[] {
  return Object.keys(NODE_REGISTRY);
}

export default NODE_REGISTRY;
*/
