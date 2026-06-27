
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import MathView from 'react-native-math-view';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaSection {
  id: string;
  formula: string;        // KaTeX string e.g. "F = ma"
  label?: string;         // e.g. "Newton's Second Law"
  explanation?: string;   // plain text below formula
}

export interface FormulaNodeData {
  id: string;
  type: 'formula';
  topic: string;
  sections: FormulaSection[];
  sectionDelay?: number;  // controlled by backend
}

interface FormulaNodeProps {
  data: FormulaNodeData;
  onComplete: (nodeId: string) => void;
  onHandRaise?: (nodeId: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const FormulaNode: React.FC<FormulaNodeProps> = ({
  data,
  onComplete,
  onHandRaise,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const [visibleCount, setVisibleCount] = useState(1);
  const [completed, setCompleted]       = useState(false);
  const [handRaised, setHandRaised]     = useState(false);

  const isPausedRef    = useRef(false);
  const handRaisePulse = useRef(new Animated.Value(1)).current;

  // ── Section reveal ────────────────────────────────────────────────────────

  const revealNext = useCallback(() => {
    setVisibleCount(prev => {
      const next = prev + 1;
      if (next >= data.sections.length) {
        setCompleted(true);
        setTimeout(() => onComplete(data.id), 600);
      }
      return next;
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [data.id, data.sections.length, onComplete]);

  const handleSectionReady = useCallback(() => {
    if (isPausedRef.current) return;
    const delay = data.sectionDelay ?? 800;
    setTimeout(() => {
      if (!isPausedRef.current) revealNext();
    }, delay);
  }, [data.sectionDelay, revealNext]);

  // ── Hand Raise ────────────────────────────────────────────────────────────

  const handleHandRaise = useCallback(() => {
    if (handRaised || completed) return;
    isPausedRef.current = true;
    setHandRaised(true);

    Animated.sequence([
      Animated.timing(handRaisePulse, { toValue: 1.15, duration: 160, useNativeDriver: true }),
      Animated.timing(handRaisePulse, { toValue: 1,    duration: 160, useNativeDriver: true }),
    ]).start();

    onHandRaise?.(data.id);
  }, [handRaised, completed, data.id, onHandRaise, handRaisePulse]);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    setHandRaised(false);
    revealNext();
  }, [revealNext]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Topic Bar */}
      <View style={styles.topicBar}>
        <Text style={styles.topicLabel}>FORMULA</Text>
        <Text style={styles.topicTitle}>{data.topic}</Text>
      </View>

      {/* Sections */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {data.sections.slice(0, visibleCount).map((section, index) => (
          <FormulaCard
            key={section.id}
            section={section}
            index={index}
            isLast={index === visibleCount - 1}
            onReady={handleSectionReady}
          />
        ))}

        {completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓  Complete</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      {!completed && (
        <View style={styles.bottomBar}>
          {handRaised ? (
            <View style={styles.pausedRow}>
              <Text style={styles.pausedText}>⏸  AI Mentor is listening...</Text>
              <TouchableOpacity style={styles.resumeBtn} onPress={handleResume}>
                <Text style={styles.resumeBtnText}>Resume</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: handRaisePulse }], width: '100%' }}>
              <TouchableOpacity
                style={styles.handRaiseBtn}
                onPress={handleHandRaise}
                activeOpacity={0.8}
              >
                <Text style={styles.handRaiseIcon}>✋</Text>
                <Text style={styles.handRaiseBtnText}>Raise Hand</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Formula Card ─────────────────────────────────────────────────────────────

interface FormulaCardProps {
  section: FormulaSection;
  index: number;
  isLast: boolean;
  onReady: () => void;
}

const FormulaCard: React.FC<FormulaCardProps> = ({
  section,
  isLast,
  onReady,
}) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const [mathReady, setMathReady] = useState(false);

  useEffect(() => {
    // Animate card in
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  // When MathView renders — trigger next section
  const handleMathLayout = useCallback(() => {
    if (mathReady) return;
    setMathReady(true);
    if (isLast) onReady();
  }, [mathReady, isLast, onReady]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Label */}
      {section.label && (
        <Text style={styles.cardLabel}>{section.label}</Text>
      )}

      {/* KaTeX Formula */}
      <View style={styles.mathContainer}>
        <MathView
          math={section.formula}
          style={styles.mathView}
          onLayout={handleMathLayout}
          resizeMode="contain"
          config={{
            displayMode: true,
            throwOnError: false,
            output: 'html',
          }}
        />
      </View>

      {/* Explanation */}
      {section.explanation && (
        <Text style={styles.explanation}>{section.explanation}</Text>
      )}
    </Animated.View>
  );
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg:        '#0A0A0A',
  surface:   '#141414',
  border:    '#2C2C2C',
  accent:    '#FFFFFF',
  text:      '#EFEFEF',
  textMuted: '#6B6B6B',
  cardBg:    '#111111',
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Topic bar
  topicBar: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topicLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 4,
  },
  topicTitle: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },

  // Card
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  cardLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Math
  mathContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mathView: {
    color: COLORS.accent,
  },

  // Explanation
  explanation: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 22,
    marginTop: 16,
    letterSpacing: 0.1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
  },

  // Completed
  completedBadge: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF08',
    alignItems: 'center',
  },
  completedText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  handRaiseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF06',
  },
  handRaiseIcon: {
    fontSize: 18,
  },
  handRaiseBtnText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 15,
  },

  // Paused
  pausedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pausedText: {
    color: COLORS.textMuted,
    fontSize: 13,
    flex: 1,
  },
  resumeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resumeBtnText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: 13,
  },
});

export default FormulaNode;
