// ─── Formula Item ─────────────────────────────────────────────────────────────

export interface FormulaItem {
  id: string;
  /** Raw LaTeX string e.g. "E = mc^2" */
  latex?: string;
  /** Pre-rendered HTML from backend (takes priority over latex) */
  html?: string;
  /** Label shown above formula e.g. "Step 1: Apply Newton's Law" */
  label?: string;
  /** Explanation shown below formula */
  explanation?: string;
  /** Highlight specific parts — backend sends list of substrings to highlight */
  highlights?: FormulaHighlight[];
  /** Step index for step-by-step mode */
  stepIndex?: number;
  /** Display mode: block (centered) or inline */
  displayMode?: 'block' | 'inline';
  /** Font size scale (default 1) */
  scale?: number;
}

export interface FormulaHighlight {
  /** LaTeX substring to highlight */
  term: string;
  color: string;
  label?: string;
}

// ─── Display Modes ────────────────────────────────────────────────────────────

export type KaTexDisplayMode =
  | 'single'        // one formula, full card
  | 'multi'         // multiple formulas, scrollable
  | 'step_by_step'  // one formula at a time, manual/auto advance
  | 'derivation';   // numbered derivation steps with arrows between

export interface KaTexAnimationConfig {
  mode: 'instant' | 'step_by_step';
  stepDurationMs?: number;
  autoAdvance?: boolean;
}

// ─── Main Payload ─────────────────────────────────────────────────────────────

export interface KaTexPayload {
  id?: string;
  displayMode: KaTexDisplayMode;
  formulas: FormulaItem[];
  animation?: KaTexAnimationConfig;
  caption?: string;
  /** Global theme override */
  accentColor?: string;
}
