import { StyleSheet, Dimensions } from 'react-native';
import { Colors, Spacing, Radius, Typography, ASPECT_16_9 } from '../../styles/token';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CARD_WIDTH  = SCREEN_WIDTH - Spacing.lg * 2;
export const CARD_HEIGHT = CARD_WIDTH * ASPECT_16_9;

// Option visual states
export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missed';

export const mcqStyles = StyleSheet.create({

  // ── Outer animated wrapper
  animatedWrapper: {
    marginHorizontal: Spacing.lg,
    marginVertical:   Spacing.sm,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    shadowColor:      Colors.accent,
    shadowOffset:     { width: 0, height: 4 },
    shadowOpacity:    0.1,
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
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xs,
  },

  modeBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   3,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    borderColor:       Colors.accent + '44',
  },
  modeBadgeText: {
    ...Typography.caption,
    color:       Colors.accent,
    letterSpacing: 1,
  },

  // ── Timer
  timerBox: {
    alignItems: 'flex-end',
    gap:        4,
  },
  timerText: {
    ...Typography.caption,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  timerTrack: {
    width:           80,
    height:          3,
    backgroundColor: Colors.border,
    borderRadius:    Radius.pill,
    overflow:        'hidden',
  },
  timerFill: {
    height:       '100%',
    borderRadius: Radius.pill,
  },

  // ── Scroll area
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop:        Spacing.sm,
    paddingBottom:     Spacing.xl,
  },

  // ── Question
  question: {
    ...Typography.h4,
    color:        Colors.textPrimary,
    marginBottom: Spacing.lg,
    lineHeight:   26,
  },

  // ── Hint box
  hintBox: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    backgroundColor:   '#1E1A2E',
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.accent + '33',
    padding:           Spacing.md,
    marginBottom:      Spacing.md,
    gap:               Spacing.sm,
  },
  hintIcon: {
    fontSize: 16,
  },
  hintText: {
    ...Typography.bodySmall,
    color: Colors.textBody,
    flex:  1,
  },

  // ── Options list
  optionsList: {
    gap: Spacing.sm,
  },

  // ── Option row — base
  optionRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingVertical: Spacing.md,
    paddingRight:    Spacing.md,
    gap:             Spacing.md,
    minHeight:       52,
  },

  // Option states
  optionSelected: {
    borderColor:     Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  optionCorrect: {
    borderColor:     Colors.success,
    backgroundColor: '#1A3A2A',
  },
  optionIncorrect: {
    borderColor:     Colors.error,
    backgroundColor: '#2A1A1A',
  },
  optionMissed: {
    borderColor:     Colors.warning,
    backgroundColor: '#2A2A1A',
  },

  // ── Option label bubble
  optionLabel: {
    width:           36,
    height:          36,
    borderRadius:    Radius.sm,
    backgroundColor: Colors.border,
    alignItems:      'center',
    justifyContent:  'center',
    marginLeft:      Spacing.sm,
    flexShrink:      0,
  },
  optionLabelSelected: {
    backgroundColor: Colors.accent,
  },
  optionLabelCorrect: {
    backgroundColor: Colors.success + '33',
  },
  optionLabelIncorrect: {
    backgroundColor: Colors.error + '33',
  },

  optionLabelText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color:      Colors.textMuted,
  },

  // Checkbox (multiple mode)
  checkbox: {
    width:        18,
    height:       18,
    borderRadius: 4,
    borderWidth:  2,
    borderColor:  Colors.textMuted,
    alignItems:   'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor:     Colors.accent,
    backgroundColor: Colors.accent,
  },
  checkmark: {
    color:      '#fff',
    fontSize:   11,
    fontWeight: '700',
    lineHeight: 14,
  },

  // ── Option text
  optionText: {
    ...Typography.body,
    color: Colors.textBody,
    flex:  1,
  },

  // ── Result icon (right side)
  resultIcon: {
    fontSize:   16,
    fontWeight: '700',
    color:      Colors.success,
    marginLeft: 'auto',
  },

  // ── Explanation box
  explanationBox: {
    marginTop:    Spacing.lg,
    borderRadius: Radius.md,
    borderWidth:  1,
    borderColor:  Colors.border,
    overflow:     'hidden',
  },

  resultBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
  },
  resultBannerText: {
    ...Typography.h5,
    fontWeight: '700',
  },

  explanationLabel: {
    ...Typography.caption,
    color:             Colors.textMuted,
    letterSpacing:     1,
    paddingHorizontal: Spacing.lg,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xs,
  },
  explanationText: {
    ...Typography.body,
    color:             Colors.textBody,
    paddingHorizontal: Spacing.lg,
    paddingBottom:     Spacing.lg,
    lineHeight:        24,
  },

  // ── Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop:     Spacing.sm,
    paddingBottom:  Spacing.md,
    gap:            Spacing.sm,
  },

  // ── Confidence row
  confidenceRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.lg,
    gap:               Spacing.sm,
    flexWrap:          'wrap',
  },
  confidenceLabel: {
    ...Typography.caption,
    color:        Colors.textMuted,
    letterSpacing: 0.5,
  },

  confBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   5,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  confBtnSure: {
    backgroundColor: Colors.success + '22',
    borderColor:     Colors.success,
  },
  confBtnUnsure: {
    backgroundColor: Colors.warning + '22',
    borderColor:     Colors.warning,
  },
  confBtnText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  confBtnTextActive: {
    color: Colors.textPrimary,
  },

  // ── Hint button
  hintBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   5,
    borderRadius:      Radius.pill,
    borderWidth:       1,
    borderColor:       Colors.accent + '66',
    marginLeft:        'auto',
  },
  hintBtnDisabled: {
    borderColor: Colors.border,
    opacity:     0.5,
  },
  hintBtnText: {
    ...Typography.caption,
    color: Colors.accent,
  },

  // ── Action row
  actionRow: {
    paddingHorizontal: Spacing.lg,
  },

  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  submitBtnDisabled: {
    backgroundColor: Colors.surfaceRaised,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  submitBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color:      '#fff',
  },
  submitBtnTextDisabled: {
    color: Colors.textMuted,
  },

  nextBtn: {
    backgroundColor: Colors.success + '22',
    borderWidth:     1,
    borderColor:     Colors.success,
    borderRadius:    Radius.md,
    paddingVertical: Spacing.md,
    alignItems:      'center',
  },
  nextBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color:      Colors.success,
  },
});
