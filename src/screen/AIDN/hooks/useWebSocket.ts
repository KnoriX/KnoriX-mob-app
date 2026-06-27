import { useEffect, useRef, useState, useCallback } from 'react';
import { wsService } from '../services/websocketService';
import { ServerMessage } from '../types/websocket.types';
import { WSConnectionState } from '../types/websocket.types';

interface UseWebSocketOptions {
  url: string;
  lessonId: string;
  sessionToken: string;
  studentId: string;
  onMessage: (msg: ServerMessage) => void;
  enabled?: boolean;
}

interface UseWebSocketReturn {
  connectionState: WSConnectionState;
  reconnectAttempts: number;
  sendInteraction: typeof wsService.sendInteraction;
  ackNode: typeof wsService.ackNode;
}

export function useWebSocket({
  url,
  lessonId,
  sessionToken,
  studentId,
  onMessage,
  enabled = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionState, setConnectionState] = useState<WSConnectionState>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage; // always latest without re-subscribing

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to state changes
    const unsubState = wsService.onStateChange((state) => {
      setConnectionState(state);
      if (state === 'connecting') setReconnectAttempts(prev => prev);
    });

    // Subscribe to messages
    const unsubMsg = wsService.onMessage((msg) => {
      onMessageRef.current(msg);
    });

    // Connect
    wsService.connect(url);

    return () => {
      unsubState();
      unsubMsg();
      wsService.leaveLesson();
      wsService.disconnect();
    };
  }, [url, enabled]);

  // Join lesson once connected
  useEffect(() => {
    if (connectionState === 'connected') {
      wsService.joinLesson({ lessonId, sessionToken, studentId });
    }
  }, [connectionState, lessonId, sessionToken, studentId]);

  const sendInteraction = useCallback(
    (...args: Parameters<typeof wsService.sendInteraction>) => wsService.sendInteraction(...args),
    [],
  );

  const ackNode = useCallback(
    (...args: Parameters<typeof wsService.ackNode>) => wsService.ackNode(...args),
    [],
  );

  return { connectionState, reconnectAttempts, sendInteraction, ackNode };
}
