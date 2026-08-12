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

const ShortVideoItem = memo(({ item, index, navigation, shorts, currentUser }) => {
  const player = useVideoPlayer(item.video_url, (playerInstance) => {
    playerInstance.loop = false;
    playerInstance.muted = true;
    playerInstance.pause();
  });

  return (
    <AnimatedPressable style={styles.shortCard} onPress={() => navigation.navigate('ShortsViewerScreen', { shorts, initialIndex: index, currentUser })}>
      <View style={styles.videoContainer}>
        <VideoView player={player} style={styles.absoluteVideo} contentFit="cover" nativeControls={false} />
      </View>
      <View style={styles.shortOverlay}>
        <View style={styles.playIcon}><AppText style={{color: 'white', fontSize: 10}}>▶</AppText></View>
      </View>
    </AnimatedPressable>
  );
});

const StudyGroupCard = memo(({ group, onJoin, onPressGroup }) => {
  const [isJoined, setIsJoined] = useState(group.is_member || false);
  const [isJoining, setIsJoining] = useState(false);
  const [membersCount, setMembersCount] = useState(group.members_count || 0);

  useEffect(() => {
    setIsJoined(group.is_member || false);
    setMembersCount(group.members_count || 0);
  }, [group.is_member, group.members_count]);

  const handleJoinPress = async () => {
    if (isJoining || isJoined) return;
    setIsJoining(true);
    try {
      const success = await onJoin(group.id);
      if (success) {
        setIsJoined(true);
        setMembersCount(prev => prev + 1);
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <AnimatedPressable style={styles.studyGroupCard} onPress={() => onPressGroup(group)}>
      <View style={styles.cardInner}>
        <View style={styles.groupImagePlaceholder}>
          {group.group_icon ? (
            <Image source={{ uri: group.group_icon }} style={styles.groupImage} />
          ) : (
            <AppText type="bold" style={styles.groupInitial}>
              {group.name ? group.name.charAt(0).toUpperCase() : 'G'}
            </AppText>
          )}
          {group.unread_count > 0 && (
            <View style={styles.unreadBadgeAbsolute}>
              <AppText type="bold" style={styles.unreadBadgeText}>
                {group.unread_count > 99 ? '99+' : group.unread_count}
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.titleRow}>
            <AppText type="bold" numberOfLines={1} style={[styles.groupTitle, group.unread_count > 0 && styles.unreadTitle]}>{group.name}</AppText>
          </View>
          <AppText style={styles.groupMembers}>
            {membersCount} {membersCount === 1 ? 'member' : 'members'}
          </AppText>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={handleJoinPress} disabled={isJoined}>
          <View style={[styles.joinBadge, isJoined && styles.joinedBadge]}>
            <AppText type="bold" style={[styles.joinBadgeText, isJoined && styles.joinedBadgeText]}>
              {isJoining ? '...' : isJoined ? 'Joined' : 'Join'}
            </AppText>
          </View>
        </TouchableOpacity>
      </View>
    </AnimatedPressable>
  );
});

export const CommunityScreen = ({ navigation }) => {
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

  useEffect(() => {
    isMounted.current = true;
    loadViewedStatus();
    fetchAllData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadViewedStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && isMounted.current) {
        setViewedIds(new Set(JSON.parse(stored)));
      }
    } catch (err) {
      console.error('Failed to load viewed statuses:', err);
    }
  };

  const markAsViewed = async (postIds) => {
    let updated = false;
    const newSet = new Set(viewedIds);
    postIds.forEach(id => {
      if (!newSet.has(id)) {
        newSet.add(id);
        updated = true;
      }
    });
    if (updated) {
      setViewedIds(newSet);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
      } catch (err) {
        console.error('Failed to save viewed status:', err);
      }
    }
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
        if (isMounted.current) {
          setCurrentUser(activeUser);
        }
      }

      await supabase.from('statuses').delete().lt('expires_at', now);

      const [storyRes, shortRes, groupRes] = await Promise.all([
        supabase.from('statuses').select(`
          id,
          content,
          created_at,
          expires_at,
          user_id,
          name,
          viewers,
          background,
          profiles:user_id (
            avatar_url,
            name
          )
        `).gt('expires_at', now),
        supabase.from('shorts').select('*').order('created_at', { ascending: false }).range(0, 4),
        supabase.from('groups').select('*').order('created_at', { ascending: false })
      ]);

      if (storyRes.error) throw storyRes.error;
      if (shortRes.error) throw shortRes.error;
      if (groupRes.error) throw groupRes.error;

      let fetchedGroups = groupRes.data || [];

      if (fetchedGroups.length > 0) {
        const groupIds = fetchedGroups.map(g => g.id);

        const membershipsRes = activeUser
          ? await supabase.from('group_members').select('group_id').eq('user_id', activeUser.id).in('group_id', groupIds)
          : { data: [] };

        const joinedGroupIds = new Set((membershipsRes.data || []).map(m => m.group_id));

        let unreadCountMap = {};
        fetchedGroups = fetchedGroups.map(g => ({
          ...g,
          is_member: joinedGroupIds.has(g.id),
          members_count: g.members_count || 0,
          unread_count: unreadCountMap[g.id] || 0
        }));
      }

      if (isMounted.current) {
        const formattedStories = (storyRes.data || []).map((item) => ({
          ...item,
          avatar_url: item.profiles?.avatar_url || null,
          user_name: item.profiles?.name || item.name || 'Member',
        }));

        setStories(formattedStories);
        setShorts(shortRes.data || []);
        setGroups(fetchedGroups);
      }
    } catch (err) {
      console.error('Error fetching community data:', err);
      if (isMounted.current) {
        setErrorBanner('Could not load community updates. Check your connection.');
      }
    }
  };

  const onRefresh = useCallback(async () => {
    if (!isMounted.current) return;
    setRefreshing(true);
    await fetchAllData();
    if (isMounted.current) {
      setRefreshing(false);
    }
  }, []);

  const groupedStories = useMemo(() => {
    const map = {};
    stories.forEach((item) => {
      const userId = item.user_id;
      const rawAvatar = item.avatar_url && item.avatar_url.trim() !== '' ? item.avatar_url : null;
      const avatarUrl = rawAvatar || (userId === currentUser?.id ? currentUser?.avatar_url : null);

      if (!map[userId]) {
        map[userId] = {
          user_id: userId,
          user_name: item.user_name || item.name || 'Member',
          user_avatar: avatarUrl,
          posts: [],
        };
      } else if (!map[userId].user_avatar && avatarUrl) {
        map[userId].user_avatar = avatarUrl;
      }
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

  const displayGroups = useMemo(() => {
    return myGroup ? [myGroup, ...sortedOtherStories] : sortedOtherStories;
  }, [myGroup, sortedOtherStories]);

  const handleStoryPress = (group) => {
    if (group && group.posts) {
      markAsViewed(group.posts.map(p => p.id));
    }
  };

  const handleCreateStory = async (content, backgroundColors) => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to share a story.');
      return;
    }
    const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
    const authorName = currentUser.name || currentUser.email || 'Member';

    const { error } = await supabase.from('statuses').insert([
      {  
        content, 
        name: authorName,
        user_id: currentUser.id,
        expires_at: expiresAt,
        background: backgroundColors 
      }
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchAllData();
    }
  };



  const handleDeleteStory = async (storyId) => {
    const { error } = await supabase.from('statuses').delete().eq('id', storyId);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      fetchAllData();
    }
  };

  const handleJoinGroup = async (groupId) => {
    if (!currentUser) {
      Alert.alert('Notice', 'Please log in to join groups.');
      return false;
    }

    const { error } = await supabase.from('group_members').insert([{ group_id: groupId, user_id: currentUser.id }]);
    
    if (error) {
      if (error.code === '23505') {
        Alert.alert('Notice', 'You are already a member of this page.');
        return true;
      }
      Alert.alert('Error', 'Could not join group. Please try again.');
      return false;
    } else {
      Alert.alert('Success', 'You have successfully joined the group.');
      return true;
    }
  };

  const handlePressGroup = (group) => {
    navigation.navigate('GroupDetailScreen', { 
      group, 
      currentUser
    });
  };

  const handleCreateGroup = async () => {
    const trimmedName = newGroupName.trim();
    const trimmedDesc = newGroupDescription.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a name for the faith discussion group.');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Error', 'Group name must be under 50 characters.');
      return;
    }

    if (trimmedDesc.length > 250) {
      Alert.alert('Error', 'Description must be under 250 characters.');
      return;
    }

    if (!currentUser) {
      Alert.alert('Notice', 'Please log in to create a discussion group.');
      return;
    }

    setIsCreating(true);

    try {
      const { data: newGroup, error } = await supabase.from('groups').insert([
        { 
          name: trimmedName,
          description: trimmedDesc,
          created_by: currentUser.id 
        }
      ]).select().single();
      
      if (error) throw error;

      if (newGroup) {
        await supabase.from('group_members').insert([{ group_id: newGroup.id, user_id: currentUser.id }]);
      }

      if (isMounted.current) {
        setModalStep(3);
      }
      fetchAllData();
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', 'Could not create the group. Please check your database policies.');
    } finally {
      if (isMounted.current) {
        setIsCreating(false);
      }
    }
  };

  const handleCloseSuccessModal = () => {
    setIsModalVisible(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setModalStep(1); 
  };

  const openCreationFlow = () => {
    setModalStep(1);
    setIsModalVisible(true);
  };

  const filteredGroups = groups.filter((group) => 
    group.name && group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedGroups = groups.slice(0, 4);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={[DEEP_PURPLE, '#1a1424']} style={styles.headerBackground} />
      
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ChevronLeft color="white" size={32} />
      </TouchableOpacity>
      
      <AppText type="bold" style={styles.header}>The CommonwealthFold</AppText>

      <View style={styles.mainLayer}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
        >        
          {errorBanner && (
            <View style={styles.errorBanner}>
              <AppText style={styles.errorText}>{errorBanner}</AppText>
              <TouchableOpacity onPress={fetchAllData} style={styles.retryButton}>
                <RefreshCw color={RED} size={14} />
                <AppText style={styles.retryText}>Retry</AppText>
              </TouchableOpacity>
            </View>
          )}

          <StorySection 
            displayGroups={displayGroups}
            myGroup={myGroup}
            hasMyStory={hasMyStory}
            viewedIds={viewedIds}
            currentUser={currentUser}
            onCreateStoryPress={handleCreateStory}
            onStoryPress={handleStoryPress}
            onDeleteStory={handleDeleteStory}
            onRecordView={async (payload) => {
            try {
              const targetStatusId = payload?.p_status_id || payload?.statusId || payload?.id;
              const targetUserId = payload?.p_user_id || payload?.userId || currentUser?.id;
              
              if (!targetStatusId) {
                console.warn('Missing status ID in payload:', payload);
                return;
              }

              // 1. Fetch current viewers
              const { data: postData, error: fetchError } = await supabase
                .from('statuses')
                .select('viewers')
                .eq('id', targetStatusId)
                .single();

              if (fetchError) {
                console.error('Supabase Fetch Error:', fetchError);
                return;
              }

              const currentViewers = Array.isArray(postData?.viewers) ? postData.viewers : [];
              const alreadyViewed = currentViewers.some(v => v.id === targetUserId);

              if (!alreadyViewed) {
                const updatedViewers = [
                  ...currentViewers,
                  {
                    id: targetUserId,
                    name: payload?.p_name || payload?.name || currentUser?.name || 'Member',
                    avatar: payload?.p_avatar || payload?.avatar || currentUser?.avatar_url || null,
                    viewed_at: new Date().toISOString()
                  }
                ];

                const { data: updateData, error: updateError } = await supabase
                  .from('statuses')
                  .update({ viewers: updatedViewers })
                  .eq('id', targetStatusId)
                  .select(); 

                if (updateError) {
                  console.error('Supabase Update Error:', updateError);
                  return;
                }

                console.log('Successfully recorded view in Supabase:', updateData);
              }
              
              if (typeof fetchAllData === 'function') {
                fetchAllData();
              }
            } catch (err) {
              console.error('Unexpected error in onRecordView:', err);
            }
          }}
                    />

          <View style={styles.section}>
            <AppText type="bold" style={[styles.sectionTitle, {paddingHorizontal: 30}]}>Apostolic Shorts</AppText>
            <FlatList 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              data={shorts} 
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} 
              contentContainerStyle={{ paddingLeft: 30, paddingRight: 30 }} 
              keyboardShouldPersistTaps="handled" 
              directionalLockEnabled={true} 
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={3}
              removeClippedSubviews={true}
              renderItem={({ item, index }) => (
                <ShortVideoItem 
                  item={item} 
                  index={index} 
                  navigation={navigation} 
                  shorts={shorts} 
                  currentUser={currentUser} 
                />
              )} 
            />
          </View>

          <View style={styles.groupSection}>
            <View style={[styles.row, {paddingHorizontal: 30}]}>
              <AppText type="bold" style={styles.sectionTitle}>Faith Forums</AppText>
              
              {groups.length > 4 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setIsExploreModalVisible(true); }}>
                  <AppText style={styles.seeAllBtn}>See All</AppText>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={{ paddingHorizontal: 30, marginTop: 16 }}>
              <AnimatedPressable style={styles.createCardBanner} onPress={openCreationFlow}>
                <View style={styles.createBannerContent}>
                  <View style={styles.createIconCircle}>
                    <PlusCircle color={RED} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <AppText type="bold" style={styles.createBannerTitle}>Start a New Page</AppText>
                    <AppText style={styles.createBannerSubtitle}>Create a space for collective growth</AppText>
                  </View>
                </View>
              </AnimatedPressable>
            </View>

            <FlatList
              data={displayedGroups}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 30 }}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              removeClippedSubviews={true}
              ListEmptyComponent={<AppText style={{ color: '#64748B', fontStyle: 'italic' }}>No active discussion groups yet.</AppText>}
              renderItem={({ item: group }) => (
                <StudyGroupCard group={group} onJoin={handleJoinGroup} onPressGroup={handlePressGroup} />
              )}
            />
          </View>
        </ScrollView>
      </View>

      <Modal visible={isExploreModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsExploreModalVisible(false)}>
        <View style={styles.exploreOverlay}>
          <View style={styles.exploreContainer}>
            <View style={styles.exploreHeader}>
              <AppText type="bold" style={{ fontSize: 22, color: DEEP_PURPLE }}>Explore Fellowships</AppText>
              <TouchableOpacity onPress={() => setIsExploreModalVisible(false)} style={styles.closeIconButton}>
                <X color="#64748B" size={22} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { marginBottom: 20 }]}>
              <Search color="#94A3B8" size={18} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search all fellowships..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
            </View>

            <FlatList
              data={filteredGroups}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              removeClippedSubviews={true}
              ListEmptyComponent={<AppText style={{ color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 20 }}>No matches found.</AppText>}
              renderItem={({ item: group }) => (
                <StudyGroupCard 
                  group={group} 
                  onJoin={handleJoinGroup} 
                  onPressGroup={(g) => { setIsExploreModalVisible(false); handlePressGroup(g); }} 
                />
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={isModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.modalScrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
              <View style={[styles.modernCard, { paddingVertical: 32, paddingHorizontal: 28 }]}>
                
                {modalStep !== 3 && (
                  <View style={styles.modalHeaderRow}>
                    <View style={[styles.iconBadge, { width: 52, height: 52, borderRadius: 26 }]}>
                      {modalStep === 1 ? <Sparkles color={RED} size={26} /> : <Users color={RED} size={26} />}
                    </View>
                    <TouchableOpacity onPress={() => setIsModalVisible(false)} style={[styles.closeIconButton, { width: 42, height: 42, borderRadius: 21 }]}>
                      <X color="#64748B" size={22} />
                    </TouchableOpacity>
                  </View>
                )}

                {modalStep === 1 && (
                  <View>
                    <AppText type="bold" style={[styles.modernTitle, { fontSize: 26, marginBottom: 10 }]}>Start a Fellowship</AppText>
                    <AppText style={[styles.modernSubtitle, { fontSize: 16, lineHeight: 24, marginBottom: 24 }]}>Create a sacred space for collective growth, prayer, and deep scriptural exploration.</AppText>

                    <View style={[styles.perkContainer, { padding: 20, marginBottom: 28 }]}>
                      <View style={[styles.perkRow, { marginBottom: 16 }]}>
                        <Users color={DEEP_PURPLE} size={24} style={styles.perkIcon} />
                        <AppText style={[styles.perkText, { fontSize: 15, lineHeight: 22 }]}>Connect believers around specific spiritual topics.</AppText>
                      </View>
                      <View style={styles.perkRow}>
                        <ShieldCheck color={DEEP_PURPLE} size={24} style={styles.perkIcon} />
                        <AppText style={[styles.perkText, { fontSize: 15, lineHeight: 22 }]}>Foster an edifying environment that honors our core values.</AppText>
                      </View>
                    </View>

                    <TouchableOpacity style={[styles.primaryActionButton, { paddingVertical: 18 }]} onPress={() => setModalStep(2)}>
                      <AppText style={[styles.primaryActionText, { fontSize: 18 }]}>Get Started</AppText>
                    </TouchableOpacity>
                  </View>
                )}

                {modalStep === 2 && (
                  <View>
                    <AppText type="bold" style={[styles.modernTitle, { fontSize: 26, marginBottom: 8 }]}>Fellowship Details</AppText>
                    <AppText style={[styles.modernSubtitle, { fontSize: 15, lineHeight: 22, marginBottom: 20 }]}>Give your group an inviting title and description so members know what to expect.</AppText>

                    <AppText style={styles.inputLabel}>Group Name</AppText>
                    <TextInput style={[styles.modernInput, { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, marginBottom: 16 }]} placeholder="e.g., Morning Prayer & Intercession" placeholderTextColor="#94A3B8" value={newGroupName} onChangeText={setNewGroupName} />

                    <AppText style={styles.inputLabel}>Description</AppText>
                    <TextInput style={[styles.modernInput, styles.textArea, { paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, marginBottom: 28 }]} placeholder="What is the mission or focus of this group?" placeholderTextColor="#94A3B8" value={newGroupDescription} onChangeText={setNewGroupDescription} multiline numberOfLines={3} />

                    <View style={styles.modernActionRow}>
                      <TouchableOpacity style={[styles.secondaryActionButton, { paddingVertical: 18, paddingHorizontal: 28 }]} onPress={() => setModalStep(1)}>
                        <AppText style={[styles.secondaryActionText, { fontSize: 16 }]}>Back</AppText>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.primaryActionButton, { flex: 1, marginLeft: 12, marginTop: 0, paddingVertical: 18 }, isCreating && { opacity: 0.7 }]} onPress={handleCreateGroup} disabled={isCreating}>
                        <AppText style={[styles.primaryActionText, { fontSize: 18 }]}>{isCreating ? 'Creating...' : 'Create Group'}</AppText>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {modalStep === 3 && (
                  <View style={styles.successContainer}>
                    <View style={styles.successIconBadge}>
                      <CheckCircle2 color={RED} size={42} />
                    </View>
                    <AppText type="bold" style={[styles.modernTitle, { fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>Fellowship Created!</AppText>
                    <AppText style={[styles.modernSubtitle, { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 }]}>"{newGroupName.trim()}" is now live. Believers can join your gathering and start interacting.</AppText>

                    <TouchableOpacity style={[styles.primaryActionButton, { width: '100%', paddingVertical: 18 }]} onPress={handleCloseSuccessModal}>
                      <AppText style={[styles.primaryActionText, { fontSize: 18 }]}>View in Discussions</AppText>
                    </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1424' },
  headerBackground: { position: 'absolute', top: 0, width: '100%', height: 260 },
  backButton: { position: 'absolute', top: 50, left: 20, width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  header: { fontSize: 28, color: '#FFF', paddingHorizontal: 30, marginTop: 120, marginBottom: 30, letterSpacing: -0.5 },
  mainLayer: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 50, borderTopRightRadius: 50, paddingTop: 40, overflow: 'hidden' },
  scrollContent: { paddingBottom: 80 },
  errorBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF1F2', marginHorizontal: 30, padding: 12, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE4E6' },
  errorText: { color: RED, fontSize: 13, flex: 1 },
  retryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#FECDD3' },
  retryText: { color: RED, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  section: { marginBottom: 40 },
  groupSection: { marginBottom: 80 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  sectionTitle: { fontSize: 20, color: DEEP_PURPLE, letterSpacing: 0.5 },
  seeAllBtn: { color: DEEP_PURPLE, fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  createCardBanner: { backgroundColor: '#FFF1F2', borderRadius: 30, borderWidth: 1, borderColor: '#FFE4E6', padding: 18, shadowColor: RED, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, marginBottom: 25 },
  createBannerContent: { flexDirection: 'row', alignItems: 'center' },
  createIconCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: RED, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  createBannerTitle: { fontSize: 16, color: RED },
  createBannerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 14 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: DEEP_PURPLE },
  shortCard: { width: 115, height: 175, borderRadius: 24, backgroundColor: DEEP_PURPLE, marginTop: 15, marginRight: 15, overflow: 'hidden' },
  videoContainer: { width: '100%', height: '100%', overflow: 'hidden' },
  absoluteVideo: { position: 'absolute', top: 0, left: '-35%', right: '-20%', bottom: '-20%', width: '140%', height: '140%' },
  shortOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  playIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  studyGroupCard: { backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: DEEP_PURPLE, shadowOpacity: 0.04, shadowRadius: 8, marginBottom: 8 },
  cardInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  groupImagePlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(225, 29, 72, 0.2)', overflow: 'visible' },
  groupImage: { width: '100%', height: '100%', borderRadius: 22 },
  groupInitial: { fontSize: 18, color: RED },
  groupInfo: { marginLeft: 14, flex: 1, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  groupTitle: { fontSize: 15, color: DEEP_PURPLE },
  unreadTitle: { fontWeight: '800' },
  groupMembers: { fontSize: 12, color: '#64748B', marginTop: 2 },
  unreadBadgeAbsolute: { position: 'absolute', top: -4, right: -4, backgroundColor: RED, minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#FFFFFF', zIndex: 5 },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  joinBadge: { backgroundColor: RED, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinBadgeText: { fontSize: 13, color: '#FFF' },
  joinedBadge: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  joinedBadgeText: { color: '#64748B' },
  exploreOverlay: { flex: 1, backgroundColor: 'rgba(26, 20, 36, 0.85)', justifyContent: 'flex-end' },
  exploreContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, height: '80%' },
  exploreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 20, 36, 0.8)' },
  modalScrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  modernCard: { width: '100%', maxWidth: 420, backgroundColor: '#FFFFFF', borderRadius: 36, padding: 28, shadowColor: DEEP_PURPLE, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  iconBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center' },
  closeIconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  modernTitle: { fontSize: 26, color: DEEP_PURPLE, marginBottom: 10, letterSpacing: -0.5 },
  modernSubtitle: { fontSize: 16, color: '#64748B', lineHeight: 24, marginBottom: 24 },
  perkContainer: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, marginBottom: 28 },
  perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  perkIcon: { marginRight: 16 },
  perkText: { flex: 1, fontSize: 15, color: '#475569', lineHeight: 22 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: DEEP_PURPLE, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  modernInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, fontSize: 17, color: DEEP_PURPLE },
  textArea: { height: 90, textAlignVertical: 'top' },
  primaryActionButton: { backgroundColor: RED, borderRadius: 20, paddingVertical: 18, alignItems: 'center', marginTop: 4, shadowColor: RED, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  primaryActionText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  modernActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  secondaryActionButton: { backgroundColor: '#F1F5F9', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  successContainer: { alignItems: 'center', paddingVertical: 10 },
  successIconBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }
});