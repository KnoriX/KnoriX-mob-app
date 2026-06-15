import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectionType = 'heading' | 'paragraph' | 'code' | 'table' | 'formula';

export interface MarkdownSection {
  id: string;
  type: SectionType;
  content: string;
  language?: string;       // for code blocks: 'python', 'js', etc.
  headers?: string[];      // for table: column headers
  rows?: string[][];       // for table: row data
  revealDelay?: number;    // ms to wait before auto-revealing next section
}

export interface MarkdownNodeData {
  id: string;
  type: 'markdown';
  topic: string;           // e.g. "Newton's Third Law"
  sections: MarkdownSection[];
  typingSpeed?: number;    // chars per ms — default 28
}

interface MarkdownNodeProps {
  data: MarkdownNodeData;
  onComplete: (nodeId: string) => void;
  onHandRaise?: (nodeId: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_TYPING_SPEED = 28;   // chars per second
const SECTION_PAUSE        = 900;  // ms pause between sections

// ─── Main Component ──────────────────────────────────────────────────────────

const MarkdownNode: React.FC<MarkdownNodeProps> = ({
  data,
  onComplete,
  onHandRaise,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  // Which sections are visible
  const [visibleCount, setVisibleCount] = useState(0);
  const [handRaised, setHandRaised]     = useState(false);
  const [completed, setCompleted]       = useState(false);

  const handRaisePulse = useRef(new Animated.Value(1)).current;
  const isPausedRef    = useRef(false);  // paused when hand raised

  // ── Section reveal logic ──────────────────────────────────────────────────

  const revealNextSection = useCallback(() => {
    setVisibleCount(prev => {
      const next = prev + 1;
      if (next >= data.sections.length) {
        setCompleted(true);
        setTimeout(() => onComplete(data.id), 600);
      }
      return next;
    });
    // Scroll to bottom after new section
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [data.id, data.sections.length, onComplete]);

  // After each section finishes typing → auto reveal next
  const handleSectionTyped = useCallback((sectionIndex: number) => {
    if (isPausedRef.current) return;

    const section = data.sections[sectionIndex];
    const delay   = section.revealDelay ?? SECTION_PAUSE;

    setTimeout(() => {
      if (!isPausedRef.current) {
        revealNextSection();
      }
    }, delay);
  }, [data.sections, revealNextSection]);

  // Start first section
  useEffect(() => {
    setVisibleCount(1);
  }, []);

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
    // Continue from where we left off
    revealNextSection();
  }, [revealNextSection]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Topic Header */}
      <View style={styles.topicBar}>
        <Text style={styles.topicLabel}>TOPIC</Text>
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
          <SectionRenderer
            key={section.id}
            section={section}
            index={index}
            isLast={index === visibleCount - 1}
            typingSpeed={data.typingSpeed ?? DEFAULT_TYPING_SPEED}
            onTypingComplete={() => handleSectionTyped(index)}
          />
        ))}

        {/* Typing cursor on last section */}
        {!completed && visibleCount > 0 && (
          <TypingCursor />
        )}

        {/* Completed */}
        {completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓  Section Complete</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Hand Raise — floating bottom */}
      {!completed && (
        <View style={styles.bottomBar}>
          {handRaised ? (
            <View style={styles.pausedRow}>
              <Text style={styles.pausedText}>⏸  Paused — AI Mentor is listening</Text>
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

// ─── Section Renderer ─────────────────────────────────────────────────────────

interface SectionRendererProps {
  section: MarkdownSection;
  index: number;
  isLast: boolean;
  typingSpeed: number;
  onTypingComplete: () => void;
}

const SectionRenderer: React.FC<SectionRendererProps> = ({
  section,
  isLast,
  typingSpeed,
  onTypingComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // For text-based sections — typewriter
  if (section.type === 'heading' || section.type === 'paragraph') {
    return (
      <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
        <TypewriterText
          text={section.content}
          style={section.type === 'heading' ? styles.heading : styles.paragraph}
          speed={typingSpeed}
          onComplete={onTypingComplete}
          isActive={isLast}
        />
      </Animated.View>
    );
  }

  if (section.type === 'code') {
    return (
      <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
        <CodeBlock
          content={section.content}
          language={section.language}
          speed={typingSpeed}
          onComplete={onTypingComplete}
          isActive={isLast}
        />
      </Animated.View>
    );
  }

  if (section.type === 'table') {
    return (
      <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
        <TableBlock
          headers={section.headers ?? []}
          rows={section.rows ?? []}
          onComplete={onTypingComplete}
          isActive={isLast}
        />
      </Animated.View>
    );
  }

  if (section.type === 'formula') {
    return (
      <Animated.View style={[styles.sectionWrap, { opacity: fadeAnim }]}>
        <FormulaBlock
          content={section.content}
          onComplete={onTypingComplete}
          isActive={isLast}
        />
      </Animated.View>
    );
  }

  return null;
};

// ─── Typewriter Text ──────────────────────────────────────────────────────────

interface TypewriterTextProps {
  text: string;
  style: object;
  speed: number;           // chars per second
  onComplete: () => void;
  isActive: boolean;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  style,
  speed,
  onComplete,
  isActive,
}) => {
  const [displayed, setDisplayed] = useState(isActive ? '' : text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef    = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayed(text);
      return;
    }

    const msPerChar = 1000 / speed;

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(text.slice(0, indexRef.current));

      if (indexRef.current >= text.length) {
        clearInterval(intervalRef.current!);
        onComplete();
      }
    }, msPerChar);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, text, speed, onComplete]);

  return <Text style={style}>{displayed}</Text>;
};

