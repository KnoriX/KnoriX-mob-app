/**
 * KnoriX — RenderScreen
 * src/screen/AIDN/RenderScreen.tsx
 *
 * Dynamic AIDN canvas.
 * Fetches lesson plan from REST → renders nodes via registry (lazy-loaded).
 * WebSocket receives node_push / node_update / node_remove events live.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { useNodeQueue } from './hooks/useNodeQueue';
import { wsService } from './services/websocketService';
import { fetchLessonPlan } from './services/lessonService';
import { resolveNode, validatePayload } from './registry/nodeRegistry';
import { SOCKET_EVENTS } from './constants/socketEvents';

// ─── Route params (adjust to your actual navigation types) ───────────────────
type LearnRouteParams = {
  lessonId: string;
  studentId: string;
  authToken: string;
  wsUrl: string;
};

export default function RenderScreen() {
  const route = useRoute();
  const { lessonId, studentId, authToken, wsUrl } =
    (route.params as LearnRouteParams) ?? {};

  const {
    nodeList,
    initFromRaw,
    addNode,
    updateNode,
    removeNode,
    setNodeStatus,
    reset,
  } = useNodeQueue();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [lessonDone, setLessonDone]     = useState(false);
  const hasJoinedRef = useRef(false);

  const currentNode = nodeList[currentIndex];
  const progress = nodeList.length > 0 ? currentIndex / nodeList.length : 0;

  // ── 1. Fetch lesson plan on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!lessonId || !studentId || !authToken) {
        setLoadError('Missing lessonId/studentId/authToken in route params.');
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const plan = await fetchLessonPlan({ lessonId, studentId, authToken });
        if (cancelled) return;
        initFromRaw(plan.nodes as unknown[]);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? 'Failed to load lesson.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lessonId, studentId, authToken, initFromRaw]);

  // ── 2. Connect WebSocket once lesson loaded ────────────────────────────
  useEffect(() => {
    if (!wsUrl || isLoading || loadError) return;

    wsService.connect(wsUrl);

    const unsubMsg = wsService.onMessage((msg) => {
      switch (msg.event) {
        case SOCKET_EVENTS.NODE_PUSH:
          if (validatePayload(msg.payload?.type, msg.payload?.payload)) {
            addNode(msg.payload as Record<string, unknown>);
          } else {
            console.warn('[RenderScreen] Dropped invalid node_push payload');
          }
          break;

        case SOCKET_EVENTS.NODE_UPDATE:
          if (msg.payload?.id) {
            updateNode(msg.payload.id as string, msg.payload as any);
          }
          break;

        case SOCKET_EVENTS.NODE_REMOVE:
          if (msg.payload?.id) {
            removeNode(msg.payload.id as string);
          }
          break;

        case SOCKET_EVENTS.SESSION_END:
          setLessonDone(true);
          break;

        case SOCKET_EVENTS.ERROR:
          console.warn('[RenderScreen] Server error event:', msg.payload);
          break;

        default:
          console.log('[RenderScreen] Unhandled WS event:', msg.event);
      }
    });

    if (!hasJoinedRef.current && lessonId && studentId) {
      wsService.joinLesson({ lessonId, studentId } as any);
      hasJoinedRef.current = true;
    }

    return () => {
      unsubMsg();
      wsService.leaveLesson();
      wsService.disconnect();
    };
  }, [wsUrl, isLoading, loadError, lessonId, studentId, addNode, updateNode, removeNode]);

  // ── 3. Move to next node ────────────────────────────────────────────────
  const handleNodeDone = useCallback(() => {
    if (!currentNode) return;
    setNodeStatus(currentNode.id, 'done');

    if (currentIndex >= nodeList.length - 1) {
      setLessonDone(true);
      return;
    }
    setCurrentIndex(prev => prev + 1);
  }, [currentNode, currentIndex, nodeList.length, setNodeStatus]);

  // ── 4. Restart ───────────────────────────────────────────────────────────
  const restart = () => {
    reset();
    setCurrentIndex(0);
    setLessonDone(false);
    hasJoinedRef.current = false;
  };

  // ─── Error screen ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneScreen}>
          <Text style={styles.doneEmoji}>⚠️</Text>
          <Text style={styles.doneTitle}>Lesson load nahi ho paya</Text>
          <Text style={styles.doneSub}>{loadError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Lesson Complete ────────────────────────────────────────────────────
  if (lessonDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneScreen}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Lesson Complete!</Text>
          <Text style={styles.doneSub}>
            Tumne {nodeList.length} nodes complete kiye.{'\n'}
            Knowledge Graph update ho raha hai...
          </Text>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartText}>↺  Restart Lesson</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading || !currentNode) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#7C6FFF" />
          <Text style={styles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Canvas ────────────────────────────────────────────────────────
  const NodeComponent = resolveNode(currentNode.type);
  const payloadIsValid = validatePayload(currentNode.type, currentNode.payload);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {(currentNode as any).meta?.title ?? 'KnoriX'}
        </Text>
        <Text style={styles.headerCounter}>
          {currentIndex + 1} / {nodeList.length}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {payloadIsValid ? (
          <Suspense fallback={<ActivityIndicator size="small" color="#7C6FFF" />}>
            <NodeComponent
              key={currentNode.id}
              node={currentNode}
              onDone={handleNodeDone}
            />
          </Suspense>
        ) : (
          <View style={styles.errorNode}>
            <Text style={styles.errorNodeText}>
              ⚠️ Ye node load nahi ho saka (invalid payload).
            </Text>
            <TouchableOpacity onPress={handleNodeDone}>
              <Text style={styles.restartText}>Skip →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={styles.devBadge}>
        <Text style={styles.devBadgeText}>
          {currentNode.type.toUpperCase()}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2E',
  },
  headerTitle: { color: '#E8E8F0', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  headerCounter: { color: '#6B6B8A', fontSize: 13 },
  progressTrack: { height: 2, backgroundColor: '#1E1E2E' },
  progressFill: { height: 2, backgroundColor: '#7C6FFF' },
  canvas: { flex: 1 },
  canvasContent: { paddingVertical: 20, paddingHorizontal: 4 },
  doneScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { color: '#E8E8F0', fontSize: 28, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  doneSub: { color: '#6B6B8A', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  restartBtn: { backgroundColor: '#7C6FFF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  restartText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#6B6B8A', fontSize: 14 },
  devBadge: {
    position: 'absolute', bottom: 72, right: 12,
    backgroundColor: '#1E1E2E', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#2E2E4E',
  },
  devBadgeText: { color: '#4A4A6A', fontSize: 9, letterSpacing: 1 },
  errorNode: { padding: 20, alignItems: 'center', gap: 12 },
  errorNodeText: { color: '#D97706', fontSize: 14, textAlign: 'center' },
});
