import { useEffect, useRef, useCallback } from 'react';
import Sound from 'react-native-sound';
import { useWebSocket } from '../hooks/useWebSocket';

// ─── Types ───────────────────────────────────────────────────────────────────

type AudioMode = 'url' | 'duplex';

export interface AudioNodeData {
  id: string;
  type: 'audio';
  mode: AudioMode;

  // URL mode — pre-recorded AI voice (FastAPI sends this)
  url?: string;

  // Duplex mode — WebSocket streams PCM chunks
  // Same WebSocket connection used for lesson + doubt solving
  duplexChannel?: string;   // e.g. "lesson" | "doubt" | "mentor"
}

interface AudioNodeProps {
  data: AudioNodeData;
  onComplete: (nodeId: string) => void;
  onError?: (nodeId: string, error: string) => void;

  // Sync controls — called by parent renderer
  // Parent pauses audio when student raises hand
  paused?: boolean;
}

// ─── Audio Node ───────────────────────────────────────────────────────────────
// Pure background component — renders nothing
// Syncs with other nodes via paused prop

const AudioNode: React.FC<AudioNodeProps> = ({
  data,
  onComplete,
  onError,
  paused = false,
}) => {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const soundRef        = useRef<Sound | null>(null);
  const isPlayingRef    = useRef(false);
  const chunkQueueRef   = useRef<ArrayBuffer[]>([]);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ── WebSocket (duplex mode) ───────────────────────────────────────────────
  const { lastMessage, sendMessage } = useWebSocket();

  // ── URL Mode ──────────────────────────────────────────────────────────────

  const loadAndPlayUrl = useCallback((url: string) => {
    Sound.setCategory('Playback', true);

    const sound = new Sound(url, '', (error) => {
      if (error) {
        onError?.(data.id, `Audio load failed: ${error.message}`);
        return;
      }

      soundRef.current = sound;

      if (!paused) {
        sound.play((success) => {
          if (success) {
            onComplete(data.id);
          } else {
            onError?.(data.id, 'Audio playback failed');
          }
        });
        isPlayingRef.current = true;
      }
    });
  }, [data.id, paused, onComplete, onError]);

  // ── Duplex Mode — WebSocket PCM chunk processing ──────────────────────────

  const processChunkQueue = useCallback(async () => {
    if (isProcessingRef.current || chunkQueueRef.current.length === 0) return;
    if (paused) return;

    isProcessingRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      if (paused) break;

      const chunk = chunkQueueRef.current.shift();
      if (!chunk) break;

      await playPcmChunk(chunk);
    }

    isProcessingRef.current = false;
  }, [paused]);

  const playPcmChunk = (buffer: ArrayBuffer): Promise<void> => {
    return new Promise((resolve) => {
      try {
        // Decode PCM chunk and play via Web Audio API
        // React Native supports this via react-native-webrtc or expo-av
        // For RN CLI — we write chunks to a temp file and play
        // This is the most compatible approach for PCM streaming
        const blob     = new Blob([buffer], { type: 'audio/pcm' });
        const url      = URL.createObjectURL(blob);
        const sound    = new Sound(url, '', (err) => {
          if (err) { resolve(); return; }
          sound.play(() => {
            sound.release();
            URL.revokeObjectURL(url);
            resolve();
          });
        });
      } catch {
        resolve();
      }
    });
  };

  // Handle incoming WebSocket messages (duplex audio chunks)
  useEffect(() => {
    if (data.mode !== 'duplex' || !lastMessage) return;

    const msg = lastMessage;

    // Audio chunk from AI mentor / lesson narration
    if (
      msg.type === 'audio_chunk' &&
      msg.channel === data.duplexChannel
    ) {
      // msg.data is ArrayBuffer (binary PCM)
      chunkQueueRef.current.push(msg.data as ArrayBuffer);
      processChunkQueue();
      return;
    }

    // AI signals audio stream end
    if (
      msg.type === 'audio_end' &&
      msg.channel === data.duplexChannel
    ) {
      // Wait for queue to drain then complete
      const waitAndComplete = () => {
        if (chunkQueueRef.current.length === 0 && !isProcessingRef.current) {
          onComplete(data.id);
        } else {
          setTimeout(waitAndComplete, 100);
        }
      };
      waitAndComplete();
    }
  }, [lastMessage, data.mode, data.duplexChannel, processChunkQueue, onComplete]);

  // ── Pause / Resume sync ───────────────────────────────────────────────────

  useEffect(() => {
    if (data.mode === 'url' && soundRef.current) {
      if (paused) {
        soundRef.current.pause();
        isPlayingRef.current = false;

        // Notify backend — student raised hand, pause narration
        sendMessage({
          type:    'audio_pause',
          nodeId:  data.id,
          channel: data.duplexChannel ?? 'lesson',
        });
      } else {
        soundRef.current.play((success) => {
          if (success) onComplete(data.id);
        });
        isPlayingRef.current = true;

        // Notify backend — resume narration
        sendMessage({
          type:    'audio_resume',
          nodeId:  data.id,
          channel: data.duplexChannel ?? 'lesson',
        });
      }
    }

    if (data.mode === 'duplex') {
      if (paused) {
        // Stop processing queue — chunks stay buffered
        isProcessingRef.current = false;

        sendMessage({
          type:    'audio_pause',
          nodeId:  data.id,
          channel: data.duplexChannel ?? 'lesson',
        });
      } else {
        // Resume processing buffered chunks
        processChunkQueue();

        sendMessage({
          type:    'audio_resume',
          nodeId:  data.id,
          channel: data.duplexChannel ?? 'lesson',
        });
      }
    }
  }, [paused]);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (data.mode === 'url' && data.url) {
      loadAndPlayUrl(data.url);
    }

    if (data.mode === 'duplex') {
      // Signal backend to start streaming audio for this node/channel
      sendMessage({
        type:    'audio_start',
        nodeId:  data.id,
        channel: data.duplexChannel ?? 'lesson',
      });
    }

    // Cleanup
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }
      chunkQueueRef.current   = [];
      isProcessingRef.current = false;

      // Notify backend on unmount
      sendMessage({
        type:    'audio_stop',
        nodeId:  data.id,
        channel: data.duplexChannel ?? 'lesson',
      });
    };
  }, []);

  // ── No UI ─────────────────────────────────────────────────────────────────
  return null;
};

