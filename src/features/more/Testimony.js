import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Pressable, 
  FlatList, 
  Modal, 
  ActivityIndicator, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Heart, MessageSquare, PenSquare, User, EyeOff, ChevronLeft, X, Send, CornerDownRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { useWrittenTestimonies } from './useWrittenTestimonies';
import { CreateTestimonyForm } from './CreateTestimonyForm';

const CommentNode = ({ comment, isReply = false, onReply, onToggleLike }) => (
  <View style={[styles.commentNodeRow, isReply && styles.replyNodeIndent]}>
    <View style={styles.commentAvatarWrapper}>
      {comment.profiles?.avatar_url ? (
        <Image source={{ uri: comment.profiles.avatar_url }} style={styles.commentAvatarImage} contentFit="cover" />
      ) : (
        <View style={styles.commentAvatarFallback}>
          <User color="#ffffff" size={11} />
        </View>
      )}
    </View>

    <View style={styles.commentContentColumn}>
      <View style={styles.commentBubbleHeader}>
        <AppText type="semiBold" style={styles.commentAuthorName}>
          {comment.profiles?.name || 'Member'}
        </AppText>
        <AppText type="regular" style={styles.commentTimeAgo}>
          {comment.created_at ? new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
        </AppText>
      </View>

      <AppText type="regular" style={styles.commentBodyText}>
        {comment.content}
      </AppText>

      <View style={styles.commentMetaActionRow}>
        <Pressable onPress={() => onReply({ id: comment.id, name: comment.profiles?.name || 'Member' })}>
          <AppText type="bold" style={styles.replyActionButton}>Reply</AppText>
        </Pressable>

        <Pressable style={styles.commentLikeButton} onPress={() => onToggleLike(comment.id)}>
          <Heart 
            color={comment.hasLiked ? '#dc2626' : '#a1a1aa'} 
            fill={comment.hasLiked ? '#dc2626' : 'transparent'} 
            size={11} 
          />
          {comment.likes_count > 0 && (
            <AppText type="medium" style={[styles.commentLikeCount, comment.hasLiked && styles.likedCommentText]}>
              {comment.likes_count}
            </AppText>
          )}
        </Pressable>
      </View>

      {comment.replies && comment.replies.length > 0 && (
        <View style={styles.nestedRepliesContainer}>
          {comment.replies.map(reply => (
            <CommentNode 
              key={reply.id} 
              comment={reply} 
              isReply={true} 
              onReply={onReply} 
              onToggleLike={onToggleLike} 
            />
          ))}
        </View>
      )}
    </View>
  </View>
);

export const Testimony = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserAvatar, setCurrentUserAvatar] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isCreating, setIsCreating] = useState(false);

  const [activeCommentsTestimony, setActiveCommentsTestimony] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const { testimonies, loading, hasMore, fetchTestimonies, toggleLike, setTestimonies } = useWrittenTestimonies(currentUserId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profileData }) => {
            if (profileData?.avatar_url) {
              setCurrentUserAvatar(profileData.avatar_url);
            }
          })
          .catch(err => console.error('Error fetching profile avatar:', err));
      }
    }).catch(err => console.error('Auth error:', err));
  }, []);

  useEffect(() => {
    fetchTestimonies(activeCategory, true);
  }, [activeCategory]);

  const handleBackPress = useCallback(() => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (navigation?.canGoBack()) {
      navigation.goBack();
      return;
    }
    console.warn('No navigation target found to go back.');
  }, [onBack, navigation]);

  const openCommentsSheet = async (testimony) => {
    setActiveCommentsTestimony(testimony);
    setCommentsLoading(true);
    setReplyingTo(null);

    const { data: rawComments, error } = await supabase
      .from('written_testimony_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        likes_count,
        profiles:user_id ( name, avatar_url )
      `)
      .eq('testimony_id', testimony.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      setCommentsLoading(false);
      return;
    }

    let userLikedCommentIds = new Set();
    if (currentUserId && rawComments && rawComments.length > 0) {
      const { data: likesData } = await supabase
        .from('written_testimony_comment_likes')
        .select('comment_id')
        .eq('user_id', currentUserId)
        .in('comment_id', rawComments.map(c => c.id));

      if (likesData) {
        userLikedCommentIds = new Set(likesData.map(l => l.comment_id));
      }
    }

    const commentMap = {};
    const topLevel = [];

    (rawComments || []).forEach(c => {
      const formatted = { 
        ...c, 
        hasLiked: userLikedCommentIds.has(c.id), 
        likes_count: c.likes_count || 0,
        replies: [] 
      };
      commentMap[c.id] = formatted;
    });

    (rawComments || []).forEach(c => {
      if (c.parent_id && commentMap[c.parent_id]) {
        commentMap[c.parent_id].replies.push(commentMap[c.id]);
      } else {
        topLevel.push(commentMap[c.id]);
      }
    });

    setComments(topLevel);
    setCommentsLoading(false);
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!currentUserId) return;

    const updateLikes = (list) => {
      return list.map(item => {
        if (item.id === commentId) {
          const newLiked = !item.hasLiked;
          return {
            ...item,
            hasLiked: newLiked,
            likes_count: newLiked ? item.likes_count + 1 : Math.max(0, item.likes_count - 1)
          };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: updateLikes(item.replies) };
        }
        return item;
      });
    };

    setComments(prev => updateLikes(prev));

    const { data: existing } = await supabase
      .from('written_testimony_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (existing) {
      await supabase.from('written_testimony_comment_likes').delete().eq('id', existing.id);
    } else {
      await supabase.from('written_testimony_comment_likes').insert({ comment_id: commentId, user_id: currentUserId });
    }
  };

  const handleSendComment = async () => {
    if (!newCommentText.trim() || !currentUserId || !activeCommentsTestimony || postingComment) return;

    setPostingComment(true);

    const payload = {
      testimony_id: activeCommentsTestimony.id,
      user_id: currentUserId,
      content: newCommentText.trim(),
      parent_id: replyingTo ? replyingTo.id : null
    };

    const { data, error } = await supabase
      .from('written_testimony_comments')
      .insert(payload)
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_id,
        likes_count,
        profiles:user_id ( name, avatar_url )
      `)
      .single();

    setPostingComment(false);

    if (error) {
      console.error('Error posting comment:', error);
      return;
    }

    const newCommentObj = { ...data, hasLiked: false, likes_count: 0, replies: [] };

    if (replyingTo) {
      const appendReplyRecursively = (list) => {
        return list.map(item => {
          if (item.id === replyingTo.id) {
            return { ...item, replies: [...(item.replies || []), newCommentObj] };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: appendReplyRecursively(item.replies) };
          }
          return item;
        });
      };
      setComments(prev => appendReplyRecursively(prev));
    } else {
      setComments(prev => [newCommentObj, ...prev]);
    }

    setNewCommentText('');
    setReplyingTo(null);

    setTestimonies(prev => prev.map(item => {
      if (item.id === activeCommentsTestimony.id) {
        return { ...item, comments_count: (item.comments_count || 0) + 1 };
      }
      return item;
    }));
  };

  const categories = useMemo(() => ['All', 'Divine Provision', 'Healing', 'Breakthrough', 'Strange Miracle'], []);

  const ListHeader = useMemo(() => (
    <View style={styles.headerWrapper}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headerLeftSection}>
          <Pressable 
            style={styles.backActionButton} 
            onPress={handleBackPress} 
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <ChevronLeft color="#09090b" size={20} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerTextGroup}>
            <AppText type="bold" style={styles.headerTitle}>Testimonies</AppText>
            <AppText type="regular" style={styles.headerSubtitle}>Celebrate what God is doing</AppText>
          </View>
        </View>
        
        <Pressable style={styles.createButton} onPress={() => setIsCreating(true)}>
          <PenSquare color="#ffffff" size={14} />
          <AppText type="semiBold" style={styles.createButtonText}>Share</AppText>
        </Pressable>
      </View>

      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[styles.tabItem, isActive && styles.tabItemActive]}>
                <AppText type={isActive ? 'bold' : 'medium'} style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {cat}
                </AppText>
                {isActive && <View style={styles.tabActiveIndicator} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  ), [insets.top, handleBackPress, activeCategory, categories]);

  const renderItem = useCallback(({ item }) => {
    const avatarUri = item.profiles?.avatar_url || item.avatar_url;
    const hasAvatar = !item.is_anonymous && !!avatarUri;

    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          {item.is_anonymous ? (
            <View style={[styles.avatarFallbackCircle, styles.avatarAnonBg]}>
              <EyeOff color="#71717a" size={13} />
            </View>
          ) : hasAvatar ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallbackCircle, styles.avatarUserBg]}>
              <User color="#ffffff" size={13} />
            </View>
          )}

          <View style={styles.authorMetaStack}>
            <View style={styles.authorBadgeRow}>
              <AppText type="semiBold" style={styles.authorNameText}>
                {item.is_anonymous ? 'Anonymous' : (item.profiles?.name || 'Member')}
              </AppText>
              <View style={styles.categoryBadge}>
                <AppText type="bold" style={styles.categoryBadgeText}>{item.category}</AppText>
              </View>
            </View>
            <AppText type="regular" style={styles.timeAgoText}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
            </AppText>
          </View>
        </View>

        <AppText type="regular" style={styles.contentBodyText}>{item.content}</AppText>

        {item.attached_image_url && (
          <View style={styles.imageAttachmentFrame}>
            <Image 
              source={{ uri: item.attached_image_url }} 
              style={styles.imageAttachmentContent} 
              contentFit="cover"
              onError={(event) => {
                console.log('Image load error:', item.attached_image_url, event.error);
              }}
            />
          </View>
        )}

        <View style={styles.cardFooter}>
          <Pressable style={styles.interactionButton} onPress={() => toggleLike(item.id, item.hasLiked)}>
            <Heart 
              color={item.hasLiked ? '#dc2626' : '#64748b'} 
              fill={item.hasLiked ? '#dc2626' : 'transparent'} 
              size={15} 
            />
            <AppText type="semiBold" style={[styles.interactionText, item.hasLiked && styles.likedText]}>
              {item.likes_count || 0}
            </AppText>
          </Pressable>

          <Pressable style={styles.interactionButton} onPress={() => openCommentsSheet(item)}>
            <MessageSquare color="#64748b" size={15} />
            <AppText type="semiBold" style={styles.interactionText}>
              {item.comments_count || 0}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }, [toggleLike]);

  return (
    <View style={styles.mainWrapper}>
      <FlatList
        data={testimonies || []}
        keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        onEndReached={() => fetchTestimonies(activeCategory, false)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#dc2626" style={styles.loadingIndicator} /> : null}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={isCreating} animationType="slide" presentationStyle="pageSheet">
        <CreateTestimonyForm 
          currentUserId={currentUserId} 
          onCancelForm={() => setIsCreating(false)} 
          onSuccess={() => {
            setIsCreating(false);
            fetchTestimonies(activeCategory, true);
          }} 
        />
      </Modal>

      <Modal visible={!!activeCommentsTestimony} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setActiveCommentsTestimony(null)}>
        <View style={styles.modalRoot}>
          <TouchableWithoutFeedback onPress={() => setActiveCommentsTestimony(null)}>
            <View style={styles.SheetOverlay} />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={styles.sheetContainerWrapper}
          >
            <View style={[styles.SheetContent, { paddingBottom: insets.bottom + 8 }]}>
              
              <View style={styles.sheetHeaderBar}>
                <View style={styles.sheetTitleCenter}>
                  <AppText type="bold" style={styles.HeaderTitle}>
                    {activeCommentsTestimony?.comments_count || comments.length} comments
                  </AppText>
                </View>
                <Pressable style={styles.closeSheetButton} onPress={() => setActiveCommentsTestimony(null)}>
                  <X color="#18181b" size={16} strokeWidth={2.5} />
                </Pressable>
              </View>

              {commentsLoading ? (
                <View style={styles.commentsLoaderFrame}>
                  <ActivityIndicator size="small" color="#dc2626" />
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item, index) => item?.id ? String(item.id) : String(index)}
                  renderItem={({ item }) => (
                    <CommentNode 
                      comment={item} 
                      onReply={setReplyingTo} 
                      onToggleLike={handleToggleCommentLike} 
                    />
                  )}
                  contentContainerStyle={styles.CommentsListContainer}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() => (
                    <View style={styles.EmptyState}>
                      <AppText type="semiBold" style={styles.emptyTitle}>No comments yet</AppText>
                      <AppText type="regular" style={styles.emptySubtitle}>Be the first to share an encouragement!</AppText>
                    </View>
                  )}
                />
              )}

              {replyingTo && (
                <View style={styles.replyingBanner}>
                  <View style={styles.replyingTextGroup}>
                    <CornerDownRight color="#71717a" size={11} />
                    <AppText type="regular" style={styles.replyingLabel}>
                      Replying to <AppText type="bold" style={styles.replyingTarget}>{replyingTo.name}</AppText>
                    </AppText>
                  </View>
                  <Pressable onPress={() => setReplyingTo(null)}>
                    <X color="#71717a" size={13} />
                  </Pressable>
                </View>
              )}

              <View style={styles.InputDrawer}>
                <View style={styles.inputAvatarFrame}>
                  {currentUserAvatar ? (
                    <Image source={{ uri: currentUserAvatar }} style={styles.inputAvatarImage} contentFit="cover" />
                  ) : (
                    <User color="#a1a1aa" size={13} />
                  )}
                </View>
                <TextInput
                  style={styles.TextInput}
                  placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add comment..."}
                  placeholderTextColor="#a1a1aa"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  multiline
                />
                <Pressable 
                  style={[styles.SendButton, !newCommentText.trim() && styles.SendDisabled]} 
                  onPress={handleSendComment}
                  disabled={!newCommentText.trim() || postingComment}
                >
                  <Send color="#ffffff" size={12} />
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
  mainWrapper: { flex: 1, backgroundColor: '#ffffff' },
  listContainer: { paddingBottom: 40, paddingTop: 4 },
  headerWrapper: { zIndex: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, zIndex: 10 },
  headerLeftSection: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
  backActionButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  headerTextGroup: { marginLeft: 2 },
  headerTitle: { fontSize: 18, color: '#09090b', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: '#71717a', marginTop: 1 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  createButtonText: { color: '#ffffff', fontSize: 11 },
  tabBarWrapper: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 12 },
  tabScrollContainer: { paddingHorizontal: 16, gap: 18 },
  tabItem: { paddingVertical: 10, position: 'relative', alignItems: 'center' },
  tabItemActive: {},
  tabText: { fontSize: 12, color: '#71717a' },
  tabTextActive: { color: '#dc2626' },
  tabActiveIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: '#dc2626', borderRadius: 1 },
  cardContainer: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImage: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0' },
  avatarFallbackCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarUserBg: { backgroundColor: '#dc2626' },
  avatarAnonBg: { backgroundColor: '#e4e4e7' },
  authorMetaStack: { flex: 1 },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  authorNameText: { fontSize: 12, color: '#09090b', flex: 1 },
  timeAgoText: { fontSize: 10, color: '#a1a1aa', marginTop: 1 },
  categoryBadge: { backgroundColor: '#fef2f2', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9, color: '#991b1b' },
  contentBodyText: { fontSize: 12, color: '#3f3f46', marginTop: 10, lineHeight: 18 },
  imageAttachmentFrame: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginTop: 10, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  imageAttachmentContent: { width: '100%', height: '100%' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#f1f5f9' },
  interactionButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  interactionText: { fontSize: 11, color: '#64748b' },
  likedText: { color: '#dc2626' },
  loadingIndicator: { marginVertical: 14 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  SheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetContainerWrapper: { width: '100%', maxHeight: '85%', justifyContent: 'flex-end' },
  SheetContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '100%', width: '100%', paddingTop: 4 },
  sheetHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  sheetTitleCenter: { flex: 1, alignItems: 'center' },
  HeaderTitle: { fontSize: 12, color: '#18181b', letterSpacing: -0.2 },
  closeSheetButton: { padding: 4 },
  commentsLoaderFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  CommentsListContainer: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  EmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 13, color: '#18181b', marginBottom: 2 },
  emptySubtitle: { fontSize: 11, color: '#a1a1aa' },
  commentNodeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  replyNodeIndent: { marginTop: 8, marginBottom: 0 },
  commentAvatarWrapper: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
  commentAvatarImage: { width: '100%', height: '100%' },
  commentAvatarFallback: { width: '100%', height: '100%', backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' },
  commentContentColumn: { flex: 1 },
  commentBubbleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  commentAuthorName: { fontSize: 11, color: '#18181b' },
  commentBodyText: { fontSize: 12, color: '#3f3f46', lineHeight: 16, marginTop: 1 },
  commentMetaActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  commentTimeAgo: { fontSize: 10, color: '#a1a1aa' },
  replyActionButton: { fontSize: 10, color: '#71717a' },
  nestedRepliesContainer: { marginTop: 6, paddingLeft: 6, borderLeftWidth: 1.5, borderLeftColor: '#f4f4f5' },
  commentLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentLikeCount: { fontSize: 10, color: '#a1a1aa' },
  likedCommentText: { color: '#dc2626' },
  replyingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f4f4f5', paddingHorizontal: 14, paddingVertical: 6 },
  replyingTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyingLabel: { fontSize: 11, color: '#71717a' },
  replyingTarget: { color: '#09090b' },
  InputDrawer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f4f4f5' },
  inputAvatarFrame: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f4f4f5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inputAvatarImage: { width: '100%', height: '100%' },
  TextInput: { flex: 1, backgroundColor: '#f4f4f5', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, color: '#09090b', maxHeight: 80 },
  SendButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#dc2626', alignItems: 'center', justifyContent: 'center' },
  SendDisabled: { opacity: 0.4 }
});