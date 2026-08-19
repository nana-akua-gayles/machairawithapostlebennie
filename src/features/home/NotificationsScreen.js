import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, SectionList, Pressable, RefreshControl, ScrollView } from 'react-native';
import { ArrowLeft, Sparkles, MessageSquare, ShoppingBag, BellRing, Check, Inbox } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from './useNotifications';

const TYPE_META = {
  devotional: { icon: Sparkles, accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)' },
  content: { icon: Sparkles, accent: '#6366f1', glow: 'rgba(99, 102, 241, 0.15)' },
  support: { icon: MessageSquare, accent: '#06b6d4', glow: 'rgba(6, 182, 212, 0.15)' },
  order: { icon: ShoppingBag, accent: '#f43f5e', glow: 'rgba(244, 63, 94, 0.15)' },
  default: { icon: BellRing, accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.15)' },
};

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.default;
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayLabel(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function groupByDay(notifications) {
  const groups = {};
  notifications.forEach((item) => {
    const label = getDayLabel(item.created_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
  });
  return Object.keys(groups).map((label) => ({ title: label, data: groups[label] }));
}

const CATEGORIES = [
  { id: 'all', label: 'Everything' },
  { id: 'unread', label: 'Unread' },
  { id: 'devotional', label: 'Inspiration' },
  { id: 'activity', label: 'Activity' },
];

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'unread') return notifications.filter(n => !n.read);
    if (selectedCategory === 'devotional') return notifications.filter(n => n.type === 'devotional' || n.type === 'content');
    if (selectedCategory === 'activity') return notifications.filter(n => n.type === 'support' || n.type === 'order');
    return notifications;
  }, [notifications, selectedCategory]);

  const sections = useMemo(() => groupByDay(filteredNotifications), [filteredNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleItemPress = (item) => {
    if (!item.read) markAsRead(item.id);
    setExpandedId(expandedId === item.id ? null : item.id);
    if (item.deep_link && expandedId === item.id) {
      navigation.navigate(item.deep_link);
    }
  };

  return (
    <SafeAreaView style={[styles.canvas, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Immersive Editorial Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroTopRow}>
          <Pressable onPress={() => navigation.goBack()} style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          
          {unreadCount > 0 && (
            <Pressable onPress={markAllAsRead} style={[styles.glassPillButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Check size={12} color={colors.primary} strokeWidth={3} />
              <AppText type="semiBold" style={[styles.glassPillText, { color: colors.text }]}>Clear all unread</AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.heroTitleBlock}>
          <AppText type="black" style={[styles.heroTitle, { color: colors.text }]}>Updates</AppText>
        </View>

        {/* Floating Capsule Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capsuleTrack}>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                style={[styles.capsule, { backgroundColor: isSelected ? colors.text : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') }]}
              >
                <AppText type={isSelected ? 'bold' : 'medium'} style={[styles.capsuleLabel, { color: isSelected ? colors.background : colors.textSecondary }]}>
                  {cat.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Asymmetric Feed List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContent}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.chapterMarker}>
            <AppText type="bold" style={[styles.chapterTitle, { color: colors.textSecondary }]}>{title}</AppText>
            <View style={[styles.chapterRule, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item }) => {
          const meta = getTypeMeta(item.type);
          const Icon = meta.icon;
          const isUnread = !item.read;
          const isExpanded = expandedId === item.id;

          return (
            <Pressable
              onPress={() => handleItemPress(item)}
              style={[styles.nodeCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.card, borderColor: isUnread ? meta.accent : colors.border, borderWidth: isUnread ? 1.5 : 1 }]}
            >
              {isUnread && <View style={[styles.ambientGlow, { backgroundColor: meta.glow }]} />}

              <View style={styles.nodeHeaderRow}>
                <View style={[styles.glyphContainer, { backgroundColor: meta.glow }]}>
                  <Icon size={16} color={meta.accent} strokeWidth={2.4} />
                </View>
                
                <View style={styles.nodeMetaBlock}>
                  <AppText type="medium" style={[styles.nodeTypeTag, { color: meta.accent }]}>{item.type.toUpperCase()}</AppText>
                  <AppText type="regular" style={[styles.nodeTimestamp, { color: colors.textSecondary }]}>{formatRelativeTime(item.created_at)}</AppText>
                </View>

                {isUnread && <View style={[styles.beaconDot, { backgroundColor: meta.accent }]} />}
              </View>

              <AppText type={isUnread ? 'bold' : 'semiBold'} style={[styles.nodeHeading, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                {item.title}
              </AppText>

              {!!item.body && (
                <AppText type="regular" style={[styles.nodeBodySnippet, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
                  {item.body}
                </AppText>
              )}

              {isExpanded && item.deep_link && (
                <View style={[styles.nodeActionFooter, { borderTopColor: colors.border }]}>
                  <AppText type="bold" style={[styles.actionPromptText, { color: meta.accent }]}>Tap again to open destination →</AppText>
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.nullStateContainer}>
              <View style={[styles.nullIconNode, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                <Inbox size={28} color={colors.textSecondary} strokeWidth={1.5} />
              </View>
              <AppText type="bold" style={[styles.nullTitle, { color: colors.text }]}>Silence on the wire</AppText>
              <AppText type="regular" style={[styles.nullSubtitle, { color: colors.textSecondary }]}>
                No signals match this filter right now. We'll alert you when data updates.
              </AppText>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1 },
  heroHeader: { paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  glassButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  glassPillButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18 },
  glassPillText: { fontSize: 12 },
  heroTitleBlock: { marginBottom: 12 },
  heroTitle: { fontSize: 21, letterSpacing: -1 },
  capsuleTrack: { gap: 8, paddingRight: 20 },
  capsule: { paddingHorizontal: 16, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  capsuleLabel: { fontSize: 13 },
  feedContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60, flexGrow: 1 },
  chapterMarker: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 12 },
  chapterTitle: { fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' },
  chapterRule: { flex: 1, height: 1, opacity: 0.4 },
  nodeCard: { borderRadius: 20, padding: 16, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  ambientGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
  nodeHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  glyphContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  nodeMetaBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nodeTypeTag: { fontSize: 10, letterSpacing: 1 },
  nodeTimestamp: { fontSize: 11 },
  beaconDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  nodeHeading: { fontSize: 15, marginBottom: 6, letterSpacing: -0.2 },
  nodeBodySnippet: { fontSize: 13.5, lineHeight: 20 },
  nodeActionFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  actionPromptText: { fontSize: 12 },
  nullStateContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, paddingHorizontal: 40 },
  nullIconNode: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  nullTitle: { fontSize: 16, marginBottom: 6 },
  nullSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});