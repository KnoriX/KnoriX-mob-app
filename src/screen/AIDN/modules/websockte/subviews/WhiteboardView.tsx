// ─────────────────────────────────────────────────────────────
// modules/websocket/subviews/WhiteboardView.tsx
// Live whiteboard — renders WS drawing commands via Skia
// Supports: stroke, text, shapes, highlight, erase, clear
// ─────────────────────────────────────────────────────────────

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Canvas,
  Path,
  Skia,
  SkPath,
  Text as SkText,
  useFont,
  Circle,
  Rect,
  Group,
  Paint,
} from '@shopify/react-native-skia';
import { Colors, Typography, Spacing, Radius } from '../../../styles/token';
import type { WhiteboardCommand, WhiteboardConfig } from '../../../types/realtime.types';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = CARD_W * (9 / 16);

interface StrokeData {
  path: SkPath;
  color: string;
  width: number;
}

interface TextData {
  x: number; y: number; text: string; color: string; size: number;
}

interface ShapeData {
  shape: 'circle' | 'rect' | 'arrow';
  x: number; y: number; w: number; h: number; color: string;
}

interface HighlightData {
  x: number; y: number; w: number; h: number; color: string;
}

interface CanvasState {
  strokes: StrokeData[];
  texts: TextData[];
  shapes: ShapeData[];
  highlights: HighlightData[];
}

interface Props {
  commands: WhiteboardCommand[];
  config: WhiteboardConfig;
  onSkip: () => void;
}

export default function WhiteboardView({ commands, config, onSkip }: Props) {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    strokes: [],
    texts: [],
    shapes: [],
    highlights: [],
  });
  const currentStrokeRef = useRef<StrokeData | null>(null);

  // Logical → screen scale
  const scaleX = CARD_W / (config.canvasWidth || 400);
  const scaleY = (CARD_H - 48) / (config.canvasHeight || 225);

  const sx = (x: number) => x * scaleX;
  const sy = (y: number) => y * scaleY;

  useEffect(() => {
    const latest = commands[commands.length - 1];
    if (!latest) return;

    switch (latest.cmd) {
      case 'stroke_start': {
        const path = Skia.Path.Make();
        path.moveTo(sx(latest.x), sy(latest.y));
        currentStrokeRef.current = { path, color: latest.color, width: latest.width };
        setCanvasState(s => ({ ...s, strokes: [...s.strokes, currentStrokeRef.current!] }));
        break;
      }
      case 'stroke_point': {
        if (currentStrokeRef.current) {
          currentStrokeRef.current.path.lineTo(sx(latest.x), sy(latest.y));
          // Force re-render
          setCanvasState(s => ({ ...s }));
        }
        break;
      }
      case 'stroke_end': {
        currentStrokeRef.current = null;
        break;
      }
      case 'text': {
        setCanvasState(s => ({
          ...s,
          texts: [...s.texts, { x: sx(latest.x), y: sy(latest.y), text: latest.text, color: latest.color, size: latest.size }],
        }));
        break;
      }
      case 'shape': {
        setCanvasState(s => ({
          ...s,
          shapes: [...s.shapes, { shape: latest.shape, x: sx(latest.x), y: sy(latest.y), w: sx(latest.w), h: sy(latest.h), color: latest.color }],
        }));
        break;
      }
      case 'highlight': {
        setCanvasState(s => ({
          ...s,
          highlights: [...s.highlights, { x: sx(latest.x), y: sy(latest.y), w: sx(latest.w), h: sy(latest.h), color: latest.color }],
        }));
        break;
      }
      case 'clear': {
        setCanvasState({ strokes: [], texts: [], shapes: [], highlights: [] });
        currentStrokeRef.current = null;
        break;
      }
    }
  }, [commands]);

  return (
    <View style={th.card}>
      <View style={th.accentStrip} />

      {/* Header */}
      <View style={th.header}>
        <View style={th.badgeRow}>
          <View style={th.badge}>
            <Text style={th.badgeText}>WHITEBOARD</Text>
          </View>
          <Text style={th.liveLabel}>● LIVE</Text>
        </View>
        <TouchableOpacity style={th.btnSkip} onPress={onSkip}>
          <Text style={th.btnSkipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Canvas */}
      <Canvas style={{ width: CARD_W, height: CARD_H - 48, backgroundColor: config.background ?? '#0F0F1A' }}>
        {/* Highlights (behind strokes) */}
        {canvasState.highlights.map((h, i) => (
          <Rect key={`h${i}`} x={h.x} y={h.y} width={h.w} height={h.h}>
            <Paint color={h.color + '44'} />
          </Rect>
        ))}

        {/* Shapes */}
        {canvasState.shapes.map((s, i) => {
          if (s.shape === 'rect') {
            return <Rect key={`sh${i}`} x={s.x} y={s.y} width={s.w} height={s.h}>
              <Paint color={s.color} style="stroke" strokeWidth={2} />
            </Rect>;
          }
          if (s.shape === 'circle') {
            return <Circle key={`sh${i}`} cx={s.x + s.w / 2} cy={s.y + s.h / 2} r={Math.min(s.w, s.h) / 2}>
              <Paint color={s.color} style="stroke" strokeWidth={2} />
            </Circle>;
          }
          // Arrow — simple line + head
          const arrowPath = Skia.Path.Make();
          arrowPath.moveTo(s.x, s.y + s.h / 2);
          arrowPath.lineTo(s.x + s.w, s.y + s.h / 2);
          arrowPath.moveTo(s.x + s.w - 10, s.y + s.h / 2 - 6);
          arrowPath.lineTo(s.x + s.w, s.y + s.h / 2);
          arrowPath.lineTo(s.x + s.w - 10, s.y + s.h / 2 + 6);
          return <Path key={`sh${i}`} path={arrowPath} color={s.color} strokeWidth={2} style="stroke" />;
        })}

        {/* Strokes */}
        {canvasState.strokes.map((stroke, i) => (
          <Path
            key={`s${i}`}
            path={stroke.path}
            color={stroke.color}
            strokeWidth={stroke.width}
            style="stroke"
            strokeJoin="round"
            strokeCap="round"
          />
        ))}

        {/* Texts */}
        {canvasState.texts.map((t, i) => (
          <SkText
            key={`t${i}`}
            x={t.x}
            y={t.y}
            text={t.text}
            font={null} // Will use system font; swap with useFont for custom
            color={t.color}
          />
        ))}
      </Canvas>
    </View>
  );
}

const th = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  accentStrip: { height: 3, backgroundColor: Colors.accent },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.accent + '22',
    borderWidth: 1, borderColor: Colors.accent,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { color: Colors.accent, fontSize: 10, fontFamily: Typography.semibold, letterSpacing: 1 },
  liveLabel: { color: '#FF4D4D', fontSize: 11, fontFamily: Typography.semibold },
  btnSkip: { paddingHorizontal: 10, paddingVertical: 6 },
  btnSkipText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.semibold, letterSpacing: 1 },
});