// ─── Export ───────────────────────────────────────────────────────────────────

export default AudioNode;

/*
─── USAGE WITH OTHER NODES ───────────────────────────────────────────────────

AudioNode sirf background mein chalta hai.
Parent renderer dono ko saath mount karta hai:

  <MarkdownNode
    data={markdownData}
    onComplete={handleComplete}
    onHandRaise={handleHandRaise}   // ← yahan paused=true ho jayega
  />
  <AudioNode
    data={audioData}
    onComplete={handleAudioComplete}
    paused={isHandRaised}           // ← sync prop
  />

─── WEBSOCKET MESSAGE SCHEMA ─────────────────────────────────────────────────

Backend se aane wale messages:

  // Pre-recorded URL mode
  { type: "audio_node", mode: "url", url: "https://cdn.../lesson_1.mp3" }

  // Duplex streaming mode
  { type: "audio_node", mode: "duplex", duplexChannel: "lesson" }

  // Chunk stream (binary ArrayBuffer)
  { type: "audio_chunk", channel: "lesson", data: <ArrayBuffer PCM> }

  // Stream end signal
  { type: "audio_end", channel: "lesson" }

Frontend se backend ko:

  { type: "audio_pause",  nodeId: "...", channel: "lesson" }
  { type: "audio_resume", nodeId: "...", channel: "lesson" }
  { type: "audio_stop",   nodeId: "...", channel: "lesson" }
  { type: "audio_start",  nodeId: "...", channel: "lesson" }

─── DEPENDENCIES ─────────────────────────────────────────────────────────────

  npm install react-native-sound

─────────────────────────────────────────────────────────────────────────────
*/
