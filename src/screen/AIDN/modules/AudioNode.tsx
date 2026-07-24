// ─────────────────────────────────────────────────────────────
// modules/AudioNode.tsx
// Audio = lesson conductor · Canvas = orchestra
// FastAPI serves audio · Timestamps drive everything
// Dark premium 16:9 card — same design language as all nodes
// ─────────────────────────────────────────────────────────────

import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  PanResponder,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../styles/token';
import { useAudioSync } from '../hooks/useAudioSync';
import type { AudioPayload, CanvasEventDispatcher } from '../types/audio.types';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = CARD_W * (9 / 16);
const SEEK_W = CARD_W - Spacing.md * 2;

// ─── Format time ─────────────────────────────────────────────

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

// ─── Pulsing waveform bars ────────────────────────────────────

const BAR_COUNT = 28;

function WaveformVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => {
    const heights = [0.3, 0.5, 0.8, 0.6, 1.0, 0.7, 0.4, 0.9, 0.5, 0.6,
                     0.8, 0.3, 1.0, 0.7, 0.5, 0.4, 0.9, 0.6, 0.3, 0.8,
                     0.5, 1.0, 0.7, 0.4, 0.6, 0.9, 0.3, 0.5];
    return heights[i % heights.length];
  }), []);

  return (
    <View style={wv.row}>
      {bars.map((h, i) => (
        <AnimatedBar key={i} baseHeight={h} isPlaying={isPlaying} delay={i * 40} />
      ))}
    </View>
  );
}

function AnimatedBar({ baseHeight, isPlaying, delay: _delay }: { baseHeight: number; isPlaying: boolean; delay: number }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(
        withSequence(
          withTiming(0.3 + Math.random() * 0.7, { duration: 300 + Math.random() * 300 }),
          withTiming(baseHeight, { duration: 300 + Math.random() * 200 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(baseHeight * 0.4, { duration: 300 });
    }
  }, [isPlaying]);

  const style = useAnimatedStyle(() => ({
    height: 32 * scale.value,
  }));

  return <Animated.View style={[wv.bar, style]} />;
}

const wv = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 40,
    paddingHorizontal: Spacing.md,
  },
  bar: {
    width: (CARD_W - Spacing.md * 2 - BAR_COUNT * 3) / BAR_COUNT,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    opacity: 0.75,
  },
});

// ─── Seek bar ─────────────────────────────────────────────────

interface SeekBarProps {
  progress: number;
  chapters: { at: number; title: string }[];
  durationSeconds: number;
  onSeek: (seconds: number) => void;
}

