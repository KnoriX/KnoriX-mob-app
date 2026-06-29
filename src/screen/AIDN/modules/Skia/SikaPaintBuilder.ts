import { Skia, BlendMode, TileMode } from '@shopify/react-native-skia';
import type { PaintConfig, BlendModeType, GradientStop } from './skiaNode.types';

// ─── Blend mode map ───────────────────────────────────────────────────────────

const BLEND_MAP: Record<BlendModeType, BlendMode> = {
  normal:     BlendMode.SrcOver,
  multiply:   BlendMode.Multiply,
  screen:     BlendMode.Screen,
  overlay:    BlendMode.Overlay,
  darken:     BlendMode.Darken,
  lighten:    BlendMode.Lighten,
  colorDodge: BlendMode.ColorDodge,
  colorBurn:  BlendMode.ColorBurn,
  hardLight:  BlendMode.HardLight,
  softLight:  BlendMode.SoftLight,
  difference: BlendMode.Difference,
  exclusion:  BlendMode.Exclusion,
  hue:        BlendMode.Hue,
  saturation: BlendMode.Saturation,
  color:      BlendMode.Color,
  luminosity: BlendMode.Luminosity,
};

// ─── Color helpers ────────────────────────────────────────────────────────────

export function parseColor(hex: string, opacity = 1): Float32Array {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return new Float32Array([r, g, b, opacity]);
}

export function hexToSkia(hex: string, opacity = 1) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return Skia.Color(`rgba(${r},${g},${b},${opacity})`);
}

// ─── Paint builder ────────────────────────────────────────────────────────────

export function buildPaint(
  cfg: PaintConfig = {},
  scaleX = 1,
  scaleY = 1,
) {
  const paint = Skia.Paint();
  const opacity = cfg.opacity ?? 1;

  // Style
  paint.setStyle(cfg.filled ? 1 : 0);
  paint.setStrokeWidth((cfg.strokeWidth ?? 2) * ((scaleX + scaleY) / 2));
  paint.setAntiAlias(true);
  paint.setStrokeCap(1); // round
  paint.setStrokeJoin(1); // round

  // Color / Gradient
  if (cfg.linearGradient) {
    const { start, end, stops } = cfg.linearGradient;
    const shader = Skia.Shader.MakeLinearGradient(
      { x: start.x * scaleX, y: start.y * scaleY },
      { x: end.x * scaleX,   y: end.y * scaleY },
      stops.map((s) => hexToSkia(s.color, opacity)),
      stops.map((s) => s.offset),
      TileMode.Clamp,
    );
    paint.setShader(shader);
  } else if (cfg.radialGradient) {
    const { center, radius, stops } = cfg.radialGradient;
    const shader = Skia.Shader.MakeRadialGradient(
      { x: center.x * scaleX, y: center.y * scaleY },
      radius * scaleX,
      stops.map((s) => hexToSkia(s.color, opacity)),
      stops.map((s) => s.offset),
      TileMode.Clamp,
    );
    paint.setShader(shader);
  } else {
    paint.setColor(hexToSkia(cfg.color ?? '#7C6FFF', opacity));
  }

  // Blend mode
  if (cfg.blendMode) {
    paint.setBlendMode(BLEND_MAP[cfg.blendMode] ?? BlendMode.SrcOver);
  }

  // Dash effect
  if (cfg.dashed) {
    paint.setPathEffect(
      Skia.PathEffect.MakeDash(
        [cfg.dashLength ?? 8, cfg.dashGap ?? 6],
        cfg.dashPhase ?? 0,
      ),
    );
  }

  // Image filter: shadow
  if (cfg.shadow) {
    const { dx, dy, blur, color } = cfg.shadow;
    const avg = (scaleX + scaleY) / 2;
    paint.setImageFilter(
      Skia.ImageFilter.MakeDropShadow(
        dx * avg, dy * avg, blur * avg, blur * avg,
        hexToSkia(color),
        null,
      ),
    );
  }

  // Mask filter: blur / glow
  if (cfg.blur) {
    paint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(0, cfg.blur * ((scaleX + scaleY) / 2), true),
    );
  } else if (cfg.glowColor && cfg.glowRadius) {
    paint.setMaskFilter(
      Skia.MaskFilter.MakeBlur(0, cfg.glowRadius * ((scaleX + scaleY) / 2), false),
    );
  }

  return paint;
}

// ─── Glow paint (second pass for glow effect) ─────────────────────────────────

export function buildGlowPaint(cfg: PaintConfig, scaleX = 1, scaleY = 1) {
  if (!cfg.glowColor || !cfg.glowRadius) return null;
  const paint = Skia.Paint();
  paint.setColor(hexToSkia(cfg.glowColor, 0.6));
  paint.setStyle(0); // stroke
  paint.setStrokeWidth((cfg.strokeWidth ?? 2) * ((scaleX + scaleY) / 2));
  paint.setAntiAlias(true);
  paint.setMaskFilter(
    Skia.MaskFilter.MakeBlur(0, cfg.glowRadius * ((scaleX + scaleY) / 2), false),
  );
  return paint;
}

// ─── Arrow geometry ───────────────────────────────────────────────────────────

export function buildArrowPath(
  x1: number, y1: number, x2: number, y2: number,
  headLen = 14,
  bothEnds = false,
) {
  const path = Skia.Path.Make();
  const angle = Math.atan2(y2 - y1, x2 - x1);

  path.moveTo(x1, y1);
  path.lineTo(x2, y2);

  // End arrowhead
  path.moveTo(x2, y2);
  path.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 7),
    y2 - headLen * Math.sin(angle - Math.PI / 7),
  );
  path.moveTo(x2, y2);
  path.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 7),
    y2 - headLen * Math.sin(angle + Math.PI / 7),
  );

  // Start arrowhead (double_arrow)
  if (bothEnds) {
    const backAngle = angle + Math.PI;
    path.moveTo(x1, y1);
    path.lineTo(
      x1 - headLen * Math.cos(backAngle - Math.PI / 7),
      y1 - headLen * Math.sin(backAngle - Math.PI / 7),
    );
    path.moveTo(x1, y1);
    path.lineTo(
      x1 - headLen * Math.cos(backAngle + Math.PI / 7),
      y1 - headLen * Math.sin(backAngle + Math.PI / 7),
    );
  }

  return path;
}

// ─── Easing functions ─────────────────────────────────────────────────────────

import { Easing } from 'react-native-reanimated';
import type { EasingType } from './skiaNode.types';

export function resolveEasing(type?: EasingType) {
  switch (type) {
    case 'easeIn':    return Easing.in(Easing.quad);
    case 'easeOut':   return Easing.out(Easing.quad);
    case 'easeInOut': return Easing.inOut(Easing.quad);
    case 'bounce':    return Easing.bounce;
    case 'elastic':   return Easing.elastic(1.2);
    case 'back':      return Easing.back(1.5);
    default:          return Easing.linear;
  }
}
