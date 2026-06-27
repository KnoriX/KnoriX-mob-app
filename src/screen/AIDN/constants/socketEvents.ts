
export const SOCKET_EVENTS = {
  // Client → Server
  JOIN_LESSON: 'join_lesson',
  LEAVE_LESSON: 'leave_lesson',
  NODE_ACK: 'node_ack',         // student acknowledged a node
  INTERACTION: 'interaction',   // MCQ answer, quiz response, etc.

  // Server → Client
  LESSON_PLAN: 'lesson_plan',   // initial REST-like payload via WS (or use REST)
  NODE_PUSH: 'node_push',       // push a single new node
  NODE_UPDATE: 'node_update',   // update existing node (streaming content)
  NODE_REMOVE: 'node_remove',   // remove a node from canvas
  LAYOUT_UPDATE: 'layout_update', // AI changes layout dynamically
  SESSION_END: 'session_end',
  ERROR: 'error',

  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
