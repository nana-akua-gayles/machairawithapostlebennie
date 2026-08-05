import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Dimensions, Alert, StatusBar, KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, X, Send, Trash2 } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';

const { width, height } = Dimensions.get('window');
const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';

export const StorySection = ({ stories = [], currentUser, onRefresh }) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [viewerModalVisible, setViewerModalVisible] = useState(false);
  const [storyContent, setStoryContent] = useState('');
  
  // Viewer state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const pressStartTimeRef = useRef(0);

  const myUserId = currentUser?.id;
  const myStories = stories.filter((s) => s.user_id === myUserId);
  const hasMyStory = myStories.length > 0;

  useEffect(() => {
    if (stories.length > 0 && currentIndex >= stories.length) {
      setCurrentIndex(stories.length - 1);
    }
  }, [stories.length]);

  // Robust interval running at exact 50ms intervals with correct scaling
  useEffect(() => {
    let timer;
    if (viewerModalVisible && stories.length > 0) {
      const interval = 50; 
      const totalTime = 5000; // 5 seconds per story
      
      timer = setInterval(() => {
        if (!isPausedRef.current) {
          setProgress((prev) => {
            if (prev >= 1) {
              handleNextStory();
              return 0;
            }
            return prev + (interval / totalTime);
          });
        }
      }, interval);
    }
    return () => clearInterval(timer);
  }, [viewerModalVisible, currentIndex, stories.length]);

  const handleNextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      setViewerModalVisible(false);
      setCurrentIndex(0);
      setProgress(0);
    }
  };

  const handlePrevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
    }
  };

  const handleCreateStory = async () => {
    if (!storyContent.trim()) {
      Alert.alert('Notice', 'Please write something for your story.');
      return;
    }
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to share a story.');
      return;
    }

    const expiresAt = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();
    const authorName = currentUser.name || currentUser.email || 'Member';

    const { error } = await supabase.from('statuses').insert([
      { 
        content: storyContent.trim(), 
        name: authorName,
        user_id: currentUser.id,
        expires_at: expiresAt 
      }
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setStoryContent('');
      setCreateModalVisible(false);
      if (onRefresh) onRefresh(); 
    }
  };

  const handleDeleteStory = async (storyId) => {
    Alert.alert(
      'Delete Status',
      'Are you sure you want to delete this status?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('statuses').delete().eq('id', storyId);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              setViewerModalVisible(false);
              setCurrentIndex(0);
              setProgress(0);
              if (onRefresh) onRefresh();
            }
          }
        }
      ]
    );
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Just now';
    const now = new Date();
    const posted = new Date(dateString);
    const diffHours = Math.floor((now - posted) / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.max(1, Math.floor((now - posted) / (1000 * 60)));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    return '1d ago';
  };

  const activeStory = stories[currentIndex] || {};
  const isMyActiveStory = activeStory.user_id === myUserId;
  const authorProfilePic = isMyActiveStory ? currentUser?.avatar_url : activeStory.avatar_url;

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <AppText type="bold" style={styles.sectionTitle}>Active Stories</AppText>
      </View>

      <FlatList
        horizontal
        data={stories}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 20 }}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.storyWrapper}>
            <TouchableOpacity 
              onPress={() => {
                if (hasMyStory) {
                  const myFirstIndex = stories.findIndex((s) => s.user_id === myUserId);
                  setCurrentIndex(myFirstIndex !== -1 ? myFirstIndex : 0);
                  setProgress(0);
                  setIsPaused(false);
                  setViewerModalVisible(true);
                } else {
                  setCreateModalVisible(true);
                }
              }}
            >
              {hasMyStory ? (
                <LinearGradient colors={[RED, '#9F1239']} style={styles.gradientBorder}>
                  <View style={styles.storyCircleInner}>
                    <AppText numberOfLines={2} style={styles.storyPreviewText}>{myStories[0].content}</AppText>
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.myStatusContainer}>
                  <View style={styles.storyCircleInnerBlank}>
                    <Plus color={RED} size={24} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.floatingPlusBadge} 
              onPress={() => setCreateModalVisible(true)}
            >
              <Plus color="#FFFFFF" size={12} />
            </TouchableOpacity>

            <AppText style={styles.storyName}>My Status</AppText>
          </View>
        }
        renderItem={({ item, index }) => {
          if (item.user_id === myUserId) return null;

          return (
            <TouchableOpacity 
              style={styles.storyWrapper} 
              onPress={() => { setCurrentIndex(index); setProgress(0); setIsPaused(false); setViewerModalVisible(true); }}
            >
              <LinearGradient colors={[RED, '#9F1239']} style={styles.gradientBorder}>
                <View style={styles.storyCircleInner}>
                  <AppText numberOfLines={2} style={styles.storyPreviewText}>{item.content}</AppText>
                </View>
              </LinearGradient>
              <AppText style={styles.storyName}>{item.name || 'Member'}</AppText>
            </TouchableOpacity>
          );
        }}
      />

      {/* 1. Creator Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent={false}>
        <LinearGradient colors={[DEEP_PURPLE, '#0f0a1a']} style={styles.composerContainer}>
          <StatusBar barStyle="light-content" />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'space-between' }}
          >
            <View style={styles.composerHeader}>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.composerCloseBtn}>
                <X color="#FFF" size={24} />
              </TouchableOpacity>
              <AppText type="bold" style={styles.composerHeaderTitle}>Create Status</AppText>
              <TouchableOpacity onPress={handleCreateStory} style={styles.composerSendBtn} activeOpacity={0.8}>
                <Send color="#FFF" size={20} />
              </TouchableOpacity>
            </View>

            <View style={styles.composerBody}>
              <TextInput 
                placeholder="Share how the Machaira blessed you today..." 
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={storyContent} 
                onChangeText={setStoryContent}
                multiline
                autoFocus={true}
                style={styles.composerInput}
              />
            </View>

            <View style={styles.composerFooter}>
              <AppText style={styles.composerFooterText}>Disappears automatically after 24 hours</AppText>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      {/* 2. Full-Screen Viewer Modal */}
      <Modal visible={viewerModalVisible} animationType="fade" transparent={false} onRequestClose={() => setViewerModalVisible(false)}>
        <View style={styles.viewerContainer}>
          {/* Progress Bars */}
          <View style={styles.progressBarRow}>
            {stories.map((_, idx) => (
              <View key={idx} style={styles.progressBarBackground}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress * 100}%` : '0%' 
                    }
                  ]} 
                />
              </View>
            ))}
          </View>

          {/* Header metadata */}
          <View style={styles.viewerHeader}>
            <View style={styles.viewerAuthorRow}>
              {authorProfilePic ? (
                <Image source={{ uri: authorProfilePic }} style={styles.viewerAvatar} />
              ) : (
                <View style={styles.viewerAvatarPlaceholder}>
                  <AppText style={styles.viewerAvatarPlaceholderText}>
                    {(isMyActiveStory ? 'M' : (activeStory.name || 'M')).charAt(0).toUpperCase()}
                  </AppText>
                </View>
              )}
              <View>
                <AppText type="bold" style={styles.viewerAuthor}>
                  {isMyActiveStory ? 'My Status' : (activeStory.name || 'Member')}
                </AppText>
                <AppText style={styles.viewerTimestamp}>
                  {formatTimeAgo(activeStory.created_at)}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isMyActiveStory && activeStory.id && (
                <TouchableOpacity 
                  style={styles.viewerDeleteBtn} 
                  onPress={() => handleDeleteStory(activeStory.id)}
                >
                  <Trash2 color="#FFFFFF" size={20} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => { setViewerModalVisible(false); setProgress(0); setIsPaused(false); }}>
                <AppText style={styles.viewerClose}>✕</AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Timestamp-Controlled Touch Zones */}
          <View style={styles.viewerContentContainer}>
            <Pressable 
              style={styles.touchZoneLeft} 
              onPressIn={() => {
                pressStartTimeRef.current = Date.now();
                setIsPaused(true);
              }}
              onPressOut={() => {
                setIsPaused(false);
                const holdDuration = Date.now() - pressStartTimeRef.current;
                // If held for less than 200ms, treat it as a tap
                if (holdDuration < 200) {
                  handlePrevStory();
                }
              }}
            />
            
            <View style={styles.statusTextWrapper} pointerEvents="none">
              <AppText style={styles.viewerText}>{activeStory.content}</AppText>
            </View>

            <Pressable 
              style={styles.touchZoneRight} 
              onPressIn={() => {
                pressStartTimeRef.current = Date.now();
                setIsPaused(true);
              }}
              onPressOut={() => {
                setIsPaused(false);
                const holdDuration = Date.now() - pressStartTimeRef.current;
                // If held for less than 200ms, treat it as a tap
                if (holdDuration < 200) {
                  handleNextStory();
                }
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 20, color: DEEP_PURPLE, letterSpacing: 0.5, marginBottom: 15 },
  storyWrapper: { alignItems: 'center', marginHorizontal: 10, position: 'relative' },
  gradientBorder: { width: 80, height: 80, borderRadius: 40, padding: 3 },
  myStatusContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  storyCircleInner: { flex: 1, borderRadius: 37, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 5, overflow: 'hidden' },
  storyCircleInnerBlank: { flex: 1, borderRadius: 37, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  storyPreviewText: { fontSize: 9, color: DEEP_PURPLE, textAlign: 'center' },
  storyName: { marginTop: 10, color: DEEP_PURPLE, fontSize: 11, fontWeight: '600' },
  floatingPlusBadge: { position: 'absolute', right: 5, top: 55, width: 22, height: 22, borderRadius: 11, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF', zIndex: 5 },

  composerContainer: { flex: 1, paddingTop: 75, paddingHorizontal: 25, paddingBottom: 35 },
  composerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  composerCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  composerHeaderTitle: { color: '#FFF', fontSize: 18, letterSpacing: -0.3 },
  composerSendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  composerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  composerInput: { width: '100%', color: '#FFFFFF', fontSize: 24, textAlign: 'center', lineHeight: 36, fontWeight: '500', textAlignVertical: 'center', minHeight: 150 },
  composerFooter: { alignItems: 'center', marginTop: 10 },
  composerFooterText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },

  viewerContainer: { flex: 1, backgroundColor: '#0F172A', paddingTop: 50, paddingBottom: 30 },
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
  viewerDeleteBtn: { marginRight: 15, padding: 5 },
  viewerClose: { color: '#FFFFFF', fontSize: 20, padding: 5 },
  viewerContentContainer: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  touchZoneLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', zIndex: 10 },
  touchZoneRight: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%', zIndex: 10 },
  statusTextWrapper: { padding: 30, justifyContent: 'center', alignItems: 'center', width: '100%' },
  viewerText: { color: '#FFFFFF', fontSize: 24, textAlign: 'center', lineHeight: 36, fontWeight: '500' }
});