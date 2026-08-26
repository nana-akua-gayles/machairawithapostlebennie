import React, { useState } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { MessageSquare, Send, Trash2, Heart, CornerUpLeft, Edit2, X, Check } from 'lucide-react-native';
import { AppText } from '../../components/AppText';

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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content || '');
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText('');
  };

  const submitEdit = async (comment) => {
    const trimmedText = editText.trim();
    if (!trimmedText || savingEdit) return;

    setSavingEdit(true);
    try {
      if (handleEditComment) {
        await handleEditComment(comment.id, trimmedText);
      } else {
        console.error('ForumSection: handleEditComment prop is not a function');
      }
      setEditingCommentId(null);
    } catch (error) {
      console.error('Error saving comment edit:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <View style={styles.commentsSection}>
      {/* Header */}
      <View style={styles.commentHeaderRow}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '15' }]}>
            <MessageSquare color={colors.primary} size={16} />
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
              if (handleAddComment) {
                handleAddComment();
              } else {
                console.error('ForumSection: handleAddComment prop is not a function');
              }
            }}
            disabled={submittingComment || !newComment?.trim()}
            style={({ pressed }) => [
              styles.sendButtonPill,
              {
                backgroundColor: newComment?.trim() ? colors.primary : colors.border + '60',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {submittingComment ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <View style={styles.sendButtonContent}>
                <AppText type="bold" style={[styles.sendButtonText, { color: colors.onPrimary }]}>Post</AppText>
                <Send color={colors.onPrimary} size={12} style={{ marginLeft: 4 }} />
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* Comments List */}
      {loadingComments ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : comments.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card + '40', borderColor: colors.border + '40' }]}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '10' }]}>
            <MessageSquare color={colors.primary} size={20} />
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
                    <View style={[styles.forumAvatarPlaceholder, { backgroundColor: colors.primary + '18' }]}>
                      <AppText type="bold" style={{ color: colors.primary, fontSize: 13 }}>
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
                    <AppText type="bold" numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.text, fontSize: 13.5, flexShrink: 1 }}>
                      {authorName}
                    </AppText>

                    {isOwner && (
                      <View style={[styles.youBadge, { backgroundColor: colors.primary + '15' }]}>
                        <AppText type="bold" style={{ color: colors.primary, fontSize: 9 }}>YOU</AppText>
                      </View>
                    )}

                    <AppText numberOfLines={1} style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 6, flexShrink: 0 }}>
                      • {formattedTime}
                    </AppText>

                    {/* Owner Action Buttons */}
                    {isOwner && !isEditingThis && (
                      <View style={styles.inlineOwnerActions}>
                        <Pressable
                          onPress={() => startEdit(comment)}
                          hitSlop={8}
                          style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.5 }]}
                        >
                          <Edit2 size={12} color={colors.textSecondary} />
                        </Pressable>

                        <Pressable
                          onPress={() => {
                            if (handleDeleteComment) {
                              handleDeleteComment(comment.id);
                            } else {
                              console.error('ForumSection: handleDeleteComment prop is not a function');
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
                          style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                        >
                          {savingEdit ? (
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                          ) : (
                            <>
                              <Check size={14} color={colors.onPrimary} />
                              <AppText type="bold" style={{ color: colors.onPrimary, fontSize: 12, marginLeft: 2 }}>Save</AppText>
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
                          if (onReplyComment) onReplyComment(comment);
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
                          if (onLikeComment) onLikeComment(comment.id);
                        }}
                      >
                        <Heart
                          size={12}
                          color={isLiked ? colors.primary : colors.textSecondary}
                          fill={isLiked ? colors.primary : 'transparent'}
                          style={{ marginRight: 4 }}
                        />
                        <AppText
                          type="semibold"
                          style={{ color: isLiked ? colors.primary : colors.textSecondary, fontSize: 12 }}
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
    minWidth: 0,
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
