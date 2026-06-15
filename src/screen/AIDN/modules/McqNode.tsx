import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type McqType       = 'single' | 'multiple';
type FeedbackState = 'correct' | 'incorrect' | 'partial' | null;

export interface McqOption {
  id: string;
  text: string;
}

export interface McqNodeData {
  id: string;
  type: 'mcq';
  question: string;
  options: McqOption[];
  mcqType: McqType;          // backend decides: single or multiple
  showFeedback?: boolean;    // backend decides when to reveal
  correctIds?: string[];     // backend sends after submission
}

interface McqNodeProps {
  data: McqNodeData;
  onSubmit: (nodeId: string, selectedIds: string[]) => void;
  onComplete: (nodeId: string) => void;
  onHandRaise?: (nodeId: string) => void;
  // Backend calls this to reveal feedback after submission
  feedbackState?: FeedbackState;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_WIDTH  = Dimensions.get('window').width;
const TYPING_SPEED  = 32; // chars per second

// ─── Main Component ──────────────────────────────────────────────────────────

const McqNode: React.FC<McqNodeProps> = ({
  data,
  onSubmit,
  onComplete,
  onHandRaise,
  feedbackState = null,
}) => {
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [submitted, setSubmitted]         = useState(false);
  const [feedback, setFeedback]           = useState<FeedbackState>(null);
  const [questionText, setQuestionText]   = useState('');
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [handRaised, setHandRaised]       = useState(false);

  // Animations
  const cardFade      = useRef(new Animated.Value(0)).current;
  const cardScale     = useRef(new Animated.Value(0.96)).current;
  const cardTranslate = useRef(new Animated.Value(24)).current;
  const optionAnims   = useRef(data.options.map(() => ({
    opacity:   new Animated.Value(0),
    translateY: new Animated.Value(18),
  }))).current;
  const handRaisePulse = useRef(new Animated.Value(1)).current;

  // ── Entry Animation ──────────────────────────────────────────────────────

  useEffect(() => {
    // Step 1 — Card appears
    Animated.parallel([
      Animated.timing(cardFade,      { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(cardScale,     { toValue: 1, useNativeDriver: true }),
      Animated.timing(cardTranslate, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => {
      // Step 2 — Question typewriter
      typewriteQuestion(data.question, TYPING_SPEED, setQuestionText, () => {
        // Step 3 — Options slide in one by one
        setOptionsVisible(true);
        revealOptions();
      });
    });
  }, []);

  const revealOptions = useCallback(() => {
    optionAnims.forEach((anim, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacity,    { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim.translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      }, i * 120);
    });
  }, [optionAnims]);

  // ── Feedback from backend ─────────────────────────────────────────────────

  useEffect(() => {
    if (feedbackState && submitted) {
      setFeedback(feedbackState);
      // After showing feedback — wait then complete
      setTimeout(() => onComplete(data.id), 1800);
    }
  }, [feedbackState, submitted]);

  // ── Selection ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback((optionId: string) => {
    if (submitted) return;

    if (data.mcqType === 'single') {
      setSelectedIds([optionId]);
    } else {
      setSelectedIds(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  }, [submitted, data.mcqType]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (selectedIds.length === 0 || submitted) return;
    setSubmitted(true);
    onSubmit(data.id, selectedIds);
    // Backend will send feedbackState when ready
  }, [selectedIds, submitted, data.id, onSubmit]);

  // ── Hand Raise ────────────────────────────────────────────────────────────

  const handleHandRaise = useCallback(() => {
    if (handRaised) return;
    setHandRaised(true);

    Animated.sequence([
      Animated.timing(handRaisePulse, { toValue: 1.15, duration: 160, useNativeDriver: true }),
      Animated.timing(handRaisePulse, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();

    onHandRaise?.(data.id);
  }, [handRaised, data.id, onHandRaise, handRaisePulse]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Full screen dark bg */}
      <View style={styles.backdrop} />

      {/* MCQ Card */}
      <Animated.View
        style={[
          styles.card,
          {
            opacity:   cardFade,
            transform: [
              { scale:      cardScale     },
              { translateY: cardTranslate },
            ],
          },
        ]}
      >
        {/* Label */}
        <View style={styles.labelRow}>
          <View style={styles.labelDot} />
          <Text style={styles.labelText}>
            {data.mcqType === 'multiple' ? 'MULTIPLE CORRECT' : 'QUESTION'}
          </Text>
        </View>

        {/* Question */}
        <Text style={styles.question}>
          {questionText}
          {questionText.length < data.question.length && (
            <Text style={styles.cursor}>▎</Text>
          )}
        </Text>

        {/* Options */}
        {optionsVisible && (
          <View style={styles.optionsContainer}>
            {data.options.map((option, index) => (
              <OptionItem
                key={option.id}
                option={option}
                index={index}
                anim={optionAnims[index]}
                isSelected={selectedIds.includes(option.id)}
                feedback={feedback}
                isCorrect={data.correctIds?.includes(option.id) ?? false}
                submitted={submitted}
                onSelect={handleSelect}
              />
            ))}
          </View>
        )}

        {/* Submit Button */}
        {optionsVisible && !submitted && (
          <SubmitButton
            disabled={selectedIds.length === 0}
            onPress={handleSubmit}
          />
        )}

        {/* Submitted waiting state */}
        {submitted && !feedback && (
          <View style={styles.waitingRow}>
            <WaitingDots />
            <Text style={styles.waitingText}>Evaluating...</Text>
          </View>
        )}

        {/* Hand Raise */}
        {!feedback && (
          <Animated.View style={{ transform: [{ scale: handRaisePulse }] }}>
            <TouchableOpacity
              style={[styles.handRaiseBtn, handRaised && styles.handRaiseBtnActive]}
              onPress={handleHandRaise}
              disabled={handRaised}
              activeOpacity={0.8}
            >
              <Text style={styles.handRaiseIcon}>✋</Text>
              <Text style={styles.handRaiseBtnText}>
                {handRaised ? 'Doubt Sent' : 'Raise Hand'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
};

// ─── Option Item ──────────────────────────────────────────────────────────────

interface OptionItemProps {
  option: McqOption;
  index: number;
  anim: { opacity: Animated.Value; translateY: Animated.Value };
  isSelected: boolean;
  feedback: FeedbackState;
  isCorrect: boolean;
  submitted: boolean;
  onSelect: (id: string) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const OptionItem: React.FC<OptionItemProps> = ({
  option,
  index,
  anim,
  isSelected,
  feedback,
  isCorrect,
  submitted,
  onSelect,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (submitted) return;

    // Micro bounce on select
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80,  useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    onSelect(option.id);
  }, [submitted, option.id, onSelect, scaleAnim]);

  // Determine color state
  const getOptionStyle = () => {
    if (feedback && isSelected) {
      if (feedback === 'correct')   return styles.optionCorrect;
      if (feedback === 'incorrect') return styles.optionIncorrect;
      if (feedback === 'partial')   return isCorrect ? styles.optionCorrect : styles.optionIncorrect;
    }
    if (feedback && isCorrect && !isSelected) return styles.optionCorrectMissed;
    if (isSelected) return styles.optionSelected;
    return styles.optionDefault;
  };

  const getLabelStyle = () => {
    if (feedback && isSelected) {
      if (feedback === 'correct')   return styles.labelCorrect;
      if (feedback === 'incorrect') return styles.labelIncorrect;
    }
    if (isSelected) return styles.labelSelected;
    return styles.labelDefault;
  };

  return (
    <Animated.View
      style={{
        opacity:   anim.opacity,
        transform: [
          { translateY: anim.translateY },
          { scale: scaleAnim },
        ],
      }}
    >
      <TouchableOpacity
        style={[styles.option, getOptionStyle()]}
        onPress={handlePress}
        activeOpacity={submitted ? 1 : 0.85}
      >
        {/* Option label: A B C D */}
        <View style={[styles.optionLabel, getLabelStyle()]}>
          <Text style={[styles.optionLabelText, isSelected && styles.optionLabelTextSelected]}>
            {OPTION_LABELS[index] ?? index + 1}
          </Text>
        </View>

        {/* Option text */}
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
          {option.text}
        </Text>

        {/* Feedback icon */}
        {feedback && isSelected && (
          <Text style={styles.feedbackIcon}>
            {feedback === 'correct' ? '✓' : '✗'}
          </Text>
        )}
        {feedback && isCorrect && !isSelected && (
          <Text style={styles.feedbackIcon}>✓</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Submit Button ────────────────────────────────────────────────────────────

interface SubmitButtonProps {
  disabled: boolean;
  onPress: () => void;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({ disabled, onPress }) => {
  const opacAnim = useRef(new Animated.Value(disabled ? 0.4 : 1)).current;

  useEffect(() => {
    Animated.timing(opacAnim, {
      toValue: disabled ? 0.4 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacAnim]);

  return (
    <Animated.View style={[styles.submitWrap, { opacity: opacAnim }]}>
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
      >
        <Text style={styles.submitBtnText}>Submit Answer</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Waiting Dots ─────────────────────────────────────────────────────────────

const WaitingDots: React.FC = () => {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    };
    dots.forEach((dot, i) => animate(dot, i * 160));
  }, []);

  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
};

// ─── Typewriter Helper ────────────────────────────────────────────────────────

function typewriteQuestion(
  text: string,
  speed: number,
  setter: (t: string) => void,
  onDone: () => void,
) {
  let index = 0;
  const msPerChar = 1000 / speed;

  const interval = setInterval(() => {
    index += 1;
    setter(text.slice(0, index));
    if (index >= text.length) {
      clearInterval(interval);
      setTimeout(onDone, 300);
    }
  }, msPerChar);
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg:              '#0A0A0A',
  card:            '#111111',
  border:          '#2C2C2C',
  accent:          '#FFFFFF',
  text:            '#EFEFEF',
  textMuted:       '#6B6B6B',
  // Option states
  optionBg:        '#161616',
  selectedBorder:  '#F5C518',   // Yellow — selected
  selectedBg:      '#F5C51812',
  correctBorder:   '#3ECF8E',   // Green — correct
  correctBg:       '#3ECF8E14',
  incorrectBorder: '#E74C3C',   // Red — incorrect
  incorrectBg:     '#E74C3C14',
  missedBorder:    '#3ECF8E55', // faded green — correct but not picked
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    gap: 20,
  },

  // Label row
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textMuted,
  },
  labelText: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },

  // Question
  question: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  cursor: {
    color: COLORS.textMuted,
    fontSize: 18,
  },

  // Options
  optionsContainer: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionDefault: {
    backgroundColor: COLORS.optionBg,
    borderColor: COLORS.border,
  },
  optionSelected: {
    backgroundColor: COLORS.selectedBg,
    borderColor: COLORS.selectedBorder,
  },
  optionCorrect: {
    backgroundColor: COLORS.correctBg,
    borderColor: COLORS.correctBorder,
  },
  optionIncorrect: {
    backgroundColor: COLORS.incorrectBg,
    borderColor: COLORS.incorrectBorder,
  },
  optionCorrectMissed: {
    backgroundColor: 'transparent',
    borderColor: COLORS.missedBorder,
  },

  // Option label box: A B C D
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelDefault: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  labelSelected: {
    borderColor: COLORS.selectedBorder,
    backgroundColor: COLORS.selectedBorder,
  },
  labelCorrect: {
    borderColor: COLORS.correctBorder,
    backgroundColor: COLORS.correctBorder,
  },
  labelIncorrect: {
    borderColor: COLORS.incorrectBorder,
    backgroundColor: COLORS.incorrectBorder,
  },
  optionLabelText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  optionLabelTextSelected: {
    color: '#000000',
  },

  // Option text
  optionText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    letterSpacing: 0.1,
  },
  optionTextSelected: {
    color: COLORS.accent,
    fontWeight: '500',
  },

  // Feedback icon
  feedbackIcon: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },

  // Submit
  submitWrap: {
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Waiting
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.textMuted,
  },
  waitingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Hand raise
  handRaiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF06',
  },
  handRaiseBtnActive: {
    borderColor: '#3C3C3C',
    backgroundColor: 'transparent',
  },
  handRaiseIcon: {
    fontSize: 16,
  },
  handRaiseBtnText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default McqNode;

