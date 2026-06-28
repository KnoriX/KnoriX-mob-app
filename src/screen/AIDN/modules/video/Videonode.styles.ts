import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography, ASPECT_16_9 } from '../../styles/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CARD_WIDTH  = SCREEN_WIDTH - Spacing.lg * 2;
export const CARD_HEIGHT = CARD_WIDTH * ASPECT_16_9;
export const VIDEO_HEIGHT = CARD_HEIGHT - 3 - 52; // minus accent strip + footer

export const videoStyles = StyleSheet.create({

  // ── Outer animated wrapper
  animatedWrapper: {
    marginHorizontal: Spacing.lg,
    marginVertical:   Spacing.sm,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 6 },
    shadowOpacity:    0.3,
    shadowRadius:     20,
    elevation:        8,
  },

  // ── Card
  card: {
    width:           CARD_WIDTH,
    backgroundColor: Colors.canvas,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
  },

  // ── Accent strip
  accentStrip: {
    height:          3,
    backgroundColor: Colors.accent,
    width:           '100%',
    shadowColor:     Colors.accent,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.6,
    shadowRadius:    8,
  },

  // ── Video container
  videoContainer: {
    width:           CARD_WIDTH,
    height:          VIDEO_HEIGHT,
    backgroundColor: '#000',
    overflow:        'hidden',
    position:        'relative',
  },

  video: {
    width:  '100%',
    height: '100%',
  },

  // ── Controls overlay (sits on top of video)
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
  },

  // ── Top bar
  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  chapterLabel: {
    ...Typography.caption,
    color:       Colors.textPrimary,
    fontWeight:  '600',
    flex:        1,
    letterSpacing: 0.3,
  },
  topBtns: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  topBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   4,
    borderRadius:      Radius.sm,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.3)',
    backgroundColor:   'rgba(0,0,0,0.4)',
  },
  topBtnActive: {
    borderColor:     Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  topBtnText: {
    ...Typography.caption,
    color:      Colors.textPrimary,
    fontWeight: '700',
  },

  // ── Center play/pause
  playPauseBtn: {
    alignSelf:      'center',
    width:          56,
    height:         56,
    borderRadius:   28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth:    1.5,
    borderColor:    'rgba(255,255,255,0.25)',
    alignItems:     'center',
    justifyContent: 'center',
  },
  playPauseIcon: {
    fontSize:   22,
    color:      Colors.textPrimary,
    lineHeight: 28,
  },

  // ── Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  timeText: {
    ...Typography.caption,
    color:      Colors.textPrimary,
    fontFamily: 'monospace',
    minWidth:   36,
    textAlign:  'center',
  },

  // ── Progress bar
  progressTouchArea: {
    flex:            1,
    paddingVertical: 8,
    justifyContent:  'center',
  },
  progressTrack: {
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius:    Radius.pill,
    overflow:        'visible',
    position:        'relative',
  },
  progressBuffered: {
    position:        'absolute',
    top:             0,
    left:            0,
    height:          '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius:    Radius.pill,
  },
  progressPlayed: {
    position:        'absolute',
    top:             0,
    left:            0,
    height:          '100%',
    backgroundColor: Colors.accent,
    borderRadius:    Radius.pill,
  },
  progressThumb: {
    position:        'absolute',
    top:             -5,
    width:           13,
    height:          13,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.accent,
    marginLeft:      -6,
    shadowColor:     Colors.accent,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.8,
    shadowRadius:    4,
    elevation:       4,
  },
  chapterMarker: {
    position:        'absolute',
    top:             -3,
    width:           2,
    height:          9,
    backgroundColor: Colors.warning,
    borderRadius:    1,
  },

  // ── Speed selector
  speedRow: {
    flexDirection:     'row',
    justifyContent:    'flex-end',
    gap:               Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingBottom:     Spacing.xs,
  },
  speedBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.2)',
  },
  speedBtnActive: {
    backgroundColor: Colors.accent,
    borderColor:     Colors.accent,
  },
  speedBtnText: {
    ...Typography.caption,
    color:      Colors.textMuted,
    fontWeight: '600',
  },
  speedBtnTextActive: {
    color: '#fff',
  },

  // ── Caption
  caption: {
    ...Typography.caption,
    color:             Colors.textMuted,
    textAlign:         'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    fontStyle:         'italic',
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
  },

  // ── Footer
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderTopWidth:    1,
    borderTopColor:    Colors.border,
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

  // ── Chapter modal
  chapterBackdrop: {
    flex:            1,
    backgroundColor: '#000000AA',
    justifyContent:  'flex-end',
  },
  chapterSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingBottom:   32,
    maxHeight:       '60%',
  },
  chapterHandle: {
    width:           40,
    height:          4,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.border,
    alignSelf:       'center',
    marginTop:       Spacing.sm,
    marginBottom:    Spacing.md,
  },
  chapterTitle: {
    ...Typography.h5,
    color:             Colors.textPrimary,
    paddingHorizontal: Spacing.lg,
    marginBottom:      Spacing.sm,
  },
  chapterItem: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    gap:               Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chapterItemActive: {
    backgroundColor: Colors.accentSoft,
  },
  chapterDot: {
    width:           8,
    height:          8,
    borderRadius:    Radius.pill,
    backgroundColor: Colors.border,
  },
  chapterDotActive: {
    backgroundColor: Colors.accent,
  },
  chapterName: {
    ...Typography.body,
    color: Colors.textBody,
  },
  chapterNameActive: {
    color:      Colors.accent,
    fontWeight: '600',
  },
  chapterTime: {
    ...Typography.caption,
    color:      Colors.textMuted,
    fontFamily: 'monospace',
    marginTop:  2,
  },
});
