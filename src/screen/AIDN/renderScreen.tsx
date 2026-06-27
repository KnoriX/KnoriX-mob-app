import React, { Suspense, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Animated,
  Text,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';

import { useRenderer } from './hooks/useRenderer';
import { resolveNode } from './registry/nodeRegistry';
import { getNodeDimensions, createFadeIn, groupNodeIds, NodeGroup } from './utils/rendererHelpers';
import { LAYOUT_MODES } from './constants/nodeTypes';
import { RendererNode } from './types/node.types';
import { renderStyles, WS_BADGE_COLORS } from './styles/renderStyle';

// ─── Props ────────────────────────────────────────────────────────────────

interface RenderScreenProps {
  wsUrl: string;
  lessonId: string;
  studentId: string;
  authToken: string;
}

// ─── Single animated node wrapper ─────────────────────────────────────────

interface NodeCellProps {
  node: RendererNode;
  onDone: () => void;
}

const NodeCell = React.memo(({ node, onDone }: NodeCellProps) => {
  const { opacity, start } = createFadeIn(350);
  const hasStarted = useRef(false);

  if (!hasStarted.current) {
    hasStarted.current = true;
    start();
  }

  const Component = resolveNode(node.type);
  const dims = getNodeDimensions(node.layout);

  if (!Component) {
    return (
      <View style={renderStyles.fallbackContainer}>
        <Text style={renderStyles.fallbackText}>
          ⚠ Unknown node type: {node.type}
        </Text>
      </View>
    );
  }

  const isOverlay = node.layout === LAYOUT_MODES.OVERLAY;

  return (
    <Animated.View
      style={[
        renderStyles.nodeWrapper,
        isOverlay ? renderStyles.overlayWrapper : null,
        {
          width: dims.width,
          alignSelf: dims.alignSelf,
          marginHorizontal: dims.marginHorizontal,
          marginVertical: dims.marginVertical,
          borderRadius: dims.borderRadius,
          opacity,
        },
      ]}
    >
      <Suspense fallback={<ActivityIndicator color="#6C63FF" style={{ padding: 24 }} />}>
        <Component node={node} onDone={onDone} />
      </Suspense>
    </Animated.View>
  );
});

NodeCell.displayName = 'NodeCell';

// ─── WS status badge ──────────────────────────────────────────────────────

interface WSBadgeProps {
  state: string;
}

const WSBadge = ({ state }: WSBadgeProps) => {
  const colors = WS_BADGE_COLORS[state] ?? WS_BADGE_COLORS.disconnected;
  const label = {
    connected: '● LIVE',
    connecting: '◌ CONNECTING',
    disconnected: '○ OFFLINE',
    error: '✕ ERROR',
  }[state] ?? state.toUpperCase();

  return (
    <View style={[renderStyles.wsBadge, { backgroundColor: colors.bg }]}>
      <Text style={[renderStyles.wsBadgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

// ─── Main Canvas ──────────────────────────────────────────────────────────

export default function RenderScreen({
  wsUrl,
  lessonId,
  studentId,
  authToken,
}: RenderScreenProps) {
  const {
    nodeList,
    nodes,
    orderedIds,
    connectionState,
    isLoading,
    error,
    ackNode,
    setNodeStatus,
  } = useRenderer({ wsUrl, lessonId, studentId, authToken });

  // Build layout → id map for grouping
  const layoutMap = Object.fromEntries(
    orderedIds.map(id => [id, nodes[id]?.layout ?? LAYOUT_MODES.FULL]),
  );
  const groups: NodeGroup[] = groupNodeIds(orderedIds, layoutMap);

  const handleNodeDone = useCallback((nodeId: string, durationMs: number) => {
    setNodeStatus(nodeId, 'done');
    ackNode({ nodeId, timeSpent: Math.round(durationMs / 1000) });
  }, [ackNode, setNodeStatus]);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={renderStyles.canvas}>
        <View style={renderStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={renderStyles.loadingText}>Loading lesson...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={renderStyles.canvas}>
        <View style={renderStyles.errorContainer}>
          <Text style={renderStyles.errorTitle}>Failed to load</Text>
          <Text style={renderStyles.errorMessage}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main canvas ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={renderStyles.canvas}>
      <WSBadge state={connectionState} />

      <ScrollView
        style={renderStyles.canvas}
        contentContainerStyle={renderStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group) => {
          if (group.kind === 'pair') {
            // Side-by-side HALF layout nodes
            const [idA, idB] = group.nodeIds;
            const nodeA = nodes[idA];
            const nodeB = nodes[idB];
            if (!nodeA || !nodeB) return null;

            return (
              <View key={`pair-${idA}-${idB}`} style={renderStyles.row}>
                <NodeCell
                  node={nodeA}
                  onDone={() => handleNodeDone(idA, 0)}
                />
                <NodeCell
                  node={nodeB}
                  onDone={() => handleNodeDone(idB, 0)}
                />
              </View>
            );
          }

          // Single node (full / card / overlay)
          const node = nodes[group.nodeId];
          if (!node) return null;

          return (
            <NodeCell
              key={node.id}
              node={node}
              onDone={() => handleNodeDone(node.id, (node.meta?.duration ?? 0) * 1000)}
            />
          );
        })}

        {nodeList.length === 0 && (
          <View style={renderStyles.loadingContainer}>
            <Text style={renderStyles.loadingText}>Waiting for content...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
