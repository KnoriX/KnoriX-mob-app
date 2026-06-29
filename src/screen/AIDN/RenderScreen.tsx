/**
 * KnoriX — RenderScreen
 * src/screens/AIDN/RenderScreen.tsx
 *
 * The main AIDN canvas.
 * Loads a lesson JSON → plays nodes in sequence via timeline.
 * WebSocket receives inject_node / pause / resume events.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Node components ──────────────────────────────────────────────────────────
import MarkdownNode  from './modules/markdown/MarkdownNode';
import MCQNode       from './modules/MCQ/MCQNode';
import SVGNode       from './modules/svg/SvgNode';
import KaTeXNode     from './modules/KaTex/KaTexNode';
import MermaidNode   from './modules/Mermaid/MermaidNode';
import SkiaNode      from './modules/Skia/SkiaNode';
import VideoNode     from './modules/video/VideoNode';

// ─── Types ────────────────────────────────────────────────────────────────────
import type { AIDNNode } from './types/node.types';

// ─── Demo lesson JSON (replace with API call later) ───────────────────────────
const DEMO_LESSON: AIDNNode[] = [
  {
    id: 'n1',
    node_type: 'markdown',
    meta: { title: 'Python Inheritance' },
    payload: {
      content: `# Python Inheritance\n\nInheritance ek concept hai jisme ek class **doosri class ki properties** le sakti hai.\n\n## Example\n\n\`\`\`python\nclass Animal:\n    def speak(self):\n        print("...")\n\nclass Dog(Animal):\n    def speak(self):\n        print("Woof!")\n\`\`\`\n\n> Dog class Animal se inherit karti hai. Isliye Dog ke paas Animal ke saare methods hain.`,
    },
  },
  {
    id: 'n2',
    node_type: 'svg',
    meta: { title: 'Class Hierarchy' },
    payload: {
      renderMode: 'svg',
      svgString: `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" style="background:#0A0A0F">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7C6FFF"/>
          </marker>
        </defs>
        <rect x="140" y="20" width="120" height="50" rx="10" fill="#1E1E2E" stroke="#7C6FFF" stroke-width="2"/>
        <text x="200" y="42" text-anchor="middle" fill="#E8E8F0" font-size="13" font-weight="bold">Animal</text>
        <text x="200" y="60" text-anchor="middle" fill="#7C6FFF" font-size="11">speak()</text>
        <line x1="140" y1="95" x2="80" y2="145" stroke="#7C6FFF" stroke-width="1.5" marker-end="url(#arrow)"/>
        <line x1="260" y1="95" x2="320" y2="145" stroke="#7C6FFF" stroke-width="1.5" marker-end="url(#arrow)"/>
        <rect x="20" y="145" width="120" height="50" rx="10" fill="#1E1E2E" stroke="#059669" stroke-width="2"/>
        <text x="80" y="167" text-anchor="middle" fill="#E8E8F0" font-size="13" font-weight="bold">Dog</text>
        <text x="80" y="185" text-anchor="middle" fill="#059669" font-size="11">speak() → Woof</text>
        <rect x="260" y="145" width="120" height="50" rx="10" fill="#1E1E2E" stroke="#D97706" stroke-width="2"/>
        <text x="320" y="167" text-anchor="middle" fill="#E8E8F0" font-size="13" font-weight="bold">Cat</text>
        <text x="320" y="185" text-anchor="middle" fill="#D97706" font-size="11">speak() → Meow</text>
      </svg>`,
      caption: 'Dog aur Cat dono Animal se inherit karte hain',
      highlights: [],
      tapZones: [],
    },
  },
  {
    id: 'n3',
    node_type: 'mcq',
    meta: { title: 'Quick Check' },
    payload: {
      mode: 'single',
      question: 'Agar Dog class Animal se inherit karti hai, toh kya Dog ke paas speak() method hoga?',
      options: [
        { id: 'a', text: 'Haan, automatically inherit hoga' },
        { id: 'b', text: 'Nahi, manually define karna padega' },
        { id: 'c', text: 'Sirf tabhi agar Dog khud define kare' },
        { id: 'd', text: 'Inheritance se methods nahi milte' },
      ],
      correctIds: ['a'],
      explanation: 'Bilkul sahi! Inheritance mein child class automatically parent class ke saare methods aur properties le leti hai. Dog ko speak() inherit milta hai Animal se.',
      timeLimit: 30,
      tags: ['inheritance', 'python', 'oop'],
    },
  },
  {
    id: 'n4',
    node_type: 'katex',
    meta: { title: 'Formula' },
    payload: {
      id: 'n4',
      displayMode: 'single',
      formulas: [
        {
          id: 'f1',
          latex: 'Child\\ Class \\supseteq Parent\\ Class',
          label: 'Inheritance Rule',
        },
      ],
      caption: 'Child class mein parent ki saari properties hoti hain',
      accentColor: '#7C6FFF',
      animation: { mode: 'instant' },
    },
  },
  {
    id: 'n5',
    node_type: 'mermaid',
    meta: { title: 'MRO Flow' },
    payload: {
      mermaidSrc: `graph TD
        A[super() call] --> B{Method Resolution Order}
        B --> C[Child Class]
        C --> D[Parent Class]
        D --> E[Grandparent Class]
        E --> F[object]
        style A fill:#7C6FFF,color:#fff
        style B fill:#1E1E2E,color:#E8E8F0
        style F fill:#059669,color:#fff`,
      caption: 'Python MRO: C3 Linearization algorithm follow karta hai',
      highlights: [],
    },
  },
];

// ─── NodeRenderer — the switch-case core ─────────────────────────────────────

function NodeRenderer({
  node,
  onDone,
}: {
  node: AIDNNode;
  onDone: () => void;
}) {
  switch (node.node_type) {
    case 'markdown':
      return <MarkdownNode node={node} onDone={onDone} />;

    case 'mcq':
      return <MCQNode node={node} onDone={onDone} />;

    case 'svg':
      return <SVGNode node={node} onDone={onDone} />;

    case 'katex':
      return (
        <KaTeXNode
          payload={node.payload as any}
          onDone={onDone}
          onSkip={onDone}
          sendEvent={(e) => console.log('[KaTeX Event]', e)}
        />
      );

    case 'mermaid':
      return (
        <MermaidNode
          payload={node.payload as any}
          onDone={onDone}
          onSkip={onDone}
          sendEvent={(e) => console.log('[Mermaid Event]', e)}
        />
      );

    case 'skia':
      return (
        <SkiaNode
          payload={node.payload as any}
          onDone={onDone}
          onSkip={onDone}
          sendEvent={(e) => console.log('[Skia Event]', e)}
        />
      );

    case 'video':
      return <VideoNode node={node} onDone={onDone} />;

    default:
      console.warn('[RenderScreen] Unknown node_type:', node.node_type);
      onDone();
      return null;
  }
}

// ─── RenderScreen ─────────────────────────────────────────────────────────────

export default function RenderScreen() {
  const [nodes, setNodes]           = useState<AIDNNode[]>(DEMO_LESSON);
  const [currentIndex, setIndex]    = useState(0);
  const [isLoading, setIsLoading]   = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [isPaused, setIsPaused]     = useState(false);

  const currentNode = nodes[currentIndex];
  const progress    = nodes.length > 0 ? (currentIndex / nodes.length) : 0;

  // ── Move to next node ──
  const handleNodeDone = useCallback(() => {
    if (currentIndex >= nodes.length - 1) {
      setLessonDone(true);
      return;
    }
    setIndex(prev => prev + 1);
  }, [currentIndex, nodes.length]);

  // ── WebSocket inject_node handler (wire to your wsService later) ──
  const injectNode = useCallback((newNode: AIDNNode) => {
    setNodes(prev => {
      const updated = [...prev];
      updated.splice(currentIndex + 1, 0, newNode);
      return updated;
    });
  }, [currentIndex]);

  // ── Restart lesson ──
  const restart = () => {
    setIndex(0);
    setLessonDone(false);
  };

  // ─── Lesson Complete Screen ───────────────────────────────────────────────
  if (lessonDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneScreen}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Lesson Complete!</Text>
          <Text style={styles.doneSub}>
            Tumne {nodes.length} nodes complete kiye.{'\n'}
            Knowledge Graph update ho raha hai...
          </Text>
          <TouchableOpacity style={styles.restartBtn} onPress={restart}>
            <Text style={styles.restartText}>↺  Restart Lesson</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
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

  // ─── Main Canvas ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentNode.meta?.title ?? 'KnoriX'}
        </Text>
        <Text style={styles.headerCounter}>
          {currentIndex + 1} / {nodes.length}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Node Canvas */}
      <ScrollView
        style={styles.canvas}
        contentContainerStyle={styles.canvasContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <NodeRenderer
          key={currentNode.id}
          node={currentNode}
          onDone={handleNodeDone}
        />
      </ScrollView>

      {/* Dev helper: node type badge */}
      <View style={styles.devBadge}>
        <Text style={styles.devBadgeText}>
          {currentNode.node_type.toUpperCase()}
        </Text>
      </View>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E2E',
  },
  headerTitle: {
    color: '#E8E8F0',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerCounter: {
    color: '#6B6B8A',
    fontSize: 13,
    fontFamily: 'System',
  },

  // Progress
  progressTrack: {
    height: 2,
    backgroundColor: '#1E1E2E',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#7C6FFF',
  },

  // Canvas
  canvas: {
    flex: 1,
  },
  canvasContent: {
    paddingVertical: 20,
    paddingHorizontal: 4,
  },

  // Done screen
  doneScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  doneEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  doneTitle: {
    color: '#E8E8F0',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  doneSub: {
    color: '#6B6B8A',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  restartBtn: {
    backgroundColor: '#7C6FFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  restartText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Loading
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#6B6B8A',
    fontSize: 14,
  },

  // Dev badge
  devBadge: {
    position: 'absolute',
    bottom: 72,
    right: 12,
    backgroundColor: '#1E1E2E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2E2E4E',
  },
  devBadgeText: {
    color: '#4A4A6A',
    fontSize: 9,
    fontFamily: 'System',
    letterSpacing: 1,
  },
});
