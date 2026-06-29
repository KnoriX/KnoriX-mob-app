import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Video, {
  OnProgressData,
  OnLoadData,
  OnSeekData,
  SelectedTrack,
  SelectedTrackType,
} from 'react-native-video';

import { AIDNNode, VideoPayload } from '../../types/node.types';
import { wsService } from '../../services/websocketService';
import { videoStyles as S, CARD_WIDTH, CARD_HEIGHT, VIDEO_HEIGHT } from './videoNode.styles';
import { Colors } from '../../styles/token';

// ─── Constants ────────────────────────────────────────────────────────────

const FADE_IN_MS       = 280;
const FADE_OUT_MS      = 200;
const CONTROLS_TIMEOUT = 3000; // ms before controls auto-hide
const SPEED_OPTIONS    = [0.5, 1, 1.5, 2] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Progress bar ─────────────────────────────────────────────────────────

interface ProgressBarProps {
  progress: number;        // 0–1
  onSeek: (ratio: number) => void;
  chapters?: VideoPayload['chapters'];
  duration: number;
}

const ProgressBar = ({ progress, onSeek, chapters = [], duration }: ProgressBarProps) => {
  const barRef = useRef<View>(null);

  const handlePress = (e: { nativeEvent: { locationX: number } }) => {
    barRef.current?.measure((_x, _y, width) => {
      const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / width));
      onSeek(ratio);
    });
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      style={S.progressTouchArea}
    >
      <View ref={barRef} style={S.progressTrack}>
        {/* Buffered placeholder (full width, dimmer) */}
        <View style={[S.progressBuffered, { width: '100%' }]} />

        {/* Played */}
        <View style={[S.progressPlayed, { width: `${progress * 100}%` as `${number}%` }]} />

        {/* Thumb */}
        <View style={[S.progressThumb, { left: `${progress * 100}%` as `${number}%` }]} />

        {/* Chapter markers */}
        {chapters.map((ch) => {
          const pos = duration > 0 ? ch.startTime / duration : 0;
          return (
            <View
              key={ch.id}
              style={[S.chapterMarker, { left: `${pos * 100}%` as `${number}%` }]}
            />
          );
        })}
      </View>
    </TouchableOpacity>
  );
};

// ─── Speed selector pill ──────────────────────────────────────────────────

interface SpeedSelectorProps {
  current: number;
  onChange: (rate: number) => void;
}