// ─── Code Block ───────────────────────────────────────────────────────────────

interface CodeBlockProps {
  content: string;
  language?: string;
  speed: number;
  onComplete: () => void;
  isActive: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  content,
  language,
  speed,
  onComplete,
  isActive,
}) => {
  const [displayed, setDisplayed] = useState(isActive ? '' : content);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef    = useRef(0);

  useEffect(() => {
    if (!isActive) {
      setDisplayed(content);
      return;
    }

    const msPerChar = 1000 / (speed * 1.6); // code types slightly faster

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      setDisplayed(content.slice(0, indexRef.current));
      if (indexRef.current >= content.length) {
        clearInterval(intervalRef.current!);
        onComplete();
      }
    }, msPerChar);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, content, speed, onComplete]);

  return (
    <View style={styles.codeContainer}>
      {language && (
        <View style={styles.codeLangBar}>
          <Text style={styles.codeLang}>{language}</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText}>{displayed}</Text>
      </ScrollView>
    </View>
  );
};

// ─── Table Block ──────────────────────────────────────────────────────────────

interface TableBlockProps {
  headers: string[];
  rows: string[][];
  onComplete: () => void;
  isActive: boolean;
}

const TableBlock: React.FC<TableBlockProps> = ({
  headers,
  rows,
  onComplete,
  isActive,
}) => {
  const [visibleRows, setVisibleRows] = useState(isActive ? 0 : rows.length);

  useEffect(() => {
    if (!isActive) return;

    let current = 0;
    const reveal = () => {
      current += 1;
      setVisibleRows(current);
      if (current < rows.length) {
        setTimeout(reveal, 320);
      } else {
        onComplete();
      }
    };
    setTimeout(reveal, 300);
  }, [isActive, rows.length, onComplete]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          {headers.map((h, i) => (
            <Text key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
              {h}
            </Text>
          ))}
        </View>
        {/* Rows */}
        {rows.slice(0, visibleRows).map((row, ri) => (
          <View
            key={ri}
            style={[styles.tableRow, ri % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
          >
            {row.map((cell, ci) => (
              <Text key={ci} style={styles.tableCell}>{cell}</Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ─── Formula Block ────────────────────────────────────────────────────────────

interface FormulaBlockProps {
  content: string;
  onComplete: () => void;
  isActive: boolean;
}

const FormulaBlock: React.FC<FormulaBlockProps> = ({
  content,
  onComplete,
  isActive,
}) => {
  const scaleAnim = useRef(new Animated.Value(isActive ? 0.92 : 1)).current;
  const opacAnim  = useRef(new Animated.Value(isActive ? 0 : 1)).current;

  useEffect(() => {
    if (!isActive) return;

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => onComplete());
    }, 200);
  }, [isActive, scaleAnim, opacAnim, onComplete]);

  return (
    <Animated.View
      style={[
        styles.formulaContainer,
        { opacity: opacAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Text style={styles.formulaLabel}>Formula</Text>
      <Text style={styles.formulaText}>{content}</Text>
    </Animated.View>
  );
};

// ─── Typing Cursor ────────────────────────────────────────────────────────────

const TypingCursor: React.FC = () => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.cursor, { opacity }]}>▎</Animated.Text>
  );
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg:         '#0A0A0A',
  surface:    '#141414',
  border:     '#2C2C2C',
  accent:     '#FFFFFF',
  text:       '#EFEFEF',
  textMuted:  '#6B6B6B',
  codeBg:     '#111111',
  tableHead:  '#1C1C1C',
  tableEven:  '#141414',
  tableOdd:   '#0F0F0F',
  formulaBg:  '#161616',
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
    paddingTop: 20,
  },

  // Section
  sectionWrap: {
    marginBottom: 20,
  },

  // Text types
  heading: {
    color: COLORS.accent,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
    paddingLeft: 12,
  },
  paragraph: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 26,
    letterSpacing: 0.1,
  },

  // Code
  codeContainer: {
    backgroundColor: COLORS.codeBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  codeLangBar: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  codeLang: {
    color: COLORS.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  codeText: {
    fontFamily: 'monospace',
    color: '#D4D4D4',
    fontSize: 13,
    lineHeight: 22,
    padding: 14,
  },

  // Table
  table: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    backgroundColor: COLORS.tableHead,
  },
  tableRowEven: {
    backgroundColor: COLORS.tableEven,
  },
  tableRowOdd: {
    backgroundColor: COLORS.tableOdd,
  },
  tableCell: {
    color: COLORS.text,
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableHeaderCell: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  // Formula
  formulaContainer: {
    backgroundColor: COLORS.formulaBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: 'center',
  },
  formulaLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  formulaText: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '300',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Cursor
  cursor: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: -8,
    marginLeft: 2,
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

  // Paused state
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

export default MarkdownNode;
