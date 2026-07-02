/**
 * KnoriX — Home Screen
 * src/screen/Home/HomeScreen.tsx
 *
 * Student dashboard: profile summary, mastery stats,
 * weekly view, and today's lesson schedule.
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
import {
  Settings,
  Trophy,
  ClipboardList,
  Zap,
  Clock,
  User as UserIcon,
} from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');

// ─── Theme (matches RenderScreen dark palette) ─────────────────────────────
const C = {
  bg: '#0A0A0F',
  surface: '#12121A',
  card: '#1E1E2E',
  border: '#2E2E4E',
  accent: '#7C6FFF',
  accentSoft: '#7C6FFF22',
  textPrimary: '#E8E8F0',
  textMuted: '#6B6B8A',
  success: '#059669',
  warn: '#D97706',
};

// ─── Mock data (replace with API later) ────────────────────────────────────
const WEEK_DAYS = [
  { label: 'Sun', date: 28 },
  { label: 'Mon', date: 29 },
  { label: 'Tue', date: 30 },
  { label: 'Wed', date: 1 },
  { label: 'Thu', date: 2 },
  { label: 'Fri', date: 3 },
  { label: 'Sat', date: 4 },
];

const TODAY_SCHEDULE = [
  {
    id: 's1',
    time: '07:00 - 07:45',
    title: 'Mine Ventilation Basics',
    instructor: 'DGMS Module 3',
    badge: { type: 'duration', label: '35 min' },
  },
  {
    id: 's2',
    time: '08:15 - 09:00',
    title: 'Safety Regulations',
    instructor: 'CMR 2017 · Ch. 4',
    badge: { type: 'hw', label: 'HW' },
  },
  {
    id: 's3',
    time: '09:15 - 10:00',
    title: 'Explosives Handling',
    instructor: 'MMR 1961',
    badge: null,
  },
  {
    id: 's4',
    time: '10:15 - 11:00',
    title: 'Mock Test: Gas Testing',
    instructor: 'Practice Set 12',
    badge: { type: 'hw', label: 'HW' },
  },
  {
    id: 'break',
    time: '12:00 - 13:00',
    title: 'Break',
    instructor: 'Take a breather ☕',
    isBreak: true,
  },
];

// ─── Quick stat pill ────────────────────────────────────────────────────────
function QuickStat({
  icon: Icon,
  label,
  bg,
}: {
  icon: React.ComponentType<any>;
  label: string;
  bg: string;
}) {
  return (
    <TouchableOpacity style={s.quickStat} activeOpacity={0.8}>
      <View style={[s.quickStatIcon, { backgroundColor: bg }]}>
        <Icon size={16} color="#fff" />
      </View>
      <Text style={s.quickStatLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
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
      <Text style={s.dayChipLabel}>{label}</Text>
      <TouchableOpacity
        style={[s.dayChip, active && s.dayChipActive]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={[s.dayChipDate, active && s.dayChipDateActive]}>
          {date}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Schedule row ───────────────────────────────────────────────────────────
function ScheduleItem({ item }: { item: (typeof TODAY_SCHEDULE)[number] }) {
  if (item.isBreak) {
    return (
      <View style={s.breakCard}>
        <Clock size={18} color="#fff" />
        <View style={{ marginLeft: 12 }}>
          <Text style={s.breakTime}>{item.time}</Text>
          <Text style={s.breakTitle}>{item.title}</Text>
          <Text style={s.breakSub}>{item.instructor}</Text>
        </View>
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
        <View style={s.scheduleInstructorRow}>
          <View style={s.scheduleAvatar}>
            <UserIcon size={11} color={C.textMuted} />
          </View>
          <Text style={s.scheduleInstructor} numberOfLines={1}>
            {item.instructor}
          </Text>
        </View>
      </View>

      {item.badge && (
        <View
          style={[
            s.badge,
            item.badge.type === 'hw' ? s.badgeHW : s.badgeDuration,
          ]}
        >
          <Text
            style={[
              s.badgeText,
              item.badge.type === 'hw' ? s.badgeTextHW : s.badgeTextDuration,
            ]}
          >
            {item.badge.label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── HomeScreen ─────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  
  const dateTitle = useMemo(() => {
    const day = WEEK_DAYS.find(d => d.date === selectedDate);
    const month = today.toLocaleString('default', { month: 'long' });
    return day ? `${day.label}, ${day.date} ${month}` : '';
    }, [selectedDate]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* ─── Profile Card ───────────────────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.profileTopRow}>
            <Image
              source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
              style={s.avatar}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.name}>Jaanvi Kumari</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleBadgeText}>DGMS Aspirant</Text>
              </View>
            </View>
            <TouchableOpacity style={s.settingsBtn}>
              <Settings size={18} color={C.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={s.quickStatsRow}>
            <QuickStat icon={Trophy} label="Academic Success" bg="#3B82F6" />
            <QuickStat icon={ClipboardList} label="Homework" bg="#F97316" />
            <QuickStat icon={Zap} label="Streak: 12d" bg="#F59E0B" />
          </View>
        </View>

        {/* ─── Stats bar ───────────────────────────────────────────── */}
        <View style={s.statsBar}>
          <View style={s.statItem}>
            <Text style={s.statValue}>Rank 3</Text>
            <Text style={s.statLabel}>Mock Test</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>78%</Text>
            <Text style={s.statLabel}>Avg. Mastery</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>1,240</Text>
            <Text style={s.statLabel}>XP Points</Text>
          </View>
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

  // Profile card
  profileCard: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#ffffff55',
  },
  name: { color: '#fff', fontSize: 19, fontWeight: '700' },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff30',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  roleBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ffffff25',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  quickStat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  quickStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatLabel: {
    color: '#1A1A2E',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue: { color: C.textPrimary, fontSize: 16, fontWeight: '700' },
  statLabel: { color: C.textMuted, fontSize: 11, marginTop: 4 },

  // Week selector
  weekRow: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 10,
  },
  dayChipWrap: { alignItems: 'center', gap: 8 },
  dayChipLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600' },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  dayChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  dayChipDate: { color: C.textPrimary, fontSize: 15, fontWeight: '700' },
  dayChipDateActive: { color: '#fff' },

  // Date title
  dateTitle: {
    color: C.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 22,
    marginHorizontal: 16,
  },

  // Schedule list
  scheduleList: {
    marginTop: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  scheduleTimeCol: { width: 56, alignItems: 'flex-start' },
  scheduleTime: { color: C.textPrimary, fontSize: 12, fontWeight: '700' },
  scheduleTimeDivider: {
    width: 1,
    height: 14,
    backgroundColor: C.border,
    marginVertical: 3,
    marginLeft: 4,
  },
  scheduleTimeMuted: { color: C.textMuted, fontSize: 11 },
  scheduleBody: { flex: 1, marginLeft: 10 },
  scheduleTitle: { color: C.textPrimary, fontSize: 14.5, fontWeight: '700' },
  scheduleInstructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 6,
  },
  scheduleAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleInstructor: { color: C.textMuted, fontSize: 12, flexShrink: 1 },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeHW: { backgroundColor: '#EF444422' },
  badgeDuration: { backgroundColor: C.accentSoft },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextHW: { color: '#EF4444' },
  badgeTextDuration: { color: C.accent },

  // Break card
  breakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.accent,
    borderRadius: 16,
    padding: 16,
  },
  breakTime: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.85 },
  breakTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 },
  breakSub: { color: '#ffffffcc', fontSize: 12, marginTop: 2 },
});
