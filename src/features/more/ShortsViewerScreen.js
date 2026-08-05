import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, StatusBar, Share, TouchableWithoutFeedback, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChevronLeft, Heart, MessageCircle, Share2, Volume2, VolumeX, Play, X, Send } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';

const { width, height } = Dimensions.get('window');
const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';
const PAGE_SIZE = 10;

const ShortItem = ({ item, index, currentIndex, isMuted, isPlaying, togglePlayPause, handleLike, fetchCommentsForShort, handleShare, likes }) => {
  const isActive = index === currentIndex;
  const isLiked = likes[item.id]?.isLiked ?? item.user_has_liked ?? false;
  const likesCount = likes[item.id]?.count ?? item.likes_count ?? 0;
  const commentsCount = item.comments_count ?? 0;

  const player = useVideoPlayer(item.video_url, (player) => {
    player.loop = true;
    player.muted = isMuted;
  });

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (isActive && isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPlaying]);

  return (
    <TouchableWithoutFeedback onPress={togglePlayPause}>
      <View style={styles.shortPage}>
        <View style={styles.videoPlayer}>
          <VideoView
            player={player}
            style={styles.absoluteVideo}
            contentFit="cover"
            nativeControls={false}
          />
        </View>

        <View style={styles.overlayGradient} pointerEvents="none" />

        {!isPlaying && isActive && (
          <View style={styles.pauseIndicatorContainer} pointerEvents="none">
            <View style={styles.pauseIconCircle}>
              <Play color="#FFF" size={32} fill="#FFF" />
            </View>
          </View>
        )}

        <View style={styles.contentContainer} pointerEvents="box-none">
          <View style={styles.creatorRow}>
            <View style={styles.avatarPlaceholder}>
              <AppText style={styles.avatarText}>
                {(item.author_name || 'A').charAt(0).toUpperCase()}
              </AppText>
            </View>
            <AppText type="bold" style={styles.creatorName}>
              {item.author_name || 'Apostolic Minister'}
            </AppText>
          </View>

          <AppText style={styles.shortDescription} numberOfLines={3}>
            {item.description || item.title || 'Walking in the power and glory of the Lord. Amen! 🔥'}
          </AppText>
        </View>

        <View style={styles.actionSidebar}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
            <Heart color={isLiked ? RED : '#FFF'} fill={isLiked ? RED : 'transparent'} size={28} />
            <AppText style={styles.actionText}>{likesCount}</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => fetchCommentsForShort(item.id)}>
            <MessageCircle color="#FFF" size={28} />
            <AppText style={styles.actionText}>{commentsCount}</AppText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
            <Share2 color="#FFF" size={26} />
            <AppText style={styles.actionText}>Share</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export const ShortsViewerScreen = ({ route, navigation }) => {
  const { shorts: initialShorts = [], initialIndex = 0, currentUser } = route.params || {};
  
  const [shorts, setShorts] = useState(initialShorts);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [likes, setLikes] = useState({});

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Comments State
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [currentShortComments, setCurrentShortComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeShortId, setActiveShortId] = useState(null);

  // Reply State
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => {
    if (shorts.length > 0) {
      fetchCountsAndLikes();
    }
  }, [shorts.length]);

  const fetchCountsAndLikes = async () => {
    try {
      const shortIds = shorts.map(s => s.id);

      const { data: likesData, error: likesError } = await supabase
        .from('short_likes')
        .select('short_id')
        .in('short_id', shortIds);

      if (likesError) throw likesError;

      const { data: commentsData, error: commentsError } = await supabase
        .from('short_comments')
        .select('short_id')
        .in('short_id', shortIds);

      if (commentsError) throw commentsError;

      let userLikes = [];
      if (currentUser) {
        const { data: userLikesData } = await supabase
          .from('short_likes')
          .select('short_id')
          .eq('user_id', currentUser.id)
          .in('short_id', shortIds);
        if (userLikesData) userLikes = userLikesData;
      }

      const likeCountsMap = {};
      likesData?.forEach(item => {
        likeCountsMap[item.short_id] = (likeCountsMap[item.short_id] || 0) + 1;
      });

      const commentCountsMap = {};
      commentsData?.forEach(item => {
        commentCountsMap[item.short_id] = (commentCountsMap[item.short_id] || 0) + 1;
      });

      const userLikedMap = {};
      userLikes.forEach(item => {
        userLikedMap[item.short_id] = true;
      });

      const newLikesState = {};
      shortIds.forEach(id => {
        newLikesState[id] = {
          isLiked: !!userLikedMap[id],
          count: likeCountsMap[id] || 0,
        };
      });
      setLikes(newLikesState);

      setShorts(prev => prev.map(s => ({
        ...s,
        likes_count: likeCountsMap[s.id] || 0,
        comments_count: commentCountsMap[s.id] || 0,
      })));

    } catch (err) {
      console.error('Error fetching counts and likes:', err);
    }
  };

  const loadMorePermanentShorts = async () => {
    if (loadingMore || !hasMore || shorts.length === 0) return;
    setLoadingMore(true);

    try {
      const lastItem = shorts[shorts.length - 1];
      const lastCreatedAt = lastItem.created_at;

      const { data, error } = await supabase
        .from('shorts')
        .select('*')
        .lt('created_at', lastCreatedAt)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setShorts(prev => [...prev, ...data]);
        if (data.length < PAGE_SIZE) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching permanent shorts via cursor:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
      setIsPlaying(true);

      if (index >= shorts.length - 3) {
        loadMorePermanentShorts();
      }
    }
  }).current;

  const viewabilityConfig = { itemVisiblePercentThreshold: 80 };

  const handleLike = async (shortId) => {
    if (!currentUser) {
      Alert.alert('Notice', 'Please log in to like shorts.');
      return;
    }

    const currentStatus = likes[shortId]?.isLiked ?? false;
    const currentCount = likes[shortId]?.count ?? 0;

    const newIsLiked = !currentStatus;
    const newCount = Math.max(0, currentCount + (newIsLiked ? 1 : -1));

    setLikes(prev => ({
      ...prev,
      [shortId]: { isLiked: newIsLiked, count: newCount }
    }));

    try {
      if (newIsLiked) {
        const { error } = await supabase
          .from('short_likes')
          .insert([{ short_id: shortId, user_id: currentUser.id }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('short_likes')
          .delete()
          .match({ short_id: shortId, user_id: currentUser.id });
        if (error) throw error;
      }
    } catch (err) {
      console.error('Error updating likes in database:', err);
      setLikes(prev => ({
        ...prev,
        [shortId]: { isLiked: currentStatus, count: currentCount }
      }));
    }
  };

  const handleShare = async (short) => {
    try {
      const deepLink = Linking.createURL(`shorts/${short.id}`);
      const shareMessage = `Watch this powerful apostolic short: "${short.title || short.description || 'Apostolic Shorts'}"\n\nOpen in app: ${deepLink}`;
      
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.log('Error sharing short:', error);
    }
  };

  const fetchCommentsForShort = async (shortId) => {
    setActiveShortId(shortId);
    setCommentsModalVisible(true);
    setReplyingTo(null);

    const { data, error } = await supabase
      .from('short_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        profiles (
          name,
          avatar_url
        )
      `)
      .eq('short_id', shortId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch comments error:', error.message);
      setCurrentShortComments([]);
      return;
    }

    if (data) {
      const formattedComments = data.map(comment => {
        const prof = comment.profiles;
        return {
          ...comment,
          author_name: prof?.name || 'Member',
          author_avatar: prof?.avatar_url || null,
          commentLikes: false,
        };
      });
      setCurrentShortComments(formattedComments);

      setShorts(prevShorts => 
        prevShorts.map(short => {
          if (short.id === shortId) {
            return { ...short, comments_count: data.length };
          }
          return short;
        })
      );
    } else {
      setCurrentShortComments([]);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    if (!currentUser) {
      Alert.alert('Notice', 'Please log in to leave a comment.');
      return;
    }

    const payload = {
      short_id: activeShortId,
      user_id: currentUser.id,
      content: replyingTo ? `@${replyingTo.author_name} ${newCommentText.trim()}` : newCommentText.trim(),
      parent_id: replyingTo ? replyingTo.id : null,
    };

    const { error } = await supabase.from('short_comments').insert([payload]);

    if (error) {
      console.error('Supabase insert comment error:', error.message);
      Alert.alert('Error', error.message);
    } else {
      setNewCommentText('');
      setReplyingTo(null);
      fetchCommentsForShort(activeShortId);
    }
  };

  const toggleCommentLike = (commentId) => {
    setCurrentShortComments(prev => 
      prev.map(item => item.id === commentId ? { ...item, commentLikes: !item.commentLikes } : item)
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

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ChevronLeft color="white" size={28} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.muteButton} onPress={() => setIsMuted(!isMuted)}>
        {isMuted ? <VolumeX color="white" size={22} /> : <Volume2 color="white" size={22} />}
      </TouchableOpacity>

      <FlatList
        data={shorts}
        pagingEnabled
        vertical
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={initialIndex}
        getItemLayout={(data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        onEndReached={loadMorePermanentShorts}
        onEndReachedThreshold={0.5}
        windowSize={4}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item, index }) => (
          <ShortItem
            item={item}
            index={index}
            currentIndex={currentIndex}
            isMuted={isMuted}
            isPlaying={isPlaying}
            togglePlayPause={togglePlayPause}
            handleLike={handleLike}
            fetchCommentsForShort={fetchCommentsForShort}
            handleShare={handleShare}
            likes={likes}
          />
        )}
      />

      <Modal visible={commentsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentsModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setCommentsModalVisible(false)}>
            <View style={styles.modalDismissArea} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetContainer}
          >
            <View style={styles.commentsSheet}>
              <View style={styles.commentsHeader}>
                <AppText type="bold" style={styles.commentsTitle}>
                  {currentShortComments.length} {currentShortComments.length === 1 ? 'comment' : 'comments'}
                </AppText>
                <TouchableOpacity onPress={() => setCommentsModalVisible(false)} style={styles.commentsCloseBtn}>
                  <X color="#352a48" size={18} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={currentShortComments}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    {item.author_avatar ? (
                      <Image source={{ uri: item.author_avatar }} style={styles.commentAvatarImg} />
                    ) : (
                      <View style={styles.commentAvatar}>
                        <AppText style={styles.commentAvatarText}>{(item.author_name || 'M').charAt(0).toUpperCase()}</AppText>
                      </View>
                    )}
                    <View style={styles.commentContentWrapper}>
                      <AppText type="bold" style={styles.commentAuthor}>{item.author_name}</AppText>
                      <AppText style={styles.commentText}>{item.content}</AppText>
                      <View style={styles.commentFooterRow}>
                        <AppText style={styles.commentTime}>{formatTimeAgo(item.created_at)}</AppText>
                        <TouchableOpacity onPress={() => setReplyingTo(item)}>
                          <AppText type="bold" style={styles.replyTriggerText}>Reply</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.commentLikeContainer} onPress={() => toggleCommentLike(item.id)}>
                      <Heart color={item.commentLikes ? RED : '#94A3B8'} fill={item.commentLikes ? RED : 'transparent'} size={13} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyComments}>
                    <AppText style={{ color: '#94A3B8', fontSize: 13 }}>No comments yet. Be the first to comment!</AppText>
                  </View>
                }
              />

              {replyingTo && (
                <View style={styles.replyingBanner}>
                  <AppText style={styles.replyingBannerText}>Replying to @{replyingTo.author_name}</AppText>
                  <TouchableOpacity onPress={() => setReplyingTo(null)}>
                    <X color="#64748B" size={14} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.commentInputContainer}>
                <TextInput
                  placeholder={replyingTo ? `Replying to @${replyingTo.author_name}...` : "Add comment..."}
                  placeholderTextColor="#94A3B8"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  style={styles.commentInput}
                />
                <TouchableOpacity onPress={handleAddComment} style={styles.commentSendBtn}>
                  <Send color="#FFF" size={14} />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backButton: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  muteButton: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
  
  shortPage: { width: width, height: height, backgroundColor: '#000', position: 'relative', justifyContent: 'center', alignItems: 'center' },
  videoPlayer: { width: '100%', height: '100%', position: 'absolute' },
  absoluteVideo: { width: '100%', height: '100%' },
  
  overlayGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  
  pauseIndicatorContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
  pauseIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },

  contentContainer: { position: 'absolute', bottom: 50, left: 20, right: 90, zIndex: 10 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1.5, borderColor: '#FFF' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  creatorName: { color: '#FFF', fontSize: 16, letterSpacing: 0.3 },
  shortDescription: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 },

  actionSidebar: { position: 'absolute', right: 15, bottom: 60, alignItems: 'center', zIndex: 10 },
  actionButton: { alignItems: 'center', marginBottom: 25 },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 6, fontWeight: '600' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalDismissArea: { flex: 1 },
  sheetContainer: { width: '100%' },
  commentsSheet: { height: height * 0.55, backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8 },
  commentsHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', position: 'relative' },
  commentsTitle: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  commentsCloseBtn: { position: 'absolute', right: 16, top: 8, padding: 4 },
  
  commentItem: { flexDirection: 'row', marginTop: 14, alignItems: 'flex-start' },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: DEEP_PURPLE, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  commentAvatarImg: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  commentAvatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  commentContentWrapper: { flex: 1, marginRight: 8 },
  commentAuthor: { fontSize: 11, color: '#64748B', marginBottom: 2 },
  commentText: { fontSize: 13, color: '#0F172A', lineHeight: 18, marginBottom: 4 },
  commentFooterRow: { flexDirection: 'row', alignItems: 'center' },
  commentTime: { fontSize: 10, color: '#94A3B8', marginRight: 16 },
  replyTriggerText: { fontSize: 10, color: '#64748B' },
  commentLikeContainer: { width: 24, alignItems: 'center', paddingTop: 4 },
  emptyComments: { paddingVertical: 30, alignItems: 'center' },

  replyingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: '#E2E8F0' },
  replyingBannerText: { fontSize: 11, color: '#64748B' },

  commentInputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 19, paddingVertical: 25, borderTopWidth: 0.5, borderTopColor: '#E2E8F0', backgroundColor: '#FFF' },
  commentInput: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 17, fontSize: 13, color: '#0F172A', marginRight: 8 },
  commentSendBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: RED, justifyContent: 'center', alignItems: 'center' }
});