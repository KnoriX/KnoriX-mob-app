// ─────────────────────────────────────────────────────────────
// types/audio.types.ts
// AudioNode — full type definitions
// FastAPI serves audio · Timestamps drive the entire canvas
// ─────────────────────────────────────────────────────────────

// ─── Audio Source ────────────────────────────────────────────

export type AudioSourceMode =
  | 'prerecorded'   // FastAPI serves existing MP3/WAV
  | 'tts';          // FastAPI generates TTS on-demand then serves URL

export interface AudioSource {
  mode: AudioSourceMode;
  /** Direct URL to audio file — FastAPI returns this */
  url: string;
  /** Duration in seconds — backend provides so we don't wait for metadata */
  durationSeconds: number;
  /** Optional: mime type hint */
  mimeType?: 'audio/mpeg' | 'audio/wav' | 'audio/aac' | 'audio/ogg';
}

// ─── Timestamp Events ────────────────────────────────────────
// Backend sends these alongside audio — canvas reacts at exact times

export type TimestampAction =

  // ── Node control ──────────────────────────────────────────
  | {
      at: number;                         // seconds from audio start
      action: 'show_node';               // add a node to canvas
      nodeId: string;
      nodeType: string;
      payload: Record<string, unknown>;
    }
  | {
      at: number;
      action: 'remove_node';             // remove a node from canvas
      nodeId: string;
    }
  | {
      at: number;
      action: 'highlight_node';          // pulse-glow a node
      nodeId: string;
      color?: string;
      durationMs?: number;
    }
  | {
      at: number;
      action: 'scroll_to_node';          // scroll canvas to bring node into view
      nodeId: string;
    }

  // ── Skia canvas commands ──────────────────────────────────
  | {
      at: number;
      action: 'skia_cmd';                // draw on a SkiaNode canvas
      targetNodeId: string;              // which SkiaNode to target
      cmd: Record<string, unknown>;      // same WhiteboardCommand format
    }
  | {
      at: number;
      action: 'skia_clear';
      targetNodeId: string;
    }

  // ── Text overlay ─────────────────────────────────────────
  | {
      at: number;
      action: 'show_caption';            // subtitle/caption overlay on AudioNode card
      text: string;
      durationMs?: number;               // auto-hide after N ms; omit = stay until next
    }
  | {
      at: number;
      action: 'hide_caption';
    }

  // ── Emphasis / attention ──────────────────────────────────
  | {
      at: number;
      action: 'pulse_word';              // highlight a keyword in caption
      word: string;
      color?: string;
    }

  // ── MCQ trigger ──────────────────────────────────────────
  | {
      at: number;
      action: 'trigger_mcq';            // pause audio + show MCQ; resume on answer
      mcqPayload: Record<string, unknown>;
      pauseAudio: boolean;
    }

  // ── Audio control ─────────────────────────────────────────
  | {
      at: number;
      action: 'audio_pause';            // backend-scheduled pause (dramatic effect)
      resumeAfterMs?: number;
    }

  // ── Chapter markers ───────────────────────────────────────
  | {
      at: number;
      action: 'chapter_marker';
      title: string;
    };

// ─── Chapter (for seek bar UI) ───────────────────────────────

export interface AudioChapter {
  at: number;           // seconds
  title: string;
}

// ─── Main Payload ─────────────────────────────────────────────

export interface AudioPayload {
  /** FastAPI endpoint to fetch audio — GET returns AudioSource JSON */
  audioFetchUrl: string;

  /** Timestamp-driven canvas events */
  timestamps: TimestampAction[];

  /** Extracted chapters for seek bar (subset of chapter_marker events) */
  chapters?: AudioChapter[];

  /** Show waveform visualizer on card */
  showWaveform?: boolean;

  /** Show caption bar */
  showCaptions?: boolean;

  /** Auto-play on mount */
  autoPlay?: boolean;

  /** Tags for backend analytics */
  tags?: string[];

  /** Session ID for analytics pings */
  sessionId: string;

  /** FastAPI base URL for analytics */
  apiBaseUrl: string;
}

// ─── Canvas event dispatcher (used by useAudioSync) ──────────

export interface CanvasEventDispatcher {
  showNode: (nodeId: string, nodeType: string, payload: Record<string, unknown>) => void;
  removeNode: (nodeId: string) => void;
  highlightNode: (nodeId: string, color: string, durationMs: number) => void;
  scrollToNode: (nodeId: string) => void;
  skiaCmd: (targetNodeId: string, cmd: Record<string, unknown>) => void;
  skiaClear: (targetNodeId: string) => void;
  triggerMCQ: (mcqPayload: Record<string, unknown>) => void;
}
