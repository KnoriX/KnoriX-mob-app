import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

// ─── Types ───────────────────────────────────────────────────────────────────

type RenderMode = 'raw' | 'structured';
type AnimationMode = 'animated' | 'static';

// Raw SVG — backend sends XML string directly
export interface RawSvgSection {
  id: string;
  mode: 'raw';
  svgString: string;       // full SVG XML string
  caption?: string;
  animation: AnimationMode;
}

// Structured SVG — backend sends elements, we draw them
export type ShapeType = 'circle' | 'rect' | 'line' | 'path' | 'text' | 'arrow';

export interface SvgShape {
  id: string;
  type: ShapeType;
  // circle
  cx?: number; cy?: number; r?: number;
  // rect
  x?: number; y?: number; width?: number; height?: number; rx?: number;
  // line / arrow
  x1?: number; y1?: number; x2?: number; y2?: number;
  // path
  d?: string;
  // text
  content?: string; fontSize?: number; textAnchor?: string;
  // shared
  fill?: string; stroke?: string; strokeWidth?: number;
  opacity?: number;
  label?: string;          // annotation label near shape
  drawDelay?: number;      // ms — backend controls timing
}

export interface StructuredSvgSection {
  id: string;
  mode: 'structured';
  viewBox: string;         // e.g. "0 0 400 300"
  shapes: SvgShape[];
  caption?: string;
  animation: AnimationMode;
}

export type SvgSection = RawSvgSection | StructuredSvgSection;

export interface SvgNodeData {
  id: string;
  type: 'svg';
  topic: string;
  sections: SvgSection[];
  sectionDelay?: number;   // backend controlled
}

