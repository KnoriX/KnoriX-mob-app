import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, Easing, runOnJS,
} from 'react-native-reanimated';
import {
  Canvas, Path, Skia, Circle, Rect, RoundedRect,
  Group, Text as SkiaText,
  LinearGradient, vec,
  useValue, runTiming, runSpring,
  interpolatePath, useDerivedValue,
} from '@shopify/react-native-skia';

import { Colors, Typography, Spacing, Radius } from '../../styles/token';
import {
  buildPaint, buildGlowPaint, buildArrowPath, resolveEasing, hexToSkia,
} from './SkiaPaintBuilder';
import { useParticleSystem } from './useParticleSystem';
import type {
  SkiaPayload, DrawCommand, AnimationPreset,
} from './SkiaNode.types';
import type { NodeProps } from '../../types/node.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH  = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

// ─── Per-command animated renderer ───────────────────────────────────────────

interface AnimCmdProps {
  cmd: DrawCommand;
  scaleX: number;
  scaleY: number;
  preset: AnimationPreset;
}

const AnimatedCommand: React.FC<AnimCmdProps> = ({ cmd, scaleX, scaleY, preset }) => {
  const sx  = (v: number) => v * scaleX;
  const sy  = (v: number) => v * scaleY;
  const avg = (scaleX + scaleY) / 2;

  const opacity        = useValue(preset === 'none' || preset === 'instant' ? 1 : 0);
  const trimEnd        = useValue(preset === 'draw_on' ? 0 : 1);
  const scale          = useValue(preset === 'explode_in' ? 0 : 1);
  const translateX     = useValue(cmd.animation?.translate ? sx(cmd.animation.translate.fromX) : 0);
  const translateY_val = useValue(cmd.animation?.translate ? sy(cmd.animation.translate.fromY) : 0);
  const morphProgress  = useValue(0);

  const anim = cmd.animation;

  useEffect(() => {
    const delay = anim?.fade?.delayMs ?? 0;

    // Fade in
    if (preset === 'fade_cascade' || anim?.fade) {
      setTimeout(() => runTiming(opacity, anim?.fade?.to ?? 1, { duration: anim?.fade?.durationMs ?? 400 }), delay);
    } else {
      runTiming(opacity, 1, { duration: 300 });
    }

    // Draw-on (path trim)
    if (preset === 'draw_on' || anim?.trim) {
      runTiming(trimEnd, 1, {
        duration: anim?.trim?.durationMs ?? 800,
        easing: resolveEasing(anim?.trim?.easing),
      });
    }

    // Explode in (spring scale)
    if (preset === 'explode_in') {
      runSpring(scale, 1, { mass: 0.8, stiffness: 180, damping: 12 });
    } else if (anim?.pulse) {
      runTiming(scale, anim.pulse.scale, { duration: anim.pulse.durationMs });
    }

    // Translate
    if (anim?.translate) {
      runTiming(translateX, sx(anim.translate.toX), {
        duration: anim.translate.durationMs,
        easing: resolveEasing(anim.translate.easing),
      });
      runTiming(translateY_val, sy(anim.translate.toY), {
        duration: anim.translate.durationMs,
        easing: resolveEasing(anim.translate.easing),
      });
    }

    // Morph
    if (anim?.morphDrive) {
      runTiming(morphProgress, 1, {
        duration: anim.morphDrive.durationMs,
        easing: resolveEasing(anim.morphDrive.easing),
      });
    }
  }, []);

  const matrix = useDerivedValue(() => {
    const m = Skia.Matrix();
    m.translate(translateX.current, translateY_val.current);
    m.scale(scale.current, scale.current);
    return m;
  }, [scale, translateX, translateY_val]);

  const paint     = useMemo(() => buildPaint(cmd.paint ?? {}, scaleX, scaleY), []);
  const glowPaint = useMemo(() => buildGlowPaint(cmd.paint ?? {}, scaleX, scaleY), []);

  // ── Morph path setup — computed unconditionally at top level so the
  //    useDerivedValue hook below always runs, regardless of cmd.type.
  //    (Hooks can't live inside renderShape() since it's a plain helper
  //    function, not a component or custom hook — moving the derived
  //    value here keeps the hook call unconditional and satisfies
  //    react-hooks/rules-of-hooks.)
  const morphFromTo = useMemo(() => {
    if (cmd.type !== 'morph_path' || !cmd.fromD || !cmd.toD) return null;
    const from = Skia.Path.MakeFromSVGString(cmd.fromD);
    const to   = Skia.Path.MakeFromSVGString(cmd.toD);
    if (!from || !to) return null;
    const mFrom = Skia.Matrix(); mFrom.scale(scaleX, scaleY); from.transform(mFrom);
    const mTo   = Skia.Matrix(); mTo.scale(scaleX, scaleY);   to.transform(mTo);
    return { from, to };
  }, [cmd, scaleX, scaleY]);

  const morphedPath = useDerivedValue(() => {
    if (!morphFromTo) return Skia.Path.Make();
    return interpolatePath(morphProgress.current, [0, 1], [morphFromTo.from, morphFromTo.to]);
  }, [morphProgress, morphFromTo]);

  const renderShape = () => {
    switch (cmd.type) {
      case 'line':
      case 'dashed_line': {
        const p = Skia.Path.Make();
        p.moveTo(sx(cmd.x1 ?? 0), sy(cmd.y1 ?? 0));
        p.lineTo(sx(cmd.x2 ?? 0), sy(cmd.y2 ?? 0));
        return (
          <>
            {glowPaint && <Path path={p} paint={glowPaint} start={trimEnd} end={trimEnd} />}
            <Path path={p} paint={paint} start={0} end={trimEnd} />
          </>
        );
      }
      case 'arrow': {
        const p = buildArrowPath(sx(cmd.x1!), sy(cmd.y1!), sx(cmd.x2!), sy(cmd.y2!), 14 * avg);
        return <Path path={p} paint={paint} start={0} end={trimEnd} />;
      }
      case 'double_arrow': {
        const p = buildArrowPath(sx(cmd.x1!), sy(cmd.y1!), sx(cmd.x2!), sy(cmd.y2!), 14 * avg, true);
        return <Path path={p} paint={paint} start={0} end={trimEnd} />;
      }
      case 'circle':
      case 'dot': {
        const cp = cmd.type === 'dot' ? buildPaint({ ...cmd.paint, filled: true }, scaleX, scaleY) : paint;
        return (
          <>
            {glowPaint && <Circle cx={sx(cmd.cx!)} cy={sy(cmd.cy!)} r={sx(cmd.r!)} paint={glowPaint} />}
            <Circle cx={sx(cmd.cx!)} cy={sy(cmd.cy!)} r={sx(cmd.r!)} paint={cp} />
          </>
        );
      }
      case 'rect': {
        return (
          <>
            {glowPaint && <Rect x={sx(cmd.x!)} y={sy(cmd.y!)} width={sx(cmd.w!)} height={sy(cmd.h!)} paint={glowPaint} />}
            <Rect x={sx(cmd.x!)} y={sy(cmd.y!)} width={sx(cmd.w!)} height={sy(cmd.h!)} paint={paint} />
          </>
        );
      }
      case 'rounded_rect': {
        return (
          <RoundedRect
            x={sx(cmd.x!)} y={sy(cmd.y!)}
            width={sx(cmd.w!)} height={sy(cmd.h!)}
            r={(cmd.cornerRadius ?? 8) * avg}
            paint={paint}
          />
        );
      }
      case 'arc':
      case 'pie': {
        const p = Skia.Path.Make();
        const bounds = { x: sx(cmd.cx!) - sx(cmd.r!), y: sy(cmd.cy!) - sy(cmd.r!), width: sx(cmd.r!) * 2, height: sy(cmd.r!) * 2 };
        p.addArc(bounds, cmd.startAngle ?? 0, cmd.sweepAngle ?? 180);
        if (cmd.type === 'pie') { p.lineTo(sx(cmd.cx!), sy(cmd.cy!)); p.close(); }
        return <Path path={p} paint={paint} start={0} end={trimEnd} />;
      }
      case 'path': {
        if (!cmd.d) return null;
        const skPath = Skia.Path.MakeFromSVGString(cmd.d);
        if (!skPath) return null;
        const m = Skia.Matrix(); m.scale(scaleX, scaleY);
        skPath.transform(m);
        return (
          <>
            {glowPaint && <Path path={skPath} paint={glowPaint} start={0} end={trimEnd} />}
            <Path path={skPath} paint={paint} start={0} end={trimEnd} />
          </>
        );
      }
      case 'bezier': {
        if (!cmd.cp1 || !cmd.cp2) return null;
        const p = Skia.Path.Make();
        p.moveTo(sx(cmd.x1!), sy(cmd.y1!));
        p.cubicTo(sx(cmd.cp1.x), sy(cmd.cp1.y), sx(cmd.cp2.x), sy(cmd.cp2.y), sx(cmd.x2!), sy(cmd.y2!));
        return (
          <>
            {glowPaint && <Path path={p} paint={glowPaint} start={0} end={trimEnd} />}
            <Path path={p} paint={paint} start={0} end={trimEnd} />
          </>
        );
      }
      case 'morph_path': {
        if (!morphFromTo) return null;
        return <Path path={morphedPath} paint={paint} />;
      }
      case 'text': {
        const tp = buildPaint({ ...cmd.paint, filled: true }, scaleX, scaleY);
        return <SkiaText x={sx(cmd.x ?? 0)} y={sy(cmd.y ?? 0)} text={cmd.text ?? ''} font={null as any} paint={tp} />;
      }
      default:
        return null;
    }
  };

  return (
    <Group opacity={opacity} matrix={matrix}>
      {renderShape()}
    </Group>
  );
};

