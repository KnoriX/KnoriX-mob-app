import { NodeType, LayoutMode } from '../constants/nodeTypes';

// ─── Per-node payload types ────────────────────────────────────────────────

export interface MarkdownPayload {
  content: string; // raw markdown string
}

export interface MCQPayload {
  mode?: 'single' | 'multi';
  question: string;
  options: { id: string; text: string }[];
  correctId?: string;
  correctIds?: string[];
  explanation?: string;
  hint?: string;
  timeLimit?: number;
  tags?: string[];
}

export interface VideoChapter {
  at: number;
  title: string;
}

export interface VideoPayload {
  uri: string;
  autoPlay?: boolean;
  loop?: boolean;
  caption?: string;
  muted?: boolean;
  startAt?: number;
  endAt?: number;
  playbackRate?: number;
  controlMode?: 'default' | 'minimal' | 'none';
  resizeMode?: 'contain' | 'cover' | 'stretch';
  chapters?: VideoChapter[];
  subtitles?: { uri: string; language: string }[];
  showSpeedControl?: boolean;
  reportProgressInterval?: number;
  thumbnail?: string;
}

export interface KatexPayload {
  formula: string;
  displayMode?: boolean;
}

export interface MermaidPayload {
  definition: string;
}

export interface SkiaPayload {
  animationData: Record<string, unknown>;
  width?: number;
  height?: number;
}

export interface SvgHighlight {
  targetId: string;
  color?: string;
  durationMs?: number;
}

export interface SvgTapZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface SvgPayload {
  svgString: string;
  renderMode?: 'static' | 'interactive';
  highlights?: SvgHighlight[];
  tapZones?: SvgTapZone[];
  caption?: string;
}

export interface AudioPayload {
  uri: string;
  autoPlay?: boolean;
  transcript?: string;
}

export interface RealtimePayload {
  streamUrl: string;
  renderAs: NodeType;
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
  id: string;
  type: NodeType;
  payload: NodePayload;
  layout?: LayoutMode;
  order: number;
  transition?: 'fade' | 'none';
  meta?: {
    title?: string;
    duration?: number;
    tags?: string[];
  };
}

// ─── Shared node component props ──────────────────────────────────────────

export interface NodeProps<TPayload = NodePayload> {
  node: AIDNNode;
  payload: TPayload;
  onDone: () => void;
  onEvent?: (event: string, data?: Record<string, unknown>) => void;
}

// ─── Lesson Plan (REST response) ─────────────────────────────────────────

export interface LessonPlan {
  lessonId: string;
  title: string;
  nodes: AIDNNode[];
  sessionToken: string;
}

// ─── Renderer State ───────────────────────────────────────────────────────

export type NodeStatus = 'pending' | 'rendering' | 'done' | 'error';

export interface RendererNode extends AIDNNode {
  status: NodeStatus;
  opacity?: number;
}
