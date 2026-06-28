import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography, ASPECT_16_9 } from '../../styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CARD_WIDTH  = SCREEN_WIDTH - Spacing.lg * 2;
export const CARD_HEIGHT = CARD_WIDTH * ASPECT_16_9;

// SVG render area = card height minus chrome (header + legend + footer)
const CHROME_HEIGHT = 44 + 36 + 52; // header + legend + footer
export const SVG_HEIGHT = CARD_HEIGHT - CHROME_HEIGHT;

export const svgStyles = StyleSheet.create({

  // ── Outer animated wrapper
  animatedWrapper: {
    marginHorizontal: Spacing.lg,
    marginVertical:   Spacing.sm,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    shadowColor:      Colors.accent,
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.08,
    shadowRadius:     16,
    elevation:        6,
  },

  // ── Card surface
  card: {
    width:           CARD_WIDTH,
    minHeight:       CARD_HEIGHT,
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
  },

  // ── Top accent strip
  accentStrip: {
    height:          3,
    backgroundColor: Colors.accent,
    width:           '100%',
    shadowColor:     Colors.accent,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.6,
    shadowRadius:    8,
  },

  // ── Header row
  headerRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    height:            44,
  },

  modeBadge: {
    backgroundColor:  Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    borderColor:       Colors.accent + '44',
  },
  modeBadgeText: {
    ...Typography.caption,
    color:         Colors.accent,
    letterSpacing: 0.8,
  },

  tapHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  // ── SVG render area
  svgContainer: {
    width:           CARD_WIDTH,
    height:          SVG_HEIGHT,
    backgroundColor: Colors.canvas,
    overflow:        'hidden',
  },

  svgWrapper: {
    flex: 1,
    alignItems:     'center',
    justifyContent: 'center',
  },

  webView: {
    flex:            1,
    backgroundColor: Colors.surface,
  },

  // ── Highlight legend (horizontal scroll)
  legendScroll: {
    maxHeight:       36,
    borderTopWidth:  1,
    borderTopColor:  Colors.border,
  },
  legendContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xs,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  legendDot: {
    width:        8,
    height:       8,
    borderRadius: Radius.pill,
  },
  legendText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },

  // ── Caption
  caption: {
    ...Typography.caption,
    color:             Colors.textMuted,
    textAlign:         'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xs,
    fontStyle:         'italic',
  },

  // ── Footer
  footer: {
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
  },

  nextBtn: {
    backgroundColor: Colors.accentSoft,
    borderWidth:     1,
    borderColor:     Colors.accent + '66',
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  nextBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color:      Colors.accent,
  },

  // ── Tooltip modal
  modalBackdrop: {
    flex:            1,
    backgroundColor: '#00000088',
    justifyContent:  'center',
    alignItems:      'center',
    paddingHorizontal: Spacing.xl,
  },

  tooltipCard: {
    width:           '100%',
    backgroundColor: Colors.surface,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 8 },
    shadowOpacity:   0.4,
    shadowRadius:    24,
    elevation:       12,
  },

  tooltipAccent: {
    height:          3,
    backgroundColor: Colors.accent,
    width:           '100%',
  },

  tooltipBody: {
    padding: Spacing.lg,
    gap:     Spacing.sm,
  },

  tooltipBadge: {
    alignSelf:         'flex-start',
    backgroundColor:   Colors.surfaceRaised,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    borderRadius:      Radius.sm,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  tooltipBadgeText: {
    ...Typography.caption,
    color:      Colors.textMuted,
    fontFamily: 'monospace',
  },

  tooltipTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },

  tooltipDetail: {
    ...Typography.body,
    color:      Colors.textBody,
    lineHeight: 22,
  },

  tooltipCloseBtn: {
    marginTop:       Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  tooltipCloseBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color:      '#fff',
  },
});
