// ─────────────────────────────────────────────────────────────
// modules/websocket/subviews/QAChatView.tsx
// Live Q&A chat overlay — student types or picks quick replies
// AI responses come via WS; heavy submits go via FastAPI
// ─────────────────────────────────────────────────────────────

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../../styles/tokens';
import type { QAMessage, QAChatConfig } from '../../../types/realtime.types';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 40;
const CARD_H = CARD_W * (9 / 16);

interface Props {
  messages: QAMessage[];
  quickReplies: string[];
  isSending: boolean;
  config: QAChatConfig;
  onSendMessage: (text: string) => void;
  onQuickReply: (reply: string) => void;
  onSkip: () => void;
}

// ─── Message bubble ──────────────────────────────────────────

function Bubble({ msg }: { msg: QAMessage }) {
  const isAI = msg.role === 'ai';
  return (
    <Animated.View
      entering={isAI ? FadeInDown.duration(220) : FadeInUp.duration(180)}
      style={[bub.row, isAI ? bub.rowAI : bub.rowStudent]}
    >
      {isAI && (
        <View style={bub.avatarSmall}>
          <Text style={bub.avatarText}>AI</Text>
        </View>
      )}
      <View style={[bub.bubble, isAI ? bub.bubbleAI : bub.bubbleStudent]}>
        <Text style={[bub.text, isAI ? bub.textAI : bub.textStudent]}>{msg.text}</Text>
      </View>
    </Animated.View>
  );
}

const bub = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 6 },
  rowAI: { justifyContent: 'flex-start' },
  rowStudent: { justifyContent: 'flex-end' },
  avatarSmall: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent + '33',
    borderWidth: 1, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.accent, fontSize: 8, fontFamily: Typography.semibold },
  bubble: { maxWidth: CARD_W * 0.65, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  bubbleAI: { backgroundColor: '#1E1E2E', borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleStudent: { backgroundColor: Colors.accent + '22', borderWidth: 1, borderColor: Colors.accent + '55', borderBottomRightRadius: 4 },
  text: { fontSize: 13, lineHeight: 20 },
  textAI: { color: Colors.textPrimary, fontFamily: Typography.body },
  textStudent: { color: Colors.accent, fontFamily: Typography.body },
});

// ─── Main view ───────────────────────────────────────────────

export default function QAChatView({
  messages,
  quickReplies,
  isSending,
  config,
  onSendMessage,
  onQuickReply,
  onSkip,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState('');

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    onSendMessage(text);
  };

  return (
    <View style={th.card}>
      <View style={th.accentStrip} />

      {/* Header */}
      <View style={th.header}>
        <View style={th.badgeRow}>
          <View style={th.badge}>
            <Text style={th.badgeText}>LIVE Q&A</Text>
          </View>
          <Text style={th.liveLabel}>● LIVE</Text>
        </View>
        <TouchableOpacity style={th.btnSkip} onPress={onSkip}>
          <Text style={th.btnSkipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={th.messageList}
        contentContainerStyle={th.messageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
        {isSending && (
          <Animated.View entering={FadeInDown.duration(200)} style={bub.row}>
            <View style={bub.avatarSmall}>
              <Text style={bub.avatarText}>AI</Text>
            </View>
            <View style={[bub.bubble, bub.bubbleAI]}>
              <ActivityIndicator size="small" color={Colors.accent} />
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Quick replies */}
      {quickReplies.length > 0 && (
        <ScrollView
          horizontal
          style={th.qrScroll}
          contentContainerStyle={th.qrContent}
          showsHorizontalScrollIndicator={false}
        >
          {quickReplies.map(r => (
            <TouchableOpacity key={r} style={th.qrChip} onPress={() => onQuickReply(r)}>
              <Text style={th.qrText}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input */}
      {config.studentCanType && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={th.inputRow}>
            <TextInput
              style={th.input}
              value={input}
              onChangeText={setInput}
              placeholder={config.inputPlaceholder ?? 'Ask something...'}
              placeholderTextColor={Colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline={false}
            />
            <TouchableOpacity
              style={[th.sendBtn, (!input.trim() || isSending) && th.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || isSending}
            >
              <Text style={th.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const th = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  accentStrip: { height: 3, backgroundColor: Colors.accent },
  header: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.accent + '22',
    borderWidth: 1, borderColor: Colors.accent,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { color: Colors.accent, fontSize: 10, fontFamily: Typography.semibold, letterSpacing: 1 },
  liveLabel: { color: '#FF4D4D', fontSize: 11, fontFamily: Typography.semibold },
  btnSkip: { paddingHorizontal: 10, paddingVertical: 6 },
  btnSkipText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.semibold, letterSpacing: 1 },
  messageList: { flex: 1 },
  messageContent: { padding: Spacing.md, paddingBottom: 4 },
  qrScroll: { maxHeight: 40, borderTopWidth: 1, borderTopColor: Colors.border },
  qrContent: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  qrChip: {
    borderWidth: 1, borderColor: Colors.accent + '66',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
    backgroundColor: Colors.accent + '11',
  },
  qrText: { color: Colors.accent, fontSize: 12, fontFamily: Typography.body },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2A',
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
    color: Colors.textPrimary,
    fontFamily: Typography.body,
    fontSize: 13,
  },
  sendBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.accent + '44' },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