const SpeedSelector = ({ current, onChange }: SpeedSelectorProps) => (
  <View style={S.speedRow}>
    {SPEED_OPTIONS.map((rate) => (
      <TouchableOpacity
        key={rate}
        onPress={() => onChange(rate)}
        style={[S.speedBtn, current === rate && S.speedBtnActive]}
      >
        <Text style={[S.speedBtnText, current === rate && S.speedBtnTextActive]}>
          {rate}x
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ─── Chapter list ─────────────────────────────────────────────────────────

interface ChapterListProps {
  chapters: VideoPayload['chapters'];
  currentTime: number;
  onJump: (time: number) => void;
  onClose: () => void;
}

const ChapterList = ({ chapters = [], currentTime, onJump, onClose }: ChapterListProps) => (
  <Modal transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={S.chapterBackdrop} activeOpacity={1} onPress={onClose}>
      <View style={S.chapterSheet}>
        <View style={S.chapterHandle} />
        <Text style={S.chapterTitle}>Chapters</Text>
        {chapters.map((ch, i) => {
          const isActive = i === chapters.findIndex(
            (c, idx) => currentTime >= c.startTime &&
              (idx === chapters.length - 1 || currentTime < chapters[idx + 1].startTime),
          );
          return (
            <TouchableOpacity
              key={ch.id}
              onPress={() => { onJump(ch.startTime); onClose(); }}
              style={[S.chapterItem, isActive && S.chapterItemActive]}
            >
              <View style={[S.chapterDot, isActive && S.chapterDotActive]} />
              <View style={{ flex: 1 }}>
                <Text style={[S.chapterName, isActive && S.chapterNameActive]}>
                  {ch.title}
                </Text>
                <Text style={S.chapterTime}>{formatTime(ch.startTime)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Main Component ───────────────────────────────────────────────────────

interface VideoNodeProps {
  node: AIDNNode;
  onDone?: () => void;
}

export default function VideoNode({ node, onDone }: VideoNodeProps) {
  const payload = node.payload as VideoPayload;
  const {
    uri,
    autoPlay        = true,
    loop            = false,
    muted           = false,
    startAt         = 0,
    endAt,
    playbackRate    = 1,
    controlMode     = 'full',
    resizeMode      = 'contain',
    chapters        = [],
    subtitles       = [],
    caption,
    showSpeedControl = false,
    reportProgressInterval = 5,
    thumbnail,
  } = payload;

  // ── Player state
  const [playing, setPlaying]         = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(startAt);
  const [duration, setDuration]       = useState(0);
  const [speed, setSpeed]             = useState(playbackRate);
  const [showControls, setShowControls] = useState(controlMode !== 'none');
  const [showChapters, setShowChapters] = useState(false);
  const [ended, setEnded]             = useState(false);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(
    subtitles.length > 0 ? subtitles[0].language : null,
  );

  const videoRef           = useRef<Video>(null);
  const controlsTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedRef    = useRef(0);
  const isDoneRef          = useRef(false);

  // ── Reanimated card fade
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(14);
  const cardStyle  = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ── Controls overlay opacity
  const ctrlOpacity = useSharedValue(1);
  const ctrlStyle   = useAnimatedStyle(() => ({ opacity: ctrlOpacity.value }));

  // ── Mount fade in
  useEffect(() => {
    opacity.value    = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
  }, []);

  // ── Auto-hide controls after timeout
  const resetControlsTimer = useCallback(() => {
    if (controlMode === 'none') return;
    clearTimeout(controlsTimerRef.current!);
    ctrlOpacity.value = withTiming(1, { duration: 150 });
    setShowControls(true);

    if (playing) {
      controlsTimerRef.current = setTimeout(() => {
        ctrlOpacity.value = withTiming(0, { duration: 300 });
        setShowControls(false);
      }, CONTROLS_TIMEOUT);
    }
  }, [playing, controlMode]);

  useEffect(() => {
    return () => clearTimeout(controlsTimerRef.current!);
  }, []);

  // ── WS: backend can push video control updates mid-session
  useEffect(() => {
    const unsub = wsService.onMessage((msg) => {
      if (msg.event !== 'node_update') return;
      const p = msg.payload as {
        nodeId: string;
        patch: { payload?: Partial<VideoPayload> };
      };
      if (p.nodeId !== node.id) return;
      const patch = p.patch?.payload;
      if (!patch) return;

      if (patch.loop       !== undefined) { /* loop is prop, re-render handles */ }
      if (patch.playbackRate !== undefined) setSpeed(patch.playbackRate);
      if (patch.startAt    !== undefined) videoRef.current?.seek(patch.startAt);
    });
    return unsub;
  }, [node.id]);

  // ── Progress handler — report to backend via WS
  const handleProgress = useCallback(({ currentTime: ct }: OnProgressData) => {
    setCurrentTime(ct);

    // endAt — stop at specified time
    if (endAt && ct >= endAt) {
      setPlaying(false);
      setEnded(true);
    }

    // WS progress reporting
    const sinceLastReport = ct - lastReportedRef.current;
    if (sinceLastReport >= reportProgressInterval) {
      lastReportedRef.current = ct;
      wsService.sendInteraction({
        nodeId: node.id,
        type:   'mcq_answer',    // reuse interaction type; backend filters by type
        data: {
          event:       'video_progress',
          currentTime: Math.round(ct),
          duration:    Math.round(duration),
          percent:     duration > 0 ? Math.round((ct / duration) * 100) : 0,
          speed,
        },
      });
    }
  }, [endAt, reportProgressInterval, duration, speed, node.id]);

  const handleLoad = useCallback(({ duration: dur }: OnLoadData) => {
    setDuration(dur);
    if (startAt > 0) videoRef.current?.seek(startAt);
  }, [startAt]);

  const handleEnd = useCallback(() => {
    setEnded(true);
    setPlaying(false);
    wsService.sendInteraction({
      nodeId: node.id,
      type:   'mcq_answer',
      data:   { event: 'video_complete', duration: Math.round(duration) },
    });
  }, [node.id, duration]);

  const handleSeek = useCallback((ratio: number) => {
    const seekTo = ratio * duration;
    videoRef.current?.seek(seekTo);
    setCurrentTime(seekTo);
    setEnded(false);
    resetControlsTimer();
  }, [duration, resetControlsTimer]);

  const togglePlay = useCallback(() => {
    if (ended) {
      videoRef.current?.seek(startAt);
      setEnded(false);
      setPlaying(true);
    } else {
      setPlaying(prev => !prev);
    }
    resetControlsTimer();
  }, [ended, startAt, resetControlsTimer]);

  // ── Fade out card → onDone
  const handleDone = useCallback(() => {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(onDone ?? (() => {}))();
    });
  }, [onDone]);

  // ── Current chapter label
  const currentChapter = chapters.slice().reverse().find(ch => currentTime >= ch.startTime);

  // ── Subtitle track selection
  const subtitleTrack: SelectedTrack | undefined = selectedSubtitle
    ? { type: SelectedTrackType.LANGUAGE, value: selectedSubtitle }
    : { type: SelectedTrackType.DISABLED };

  const progress = duration > 0 ? currentTime / duration : 0;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Animated.View style={[S.animatedWrapper, cardStyle]}>
      <View style={S.card}>

        {/* Accent strip */}
        <View style={S.accentStrip} />

        {/* Video area */}
        <TouchableWithoutFeedback onPress={resetControlsTimer}>
          <View style={S.videoContainer}>

            <Video
              ref={videoRef}
              source={{ uri }}
              style={S.video}
              paused={!playing}
              repeat={loop}
              muted={muted}
              rate={speed}
              resizeMode={resizeMode}
              poster={thumbnail}
              posterResizeMode="cover"
              selectedTextTrack={subtitleTrack}
              onProgress={handleProgress}
              onLoad={handleLoad}
              onEnd={handleEnd}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="ignore"
            />

            {/* Controls overlay — shown/hidden by backend controlMode */}
            {controlMode !== 'none' && (
              <Animated.View style={[S.controlsOverlay, ctrlStyle]}>

                {/* Top row: chapter name + subtitle + chapters btn */}
                <View style={S.topBar}>
                  {currentChapter ? (
                    <Text style={S.chapterLabel} numberOfLines={1}>
                      {currentChapter.title}
                    </Text>
                  ) : <View />}

                  <View style={S.topBtns}>
                    {subtitles.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSelectedSubtitle(
                          selectedSubtitle ? null : subtitles[0].language
                        )}
                        style={[S.topBtn, selectedSubtitle && S.topBtnActive]}
                      >
                        <Text style={S.topBtnText}>CC</Text>
                      </TouchableOpacity>
                    )}
                    {chapters.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setShowChapters(true)}
                        style={S.topBtn}
                      >
                        <Text style={S.topBtnText}>≡</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Center play/pause */}
                <TouchableOpacity
                  onPress={togglePlay}
                  style={S.playPauseBtn}
                  activeOpacity={0.8}
                >
                  <Text style={S.playPauseIcon}>
                    {ended ? '↺' : playing ? '⏸' : '▶'}
                  </Text>
                </TouchableOpacity>

                {/* Bottom: progress + time + speed */}
                <View style={S.bottomBar}>
                  <Text style={S.timeText}>
                    {formatTime(currentTime)}
                  </Text>

                  <ProgressBar
                    progress={progress}
                    onSeek={handleSeek}
                    chapters={chapters}
                    duration={duration}
                  />

                  <Text style={S.timeText}>
                    {formatTime(duration)}
                  </Text>
                </View>

                {/* Speed selector */}
                {showSpeedControl && controlMode === 'full' && (
                  <SpeedSelector current={speed} onChange={setSpeed} />
                )}

              </Animated.View>
            )}

          </View>
        </TouchableWithoutFeedback>

        {/* Caption */}
        {caption ? <Text style={S.caption}>{caption}</Text> : null}

        {/* Footer */}
        <View style={S.footer}>
          <TouchableOpacity onPress={handleDone} style={S.nextBtn}>
            <Text style={S.nextBtnText}>Continue  →</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Chapter list modal */}
      {showChapters && (
        <ChapterList
          chapters={chapters}
          currentTime={currentTime}
          onJump={(t) => { videoRef.current?.seek(t); setPlaying(true); }}
          onClose={() => setShowChapters(false)}
        />
      )}

    </Animated.View>
  );
}
