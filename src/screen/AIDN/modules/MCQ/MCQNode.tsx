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
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { AIDNNode, MCQPayload } from '../../types/node.types';
import { wsService } from '../../services/websocketService';
import { mcqStyles as S, OptionState } from './McqNode.styles';
import { Colors } from '../../styles/token';

// ─── Constants ────────────────────────────────────────────────────────────

const FADE_IN_MS  = 280;
const FADE_OUT_MS = 200;

// ─── Local types ──────────────────────────────────────────────────────────

type ConfidenceLevel = 'sure' | 'unsure' | null;
type Phase = 'answering' | 'submitted';

interface MCQNodeProps {
  node: AIDNNode;
  onDone?: () => void;
}

// ─── Timer hook ───────────────────────────────────────────────────────────

function useCountdown(seconds: number | undefined, onExpire: () => void) {
  const [remaining, setRemaining] = useState(seconds ?? 0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef   = useRef(false);

  useEffect(() => {
    if (!seconds) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => clearInterval(intervalRef.current!), []);
  const pct  = seconds ? remaining / seconds : 1;
  return { remaining, pct, stop };
}

// ─── Option Row ───────────────────────────────────────────────────────────

interface OptionRowProps {
  option: MCQPayload['options'][number];
  index: number;
  mode: MCQPayload['mode'];
  optionState: OptionState;
  selected: boolean;
  disabled: boolean;
  onPress: (id: string) => void;
}

const OptionRow = React.memo(({
  option, index, mode, optionState, selected, disabled, onPress,
}: OptionRowProps) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1,   { damping: 12, stiffness: 200 }),
    );
    onPress(option.id);
  };

  // A, B, C… for single/truefalse; checkbox for multiple
  const labelChar = mode === 'multiple'
    ? null
    : String.fromCharCode(65 + index);

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.85}
        style={[
          S.optionRow,
          optionState === 'selected'  && S.optionSelected,
          optionState === 'correct'   && S.optionCorrect,
          optionState === 'incorrect' && S.optionIncorrect,
          optionState === 'missed'    && S.optionMissed,
        ]}
      >
        {/* Label / checkbox */}
        <View style={[
          S.optionLabel,
          optionState === 'correct'   && S.optionLabelCorrect,
          optionState === 'incorrect' && S.optionLabelIncorrect,
          optionState === 'selected'  && S.optionLabelSelected,
        ]}>
          {mode === 'multiple' ? (
            <View style={[S.checkbox, selected && S.checkboxSelected]}>
              {selected && <Text style={S.checkmark}>✓</Text>}
            </View>
          ) : (
            <Text style={[
              S.optionLabelText,
              optionState === 'correct'   && { color: Colors.success },
              optionState === 'incorrect' && { color: Colors.error },
              optionState === 'selected'  && { color: Colors.accent },
            ]}>
              {labelChar}
            </Text>
          )}
        </View>

        {/* Text */}
        <Text style={[
          S.optionText,
          optionState === 'correct'   && { color: Colors.success },
          optionState === 'incorrect' && { color: Colors.error },
          optionState === 'missed'    && { color: Colors.warning },
        ]}>
          {option.text}
        </Text>

        {/* Result icon */}
        {optionState === 'correct'   && <Text style={[S.resultIcon, { color: Colors.success }]}>✓</Text>}
        {optionState === 'incorrect' && <Text style={[S.resultIcon, { color: Colors.error }]}>✕</Text>}
        {optionState === 'missed'    && <Text style={[S.resultIcon, { color: Colors.warning }]}>!</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
});

OptionRow.displayName = 'OptionRow';

// ─── Main Component ───────────────────────────────────────────────────────

