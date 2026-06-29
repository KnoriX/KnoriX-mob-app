// ─────────────────────────────────────────────────────────────
// hooks/useAudioSync.ts  (React Native CLI version)
// Uses: react-native-track-player
// Install: npm install react-native-track-player
//          cd ios && pod install
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
  Capability,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';
import type {
  AudioPayload,
  AudioSource,
  TimestampAction,
  AudioChapter,
  CanvasEventDispatcher,
} from '../types/audio.types';

// ─── State ───────────────────────────────────────────────────

export interface AudioSyncState {
  /** 0–1 */
  progress: number;
  currentSeconds: number;
  durationSeconds: number;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isMCQPaused: boolean;
  currentCaption: string | null;
  currentChapter: AudioChapter | null;
  error: string | null;
}

const initial: AudioSyncState = {
  progress: 0,
  currentSeconds: 0,
  durationSeconds: 0,
  isLoading: true,
  isPlaying: false,
  isPaused: false,
  isMCQPaused: false,
  currentCaption: null,
  currentChapter: null,
  error: null,
};

// ─── One-time player setup (call from App.tsx or service file) ─
// Add this to your PlaybackService registered with TrackPlayer:
//
// TrackPlayer.registerPlaybackService(() => require('./services/playbackService'));
//
// services/playbackService.ts:
// export async function PlaybackService() {}  // empty is fine for basic use

let playerReady = false;

async function ensurePlayer() {
  if (playerReady) return;
  await TrackPlayer.setupPlayer({
    maxCacheSize: 1024 * 5, // 5MB cache
  });
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SeekTo,
      Capability.Stop,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause],
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
  });
  playerReady = true;
}

// ─── Hook ────────────────────────────────────────────────────

