// ─────────────────────────────────────────────────────────────
// modules/websocket/RealtimeNode.tsx
// Main orchestrator — backend decides mode per session
// Modes: mentor_stream | whiteboard | qa_chat | hybrid
// WS for live events · FastAPI for heavy work
// ─────────────────────────────────────────────────────────────

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { useRealtimeSession } from '../../hooks/useRealtimeSession';
import MentorStreamView from './subviews/MentorStreamView';
import WhiteboardView from './subviews/WhiteboardView';
import QAChatView from './subviews/QAChatView';

import type { RealtimePayload } from '../../types/realtime.types';

// ─── Context — WS instance injected by renderScreen ──────────
// Adjust import path to match your actual WebSocket context
// import { WSContext } from '../../services/websocketService';

// ─── Props ───────────────────────────────────────────────────

interface Props {
  payload: RealtimePayload;
  /** Called when node signals completion to canvas */
  onDone: () => void;
  /** WebSocket instance from parent (useWebSocket hook) */
  ws: WebSocket | null;
}

// ─── Fade wrapper ────────────────────────────────────────────

function FadeCard({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 280 });
    translateY.value = withTiming(0, { duration: 280 });
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── Main component ──────────────────────────────────────────

export default function RealtimeNode({ payload, onDone, ws }: Props) {
  const { state, pause, resume, skip, sendQuickReply, sendStudentMessage } =
    useRealtimeSession(payload, ws, onDone);

  const renderContent = () => {
    switch (state.mode) {

      case 'mentor_stream':
        return (
          <MentorStreamView
            streamedText={state.streamedText}
            isThinking={state.isThinking}
            isStreaming={state.isStreaming}
            isPaused={state.isPaused}
            config={payload.mentorConfig ?? { showThinking: true, allowInterrupt: true }}
            onPause={pause}
            onResume={resume}
            onSkip={skip}
          />
        );

      case 'whiteboard':
        return (
          <WhiteboardView
            commands={state.wbCommands}
            config={payload.whiteboardConfig ?? { canvasWidth: 400, canvasHeight: 225, background: '#0F0F1A' }}
            onSkip={skip}
          />
        );

      case 'qa_chat':
        return (
          <QAChatView
            messages={state.messages}
            quickReplies={state.quickReplies}
            isSending={state.isSending}
            config={payload.qaConfig ?? { studentCanType: true }}
            onSendMessage={sendStudentMessage}
            onQuickReply={sendQuickReply}
            onSkip={skip}
          />
        );

      case 'hybrid':
        // Hybrid — backend switches mode via rt_switch_mode event
        // State.mode updates automatically via useRealtimeSession
        // Just re-render whichever mode is now active
        return renderContent();

      default:
        return null;
    }
  };

  return (
    <FadeCard>
      {renderContent()}
    </FadeCard>
  );
}

const styles = StyleSheet.create({});
