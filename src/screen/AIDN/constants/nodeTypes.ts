// ─── Node Type Constants ──────────────────────────────────────────────────────
// Single source of truth — WebSocket payload ka "type" field yahi hoga

export const NODE_TYPES = {
  VIDEO:    'video',
  MARKDOWN: 'markdown',
  FORMULA:  'formula',
  SVG:      'svg',
  MCQ:      'mcq',
  AUDIO:    'audio',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];