interface SvgNodeProps {
  data: SvgNodeData;
  onComplete: (nodeId: string) => void;
  onHandRaise?: (nodeId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH  = Dimensions.get('window').width;
const SVG_WIDTH     = SCREEN_WIDTH - 40;  // padding 20 each side

// ─── Main Component ──────────────────────────────────────────────────────────

const SvgNode: React.FC<SvgNodeProps> = ({
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

  // ── Section Reveal ───────────────────────────────────────────────────────

  const revealNext = useCallback(() => {
    setVisibleCount(prev => {
      const next = prev + 1;
      if (next >= data.sections.length) {
        setCompleted(true);
        setTimeout(() => onComplete(data.id), 600);
      }
      return next;
    });
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [data.id, data.sections.length, onComplete]);

  const handleSectionReady = useCallback(() => {
    if (isPausedRef.current) return;
    const delay = data.sectionDelay ?? 800;
    setTimeout(() => {
      if (!isPausedRef.current) revealNext();
    }, delay);
  }, [data.sectionDelay, revealNext]);

  // ── Hand Raise ───────────────────────────────────────────────────────────

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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* Topic Bar */}
      <View style={styles.topicBar}>
        <Text style={styles.topicLabel}>DIAGRAM</Text>
        <Text style={styles.topicTitle}>{data.topic}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {data.sections.slice(0, visibleCount).map((section, index) => (
          <SvgSectionRenderer
            key={section.id}
            section={section}
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

// ─── Section Renderer ─────────────────────────────────────────────────────────

interface SvgSectionRendererProps {
  section: SvgSection;
  isLast: boolean;
  onReady: () => void;
}

const SvgSectionRenderer: React.FC<SvgSectionRendererProps> = ({
  section,
  isLast,
  onReady,
}) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {section.mode === 'raw' ? (
        <RawSvgRenderer
          section={section}
          isLast={isLast}
          onReady={onReady}
        />
      ) : (
        <StructuredSvgRenderer
          section={section}
          isLast={isLast}
          onReady={onReady}
        />
      )}

      {section.caption && (
        <Text style={styles.caption}>{section.caption}</Text>
      )}
    </Animated.View>
  );
};

// ─── Raw SVG Renderer ─────────────────────────────────────────────────────────

interface RawSvgRendererProps {
  section: RawSvgSection;
  isLast: boolean;
  onReady: () => void;
}

const RawSvgRenderer: React.FC<RawSvgRendererProps> = ({
  section,
  isLast,
  onReady,
}) => {
  const opacAnim = useRef(new Animated.Value(
    section.animation === 'animated' ? 0 : 1
  )).current;

  useEffect(() => {
    if (section.animation === 'static') {
      if (isLast) onReady();
      return;
    }

    // Fade in animation
    Animated.timing(opacAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {
      if (isLast) onReady();
    });
  }, [section.animation, isLast, onReady, opacAnim]);

  return (
    <Animated.View style={[styles.svgWrapper, { opacity: opacAnim }]}>
      <SvgXml
        xml={section.svgString}
        width={SVG_WIDTH - 40}
        height="auto"
      />
    </Animated.View>
  );
};

// ─── Structured SVG Renderer ──────────────────────────────────────────────────

interface StructuredSvgRendererProps {
  section: StructuredSvgSection;
  isLast: boolean;
  onReady: () => void;
}

const StructuredSvgRenderer: React.FC<StructuredSvgRendererProps> = ({
  section,
  isLast,
  onReady,
}) => {
  const totalShapes = section.shapes.length;
  const [visibleShapes, setVisibleShapes] = useState(
    section.animation === 'static' ? totalShapes : 0
  );

  useEffect(() => {
    if (section.animation === 'static') {
      if (isLast) onReady();
      return;
    }

    // Draw shapes one by one with their individual delays
    let current = 0;

    const drawNext = () => {
      if (current >= totalShapes) {
        if (isLast) onReady();
        return;
      }

      const shape = section.shapes[current];
      const delay = shape.drawDelay ?? 400;

      setTimeout(() => {
        current += 1;
        setVisibleShapes(current);
        drawNext();
      }, delay);
    };

    drawNext();
  }, [section.animation, section.shapes, totalShapes, isLast, onReady]);

  // Build SVG string from visible shapes
  const svgContent = buildSvgFromShapes(
    section.shapes.slice(0, visibleShapes),
    section.viewBox
  );

  return (
    <View style={styles.svgWrapper}>
      <SvgXml
        xml={svgContent}
        width={SVG_WIDTH - 40}
        height="auto"
      />
    </View>
  );
};

// ─── SVG Builder ──────────────────────────────────────────────────────────────

function buildSvgFromShapes(shapes: SvgShape[], viewBox: string): string {
  const shapeSvgs = shapes.map(shape => {
    const fill        = shape.fill        ?? 'none';
    const stroke      = shape.stroke      ?? '#FFFFFF';
    const strokeWidth = shape.strokeWidth ?? 1.5;
    const opacity     = shape.opacity     ?? 1;

    switch (shape.type) {
      case 'circle':
        return `
          <circle
            cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"
          />
          ${shape.label ? `<text x="${shape.cx}" y="${(shape.cy ?? 0) + (shape.r ?? 0) + 14}"
            text-anchor="middle" fill="#6B6B6B" font-size="11">${shape.label}</text>` : ''}
        `;

      case 'rect':
        return `
          <rect
            x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"
            rx="${shape.rx ?? 4}"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"
          />
          ${shape.label ? `<text x="${(shape.x ?? 0) + (shape.width ?? 0) / 2}" y="${(shape.y ?? 0) + (shape.height ?? 0) + 14}"
            text-anchor="middle" fill="#6B6B6B" font-size="11">${shape.label}</text>` : ''}
        `;

      case 'line':
        return `
          <line
            x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"
            stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"
          />
        `;

      case 'arrow':
        return `
          <defs>
            <marker id="arrow-${shape.id}" markerWidth="8" markerHeight="8"
              refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="${stroke}" />
            </marker>
          </defs>
          <line
            x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"
            stroke="${stroke}" stroke-width="${strokeWidth}"
            marker-end="url(#arrow-${shape.id})" opacity="${opacity}"
          />
          ${shape.label ? `<text x="${((shape.x1 ?? 0) + (shape.x2 ?? 0)) / 2}"
            y="${((shape.y1 ?? 0) + (shape.y2 ?? 0)) / 2 - 6}"
            text-anchor="middle" fill="#6B6B6B" font-size="11">${shape.label}</text>` : ''}
        `;

      case 'path':
        return `
          <path
            d="${shape.d}"
            fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"
          />
        `;

      case 'text':
        return `
          <text
            x="${shape.x}" y="${shape.y}"
            fill="${shape.fill ?? '#EFEFEF'}"
            font-size="${shape.fontSize ?? 14}"
            text-anchor="${shape.textAnchor ?? 'middle'}"
            opacity="${opacity}"
          >${shape.content}</text>
        `;

      default:
        return '';
    }
  }).join('\n');

  return `
    <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
      ${shapeSvgs}
    </svg>
  `;
}

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
    overflow: 'hidden',
  },

  // SVG
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },

  // Caption
  caption: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.2,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
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

export default SvgNode;
