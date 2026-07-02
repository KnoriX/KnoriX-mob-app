// ─────────────────────────────────────────────────────────────
// modules/websocket/subviews/MentorStreamView.tsx
// AI mentor streaming text — token by token, ChatGPT style
// Dark premium 16:9 card — same design language as all nodes
// ─────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../../styles/token';
import type { MentorStreamConfig } from '../../../types/realtime.types';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = CARD_W * (9 / 16);

interface Props {
  streamedText: string;
  isThinking: boolean;
  isStreaming: boolean;
  isPaused: boolean;
  config: MentorStreamConfig;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}

// ─── Thinking dots animation ─────────────────────────────────

function ThinkingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (sv: Animated.SharedValue<number>, delay: number) => {
      setTimeout(() => {
        sv.value = withRepeat(
          withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
          -1,
          false,
        );
      }, delay);
    };
    pulse(dot1, 0);
    pulse(dot2, 160);
    pulse(dot3, 320);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={th.dotsRow}>
      <Animated.View style={[th.dot, s1]} />
      <Animated.View style={[th.dot, s2]} />
      <Animated.View style={[th.dot, s3]} />
    </View>
  );
}

// ─── Cursor blink ────────────────────────────────────────────

function Cursor() {
  const op = useSharedValue(1);
  useEffect(() => {
    op.value = withRepeat(withSequence(withTiming(0, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: op.value }));
  return <Animated.Text style={[th.cursor, style]}>▌</Animated.Text>;
}

// ─── Main view ───────────────────────────────────────────────

export default function MentorStreamView({
  streamedText,
  isThinking,
  isStreaming,
  isPaused,
  config,
  onPause,
  onResume,
  onSkip,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [streamedText]);

  return (
    <View style={th.card}>
      {/* Accent strip */}
      <View style={th.accentStrip} />

      {/* Header */}
      <View style={th.header}>
        <View style={th.avatarRow}>
          {config.mentorAvatarUrl ? (
            <Image source={{ uri: config.mentorAvatarUrl }} style={th.avatar} />
          ) : (
            <View style={th.avatarFallback}>
              <Text style={th.avatarInitial}>AI</Text>
            </View>
          )}
          <View>
            <Text style={th.mentorName}>{config.mentorName ?? 'AI Mentor'}</Text>
            <Text style={th.statusLabel}>
              {isPaused ? '⏸ Paused' : isThinking ? 'Thinking...' : isStreaming ? 'Speaking...' : 'Done'}
            </Text>
          </View>
        </View>

        {/* Badge */}
        <View style={th.badge}>
          <Text style={th.badgeText}>LIVE</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        style={th.body}
        contentContainerStyle={th.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {isThinking && config.showThinking ? (
          <Animated.View entering={FadeIn.duration(200)} style={th.thinkingRow}>
            <Text style={th.thinkingLabel}>AI is thinking</Text>
            <ThinkingDots />
          </Animated.View>
        ) : (
          <Text style={th.streamText}>
            {streamedText}
            {isStreaming && <Cursor />}
          </Text>
        )}
      </ScrollView>

      {/* Controls */}
      <View style={th.footer}>
        {config.allowInterrupt && (
          isPaused ? (
            <TouchableOpacity style={th.btnPrimary} onPress={onResume}>
              <Text style={th.btnPrimaryText}>▶ Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={th.btnSecondary} onPress={onPause} disabled={!isStreaming}>
              <Text style={[th.btnSecondaryText, !isStreaming && th.disabled]}>⏸ Pause</Text>
            </TouchableOpacity>
          )
        )}
        <TouchableOpacity style={th.btnSkip} onPress={onSkip}>
          <Text style={th.btnSkipText}>SKIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const th = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  accentStrip: {
    height: 3,
    backgroundColor: Colors.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: Colors.accent },
  avatarFallback: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accent + '33',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.accent,
  },
  avatarInitial: { color: Colors.accent, fontSize: 11, fontFamily: Typography.mono },
  mentorName: { color: Colors.textPrimary, fontSize: 13, fontFamily: Typography.semibold },
  statusLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.body, marginTop: 1 },
  badge: {
    backgroundColor: '#FF4D4D22',
    borderWidth: 1, borderColor: '#FF4D4D',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { color: '#FF4D4D', fontSize: 10, fontFamily: Typography.semibold, letterSpacing: 1 },
  body: { flex: 1 },
  bodyContent: { padding: Spacing.md },
  streamText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: Typography.body,
    lineHeight: 24,
  },
  cursor: { color: Colors.accent, fontSize: 16 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thinkingLabel: { color: Colors.textMuted, fontSize: 13, fontFamily: Typography.body },
  dotsRow: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.btn,
  },
  btnPrimaryText: { color: '#fff', fontSize: 12, fontFamily: Typography.semibold },
  btnSecondary: {
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.btn,
  },
  btnSecondaryText: { color: Colors.textSecondary, fontSize: 12, fontFamily: Typography.body },
  btnSkip: { paddingHorizontal: 10, paddingVertical: 6 },
  btnSkipText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.semibold, letterSpacing: 1 },
  disabled: { opacity: 0.3 },
});
