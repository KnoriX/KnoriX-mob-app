
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Path,
  Skia,
  Paint,
  Circle,
  Rect,
  Line,
  Text as SkiaText,
  useFont,
  Group,
  BlurMask,
  DashPathEffect,
  vec,
} from '@shopify/react-native-skia';
import { Colors, Typography, Spacing, Radius } from '../../styles/tokens';
import type { NodeProps } from '../../types/node.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

// ─── Draw Command Types ───────────────────────────────────────────────────────

export type DrawCommandType =
  | 'line'
  | 'circle'
  | 'rect'
  | 'path'
  | 'arrow'
  | 'text'
  | 'dashed_line'
  | 'arc'
  | 'dot';

export interface PaintConfig {
  color?: string;        // hex
  strokeWidth?: number;
  filled?: boolean;      // true = fill, false = stroke
  opacity?: number;      // 0-1
  blur?: number;         // blur radius for glow effect
  dashed?: boolean;
  dashGap?: number;
  dashLength?: number;
}

export interface DrawCommand {
  id: string;
  type: DrawCommandType;
  paint?: PaintConfig;
  // line / dashed_line / arrow
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  // circle / dot
  cx?: number; cy?: number; r?: number;
  // rect
  x?: number; y?: number; w?: number; h?: number;
  // arc
  startAngle?: number; sweepAngle?: number;
  // path (SVG path string)
  d?: string;
  // text
  text?: string;
  fontSize?: number;
  // animation
  stepIndex?: number;    // which step this command belongs to (for step-by-step)
  delayMs?: number;      // delay before this command renders
}

export interface SkiaAnimationConfig {
  mode: 'instant' | 'step_by_step' | 'live';
  stepDurationMs?: number;   // ms per step (step_by_step mode)
  autoAdvance?: boolean;     // auto go to next step
}

export interface SkiaPayload {
  commands: DrawCommand[];
  animation?: SkiaAnimationConfig;
  caption?: string;
  canvasWidth?: number;   // logical canvas units (default 400)
  canvasHeight?: number;  // logical canvas units (default 225)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToSkiaColor(hex: string, opacity = 1): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const a = Math.round(opacity * 255);
  return Skia.Color(`rgba(${r},${g},${b},${opacity})`);
}

function makePaint(cfg: PaintConfig = {}) {
  const paint = Skia.Paint();
  paint.setColor(hexToSkiaColor(cfg.color ?? '#7C6FFF', cfg.opacity ?? 1));
  paint.setStrokeWidth(cfg.strokeWidth ?? 2);
  paint.setStyle(cfg.filled ? 1 : 0); // 1=fill, 0=stroke
  paint.setAntiAlias(true);
  if (cfg.dashed) {
    paint.setPathEffect(
      Skia.PathEffect.MakeDash(
        [cfg.dashLength ?? 8, cfg.dashGap ?? 6],
        0,
      ),
    );
  }
  return paint;
}

/** Scales logical coords to actual canvas pixels */
function scale(
  val: number,
  logical: number,
  actual: number,
): number {
  return (val / logical) * actual;
}

// ─── Single Draw Command Renderer ─────────────────────────────────────────────

interface CmdProps {
  cmd: DrawCommand;
  scaleX: number;
  scaleY: number;
}

const DrawCmd: React.FC<CmdProps> = ({ cmd, scaleX, scaleY }) => {
  const sx = (v: number) => v * scaleX;
  const sy = (v: number) => v * scaleY;
  const paint = makePaint(cmd.paint);

  switch (cmd.type) {
    case 'line':
    case 'dashed_line': {
      const p = Skia.Path.Make();
      p.moveTo(sx(cmd.x1 ?? 0), sy(cmd.y1 ?? 0));
      p.lineTo(sx(cmd.x2 ?? 0), sy(cmd.y2 ?? 0));
      return <Path path={p} paint={paint} />;
    }

    case 'arrow': {
      const x1 = sx(cmd.x1 ?? 0);
      const y1 = sy(cmd.y1 ?? 0);
      const x2 = sx(cmd.x2 ?? 0);
      const y2 = sy(cmd.y2 ?? 0);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 12;
      const p = Skia.Path.Make();
      p.moveTo(x1, y1);
      p.lineTo(x2, y2);
      // arrowhead
      p.moveTo(x2, y2);
      p.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6),
      );
      p.moveTo(x2, y2);
      p.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6),
      );
      return <Path path={p} paint={paint} />;
    }

    case 'circle': {
      return (
        <Circle
          cx={sx(cmd.cx ?? 0)}
          cy={sy(cmd.cy ?? 0)}
          r={sx(cmd.r ?? 10)}
          paint={paint}
        />
      );
    }

    case 'dot': {
      const dotPaint = makePaint({ ...cmd.paint, filled: true });
      return (
        <Circle
          cx={sx(cmd.cx ?? 0)}
          cy={sy(cmd.cy ?? 0)}
          r={sx(cmd.r ?? 4)}
          paint={dotPaint}
        />
      );
    }

    case 'rect': {
      return (
        <Rect
          x={sx(cmd.x ?? 0)}
          y={sy(cmd.y ?? 0)}
          width={sx(cmd.w ?? 40)}
          height={sy(cmd.h ?? 40)}
          paint={paint}
        />
      );
    }

    case 'path': {
      if (!cmd.d) return null;
      const skPath = Skia.Path.MakeFromSVGString(cmd.d);
      if (!skPath) return null;
      // Scale the path
      const matrix = Skia.Matrix();
      matrix.scale(scaleX, scaleY);
      skPath.transform(matrix);
      return <Path path={skPath} paint={paint} />;
    }

    case 'arc': {
      const p = Skia.Path.Make();
      const bounds = {
        x: sx((cmd.cx ?? 0) - (cmd.r ?? 30)),
        y: sy((cmd.cy ?? 0) - (cmd.r ?? 30)),
        width: sx((cmd.r ?? 30) * 2),
        height: sy((cmd.r ?? 30) * 2),
      };
      p.addArc(bounds, cmd.startAngle ?? 0, cmd.sweepAngle ?? 180);
      return <Path path={p} paint={paint} />;
    }

    case 'text': {
      // SkiaText requires a font — we render via Paint color only
      // For production: load a font with useFont hook
      const textPaint = makePaint({ ...cmd.paint, filled: true });
      return (
        <SkiaText
          x={sx(cmd.x ?? 0)}
          y={sy(cmd.y ?? 0)}
          text={cmd.text ?? ''}
          font={null as any} // font should be loaded via useFont in parent
          paint={textPaint}
        />
      );
    }

    default:
      return null;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