export default function MCQNode({ node, onDone }: MCQNodeProps) {
  const payload = node.payload as MCQPayload;
  const {
    mode, question, options,
    correctIds, explanation,
    hint, timeLimit, tags,
  } = payload;

  // ── Phase state
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [phase, setPhase]                 = useState<Phase>('answering');
  const [confidence, setConfidence]       = useState<ConfidenceLevel>(null);
  const [hintText, setHintText]           = useState<string | null>(hint ?? null);
  const [hintRequested, setHintRequested] = useState(false);
  const startTimeRef                      = useRef(Date.now());
  const isDoneRef                         = useRef(false);

  // ── Reanimated values
  const opacity          = useSharedValue(0);
  const translateY       = useSharedValue(14);
  const explanationAlpha = useSharedValue(0);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const explanationAnimStyle = useAnimatedStyle(() => ({
    opacity: explanationAlpha.value,
  }));

  // ── Mount fade in
  useEffect(() => {
    opacity.value    = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
  }, []);

  // ── Listen for backend hint push via WS
  useEffect(() => {
    const unsub = wsService.onMessage((msg) => {
      if (msg.event !== 'node_update') return;
      const p = msg.payload as { nodeId: string; patch: { payload?: { hint?: string } } };
      if (p.nodeId !== node.id) return;
      const incoming = p.patch?.payload?.hint;
      if (incoming) setHintText(incoming);
    });
    return unsub;
  }, [node.id]);

  // ── Timer
  const handleTimerExpire = useCallback(() => {
    if (phase === 'answering') doSubmit(true);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const { remaining, pct, stop: stopTimer } = useCountdown(timeLimit, handleTimerExpire);

  // ── Toggle selection
  const toggleOption = useCallback((id: string) => {
    if (phase !== 'answering') return;
    if (mode === 'single' || mode === 'truefalse') {
      setSelectedIds([id]);
    } else {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
      );
    }
  }, [phase, mode]);

  // ── Submit
  function doSubmit(timedOut = false) {
    if (phase !== 'answering') return;
    stopTimer();
    setPhase('submitted');

    // Reveal explanation with fade
    explanationAlpha.value = withTiming(1, { duration: 350 });

    // Fire to backend
    wsService.sendInteraction({
      nodeId: node.id,
      type:   'mcq_answer',
      data: {
        selectedIds,
        confidence,
        timedOut,
        timeSpent: Math.round((Date.now() - startTimeRef.current) / 1000),
        tags,
      },
    });
  }

  // ── Hint request
  const requestHint = useCallback(() => {
    if (hintRequested) return;
    setHintRequested(true);
    wsService.sendInteraction({
      nodeId: node.id,
      type:   'mcq_answer',
      data:   { hintRequested: true },
    });
  }, [hintRequested, node.id]);

  // ── Fade out → onDone
  const handleNext = useCallback(() => {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(onDone ?? (() => {}))();
    });
  }, [onDone]);

  // ── Per-option state
  function getOptionState(id: string): OptionState {
    const sel = selectedIds.includes(id);
    if (phase === 'answering') return sel ? 'selected' : 'idle';
    if (!correctIds)           return sel ? 'selected' : 'idle';
    const correct = correctIds.includes(id);
    if (correct && sel)   return 'correct';
    if (!correct && sel)  return 'incorrect';
    if (correct && !sel)  return 'missed';
    return 'idle';
  }

  // ── Derived
  const canSubmit  = selectedIds.length > 0 && phase === 'answering';
  const timerColor = pct > 0.5 ? Colors.success : pct > 0.25 ? Colors.warning : Colors.error;
  const isAllCorrect = correctIds
    ? correctIds.length === selectedIds.length &&
      correctIds.every(id => selectedIds.includes(id))
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Animated.View style={[S.animatedWrapper, cardAnimStyle]}>
      <View style={S.card}>

        {/* Accent strip */}
        <View style={S.accentStrip} />

        {/* Header: mode badge + timer */}
        <View style={S.headerRow}>
          <View style={S.modeBadge}>
            <Text style={S.modeBadgeText}>
              {mode === 'single'   ? 'SINGLE CORRECT' :
               mode === 'multiple' ? 'MULTI SELECT'   :
                                     'TRUE / FALSE'}
            </Text>
          </View>

          {timeLimit ? (
            <View style={S.timerBox}>
              <Text style={[S.timerText, { color: timerColor }]}>{remaining}s</Text>
              <View style={S.timerTrack}>
                <View style={[S.timerFill, {
                  width: `${Math.round(pct * 100)}%` as `${number}%`,
                  backgroundColor: timerColor,
                }]} />
              </View>
            </View>
          ) : null}
        </View>

        {/* Scrollable body */}
        <ScrollView
          style={S.scroll}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question */}
          <Text style={S.question}>{question}</Text>

          {/* Hint box */}
          {hintText ? (
            <View style={S.hintBox}>
              <Text style={S.hintIcon}>💡</Text>
              <Text style={S.hintText}>{hintText}</Text>
            </View>
          ) : null}

          {/* Options list */}
          <View style={S.optionsList}>
            {options.map((opt, i) => (
              <OptionRow
                key={opt.id}
                option={opt}
                index={i}
                mode={mode}
                optionState={getOptionState(opt.id)}
                selected={selectedIds.includes(opt.id)}
                disabled={phase !== 'answering'}
                onPress={toggleOption}
              />
            ))}
          </View>

          {/* Explanation — revealed after submit */}
          {phase === 'submitted' ? (
            <Animated.View style={[S.explanationBox, explanationAnimStyle]}>
              {/* Result banner */}
              {isAllCorrect !== null && (
                <View style={[
                  S.resultBanner,
                  { backgroundColor: isAllCorrect ? '#1A3A2A' : '#2A1A1A' },
                ]}>
                  <Text style={[
                    S.resultBannerText,
                    { color: isAllCorrect ? Colors.success : Colors.error },
                  ]}>
                    {isAllCorrect ? '✓  Correct!' : '✕  Incorrect'}
                  </Text>
                </View>
              )}

              {/* Explanation text */}
              {explanation ? (
                <>
                  <Text style={S.explanationLabel}>EXPLANATION</Text>
                  <Text style={S.explanationText}>{explanation}</Text>
                </>
              ) : null}
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={S.footer}>

          {/* Confidence + Hint (only while answering) */}
          {phase === 'answering' && (
            <View style={S.confidenceRow}>
              <Text style={S.confidenceLabel}>Confidence:</Text>

              {(['sure', 'unsure'] as NonNullable<ConfidenceLevel>[]).map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setConfidence(prev => prev === lvl ? null : lvl)}
                  style={[
                    S.confBtn,
                    confidence === lvl && (lvl === 'sure' ? S.confBtnSure : S.confBtnUnsure),
                  ]}
                >
                  <Text style={[
                    S.confBtnText,
                    confidence === lvl && S.confBtnTextActive,
                  ]}>
                    {lvl === 'sure' ? '✓ Sure' : '? Unsure'}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={requestHint}
                disabled={hintRequested}
                style={[S.hintBtn, hintRequested && S.hintBtnDisabled]}
              >
                <Text style={S.hintBtnText}>
                  {hintRequested ? 'Hint sent…' : '💡 Hint'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit / Continue */}
          <View style={S.actionRow}>
            {phase === 'answering' ? (
              <TouchableOpacity
                onPress={() => doSubmit(false)}
                disabled={!canSubmit}
                style={[S.submitBtn, !canSubmit && S.submitBtnDisabled]}
              >
                <Text style={[S.submitBtnText, !canSubmit && S.submitBtnTextDisabled]}>
                  Submit Answer
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleNext} style={S.nextBtn}>
                <Text style={S.nextBtnText}>Continue  →</Text>
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Animated.View>
  );
}
