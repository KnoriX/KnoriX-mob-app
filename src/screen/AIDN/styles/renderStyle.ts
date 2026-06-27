import { StyleSheet } from 'react-native';

export const renderStyles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  nodeWrapper: {
    overflow: 'hidden',
  },
  overlayWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  fallbackContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B33',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F13',
    gap: 16,
  },
  loadingText: {
    color: '#8B8FA8',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F13',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  errorMessage: {
    color: '#8B8FA8',
    fontSize: 13,
    textAlign: 'center',
  },
  wsBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 100,
  },
  wsBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export const WS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  connected:    { bg: '#1A3A2A', text: '#4ADE80' },
  connecting:   { bg: '#2A2A1A', text: '#FACC15' },
  disconnected: { bg: '#2A1A1A', text: '#FF6B6B' },
  error:        { bg: '#2A1A1A', text: '#FF6B6B' },
};
