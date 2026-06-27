import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Video, { OnProgressData, OnLoadData } from 'react-native-video';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoNodeData {
  id: string;
  type: 'video';
  url: string;
  title?: string;
  duration?: number; // seconds, optional fallback
  autoPlay?: boolean; // default: true
}

interface VideoNodeProps {
  data: VideoNodeData;
  onComplete: (nodeId: string) => void;       // AI decides next node
  onHandRaise?: (nodeId: string) => void;     // Student raises doubt
  onError?: (nodeId: string, error: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const VideoNode: React.FC<VideoNodeProps> = ({
  data,
  onComplete,
  onHandRaise,
  onError,
}) => {
  const videoRef = useRef<Video>(null);

  const [loading, setLoading]       = useState(true);
  const [progress, setProgress]     = useState(0);       // 0 to 1
  const [duration, setDuration]     = useState(data.duration ?? 0);
  const [hasEnded, setHasEnded]     = useState(false);
  const [paused, setPaused]         = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLoad = useCallback((loadData: OnLoadData) => {
    setDuration(loadData.duration);
    setLoading(false);
  }, []);

  const handleProgress = useCallback((progressData: OnProgressData) => {
    if (duration > 0) {
      setProgress(progressData.currentTime / duration);
    }
  }, [duration]);

  const handleEnd = useCallback(() => {
    setHasEnded(true);
    setProgress(1);
    onComplete(data.id);
  }, [data.id, onComplete]);

  const handleError = useCallback((err: any) => {
    setLoading(false);
    const msg = err?.error?.localizedDescription ?? 'Video load failed';
    onError?.(data.id, msg);
  }, [data.id, onError]);

  const handleHandRaise = useCallback(() => {
    if (handRaised) return;

    // Pause video
    setPaused(true);
    setHandRaised(true);

    // Pulse animation for feedback
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 180, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 180, useNativeDriver: true }),
    ]).start();

    onHandRaise?.(data.id);
  }, [handRaised, data.id, onHandRaise, pulseAnim]);

  const handleResumeAfterDoubt = useCallback(() => {
    setHandRaised(false);
    setPaused(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Video Player ── */}
      <View style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: data.url }}
          style={styles.video}
          resizeMode="contain"
          paused={paused}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onEnd={handleEnd}
          onError={handleError}
          progressUpdateInterval={500}
          ignoreSilentSwitch="ignore"
        />

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Pause Overlay — shown when hand raised */}
        {handRaised && !loading && (
          <View style={styles.pauseOverlay}>
            <Text style={styles.pauseIcon}>✋</Text>
            <Text style={styles.pauseLabel}>Lesson Paused</Text>
            <Text style={styles.pauseSub}>AI Mentor is listening...</Text>
            <TouchableOpacity
              style={styles.resumeBtn}
              onPress={handleResumeAfterDoubt}
              activeOpacity={0.8}
            >
              <Text style={styles.resumeBtnText}>Resume Lesson</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.progressTime}>
          {formatTime(progress * duration)} / {formatTime(duration)}
        </Text>
      </View>

      {/* ── Title ── */}
      {data.title ? (
        <Text style={styles.title}>{data.title}</Text>
      ) : null}

      {/* ── Hand Raise Button ── */}
      {!hasEnded && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.handRaiseBtn, handRaised && styles.handRaiseBtnActive]}
            onPress={handleHandRaise}
            activeOpacity={0.8}
            disabled={handRaised}
          >
            <Text style={styles.handRaiseIcon}>✋</Text>
            <Text style={styles.handRaiseBtnText}>
              {handRaised ? 'Doubt Sent' : 'Raise Hand'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Completed State ── */}
      {hasEnded && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓ Completed</Text>
        </View>
      )}

    </View>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

// ─── Design Tokens ───────────────────────────────────────────────────────────

const COLORS = {
  bg:          '#0A0A0A',   // pure near-black
  surface:     '#141414',   // dark grey surface
  border:      '#2C2C2C',   // grey border
  accent:      '#FFFFFF',   // white — only highlight
  accentSoft:  '#FFFFFF12',
  text:        '#EFEFEF',   // off-white text
  textMuted:   '#6B6B6B',   // mid grey
  success:     '#A0A0A0',   // grey for completed
  handRaise:   '#D0D0D0',   // light grey for hand raise
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingBottom: 32,
  },

  // Video
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },

  // Overlays
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000CC',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0D0D0FEE',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  pauseIcon: {
    fontSize: 40,
    marginBottom: 4,
  },
  pauseLabel: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pauseSub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 20,
  },
  resumeBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  resumeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 6,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressTime: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 0.3,
    textAlign: 'right',
  },

  // Title
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    letterSpacing: 0.2,
  },

  // Hand Raise
  handRaiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.handRaise,
    backgroundColor: '#FFB34710',
  },
  handRaiseBtnActive: {
    borderColor: COLORS.textMuted,
    backgroundColor: 'transparent',
  },
  handRaiseIcon: {
    fontSize: 18,
  },
  handRaiseBtnText: {
    color: COLORS.handRaise,
    fontWeight: '600',
    fontSize: 15,
  },

  // Completed
  completedBadge: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF0A',
    alignItems: 'center',
  },
  completedText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default VideoNode;
