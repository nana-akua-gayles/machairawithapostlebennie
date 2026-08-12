import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { MessageSquare, Send, Trash2, Heart, CornerUpLeft, Edit2, X, Check } from 'lucide-react-native';
import { AppText } from '../../components/AppText';

const DEVOTIONAL_RED = '#DC2626';

export default function ForumSection({
  comments = [],
  loadingComments,
  newComment,
  setNewComment,
  handleAddComment,
  submittingComment,
  handleDeleteComment,
  handleEditComment, 
  onLikeComment,     
  onReplyComment,    
  likedCommentIds = [],
  currentUser,
  colors,
}) {
  console.log('[ForumSection Debug] Render Props:', {
    commentsCount: comments?.length,
    likedCount: likedCommentIds?.length,
    currentUserId: currentUser?.id,
    hasHandleEditComment: typeof handleEditComment === 'function',
    hasOnLikeComment: typeof onLikeComment === 'function',
    hasHandleDeleteComment: typeof handleDeleteComment === 'function',
    hasAddComment: typeof handleAddComment === 'function',
  });

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (comment) => {
    console.log('[ForumSection Debug] startEdit triggered for comment ID:', comment.id);
    setEditingCommentId(comment.id);
    setEditText(comment.content || '');
  };

  const cancelEdit = () => {
    console.log('[ForumSection Debug] cancelEdit triggered');
    setEditingCommentId(null);
    setEditText('');
  };

  const submitEdit = async (comment) => {
    const trimmedText = editText.trim();
    console.log('[ForumSection Debug] submitEdit called:', {
      commentId: comment.id,
      trimmedText,
      savingEdit,
    });

    if (!trimmedText || savingEdit) {
      console.warn('[ForumSection Debug] submitEdit aborted (empty text or already saving)');
      return;
    }

    setSavingEdit(true);
    try {
      if (handleEditComment) {
        console.log('[ForumSection Debug] Invoking handleEditComment parent callback...');
        await handleEditComment(comment.id, trimmedText);
        console.log('[ForumSection Debug] handleEditComment resolved successfully');
      } else {
        console.error('[ForumSection Debug] CRITICAL: handleEditComment prop is NOT a function!', handleEditComment);
      }
      setEditingCommentId(null);
    } catch (error) {
      console.error('[ForumSection Debug] Error during submitEdit execution:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <View style={styles.commentsSection}>
      {/* Header */}
      <View style={styles.commentHeaderRow}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.iconBadge, { backgroundColor: DEVOTIONAL_RED + '15' }]}>
            <MessageSquare color={DEVOTIONAL_RED} size={16} />
          </View>
          <AppText type="bold" style={[styles.commentSectionTitle, { color: colors.text }]}>
            Community Discussion
          </AppText>
        </View>

        <View style={[styles.pillBadge, { backgroundColor: colors.border + '40' }]}>
          <AppText type="bold" style={{ color: colors.textSecondary, fontSize: 11 }}>
            {comments.length} {comments.length === 1 ? 'Response' : 'Responses'}
          </AppText>
        </View>
      </View>

      {/* Input Field */}
      <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: colors.border + '80' }]}>
        <TextInput
          style={[styles.commentInput, { color: colors.text }]}
          placeholder="Share your thoughts or insights..."
          placeholderTextColor={colors.textSecondary + '70'}
          value={newComment}
          onChangeText={(text) => setNewComment && setNewComment(text)}
          multiline
        />
        <View style={styles.inputActionRow}>
          <Pressable
            onPress={() => {
              console.log('[ForumSection Debug] Post Comment Button Pressed');
              if (handleAddComment) {
                handleAddComment();
              } else {
                console.error('[ForumSection Debug] CRITICAL: handleAddComment prop is undefined');
              }
            }}
            disabled={submittingComment || !newComment?.trim()}
            style={({ pressed }) => [
              styles.sendButtonPill,
              {
                backgroundColor: newComment?.trim() ? DEVOTIONAL_RED : colors.border + '60',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <View style={styles.sendButtonContent}>
                <AppText type="bold" style={styles.sendButtonText}>Post</AppText>
                <Send color="#FFF" size={12} style={{ marginLeft: 4 }} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Comments List */}
      {loadingComments ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={DEVOTIONAL_RED} />
        </View>
      ) : comments.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card + '40', borderColor: colors.border + '40' }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: DEVOTIONAL_RED + '10' }]}>
            <MessageSquare color={DEVOTIONAL_RED} size={20} />
          </View>
          <AppText type="semibold" style={{ color: colors.text, fontSize: 15, marginTop: 10 }}>
            Start the Conversation
          </AppText>
          <AppText style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 4, lineHeight: 18 }}>
            Be the first to share how today’s devotional impacted you.
          </AppText>
        </View>
      ) : (
        <View style={styles.forumThreadContainer}>
          {comments.map((comment, index) => {
            const authorName = comment.profiles?.name || 'Member';
            const avatarUrl = comment.profiles?.avatar_url;
            
            // Loose string comparison for user ID matching
            const commentUserId = comment.user_id || comment.userId;
            const isOwner = Boolean(currentUser?.id && commentUserId && String(currentUser.id) === String(commentUserId));

            // Loose string comparison for liked status
            const isLiked = likedCommentIds.some((id) => String(id) === String(comment.id));
            const baseLikes = Number(comment.likes_count) || 0;
            const likesCount = isLiked ? baseLikes + 1 : baseLikes;

            const formattedTime = comment.created_at
              ? new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '';
            const isLast = index === comments.length - 1;
            const isEditingThis = editingCommentId === comment.id;

            return (
              <View key={comment.id || index} style={styles.forumRow}>
                {/* Left Column: Avatar & Line */}
                <View style={styles.avatarColumn}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.forumAvatar} />
                  ) : (
                    <View style={[styles.forumAvatarPlaceholder, { backgroundColor: DEVOTIONAL_RED + '18' }]}>
                      <AppText type="bold" style={{ color: DEVOTIONAL_RED, fontSize: 13 }}>
                        {authorName.charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                  )}
                  {!isLast && <View style={[styles.threadLine, { backgroundColor: colors.border + '60' }]} />}
                </View>

                {/* Right Column: Content */}
                <View style={styles.forumContentColumn}>
                  {/* Header metadata row */}
                  <View style={styles.forumHeaderInline}>
                    <AppText type="bold" style={{ color: colors.text, fontSize: 13.5 }}>
                      {authorName}
                    </AppText>

                    {isOwner && (
                      <View style={[styles.youBadge, { backgroundColor: DEVOTIONAL_RED + '15' }]}>
                        <AppText type="bold" style={{ color: DEVOTIONAL_RED, fontSize: 9 }}>YOU</AppText>
                      </View>
                    )}

                    <AppText style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 6 }}>
                      • {formattedTime}
                    </AppText>

                    {/* Owner Action Buttons */}
                    {isOwner && !isEditingThis && (
                      <View style={styles.inlineOwnerActions}>
                        <Pressable
                          onPress={() => {
                            console.log('[ForumSection Debug] Edit Icon Clicked for Comment:', comment.id);
                            startEdit(comment);
                          }}
                          hitSlop={8}
                          style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.5 }]}
                        >
                          <Edit2 size={12} color={colors.textSecondary} />
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            console.log('[ForumSection Debug] Delete Icon Clicked for Comment:', comment.id);
                            if (handleDeleteComment) {
                              handleDeleteComment(comment.id);
                            } else {
                              console.error('[ForumSection Debug] CRITICAL: handleDeleteComment prop is undefined!');
                            }
                          }}
                          hitSlop={8}
                          style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.5 }]}
                        >
                          <Trash2 size={12} color={colors.textSecondary} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Comment Content / Inline Edit Form */}
                  {isEditingThis ? (
                    <View style={styles.inlineEditWrapper}>
                      <TextInput
                        style={[styles.inlineEditInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
                        value={editText}
                        onChangeText={setEditText}
                        multiline
                        autoFocus
                      />
                      <View style={styles.inlineEditActions}>
                        <Pressable onPress={cancelEdit} hitSlop={8} style={styles.editCancelBtn}>
                          <X size={14} color={colors.textSecondary} />
                          <AppText style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 2 }}>Cancel</AppText>
                        </Pressable>

                        <Pressable
                          onPress={() => submitEdit(comment)}
                          disabled={savingEdit || !editText.trim()}
                          style={[styles.editSaveBtn, { backgroundColor: DEVOTIONAL_RED }]}
                        >
                          {savingEdit ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Check size={14} color="#FFF" />
                              <AppText type="bold" style={{ color: '#FFF', fontSize: 12, marginLeft: 2 }}>Save</AppText>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <AppText style={[styles.forumCommentBody, { color: colors.text }]}>
                      {comment.content}
                    </AppText>
                  )}

                  {/* Action Row (Reply & Like) */}
                  {!isEditingThis && (
                    <View style={styles.forumActionRow}>
                      <Pressable
                        hitSlop={8}
                        style={styles.actionButton}
                        onPress={() => {
                          console.log('[ForumSection Debug] Reply Button Clicked for Comment:', comment.id);
                          if (onReplyComment) {
                            onReplyComment(comment);
                          } else {
                            console.warn('[ForumSection Debug] onReplyComment prop is not passed');
                          }
                        }}
                      >
                        <CornerUpLeft size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                        <AppText type="semibold" style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Reply
                        </AppText>
                      </Pressable>

                      <Pressable
                        hitSlop={8}
                        style={[styles.actionButton, { marginLeft: 16 }]}
                        onPress={() => {
                          console.log('[ForumSection Debug] Like Button Clicked for Comment:', comment.id);
                          if (onLikeComment) {
                            onLikeComment(comment.id);
                          } else {
                            console.warn('[ForumSection Debug] onLikeComment prop is not passed');
                          }
                        }}
                      >
                        <Heart
                          size={12}
                          color={isLiked ? DEVOTIONAL_RED : colors.textSecondary}
                          fill={isLiked ? DEVOTIONAL_RED : 'transparent'}
                          style={{ marginRight: 4 }}
                        />
                        <AppText
                          type="semibold"
                          style={{ color: isLiked ? DEVOTIONAL_RED : colors.textSecondary, fontSize: 12 }}
                        >
                          {likesCount > 0 ? `${likesCount} ${likesCount === 1 ? 'Like' : 'Likes'}` : 'Like'}
                        </AppText>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  commentsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  commentSectionTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  inputBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    elevation: 1,
  },
  commentInput: {
    fontSize: 14,
    minHeight: 44,
    maxHeight: 110,
    textAlignVertical: 'top',
  },
  inputActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  sendButtonPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumThreadContainer: {
    marginTop: 2,
  },
  forumRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  avatarColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  forumAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  forumAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadLine: {
    width: 1.5,
    flex: 1,
    marginTop: 6,
    borderRadius: 1,
  },
  forumContentColumn: {
    flex: 1,
    paddingBottom: 8,
  },
  forumHeaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  youBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  inlineOwnerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 4,
    marginLeft: 2,
  },
  forumCommentBody: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  inlineEditWrapper: {
    marginTop: 6,
  },
  inlineEditInput: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  inlineEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  editCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    padding: 4,
  },
  editSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  forumActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});