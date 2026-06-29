
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { SvgXml } from 'react-native-svg';
import { Colors, Typography, Spacing, Radius } from '../../styles/token';
import type { NodeProps } from '../../types/node.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MermaidHighlight {
  nodeId: string;       // mermaid node id e.g. "A", "B2"
  color: string;        // hex fill color
  label?: string;       // optional overlay label
  pulse?: boolean;      // pulsing glow effect
}

export interface MermaidPayload {
  /** Pre-rendered SVG string from backend (primary path) */
  svgString?: string;
  /** Raw mermaid definition (fallback — rendered via WebView + mermaid.js) */
  mermaidSrc?: string;
  caption?: string;
  highlights?: MermaidHighlight[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Injects highlight colors into a pre-rendered SVG string.
 * Targets elements with id="node-{nodeId}" or class containing nodeId.
 */
function injectHighlights(svg: string, highlights: MermaidHighlight[]): string {
  if (!highlights?.length) return svg;
  let result = svg;
  highlights.forEach(({ nodeId, color, pulse }) => {
    // Mermaid SVG uses id patterns like "flowchart-A-0", "A", etc.
    // We do a broad regex replace on fill for matching node groups
    const safeId = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Replace rect/polygon fill inside the node group
    result = result.replace(
      new RegExp(`(id="${safeId}"[^>]*>|id="flowchart-${safeId}-\\d+"[^>]*>)`, 'g'),
      (match) => match,
    );
    // Simpler: add a style block targeting node ids
  });

  // Inject a <style> block before </svg>
  const styleLines = highlights
    .map(({ nodeId, color, pulse }) => {
      const base = `#${nodeId} rect, #${nodeId} polygon, #${nodeId} circle,
  [id^="flowchart-${nodeId}-"] rect, [id^="flowchart-${nodeId}-"] polygon {
    fill: ${color}22 !important;
    stroke: ${color} !important;
    stroke-width: 2px !important;
  }`;
      const pulseAnim = pulse
        ? `@keyframes pulse-${nodeId} {
    0%,100% { opacity:1; } 50% { opacity:0.5; }
  }
  #${nodeId}, [id^="flowchart-${nodeId}-"] { animation: pulse-${nodeId} 1.4s ease-in-out infinite; }`
        : '';
      return base + '\n' + pulseAnim;
    })
    .join('\n');

  const styleBlock = `<style>${styleLines}</style>`;
  return result.replace('</svg>', `${styleBlock}</svg>`);
}

/**
 * Builds a full HTML page that renders raw Mermaid source via mermaid.js CDN.
 * Used as fallback when backend sends mermaidSrc instead of svgString.
 */
function buildMermaidHtml(src: string, highlights: MermaidHighlight[]): string {
  const highlightJs = highlights
    .map(({ nodeId, color, pulse }) => {
      return `
        (function() {
          const selectors = [
            '#${nodeId} rect', '#${nodeId} polygon', '#${nodeId} circle',
            '[id^="flowchart-${nodeId}-"] rect',
            '[id^="flowchart-${nodeId}-"] polygon',
          ];
          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
              el.style.fill = '${color}22';
              el.style.stroke = '${color}';
              el.style.strokeWidth = '2px';
              ${pulse ? `el.style.animation = 'pulseNode 1.4s ease-in-out infinite';` : ''}
            });
          });
        })();
      `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0A0A0F; display:flex; align-items:center; justify-content:center;
         min-height:100vh; overflow:hidden; }
  .mermaid { max-width:100%; }
  svg { max-width:100%; height:auto; }
  @keyframes pulseNode { 0%,100%{opacity:1} 50%{opacity:0.5} }
</style>
</head>
<body>
<div class="mermaid">${src}</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: '#0A0A0F',
      primaryColor: '#7C6FFF',
      primaryTextColor: '#E8E8F0',
      lineColor: '#4A4A6A',
      secondaryColor: '#1E1E2E',
      tertiaryColor: '#12121A',
    }
  });
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      ${highlightJs}
    }, 800);
  });
