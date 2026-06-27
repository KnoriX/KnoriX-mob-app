import { Animated, Dimensions } from 'react-native';
import { LayoutMode, LAYOUT_MODES } from '../constants/nodeTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Layout helpers ───────────────────────────────────────────────────────

export interface NodeDimensions {
  width: number | `${number}%`;
  alignSelf: 'center' | 'flex-start' | 'flex-end' | 'stretch';
  marginHorizontal: number;
  marginVertical: number;
  borderRadius: number;
}

/**
 * Convert AI-assigned layout mode → RN style dimensions.
 */
export function getNodeDimensions(layout: LayoutMode = LAYOUT_MODES.FULL): NodeDimensions {
  switch (layout) {
    case LAYOUT_MODES.HALF:
      return {
        width: SCREEN_WIDTH * 0.47,
        alignSelf: 'center',
        marginHorizontal: 4,
        marginVertical: 8,
        borderRadius: 12,
      };
    case LAYOUT_MODES.CARD:
      return {
        width: SCREEN_WIDTH - 32,
        alignSelf: 'center',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
      };
    case LAYOUT_MODES.OVERLAY:
      return {
        width: SCREEN_WIDTH - 32,
        alignSelf: 'center',
        marginHorizontal: 16,
        marginVertical: 0,
        borderRadius: 16,
      };
    case LAYOUT_MODES.FULL:
    default:
      return {
        width: SCREEN_WIDTH,
        alignSelf: 'stretch',
        marginHorizontal: 0,
        marginVertical: 0,
        borderRadius: 0,
      };
  }
}

// ─── Fade animation helpers ───────────────────────────────────────────────

/**
 * Create a fade-in animated value and trigger it.
 * Returns the Animated.Value so you can pass it to style.opacity.
 */
export function createFadeIn(
  durationMs = 350,
  delayMs = 0,
): { opacity: Animated.Value; start: () => void } {
  const opacity = new Animated.Value(0);

  const start = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: durationMs,
      delay: delayMs,
      useNativeDriver: true,
    }).start();
  };

  return { opacity, start };
}

/**
 * Fade out an existing Animated.Value, then call onComplete.
 */
export function fadeOut(
  opacity: Animated.Value,
  durationMs = 250,
  onComplete?: () => void,
): void {
  Animated.timing(opacity, {
    toValue: 0,
    duration: durationMs,
    useNativeDriver: true,
  }).start(({ finished }) => {
    if (finished) onComplete?.();
  });
}

// ─── Grouping helpers ─────────────────────────────────────────────────────

/**
 * Group consecutive HALF-layout nodes into pairs so they render side-by-side.
 * All other nodes render as single-item rows.
 */
export type NodeGroup =
  | { kind: 'single'; nodeId: string }
  | { kind: 'pair'; nodeIds: [string, string] };

export function groupNodeIds(
  orderedIds: string[],
  layoutMap: Record<string, LayoutMode>,
): NodeGroup[] {
  const groups: NodeGroup[] = [];
  let i = 0;

  while (i < orderedIds.length) {
    const id = orderedIds[i];
    const layout = layoutMap[id] ?? LAYOUT_MODES.FULL;

    if (
      layout === LAYOUT_MODES.HALF &&
      i + 1 < orderedIds.length &&
      (layoutMap[orderedIds[i + 1]] ?? LAYOUT_MODES.FULL) === LAYOUT_MODES.HALF
    ) {
      groups.push({ kind: 'pair', nodeIds: [id, orderedIds[i + 1]] });
      i += 2;
    } else {
      groups.push({ kind: 'single', nodeId: id });
      i += 1;
    }
  }

  return groups;
}
