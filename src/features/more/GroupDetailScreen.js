import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, RefreshControl, Image, Share, Alert, Modal, TouchableWithoutFeedback,
  ActionSheetIOS, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Send, Users, Share2, MoreVertical, MessageSquare, Pin, Trash2, UserX, Edit3, LogOut, PlusCircle, Crown, Camera } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { uploadGroupAvatar } from './groupStorage';

const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';

export const GroupDetailScreen = ({ route, navigation }) => {
  const { group, currentUser } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [membersCount, setMembersCount] = useState(group?.members_count || 1);
  const [isJoined, setIsJoined] = useState(true);
  const [activeTab, setActiveTab] = useState('discussion'); 
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  
  const [members, setMembers] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [groupIcon, setGroupIcon] = useState(group?.group_icon || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  const isAdmin = group?.created_by === currentUser?.id;
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!group?.id) return;
    fetchGroupData();

    const messageChannel = supabase
      .channel(`public:group_messages:group_id=eq.${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` }, 
        (payload) => {
          if (payload.new.is_announcement) {
            setAnnouncements((prev) => prev.some(a => a.id === payload.new.id) ? prev : [payload.new, ...prev]);
          } else {
            setMessages((prev) => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
          }
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          setAnnouncements((prev) => prev.filter(a => a.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [group?.id]);

  const fetchGroupData = async () => {
    try {
      const { data: groupData } = await supabase.from('groups').select('*').eq('id', group.id).single();
      if (groupData) setGroupIcon(groupData.group_icon);

      const { data: msgData } = await supabase.from('group_messages').select(`*, profiles:user_id (id, name, avatar_url)`).eq('group_id', group.id).order('created_at', { ascending: true });
      if (msgData) {
        setMessages(msgData.filter(m => !m.is_announcement));
        setAnnouncements(msgData.filter(m => m.is_announcement).reverse());
      }

      const { data: memberData } = await supabase.from('group_members').select('*').eq('group_id', group.id);
      if (memberData && memberData.length > 0) {
        const userIds = memberData.map(m => m.user_id);
        const { data: profilesData } = await supabase.from('profiles').select('id, name, avatar_url').in('id', userIds);
        const profileMap = {};
        (profilesData || []).forEach(p => { profileMap[p.id] = p; });

        const combinedMembers = memberData.map(m => ({ ...m, profiles: profileMap[m.user_id] || null }));
        setMembers(combinedMembers);
        setMembersCount(combinedMembers.length);
        setIsJoined(combinedMembers.some(m => m.user_id === currentUser?.id));
      }
    } catch (err) {
      console.error('Error loading group data:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroupData();
    setRefreshing(false);
  }, [group?.id]);

  const handleChangeGroupAvatar = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only discussion leaders can change the profile picture.');
      return;
    }

    setIsUploadingAvatar(true);
    const newUrl = await uploadGroupAvatar(group.id);
    setIsUploadingAvatar(false);

    if (newUrl) {
      setGroupIcon(newUrl);
      Alert.alert('Success', 'Discussion picture updated successfully!');
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending || !isJoined) return;

    setIsSending(true);
    setInputText('');
    try {
      const { data, error } = await supabase.from('group_messages').insert([
        { group_id: group.id, user_id: currentUser.id, content: trimmed, is_announcement: false }
      ]).select(`*, profiles:user_id (id, name, avatar_url)`).single();

      if (error) throw error;
      if (data) setMessages((prev) => [...prev, data]);
    } catch (err) {
      setInputText(trimmed);
    } finally {
      setIsSending(false);
    }
  };

const handleEditMessageManual = async (messageId, newContent) => {
    const trimmed = newContent.trim();
    if (!trimmed || isEditingMessage) return;

    setIsEditingMessage(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .update({ content: trimmed })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((item) => (item.id === messageId ? { ...item, content: trimmed } : item))
      );

      setEditingMessageId(null);
      setEditMessageText('');
    } catch (err) {
      Alert.alert('Error', 'Could not update message.');
    } finally {
      setIsEditingMessage(false);
    }
  };


  const handlePostAnnouncement = async () => {
    const trimmed = announcementText.trim();
    if (!trimmed || isPostingAnnouncement || !isAdmin) return;

    setIsPostingAnnouncement(true);
    try {
      const { data, error } = await supabase.from('group_messages').insert([
        { group_id: group.id, user_id: currentUser.id, content: trimmed, is_announcement: true }
      ]).select(`*, profiles:user_id (id, name, avatar_url)`).single();

      if (error) throw error;
      if (data) setAnnouncements((prev) => [data, ...prev]);

      setAnnouncementText('');
      setShowAnnouncementModal(false);
      Alert.alert('Success', 'Announcement posted successfully!');
    } catch (err) {
      Alert.alert('Error', 'Could not post announcement.');
    } finally {
      setIsPostingAnnouncement(false);
    }
  };


const handleEditAnnouncement = async () => {
    const trimmed = editText.trim();
    if (!trimmed || isEditingAnnouncement || !editingAnnouncementId) return;

    setIsEditingAnnouncement(true);
    try {
      const { error } = await supabase
        .from('group_messages')
        .update({ content: trimmed })
        .eq('id', editingAnnouncementId);

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((item) => (item.id === editingAnnouncementId ? { ...item, content: trimmed } : item))
      );

      setEditingAnnouncementId(null);
      setEditText('');
      Alert.alert('Success', 'Announcement updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Could not update announcement.');
    } finally {
      setIsEditingAnnouncement(false);
    }
  };


  const handleDeleteMessage = async (messageId) => {
    Alert.alert('Delete Announcement', 'Are you sure you want to remove this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('group_messages')
            .delete()
            .eq('id', messageId);

          if (error) {
            Alert.alert('Delete Failed', error.message);
            return;
          }

          // Successfully deleted from database, now update local state
          setMessages((prev) => prev.filter(m => m.id !== messageId));
          setAnnouncements((prev) => prev.filter(a => a.id !== messageId));
        }
      }
    ]);
  };

  const handleRemoveMember = async (memberUserId) => {
    if (memberUserId === group.created_by) return;
    Alert.alert('Remove Member', 'Remove this member from the discussion?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', memberUserId);
          setMembers((prev) => prev.filter(m => m.user_id !== memberUserId));
          setMembersCount((prev) => Math.max(1, prev - 1));
        }
      }
    ]);
  };

  const handleShareGroup = async () => {
    setShowDropdown(false);
    await Share.share({ message: `Join our discussion page "${group.name}"!` });
  };

  const handleLeaveGroup = async () => {
    setShowDropdown(false);
    Alert.alert('Leave Page', `Leave "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', currentUser.id);
          navigation.goBack();
        }
      }
    ]);
  };

  const handleDeleteGroup = async () => {
    setShowDropdown(false);
    Alert.alert('Delete Page', `Delete "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await supabase.from('groups').delete().eq('id', group.id);
          navigation.goBack();
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DEEP_PURPLE} />
      
      <LinearGradient colors={[DEEP_PURPLE, '#1a1424']} style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.safeHeaderContainer}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <ChevronLeft color="white" size={26} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <AppText type="bold" numberOfLines={1} style={styles.headerTitle}>{group?.name || 'Discussion Page'}</AppText>
              <AppText style={styles.headerSubtitle}>{membersCount} members • Learning Space</AppText>
            </View>
            
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setShowDropdown(!showDropdown)} activeOpacity={0.8}>
              <MoreVertical color="white" size={18} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'discussion' && styles.activeTabItem]} onPress={() => setActiveTab('discussion')}>
              <MessageSquare color={activeTab === 'discussion' ? RED : '#94A3B8'} size={15} />
              <AppText type="bold" style={[styles.tabText, activeTab === 'discussion' && styles.activeTabText]}>Discussion</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabItem, activeTab === 'announcements' && styles.activeTabItem]} onPress={() => setActiveTab('announcements')}>
              <Pin color={activeTab === 'announcements' ? RED : '#94A3B8'} size={15} />
              <AppText type="bold" style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]}>Announcements</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.mainLayer}>
        {activeTab === 'discussion' && (
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={messages}
              extraData={editingMessageId}
              keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
              contentContainerStyle={styles.messagesScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListHeaderComponent={
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
                const isAuthorAdmin = item.user_id === group?.created_by;
                const isEditing = editingMessageId === item.id;

                // Date separator logic
                const currentDateStr = new Date(item.created_at || Date.now()).toDateString();
                const prevItem = messages[index - 1];
                const prevDateStr = prevItem ? new Date(prevItem.created_at || Date.now()).toDateString() : null;
                const showDateHeader = currentDateStr !== prevDateStr;

                const handleLongPressMessage = () => {
    const copyOption = {
      text: 'Copy Text',
      onPress: async () => {
        await Clipboard.setStringAsync(item.content);
      },
    };

    const cancelOption = {
      text: 'Cancel',
      style: 'cancel',
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Copy Text'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            copyOption.onPress();
          }
        }
      );
    } else {
      Alert.alert(
        'Message Options',
        '',
        [copyOption, cancelOption],
        { cancelable: true }
      );
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
        
        {/* Triggers options menu on long press */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onLongPress={handleLongPressMessage}
          style={[styles.messageBubble, isMe ? styles.myMessageBubble : styles.peerMessageBubble]}
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
                <TouchableOpacity onPress={() => setEditingMessageId(null)} style={{ marginRight: 10, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <AppText style={{ color: '#94A3B8', fontSize: 11 }}>Cancel</AppText>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    const textToSave = editMessageText.trim() ? editMessageText : item.content;
                    handleEditMessageManual(item.id, textToSave);
                  }} 
                  disabled={isEditingMessage} 
                  style={{ backgroundColor: RED, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 4 }}
                >
                  <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 11 }}>Save</AppText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <AppText style={[styles.messageText, isMe && styles.myMessageText]}>{item.content}</AppText>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <AppText style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {new Date(item.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                  {(isMe || isAdmin) && (
                    <TouchableOpacity 
                      onPress={() => { setEditingMessageId(item.id); setEditMessageText(item.content); }} 
                      style={{ marginRight: 10, padding: 2 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Edit3 color={isMe ? 'rgba(255,255,255,0.8)' : '#94A3B8'} size={12} />
                    </TouchableOpacity>
                  )}
                  {(isMe || isAdmin) && (
                    <TouchableOpacity onPress={() => handleDeleteMessage(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Trash2 color={isMe ? 'rgba(255,255,255,0.8)' : '#94A3B8'} size={12} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}}
/>

            <View style={styles.inputBarContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share a thought or message..."
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity 
                  style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
                  onPress={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                  activeOpacity={0.8}
                >
                  <Send color="#FFF" size={18} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'announcements' && (
          <FlatList
            data={announcements}
            extraData={editingAnnouncementId}
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
            ListHeaderComponent={
              isAdmin ? (
                <View style={{ marginBottom: 24 }}>
                  <TouchableOpacity style={styles.modernPostButton} onPress={() => { setAnnouncementText(''); setShowAnnouncementModal(true); }} activeOpacity={0.8}>
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
                          <TouchableOpacity onPress={() => setEditingAnnouncementId(null)} style={{ marginRight: 12, paddingVertical: 4, paddingHorizontal: 8 }}>
                            <AppText style={{ color: '#94A3B8', fontSize: 12 }}>Cancel</AppText>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => {
                              const textToSave = editText.trim() ? editText : item.content;
                              handleEditAnnouncementManual(item.id, textToSave);
                            }} 
                            disabled={isEditingAnnouncement} 
                            style={{ backgroundColor: RED, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 }}
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
                          </AppText>
                          {isAdmin && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableOpacity 
                                onPress={() => handleStartEditing(item)} 
                                style={{ marginRight: 14, padding: 2 }} 
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Edit3 color="#64748B" size={13} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteMessage(item.id)} style={styles.rawDeleteTouch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
        )}

        {activeTab === 'members' && (
          <FlatList
            data={members}
            keyExtractor={(item) => item.user_id.toString()}
            contentContainerStyle={{ padding: 24 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
            ListHeaderComponent={
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <AppText type="bold" style={{ fontSize: 16, color: DEEP_PURPLE }}>Discussion Members ({membersCount})</AppText>
                <TouchableOpacity onPress={() => setActiveTab('discussion')} activeOpacity={0.7}>
                  <AppText type="bold" style={{ fontSize: 13, color: RED }}>Back to Conversation</AppText>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
              const memberName = profile?.name || 'Member';
              const memberAvatar = profile?.avatar_url;
              const isOwner = item.user_id === group?.created_by;

              return (
                <View style={styles.memberCard}>
                  {memberAvatar ? (
                    <Image source={{ uri: memberAvatar }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.messageAvatarFallback}><AppText type="bold" style={styles.avatarFallbackText}>{memberName.charAt(0).toUpperCase()}</AppText></View>
                  )}
                  <View style={{ flex: 1, marginLeft: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <AppText type="bold" style={styles.memberName} numberOfLines={1}>{memberName}</AppText>
                      <AppText style={styles.memberRole}>{isOwner ? 'Page Admin' : 'Member'}</AppText>
                    </View>
                    {isOwner && (
                      <View style={[styles.adminBadge, { paddingHorizontal: 8, paddingVertical: 3 }]}>
                        <Crown color="#FFFFFF" size={9} style={{ marginRight: 4 }} /><AppText type="bold" style={[styles.adminBadgeText, { fontSize: 11 }]}>ADMIN</AppText>
                      </View>
                    )}
                  </View>
                  {isAdmin && !isOwner && (
                    <TouchableOpacity style={[styles.removeMemberButton, { marginLeft: 10 }]} onPress={() => handleRemoveMember(item.user_id)} activeOpacity={0.8}>
                      <UserX color={RED} size={18} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <FlatList
            data={[{ id: 'admin-dashboard' }]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 24 }}
            renderItem={() => (
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setActiveTab('discussion')} activeOpacity={0.7}>
                    <AppText type="bold" style={{ fontSize: 13, color: RED }}>Back to Conversation</AppText>
                  </TouchableOpacity>
                </View>

                <View style={styles.adminHeroCard}>
                  <AppText type="bold" style={{ fontSize: 18, color: DEEP_PURPLE, marginBottom: 4 }}>ADMIN DASHBOARD</AppText>
                  <AppText style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
                    Manage community participants, moderation controls, and your group's display profile.
                  </AppText>

                  <TouchableOpacity 
                    style={[styles.changeAvatarButton, isUploadingAvatar && { opacity: 0.6 }]}
                    onPress={handleChangeGroupAvatar}
                    disabled={isUploadingAvatar}
                    activeOpacity={0.8}
                  >
                    <Camera color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
                    <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 14 }}>
                      {isUploadingAvatar ? 'Updating Picture...' : 'Change Page Icon'}
                    </AppText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.adminActionButton} onPress={() => setActiveTab('members')} activeOpacity={0.8}>
                  <Users color="#FFFFFF" size={18} />
                  <AppText type="bold" style={{ color: '#FFFFFF', marginLeft: 10, fontSize: 15 }}>Manage Participants</AppText>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>

      {showDropdown && (
        <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
          <View style={styles.dropdownOverlay}>
            <View style={styles.dropdownContainer}>
              {isAdmin && (
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); setActiveTab('admin'); }} activeOpacity={0.7}>
                  <AppText type="bold" style={[styles.dropdownText, { color: RED }]}>Admin Dashboard</AppText>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.dropdownItem} onPress={handleShareGroup} activeOpacity={0.7}>
                <Share2 color={DEEP_PURPLE} size={16} /><AppText type="bold" style={styles.dropdownText}>Share Page</AppText>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              {isAdmin ? (
                <TouchableOpacity style={styles.dropdownItem} onPress={handleDeleteGroup} activeOpacity={0.7}>
                  <Trash2 color={RED} size={16} /><AppText type="bold" style={[styles.dropdownText, { color: RED }]}>Delete Page</AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.dropdownItem} onPress={handleLeaveGroup} activeOpacity={0.7}>
                  <LogOut color={RED} size={16} /><AppText type="bold" style={[styles.dropdownText, { color: RED }]}>Leave Page</AppText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      )}

      <Modal visible={showAnnouncementModal} transparent={true} animationType="fade" onRequestClose={() => setShowAnnouncementModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Pin color={RED} size={20} /><AppText type="bold" style={{ fontSize: 18, color: DEEP_PURPLE, marginLeft: 8 }}>New Announcement</AppText>
            </View>
            <TextInput
              style={styles.announcementInput}
              placeholder="Write an announcement..."
              placeholderTextColor="#94A3B8"
              value={announcementText}
              onChangeText={setAnnouncementText}
              multiline
              maxLength={1000}
            />
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAnnouncementModal(false)} activeOpacity={0.8}>
                <AppText type="bold" style={{ color: '#64748B', fontSize: 14 }}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPostButton, (!announcementText.trim() || isPostingAnnouncement) && { opacity: 0.5 }]} onPress={handlePostAnnouncement} disabled={!announcementText.trim() || isPostingAnnouncement} activeOpacity={0.8}>
                <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 14 }}>Post</AppText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1424' },
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
  mainLayer: { flex: 1, backgroundColor: '#F8FAFC', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden', paddingTop: 12, zIndex: 1 },
  messagesScroll: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  groupHeaderBanner: { backgroundColor: '#FFF1F2', borderRadius: 24, padding: 22, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FFE4E6' },
  bannerIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  bannerTitle: { fontSize: 18, color: DEEP_PURPLE, textAlign: 'center', marginBottom: 6 },
  bannerDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  emptyContainer: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  messageAvatarContainer: { marginRight: 8, marginBottom: 2 },
  messageAvatar: { width: 30, height: 30, borderRadius: 15 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  messageAvatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 12, color: DEEP_PURPLE },
  myMessageBubble: { backgroundColor: RED, borderTopLeftRadius: 16, borderTopRightRadius: 4, borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16, padding: 12, maxWidth: '75%'},
  peerMessageBubble: { backgroundColor: 'rgba(53, 42, 72, 0.6)', borderTopLeftRadius: 4, borderTopRightRadius: 16,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 12, maxWidth: '75%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',},
  chatDateDivider: { alignItems: 'center', marginVertical: 16,},
  chatDateBubble: { backgroundColor: 'rgba(255, 255, 255, 0.06)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10,},
  chatDateText: { color: '#94A3B8', fontSize: 10, letterSpacing: 1},
  editMessageInput: { backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 8, color: '#FFFFFF', padding: 8, fontSize: 14,
    minHeight: 50, textAlignVertical: 'top'},
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  messageAuthor: { fontSize: 11, color: RED, marginRight: 6 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: RED, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  adminBadgeText: { fontSize: 8, color: '#FFFFFF', letterSpacing: 0.5 },
  messageText: { fontSize: 14, color: DEEP_PURPLE, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageTime: { fontSize: 9, color: '#94A3B8', marginTop: 2 },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  inputBarContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
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
  editAnnouncementInput: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8,
    padding: 10, fontSize: 15, minHeight: 70, textAlignVertical: 'top',},
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  memberName: { fontSize: 15, color: DEEP_PURPLE },
  memberRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  removeMemberButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center' },
  adminHeroCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 54, alignItems: 'center', marginBottom: 26, borderWidth: 1, borderColor: '#F1F5F9' },
  changeAvatarButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: RED, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18, width: '100%' },
  adminActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DEEP_PURPLE, borderRadius: 20, paddingVertical: 26, paddingHorizontal: 20 },
  dropdownOverlay: { position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, zIndex: 999 },
  dropdownContainer: { position: 'absolute', top: 76, right: 25, width: 210, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 25, paddingHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  dropdownText: { fontSize: 14, color: DEEP_PURPLE, marginLeft: 10 },
  dropdownDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4, marginHorizontal: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24 },
  announcementInput: { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, fontSize: 15, color: DEEP_PURPLE, height: 120, textAlignVertical: 'top', marginBottom: 20 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  modalPostButton: { backgroundColor: RED, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }
});