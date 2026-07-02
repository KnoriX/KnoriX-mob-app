// ─────────────────────────────────────────────────────────────
// types/realtime.types.ts
// RealtimeNode — full type definitions
// Backend decides mode per session via payload
// ─────────────────────────────────────────────────────────────

/** Top-level mode — backend sends this in payload */
export type RealtimeMode =
  | 'mentor_stream'   // AI mentor typing token-by-token
  | 'whiteboard'      // Live drawing commands from backend
  | 'qa_chat'         // Live Q&A / chat overlay
  | 'hybrid';         // Mixed — backend switches modes mid-session

// ─── Mentor Stream ──────────────────────────────────────────

export interface MentorStreamConfig {
  /** Show "AI is thinking..." animated dots before tokens arrive */
  showThinking: boolean;
  /** Student can tap Pause to halt streaming */
  allowInterrupt: boolean;
  /** Optional avatar name shown in header */
  mentorName?: string;
  /** Optional avatar image URL */
  mentorAvatarUrl?: string;
}

export interface StreamToken {
  token: string;
  /** If true, this token ends the current sentence / paragraph */
  flush?: boolean;
}

// ─── Whiteboard ─────────────────────────────────────────────

export type WhiteboardCommand =
  | { cmd: 'stroke_start'; x: number; y: number; color: string; width: number }
  | { cmd: 'stroke_point'; x: number; y: number }
  | { cmd: 'stroke_end' }
  | { cmd: 'text'; x: number; y: number; text: string; color: string; size: number }
  | { cmd: 'shape'; shape: 'circle' | 'rect' | 'arrow'; x: number; y: number; w: number; h: number; color: string }
  | { cmd: 'erase'; x: number; y: number; radius: number }
  | { cmd: 'clear' }
  | { cmd: 'highlight'; x: number; y: number; w: number; h: number; color: string };

export interface WhiteboardConfig {
  /** Canvas logical size — auto-scales to screen */
  canvasWidth: number;
  canvasHeight: number;
  background: string;
}

// ─── QA Chat ────────────────────────────────────────────────

export interface QAMessage {
  id: string;
  role: 'ai' | 'student';
  text: string;
  timestamp: number;
  /** Optional: AI can send markdown in chat */
  isMarkdown?: boolean;
}

export interface QAChatConfig {
  /** Student can type or only react */
  studentCanType: boolean;
  /** Quick-reply chips shown above input */
  quickReplies?: string[];
  /** Placeholder text in input */
  inputPlaceholder?: string;
}

// ─── Hybrid ─────────────────────────────────────────────────

export interface HybridSwitchEvent {
  /** New mode to switch canvas to */
  switchTo: Exclude<RealtimeMode, 'hybrid'>;
  /** Optional transition delay in ms */
  transitionMs?: number;
}

// ─── Main Payload ────────────────────────────────────────────

export interface RealtimePayload {
  /** Session ID — used for FastAPI HTTP calls */
  sessionId: string;

  mode: RealtimeMode;

  /** Config blocks — only relevant one used per mode */
  mentorConfig?: MentorStreamConfig;
  whiteboardConfig?: WhiteboardConfig;
  qaConfig?: QAChatConfig;

  /** FastAPI base URL for heavy calls (hint fetch, chat submit) */
  apiBaseUrl: string;

  /** Tags forwarded to backend analytics */
  tags?: string[];
}

// ─── WebSocket Events (incoming from backend) ────────────────

export type RealtimeWSEvent =
  | { event: 'rt_token';        data: StreamToken }
  | { event: 'rt_thinking';     data: { active: boolean } }
  | { event: 'rt_stream_done';  data: Record<string, never> }
  | { event: 'rt_wb_cmd';       data: WhiteboardCommand }
  | { event: 'rt_qa_msg';       data: QAMessage }
  | { event: 'rt_quick_replies'; data: { replies: string[] } }
  | { event: 'rt_switch_mode';  data: HybridSwitchEvent }
  | { event: 'rt_node_done';    data: Record<string, never> };

// ─── WebSocket Events (outgoing to backend) ──────────────────

export type RealtimeOutEvent =
  | { event: 'rt_interrupt';    data: { sessionId: string } }
  | { event: 'rt_resume';       data: { sessionId: string } }
  | { event: 'rt_student_msg';  data: { sessionId: string; text: string } }
  | { event: 'rt_quick_reply';  data: { sessionId: string; reply: string } }
  | { event: 'rt_node_skip';    data: { sessionId: string } }
  | { event: 'rt_analytics';    data: { sessionId: string; event: string; meta?: object } };