export function useAudioSync(
  payload: AudioPayload,
  dispatcher: CanvasEventDispatcher,
  onDone: () => void,
) {
  const [state, setState] = useState<AudioSyncState>(initial);

  // react-native-track-player built-in hooks
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress(100); // poll every 100ms

  const firedRef = useRef<Set<number>>(new Set());
  const positionRef = useRef(0);
  const durationRef = useRef(0);
  const isMCQPausedRef = useRef(false);
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // ─── Load audio from FastAPI ────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    const loadAudio = async () => {
      try {
        await ensurePlayer();

        // FastAPI returns { url, durationSeconds, mode, mimeType }
        const res = await fetch(payload.audioFetchUrl);
        const source: AudioSource = await res.json();

        if (!mountedRef.current) return;

        durationRef.current = source.durationSeconds;
        setState(s => ({ ...s, durationSeconds: source.durationSeconds }));

        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: payload.sessionId,
          url: source.url,
          title: 'Lesson Audio',
          artist: 'AI Mentor',
          // artwork: optional CDN thumbnail
        });

        if (payload.autoPlay ?? true) {
          await TrackPlayer.play();
        }

        setState(s => ({ ...s, isLoading: false }));
      } catch (e: any) {
        if (mountedRef.current) {
          setState(s => ({ ...s, isLoading: false, error: 'Audio load failed. ' + e?.message }));
        }
      }
    };

    loadAudio();

    return () => {
      mountedRef.current = false;
      TrackPlayer.reset();
      if (autoResumeRef.current) clearTimeout(autoResumeRef.current);
    };
  }, [payload.audioFetchUrl]);

  // ─── Sync progress → state + fire timestamps ────────────

  useEffect(() => {
    if (!position || !duration) return;

    positionRef.current = position;
    if (duration > 0) durationRef.current = duration;

    setState(s => ({
      ...s,
      currentSeconds: position,
      durationSeconds: duration > 0 ? duration : s.durationSeconds,
      progress: duration > 0 ? position / duration : s.progress,
    }));

    fireTimestamps(position);
  }, [position, duration]);

  // ─── Sync playback state ─────────────────────────────────

  useEffect(() => {
    const playing = playbackState.state === State.Playing;
    const paused  = playbackState.state === State.Paused;
    const ended   = playbackState.state === State.Ended;

    setState(s => ({ ...s, isPlaying: playing, isPaused: paused }));

    if (ended) {
      pingAnalytics('audio_complete', { sessionId: payload.sessionId });
      onDone();
    }
  }, [playbackState.state]);

  // ─── Timestamp engine ────────────────────────────────────

  const fireTimestamps = useCallback((currentSec: number) => {
    for (const ts of payload.timestamps) {
      const key = ts.at;
      if (currentSec >= ts.at && currentSec <= ts.at + 0.15 && !firedRef.current.has(key)) {
        firedRef.current.add(key);
        handleTimestampAction(ts);
      }
    }
  }, [payload.timestamps]);

  const handleTimestampAction = useCallback(async (ts: TimestampAction) => {
    switch (ts.action) {

      case 'show_node':
        dispatcher.showNode(ts.nodeId, ts.nodeType, ts.payload);
        break;

      case 'remove_node':
        dispatcher.removeNode(ts.nodeId);
        break;

      case 'highlight_node':
        dispatcher.highlightNode(ts.nodeId, ts.color ?? '#6C63FF', ts.durationMs ?? 1000);
        break;

      case 'scroll_to_node':
        dispatcher.scrollToNode(ts.nodeId);
        break;

      case 'skia_cmd':
        dispatcher.skiaCmd(ts.targetNodeId, ts.cmd);
        break;

      case 'skia_clear':
        dispatcher.skiaClear(ts.targetNodeId);
        break;

      case 'show_caption':
        setState(s => ({ ...s, currentCaption: ts.text }));
        if (ts.durationMs) {
          setTimeout(() => setState(s => ({ ...s, currentCaption: null })), ts.durationMs);
        }
        break;

      case 'hide_caption':
        setState(s => ({ ...s, currentCaption: null }));
        break;

      case 'chapter_marker':
        setState(s => ({ ...s, currentChapter: { at: ts.at, title: ts.title } }));
        break;

      case 'trigger_mcq':
        if (ts.pauseAudio) {
          isMCQPausedRef.current = true;
          setState(s => ({ ...s, isMCQPaused: true }));
          await TrackPlayer.pause();
        }
        dispatcher.triggerMCQ(ts.mcqPayload);
        break;

      case 'audio_pause':
        await TrackPlayer.pause();
        if (ts.resumeAfterMs) {
          autoResumeRef.current = setTimeout(async () => {
            if (!isMCQPausedRef.current) {
              await TrackPlayer.play();
            }
          }, ts.resumeAfterMs);
        }
        break;
    }
  }, [dispatcher]);

  // ─── Controls ────────────────────────────────────────────

  const play = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const seek = useCallback(async (seconds: number) => {
    // Reset timestamps ahead of new position so they re-fire
    firedRef.current = new Set(
      [...firedRef.current].filter(at => at < seconds)
    );
    await TrackPlayer.seekTo(seconds);
    setState(s => ({
      ...s,
      currentSeconds: seconds,
      progress: durationRef.current > 0 ? seconds / durationRef.current : 0,
    }));
  }, []);

  const resumeFromMCQ = useCallback(async () => {
    isMCQPausedRef.current = false;
    setState(s => ({ ...s, isMCQPaused: false }));
    await TrackPlayer.play();
  }, []);

  const skip = useCallback(async () => {
    await TrackPlayer.reset();
    pingAnalytics('audio_skip', { sessionId: payload.sessionId, at: positionRef.current });
    onDone();
  }, [payload.sessionId, onDone]);

  const setVolume = useCallback(async (vol: number) => {
    await TrackPlayer.setVolume(Math.max(0, Math.min(1, vol)));
  }, []);

  return { state, play, pause, seek, skip, setVolume, resumeFromMCQ };
}

// ─── Analytics ───────────────────────────────────────────────

async function pingAnalytics(event: string, data: object) {
  try {
    fetch('/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data, ts: Date.now() }),
    });
  } catch { /* non-critical */ }
}
