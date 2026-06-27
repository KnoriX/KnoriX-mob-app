import { NodeType, LayoutMode } from '../constants/nodeTypes';

// ─── Per-node payload types ────────────────────────────────────────────────

export interface MarkdownPayload {
  content: string; // raw markdown string
}

export interface MCQPayload {
  question: string;
  options: { id: string; text: string }[];
  correctId?: string;     // only sent after student answers
  explanation?: string;
}

export interface VideoPayload {
  uri: string;
  autoPlay?: boolean;
  loop?: boolean;
  caption?: string;
}

export interface KatexPayload {
  formula: string;        // LaTeX string
  displayMode?: boolean;  // block vs inline
}

export interface MermaidPayload {
  definition: string;     // mermaid diagram DSL
}

export interface SkiaPayload {
  animationData: Record<string, unknown>; // Lottie-like or custom Skia data
  width?: number;
  height?: number;
}

export interface SvgPayload {
  svgString: string;
}

export interface AudioPayload {
  uri: string;
  autoPlay?: boolean;
  transcript?: string;
}

export interface RealtimePayload {
  streamUrl: string;      // live websocket sub-channel or SSE url
  renderAs: NodeType;     // what type to render streaming content as
}

export type NodePayload =
  | MarkdownPayload
  | MCQPayload
  | VideoPayload
  | KatexPayload
  | MermaidPayload
  | SkiaPayload
  | SvgPayload
  | AudioPayload
  | RealtimePayload;

// ─── Core Node ────────────────────────────────────────────────────────────

export interface AIDNNode {
  id: string;                       // unique node id from backend
  type: NodeType;
  payload: NodePayload;
  layout?: LayoutMode;              // AI-decided layout hint
  order: number;                    // render position
  transition?: 'fade' | 'none';    // always 'fade' in your case
  meta?: {
    title?: string;
    duration?: number;              // estimated read/view time in seconds
    tags?: string[];
  };
}

// ─── Lesson Plan (REST response) ─────────────────────────────────────────

export interface LessonPlan {
  lessonId: string;
  title: string;
  nodes: AIDNNode[];
  sessionToken: string;             // used for WS auth
}

// ─── Renderer State ───────────────────────────────────────────────────────

export type NodeStatus = 'pending' | 'rendering' | 'done' | 'error';

export interface RendererNode extends AIDNNode {
  status: NodeStatus;
  opacity?: number;                 // for fade animation tracking
}
