/**
 * KnoriX — Home Screen
 * src/screen/Home/HomeScreen.tsx
 *
 * Student dashboard for Class XII learners: profile summary,
 * mastery stats, weekly view, and today's lesson schedule.
 *
 * Original color system preserved (ink bg + violet accent).
 * Signature element: SVG progress ring around the avatar,
 * reading overall board-exam readiness at a glance.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import {
  Settings,
  BookOpen,
  ClipboardCheck,
  Flame,
  Clock,
  ChevronRight,
} from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

// ─── Theme (original palette, unchanged) ───────────────────────────────────
const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  card: '#1E1E2E',
  cardAlt: '#191926',
  border: '#2E2E4E',
  accent: '#7C6FFF',
  accentSoft: '#7C6FFF22',
  accentDim: '#9C90FF',
  textPrimary: '#E8E8F0',
  textMuted: '#6B6B8A',
  textFaint: '#4B4B66',
  success: '#059669',
  warn: '#D97706',
  danger: '#EF4444',
  dangerSoft: '#EF444422',
};

// ─── Mock data — Class XII, Science stream ─────────────────────────────────

const STUDENT = {
  name: 'Kvinit Karmkar',
  grade: 'Class XII',
  stream: 'Science',
  readiness: 0.76, // board-exam readiness, drives the progress ring
};

const QUICK_STATS = [
  { key: 'subjects', icon: BookOpen, label: 'Subjects', value: '6' },
  { key: 'assignments', icon: ClipboardCheck, label: 'Assignments due', value: '3' },
  { key: 'streak', icon: Flame, label: 'Day streak', value: '18' },
];

const STAT_BAR = [
  { label: 'Class rank', value: '#4' },
  { label: 'Avg. score', value: '84%' },
  { label: 'Board prep', value: '76%' },
];

const TODAY_SCHEDULE = [
  {
    id: 's1',
    time: '07:00 - 07:45',
    title: 'Optics & Wave Theory',
    subtitle: 'Physics · Ch. 9',
    badge: { type: 'duration', label: '45 min' },
  },
  {
    id: 's2',
    time: '08:15 - 09:00',
    title: 'Electrochemistry',
    subtitle: 'Chemistry · NCERT Ch. 3',
    badge: { type: 'hw', label: 'HW' },
  },
  {
    id: 'break',
    time: '09:00 - 09:20',
    title: 'Break',
    subtitle: 'Stretch, hydrate, reset ☕',
    isBreak: true,
  },
  {
    id: 's3',
    time: '09:20 - 10:05',
    title: 'Definite Integrals',
    subtitle: 'Mathematics · Sample Paper 4',
    badge: { type: 'hw', label: 'HW' },
  },
  {
    id: 's4',
    time: '10:20 - 11:00',
    title: 'Flamingo — Poetry Section',
    subtitle: 'English Core · Ch. 2',
    badge: null,
  },
  {
    id: 's5',
    time: '11:10 - 11:55',
    title: 'Functions in Python',
    subtitle: 'Computer Science · Lab Test',
    badge: { type: 'duration', label: '45 min' },
  },
];

// ─── Progress ring avatar (signature element) ──────────────────────────────
function AvatarRing({ progress, size = 64 }: { progress: number; size?: number }) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * progress;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cy} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={C.accent}
          strokeWidth={stroke}
          strokeDasharray={`${dash}, ${circumference}`}
          strokeLinecap="round"
          fill="none"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <Image
        source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
        style={{
          width: size - stroke * 4,
          height: size - stroke * 4,
          borderRadius: (size - stroke * 4) / 2,
          margin: stroke * 2,
        }}
      />
    </View>
  );
}

// ─── Quick stat pill ────────────────────────────────────────────────────────
function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
}) {
  return (
    <View style={s.quickStat}>
      <View style={s.quickStatIcon}>
        <Icon size={14} color={C.accent} strokeWidth={2} />
      </View>
      <Text style={s.quickStatValue}>{value}</Text>
      <Text style={s.quickStatLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Day chip ───────────────────────────────────────────────────────────────
function DayChip({
  label,
  date,
  active,
  onPress,
}: {
  label: string;
  date: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <View style={s.dayChipWrap}>
      <Text style={[s.dayChipLabel, active && { color: C.accent }]}>{label}</Text>
      <TouchableOpacity
        style={[s.dayChip, active && s.dayChipActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[s.dayChipDate, active && s.dayChipDateActive]}>{date}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Schedule row ───────────────────────────────────────────────────────────
function ScheduleItem({ item }: { item: (typeof TODAY_SCHEDULE)[number] }) {
  if (item.isBreak) {
    return (
      <View style={s.breakCard}>
        <Clock size={16} color={C.textMuted} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={s.breakTitle}>{item.title}</Text>
          <Text style={s.breakSub}>{item.subtitle}</Text>
        </View>
        <Text style={s.breakTime}>{item.time}</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={s.scheduleCard} activeOpacity={0.85}>
      <View style={s.scheduleTimeCol}>
        <Text style={s.scheduleTime}>{item.time.split(' - ')[0]}</Text>
        <View style={s.scheduleTimeDivider} />
        <Text style={s.scheduleTimeMuted}>{item.time.split(' - ')[1]}</Text>
      </View>

      <View style={s.scheduleBody}>
        <Text style={s.scheduleTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={s.scheduleSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      {item.badge ? (
        <View style={[s.badge, item.badge.type === 'hw' ? s.badgeHW : s.badgeDuration]}>
          <Text style={[s.badgeText, item.badge.type === 'hw' ? s.badgeTextHW : s.badgeTextDuration]}>
            {item.badge.label}
          </Text>
        </View>
      ) : (
        <ChevronRight size={16} color={C.textFaint} />
      )}
    </TouchableOpacity>
  );
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());

  const WEEK_DAYS = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { label: days[d.getDay()], date: d.getDate() };
    });
  }, []);

  const dateTitle = useMemo(() => {
    const day = WEEK_DAYS.find(d => d.date === selectedDate);
    return day
      ? `${day.label}, ${day.date} ${today.toLocaleString('default', {
          month: 'long',
          year: 'numeric',
        })}`
      : '';
  }, [selectedDate, WEEK_DAYS]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* ─── Header ─────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerTopRow}>
            <AvatarRing progress={STUDENT.readiness} />

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.eyebrow}>WELCOME BACK</Text>
              <Text style={s.name}>{STUDENT.name}</Text>
              <View style={s.gradeRow}>
                <View style={s.gradeBadge}>
                  <Text style={s.gradeBadgeText}>{STUDENT.grade}</Text>
                </View>
                <Text style={s.streamText}>{STUDENT.stream}</Text>
              </View>
            </View>

            <TouchableOpacity style={s.settingsBtn} activeOpacity={0.8}>
              <Settings size={17} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={s.hairlineRule} />

          <View style={s.quickStatsRow}>
            {QUICK_STATS.map((q, i) => (
              <React.Fragment key={q.key}>
                <QuickStat icon={q.icon} label={q.label} value={q.value} />
                {i < QUICK_STATS.length - 1 && <View style={s.quickStatDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ─── Stats bar ───────────────────────────────────────────── */}
        <View style={s.statsBar}>
          {STAT_BAR.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <View style={s.statItem}>
                <Text style={s.statValue}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
              {i < STAT_BAR.length - 1 && <View style={s.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* ─── Week selector ───────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.weekRow}
        >
          {WEEK_DAYS.map(d => (
            <DayChip
              key={d.date}
              label={d.label}
              date={d.date}
              active={d.date === selectedDate}
              onPress={() => setSelectedDate(d.date)}
            />
          ))}
        </ScrollView>

        {/* ─── Date title ──────────────────────────────────────────── */}
        <Text style={s.dateTitle}>{dateTitle}</Text>

        {/* ─── Schedule list ───────────────────────────────────────── */}
        <View style={s.scheduleList}>
          {TODAY_SCHEDULE.map(item => (
            <ScheduleItem key={item.id} item={item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 40 },

  // Header
  header: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyebrow: {
    color: C.accentDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  name: {
    color: C.textPrimary,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 3,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    gap: 8,
  },
  gradeBadge: {
    backgroundColor: C.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${C.accent}40`,
  },
  gradeBadgeText: {
    color: C.accent,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  streamText: {
    color: C.textMuted,
    fontSize: 12.5,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  hairlineRule: {
    height: 1,
    backgroundColor: C.border,
    marginTop: 18,
    marginBottom: 14,
  },

  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStat: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 3,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: C.border,
    marginHorizontal: 6,
  },
  quickStatIcon: {
    marginBottom: 2,
  },
  quickStatValue: {
    color: C.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  quickStatLabel: {
    color: C.textFaint,
    fontSize: 10.5,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue: { color: C.accent, fontSize: 16, fontWeight: '800' },
  statLabel: { color: C.textMuted, fontSize: 10.5, marginTop: 4 },

  // Week selector
  weekRow: {
    paddingHorizontal: 16,
    paddingTop: 22,
    gap: 10,
  },
  dayChipWrap: { alignItems: 'center', gap: 8 },
  dayChipLabel: { color: C.textFaint, fontSize: 11, fontWeight: '600' },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  dayChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  dayChipDate: { color: C.textPrimary, fontSize: 14.5, fontWeight: '700' },
  dayChipDateActive: { color: '#fff' },

  // Date title
  dateTitle: {
    color: C.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
    marginHorizontal: 16,
  },

  // Schedule list
  scheduleList: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleTimeCol: { width: 54, alignItems: 'flex-start' },
  scheduleTime: { color: C.textPrimary, fontSize: 11.5, fontWeight: '700' },
  scheduleTimeDivider: {
    width: 1,
    height: 12,
    backgroundColor: C.border,
    marginVertical: 3,
    marginLeft: 3,
  },
  scheduleTimeMuted: { color: C.textFaint, fontSize: 10.5 },
  scheduleBody: { flex: 1, marginLeft: 10 },
  scheduleTitle: { color: C.textPrimary, fontSize: 14, fontWeight: '700' },
  scheduleSubtitle: { color: C.textMuted, fontSize: 11.5, marginTop: 4 },

  badge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeHW: { backgroundColor: C.dangerSoft },
  badgeDuration: { backgroundColor: C.accentSoft },
  badgeText: { fontSize: 10.5, fontWeight: '700' },
  badgeTextHW: { color: C.danger },
  badgeTextDuration: { color: C.accent },

  // Break card
  breakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.cardAlt,
    borderRadius: 14,
    padding: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: C.border,
  },
  breakTitle: { color: C.textPrimary, fontSize: 13.5, fontWeight: '700' },
  breakSub: { color: C.textMuted, fontSize: 11.5, marginTop: 2 },
  breakTime: { color: C.textFaint, fontSize: 10.5 },
});
