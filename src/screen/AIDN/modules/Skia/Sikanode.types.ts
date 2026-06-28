// ─── Paint & Effects ──────────────────────────────────────────────────────────

export interface GradientStop {
  offset: number;   // 0-1
  color: string;    // hex
}

export interface PaintConfig {
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
  opacity?: number;
  // Gradient (overrides color)
  linearGradient?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    stops: GradientStop[];
  };
  radialGradient?: {
    center: { x: number; y: number };
    radius: number;
    stops: GradientStop[];
  };
  // Effects
  blur?: number;             // gaussian blur radius
  glowColor?: string;        // adds outer glow
  glowRadius?: number;
  shadow?: {
    dx: number; dy: number;
    blur: number; color: string;
  };
  blendMode?: BlendModeType;
  // Dash
  dashed?: boolean;
  dashLength?: number;
  dashGap?: number;
  dashPhase?: number;
}

export type BlendModeType =
  | 'normal' | 'multiply' | 'screen' | 'overlay'
  | 'darken' | 'lighten' | 'colorDodge' | 'colorBurn'
  | 'hardLight' | 'softLight' | 'difference' | 'exclusion'
  | 'hue' | 'saturation' | 'color' | 'luminosity';

// ─── Draw Commands ────────────────────────────────────────────────────────────

export type DrawCommandType =
  | 'line' | 'dashed_line' | 'arrow' | 'double_arrow'
  | 'circle' | 'dot' | 'ellipse'
  | 'rect' | 'rounded_rect'
  | 'path'                   // SVG d= string
  | 'bezier'                 // cubic bezier
  | 'arc' | 'pie'
  | 'text' | 'text_on_path'
  | 'image'
  | 'particle_emitter'
  | 'layer_start' | 'layer_end'   // group compositing
  | 'clip_path' | 'clip_rect'
  | 'morph_path';             // animated path morph A→B

export interface DrawCommand {
  id: string;
  type: DrawCommandType;
  paint?: PaintConfig;

  // Coordinates (in logical units)
  x?: number;  y?: number;
  x1?: number; y1?: number;
  x2?: number; y2?: number;
  w?: number;  h?: number;

  // Circle / ellipse / arc
  cx?: number; cy?: number;
  r?: number;
  rx?: number; ry?: number;      // ellipse radii
  startAngle?: number;
  sweepAngle?: number;

  // Rect corner radius
  cornerRadius?: number;

  // Path (SVG string)
  d?: string;

  // Bezier control points
  cp1?: { x: number; y: number };
  cp2?: { x: number; y: number };

  // Text
  text?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  pathD?: string;             // text_on_path: follow this SVG path
  pathOffset?: number;        // offset along path 0-1

  // Image
  imageUrl?: string;
  imageBase64?: string;
  fit?: 'contain' | 'cover' | 'fill';

  // Path morph
  fromD?: string;
  toD?: string;
  morphProgress?: number;    // 0-1 or driven by animation

  // Particle emitter config
  particle?: ParticleConfig;

  // Layer compositing
  layerOpacity?: number;

  // Animation override for this command
  animation?: CommandAnimation;

  // Step-by-step
  stepIndex?: number;
}

// ─── Particle System ──────────────────────────────────────────────────────────

export interface ParticleConfig {
  emitX: number; emitY: number;
  count: number;
  radius: number;
  colors: string[];
  speed: number;          // logical units/sec
  spread: number;         // degrees
  lifetime: number;       // ms
  gravity?: number;
  fadeOut?: boolean;
  loop?: boolean;
}

// ─── Per-Command Animation ────────────────────────────────────────────────────

export interface CommandAnimation {
  // Path trim (stroke draw-on effect)
  trim?: {
    fromProgress: number;  // 0
    toProgress: number;    // 1
    durationMs: number;
    easing?: EasingType;
  };
  // Fade
  fade?: {
    from: number; to: number;
    durationMs: number;
    delayMs?: number;
  };
  // Scale pulse
  pulse?: {
    scale: number;         // e.g. 1.1
    durationMs: number;
    loop?: boolean;
  };
  // Path morph progress drive
  morphDrive?: {
    durationMs: number;
    easing?: EasingType;
    loop?: boolean;
    pingPong?: boolean;
  };
  // Position translate
  translate?: {
    fromX: number; fromY: number;
    toX: number;   toY: number;
    durationMs: number;
    easing?: EasingType;
    loop?: boolean;
  };
}

export type EasingType =
  | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'bounce' | 'elastic' | 'back';

// ─── Animation Presets ────────────────────────────────────────────────────────

export type AnimationPreset =
  | 'draw_on'          // paths draw themselves stroke by stroke
  | 'explode_in'       // shapes scale from 0
  | 'fade_cascade'     // commands fade in one by one
  | 'particle_burst'   // particle explosion at center
  | 'morph_loop'       // morph between all path commands
  | 'pulse_highlight'  // specific nodes pulse
  | 'draw_and_label'   // draw shape then fade in label
  | 'none';

// ─── Global Animation Config ──────────────────────────────────────────────────

export interface SkiaAnimationConfig {
  mode: 'instant' | 'step_by_step' | 'live' | 'preset';
  preset?: AnimationPreset;
  stepDurationMs?: number;
  autoAdvance?: boolean;
  loop?: boolean;
  totalDurationMs?: number;  // for preset mode
}

// ─── Main Payload ─────────────────────────────────────────────────────────────

export interface SkiaPayload {
  id?: string;
  commands: DrawCommand[];
  animation?: SkiaAnimationConfig;
  caption?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundColor?: string;
  backgroundGradient?: {
    stops: GradientStop[];
    direction?: 'vertical' | 'horizontal' | 'diagonal';
  };
}
