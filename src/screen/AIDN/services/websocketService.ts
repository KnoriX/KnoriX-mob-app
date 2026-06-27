import { ServerMessage, JoinLessonPayload, NodeAckPayload, InteractionPayload } from '../types/websocket.types';
import { SOCKET_EVENTS } from '../constants/socketEvents';

type MessageHandler = (msg: ServerMessage) => void;
type StateHandler = (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 1000;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateHandlers: Set<StateHandler> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  // ─── Connection ──────────────────────────────────────────────────────────

  connect(wsUrl: string): void {
    this.url = wsUrl;
    this.shouldReconnect = true;
    this._createConnection();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this._clearReconnectTimer();
    this.ws?.close();
    this.ws = null;
  }

  // ─── Sending messages ────────────────────────────────────────────────────

  joinLesson(payload: JoinLessonPayload): void {
    this._send(SOCKET_EVENTS.JOIN_LESSON, payload);
  }

  ackNode(payload: NodeAckPayload): void {
    this._send(SOCKET_EVENTS.NODE_ACK, payload);
  }

  sendInteraction(payload: InteractionPayload): void {
    this._send(SOCKET_EVENTS.INTERACTION, payload);
  }

  leaveLesson(): void {
    this._send(SOCKET_EVENTS.LEAVE_LESSON, {});
  }

  // ─── Subscriptions ───────────────────────────────────────────────────────

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStateChange(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  // ─── Internals ───────────────────────────────────────────────────────────

  private _createConnection(): void {
    this._emitState('connecting');

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._emitState('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.messageHandlers.forEach(h => h(msg));
      } catch (e) {
        console.warn('[WS] Failed to parse message', event.data, e);
      }
    };

    this.ws.onerror = () => {
      this._emitState('error');
    };

    this.ws.onclose = () => {
      this._emitState('disconnected');
      if (this.shouldReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimer = setTimeout(() => this._createConnection(), delay);
      }
    };
  }

  private _send(event: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload, timestamp: Date.now() }));
    } else {
      console.warn('[WS] Cannot send, socket not open. Event:', event);
    }
  }

  private _emitState(state: Parameters<StateHandler>[0]): void {
    this.stateHandlers.forEach(h => h(state));
  }

  private _clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton export
export const wsService = new WebSocketService();
