/**
 * KnoriX — Navigation Hook
 * src/Navigation/useNavigation.ts
 *
 * Thin wrapper around React Navigation's useNavigation
 * with KnoriX route types pre-typed.
 */

import { useNavigation as useRNNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// ─── Route param types ────────────────────────────────────────────────────────

export type RootTabParamList = {
  Home:    undefined;
  Learn:   { lessonId?: string; topicId?: string } | undefined;
  Profile: undefined;
};

// ─── Typed hook ───────────────────────────────────────────────────────────────

export type RootTabNavigation = BottomTabNavigationProp<RootTabParamList>;

export function useNavigation() {
  return useRNNavigation<RootTabNavigation>();
}

// ─── Helper: navigate to lesson ──────────────────────────────────────────────

export function useGoToLesson() {
  const nav = useNavigation();
  return (lessonId: string, topicId?: string) => {
    nav.navigate('Learn', { lessonId, topicId });
  };
}

