import React, { useRef, useState, useCallback, memo, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, StatusBar, KeyboardAvoidingView, Platform, Image, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X, Send, Trash2, Eye, Palette } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';

const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';

const BACKGROUND_PRESETS = [
  { id: '1', colors: ['#352a48', '#0f0a1a'], name: 'Purple Night' },
  { id: '2', colors: ['#E11D48', '#881337'], name: 'Ruby Red' },
  { id: '3', colors: ['#1E3A8A', '#0F172A'], name: 'Deep Blue' },
  { id: '4', colors: ['#047857', '#022C22'], name: 'Emerald' },
  { id: '5', colors: ['#B45309', '#451A03'], name: 'Amber Glow' },
];

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'Just now';
  const now = new Date();
  const posted = new Date(dateString);
  const diffMs = now - posted;
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const MemoizedStoryItem = memo(({ item, viewedIds, onPress, colors }) => {
  const s = getStyles(colors);
  const latestPost = item?.posts?.[item.posts.length - 1] || {};
  const isAllViewed = item?.posts?.every((p) => viewedIds.has(p.id)) ?? false;
  const ringColors = isAllViewed ? [colors.tabBarInactive, colors.textSecondary] : [RED, '#9F1239'];

  return (
    <TouchableOpacity style={s.storyWrapper} accessibilityRole="button" accessibilityLabel={`View story by ${item?.user_name || 'Member'}`} onPress={() => onPress(item)}>
      <LinearGradient colors={ringColors} style={s.gradientBorder}>
        <View style={s.storyCircleInner}>
          {latestPost.background ? (
            <LinearGradient colors={latestPost.background} style={s.innerGradient}><AppText numberOfLines={2} style={[s.storyPreviewText, { color: '#FFF' }]}>{latestPost.content}</AppText></LinearGradient>
          ) : (
            <AppText numberOfLines={2} style={s.storyPreviewText}>{latestPost.content}</AppText>
          )}
        </View>
      </LinearGradient>
      <AppText style={s.storyName} numberOfLines={1}>{item?.user_name || 'Member'}</AppText>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  const prevLatestId = prevProps.item?.posts?.[prevProps.item.posts.length - 1]?.id;
  const nextLatestId = nextProps.item?.posts?.[nextProps.item.posts.length - 1]?.id;
  const prevViewed = prevProps.item?.posts?.every((p) => prevProps.viewedIds.has(p.id));
  const nextViewed = nextProps.item?.posts?.every((p) => nextProps.viewedIds.has(p.id));
  return prevLatestId === nextLatestId && prevViewed === nextViewed && prevProps.colors === nextProps.colors;
});

export const StorySection = ({ displayGroups = [], myGroup, hasMyStory, viewedIds = new Set(), currentUser, onCreateStoryPress, onStoryPress, onDeleteStory, onRecordView, refreshStories }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);
  const [viewersListModalVisible, setViewersListModalVisible] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  const [selectedBackground, setSelectedBackground] = useState(BACKGROUND_PRESETS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const pressStartTimeRef = useRef(0);
  const isMountedRef = useRef(true);
  const recordedViewsRef = useRef(new Set());

  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const sortedOtherGroups = displayGroups.filter((g) => g.user_id !== (currentUser?.id));

  const openViewerForGroup = useCallback((group) => {
    let targetIdx = displayGroups.findIndex((g) => g.user_id === group.user_id);
    setSelectedUserIndex(targetIdx !== -1 ? targetIdx : 0);
    setCurrentPostIndex(0);
    setProgress(0);
    setIsPaused(false);
    setViewersListModalVisible(false);
    setViewerModalVisible(true);
    if (onStoryPress) onStoryPress(group);
  }, [displayGroups, onStoryPress]);

  const activeUserGroup = displayGroups[selectedUserIndex] || {};
  const activePosts = activeUserGroup.posts || [];
  const activePost = activePosts[currentPostIndex] || {};
  const hasActivePost = !!activePost?.id;
  const myUserId = currentUser?.id;
  const isMyActiveStory = activeUserGroup.user_id === myUserId;
  const authorProfilePic = activeUserGroup.user_avatar || activePost.avatar_url || null;

  useEffect(() => {
    if (viewerModalVisible && activePost?.id && !isMyActiveStory && currentUser?.id) {
      const viewKey = `${activePost.id}-${currentUser.id}`;
      if (!recordedViewsRef.current.has(viewKey)) {
        recordedViewsRef.current.add(viewKey);
        onRecordView?.({ p_status_id: activePost.id, p_user_id: currentUser.id, p_name: currentUser.name || currentUser.full_name || 'Member', p_avatar: currentUser.avatar || currentUser.avatar_url || null });
      }
    }
  }, [viewerModalVisible, selectedUserIndex, currentPostIndex, activePost?.id, isMyActiveStory, currentUser?.id, onRecordView]);

  const handleNextStory = useCallback(() => {
    if (viewersListModalVisible) return;
    setCurrentPostIndex((prevPostIndex) => {
      if (prevPostIndex < activePosts.length - 1) { setProgress(0); return prevPostIndex + 1; }
      setSelectedUserIndex((prevUserIndex) => {
        if (prevUserIndex < displayGroups.length - 1) {
          const nextIndex = prevUserIndex + 1;
          setProgress(0);
          if (displayGroups[nextIndex] && onStoryPress) onStoryPress(displayGroups[nextIndex]);
          return nextIndex;
        }
        setViewerModalVisible(false);
        setProgress(0);
        setIsPaused(false);
        return 0;
      });
      return 0;
    });
  }, [activePosts.length, displayGroups, onStoryPress, viewersListModalVisible]);

  useEffect(() => {
    let timer;
    if (viewerModalVisible && !viewersListModalVisible && activePosts.length > 0) {
      const interval = 50;
      const totalTime = 5000;
      timer = setInterval(() => {
        if (!isPausedRef.current) setProgress((prev) => { if (prev >= 1) { handleNextStory(); return 0; } return prev + (interval / totalTime); });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [viewerModalVisible, viewersListModalVisible, selectedUserIndex, currentPostIndex, activePosts.length, handleNextStory]);

  const handlePrevStory = () => {
    if (currentPostIndex > 0) { setCurrentPostIndex((prev) => prev - 1); setProgress(0); }
    else if (selectedUserIndex > 0) {
      const prevIndex = selectedUserIndex - 1;
      setSelectedUserIndex(prevIndex);
      const prevGroupPosts = displayGroups[prevIndex]?.posts || [];
      setCurrentPostIndex(prevGroupPosts.length - 1);
      setProgress(0);
    }
  };

  const handleCreateStatus = async () => {
    if (!storyContent.trim()) { Alert.alert('Notice', 'Please write something for your story.'); return; }
    try {
      if (isMountedRef.current) setIsCreating(true);
      await onCreateStoryPress(storyContent.trim(), selectedBackground.colors);
      refreshStories?.();
      if (isMountedRef.current) { setStoryContent(''); setSelectedBackground(BACKGROUND_PRESETS[0]); setCreateModalVisible(false); }
    } catch (error) {
      Alert.alert('Error', 'Failed to share status. Please try again.');
    } finally {
      if (isMountedRef.current) setIsCreating(false);
    }
  };

  const handleDeleteStatus = async (id) => {
    try {
      if (isMountedRef.current) { setIsDeleting(true); setIsPaused(true); }
      await onDeleteStory(id);
      refreshStories?.();
      if (isMountedRef.current) setViewerModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete status. Please try again.');
      if (isMountedRef.current) setIsPaused(false);
    } finally {
      if (isMountedRef.current) setIsDeleting(false);
    }
  };

  const currentBackgroundColors = activePost.background || [DEEP_PURPLE, '#0f0a1a'];
  const viewersList = activePost.viewers || [];

  return (
    <View style={s.section}>
      <View style={s.row}><AppText type="bold" style={s.sectionTitle}>Active Stories</AppText></View>

      <FlatList
        horizontal
        data={sortedOtherGroups}
        keyExtractor={(item) => item?.user_id?.toString() || Math.random().toString()}
        contentContainerStyle={s.flatListContent}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.storyWrapper}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="View or create status" onPress={() => { if (hasMyStory && myGroup) openViewerForGroup(myGroup); else setCreateModalVisible(true); }}>
              {hasMyStory && myGroup?.posts && myGroup.posts.length > 0 ? (() => {
                const latestMyPost = myGroup.posts[myGroup.posts.length - 1];
                return (
                  <LinearGradient colors={[RED, '#9F1239']} style={s.gradientBorder}>
                    <View style={s.storyCircleInner}>
                      {latestMyPost.background ? (
                        <LinearGradient colors={latestMyPost.background} style={s.innerGradient}><AppText numberOfLines={2} style={[s.storyPreviewText, { color: '#FFF' }]}>{latestMyPost.content}</AppText></LinearGradient>
                      ) : (
                        <AppText numberOfLines={2} style={s.storyPreviewText}>{latestMyPost.content}</AppText>
                      )}
                    </View>
                  </LinearGradient>
                );
              })() : (
                <View style={s.myStatusContainer}><View style={s.storyCircleInnerBlank}><Plus color={RED} size={24} /></View></View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.floatingPlusBadge} accessibilityRole="button" accessibilityLabel="Create new status" onPress={() => setCreateModalVisible(true)}><Plus color="#FFFFFF" size={12} /></TouchableOpacity>
            <AppText style={s.storyName}>My Status</AppText>
          </View>
        }
        renderItem={({ item }) => <MemoizedStoryItem item={item} viewedIds={viewedIds} onPress={openViewerForGroup} colors={colors} />}
      />

      <Modal visible={createModalVisible} animationType="slide" transparent={false} onRequestClose={() => setCreateModalVisible(false)}>
        <LinearGradient colors={selectedBackground.colors} style={[s.composerContainer, { paddingTop: Math.max(insets.top, 25), paddingBottom: Math.max(insets.bottom, 25) }]}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.keyboardAvoidingFlex}>
            <View style={s.composerHeader}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={s.composerCloseBtn} disabled={isCreating}><X color="#FFF" size={24} /></TouchableOpacity>
              <AppText type="bold" style={s.composerHeaderTitle}>Create Status</AppText>
              <TouchableOpacity onPress={handleCreateStatus} style={[s.composerSendBtn, isCreating && s.disabledSendBtn]} disabled={isCreating}>{isCreating ? <ActivityIndicator color="#FFF" size="small" /> : <Send color="#FFF" size={20} />}</TouchableOpacity>
            </View>
            <View style={s.composerBody}>
              <TextInput placeholder="Share how the Machaira blessed you today..." placeholderTextColor="rgba(255,255,255,0.4)" value={storyContent} onChangeText={setStoryContent} multiline autoFocus editable={!isCreating} style={s.composerInput} />
            </View>
            <View style={s.paletteContainer}>
              <View style={s.paletteHeader}><Palette color="rgba(255,255,255,0.7)" size={16} /><AppText style={s.paletteTitle}>Choose Background</AppText></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.paletteScroll}>
                {BACKGROUND_PRESETS.map((preset) => (
                  <TouchableOpacity key={preset.id} onPress={() => setSelectedBackground(preset)} style={[s.paletteSwatchWrapper, selectedBackground.id === preset.id && s.paletteSwatchSelected]}><LinearGradient colors={preset.colors} style={s.paletteSwatch} /></TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={s.composerFooter}><AppText style={s.composerFooterText}>Disappears automatically after 24 hours</AppText></View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      <Modal visible={viewerModalVisible} animationType="fade" transparent={false} onRequestClose={() => setViewerModalVisible(false)}>
        <LinearGradient colors={currentBackgroundColors} style={[s.viewerContainer, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={s.progressBarRow}>
            {activePosts.map((_, idx) => (
              <View key={idx} style={s.progressBarBackground}><View style={[s.progressBarFill, { width: idx < currentPostIndex ? '100%' : idx === currentPostIndex ? `${progress * 100}%` : '0%' }]} /></View>
            ))}
          </View>

          <View style={s.viewerHeader}>
            <View style={s.viewerAuthorRow}>
              {authorProfilePic ? <Image source={{ uri: authorProfilePic }} style={s.viewerAvatar} /> : (
                <View style={s.viewerAvatarPlaceholder}><AppText style={s.viewerAvatarPlaceholderText}>{(isMyActiveStory ? 'M' : (activeUserGroup.user_name || 'M')).charAt(0).toUpperCase()}</AppText></View>
              )}
              <View>
                <AppText type="bold" style={s.viewerAuthor}>{isMyActiveStory ? 'My Status' : (activeUserGroup.user_name || 'Member')}</AppText>
                <AppText style={s.viewerTimestamp}>{formatTimeAgo(activePost.created_at)}</AppText>
              </View>
            </View>
            <View style={s.viewerHeaderActions}>
              {isMyActiveStory && activePost.id && (
                <TouchableOpacity style={s.viewerDeleteBtn} disabled={isDeleting} onPress={() => handleDeleteStatus(activePost.id)} accessibilityRole="button" accessibilityLabel="Delete status">{isDeleting ? <ActivityIndicator color="#FFF" size="small" /> : <Trash2 color="#FFFFFF" size={20} />}</TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setViewerModalVisible(false); setProgress(0); setIsPaused(false); setViewersListModalVisible(false); }} accessibilityRole="button" accessibilityLabel="Close story viewer"><AppText style={s.viewerClose}>✕</AppText></TouchableOpacity>
            </View>
          </View>

          <View style={s.viewerContentContainer}>
            {hasActivePost ? (
              <>
                <Pressable style={s.touchZoneLeft} disabled={isDeleting || viewersListModalVisible} accessibilityRole="button" accessibilityLabel="Previous story" onPressIn={() => { pressStartTimeRef.current = Date.now(); setIsPaused(true); }} onPressOut={() => { setIsPaused(false); if (Date.now() - pressStartTimeRef.current < 200) handlePrevStory(); }} />
                <View style={s.statusTextWrapper} pointerEvents="none"><AppText style={s.viewerText}>{activePost.content}</AppText></View>
                <Pressable style={s.touchZoneRight} disabled={isDeleting || viewersListModalVisible} accessibilityRole="button" accessibilityLabel="Next story" onPressIn={() => { pressStartTimeRef.current = Date.now(); setIsPaused(true); }} onPressOut={() => { setIsPaused(false); if (Date.now() - pressStartTimeRef.current < 200) handleNextStory(); }} />
              </>
            ) : (
              <View style={s.statusTextWrapper}><AppText style={s.viewerText}>This story is no longer available.</AppText></View>
            )}
          </View>

          {isMyActiveStory && hasActivePost && (
            <TouchableOpacity style={s.analyticsFooterBar} onPress={() => { setIsPaused(true); setViewersListModalVisible(true); }}><Eye color="#FFFFFF" size={18} /><AppText style={s.analyticsText}>{viewersList.length} {viewersList.length === 1 ? 'view' : 'views'}</AppText></TouchableOpacity>
          )}

          {viewersListModalVisible && (
            <View style={s.analyticsModalOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => { setViewersListModalVisible(false); setIsPaused(false); }} />
              <View style={[s.analyticsModalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                <View style={s.sheetIndicatorBar} />
                <View style={s.analyticsModalHeader}>
                  <View style={s.analyticsTitleRow}>
                    <Eye color={RED} size={18} />
                    <AppText type="bold" style={s.analyticsModalTitle}>Viewer Activity</AppText>
                    <View style={s.viewerCountBadge}><AppText style={s.viewerCountBadgeText}>{viewersList.length}</AppText></View>
                  </View>
                  <TouchableOpacity style={s.sheetCloseBtn} onPress={() => { setViewersListModalVisible(false); setIsPaused(false); }} accessibilityRole="button" accessibilityLabel="Close viewer list"><X color={colors.tabBarInactive} size={18} /></TouchableOpacity>
                </View>
                <FlatList
                  data={viewersList}
                  keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
                  contentContainerStyle={s.viewersListScroll}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={s.emptyViewersContainer}>
                      <View style={s.emptyIconCircle}><Eye color={colors.textSecondary} size={24} /></View>
                      <AppText style={s.emptyViewersTitle}>No views yet</AppText>
                      <AppText style={s.emptyViewersSubtitle}>Check back later to see who has viewed your status.</AppText>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={s.viewerRow}>
                      {item.avatar ? <Image source={{ uri: item.avatar }} style={s.viewerRowAvatar} /> : (
                        <View style={s.viewerRowAvatarPlaceholder}><AppText style={s.viewerRowAvatarPlaceholderText}>{(item.name || 'M').charAt(0).toUpperCase()}</AppText></View>
                      )}
                      <View style={s.viewerRowInfo}>
                        <AppText type="bold" style={s.viewerRowName}>{item.name || 'Member'}</AppText>
                        <AppText style={s.viewerRowTime}>Viewed {formatTimeAgo(item.viewed_at)}</AppText>
                      </View>
                    </View>
                  )}
                />
              </View>
            </View>
          )}
        </LinearGradient>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  section: { marginBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 20, color: colors.text, letterSpacing: 0.5, marginBottom: 15 },
  flatListContent: { paddingLeft: 20, paddingRight: 20 },
  storyWrapper: { alignItems: 'center', marginHorizontal: 10, position: 'relative', width: 80 },
  gradientBorder: { width: 80, height: 80, borderRadius: 40, padding: 3 },
  myStatusContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  storyCircleInner: { flex: 1, borderRadius: 37, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  storyCircleInnerBlank: { flex: 1, borderRadius: 37, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
  innerGradient: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', borderRadius: 37, padding: 6 },
  storyPreviewText: { fontSize: 9, color: colors.text, textAlign: 'center', paddingHorizontal: 4 },
  storyName: { marginTop: 10, color: colors.text, fontSize: 11, fontWeight: '600', textAlign: 'center', width: 80 },
  floatingPlusBadge: { position: 'absolute', right: 0, top: 55, width: 22, height: 22, borderRadius: 11, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.background, zIndex: 5 },
  composerContainer: { flex: 1, paddingHorizontal: 25 },
  keyboardAvoidingFlex: { flex: 1, justifyContent: 'space-between' },
  composerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  composerCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  composerHeaderTitle: { color: '#FFF', fontSize: 18, letterSpacing: -0.3 },
  composerSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  disabledSendBtn: { opacity: 0.7 },
  composerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  composerInput: { width: '100%', fontSize: 24, textAlign: 'center', lineHeight: 36, fontWeight: '500', textAlignVertical: 'center', minHeight: 150, color: '#FFFFFF' },
  composerFooter: { alignItems: 'center', marginTop: 10 },
  composerFooterText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  paletteContainer: { marginBottom: 15 },
  paletteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingHorizontal: 5 },
  paletteTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 6, fontWeight: '600' },
  paletteScroll: { paddingVertical: 5 },
  paletteSwatchWrapper: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  paletteSwatchSelected: { borderColor: '#FFFFFF' },
  paletteSwatch: { width: 28, height: 28, borderRadius: 14 },
  viewerContainer: { flex: 1, paddingBottom: 10 },
  progressBarRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, height: 3 },
  progressBarBackground: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFFFFF' },
  viewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  viewerAuthorRow: { flexDirection: 'row', alignItems: 'center' },
  viewerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  viewerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  viewerAvatarPlaceholderText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  viewerAuthor: { color: '#FFFFFF', fontSize: 15, lineHeight: 18 },
  viewerTimestamp: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  viewerHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  viewerDeleteBtn: { marginRight: 15, padding: 5, width: 30, alignItems: 'center' },
  viewerClose: { color: '#FFFFFF', fontSize: 20, padding: 5 },
  viewerContentContainer: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  touchZoneLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', zIndex: 10 },
  touchZoneRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', zIndex: 10 },
  statusTextWrapper: { padding: 30, justifyContent: 'center', alignItems: 'center', width: '100%', zIndex: 5 },
  viewerText: { color: '#FFFFFF', fontSize: 24, textAlign: 'center', lineHeight: 36, fontWeight: '500' },
  analyticsFooterBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 20, borderRadius: 20, marginHorizontal: 24, marginBottom: 5 },
  analyticsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  analyticsModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 50 },
  analyticsModalContent: { backgroundColor: '#1A1528', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '65%', paddingHorizontal: 20, paddingTop: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sheetIndicatorBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 14 },
  analyticsModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 14 },
  analyticsTitleRow: { flexDirection: 'row', alignItems: 'center' },
  analyticsModalTitle: { fontSize: 17, color: '#FFFFFF', marginLeft: 8, letterSpacing: -0.2 },
  viewerCountBadge: { backgroundColor: 'rgba(225, 29, 72, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  viewerCountBadgeText: { color: RED, fontSize: 12, fontWeight: '700' },
  sheetCloseBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  viewersListScroll: { paddingVertical: 4 },
  emptyViewersContainer: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  emptyIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyViewersTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptyViewersSubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  viewerRowAvatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  viewerRowAvatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  viewerRowAvatarPlaceholderText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  viewerRowInfo: { flex: 1 },
  viewerRowName: { color: '#FFFFFF', fontSize: 15, lineHeight: 18, letterSpacing: -0.2 },
  viewerRowTime: { color: '#94A3B8', fontSize: 12, marginTop: 3 }
});