</script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const MermaidNode: React.FC<NodeProps<MermaidPayload>> = ({
  payload,
  onDone,
  onSkip,
  sendEvent,
}) => {
  const {
    svgString,
    mermaidSrc,
    caption,
    highlights: initialHighlights = [],
  } = payload;

  const [highlights, setHighlights] = useState<MermaidHighlight[]>(initialHighlights);
  const [renderMode] = useState<'svg' | 'webview'>(svgString ? 'svg' : 'webview');
  const [webViewReady, setWebViewReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // ── Animation ──
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });

    sendEvent?.({ type: 'mermaid_view_start', nodeId: payload.id });

    return () => {
      opacity.value = withTiming(0, { duration: 200 });
    };
  }, []);

  // ── WS highlight patch handler ──
  // Called by parent when node_update arrives with new highlights
  useEffect(() => {
    if (payload.highlights) {
      setHighlights(payload.highlights);
      // If webview mode — inject highlights via postMessage
      if (renderMode === 'webview' && webViewReady) {
        const js = payload.highlights
          .map(({ nodeId, color, pulse }) => `
            (function() {
              const sels = ['#${nodeId} rect','#${nodeId} polygon',
                '[id^="flowchart-${nodeId}-"] rect','[id^="flowchart-${nodeId}-"] polygon'];
              sels.forEach(s => document.querySelectorAll(s).forEach(el => {
                el.style.fill='${color}22'; el.style.stroke='${color}';
                el.style.strokeWidth='2px';
                ${pulse ? `el.style.animation='pulseNode 1.4s ease-in-out infinite';` : ''}
              }));
            })();
          `)
          .join('\n');
        webViewRef.current?.injectJavaScript(js + ' true;');
      }
    }
  }, [payload.highlights]);

  // ── Done / Skip ──
  const handleDone = useCallback(() => {
    sendEvent?.({ type: 'mermaid_view_complete', nodeId: payload.id });
    opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDone)(); });
    translateY.value = withTiming(-8, { duration: 200 });
  }, [onDone]);

  const handleSkip = useCallback(() => {
    sendEvent?.({ type: 'mermaid_skip', nodeId: payload.id });
    opacity.value = withTiming(0, { duration: 200 },
      (finished) => { if (finished) runOnJS(onSkip ?? onDone)(); });
  }, [onSkip, onDone]);

  // ── SVG path ──
  const processedSvg = renderMode === 'svg' && svgString
    ? injectHighlights(svgString, highlights)
    : null;

  return (
    <Animated.View style={[styles.wrapper, animStyle]}>
      {/* Accent strip */}
      <View style={styles.accentStrip} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DIAGRAM</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Diagram canvas */}
      <View style={styles.canvas}>
        {renderMode === 'svg' && processedSvg ? (
          <ScrollView
            style={styles.svgScroll}
            contentContainerStyle={styles.svgContent}
            showsVerticalScrollIndicator={false}
            pinchGestureEnabled
          >
            <SvgXml
              xml={processedSvg}
              width={CARD_WIDTH - 24}
              height={CARD_HEIGHT - 24}
            />
          </ScrollView>
        ) : (
          <WebView
            ref={webViewRef}
            style={styles.webview}
            source={{ html: buildMermaidHtml(mermaidSrc ?? '', highlights) }}
            scrollEnabled
            javaScriptEnabled
            onLoadEnd={() => setWebViewReady(true)}
            backgroundColor="#0A0A0F"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Highlight legend */}
        {highlights.length > 0 && (
          <View style={styles.legend}>
            {highlights.map((h) => (
              <View key={h.nodeId} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: h.color }]} />
                {h.label ? (
                  <Text style={styles.legendLabel}>{h.label}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Caption */}
      {caption ? (
        <Text style={styles.caption}>{caption}</Text>
      ) : null}

      {/* Done button */}
      <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneBtnText}>Got it →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.md,
  },
  accentStrip: {
    height: 3,
    backgroundColor: Colors.accent,        // indigo-violet from tokens
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: Colors.accent,
    fontSize: 10,
    fontFamily: Typography.mono,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 4,
  },
  skipText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: Typography.mono,
    letterSpacing: 1,
  },
  canvas: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  svgScroll: {
    flex: 1,
  },
  svgContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    minHeight: CARD_HEIGHT,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontFamily: Typography.body,
  },
  caption: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    lineHeight: 18,
  },
  doneBtn: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  doneBtnText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: Typography.mono,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default MermaidNode;
