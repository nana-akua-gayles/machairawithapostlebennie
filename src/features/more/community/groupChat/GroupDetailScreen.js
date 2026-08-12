import React, { useState, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, RefreshControl, Image, Alert,
  ActionSheetIOS, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Send, Users, MoreVertical, MessageSquare, Pin, Trash2, Edit3, Lock, Crown, PlusCircle,
  Check, CheckCheck, AlertCircle, Smile, X, WifiOff } from 'lucide-react-native';
import { AppText } from '../../../../components/AppText';
import { useGroupDetail } from './Usegroupdetail';
import { GroupDropdownMenu, AnnouncementModal, MembersTab, AdminTab } from './Groupdetailpanels';

const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🙏'];

export const GroupDetailScreen = ({ route, navigation }) => {
  const { group, currentUser } = route.params || {};
  const [reactionPickerFor, setReactionPickerFor] = useState(null);

  const {
    messages, inputText, refreshing, isSending, membersCount,
    activeTab, setActiveTab, editingMessageId, setEditingMessageId, editMessageText, setEditMessageText,
    isEditingMessage, members, announcements, editingAnnouncementId, setEditingAnnouncementId,
    editText, setEditText, isEditingAnnouncement, showDropdown, setShowDropdown, groupIcon,
    isUploadingAvatar, showAnnouncementModal, setShowAnnouncementModal, announcementText,
    setAnnouncementText, isPostingAnnouncement, isAdmin, flatListRef,
    isLoading, loadError, hasMoreMessages, isLoadingMore, hasMoreMembers, isLoadingMoreMembers,
    isOnline, replyingTo, typingUsers, reactionsByMessageId,
    onRefresh, loadMoreMessages, loadMoreMembers, handleChangeGroupAvatar,
    handleSendMessage, handleInputChange, retryFailedMessage, discardFailedMessage,
    startReplyingTo, cancelReply, findMessageById,
    handleEditMessageManual, handlePostAnnouncement, handleStartEditing, handleEditAnnouncementManual,
    handleDeleteMessage, handleRemoveMember, handleShareGroup, handleJoinGroup, handleLeaveGroup,
    handleDeleteGroup, toggleReaction, isReadByOthers,
  } = useGroupDetail({ group, currentUser, navigation });

  const mentionSuggestions = useMemo(() => {
    const match = inputText.match(/(?:^|\s)@(\w*)$/);
    if (!match) return [];
    const query = match[1].toLowerCase();
    return members
      .filter((m) => m.user_id !== currentUser?.id && (m.profiles?.name || '').toLowerCase().startsWith(query))
      .slice(0, 5);
  }, [inputText, members, currentUser?.id]);

  const insertMention = (name) => {
    const newText = inputText.replace(/(?:^|\s)@(\w*)$/, (matched) => {
      const prefix = matched.startsWith(' ') ? ' ' : '';
      return `${prefix}@${name} `;
    });
    handleInputChange(newText);
  };

  const renderMessageContent = (text) => {
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push({ text: text.slice(lastIndex, match.index), mention: false });
      const name = match[1];
      const isKnownMember = members.some((m) => (m.profiles?.name || '').toLowerCase() === name.toLowerCase());
      parts.push({ text: match[0], mention: isKnownMember });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex), mention: false });
    if (parts.length === 0) return text;
    return parts.map((part, idx) => (
      <AppText key={idx} style={part.mention ? styles.mentionText : undefined}>{part.text}</AppText>
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DEEP_PURPLE} />

      <LinearGradient colors={[DEEP_PURPLE, '#1a1424']} style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.safeHeaderContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ChevronLeft color="white" size={26} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <AppText type="bold" numberOfLines={1} style={styles.headerTitle}>{group?.name || 'Discussion Page'}</AppText>
              <AppText style={styles.headerSubtitle}>{membersCount} members • Learning Space</AppText>
            </View>

            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setShowDropdown(!showDropdown)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <MoreVertical color="white" size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'discussion' && styles.activeTabItem]}
              onPress={() => setActiveTab('discussion')}
              accessibilityRole="button"
              accessibilityLabel="Discussion tab"
              accessibilityState={{ selected: activeTab === 'discussion' }}
            >
              <MessageSquare color={activeTab === 'discussion' ? RED : '#94A3B8'} size={15} />
              <AppText type="bold" style={[styles.tabText, activeTab === 'discussion' && styles.activeTabText]}>Discussion</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'announcements' && styles.activeTabItem]}
              onPress={() => setActiveTab('announcements')}
              accessibilityRole="button"
              accessibilityLabel="Announcements tab"
              accessibilityState={{ selected: activeTab === 'announcements' }}
            >
              <Pin color={activeTab === 'announcements' ? RED : '#94A3B8'} size={15} />
              <AppText type="bold" style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>Announcements</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff color="#7A5B00" size={13} />
          <AppText style={styles.offlineBannerText}>You're offline — messages will send once you're back online.</AppText>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainLayer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={RED} size="large" />
            <AppText style={styles.loadingText}>Loading discussion...</AppText>
          </View>
        ) : loadError ? (
          <View style={styles.loadingContainer}>
            <AppText type="bold" style={styles.errorTitle}>Something went wrong</AppText>
            <AppText style={styles.errorText}>{loadError}</AppText>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Try again">
              <AppText type="bold" style={styles.retryButtonText}>Try Again</AppText>
            </TouchableOpacity>
          </View>
        ) : (
        <>
        {activeTab === 'discussion' && (
          <View style={{ flex: 1 }}>
            {members.some(member => member.user_id === currentUser?.id) ? (
              <View style={{ flex: 1 }}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  extraData={[editingMessageId, reactionsByMessageId, reactionPickerFor, members]}
                  keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                  contentContainerStyle={styles.messagesScroll}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                  onStartReached={loadMoreMessages}
                  onStartReachedThreshold={0.3}
                  ListHeaderComponent={
                    <View>
                      <View style={styles.groupHeaderBanner}>
                        <View style={styles.bannerIconCircle}>
                          {groupIcon ? (
                            <Image source={{ uri: groupIcon }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                          ) : (
                            <Users color={RED} size={28} />
                          )}
                        </View>
                        <AppText type="bold" style={styles.bannerTitle}>{group?.name}</AppText>
                        <AppText style={styles.bannerDesc}>{group?.description || 'Welcome to our discussion space.'}</AppText>
                      </View>

                      {isLoadingMore ? (
                        <View style={{ paddingVertical: 12 }}>
                          <ActivityIndicator color={RED} size="small" />
                        </View>
                      ) : !hasMoreMessages && messages.length > 0 ? (
                        <View style={{ paddingVertical: 12 }}>
                          <AppText style={styles.endOfHistoryText}>Beginning of conversation</AppText>
                        </View>
                      ) : null}
                    </View>
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <AppText style={styles.emptyText}>No messages yet. Be the first to spark a conversation!</AppText>
                    </View>
                  }
                  renderItem={({ item, index }) => {
                    const isMe = item.user_id === currentUser?.id;
                    const authorName = item.profiles?.name || 'Member';
                    const authorAvatar = item.profiles?.avatar_url;
                    const isAuthorAdmin = String(item.user_id) === String(group?.created_by);
                    const isEditing = editingMessageId === item.id;

                    const currentDateStr = new Date(item.created_at || Date.now()).toDateString();
                    const prevItem = messages[index - 1];
                    const prevDateStr = prevItem ? new Date(prevItem.created_at || Date.now()).toDateString() : null;
                    const showDateHeader = currentDateStr !== prevDateStr;

                    const quoted = item.reply_to_id ? (item.reply_preview || findMessageById(item.reply_to_id)) : null;
                    const quotedAuthor = item.reply_preview?.authorName
                      || (quoted?.user_id === currentUser?.id ? 'You' : quoted?.profiles?.name)
                      || 'Member';

                    const messageReactions = reactionsByMessageId[item.id] || [];
                    const groupedReactions = messageReactions.reduce((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {});

                    const handleLongPressMessage = () => {
                      const copyOption = {
                        text: 'Copy Text',
                        onPress: async () => {
                          await Clipboard.setStringAsync(item.content);
                        },
                      };
                      const replyOption = {
                        text: 'Reply',
                        onPress: () => startReplyingTo(item, isMe ? 'You' : authorName),
                      };
                      const cancelOption = { text: 'Cancel', style: 'cancel' };

                      if (Platform.OS === 'ios') {
                        ActionSheetIOS.showActionSheetWithOptions(
                          { options: ['Cancel', 'Copy Text', 'Reply'], cancelButtonIndex: 0 },
                          (buttonIndex) => {
                            if (buttonIndex === 1) copyOption.onPress();
                            if (buttonIndex === 2) replyOption.onPress();
                          }
                        );
                      } else {
                        Alert.alert('Message Options', '', [copyOption, replyOption, cancelOption], { cancelable: true });
                      }
                    };

                    return (
                      <View>
                        {showDateHeader && (
                          <View style={styles.chatDateDivider}>
                            <View style={styles.chatDateBubble}>
                              <AppText style={styles.chatDateText}>
                                {new Date(item.created_at || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                              </AppText>
                            </View>
                          </View>
                        )}

                        <View style={[styles.messageRow, isMe && styles.myMessageRow]}>
                          {!isMe && (
                            <View style={styles.messageAvatarContainer}>
                              {authorAvatar ? (
                                <Image source={{ uri: authorAvatar }} style={styles.messageAvatar} />
                              ) : (
                                <View style={styles.messageAvatarFallback}>
                                  <AppText type="bold" style={styles.avatarFallbackText}>{authorName.charAt(0).toUpperCase()}</AppText>
                                </View>
                              )}
                            </View>
                          )}

                          <View style={{ maxWidth: '78%' }}>
                            <TouchableOpacity
                              activeOpacity={0.9}
                              onLongPress={handleLongPressMessage}
                              style={[isMe ? styles.myMessageBubble : styles.peerMessageBubble, { maxWidth: undefined }]}
                            >
                              {(!isMe || isAuthorAdmin) && (
                                <View style={styles.authorRow}>
                                  {!isMe && <AppText type="bold" style={styles.messageAuthor}>{authorName}</AppText>}
                                  {isAuthorAdmin && (
                                    <View style={[styles.adminBadge, isMe && { marginLeft: 0, marginBottom: 4 }]}>
                                      <Crown color="#FFFFFF" size={9} style={{ marginRight: 2 }} />
                                      <AppText type="bold" style={styles.adminBadgeText}>ADMIN</AppText>
                                    </View>
                                  )}
                                </View>
                              )}

                              {isEditing ? (
                                <View style={{ width: '100%' }}>
                                  <TextInput
                                    style={styles.editMessageInput}
                                    defaultValue={item.content}
                                    onChangeText={(text) => setEditMessageText(text)}
                                    multiline
                                    maxLength={500}
                                    placeholderTextColor="#94A3B8"
                                  />
                                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                                    <TouchableOpacity onPress={() => setEditingMessageId(null)} style={{ marginRight: 10, paddingVertical: 2, paddingHorizontal: 6 }} accessibilityRole="button" accessibilityLabel="Cancel edit">
                                      <AppText style={{ color: '#94A3B8', fontSize: 11 }}>Cancel</AppText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => {
                                        const textToSave = editMessageText.trim() ? editMessageText : item.content;
                                        handleEditMessageManual(item.id, textToSave);
                                      }}
                                      disabled={isEditingMessage}
                                      style={{ backgroundColor: RED, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 4 }}
                                      accessibilityRole="button"
                                      accessibilityLabel="Save edited message"
                                    >
                                      <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 11 }}>Save</AppText>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ) : (
                                <>
                                  {item.reply_to_id && (
                                    <View style={styles.quotedReplyBox}>
                                      <AppText type="bold" style={styles.quotedReplyAuthor}>{quotedAuthor}</AppText>
                                      <AppText numberOfLines={1} style={styles.quotedReplyText}>
                                        {quoted?.content || 'Original message'}
                                      </AppText>
                                    </View>
                                  )}

                                  <AppText style={[styles.messageText, isMe && styles.myMessageText]}>
                                    {renderMessageContent(item.content)}
                                  </AppText>

                                  {Object.keys(groupedReactions).length > 0 && (
                                    <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap' }}>
                                      {Object.entries(groupedReactions).map(([emoji, count]) => {
                                        const reactedByMe = messageReactions.some((r) => r.emoji === emoji && r.user_id === currentUser?.id);
                                        return (
                                          <TouchableOpacity
                                            key={emoji}
                                            onPress={() => toggleReaction(item.id, emoji)}
                                            style={[styles.reactionChip, reactedByMe && styles.reactionChipActive]}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${emoji} reaction, ${count} ${count === 1 ? 'person' : 'people'}. Tap to toggle your reaction.`}
                                          >
                                            <AppText style={styles.reactionChipText}>{emoji} {count}</AppText>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  )}

                                  {reactionPickerFor === item.id && (
                                    <View style={styles.reactionPickerRow}>
                                      {QUICK_REACTIONS.map((emoji) => (
                                        <TouchableOpacity
                                          key={emoji}
                                          onPress={() => { toggleReaction(item.id, emoji); setReactionPickerFor(null); }}
                                          style={{ marginRight: 10 }}
                                          accessibilityRole="button"
                                          accessibilityLabel={`React with ${emoji}`}
                                        >
                                          <AppText style={{ fontSize: 18 }}>{emoji}</AppText>
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  )}

                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                    {item.status === 'sending' ? (
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ActivityIndicator size="small" color="#667781" />
                                        <AppText style={[styles.messageTime, isMe && styles.myMessageTime, { marginLeft: 6 }]}>Sending...</AppText>
                                      </View>
                                    ) : item.status === 'failed' ? (
                                      <TouchableOpacity
                                        onPress={() => retryFailedMessage(item.id)}
                                        onLongPress={() => discardFailedMessage(item.id)}
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Message failed to send. Tap to retry, long-press to discard."
                                      >
                                        <AlertCircle color="#D14343" size={12} />
                                        <AppText style={styles.failedText}>Failed · Tap to retry</AppText>
                                      </TouchableOpacity>
                                    ) : (
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <AppText style={[styles.messageTime, isMe && styles.myMessageTime]}>
                                          {new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {item.edited_at ? ' · edited' : ''}
                                        </AppText>
                                        {isMe && item.status === 'sent' && (
                                          isReadByOthers(item) ? (
                                            <CheckCheck color="#53BDEB" size={12} style={{ marginLeft: 4 }} />
                                          ) : (
                                            <Check color="#667781" size={11} style={{ marginLeft: 4 }} />
                                          )
                                        )}
                                      </View>
                                    )}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                                      {item.status !== 'sending' && item.status !== 'failed' && (
                                        <TouchableOpacity
                                          onPress={() => setReactionPickerFor(reactionPickerFor === item.id ? null : item.id)}
                                          style={{ marginRight: 10, padding: 2 }}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                          accessibilityRole="button"
                                          accessibilityLabel="Add reaction"
                                        >
                                          <Smile color="#667781" size={12} />
                                        </TouchableOpacity>
                                      )}
                                      {isMe && item.status !== 'sending' && item.status !== 'failed' && (
                                        <TouchableOpacity
                                          onPress={() => { setEditingMessageId(item.id); setEditMessageText(item.content); }}
                                          style={{ marginRight: 10, padding: 2 }}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                          accessibilityRole="button"
                                          accessibilityLabel="Edit message"
                                        >
                                          <Edit3 color="#667781" size={12} />
                                        </TouchableOpacity>
                                      )}
                                      {(isMe || isAdmin) && item.status !== 'sending' && item.status !== 'failed' && (
                                        <TouchableOpacity
                                          onPress={() => handleDeleteMessage(item.id, false)}
                                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                          accessibilityRole="button"
                                          accessibilityLabel="Delete message"
                                        >
                                          <Trash2 color="#667781" size={12} />
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                />

                {typingUsers.length > 0 && (
                  <View style={styles.typingIndicatorBar}>
                    <AppText style={styles.typingIndicatorText}>
                      {typingUsers.length === 1
                        ? `${typingUsers[0].name || 'Someone'} is typing...`
                        : `${typingUsers.length} people are typing...`}
                    </AppText>
                  </View>
                )}

                {replyingTo && (
                  <View style={styles.replyPreviewBar}>
                    <View style={{ flex: 1 }}>
                      <AppText type="bold" style={styles.replyPreviewAuthor}>Replying to {replyingTo.authorName}</AppText>
                      <AppText numberOfLines={1} style={styles.replyPreviewText}>{replyingTo.content}</AppText>
                    </View>
                    <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Cancel reply">
                      <X color="#667781" size={16} />
                    </TouchableOpacity>
                  </View>
                )}

                {mentionSuggestions.length > 0 && (
                  <View style={styles.mentionSuggestionRow}>
                    {mentionSuggestions.map((m) => (
                      <TouchableOpacity
                        key={m.user_id}
                        onPress={() => insertMention(m.profiles?.name || 'Member')}
                        style={styles.mentionSuggestionChip}
                        accessibilityRole="button"
                        accessibilityLabel={`Mention ${m.profiles?.name || 'Member'}`}
                      >
                        <AppText style={styles.mentionSuggestionText}>@{m.profiles?.name || 'Member'}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.inputBarContainer}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Share a thought or message..."
                      placeholderTextColor="#94A3B8"
                      value={inputText}
                      onChangeText={handleInputChange}
                      multiline
                      maxLength={500}
                      accessibilityLabel="Message input"
                    />
                    <TouchableOpacity
                      style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
                      onPress={handleSendMessage}
                      disabled={!inputText.trim() || isSending}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Send message"
                    >
                      <Send color="#FFF" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.nonMemberContainer}>
                <View style={styles.groupHeaderBanner}>
                  <View style={styles.bannerIconCircle}>
                    {groupIcon ? (
                      <Image source={{ uri: groupIcon }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                    ) : (
                      <Users color={RED} size={28} />
                    )}
                  </View>
                  <AppText type="bold" style={styles.bannerTitle}>{group?.name}</AppText>
                  <AppText style={styles.bannerDesc}>{group?.description || 'Welcome to our discussion space.'}</AppText>
                </View>
                <Lock color="#94A3B8" size={36} style={{ marginBottom: 12 }} />
                <AppText type="bold" style={styles.lockTitle}>Private Discussion</AppText>
                <AppText style={styles.lockDesc}>
                  Join this group to participate in the conversation and view messages.
                </AppText>
                <TouchableOpacity
                  style={styles.joinDiscussionButton}
                  onPress={handleJoinGroup}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Join group"
                >
                  <AppText type="bold" style={styles.joinDiscussionText}>Join Group</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'announcements' && (
          <View style={{ flex: 1 }}>
            {members.some(member => member.user_id === currentUser?.id) ? (
              <FlatList
                data={announcements}
                extraData={editingAnnouncementId}
                keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
                ListHeaderComponent={
                  isAdmin ? (
                    <View style={{ marginBottom: 24 }}>
                      <TouchableOpacity
                        style={styles.modernPostButton}
                        onPress={() => { setAnnouncementText(''); setShowAnnouncementModal(true); }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="New announcement"
                      >
                        <PlusCircle color="#FFFFFF" size={16} />
                        <AppText type="bold" style={{ color: '#FFFFFF', marginLeft: 8, fontSize: 13, letterSpacing: 0.5 }}>NEW ANNOUNCEMENT</AppText>
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Pin color="#94A3B8" size={28} style={{ marginBottom: 12, opacity: 0.5 }} />
                    <AppText style={styles.emptyText}>No announcements posted yet.</AppText>
                  </View>
                }
                renderItem={({ item }) => {
                  const isEditing = editingAnnouncementId === item.id;

                  return (
                    <View style={styles.rawAnnouncementItem}>
                      <View style={styles.rawIndicator} />
                      <View style={{ flex: 1 }}>
                        {isEditing ? (
                          <View>
                            <TextInput
                              style={styles.editAnnouncementInput}
                              defaultValue={item.content}
                              onChangeText={(text) => setEditText(text)}
                              multiline
                              maxLength={1000}
                              placeholderTextColor="#94A3B8"
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                              <TouchableOpacity onPress={() => setEditingAnnouncementId(null)} style={{ marginRight: 12, paddingVertical: 4, paddingHorizontal: 8 }} accessibilityRole="button" accessibilityLabel="Cancel edit">
                                <AppText style={{ color: '#94A3B8', fontSize: 12 }}>Cancel</AppText>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  const textToSave = editText.trim() ? editText : item.content;
                                  handleEditAnnouncementManual(item.id, textToSave);
                                }}
                                disabled={isEditingAnnouncement}
                                style={{ backgroundColor: RED, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 }}
                                accessibilityRole="button"
                                accessibilityLabel="Save edited announcement"
                              >
                                <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 12 }}>Save</AppText>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <AppText style={styles.rawAnnouncementText}>{item.content}</AppText>
                            <View style={styles.rawMetaRow}>
                              <AppText style={styles.rawDateText}>
                                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }).toUpperCase()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {item.edited_at ? ' · edited' : ''}
                              </AppText>
                              {isAdmin && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <TouchableOpacity
                                    onPress={() => handleStartEditing(item)}
                                    style={{ marginRight: 14, padding: 2 }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    accessibilityRole="button"
                                    accessibilityLabel="Edit announcement"
                                  >
                                    <Edit3 color="#64748B" size={13} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteMessage(item.id, true)} style={styles.rawDeleteTouch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Delete announcement">
                                    <Trash2 color="#64748B" size={13} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={styles.nonMemberContainer}>
                <Lock color="#94A3B8" size={36} style={{ marginBottom: 12 }} />
                <AppText type="bold" style={styles.lockTitle}>Private Announcements</AppText>
                <AppText style={styles.lockDesc}>
                  Join this group to view announcements.
                </AppText>
                <TouchableOpacity
                  style={styles.joinDiscussionButton}
                  onPress={handleJoinGroup}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Join group"
                >
                  <AppText type="bold" style={styles.joinDiscussionText}>Join Group</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'members' && (
          <MembersTab
            members={members}
            membersCount={membersCount}
            group={group}
            isAdmin={isAdmin}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onBack={() => setActiveTab('discussion')}
            onRemoveMember={handleRemoveMember}
            onLoadMore={loadMoreMembers}
            hasMore={hasMoreMembers}
            isLoadingMore={isLoadingMoreMembers}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminTab
            onBack={() => setActiveTab('discussion')}
            onManageParticipants={() => setActiveTab('members')}
            onChangeAvatar={handleChangeGroupAvatar}
            isUploadingAvatar={isUploadingAvatar}
          />
        )}
        </>
        )}
      </KeyboardAvoidingView>

      {showDropdown && (
        <GroupDropdownMenu
          isAdmin={isAdmin}
          onClose={() => setShowDropdown(false)}
          onOpenAdmin={() => { setShowDropdown(false); setActiveTab('admin'); }}
          onShare={handleShareGroup}
          onDelete={handleDeleteGroup}
          onLeave={handleLeaveGroup}
        />
      )}

      <AnnouncementModal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        text={announcementText}
        onChangeText={setAnnouncementText}
        onPost={handlePostAnnouncement}
        isPosting={isPostingAnnouncement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1424' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
  errorTitle: { fontSize: 16, color: DEEP_PURPLE, marginBottom: 6, textAlign: 'center' },
  errorText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, lineHeight: 18 },
  retryButton: { backgroundColor: RED, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13 },
  endOfHistoryText: { color: '#94A3B8', fontSize: 11, textAlign: 'center', letterSpacing: 0.3 },
  offlineBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3CD', paddingVertical: 6, paddingHorizontal: 12 },
  offlineBannerText: { color: '#7A5B00', fontSize: 11, marginLeft: 6, textAlign: 'center' },
  headerBackground: { paddingBottom: 22, zIndex: 10 },
  safeHeaderContainer: { paddingHorizontal: 20 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 12 },
  headerIconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, marginHorizontal: 12, alignItems: 'center' },
  headerTitle: { fontSize: 17, color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 11, color: '#CBD5E1', marginTop: 4, letterSpacing: 0.2 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: 5, marginTop: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12 },
  activeTabItem: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: '#94A3B8', marginLeft: 6 },
  activeTabText: { color: RED },
  mainLayer: { flex: 1, backgroundColor: '#EFEAE2', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden', paddingTop: 12, zIndex: 1 },
  messagesScroll: { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 8 },
  groupHeaderBanner: { backgroundColor: '#FFF1F2', borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FFE4E6' },
  bannerIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  bannerTitle: { fontSize: 18, color: DEEP_PURPLE, textAlign: 'center', marginBottom: 6 },
  bannerDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyContainer: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  messageRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  messageAvatarContainer: { marginRight: 6, marginBottom: 2 },
  messageAvatar: { width: 26, height: 26, borderRadius: 13 },
  messageAvatarFallback: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 11, color: DEEP_PURPLE },
  myMessageBubble: { backgroundColor: '#DCF8C6', borderRadius: 10, borderTopRightRadius: 3,
    paddingVertical: 7, paddingHorizontal: 10},
  peerMessageBubble: { backgroundColor: '#FFFFFF', borderRadius: 10, borderTopLeftRadius: 3,
    paddingVertical: 7, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E4E4E7'},
  chatDateDivider: { alignItems: 'center', marginVertical: 12,},
  chatDateBubble: { backgroundColor: '#E9EDEF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,},
  chatDateText: { color: '#54656F', fontSize: 10, letterSpacing: 1},
  editMessageInput: { backgroundColor: '#F0F2F5', borderRadius: 8, color: '#111B21', padding: 8, fontSize: 14,
    minHeight: 50, textAlignVertical: 'top'},
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  messageAuthor: { fontSize: 11, color: RED, marginRight: 6 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: RED, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  adminBadgeText: { fontSize: 8, color: '#FFFFFF', letterSpacing: 0.5 },
  messageText: { fontSize: 14, color: '#111B21', lineHeight: 19 },
  myMessageText: { color: '#111B21' },
  mentionText: { color: RED, fontWeight: '700' },
  messageTime: { fontSize: 9, color: '#667781', marginTop: 2 },
  myMessageTime: { color: '#667781' },
  failedText: { fontSize: 9, color: '#D14343', marginLeft: 4 },
  quotedReplyBox: { backgroundColor: 'rgba(0,0,0,0.05)', borderLeftWidth: 3, borderLeftColor: RED, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 8, marginBottom: 6 },
  quotedReplyAuthor: { fontSize: 10, color: RED },
  quotedReplyText: { fontSize: 11, color: '#54656F' },
  reactionChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginTop: 2 },
  reactionChipActive: { backgroundColor: '#FFE4E6', borderWidth: 1, borderColor: RED },
  reactionChipText: { fontSize: 11, color: '#111B21' },
  reactionPickerRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6, alignSelf: 'flex-start', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#E4E4E7' },
  typingIndicatorBar: { paddingHorizontal: 20, paddingVertical: 4 },
  typingIndicatorText: { fontSize: 11, color: '#54656F', fontStyle: 'italic' },
  replyPreviewBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F2F5', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#E4E4E7' },
  replyPreviewAuthor: { fontSize: 11, color: RED },
  replyPreviewText: { fontSize: 12, color: '#54656F' },
  mentionSuggestionRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 6, backgroundColor: '#FFFFFF' },
  mentionSuggestionChip: { backgroundColor: '#F0F2F5', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  mentionSuggestionText: { fontSize: 12, color: DEEP_PURPLE },
  inputBarContainer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 24, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 4 },
  textInput: { flex: 1, maxHeight: 100, fontSize: 14, color: DEEP_PURPLE, paddingVertical: 6 },
  sendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: RED, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  announcementCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 22, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  createAnnouncementButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DEEP_PURPLE, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 },
  modernPostButton: { height: 48, backgroundColor: RED, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',},
  rawAnnouncementItem: { flexDirection: 'row', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.04)',},
  rawIndicator: { width: 2, height: '100%', backgroundColor: RED, borderRadius: 2, marginRight: 14,},
  rawAnnouncementText: { fontSize: 15, lineHeight: 22, letterSpacing: 0.2,},
  rawMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8,},
  rawDateText: { color: '#64748B', fontSize: 10, letterSpacing: 1,},
  rawDeleteTouch: { padding: 2,},
  nonMemberContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 60 },
  lockTitle: { fontSize: 18, color: DEEP_PURPLE, marginBottom: 6, textAlign: 'center' },
  lockDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  joinDiscussionButton: { backgroundColor: RED, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 8 },
  joinDiscussionText: { color: '#FFFFFF', fontSize: 14 },
  editAnnouncementInput: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8,
    padding: 10, fontSize: 15, minHeight: 70, textAlignVertical: 'top',},
});