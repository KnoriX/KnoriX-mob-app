export const NODE_TYPES = {
  MARKDOWN: 'markdown',
  MCQ: 'mcq',
  VIDEO: 'video',
  KATEX: 'katex',
  MERMAID: 'mermaid',
  SKIA: 'skia',
  SVG: 'svg',
  AUDIO: 'audio',
  REALTIME: 'realtime',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// Layout hints AI can send alongside node type
export const LAYOUT_MODES = {
  FULL: 'full',       // full screen width
  HALF: 'half',       // 50% width (side by side)
  CARD: 'card',       // card with padding
  OVERLAY: 'overlay', // floats over prev node
} as const;

export type LayoutMode = typeof LAYOUT_MODES[keyof typeof LAYOUT_MODES];
