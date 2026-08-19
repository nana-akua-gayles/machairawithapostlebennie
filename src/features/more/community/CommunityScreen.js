import React, { useEffect, useState, memo, useCallback, useRef, useMemo } from 'react';
import { ScrollView, StyleSheet, View, FlatList, TouchableOpacity, StatusBar, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, RefreshControl, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ChevronLeft, Users, ShieldCheck, Sparkles, X, CheckCircle2, Search, PlusCircle, RefreshCw } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { StorySection } from './StorySection';
import { supabase } from '../../../config/supabaseClient';
import { useTheme } from '../../../context/ThemeContext';

const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';
const STORAGE_KEY = '@viewed_statuses';

const AnimatedPressable = ({ children, style, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[style, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.8} delayPressIn={50} onPressIn={() => { scale.value = withSpring(0.95); }} onPressOut={() => scale.value = withSpring(1)} onPress={onPress}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

const ShortVideoItem = memo(({ item, index, navigation, shorts, currentUser, colors }) => {
  const player = useVideoPlayer(item.video_url, (p) => { p.loop = false; p.muted = true; p.pause(); });
  const s = getStyles(colors);
  return (
    <AnimatedPressable style={s.shortCard} onPress={() => navigation.navigate('ShortsViewerScreen', { shorts, initialIndex: index, currentUser })}>
      <View style={s.videoContainer}><VideoView player={player} style={s.absoluteVideo} contentFit="cover" nativeControls={false} /></View>
      <View style={s.shortOverlay}><View style={s.playIcon}><AppText style={{ color: 'white', fontSize: 10 }}>▶</AppText></View></View>
    </AnimatedPressable>
  );
});

const StudyGroupCard = memo(({ group, onJoin, onPressGroup, colors }) => {
  const [isJoined, setIsJoined] = useState(group.is_member || false);
  const [isJoining, setIsJoining] = useState(false);
  const [membersCount, setMembersCount] = useState(group.members_count || 0);
  const s = getStyles(colors);

  useEffect(() => { setIsJoined(group.is_member || false); setMembersCount(group.members_count || 0); }, [group.is_member, group.members_count]);

  const handleJoinPress = async () => {
    if (isJoining || isJoined) return;
    setIsJoining(true);
    try { const success = await onJoin(group.id); if (success) { setIsJoined(true); setMembersCount(prev => prev + 1); } }
    finally { setIsJoining(false); }
  };

  return (
    <AnimatedPressable style={s.studyGroupCard} onPress={() => onPressGroup(group)}>
      <View style={s.cardInner}>
        <View style={s.groupImagePlaceholder}>
          {group.group_icon ? <Image source={{ uri: group.group_icon }} style={s.groupImage} /> : <AppText type="bold" style={s.groupInitial}>{group.name ? group.name.charAt(0).toUpperCase() : 'G'}</AppText>}
          {group.unread_count > 0 && <View style={s.unreadBadgeAbsolute}><AppText type="bold" style={s.unreadBadgeText}>{group.unread_count > 99 ? '99+' : group.unread_count}</AppText></View>}
        </View>
        <View style={s.groupInfo}>
          <View style={s.titleRow}><AppText type="bold" numberOfLines={1} style={[s.groupTitle, group.unread_count > 0 && s.unreadTitle]}>{group.name}</AppText></View>
          <AppText style={s.groupMembers}>{membersCount} {membersCount === 1 ? 'member' : 'members'}</AppText>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={handleJoinPress} disabled={isJoined}>
          <View style={[s.joinBadge, isJoined && s.joinedBadge]}><AppText type="bold" style={[s.joinBadgeText, isJoined && s.joinedBadgeText]}>{isJoining ? '...' : isJoined ? 'Joined' : 'Join'}</AppText></View>
        </TouchableOpacity>
      </View>
    </AnimatedPressable>
  );
});

export const CommunityScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => getStyles(colors), [colors]);

  const [stories, setStories] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExploreModalVisible, setIsExploreModalVisible] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => { isMounted.current = true; loadViewedStatus(); fetchAllData(); return () => { isMounted.current = false; }; }, []);

  const loadViewedStatus = async () => {
    try { const stored = await AsyncStorage.getItem(STORAGE_KEY); if (stored && isMounted.current) setViewedIds(new Set(JSON.parse(stored))); }
    catch (err) { console.error('Failed to load viewed statuses:', err); }
  };

  const markAsViewed = async (postIds) => {
    let updated = false;
    const newSet = new Set(viewedIds);
    postIds.forEach(id => { if (!newSet.has(id)) { newSet.add(id); updated = true; } });
    if (updated) { setViewedIds(newSet); try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet))); } catch (err) { console.error('Failed to save viewed status:', err); } }
  };

  const fetchAllData = async () => {
    setErrorBanner(null);
    try {
      const now = new Date().toISOString();
      let activeUser = currentUser;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        activeUser = profileData || session.user;
        if (isMounted.current) setCurrentUser(activeUser);
      }

      const [storyRes, shortRes, groupRes] = await Promise.all([
        supabase.from('statuses').select(`id, content, created_at, expires_at, user_id, name, viewers, background, profiles:user_id (avatar_url, name)`).gt('expires_at', now),
        supabase.from('shorts').select('*').order('created_at', { ascending: false }).range(0, 4),
        supabase.from('groups').select('*').order('created_at', { ascending: false })
      ]);

      if (storyRes.error) throw storyRes.error;
      if (shortRes.error) throw shortRes.error;
      if (groupRes.error) throw groupRes.error;

      let fetchedGroups = groupRes.data || [];
      if (fetchedGroups.length > 0) {
        const groupIds = fetchedGroups.map(g => g.id);
        const membershipsRes = activeUser ? await supabase.from('group_members').select('group_id').eq('user_id', activeUser.id).in('group_id', groupIds) : { data: [] };
        const joinedGroupIds = new Set((membershipsRes.data || []).map(m => m.group_id));
        let unreadCountMap = {};
        if (activeUser && joinedGroupIds.size > 0) {
          const { data: unreadRows, error: unreadErr } = await supabase.rpc('get_group_unread_counts', { p_user_id: activeUser.id, p_group_ids: Array.from(joinedGroupIds) });
          if (unreadErr) console.error('Failed to load unread counts:', unreadErr);
          else (unreadRows || []).forEach(r => { unreadCountMap[r.group_id] = r.unread_count; });
        }
        fetchedGroups = fetchedGroups.map(g => ({ ...g, is_member: joinedGroupIds.has(g.id), members_count: g.members_count || 0, unread_count: unreadCountMap[g.id] || 0 }));
      }

      if (isMounted.current) {
        const formattedStories = (storyRes.data || []).map((item) => ({ ...item, avatar_url: item.profiles?.avatar_url || null, user_name: item.profiles?.name || item.name || 'Member' }));
        setStories(formattedStories); setShorts(shortRes.data || []); setGroups(fetchedGroups);
      }
    } catch (err) {
      console.error('Error fetching community data:', err);
      if (isMounted.current) setErrorBanner('Could not load community updates. Check your connection.');
    }
  };

  const onRefresh = useCallback(async () => { if (!isMounted.current) return; setRefreshing(true); await fetchAllData(); if (isMounted.current) setRefreshing(false); }, []);

  const groupedStories = useMemo(() => {
    const map = {};
    stories.forEach((item) => {
      const userId = item.user_id;
      const rawAvatar = item.avatar_url && item.avatar_url.trim() !== '' ? item.avatar_url : null;
      const avatarUrl = rawAvatar || (userId === currentUser?.id ? currentUser?.avatar_url : null);
      if (!map[userId]) map[userId] = { user_id: userId, user_name: item.user_name || item.name || 'Member', user_avatar: avatarUrl, posts: [] };
      else if (!map[userId].user_avatar && avatarUrl) map[userId].user_avatar = avatarUrl;
      map[userId].posts.push(item);
    });
    return Object.values(map);
  }, [stories, currentUser]);

  const myUserId = currentUser?.id;
  const myGroupIndex = groupedStories.findIndex((g) => g.user_id === myUserId);
  const hasMyStory = myGroupIndex !== -1 && groupedStories[myGroupIndex].posts.length > 0;
  const myGroup = hasMyStory ? groupedStories[myGroupIndex] : null;

  const sortedOtherStories = useMemo(() => {
    const others = groupedStories.filter((g) => g.user_id !== myUserId);
    return others.sort((a, b) => {
      const aHasUnviewed = a.posts.some((p) => !viewedIds.has(p.id));
      const bHasUnviewed = b.posts.some((p) => !viewedIds.has(p.id));
      if (aHasUnviewed === bHasUnviewed) return 0;
      return aHasUnviewed ? -1 : 1;
    });
  }, [groupedStories, myUserId, viewedIds]);

  const displayGroups = useMemo(() => myGroup ? [myGroup, ...sortedOtherStories] : sortedOtherStories, [myGroup, sortedOtherStories]);

  const handleStoryPress = (group) => { if (group && group.posts) markAsViewed(group.posts.map(p => p.id)); };

  const handleCreateStory = async (content, backgroundColors) => {
    if (!currentUser) { Alert.alert('Error', 'You must be logged in to share a story.'); return; }
    const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
    const authorName = currentUser.name || currentUser.email || 'Member';
    const { error } = await supabase.from('statuses').insert([{ content, name: authorName, user_id: currentUser.id, expires_at: expiresAt, background: backgroundColors }]);
    if (error) Alert.alert('Error', error.message); else fetchAllData();
  };

  const handleDeleteStory = async (storyId) => {
    const { error } = await supabase.from('statuses').delete().eq('id', storyId);
    if (error) Alert.alert('Error', error.message); else fetchAllData();
  };

  const handleJoinGroup = async (groupId) => {
    if (!currentUser) { Alert.alert('Notice', 'Please log in to join groups.'); return false; }
    const { error } = await supabase.from('group_members').insert([{ group_id: groupId, user_id: currentUser.id }]);
    if (error) { if (error.code === '23505') { Alert.alert('Notice', 'You are already a member of this page.'); return true; } Alert.alert('Error', 'Could not join group. Please try again.'); return false; }
    Alert.alert('Success', 'You have successfully joined the group.'); return true;
  };

  const handlePressGroup = (group) => { navigation.navigate('GroupDetailScreen', { group, currentUser }); };

  const handleCreateGroup = async () => {
    const trimmedName = newGroupName.trim();
    const trimmedDesc = newGroupDescription.trim();
    if (!trimmedName) { Alert.alert('Error', 'Please enter a name for the faith discussion group.'); return; }
    if (trimmedName.length > 50) { Alert.alert('Error', 'Group name must be under 50 characters.'); return; }
    if (trimmedDesc.length > 250) { Alert.alert('Error', 'Description must be under 250 characters.'); return; }
    if (!currentUser) { Alert.alert('Notice', 'Please log in to create a discussion group.'); return; }

    setIsCreating(true);
    try {
      const { data: newGroup, error } = await supabase.from('groups').insert([{ name: trimmedName, description: trimmedDesc, created_by: currentUser.id }]).select().single();
      if (error) throw error;
      if (newGroup) await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: currentUser.id }]);
      if (isMounted.current) setModalStep(3);
      fetchAllData();
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', 'Could not create the group. Please check your database policies.');
    } finally { if (isMounted.current) setIsCreating(false); }
  };

  const handleCloseSuccessModal = () => { setIsModalVisible(false); setNewGroupName(''); setNewGroupDescription(''); setModalStep(1); };
  const openCreationFlow = () => { setModalStep(1); setIsModalVisible(true); };
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => group.name && group.name.toLowerCase().includes(q));
  }, [groups, searchQuery]);
  const displayedGroups = useMemo(() => groups.slice(0, 4), [groups]);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={isDark ? ['#0d0a12', '#000000'] : [DEEP_PURPLE, '#1a1424']} style={s.headerBackground} />
      <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()}><ChevronLeft color="white" size={32} /></TouchableOpacity>
      <AppText type="bold" style={s.header}>The CommonwealthFold</AppText>

      <View style={s.mainLayer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}>
          {errorBanner && (
            <View style={s.errorBanner}>
              <AppText style={s.errorText}>{errorBanner}</AppText>
              <TouchableOpacity onPress={fetchAllData} style={s.retryButton}><RefreshCw color={RED} size={14} /><AppText style={s.retryText}>Retry</AppText></TouchableOpacity>
            </View>
          )}

          <StorySection
            displayGroups={displayGroups} myGroup={myGroup} hasMyStory={hasMyStory} viewedIds={viewedIds} currentUser={currentUser}
            onCreateStoryPress={handleCreateStory} onStoryPress={handleStoryPress} onDeleteStory={handleDeleteStory}
            onRecordView={async (payload) => {
              try {
                const targetStatusId = payload?.p_status_id || payload?.statusId || payload?.id;
                const targetUserId = payload?.p_user_id || payload?.userId || currentUser?.id;
                if (!targetStatusId || !targetUserId) { console.warn('Missing status or user ID in payload:', payload); return; }
                const { error } = await supabase.rpc('record_status_view', {
                  p_status_id: targetStatusId,
                  p_user_id: targetUserId,
                  p_name: payload?.p_name || payload?.name || currentUser?.name || 'Member',
                  p_avatar: payload?.p_avatar || payload?.avatar || currentUser?.avatar_url || null
                });
                if (error) { console.error('Failed to record status view:', error); return; }
                fetchAllData();
              } catch (err) { console.error('Unexpected error in onRecordView:', err); }
            }}
          />

          <View style={s.section}>
            <AppText type="bold" style={[s.sectionTitle, { paddingHorizontal: 30 }]}>Apostolic Shorts</AppText>
            <FlatList horizontal showsHorizontalScrollIndicator={false} data={shorts} keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} contentContainerStyle={{ paddingLeft: 30, paddingRight: 30 }} keyboardShouldPersistTaps="handled" directionalLockEnabled initialNumToRender={5} maxToRenderPerBatch={5} windowSize={3} removeClippedSubviews
              renderItem={({ item, index }) => <ShortVideoItem item={item} index={index} navigation={navigation} shorts={shorts} currentUser={currentUser} colors={colors} />} />
          </View>

          <View style={s.groupSection}>
            <View style={[s.row, { paddingHorizontal: 30 }]}>
              <AppText type="bold" style={s.sectionTitle}>Faith Forums</AppText>
              {groups.length > 4 && <TouchableOpacity onPress={() => { setSearchQuery(''); setIsExploreModalVisible(true); }}><AppText style={s.seeAllBtn}>See All</AppText></TouchableOpacity>}
            </View>

            <View style={{ paddingHorizontal: 30, marginTop: 16 }}>
              <AnimatedPressable style={s.createCardBanner} onPress={openCreationFlow}>
                <View style={s.createBannerContent}>
                  <View style={s.createIconCircle}><PlusCircle color={RED} size={24} /></View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <AppText type="bold" style={s.createBannerTitle}>Start a New Page</AppText>
                    <AppText style={s.createBannerSubtitle}>Create a space for collective growth</AppText>
                  </View>
                </View>
              </AnimatedPressable>
            </View>

            <FlatList data={displayedGroups} keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} scrollEnabled={false} contentContainerStyle={{ paddingHorizontal: 30 }} initialNumToRender={4} maxToRenderPerBatch={4} removeClippedSubviews
              ListEmptyComponent={<AppText style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No active discussion groups yet.</AppText>}
              renderItem={({ item: group }) => <StudyGroupCard group={group} onJoin={handleJoinGroup} onPressGroup={handlePressGroup} colors={colors} />} />
          </View>
        </ScrollView>
      </View>

      <Modal visible={isExploreModalVisible} animationType="slide" transparent onRequestClose={() => setIsExploreModalVisible(false)}>
        <View style={s.exploreOverlay}>
          <View style={s.exploreContainer}>
            <View style={s.exploreHeader}>
              <AppText type="bold" style={{ fontSize: 22, color: colors.text }}>Explore Fellowships</AppText>
              <TouchableOpacity onPress={() => setIsExploreModalVisible(false)} style={s.closeIconButton}><X color={colors.textSecondary} size={22} /></TouchableOpacity>
            </View>
            <View style={[s.searchContainer, { marginBottom: 20 }]}>
              <Search color={colors.textSecondary} size={18} style={s.searchIcon} />
              <TextInput style={s.searchInput} placeholder="Search all fellowships..." placeholderTextColor={colors.textSecondary} value={searchQuery} onChangeText={setSearchQuery} autoFocus={false} />
            </View>
            <FlatList data={filteredGroups} keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} initialNumToRender={6} maxToRenderPerBatch={6} removeClippedSubviews
              ListEmptyComponent={<AppText style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>No matches found.</AppText>}
              renderItem={({ item: group }) => <StudyGroupCard group={group} onJoin={handleJoinGroup} onPressGroup={(g) => { setIsExploreModalVisible(false); handlePressGroup(g); }} colors={colors} />} />
          </View>
        </View>
      </Modal>

      <Modal visible={isModalVisible} animationType="fade" transparent onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={s.modalScrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={[s.modernCard, { paddingVertical: 32, paddingHorizontal: 28 }]}>
                {modalStep !== 3 && (
                  <View style={s.modalHeaderRow}>
                    <View style={[s.iconBadge, { width: 52, height: 52, borderRadius: 26 }]}>{modalStep === 1 ? <Sparkles color={RED} size={26} /> : <Users color={RED} size={26} />}</View>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[s.closeIconButton, { width: 42, height: 42, borderRadius: 21 }]}><X color={colors.textSecondary} size={22} /></TouchableOpacity>
                  </View>
                )}

                {modalStep === 1 && (
                  <View>
                    <AppText type="bold" style={[s.modernTitle, { fontSize: 23, marginBottom: 10 }]}>Start a Fellowship</AppText>
                    <AppText style={[s.modernSubtitle, { fontSize: 16, lineHeight: 24, marginBottom: 24 }]}>Create a sacred space for collective growth, prayer, and deep scriptural exploration.</AppText>
                    <View style={[s.perkContainer, { padding: 20, marginBottom: 28 }]}>
                      <View style={[s.perkRow, { marginBottom: 16 }]}><Users color={colors.text} size={24} style={s.perkIcon} /><AppText style={[s.perkText, { fontSize: 15, lineHeight: 22 }]}>Connect believers around specific spiritual topics.</AppText></View>
                      <View style={s.perkRow}><ShieldCheck color={colors.text} size={24} style={s.perkIcon} /><AppText style={[s.perkText, { fontSize: 15, lineHeight: 22 }]}>Foster an edifying environment that honors our core values.</AppText></View>
                    </View>
                    <TouchableOpacity style={[s.primaryActionButton, { paddingVertical: 18 }]} onPress={() => setModalStep(2)}><AppText style={[s.primaryActionText, { fontSize: 18 }]}>Get Started</AppText></TouchableOpacity>
                  </View>
                )}

                {modalStep === 2 && (
                  <View>
                    <AppText type="bold" style={[s.modernTitle, { fontSize: 23, marginBottom: 8 }]}>Fellowship Details</AppText>
                    <AppText style={[s.modernSubtitle, { fontSize: 15, lineHeight: 22, marginBottom: 20 }]}>Give your group an inviting title and description so members know what to expect.</AppText>
                    <AppText style={s.inputLabel}>Group Name</AppText>
                    <TextInput style={[s.modernInput, { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 }]} placeholder="e.g., Morning Prayer & Intercession" placeholderTextColor={colors.textSecondary} value={newGroupName} onChangeText={setNewGroupName} />
                    <AppText style={s.inputLabel}>Description</AppText>
                    <TextInput style={[s.modernInput, s.textArea, { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, marginBottom: 28 }]} placeholder="What is the mission or focus of this group?" placeholderTextColor={colors.textSecondary} value={newGroupDescription} onChangeText={setNewGroupDescription} multiline numberOfLines={3} />
                    <View style={s.modernActionRow}>
                      <TouchableOpacity style={[s.secondaryActionButton, { paddingVertical: 18, paddingHorizontal: 28 }]} onPress={() => setModalStep(1)}><AppText style={[s.secondaryActionText, { fontSize: 16 }]}>Back</AppText></TouchableOpacity>
                      <TouchableOpacity style={[s.primaryActionButton, { flex: 1, marginLeft: 12, marginTop: 0, paddingVertical: 18 }, isCreating && { opacity: 0.7 }]} onPress={handleCreateGroup} disabled={isCreating}><AppText style={[s.primaryActionText, { fontSize: 18 }]}>{isCreating ? 'Creating...' : 'Create Group'}</AppText></TouchableOpacity>
                    </View>
                  </View>
                )}

                {modalStep === 3 && (
                  <View style={s.successContainer}>
                    <View style={s.successIconBadge}><CheckCircle2 color={RED} size={42} /></View>
                    <AppText type="bold" style={[s.modernTitle, { fontSize: 22, textAlign: 'center', marginBottom: 8 }]}>Fellowship Created!</AppText>
                    <AppText style={[s.modernSubtitle, { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 }]}>"{newGroupName.trim()}" is now live. Believers can join your gathering and start interacting.</AppText>
                    <TouchableOpacity style={[s.primaryActionButton, { width: '100%', paddingVertical: 18 }]} onPress={handleCloseSuccessModal}><AppText style={[s.primaryActionText, { fontSize: 18 }]}>View in Discussions</AppText></TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerBackground: { position: 'absolute', top: 0, width: '100%', height: 260 },
  backButton: { position: 'absolute', top: 50, left: 20, width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  header: { fontSize: 23, color: '#FFF', paddingHorizontal: 30, marginTop: 120, marginBottom: 30, letterSpacing: -0.5 },
  mainLayer: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 40, overflow: 'hidden' },
  scrollContent: { paddingBottom: 80 },
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, marginHorizontal: 30, padding: 12, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  errorText: { color: RED, fontSize: 13, flex: 1 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  retryText: { color: RED, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  section: { marginBottom: 40 },
  groupSection: { marginBottom: 80 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  sectionTitle: { fontSize: 20, color: colors.text, letterSpacing: 0.5 },
  seeAllBtn: { color: colors.text, fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  createCardBanner: { backgroundColor: colors.card, borderRadius: 30, borderWidth: 1, borderColor: colors.border, padding: 18, shadowColor: RED, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 25 },
  createBannerContent: { flexDirection: 'row', alignItems: 'center' },
  createIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', shadowColor: RED, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  createBannerTitle: { fontSize: 16, color: RED },
  createBannerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: colors.text },
  shortCard: { width: 115, height: 175, borderRadius: 24, backgroundColor: DEEP_PURPLE, marginTop: 15, marginRight: 15, overflow: 'hidden' },
  videoContainer: { width: '100%', height: '100%', overflow: 'hidden' },
  absoluteVideo: { position: 'absolute', top: 0, left: '-35%', right: '-20%', bottom: '-20%', width: '140%', height: '140%' },
  shortOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  playIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  studyGroupCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, marginBottom: 8 },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  groupImagePlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(225, 29, 72, 0.2)', overflow: 'visible' },
  groupImage: { width: '100%', height: '100%', borderRadius: 22 },
  groupInitial: { fontSize: 18, color: RED },
  groupInfo: { marginLeft: 14, flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  groupTitle: { fontSize: 15, color: colors.text },
  unreadTitle: { fontWeight: '800' },
  groupMembers: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  unreadBadgeAbsolute: { position: 'absolute', top: -4, right: -4, backgroundColor: RED, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.card, zIndex: 5 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  joinBadge: { backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinBadgeText: { fontSize: 13, color: '#FFF' },
  joinedBadge: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  joinedBadgeText: { color: colors.textSecondary },
  exploreOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  exploreContainer: { backgroundColor: colors.background, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, height: '80%' },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalScrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  modernCard: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 36, padding: 28, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  iconBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  closeIconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  modernTitle: { fontSize: 23, color: colors.text, marginBottom: 10, letterSpacing: -0.5 },
  modernSubtitle: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: 24 },
  perkContainer: { backgroundColor: colors.background, borderRadius: 24, padding: 20, marginBottom: 28 },
  perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  perkIcon: { marginRight: 16 },
  perkText: { flex: 1, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  modernInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, fontSize: 17, color: colors.text },
  textArea: { height: 90, textAlignVertical: 'top' },
  primaryActionButton: { backgroundColor: RED, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 4, shadowColor: RED, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  primaryActionText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modernActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  secondaryActionButton: { backgroundColor: colors.background, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  successContainer: { alignItems: 'center', paddingVertical: 10 },
  successIconBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});
