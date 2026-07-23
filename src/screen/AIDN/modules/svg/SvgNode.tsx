import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { WebView } from 'react-native-webview';
import { SvgXml } from 'react-native-svg';

import { AIDNNode, SvgPayload, SvgHighlight, SvgTapZone } from '../../types/node.types';
import { wsService } from '../../services/websocketService';
import { svgStyles as S } from './svgNode.styles';
import { Colors } from '../../styles/token';

// ─── Constants ────────────────────────────────────────────────────────────

const FADE_IN_MS  = 280;
const FADE_OUT_MS = 200;

// ─── Props ────────────────────────────────────────────────────────────────

interface SvgNodeProps {
  node: AIDNNode;
  onDone?: () => void;
}

// ─── Tooltip Modal ────────────────────────────────────────────────────────

interface TooltipProps {
  zone: SvgTapZone | null;
  onClose: () => void;
}

const TooltipModal = ({ zone, onClose }: TooltipProps) => {
  if (!zone) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!zone}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={S.modalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={S.tooltipCard}>
          {/* Accent strip */}
          <View style={S.tooltipAccent} />

          <View style={S.tooltipBody}>
            {/* Element ID badge */}
            <View style={S.tooltipBadge}>
              <Text style={S.tooltipBadgeText}>#{zone.elementId}</Text>
            </View>

            {/* Tooltip label */}
            <Text style={S.tooltipTitle}>{zone.tooltip}</Text>

            {/* Optional detail */}
            {zone.detail ? (
              <Text style={S.tooltipDetail}>{zone.detail}</Text>
            ) : null}

            {/* Close button */}
            <TouchableOpacity onPress={onClose} style={S.tooltipCloseBtn}>
              <Text style={S.tooltipCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Highlight Legend item ─────────────────────────────────────────────────

interface LegendItemProps {
  highlight: SvgHighlight;
}

const LegendItem = ({ highlight }: LegendItemProps) => (
  <View style={S.legendItem}>
    <View style={[S.legendDot, {
      backgroundColor: highlight.color ?? Colors.accent,
    }]} />
    <Text style={S.legendText} numberOfLines={1}>
      {highlight.label ?? highlight.elementId}
    </Text>
  </View>
);

// ─── Inject highlights into SVG string ────────────────────────────────────

/**
 * Patch the raw SVG string to apply highlight colors to matching element IDs.
 * Adds fill/stroke style inline so it works in both SvgXml and WebView.
 */
function injectHighlights(svgString: string, highlights: SvgHighlight[]): string {
  let patched = svgString;

  for (const h of highlights) {
    const color = h.color ?? Colors.accent;
    // Match id="elementId" and inject fill + stroke
    const idPattern = new RegExp(
      `(id="${h.elementId}"[^>]*)(style="[^"]*"|)`,
      'g',
    );
    patched = patched.replace(idPattern, (match, prefix) => {
      return `${prefix} style="fill:${color}33;stroke:${color};stroke-width:2"`;
    });
  }

  return patched;
}

/**
 * Build a full HTML document wrapping the SVG for WebView rendering.
 * Supports CSS animations and tap events via postMessage.
 */
function buildWebViewHtml(
  svgString: string,
  highlights: SvgHighlight[],
  tapZones: SvgTapZone[],
): string {
  // Inject highlight styles
  const highlightCSS = highlights
    .map(h => `
      #${h.elementId} {
        fill: ${h.color ?? Colors.accent}33;
        stroke: ${h.color ?? Colors.accent};
        stroke-width: 2;
        ${h.pulse ? `animation: pulse_${h.elementId} 1.8s ease-in-out infinite;` : ''}
      }
      @keyframes pulse_${h.elementId} {
        0%, 100% { stroke-opacity: 1; stroke-width: 2; }
        50%       { stroke-opacity: 0.4; stroke-width: 4; }
      }
    `)
    .join('\n');

  // Tap zone JS — postMessage to RN on element click
  const tapJS = tapZones
    .map(z => `
      var el_${z.elementId} = document.getElementById('${z.elementId}');
      if (el_${z.elementId}) {
        el_${z.elementId}.style.cursor = 'pointer';
        el_${z.elementId}.addEventListener('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'tap',
            elementId: '${z.elementId}'
          }));
        });
      }
    `)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: ${Colors.surface}; overflow: hidden; }
  svg { width: 100% !important; height: 100% !important; display: block; }
  ${highlightCSS}
</style>
</head>
<body>
  ${svgString}
  <script>
    ${tapJS}
  </script>
</body>
</html>`;
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function SvgNode({ node, onDone }: SvgNodeProps) {
  const payload = node.payload as SvgPayload;
  const {
    svgString,
    renderMode = 'svg',
    highlights = [],
    tapZones = [],
    caption,
  } = payload;

  // ── State
  const [activeTapZone, setActiveTapZone] = useState<SvgTapZone | null>(null);
  const [liveHighlights, setLiveHighlights] = useState<SvgHighlight[]>(highlights);
  const isDoneRef = useRef(false);

  // ── Reanimated
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(14);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  // ── Mount fade in
  useEffect(() => {
    opacity.value    = withTiming(1, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: FADE_IN_MS, easing: Easing.out(Easing.cubic) });
  }, []);

  // ── Listen for backend highlight updates via WS
  useEffect(() => {
    const unsub = wsService.onMessage((msg) => {
      if (msg.event !== 'node_update') return;
      const p = msg.payload as {
        nodeId: string;
        patch: { payload?: { highlights?: SvgHighlight[] } };
      };
      if (p.nodeId !== node.id) return;
      const newHighlights = p.patch?.payload?.highlights;
      if (newHighlights) setLiveHighlights(newHighlights);
    });
    return unsub;
  }, [node.id]);

  // ── Handle tap postMessage from WebView
  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'tap') {
        const zone = tapZones.find(z => z.elementId === msg.elementId);
        if (zone) setActiveTapZone(zone);
      }
    } catch (e) {
      console.warn('[SVGNode] WebView message parse error', e);
    }
  }, [tapZones]);

  // ── Fade out → onDone
  const handleDone = useCallback(() => {
    if (isDoneRef.current) return;
    isDoneRef.current = true;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
      if (finished) runOnJS(onDone ?? (() => {}))();
    });
  }, [onDone]);

  // ── Processed SVG (with highlights injected)
  const processedSvg = injectHighlights(svgString, liveHighlights);

  // ── WebView HTML
  const webViewHtml = buildWebViewHtml(svgString, liveHighlights, tapZones);

  const hasHighlights = liveHighlights.filter(h => h.label).length > 0;

  return (
    <Animated.View style={[S.animatedWrapper, cardAnimStyle]}>
      <View style={S.card}>

        {/* Accent strip */}
        <View style={S.accentStrip} />

        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.modeBadge}>
            <Text style={S.modeBadgeText}>
              {renderMode === 'webview' ? '⚡ ANIMATED SVG' : '◈ SVG DIAGRAM'}
            </Text>
          </View>
          {tapZones.length > 0 && (
            <Text style={S.tapHint}>Tap elements to explore</Text>
          )}
        </View>

        {/* SVG Render Area */}
        <View style={S.svgContainer}>
          {renderMode === 'webview' ? (
            <WebView
              style={S.webView}
              source={{ html: webViewHtml }}
              onMessage={handleWebViewMessage}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
              backgroundColor={Colors.surface}
            />
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              style={S.svgWrapper}
              // For native mode: tap on whole SVG area, no element-level routing
              // For element-level taps use WebView mode
            >
              <SvgXml
                xml={processedSvg}
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid meet"
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Highlight legend */}
        {hasHighlights && (
          <ScrollView
            horizontal
            style={S.legendScroll}
            contentContainerStyle={S.legendContent}
            showsHorizontalScrollIndicator={false}
          >
            {liveHighlights.filter(h => h.label).map((h) => (
              <LegendItem key={h.elementId} highlight={h} />
            ))}
          </ScrollView>
        )}

        {/* Caption */}
        {caption ? (
          <Text style={S.caption}>{caption}</Text>
        ) : null}

        {/* Footer */}
        <View style={S.footer}>
          <TouchableOpacity onPress={handleDone} style={S.nextBtn}>
            <Text style={S.nextBtnText}>Continue  →</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Tap Tooltip Modal */}
      <TooltipModal
        zone={activeTapZone}
        onClose={() => setActiveTapZone(null)}
      />
    </Animated.View>
  );
}