// ─── Main SkiaNode ────────────────────────────────────────────────────────────

const SkiaNode: React.FC<NodeProps<SkiaPayload>> = ({ payload, onDone, onSkip, sendEvent }) => {
  const {
    commands = [],
    animation = { mode: 'instant' },
    caption,
    canvasWidth:  logicalW = 400,
    canvasHeight: logicalH = 225,
    backgroundColor,
    backgroundGradient,
  } = payload;

  const scaleX = CARD_WIDTH  / logicalW;
  const scaleY = CARD_HEIGHT / logicalH;
  const maxStep = Math.max(...commands.map((c) => c.stepIndex ?? 0), 0);

  const [currentStep, setCurrentStep] = useState(animation.mode === 'instant' ? maxStep : 0);
  const stepTimer = useRef<NodeJS.Timeout | null>(null);

  const visibleCmds = useMemo(
    () => commands.filter((c) => (c.stepIndex ?? 0) <= currentStep),
    [commands, currentStep],
  );

  const particleCmd = visibleCmds.find((c) => c.type === 'particle_emitter');
  const particles   = useParticleSystem(
    particleCmd?.particle ?? null, scaleX, scaleY, !!particleCmd,
  );

  const cardOpacity   = useSharedValue(0);
  const cardTranslate = useSharedValue(12);
  const cardStyle     = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  useEffect(() => {
    cardOpacity.value   = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    cardTranslate.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });
    sendEvent?.({ type: 'skia_view_start', nodeId: payload.id });

    if (animation.mode === 'step_by_step' && animation.autoAdvance) {
      autoStep(0);
    }
    return () => { if (stepTimer.current) clearTimeout(stepTimer.current); };
  }, []);

  useEffect(() => {
    if (animation.mode === 'live') setCurrentStep(maxStep);
  }, [commands.length]);

  const autoStep = useCallback((step: number) => {
    setCurrentStep(step);
    sendEvent?.({ type: 'skia_step', nodeId: payload.id, data: { step } });
    if (step < maxStep) {
      stepTimer.current = setTimeout(() => autoStep(step + 1), animation.stepDurationMs ?? 1200);
    }
  }, [maxStep, animation.stepDurationMs]);

  const handleNext = () => { if (currentStep < maxStep) { const n = currentStep + 1; setCurrentStep(n); sendEvent?.({ type: 'skia_step', nodeId: payload.id, data: { step: n } }); } };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const handleDone = useCallback(() => {
    sendEvent?.({ type: 'skia_complete', nodeId: payload.id });
    cardOpacity.value   = withTiming(0, { duration: 200 }, (ok) => { if (ok) runOnJS(onDone)(); });
    cardTranslate.value = withTiming(-8, { duration: 200 });
  }, [onDone]);

  const handleSkip = useCallback(() => {
    sendEvent?.({ type: 'skia_skip', nodeId: payload.id });
    cardOpacity.value = withTiming(0, { duration: 200 }, (ok) => { if (ok) runOnJS(onSkip ?? onDone)(); });
  }, [onSkip, onDone]);

  const isStepMode = animation.mode === 'step_by_step';
  const preset: AnimationPreset = animation.preset ?? (animation.mode === 'instant' ? 'none' : 'fade_cascade');
  const bgColor = backgroundColor ?? '#0A0A0F';

  return (
    <Animated.View style={[styles.wrapper, cardStyle]}>
      <View style={styles.accentStrip} />
      <View style={styles.header}>
        <View style={styles.badge}><Text style={styles.badgeText}>CANVAS</Text></View>
        {isStepMode && <Text style={styles.stepCounter}>{currentStep + 1} / {maxStep + 1}</Text>}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}><Text style={styles.skipText}>SKIP</Text></TouchableOpacity>
      </View>

      <View style={[styles.canvasWrapper, { backgroundColor: bgColor }]}>
        <Canvas style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          {/* Background gradient */}
          {backgroundGradient && (
            <Rect x={0} y={0} width={CARD_WIDTH} height={CARD_HEIGHT}>
              <LinearGradient
                start={vec(0, 0)}
                end={backgroundGradient.direction === 'horizontal' ? vec(CARD_WIDTH, 0) : backgroundGradient.direction === 'diagonal' ? vec(CARD_WIDTH, CARD_HEIGHT) : vec(0, CARD_HEIGHT)}
                colors={backgroundGradient.stops.map((s) => hexToSkia(s.color))}
                positions={backgroundGradient.stops.map((s) => s.offset)}
              />
            </Rect>
          )}

          {/* Draw commands */}
          {visibleCmds
            .filter((c) => c.type !== 'particle_emitter')
            .map((cmd) => (
              <AnimatedCommand key={cmd.id} cmd={cmd} scaleX={scaleX} scaleY={scaleY} preset={preset} />
            ))}

          {/* Particles */}
          {particles.map((p) => {
            const pt = Skia.Paint();
            pt.setColor(hexToSkia(p.color, p.opacity));
            pt.setStyle(1);
            return <Circle key={p.id} cx={p.x} cy={p.y} r={p.radius} paint={pt} />;
          })}
        </Canvas>
      </View>

      {isStepMode && !animation.autoAdvance && (
        <View style={styles.stepControls}>
          <TouchableOpacity style={[styles.stepBtn, currentStep === 0 && styles.disabled]} onPress={handlePrev} disabled={currentStep === 0}>
            <Text style={styles.stepBtnTxt}>← Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.stepBtn, currentStep === maxStep && styles.disabled]} onPress={handleNext} disabled={currentStep === maxStep}>
            <Text style={styles.stepBtnTxt}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneBtnTxt}>Got it →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: { width: CARD_WIDTH, alignSelf: 'center', backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginVertical: Spacing.md },
  accentStrip: { height: 3, backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  badge: { backgroundColor: Colors.accentMuted, borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: Colors.accent, fontSize: 10, fontFamily: Typography.mono, letterSpacing: 1.2, fontWeight: '700' },
  stepCounter: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.mono },
  skipBtn: { padding: 4 },
  skipText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.mono, letterSpacing: 1 },
  canvasWrapper: { width: CARD_WIDTH, height: CARD_HEIGHT },
  stepControls: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: 8 },
  stepBtn: { flex: 1, backgroundColor: Colors.accentMuted, borderRadius: Radius.md, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.accent },
  disabled: { opacity: 0.3 },
  stepBtnTxt: { color: Colors.accent, fontSize: 12, fontFamily: Typography.mono, fontWeight: '700' },
  caption: { color: Colors.textSecondary, fontSize: 12, fontFamily: Typography.body, textAlign: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, lineHeight: 18 },
  doneBtn: { margin: Spacing.md, marginTop: Spacing.sm, backgroundColor: Colors.accentMuted, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.accent },
  doneBtnTxt: { color: Colors.accent, fontSize: 13, fontFamily: Typography.mono, fontWeight: '700', letterSpacing: 0.8 },
});

export default SkiaNode;
