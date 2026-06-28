/**
 * AIDN Design Tokens
 * Dark premium theme — built for long study sessions.
 * Every module derives colors, spacing & type from here.
 */

export const Colors = {
  // Canvas
  canvas:       '#0F0F13',   // deepest background
  surface:      '#16161D',   // card/node surface
  surfaceRaised:'#1C1C26',   // elevated elements (code blocks, blockquotes)
  border:       '#2A2A3A',   // subtle separator
  borderAccent: '#3D3D5C',   // focused/hover border

  // Accent — indigo-violet, premium, not generic green
  accent:       '#7C6FFF',   // primary accent
  accentSoft:   '#7C6FFF22', // tinted backgrounds
  accentGlow:   '#7C6FFF44', // glow shadow

  // Text hierarchy
  textPrimary:  '#E8E8F0',   // headings
  textBody:     '#B8B8CC',   // body copy
  textMuted:    '#6B6B88',   // captions, metadata
  textCode:     '#A8D8B9',   // inline code — soft mint, readable on dark

  // Syntax highlight palette (for code blocks)
  syntaxKeyword:'#C792EA',   // purple
  syntaxString: '#C3E88D',   // green
  syntaxNumber: '#F78C6C',   // orange
  syntaxComment:'#546E7A',   // grey-blue
  syntaxFunc:   '#82AAFF',   // blue
  syntaxType:   '#FFCB6B',   // yellow

  // Semantic
  success:      '#4ADE80',
  warning:      '#FACC15',
  error:        '#FF6B6B',
  info:         '#60A5FA',

  // Table
  tableHeader:  '#1E1E2E',
  tableRowAlt:  '#19191F',
  tableRowBase: '#16161D',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  14,
  lg:  20,
  xl:  28,
  xxl: 40,
} as const;

export const Radius = {
  sm:  6,
  md:  10,
  lg:  16,
  xl:  22,
  pill:999,
} as const;

export const Typography = {
  // Scale
  h1: { fontSize: 26, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 22, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const, letterSpacing: -0.2 },
  h4: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  h5: { fontSize: 14, lineHeight: 22, fontWeight: '600' as const },
  h6: { fontSize: 13, lineHeight: 20, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 24, fontWeight: '400' as const },
  bodySmall: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const },
  code: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace' as const },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.4 },
} as const;

// 16:9 aspect ratio helper
export const ASPECT_16_9 = 9 / 16;
