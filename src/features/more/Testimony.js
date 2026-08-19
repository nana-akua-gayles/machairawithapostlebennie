import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { StyleSheet, View, ScrollView, Pressable, FlatList, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, TouchableWithoutFeedback, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Heart, MessageSquare, PenSquare, User, EyeOff, ChevronLeft, X, Send, CornerDownRight, AlertCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { useWrittenTestimonies } from './useWrittenTestimonies';
import { CreateTestimonyForm } from './CreateTestimonyForm';
import { useTheme } from '../../context/ThemeContext';

const RED_ACCENT = '#dc2626';
const RED_SOFT = '#f43f5e';
const MAX_REPLY_DEPTH = 3;

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const LikeHeart = ({ liked, size, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const bump = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 })
    ]).start();
    onPress();
  };
  return (
    <Pressable onPress={bump} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart color={liked ? RED_ACCENT : '#a1a1aa'} fill={liked ? RED_ACCENT : 'transparent'} size={size} />
      </Animated.View>
    </Pressable>
  );
};

const CommentNode = memo(({ comment, depth = 0, onReply, onToggleLike }) => {
  const { isDark: isDarkMode } = useTheme();
  const canReply = depth < MAX_REPLY_DEPTH;

  return (
    <View style={[styles.commentNodeRow, depth > 0 && styles.replyNodeIndent]}>
      <View style={styles.commentAvatarWrapper}>
        {comment.profiles?.avatar_url ? (
          <Image source={{ uri: comment.profiles.avatar_url }} style={styles.commentAvatarImage} contentFit="cover" />
        ) : (
          <View style={[styles.commentAvatarFallback, { backgroundColor: '#27272a' }]}><User color="#ffffff" size={11} /></View>
        )}
      </View>

      <View style={styles.commentContentColumn}>
        <View style={[styles.commentBubble, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
          <AppText type="semiBold" style={[styles.commentAuthorName, { color: isDarkMode ? '#f4f4f5' : '#18181b' }]}>{comment.profiles?.name || 'Member'}</AppText>
          <AppText type="regular" style={[styles.commentBodyText, { color: isDarkMode ? '#d4d4d8' : '#3f3f46' }]}>{comment.content}</AppText>
        </View>

        <View style={styles.commentMetaActionRow}>
          <AppText type="regular" style={styles.commentTimeAgo}>{timeAgo(comment.created_at)}</AppText>
          {canReply && (
            <Pressable onPress={() => onReply({ id: comment.id, name: comment.profiles?.name || 'Member' })}>
              <AppText type="bold" style={[styles.replyActionButton, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Reply</AppText>
            </Pressable>
          )}
          <LikeHeart liked={comment.hasLiked} size={12} onPress={() => onToggleLike(comment.id)} />
          {comment.likes_count > 0 && <AppText type="medium" style={[styles.commentLikeCount, comment.hasLiked && styles.likedCommentText]}>{comment.likes_count}</AppText>}
        </View>

        {comment.replies?.length > 0 && (
          <View style={[styles.nestedRepliesContainer, { borderLeftColor: isDarkMode ? '#3f3f46' : '#e4e4e7' }]}>
            {comment.replies.map(reply => (
              <CommentNode key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} onToggleLike={onToggleLike} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

export const Testimony = ({ onBack }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark: isDarkMode } = useTheme();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState(null);

  const [activeCommentsTestimony, setActiveCommentsTestimony] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const likeInFlight = useRef(new Set());
  const { testimonies, loading, hasMore, fetchTestimonies, toggleLike, setTestimonies } = useWrittenTestimonies(currentUserId);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data?.user || !isMounted) return;
      setCurrentUserId(data.user.id);
      supabase.from('profiles').select('avatar_url').eq('id', data.user.id).single()
        .then(({ data: p, error: e }) => { if (!e && p?.avatar_url && isMounted) setCurrentUserAvatar(p.avatar_url); });
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => { if (currentUserId) fetchTestimonies(activeCategory, true); }, [activeCategory, currentUserId, fetchTestimonies]);

  useEffect(() => {
    if (!activeCommentsTestimony?.id) return;
    const channel = supabase
      .channel(`testimony-comments-${activeCommentsTestimony.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'written_testimony_comments', filter: `testimony_id=eq.${activeCommentsTestimony.id}` },
        () => refetchComments(activeCommentsTestimony.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCommentsTestimony?.id]);

  const handleBackPress = useCallback(() => {
    if (typeof onBack === 'function') return onBack();
    if (navigation?.canGoBack()) return navigation.goBack();
  }, [onBack, navigation]);

  const buildCommentTree = useCallback((rawComments, likedIds) => {
    const map = {}, top = [];
    rawComments.forEach(c => { map[c.id] = { ...c, hasLiked: likedIds.has(c.id), likes_count: c.likes_count || 0, replies: [] }; });
    rawComments.forEach(c => c.parent_id && map[c.parent_id] ? map[c.parent_id].replies.push(map[c.id]) : top.push(map[c.id]));
    return top;
  }, []);

  const refetchComments = useCallback(async (testimonyId) => {
    try {
      const { data: rawComments, error } = await supabase
        .from('written_testimony_comments')
        .select(`id, content, created_at, user_id, parent_id, likes_count, profiles:user_id ( name, avatar_url )`)
        .eq('testimony_id', testimonyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let likedIds = new Set();
      if (currentUserId && rawComments?.length) {
        const { data: likesData } = await supabase.from('written_testimony_comment_likes').select('comment_id')
          .eq('user_id', currentUserId).in('comment_id', rawComments.map(c => c.id));
        likedIds = new Set((likesData || []).map(l => l.comment_id));
      }

      setComments(buildCommentTree(rawComments || [], likedIds));
    } catch (err) {
      showToast("Couldn't load comments");
    }
  }, [currentUserId, buildCommentTree, showToast]);

  const openCommentsSheet = useCallback(async (testimony) => {
    setActiveCommentsTestimony(testimony);
    setCommentsLoading(true);
    setReplyingTo(null);
    await refetchComments(testimony.id);
    setCommentsLoading(false);
  }, [refetchComments]);

  const handleToggleCommentLike = useCallback(async (commentId) => {
    if (!currentUserId || likeInFlight.current.has(commentId)) return;
    likeInFlight.current.add(commentId);

    const updateLikes = (list, delta) => list.map(item => {
      if (item.id === commentId) return { ...item, hasLiked: !item.hasLiked, likes_count: Math.max(0, item.likes_count + delta) };
      if (item.replies?.length) return { ...item, replies: updateLikes(item.replies, delta) };
      return item;
    });

    let wasLiked = false;
    setComments(prev => {
      const find = (list) => list.reduce((acc, i) => acc || (i.id === commentId ? i : (i.replies?.length ? find(i.replies) : null)), null);
      wasLiked = find(prev)?.hasLiked || false;
      return updateLikes(prev, wasLiked ? -1 : 1);
    });

    try {
      if (wasLiked) {
        const { error } = await supabase.from('written_testimony_comment_likes').delete().eq('comment_id', commentId).eq('user_id', currentUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('written_testimony_comment_likes').insert({ comment_id: commentId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (err) {
      setComments(prev => updateLikes(prev, wasLiked ? 1 : -1));
      showToast("Couldn't update like");
    } finally {
      likeInFlight.current.delete(commentId);
    }
  }, [currentUserId, showToast]);

  const handleSendComment = useCallback(async () => {
    const trimmed = newCommentText.trim();
    if (!trimmed || !currentUserId || !activeCommentsTestimony || postingComment) return;
    setPostingComment(true);

    try {
      const { error } = await supabase.from('written_testimony_comments').insert({
        testimony_id: activeCommentsTestimony.id, user_id: currentUserId, content: trimmed, parent_id: replyingTo?.id || null
      });
      if (error) throw error;

      setNewCommentText('');
      setReplyingTo(null);
      await refetchComments(activeCommentsTestimony.id);
      setTestimonies(prev => prev.map(t => t.id === activeCommentsTestimony.id ? { ...t, comments_count: (t.comments_count || 0) + 1 } : t));
    } catch (err) {
      showToast("Couldn't post comment");
    } finally {
      setPostingComment(false);
    }
  }, [newCommentText, currentUserId, activeCommentsTestimony, postingComment, replyingTo, refetchComments, setTestimonies, showToast]);

  const categories = useMemo(() => ['All', 'Divine Provision', 'Healing', 'Breakthrough', 'Strange Miracle'], []);

  const renderItem = useCallback(({ item }) => {
    const avatarUri = item.profiles?.avatar_url || item.avatar_url;
    const hasAvatar = !item.is_anonymous && !!avatarUri;

    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
        <View style={styles.cardHeader}>
          {item.is_anonymous ? (
            <View style={[styles.avatarFallbackCircle, { backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }]}><EyeOff color={isDarkMode ? '#a1a1aa' : '#71717a'} size={13} /></View>
          ) : hasAvatar ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallbackCircle, styles.avatarUserBg]}><User color="#ffffff" size={13} /></View>
          )}

          <View style={styles.authorMetaStack}>
            <View style={styles.authorBadgeRow}>
              <AppText type="semiBold" style={[styles.authorNameText, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>{item.is_anonymous ? 'Anonymous' : (item.profiles?.name || 'Member')}</AppText>
              <View style={[styles.categoryBadge, { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2' }]}><AppText type="bold" style={[styles.categoryBadgeText, { color: isDarkMode ? '#f87171' : '#991b1b' }]}>{item.category}</AppText></View>
            </View>
            <AppText type="regular" style={styles.timeAgoText}>{timeAgo(item.created_at)}</AppText>
          </View>
        </View>

        <AppText type="regular" style={[styles.contentBodyText, { color: isDarkMode ? '#d4d4d8' : '#3f3f46' }]}>{item.content}</AppText>

        {item.attached_image_url && (
          <View style={[styles.imageAttachmentFrame, { backgroundColor: isDarkMode ? '#18181b' : '#f1f5f9', borderColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
            <Image source={{ uri: item.attached_image_url }} style={styles.imageAttachmentContent} contentFit="cover" />
          </View>
        )}

        <View style={[styles.cardFooter, { borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
          <View style={styles.interactionButton}>
            <LikeHeart liked={item.hasLiked} size={16} onPress={() => toggleLike(item.id, item.hasLiked)} />
            <AppText type="semiBold" style={[styles.interactionText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }, item.hasLiked && styles.likedText]}>{item.likes_count || 0}</AppText>
          </View>

          <Pressable style={styles.interactionButton} onPress={() => openCommentsSheet(item)}>
            <MessageSquare color={isDarkMode ? '#a1a1aa' : '#64748b'} size={16} />
            <AppText type="semiBold" style={[styles.interactionText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>{item.comments_count || 0}</AppText>
          </Pressable>
        </View>
      </View>
    );
  }, [toggleLike, openCommentsSheet, colors, isDarkMode]);

  const handleEndReached = useCallback(() => { if (!loading && hasMore) fetchTestimonies(activeCategory, false); }, [loading, hasMore, fetchTestimonies, activeCategory]);

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      <View style={styles.headerWrapper}>
        <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerLeftSection}>
            <Pressable style={[styles.backActionButton, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]} onPress={handleBackPress} hitSlop={15}>
              <ChevronLeft color={isDarkMode ? '#ffffff' : '#09090b'} size={20} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.headerTextGroup}>
              <AppText type="bold" style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>Testimonies</AppText>
              <AppText type="regular" style={[styles.headerSubtitle, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Celebrate what God is doing</AppText>
            </View>
          </View>
          <Pressable style={styles.createButton} onPress={() => setIsCreating(true)}>
            <PenSquare color="#ffffff" size={14} /><AppText type="semiBold" style={styles.createButtonText}>Share</AppText>
          </Pressable>
        </View>

        <View style={[styles.tabBarWrapper, { borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={styles.tabItem}>
                  <AppText type={isActive ? 'bold' : 'medium'} style={[styles.tabText, { color: isDarkMode ? '#a1a1aa' : '#71717a' }, isActive && styles.tabTextActive]}>{cat}</AppText>
                  {isActive && <View style={styles.tabActiveIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={testimonies || []}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color={RED_ACCENT} style={styles.loadingIndicator} /> : null}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {toast && (
        <View style={styles.toastWrapper}>
          <View style={styles.toastBubble}><AlertCircle color="#ffffff" size={13} /><AppText type="medium" style={styles.toastText}>{toast}</AppText></View>
        </View>
      )}

      <Modal visible={isCreating} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCreating(false)}>
        <CreateTestimonyForm currentUserId={currentUserId} onCancelForm={() => setIsCreating(false)} onSuccess={() => { setIsCreating(false); fetchTestimonies(activeCategory, true); }} />
      </Modal>

      <Modal visible={!!activeCommentsTestimony} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setActiveCommentsTestimony(null)}>
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setActiveCommentsTestimony(null)}><View style={styles.SheetOverlay} /></TouchableWithoutFeedback>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetContainerWrapper}>
            <View style={[styles.SheetContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
              <View style={styles.sheetGrabber} />
              <View style={[styles.sheetHeaderBar, { borderBottomColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                <View style={styles.sheetTitleCenter}>
                  <AppText type="bold" style={[styles.HeaderTitle, { color: isDarkMode ? '#ffffff' : '#18181b' }]}>{activeCommentsTestimony?.comments_count || comments.length} comments</AppText>
                </View>
                <Pressable style={styles.closeSheetButton} onPress={() => setActiveCommentsTestimony(null)}><X color={isDarkMode ? '#ffffff' : '#18181b'} size={16} strokeWidth={2.5} /></Pressable>
              </View>

              {commentsLoading ? (
                <View style={styles.commentsLoaderFrame}><ActivityIndicator size="small" color={RED_ACCENT} /></View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                  renderItem={({ item }) => <CommentNode comment={item} onReply={setReplyingTo} onToggleLike={handleToggleCommentLike} />}
                  contentContainerStyle={styles.CommentsListContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() => (
                    <View style={styles.EmptyState}>
                      <AppText type="semiBold" style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#18181b' }]}>No comments yet</AppText>
                      <AppText type="regular" style={styles.emptySubtitle}>Be the first to share an encouragement!</AppText>
                    </View>
                  )}
                />
              )}

              {replyingTo && (
                <View style={[styles.replyingBanner, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                  <View style={styles.replyingTextGroup}>
                    <CornerDownRight color={isDarkMode ? '#a1a1aa' : '#71717a'} size={11} />
                    <AppText type="regular" style={[styles.replyingLabel, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Replying to <AppText type="bold" style={{ color: isDarkMode ? '#ffffff' : '#09090b' }}>{replyingTo.name}</AppText></AppText>
                  </View>
                  <Pressable onPress={() => setReplyingTo(null)}><X color={isDarkMode ? '#a1a1aa' : '#71717a'} size={13} /></Pressable>
                </View>
              )}

              <View style={[styles.InputDrawer, { borderTopColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                <View style={[styles.inputAvatarFrame, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                  {currentUserAvatar ? <Image source={{ uri: currentUserAvatar }} style={styles.inputAvatarImage} contentFit="cover" /> : <User color="#a1a1aa" size={13} />}
                </View>
                <TextInput
                  style={[styles.TextInput, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5', color: isDarkMode ? '#ffffff' : '#09090b' }]}
                  placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add comment..."}
                  placeholderTextColor="#a1a1aa"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  multiline
                />
                <Pressable style={[styles.SendButton, (!newCommentText.trim() || postingComment) && styles.SendDisabled]} onPress={handleSendComment} disabled={!newCommentText.trim() || postingComment}>
                  {postingComment ? <ActivityIndicator size="small" color="#ffffff" /> : <Send color="#ffffff" size={12} />}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 }, listContainer: { paddingBottom: 40, paddingTop: 4 }, headerWrapper: { zIndex: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, zIndex: 10 },
  headerLeftSection: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
  backActionButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  headerTextGroup: { marginLeft: 2 }, headerTitle: { fontSize: 18, letterSpacing: -0.3 }, headerSubtitle: { fontSize: 11, marginTop: 1 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: RED_ACCENT, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 12, shadowColor: RED_ACCENT, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  createButtonText: { color: '#ffffff', fontSize: 11 },
  tabBarWrapper: { borderBottomWidth: 1, marginBottom: 12 }, tabScrollContainer: { paddingHorizontal: 16, gap: 20 },
  tabItem: { paddingVertical: 10, position: 'relative', alignItems: 'center' }, tabText: { fontSize: 12 }, tabTextActive: { color: RED_ACCENT },
  tabActiveIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, backgroundColor: RED_ACCENT, borderRadius: 2 },
  cardContainer: { borderWidth: 1, borderRadius: 18, padding: 14, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImage: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e2e8f0' },
  avatarFallbackCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarUserBg: { backgroundColor: RED_ACCENT }, authorMetaStack: { flex: 1 },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  authorNameText: { fontSize: 12, flex: 1 }, timeAgoText: { fontSize: 10, marginTop: 1, color: '#a1a1aa' },
  categoryBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 }, categoryBadgeText: { fontSize: 9 },
  contentBodyText: { fontSize: 12.5, marginTop: 10, lineHeight: 19 },
  imageAttachmentFrame: { width: '100%', height: 170, borderRadius: 14, overflow: 'hidden', marginTop: 10, borderWidth: 1 },
  imageAttachmentContent: { width: '100%', height: '100%' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  interactionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 }, interactionText: { fontSize: 11 }, likedText: { color: RED_ACCENT },
  loadingIndicator: { marginVertical: 14 },
  toastWrapper: { position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' },
  toastBubble: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#18181b', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
  toastText: { color: '#ffffff', fontSize: 12 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, SheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetContainerWrapper: { width: '100%', maxHeight: '85%', justifyContent: 'flex-end' },
  SheetContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '100%', width: '100%', paddingTop: 8 },
  sheetGrabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#d4d4d8', alignSelf: 'center', marginBottom: 6 },
  sheetHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sheetTitleCenter: { flex: 1, alignItems: 'center' }, HeaderTitle: { fontSize: 12, letterSpacing: -0.2 }, closeSheetButton: { padding: 4 },
  commentsLoaderFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  CommentsListContainer: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  EmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 13, marginBottom: 2 }, emptySubtitle: { fontSize: 11, color: '#a1a1aa' },
  commentNodeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 }, replyNodeIndent: { marginTop: 8, marginBottom: 0 },
  commentAvatarWrapper: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' }, commentAvatarImage: { width: '100%', height: '100%' },
  commentAvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  commentContentColumn: { flex: 1 },
  commentBubble: { borderRadius: 14, borderTopLeftRadius: 4, paddingHorizontal: 11, paddingVertical: 8 },
  commentAuthorName: { fontSize: 11 }, commentBodyText: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  commentMetaActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingLeft: 2 },
  commentTimeAgo: { fontSize: 10, color: '#a1a1aa' }, replyActionButton: { fontSize: 10 },
  nestedRepliesContainer: { marginTop: 6, paddingLeft: 10, borderLeftWidth: 1.5 },
  commentLikeCount: { fontSize: 10, color: '#a1a1aa' }, likedCommentText: { color: RED_ACCENT },
  replyingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6 },
  replyingTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 }, replyingLabel: { fontSize: 11 },
  InputDrawer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1 },
  inputAvatarFrame: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inputAvatarImage: { width: '100%', height: '100%' },
  TextInput: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, maxHeight: 80 },
  SendButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: RED_ACCENT, alignItems: 'center', justifyContent: 'center' },
  SendDisabled: { opacity: 0.4 }
});
