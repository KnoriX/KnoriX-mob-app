import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  TouchableOpacity, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';

import { Colors, Typography, Spacing, Radius } from '../../styles/token';
import { buildKaTexHtml } from './katexHtmlBuilder';
import type { KaTexPayload, KaTexDisplayMode } from './katexNode.types';
import type { NodeProps } from '../../types/node.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

// ─── KaTexNode ────────────────────────────────────────────────────────────────

const KaTexNode: React.FC<NodeProps<KaTexPayload>> = ({
  payload, onDone, onSkip, sendEvent,
}) => {
  const {
    displayMode,
    formulas = [],
    animation = { mode: 'instant' },
    caption,
    accentColor = '#7C6FFF',
  } = payload;

  // ── Step state (step_by_step mode) ──
  const maxStep   = formulas.length - 1;
  const [currentStep, setCurrentStep] = useState(0);
  const stepTimer = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView>(null);

  // ── WebView content ──
  const htmlContent = useMemo(
    () => buildKaTexHtml(formulas, displayMode, accentColor, currentStep),
    [formulas, displayMode, accentColor, currentStep],
  );

  // ── Dynamic WebView height (auto-fit for multi/derivation) ──
  const [webViewHeight, setWebViewHeight] = useState(CARD_HEIGHT);

  // ── Card fade animation ──
  const cardOpacity   = useSharedValue(0);
  const cardTranslate = useSharedValue(12);
  const cardStyle     = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  useEffect(() => {
    cardOpacity.value   = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    cardTranslate.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });
    sendEvent?.({ type: 'katex_view_start', nodeId: payload.id });

    if (displayMode === 'step_by_step' && animation.autoAdvance) {
      autoStep(0);
    }
    return () => { if (stepTimer.current) clearTimeout(stepTimer.current); };
  }, []);

  const autoStep = useCallback((step: number) => {
    setCurrentStep(step);
    sendEvent?.({ type: 'katex_step', nodeId: payload.id, data: { step, label: formulas[step]?.label } });
    if (step < maxStep) {
      stepTimer.current = setTimeout(
        () => autoStep(step + 1),
        animation.stepDurationMs ?? 2000,
      );
    }
  }, [maxStep, animation.stepDurationMs, formulas]);

  const handleNext = () => {
    if (currentStep >= maxStep) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    sendEvent?.({ type: 'katex_step', nodeId: payload.id, data: { step: next } });
  };

  const handlePrev = () => {
    if (currentStep <= 0) return;
    setCurrentStep(currentStep - 1);
  };

  // ── WebView message handler (height, interactions) ──
  const onMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'height' && msg.value) {
        const h = Math.min(Math.max(msg.value, 80), CARD_HEIGHT * 2);
        setWebViewHeight(h);
      }
    } catch (_) {}
  }, []);

  // ── Done / Skip ──
  const handleDone = useCallback(() => {
    sendEvent?.({ type: 'katex_complete', nodeId: payload.id });
    cardOpacity.value   = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) },
      (ok) => { if (ok) runOnJS(onDone)(); });
    cardTranslate.value = withTiming(-8, { duration: 200 });
  }, [onDone]);

  const handleSkip = useCallback(() => {
    sendEvent?.({ type: 'katex_skip', nodeId: payload.id });
    cardOpacity.value = withTiming(0, { duration: 200 },
      (ok) => { if (ok) runOnJS(onSkip ?? onDone)(); });
  }, [onSkip, onDone]);

  const isStepMode  = displayMode === 'step_by_step';
  const isScrollable = displayMode === 'multi' || displayMode === 'derivation';

  return (
    <Animated.View style={[styles.wrapper, cardStyle]}>

      {/* Accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: accentColor }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: accentColor + '22' }]}>
          <Text style={[styles.badgeText, { color: accentColor }]}>∑ FORMULA</Text>
        </View>
        {isStepMode && (
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {formulas.length}
          </Text>
        )}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Formula WebView */}
      <View style={[
        styles.formulaContainer,
        isScrollable && { height: Math.min(webViewHeight + 24, CARD_HEIGHT) },
        !isScrollable && { height: CARD_HEIGHT - 80 },
      ]}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          scrollEnabled={isScrollable}
          javaScriptEnabled
          onMessage={onMessage}
          backgroundColor="transparent"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        />
      </View>

      {/* Step controls */}
      {isStepMode && !animation.autoAdvance && (
        <View style={styles.stepControls}>
          <TouchableOpacity
            style={[styles.stepBtn, currentStep === 0 && styles.disabled]}
            onPress={handlePrev}
            disabled={currentStep === 0}
          >
            <Text style={[styles.stepBtnTxt, { color: accentColor }]}>← Prev</Text>
          </TouchableOpacity>

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {formulas.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === currentStep ? accentColor : accentColor + '40' },
                  i === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.stepBtn, currentStep === maxStep && styles.disabled]}
            onPress={handleNext}
            disabled={currentStep === maxStep}
          >
            <Text style={[styles.stepBtnTxt, { color: accentColor }]}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Caption */}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      {/* Done */}
      <TouchableOpacity
        style={[styles.doneBtn, { borderColor: accentColor, backgroundColor: accentColor + '18' }]}
        onPress={handleDone}
        activeOpacity={0.8}
      >
        <Text style={[styles.doneBtnTxt, { color: accentColor }]}>Got it →</Text>
      </TouchableOpacity>

    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  accentStrip: {
    height: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badge: {
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Typography.mono,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  stepCounter: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.mono,
  },
  skipBtn: { padding: 4 },
  skipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.mono,
    letterSpacing: 1,
  },
  formulaContainer: {
    width: CARD_WIDTH,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 8,
  },
  stepBtn: {
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.md,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  disabled: { opacity: 0.3 },
  stepBtnTxt: {
    fontSize: 12,
    fontFamily: Typography.mono,
    fontWeight: '700',
  },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 18,
    borderRadius: 4,
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    lineHeight: 18,
  },
  doneBtn: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  doneBtnTxt: {
    fontSize: 13,
    fontFamily: Typography.mono,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default KaTexNode;
