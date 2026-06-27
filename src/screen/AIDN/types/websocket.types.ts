import { AIDNNode, LessonPlan } from './node.types';
import { SocketEvent } from '../constants/socketEvents';

// ─── Base message envelope ────────────────────────────────────────────────

export interface WSMessage<T = unknown> {
  event: SocketEvent;
  payload: T;
  timestamp: number;
}

// ─── Server → Client payloads ─────────────────────────────────────────────

export interface LessonPlanMessage extends WSMessage<LessonPlan> {
  event: 'lesson_plan';
}

export interface NodePushMessage extends WSMessage<AIDNNode> {
  event: 'node_push';
}

export interface NodeUpdateMessage extends WSMessage<{
  nodeId: string;
  patch: Partial<AIDNNode>;          // partial update (e.g., streaming content)
}> {
  event: 'node_update';
}

export interface NodeRemoveMessage extends WSMessage<{ nodeId: string }> {
  event: 'node_remove';
}

export interface LayoutUpdateMessage extends WSMessage<{
  nodeId: string;
  layout: AIDNNode['layout'];
}> {
  event: 'layout_update';
}

export interface SessionEndMessage extends WSMessage<{ reason: string }> {
  event: 'session_end';
}

export interface ErrorMessage extends WSMessage<{ code: string; message: string }> {
  event: 'error';
}

export type ServerMessage =
  | LessonPlanMessage
  | NodePushMessage
  | NodeUpdateMessage
  | NodeRemoveMessage
  | LayoutUpdateMessage
  | SessionEndMessage
  | ErrorMessage;

// ─── Client → Server payloads ─────────────────────────────────────────────

export interface JoinLessonPayload {
  lessonId: string;
  sessionToken: string;
  studentId: string;
}

export interface NodeAckPayload {
  nodeId: string;
  timeSpent: number; // seconds
}

export interface InteractionPayload {
  nodeId: string;
  type: 'mcq_answer' | 'rating' | 'skip';
  data: Record<string, unknown>;
}

// ─── WS Connection State ──────────────────────────────────────────────────

export type WSConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSState {
  connectionState: WSConnectionState;
  lastError?: string;
  reconnectAttempts: number;
}