const SkiaNode: React.FC<NodeProps<SkiaPayload>> = ({
  payload,
  onDone,
  onSkip,
  sendEvent,
}) => {
  const {
    commands = [],
    animation = { mode: 'instant' },
    caption,
    canvasWidth: logicalW = 400,
    canvasHeight: logicalH = 225,
  } = payload;

  // Scale factors: logical → pixel
  const scaleX = CARD_WIDTH / logicalW;
  const scaleY = CARD_HEIGHT / logicalH;

  // Step-by-step state
  const maxStep = Math.max(...commands.map((c) => c.stepIndex ?? 0), 0);
  const [currentStep, setCurrentStep] = useState(
    animation.mode === 'instant' ? maxStep : 0,
  );
  const [visibleCmds, setVisibleCmds] = useState<DrawCommand[]>(
    animation.mode === 'instant' ? commands : [],
  );
  const stepTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Fade animation ──
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });
    sendEvent?.({ type: 'skia_view_start', nodeId: payload.id });

    if (animation.mode === 'step_by_step' && animation.autoAdvance) {
      startAutoSteps();
    } else if (animation.mode === 'instant') {
      setVisibleCmds(commands);
    }

    return () => {
      if (stepTimer.current) clearTimeout(stepTimer.current);
    };
  }, []);

  // WS live commands
  useEffect(() => {
    if (animation.mode === 'live') {
      setVisibleCmds(commands);
    }
  }, [commands]);

  const startAutoSteps = useCallback(() => {
    let step = 0;
    const advance = () => {
      setCurrentStep(step);
      setVisibleCmds(commands.filter((c) => (c.stepIndex ?? 0) <= step));
      sendEvent?.({ type: 'skia_step', nodeId: payload.id, data: { step } });
      if (step < maxStep) {
        step++;
        stepTimer.current = setTimeout(advance, animation.stepDurationMs ?? 1200);
      }
    };
    advance();
  }, [commands, maxStep, animation.stepDurationMs]);

  const handleNextStep = useCallback(() => {
    if (currentStep >= maxStep) return;
    const next = currentStep + 1;
    setCurrentStep(next);
    setVisibleCmds(commands.filter((c) => (c.stepIndex ?? 0) <= next));
    sendEvent?.({ type: 'skia_step', nodeId: payload.id, data: { step: next } });
  }, [currentStep, maxStep, commands]);

  const handlePrevStep = useCallback(() => {
    if (currentStep <= 0) return;
    const prev = currentStep - 1;
    setCurrentStep(prev);
    setVisibleCmds(commands.filter((c) => (c.stepIndex ?? 0) <= prev));
  }, [currentStep]);

  const handleDone = useCallback(() => {
    sendEvent?.({ type: 'skia_view_complete', nodeId: payload.id });
    opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDone)(); });
    translateY.value = withTiming(-8, { duration: 200 });
  }, [onDone]);

  const handleSkip = useCallback(() => {
    sendEvent?.({ type: 'skia_skip', nodeId: payload.id });
    opacity.value = withTiming(0, { duration: 200 },
      (finished) => { if (finished) runOnJS(onSkip ?? onDone)(); });
  }, [onSkip, onDone]);

  const isStepMode = animation.mode === 'step_by_step';

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      {/* Accent strip */}
      <View style={styles.accentStrip} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CANVAS</Text>
        </View>
        {isStepMode && (
          <Text style={styles.stepCounter}>
            {currentStep + 1} / {maxStep + 1}
          </Text>
        )}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Skia Canvas */}
      <View style={styles.canvasWrapper}>
        <Canvas style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          {visibleCmds.map((cmd) => (
            <DrawCmd key={cmd.id} cmd={cmd} scaleX={scaleX} scaleY={scaleY} />
          ))}
        </Canvas>
      </View>

      {/* Step controls */}
      {isStepMode && !animation.autoAdvance && (
        <View style={styles.stepControls}>
          <TouchableOpacity
            style={[styles.stepBtn, currentStep === 0 && styles.stepBtnDisabled]}
            onPress={handlePrevStep}
            disabled={currentStep === 0}
          >
            <Text style={styles.stepBtnText}>← Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepBtn, currentStep === maxStep && styles.stepBtnDisabled]}
            onPress={handleNextStep}
            disabled={currentStep === maxStep}
          >
            <Text style={styles.stepBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Caption */}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      {/* Done */}
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneBtnText}>Got it →</Text>
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
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: Colors.accent,
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
  canvasWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.background,
  },
  stepControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: 8,
  },
  stepBtn: {
    flex: 1,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.md,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: Colors.accent,
    fontSize: 12,
    fontFamily: Typography.mono,
    fontWeight: '700',
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
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  doneBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: Typography.mono,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default SkiaNode;
