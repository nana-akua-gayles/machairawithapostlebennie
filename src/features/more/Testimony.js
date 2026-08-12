import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { StyleSheet, View, ScrollView, Pressable, FlatList, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, 
  Platform, TouchableWithoutFeedback} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Heart, MessageSquare, PenSquare, User, EyeOff, ChevronLeft, X, Send, CornerDownRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { useWrittenTestimonies } from './useWrittenTestimonies';
import { CreateTestimonyForm } from './CreateTestimonyForm';
import { useTheme } from '../../context/ThemeContext';

const RED_ACCENT = '#dc2626';

const CommentNode = memo(({ comment, isReply = false, onReply, onToggleLike }) => {
  const { colors, isDark: isDarkMode } = useTheme();

  return (
    <View style={[styles.commentNodeRow, isReply && styles.replyNodeIndent]}>
      <View style={styles.commentAvatarWrapper}>
        {comment.profiles?.avatar_url ? (
          <Image source={{ uri: comment.profiles.avatar_url }} style={styles.commentAvatarImage} contentFit="cover" />
        ) : (
          <View style={[styles.commentAvatarFallback, { backgroundColor: isDarkMode ? '#27272a' : '#27272a' }]}>
            <User color="#ffffff" size={11} />
          </View>
        )}
      </View>

      <View style={styles.commentContentColumn}>
        <View style={styles.commentBubbleHeader}>
          <AppText type="semiBold" style={[styles.commentAuthorName, { color: isDarkMode ? '#f4f4f5' : '#18181b' }]}>
            {comment.profiles?.name || 'Member'}
          </AppText>
          <AppText type="regular" style={styles.commentTimeAgo}>
            {comment.created_at ? new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
          </AppText>
        </View>

        <AppText type="regular" style={[styles.commentBodyText, { color: isDarkMode ? '#d4d4d8' : '#3f3f46' }]}>
          {comment.content}
        </AppText>

        <View style={styles.commentMetaActionRow}>
          <Pressable onPress={() => onReply({ id: comment.id, name: comment.profiles?.name || 'Member' })}>
            <AppText type="bold" style={[styles.replyActionButton, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Reply</AppText>
          </Pressable>

          <Pressable style={styles.commentLikeButton} onPress={() => onToggleLike(comment.id)}>
            <Heart 
              color={comment.hasLiked ? RED_ACCENT : '#a1a1aa'} 
              fill={comment.hasLiked ? RED_ACCENT : 'transparent'} 
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
          <View style={[styles.nestedRepliesContainer, { borderLeftColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
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
});

export const Testimony = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { colors, isDark: isDarkMode } = useTheme();

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
    let isMounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error('Auth error fetching user:', error);
        return;
      }
      if (data?.user && isMounted) {
        setCurrentUserId(data.user.id);
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profileData, error: profileError }) => {
            if (!profileError && profileData?.avatar_url && isMounted) {
              setCurrentUserAvatar(profileData.avatar_url);
            }
          })
          .catch(err => console.error('Error fetching profile avatar:', err));
      }
    }).catch(err => console.error('Auth error:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchTestimonies(activeCategory, true);
    }
  }, [activeCategory, currentUserId, fetchTestimonies]);

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

  const openCommentsSheet = useCallback(async (testimony) => {
    setActiveCommentsTestimony(testimony);
    setCommentsLoading(true);
    setReplyingTo(null);

    try {
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
        setComments([]);
        return;
      }

      let userLikedCommentIds = new Set();
      if (currentUserId && rawComments && rawComments.length > 0) {
        const { data: likesData, error: likesError } = await supabase
          .from('written_testimony_comment_likes')
          .select('comment_id')
          .eq('user_id', currentUserId)
          .in('comment_id', rawComments.map(c => c.id));

        if (!likesError && likesData) {
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
    } catch (err) {
      console.error('Failed to load comments sheet:', err);
    } finally {
      setCommentsLoading(false);
    }
  }, [currentUserId]);

  const handleToggleCommentLike = useCallback(async (commentId) => {
    if (!currentUserId) return;

    let previousCommentsState;

    setComments(prev => {
      previousCommentsState = prev;
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
      return updateLikes(prev);
    });

    try {
      const { data: existing, error: selectError } = await supabase
        .from('written_testimony_comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        const { error: deleteError } = await supabase
          .from('written_testimony_comment_likes')
          .delete()
          .eq('id', existing.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('written_testimony_comment_likes')
          .insert({ comment_id: commentId, user_id: currentUserId });
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Error toggling comment like:', err);
      if (previousCommentsState) {
        setComments(previousCommentsState);
      }
    }
  }, [currentUserId]);

  const handleSendComment = useCallback(async () => {
    if (!newCommentText.trim() || !currentUserId || !activeCommentsTestimony || postingComment) return;

    setPostingComment(true);

    const payload = {
      testimony_id: activeCommentsTestimony.id,
      user_id: currentUserId,
      content: newCommentText.trim(),
      parent_id: replyingTo ? replyingTo.id : null
    };

    try {
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
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setPostingComment(false);
    }
  }, [newCommentText, currentUserId, activeCommentsTestimony, postingComment, replyingTo, setTestimonies]);

  const categories = useMemo(() => ['All', 'Divine Provision', 'Healing', 'Breakthrough', 'Strange Miracle'], []);

  const renderItem = useCallback(({ item }) => {
    const avatarUri = item.profiles?.avatar_url || item.avatar_url;
    const hasAvatar = !item.is_anonymous && !!avatarUri;

    return (
      <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
        <View style={styles.cardHeader}>
          {item.is_anonymous ? (
            <View style={[styles.avatarFallbackCircle, { backgroundColor: isDarkMode ? '#27272a' : '#e4e4e7' }]}>
              <EyeOff color={isDarkMode ? '#a1a1aa' : '#71717a'} size={13} />
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
              <AppText type="semiBold" style={[styles.authorNameText, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>
                {item.is_anonymous ? 'Anonymous' : (item.profiles?.name || 'Member')}
              </AppText>
              <View style={[styles.categoryBadge, { backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#fef2f2' }]}>
                <AppText type="bold" style={[styles.categoryBadgeText, { color: isDarkMode ? '#f87171' : '#991b1b' }]}>{item.category}</AppText>
              </View>
            </View>
            <AppText type="regular" style={[styles.timeAgoText, { color: isDarkMode ? '#a1a1aa' : '#a1a1aa' }]}>
              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
            </AppText>
          </View>
        </View>

        <AppText type="regular" style={[styles.contentBodyText, { color: isDarkMode ? '#d4d4d8' : '#3f3f46' }]}>{item.content}</AppText>

        {item.attached_image_url && (
          <View style={[styles.imageAttachmentFrame, { backgroundColor: isDarkMode ? '#18181b' : '#f1f5f9', borderColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
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

        <View style={[styles.cardFooter, { borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
          <Pressable style={styles.interactionButton} onPress={() => toggleLike(item.id, item.hasLiked)}>
            <Heart 
              color={item.hasLiked ? RED_ACCENT : (isDarkMode ? '#a1a1aa' : '#64748b')} 
              fill={item.hasLiked ? RED_ACCENT : 'transparent'} 
              size={15} 
            />
            <AppText type="semiBold" style={[styles.interactionText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }, item.hasLiked && styles.likedText]}>
              {item.likes_count || 0}
            </AppText>
          </Pressable>

          <Pressable style={styles.interactionButton} onPress={() => openCommentsSheet(item)}>
            <MessageSquare color={isDarkMode ? '#a1a1aa' : '#64748b'} size={15} />
            <AppText type="semiBold" style={[styles.interactionText, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
              {item.comments_count || 0}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }, [toggleLike, openCommentsSheet, colors, isDarkMode]);

  const handleEndReached = useCallback(() => {
    if (!loading && hasMore) {
      fetchTestimonies(activeCategory, false);
    }
  }, [loading, hasMore, fetchTestimonies, activeCategory]);

  return (
    <View style={[styles.mainWrapper, { backgroundColor: colors.background }]}>
      {/* Fixed Non-Scrollable Header */}
      <View style={styles.headerWrapper}>
        <View style={[styles.headerContainer, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerLeftSection}>
            <Pressable 
              style={[styles.backActionButton, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]} 
              onPress={handleBackPress} 
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <ChevronLeft color={isDarkMode ? '#ffffff' : '#09090b'} size={20} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.headerTextGroup}>
              <AppText type="bold" style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>Testimonies</AppText>
              <AppText type="regular" style={[styles.headerSubtitle, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Celebrate what God is doing</AppText>
            </View>
          </View>
          
          <Pressable style={styles.createButton} onPress={() => setIsCreating(true)}>
            <PenSquare color="#ffffff" size={14} />
            <AppText type="semiBold" style={styles.createButtonText}>Share</AppText>
          </Pressable>
        </View>

        <View style={[styles.tabBarWrapper, { borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <Pressable key={cat} onPress={() => setActiveCategory(cat)} style={[styles.tabItem, isActive && styles.tabItemActive]}>
                  <AppText type={isActive ? 'bold' : 'medium'} style={[styles.tabText, { color: isDarkMode ? '#a1a1aa' : '#71717a' }, isActive && styles.tabTextActive]}>
                    {cat}
                  </AppText>
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

      <Modal visible={isCreating} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCreating(false)}>
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
            <View style={[styles.SheetContent, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}>
              
              <View style={[styles.sheetHeaderBar, { borderBottomColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                <View style={styles.sheetTitleCenter}>
                  <AppText type="bold" style={[styles.HeaderTitle, { color: isDarkMode ? '#ffffff' : '#18181b' }]}>
                    {activeCommentsTestimony?.comments_count || comments.length} comments
                  </AppText>
                </View>
                <Pressable style={styles.closeSheetButton} onPress={() => setActiveCommentsTestimony(null)}>
                  <X color={isDarkMode ? '#ffffff' : '#18181b'} size={16} strokeWidth={2.5} />
                </Pressable>
              </View>

              {commentsLoading ? (
                <View style={styles.commentsLoaderFrame}>
                  <ActivityIndicator size="small" color={RED_ACCENT} />
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
                      <AppText type="semiBold" style={[styles.emptyTitle, { color: isDarkMode ? '#ffffff' : '#18181b' }]}>No comments yet</AppText>
                      <AppText type="regular" style={[styles.emptySubtitle, { color: isDarkMode ? '#a1a1aa' : '#a1a1aa' }]}>Be the first to share an encouragement!</AppText>
                    </View>
                  )}
                />
              )}

              {replyingTo && (
                <View style={[styles.replyingBanner, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                  <View style={styles.replyingTextGroup}>
                    <CornerDownRight color={isDarkMode ? '#a1a1aa' : '#71717a'} size={11} />
                    <AppText type="regular" style={[styles.replyingLabel, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>
                      Replying to <AppText type="bold" style={[styles.replyingTarget, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>{replyingTo.name}</AppText>
                    </AppText>
                  </View>
                  <Pressable onPress={() => setReplyingTo(null)}>
                    <X color={isDarkMode ? '#a1a1aa' : '#71717a'} size={13} />
                  </Pressable>
                </View>
              )}

              <View style={[styles.InputDrawer, { borderTopColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                <View style={[styles.inputAvatarFrame, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                  {currentUserAvatar ? (
                    <Image source={{ uri: currentUserAvatar }} style={styles.inputAvatarImage} contentFit="cover" />
                  ) : (
                    <User color={isDarkMode ? '#a1a1aa' : '#a1a1aa'} size={13} />
                  )}
                </View>
                <TextInput
                  style={[styles.TextInput, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5', color: isDarkMode ? '#ffffff' : '#09090b' }]}
                  placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Add comment..."}
                  placeholderTextColor={isDarkMode ? '#a1a1aa' : '#a1a1aa'}
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  multiline
                />
                <Pressable 
                  style={[styles.SendButton, (!newCommentText.trim() || postingComment) && styles.SendDisabled]} 
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
  mainWrapper: { flex: 1 },
  listContainer: { paddingBottom: 40, paddingTop: 4 },
  headerWrapper: { zIndex: 10 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8, zIndex: 10 },
  headerLeftSection: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 10 },
  backActionButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  headerTextGroup: { marginLeft: 2 },
  headerTitle: { fontSize: 18, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  createButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: RED_ACCENT, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  createButtonText: { color: '#ffffff', fontSize: 11 },
  tabBarWrapper: { borderBottomWidth: 1, marginBottom: 12 },
  tabScrollContainer: { paddingHorizontal: 16, gap: 18 },
  tabItem: { paddingVertical: 10, position: 'relative', alignItems: 'center' },
  tabItemActive: {},
  tabText: { fontSize: 12 },
  tabTextActive: { color: RED_ACCENT },
  tabActiveIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: RED_ACCENT, borderRadius: 1 },
  cardContainer: { borderWidth: 1, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarImage: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0' },
  avatarFallbackCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarUserBg: { backgroundColor: RED_ACCENT },
  avatarAnonBg: { backgroundColor: '#e4e4e7' },
  authorMetaStack: { flex: 1 },
  authorBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  authorNameText: { fontSize: 12, flex: 1 },
  timeAgoText: { fontSize: 10, marginTop: 1 },
  categoryBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  categoryBadgeText: { fontSize: 9 },
  contentBodyText: { fontSize: 12, marginTop: 10, lineHeight: 18 },
  imageAttachmentFrame: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginTop: 10, borderWidth: 1 },
  imageAttachmentContent: { width: '100%', height: '100%' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  interactionButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  interactionText: { fontSize: 11 },
  likedText: { color: RED_ACCENT },
  loadingIndicator: { marginVertical: 14 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  SheetOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheetContainerWrapper: { width: '100%', maxHeight: '85%', justifyContent: 'flex-end' },
  SheetContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '100%', width: '100%', paddingTop: 4 },
  sheetHeaderBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  sheetTitleCenter: { flex: 1, alignItems: 'center' },
  HeaderTitle: { fontSize: 12, letterSpacing: -0.2 },
  closeSheetButton: { padding: 4 },
  commentsLoaderFrame: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  CommentsListContainer: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  EmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 13, marginBottom: 2 },
  emptySubtitle: { fontSize: 11 },
  commentNodeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  replyNodeIndent: { marginTop: 8, marginBottom: 0 },
  commentAvatarWrapper: { width: 26, height: 26, borderRadius: 13, overflow: 'hidden' },
  commentAvatarImage: { width: '100%', height: '100%' },
  commentAvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  commentContentColumn: { flex: 1 },
  commentBubbleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  commentAuthorName: { fontSize: 11 },
  commentBodyText: { fontSize: 12, lineHeight: 16, marginTop: 1 },
  commentMetaActionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  commentTimeAgo: { fontSize: 10, color: '#a1a1aa' },
  replyActionButton: { fontSize: 10 },
  nestedRepliesContainer: { marginTop: 6, paddingLeft: 6, borderLeftWidth: 1.5 },
  commentLikeButton: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  commentLikeCount: { fontSize: 10, color: '#a1a1aa' },
  likedCommentText: { color: RED_ACCENT },
  replyingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 6 },
  replyingTextGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  replyingLabel: { fontSize: 11 },
  replyingTarget: {},
  InputDrawer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1 },
  inputAvatarFrame: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inputAvatarImage: { width: '100%', height: '100%' },
  TextInput: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, maxHeight: 80 },
  SendButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: RED_ACCENT, alignItems: 'center', justifyContent: 'center' },
  SendDisabled: { opacity: 0.4 }
});