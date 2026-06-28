import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';

import { AIDNNode, MarkdownPayload } from '../../types/node.types';
import { styles, markdownStyles, CARD_WIDTH, CARD_HEIGHT } from './markdownNode.styles';
import { Colors } from '../../styles/tokens';

// ─── Props ────────────────────────────────────────────────────────────────

interface MarkdownNodeProps {
  node: AIDNNode;
  onDone?: () => void;
}

// ─── Fade durations ───────────────────────────────────────────────────────

const FADE_IN_MS  = 280;
const FADE_OUT_MS = 200;

// ─── Component ────────────────────────────────────────────────────────────

export default function MarkdownNode({ node, onDone }: MarkdownNodeProps) {
  const payload = node.payload as MarkdownPayload;
  const title   = node.meta?.title;

  // ── Reanimated fade + subtle rise-in
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(12);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ── Reading progress (0–1)
  const [progress, setProgress] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isDone    = useRef(false);

  // ── Mount: fade in
  useEffect(() => {
    opacity.value    = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
  }, []);

  // ── Fade out then call onDone
  const fadeOutAndDone = useCallback(() => {
    if (isDone.current) return;
    isDone.current = true;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(onDone ?? (() => {}))();
    });
  }, [onDone]);

  // ── Track reading scroll progress
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const scrolled = contentOffset.y + layoutMeasurement.height;
      const total    = contentSize.height;
      const ratio    = Math.min(scrolled / total, 1);
      setProgress(ratio);

      // Auto-signal done at 90% read
      if (ratio >= 0.9) fadeOutAndDone();
    },
    [fadeOutAndDone],
  );

  return (
    <Animated.View style={[styles.animatedWrapper, animatedStyle]}>
      <View style={styles.card}>

        {/* Signature accent strip */}
        <View style={styles.accentStrip} />

        {/* Optional node title */}
        {title ? (
          <View style={styles.titleBar}>
            <View style={styles.titleDot} />
            <Text style={styles.titleText}>{title}</Text>
          </View>
        ) : null}

        {/* Scrollable markdown */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Markdown style={markdownStyles}>
            {payload.content}
          </Markdown>
        </ScrollView>

        {/* Reading progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {/* Skip button (escape hatch before 90%) */}
        {progress < 0.9 ? (
          <TouchableOpacity
            onPress={fadeOutAndDone}
            hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
            style={{ alignSelf: 'flex-end', paddingHorizontal: 16, paddingBottom: 10 }}
          >
            <Text style={{ color: Colors.textMuted, fontSize: 11, letterSpacing: 0.5 }}>
              SKIP →
            </Text>
          </TouchableOpacity>
        ) : null}

      </View>
    </Animated.View>
  );
}
