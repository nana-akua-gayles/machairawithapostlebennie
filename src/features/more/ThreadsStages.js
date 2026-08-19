import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ChevronLeft, Check, AlertTriangle, Compass } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabaseClient';
import { useTheme } from '../../context/ThemeContext';

const RUBRIC = '#C81E3A';
const INK = '#352A48';
const PAGE_SIZE = 20;

const safeHaptic = (fn) => { try { fn(); } catch (_e) {} };

export const ThreadsStages = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [stages, setStages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [highestCompletedStage, setHighestCompletedStage] = useState(0);


  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const buildStage = (stage, index, maxCompleted, offset = 0) => {
    const stageNum = Number(stage.stage_number ?? offset + index + 1);
    return {
      ...stage,
      stage_number: stageNum,
      isUnlocked: stageNum === 1 || stageNum <= maxCompleted + 1,
      isCurrent: stageNum === maxCompleted + 1,
    };
  };

  const fetchUserDataAndStages = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let maxCompleted = 0;

      if (user) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('game_sessions')
          .select('level_number, is_completed')
          .eq('user_id', user.id)
          .eq('game_type', 'threads')
          .eq('is_completed', true);

        if (sessionsError) throw sessionsError;

        if (sessionsData && sessionsData.length > 0) {
          const completedStages = sessionsData
            .map((s) => Number(s.level_number))
            .filter((n) => !isNaN(n));
          if (completedStages.length > 0) maxCompleted = Math.max(...completedStages);
        }
      }

      const { data, error: stagesError } = await supabase
        .from('threads_stages')
        .select('id, stage_number, title, description')
        .order('stage_number', { ascending: true })
        .range(0, PAGE_SIZE - 1);

      if (stagesError) throw stagesError;

      // A slower-finishing older request should never clobber a newer one —
      // this is what stopped the focus-refetch/pagination race in the
      // previous version from silently truncating the visible list.
      if (myRequestId !== requestIdRef.current) return;

      setHighestCompletedStage(maxCompleted);
      setStages(data.map((s, i) => buildStage(s, i, maxCompleted)));
      setHasMore(data.length === PAGE_SIZE);
      setPage(0);
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return;
      console.error('Error fetching thread stages:', err.message);
      setError('Could not load stages. Check your connection and try again.');
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserDataAndStages();
    }, [fetchUserDataAndStages])
  );

  const loadMoreStages = async () => {
    if (loading || loadingMore || !hasMore || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoadingMore(true);

    const myRequestId = requestIdRef.current;
    try {
      const nextPage = page + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: pageError } = await supabase
        .from('threads_stages')
        .select('id, stage_number, title, description')
        .order('stage_number', { ascending: true })
        .range(from, to);

      if (pageError) throw pageError;
      if (myRequestId !== requestIdRef.current) return; // a refetch superseded this page load

      setStages((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const fresh = data
          .filter((s) => !existingIds.has(s.id))
          .map((s, i) => buildStage(s, i, highestCompletedStage, from));
        return [...prev, ...fresh];
      });
      setHasMore(data.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more stages:', err.message);
    } finally {
      inFlightRef.current = false;
      setLoadingMore(false);
    }
  };

  const handleStageSelect = (stage) => {
    if (!stage.isUnlocked) {
      safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      return;
    }
    safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    navigation.navigate('ThreadsofMachaira', { stageId: stage.id, stageNumber: Number(stage.stage_number) });
  };

  const s = getStyles(colors, isDark);

  const renderStageCard = ({ item, index }) => {
    const stageNum = Number(item.stage_number);
    const { isUnlocked, isCurrent } = item;
    const isComplete = isUnlocked && !isCurrent;
    const isLast = index === stages.length - 1;

    const markerColor = isCurrent ? RUBRIC : isComplete ? INK : colors.textSecondary;

    return (
      <View style={s.row}>
        <View style={s.railCol}>
          <View
            style={[
              s.marker,
              { borderColor: markerColor, backgroundColor: isCurrent ? RUBRIC : isComplete ? (isDark ? '#2a2333' : INK) : 'transparent' },
            ]}
          >
            {isComplete ? (
              <Check size={16} color="#ffffff" strokeWidth={3} />
            ) : isUnlocked ? (
              <AppText type="bold" style={[s.markerText, { color: isCurrent ? '#ffffff' : colors.text }]}>
                {stageNum < 10 ? `0${stageNum}` : stageNum}
              </AppText>
            ) : (
              <Lock size={14} color={colors.textSecondary} />
            )}
          </View>
          {!isLast && (
            <View
              style={[
                s.railLine,
                { backgroundColor: isComplete || isCurrent ? RUBRIC : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(53,42,72,0.12)') },
              ]}
            />
          )}
        </View>

        <Pressable
          onPress={() => handleStageSelect(item)}
          style={({ pressed }) => [
            s.card,
            isCurrent && s.cardCurrent,
            !isUnlocked && s.cardLocked,
            pressed && isUnlocked && s.cardPressed,
          ]}
        >
          <View style={s.cardHeaderRow}>
            <AppText type="bold" style={[s.stageLabel, { color: isCurrent ? RUBRIC : colors.textSecondary }]}>
              STAGE {stageNum}
            </AppText>
            {isCurrent && (
              <View style={s.currentTag}>
                <AppText type="bold" style={s.currentTagText}>CONTINUE</AppText>
              </View>
            )}
          </View>

          <AppText
            type="bold"
            style={[s.cardTitle, { color: colors.text }, !isUnlocked && { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.title}
          </AppText>
          <AppText
            style={[s.cardDesc, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.description}
          </AppText>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container]}>
      <View style={s.hudHeader}>
        <Pressable
          onPress={() => { safeHaptic(() => Haptics.selectionAsync()); navigation.goBack(); }}
          style={s.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[s.headerTitle, { color: colors.text }]}>Threads of Machaira</AppText>
        <View style={{ width: 40 }} />
      </View>

      {loading && stages.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={RUBRIC} />
        </View>
      ) : error ? (
        <View style={s.center}>
          <View style={s.emptyBadge}>
            <AlertTriangle size={22} color={RUBRIC} />
          </View>
          <AppText type="bold" style={[s.emptyTitle, { color: colors.text }]}>COULDN'T LOAD STAGES</AppText>
          <AppText style={[s.emptyText, { color: colors.textSecondary }]}>{error}</AppText>
          <Pressable style={s.retryBtn} onPress={fetchUserDataAndStages}>
            <AppText type="bold" style={s.retryBtnText}>TRY AGAIN</AppText>
          </Pressable>
        </View>
      ) : stages.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyBadge}>
            <Compass size={22} color={RUBRIC} />
          </View>
          <AppText type="bold" style={[s.emptyTitle, { color: colors.text }]}>NO STAGES YET</AppText>
          <AppText style={[s.emptyText, { color: colors.textSecondary }]}>New territory is being mapped. Check back soon.</AppText>
        </View>
      ) : (
        <FlatList
          data={stages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStageCard}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={s.heroSection}>
              <AppText style={[s.heroSub, { color: colors.textSecondary }]}>
                Digging deep into the Word with Apostle Bennie.
              </AppText>
              <AppText style={s.heroSubHighlight}>Quiz or get quizzed?</AppText>
            </View>
          }
          onEndReached={loadMoreStages}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={s.footerLoader}>
                <ActivityIndicator size="small" color={RUBRIC} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fff1f2', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: isDark ? 'rgba(200,30,58,0.4)' : '#fecdd3' },
  emptyTitle: { fontSize: 16, letterSpacing: 1, marginBottom: 6 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: RUBRIC },
  retryBtnText: { fontSize: 12, letterSpacing: 1, color: RUBRIC },

  hudHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(53,42,72,0.1)' },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(53,42,72,0.05)' },
  headerTitle: { fontSize: 16, letterSpacing: -0.2 },

  listContainer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  heroSection: { marginBottom: 24, marginTop: 8 },
  heroSub: { fontSize: 14.5, lineHeight: 21 },
  heroSubHighlight: { fontSize: 14.5, color: RUBRIC, lineHeight: 21, marginTop: 2, fontStyle: 'italic' },

  row: { flexDirection: 'row' },
  railCol: { alignItems: 'center', width: 44 },
  marker: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  markerText: { fontSize: 13 },
  railLine: { width: 2, flex: 1, minHeight: 40, marginVertical: 4 },

  card: { flex: 1, marginLeft: 12, marginBottom: 20, padding: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(53,42,72,0.1)' },
  cardCurrent: { borderColor: RUBRIC, borderWidth: 1.5, shadowColor: RUBRIC, shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.25 : 0.14, shadowRadius: 10, elevation: 3 },
  cardLocked: { opacity: 0.55 },
  cardPressed: { transform: [{ scale: 0.98 }] },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  stageLabel: { fontSize: 10.5, letterSpacing: 1.5 },
  currentTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: isDark ? 'rgba(200,30,58,0.16)' : '#fff1f2' },
  currentTagText: { fontSize: 9.5, letterSpacing: 1, color: RUBRIC },

  cardTitle: { fontSize: 16, letterSpacing: -0.2, marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18 },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