function SeekBar({ progress, chapters, durationSeconds, onSeek }: SeekBarProps) {
  const barRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / SEEK_W));
        onSeek(ratio * durationSeconds);
      },
      onPanResponderMove: (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / SEEK_W));
        onSeek(ratio * durationSeconds);
      },
    })
  ).current;

  return (
    <View style={sk.container} ref={barRef} {...panResponder.panHandlers}>
      {/* Track */}
      <View style={sk.track}>
        {/* Filled */}
        <View style={[sk.filled, { width: `${progress * 100}%` }]} />
        {/* Thumb */}
        <View style={[sk.thumb, { left: `${progress * 100}%` }]} />
      </View>

      {/* Chapter markers */}
      {chapters.map(ch => (
        <View
          key={ch.at}
          style={[sk.chapterDot, { left: `${(ch.at / durationSeconds) * 100}%` }]}
        />
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  container: { width: SEEK_W, height: 24, justifyContent: 'center', position: 'relative' },
  track: {
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    position: 'relative',
    overflow: 'visible',
  },
  filled: { height: 3, backgroundColor: Colors.accent, borderRadius: 2 },
  thumb: {
    position: 'absolute',
    top: -5,
    width: 13, height: 13,
    borderRadius: 7,
    backgroundColor: Colors.accent,
    marginLeft: -6,
    shadowColor: Colors.accent,
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  chapterDot: {
    position: 'absolute',
    bottom: 0,
    width: 5, height: 5,
    borderRadius: 3,
    backgroundColor: '#FFE66D',
    marginLeft: -2.5,
  },
});

// ─── Main AudioNode ───────────────────────────────────────────

interface Props {
  payload: AudioPayload;
  onDone: () => void;
  /** Canvas dispatcher — AudioNode drives the entire lesson canvas */
  dispatcher: CanvasEventDispatcher;
}

export default function AudioNode({ payload, onDone, dispatcher }: Props) {
  const { state, play, pause, seek, skip } = useAudioSync(payload, dispatcher, onDone);

  const fadeOpacity = useSharedValue(0);
  const fadeY = useSharedValue(10);

  React.useEffect(() => {
    fadeOpacity.value = withTiming(1, { duration: 280 });
    fadeY.value = withTiming(0, { duration: 280 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
    transform: [{ translateY: fadeY.value }],
  }));

  const chapters = payload.chapters ?? [];

  return (
    <Animated.View style={[th.card, cardStyle]}>
      {/* Accent strip */}
      <View style={th.accentStrip} />

      {/* Header */}
      <View style={th.header}>
        <View style={th.badgeRow}>
          <View style={th.badge}>
            <Text style={th.badgeText}>AUDIO LESSON</Text>
          </View>
          {state.currentChapter && (
            <Animated.Text entering={FadeIn.duration(200)} style={th.chapterLabel}>
              {state.currentChapter.title}
            </Animated.Text>
          )}
        </View>
        <TouchableOpacity onPress={skip} style={th.skipBtn}>
          <Text style={th.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {state.isLoading ? (
        <View style={th.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={th.loadingText}>Preparing audio...</Text>
        </View>
      ) : state.error ? (
        <View style={th.center}>
          <Text style={th.errorText}>{state.error}</Text>
        </View>
      ) : (
        <>
          {/* Waveform */}
          {payload.showWaveform !== false && (
            <WaveformVisualizer isPlaying={state.isPlaying} />
          )}

          {/* Caption overlay */}
          {payload.showCaptions !== false && state.currentCaption && (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={th.captionBar}>
              <Text style={th.captionText}>{state.currentCaption}</Text>
            </Animated.View>
          )}

          {/* Chapter scroll strip */}
          {chapters.length > 0 && (
            <ScrollView
              horizontal
              style={th.chapterScroll}
              contentContainerStyle={th.chapterContent}
              showsHorizontalScrollIndicator={false}
            >
              {chapters.map(ch => (
                <TouchableOpacity
                  key={ch.at}
                  style={[
                    th.chapterChip,
                    state.currentChapter?.at === ch.at && th.chapterChipActive,
                  ]}
                  onPress={() => seek(ch.at)}
                >
                  <Text style={[
                    th.chapterChipText,
                    state.currentChapter?.at === ch.at && th.chapterChipTextActive,
                  ]}>
                    {fmt(ch.at)} · {ch.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Seek bar */}
          <View style={th.seekRow}>
            <Text style={th.timeLabel}>{fmt(state.currentSeconds)}</Text>
            <SeekBar
              progress={state.progress}
              chapters={chapters}
              durationSeconds={state.durationSeconds}
              onSeek={seek}
            />
            <Text style={th.timeLabel}>{fmt(state.durationSeconds)}</Text>
          </View>

          {/* Controls */}
          <View style={th.controls}>
            {/* Rewind 10s */}
            <TouchableOpacity
              style={th.ctrlBtn}
              onPress={() => seek(Math.max(0, state.currentSeconds - 10))}
            >
              <Text style={th.ctrlIcon}>⟪</Text>
              <Text style={th.ctrlLabel}>10s</Text>
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              style={th.playBtn}
              onPress={state.isPlaying ? pause : play}
            >
              <Text style={th.playIcon}>{state.isPlaying ? '⏸' : '▶'}</Text>
            </TouchableOpacity>

            {/* Forward 10s */}
            <TouchableOpacity
              style={th.ctrlBtn}
              onPress={() => seek(Math.min(state.durationSeconds, state.currentSeconds + 10))}
            >
              <Text style={th.ctrlIcon}>⟫</Text>
              <Text style={th.ctrlLabel}>10s</Text>
            </TouchableOpacity>
          </View>

          {/* MCQ pause overlay */}
          {state.isMCQPaused && (
            <Animated.View entering={FadeIn.duration(200)} style={th.mcqOverlay}>
              <Text style={th.mcqOverlayText}>⏸ Answer the question to continue</Text>
            </Animated.View>
          )}
        </>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const th = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  accentStrip: { height: 3, backgroundColor: Colors.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.accent + '22',
    borderWidth: 1, borderColor: Colors.accent,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { color: Colors.accent, fontSize: 10, fontWeight: Typography.semibold.fontWeight, letterSpacing: 1 },
  chapterLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.body.fontWeight },
  skipBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  skipText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.semibold.fontWeight, letterSpacing: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  loadingText: { color: Colors.textMuted, fontSize: 13, fontWeight: Typography.body.fontWeight },
  errorText: { color: '#FF6B6B', fontSize: 13, fontWeight: Typography.body.fontWeight, textAlign: 'center', padding: Spacing.md },
  captionBar: {
    marginHorizontal: Spacing.md,
    backgroundColor: '#1A1A2E',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.btn,
    paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 4,
  },
  captionText: {
    color: Colors.textPrimary,
    fontSize: 13, fontWeight: Typography.body.fontWeight,
    textAlign: 'center', lineHeight: 19,
  },
  chapterScroll: { maxHeight: 34, borderBottomWidth: 1, borderBottomColor: Colors.border },
  chapterContent: { paddingHorizontal: Spacing.md, gap: 6, alignItems: 'center' },
  chapterChip: {
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  chapterChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + '22' },
  chapterChipText: { color: Colors.textMuted, fontSize: 11, fontWeight: Typography.body.fontWeight },
  chapterChipTextActive: { color: Colors.accent },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  timeLabel: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.mono.fontFamily, width: 36 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  ctrlBtn: { alignItems: 'center', gap: 2 },
  ctrlIcon: { color: Colors.textSecondary, fontSize: 18 },
  ctrlLabel: { color: Colors.textMuted, fontSize: 9, fontFamily: Typography.mono.fontFamily },
  playBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  playIcon: { fontSize: 20, color: '#fff' },
  mcqOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A1A2E' + 'EE',
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.accent + '55',
  },
  mcqOverlayText: { color: Colors.accent, fontSize: 13, fontWeight: Typography.semibold.fontWeight },
});
