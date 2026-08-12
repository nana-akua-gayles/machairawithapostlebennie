import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert, Share } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../../config/supabaseClient';
import { uploadGroupAvatar } from './groupStorage';
import { registerForPushNotificationsAsync } from './pushNotifications';

// NOTE ON SECURITY: `isAdmin` below only controls what buttons/screens are
// shown on this device. It is NOT a security boundary. Every insert/update/
// delete call in this hook must also be protected by Supabase Row Level
// Security policies (see supabase_migration.sql) — otherwise any
// authenticated user could call the Supabase client directly and bypass
// these UI checks entirely.

const MESSAGES_PAGE_SIZE = 30;
const MEMBERS_PAGE_SIZE = 40;
const MAX_MESSAGES_IN_MEMORY = 200;
const SEND_COOLDOWN_MS = 1200;

// Minimal placeholder content filter. This is NOT real moderation — swap in
// a moderation API (or at least a maintained word list) before launch.
const BLOCKED_WORDS = [];
const containsBlockedContent = (text) => {
  if (BLOCKED_WORDS.length === 0) return false;
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
};

const trimMessages = (list) =>
  list.length > MAX_MESSAGES_IN_MEMORY ? list.slice(list.length - MAX_MESSAGES_IN_MEMORY) : list;

export const useGroupDetail = ({ group, currentUser, navigation }) => {
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

  // Loading / error state for the initial fetch
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Pagination state for the message list
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pagination state for the members list
  const [hasMoreMembers, setHasMoreMembers] = useState(true);
  const [isLoadingMoreMembers, setIsLoadingMoreMembers] = useState(false);

  // Connectivity
  const [isOnline, setIsOnline] = useState(true);
  const wasOnlineRef = useRef(true);

  // Reply-to
  const [replyingTo, setReplyingTo] = useState(null); // { id, content, authorName }

  // Typing presence
  const [typingUsers, setTypingUsers] = useState([]);
  const typingChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Reactions, keyed by message id
  const [reactionsByMessageId, setReactionsByMessageId] = useState({});

  const lastSentAtRef = useRef(0);
  const isAdmin = group?.created_by === currentUser?.id;
  const flatListRef = useRef(null);

  // ---------------------------------------------------------------------
  // Connectivity
  // ---------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------
  const fetchMessagesPage = useCallback(async (beforeCursor = null) => {
    let query = supabase
      .from('group_messages')
      .select(`*, profiles:user_id (id, name, avatar_url)`)
      .eq('group_id', group.id)
      .eq('is_announcement', false)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (beforeCursor) {
      query = query.lt('created_at', beforeCursor);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [group?.id]);

  const fetchReactionsForMessages = useCallback(async (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;
    const { data, error } = await supabase
      .from('message_reactions')
      .select('*')
      .in('message_id', messageIds);

    if (error) {
      console.error('Error fetching reactions:', error);
      return;
    }

    const grouped = {};
    (data || []).forEach((r) => {
      if (!grouped[r.message_id]) grouped[r.message_id] = [];
      grouped[r.message_id].push(r);
    });
    setReactionsByMessageId((prev) => ({ ...prev, ...grouped }));
  }, []);

  const fetchMembersPage = useCallback(async (offset = 0) => {
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .order('user_id', { ascending: true })
      .range(offset, offset + MEMBERS_PAGE_SIZE - 1);

    if (memberError) throw memberError;
    if (!memberData || memberData.length === 0) return [];

    const userIds = memberData.map((m) => m.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds);
    if (profilesError) throw profilesError;

    const profileMap = {};
    (profilesData || []).forEach((p) => { profileMap[p.id] = p; });

    return memberData.map((m) => ({ ...m, profiles: profileMap[m.user_id] || null }));
  }, [group?.id]);

  const fetchGroupData = useCallback(async ({ showFullScreenLoading = false } = {}) => {
    if (showFullScreenLoading) setIsLoading(true);
    setLoadError(null);
    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', group.id)
        .single();
      if (groupError) throw groupError;
      if (groupData) setGroupIcon(groupData.group_icon);

      const latestMessages = await fetchMessagesPage();
      const orderedMessages = latestMessages.slice().reverse();
      setMessages(orderedMessages);
      setHasMoreMessages(latestMessages.length === MESSAGES_PAGE_SIZE);
      fetchReactionsForMessages(orderedMessages.map((m) => m.id));

      const { data: announcementData, error: announcementError } = await supabase
        .from('group_messages')
        .select(`*, profiles:user_id (id, name, avatar_url)`)
        .eq('group_id', group.id)
        .eq('is_announcement', true)
        .order('created_at', { ascending: false })
        .limit(100);
      if (announcementError) throw announcementError;
      setAnnouncements(announcementData || []);

      const { count: totalMembersCount, error: countError } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);
      if (countError) throw countError;

      const firstMemberPage = await fetchMembersPage(0);
      setMembers(firstMemberPage);
      setMembersCount(totalMembersCount ?? firstMemberPage.length);
      setHasMoreMembers(firstMemberPage.length === MEMBERS_PAGE_SIZE);

      const { data: myMembership, error: myMembershipError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', group.id)
        .eq('user_id', currentUser?.id)
        .maybeSingle();
      if (myMembershipError) throw myMembershipError;
      setIsJoined(!!myMembership);
    } catch (err) {
      console.error('Error loading group data:', err);
      setLoadError('Something went wrong loading this group. Pull down to try again.');
    } finally {
      if (showFullScreenLoading) setIsLoading(false);
    }
  }, [group?.id, currentUser?.id, fetchMessagesPage, fetchMembersPage, fetchReactionsForMessages]);

  // ---------------------------------------------------------------------
  // Realtime subscriptions (messages, membership changes, reactions)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!group?.id) return;
    fetchGroupData({ showFullScreenLoading: true });

    const messageChannel = supabase
      .channel(`public:group_messages:group_id=eq.${group.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` },
        (payload) => {
          if (payload.new.is_announcement) {
            setAnnouncements((prev) => prev.some(a => a.id === payload.new.id) ? prev : [payload.new, ...prev]);
          } else {
            setMessages((prev) =>
              prev.some(m => m.id === payload.new.id) ? prev : trimMessages([...prev, payload.new])
            );
          }
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          setAnnouncements((prev) => prev.filter(a => a.id !== payload.old.id));
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'group_members', filter: `group_id=eq.${group.id}` },
        (payload) => {
          setMembers((prev) => prev.map((m) => (m.user_id === payload.new.user_id ? { ...m, ...payload.new } : m)));
        }
      )
      // No group_id column on message_reactions, so this listens broadly and
      // filters client-side against already-loaded messages. Fine at this
      // scale — revisit with a scoped broadcast channel if it becomes a
      // bottleneck.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' },
        (payload) => {
          const record = payload.new || payload.old;
          if (!record) return;
          setReactionsByMessageId((prev) => {
            const list = prev[record.message_id] || [];
            if (payload.eventType === 'INSERT') {
              if (list.some((r) => r.id === payload.new.id)) return prev;
              return { ...prev, [record.message_id]: [...list, payload.new] };
            }
            if (payload.eventType === 'DELETE') {
              return { ...prev, [record.message_id]: list.filter((r) => r.id !== payload.old.id) };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [group?.id, fetchGroupData]);

  // Auto-retry failed sends when connectivity returns
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline) {
      retryAllFailedMessages();
    }
    wasOnlineRef.current = isOnline;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ---------------------------------------------------------------------
  // Typing presence
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!group?.id || !currentUser?.id) return;

    const channel = supabase.channel(`presence:typing:${group.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const others = Object.values(state)
          .flat()
          .filter((p) => p.userId !== currentUser.id && p.typing);
        setTypingUsers(others);
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [group?.id, currentUser?.id]);

  const broadcastTyping = useCallback((typing) => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    channel.track({ userId: currentUser?.id, name: currentUser?.name || 'Someone', typing });
  }, [currentUser?.id, currentUser?.name]);

  const handleInputChange = useCallback((text) => {
    setInputText(text);
    broadcastTyping(text.length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
  }, [broadcastTyping]);

  // ---------------------------------------------------------------------
  // Read receipts
  // ---------------------------------------------------------------------
  const markGroupRead = useCallback(async () => {
    if (!currentUser?.id || !group?.id) return;
    try {
      await supabase
        .from('group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id);
    } catch (err) {
      console.error('Error marking group read:', err);
    }
  }, [group?.id, currentUser?.id]);

  useEffect(() => {
    if (activeTab === 'discussion' && !isLoading) {
      markGroupRead();
    }
  }, [activeTab, isLoading, messages.length, markGroupRead]);

  // ---------------------------------------------------------------------
  // Push notification registration
  // (Ideally done once at login rather than per-screen — see pushNotifications.js)
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (currentUser?.id) {
      registerForPushNotificationsAsync(currentUser.id);
    }
  }, [currentUser?.id]);

  // ---------------------------------------------------------------------
  // Pull to refresh / pagination
  // ---------------------------------------------------------------------
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroupData();
    setRefreshing(false);
  }, [fetchGroupData]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const olderPage = await fetchMessagesPage(oldestMessage?.created_at);
      if (olderPage.length > 0) {
        const ordered = olderPage.slice().reverse();
        setMessages((prev) => [...ordered, ...prev]);
        fetchReactionsForMessages(ordered.map((m) => m.id));
      }
      setHasMoreMessages(olderPage.length === MESSAGES_PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [messages, hasMoreMessages, isLoadingMore, fetchMessagesPage, fetchReactionsForMessages]);

  const loadMoreMembers = useCallback(async () => {
    if (isLoadingMoreMembers || !hasMoreMembers) return;
    setIsLoadingMoreMembers(true);
    try {
      const nextPage = await fetchMembersPage(members.length);
      setMembers((prev) => [...prev, ...nextPage]);
      setHasMoreMembers(nextPage.length === MEMBERS_PAGE_SIZE);
    } catch (err) {
      console.error('Error loading more members:', err);
    } finally {
      setIsLoadingMoreMembers(false);
    }
  }, [members.length, hasMoreMembers, isLoadingMoreMembers, fetchMembersPage]);

  // ---------------------------------------------------------------------
  // Avatar
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Sending / retrying / discarding messages
  // ---------------------------------------------------------------------
  const insertMessage = async (content, replyToId = null) => {
    const { data, error } = await supabase
      .from('group_messages')
      .insert([{ group_id: group.id, user_id: currentUser.id, content, reply_to_id: replyToId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const startReplyingTo = useCallback((message, authorName) => {
    setReplyingTo({ id: message.id, content: message.content, authorName });
  }, []);

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const handleSendMessage = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    if (!isOnline) {
      Alert.alert('You\u2019re offline', 'Connect to the internet to send messages.');
      return;
    }

    const now = Date.now();
    if (now - lastSentAtRef.current < SEND_COOLDOWN_MS) {
      Alert.alert('Slow down', 'You\u2019re sending messages a little too fast.');
      return;
    }

    if (containsBlockedContent(textToSend)) {
      Alert.alert('Message blocked', 'That message contains content that isn\u2019t allowed here.');
      return;
    }

    lastSentAtRef.current = now;
    const tempId = Date.now().toString();
    const replyContext = replyingTo;
    setIsSending(true);
    setInputText('');
    setReplyingTo(null);
    broadcastTyping(false);

    const optimisticMessage = {
      id: tempId,
      content: textToSend,
      user_id: currentUser.id,
      created_at: new Date().toISOString(),
      status: 'sending',
      reply_to_id: replyContext?.id || null,
      reply_preview: replyContext ? { content: replyContext.content, authorName: replyContext.authorName } : null,
    };

    setMessages((prev) => trimMessages([...prev, optimisticMessage]));

    try {
      const data = await insertMessage(textToSend, replyContext?.id || null);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...data, status: 'sent', reply_preview: optimisticMessage.reply_preview } : msg))
      );
    } catch (err) {
      // Keep the bubble in the list so the user can see what failed and retry it,
      // instead of silently discarding what they wrote.
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? { ...msg, status: 'failed' } : msg))
      );
    } finally {
      setIsSending(false);
    }
  };

  const retryFailedMessage = useCallback((tempId) => {
    setMessages((prev) => {
      const target = prev.find((m) => m.id === tempId);
      if (!target || target.status !== 'failed') return prev;

      (async () => {
        try {
          const data = await insertMessage(target.content, target.reply_to_id || null);
          setMessages((cur) =>
            cur.map((msg) => (msg.id === tempId ? { ...data, status: 'sent', reply_preview: target.reply_preview } : msg))
          );
        } catch (err) {
          setMessages((cur) => cur.map((msg) => (msg.id === tempId ? { ...msg, status: 'failed' } : msg)));
        }
      })();

      return prev.map((msg) => (msg.id === tempId ? { ...msg, status: 'sending' } : msg));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryAllFailedMessages = useCallback(() => {
    setMessages((prev) => {
      const failedOnes = prev.filter((m) => m.status === 'failed');
      failedOnes.forEach((m) => {
        (async () => {
          try {
            const data = await insertMessage(m.content, m.reply_to_id || null);
            setMessages((cur) =>
              cur.map((msg) => (msg.id === m.id ? { ...data, status: 'sent', reply_preview: m.reply_preview } : msg))
            );
          } catch (err) {
            setMessages((cur) => cur.map((msg) => (msg.id === m.id ? { ...msg, status: 'failed' } : msg)));
          }
        })();
      });
      return prev.map((m) => (m.status === 'failed' ? { ...m, status: 'sending' } : m));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const discardFailedMessage = useCallback((tempId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
  }, []);

  // ---------------------------------------------------------------------
  // Editing (own messages only — admins may delete others' messages but
  // may not edit them, see handleDeleteMessage below)
  // ---------------------------------------------------------------------
  const handleEditMessageManual = async (messageId, newContent) => {
    const trimmed = newContent.trim();
    if (!trimmed || isEditingMessage) return;

    setIsEditingMessage(true);
    try {
      const editedAt = new Date().toISOString();
      const { error } = await supabase
        .from('group_messages')
        .update({ content: trimmed, edited_at: editedAt })
        .eq('id', messageId);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((item) => (item.id === messageId ? { ...item, content: trimmed, edited_at: editedAt } : item))
      );

      setEditingMessageId(null);
      setEditMessageText('');
    } catch (err) {
      Alert.alert('Error', 'Could not update message.');
    } finally {
      setIsEditingMessage(false);
    }
  };

  // ---------------------------------------------------------------------
  // Announcements
  // ---------------------------------------------------------------------
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

  const handleStartEditing = (item) => {
    setEditingAnnouncementId(item.id);
    setEditText(item.content);
  };

  const handleEditAnnouncementManual = async (announcementId, newContent) => {
    const trimmed = newContent.trim();
    if (!trimmed || isEditingAnnouncement) return;

    setIsEditingAnnouncement(true);
    try {
      const editedAt = new Date().toISOString();
      const { error } = await supabase
        .from('group_messages')
        .update({ content: trimmed, edited_at: editedAt })
        .eq('id', announcementId);

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((item) => (item.id === announcementId ? { ...item, content: trimmed, edited_at: editedAt } : item))
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

  // `isAnnouncement` only changes the wording of the confirmation alert;
  // it works for either a chat message or an announcement row.
  const handleDeleteMessage = async (messageId, isAnnouncement = false) => {
    const label = isAnnouncement ? 'Announcement' : 'Message';
    Alert.alert(`Delete ${label}`, `Are you sure you want to remove this ${label.toLowerCase()}?`, [
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

          setMessages((prev) => prev.filter(m => m.id !== messageId));
          setAnnouncements((prev) => prev.filter(a => a.id !== messageId));
        }
      }
    ]);
  };

  // ---------------------------------------------------------------------
  // Reactions
  // ---------------------------------------------------------------------
  const toggleReaction = useCallback(async (messageId, emoji) => {
    const existing = (reactionsByMessageId[messageId] || []).find(
      (r) => r.user_id === currentUser?.id && r.emoji === emoji
    );

    try {
      if (existing) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
        setReactionsByMessageId((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter((r) => r.id !== existing.id),
        }));
      } else {
        const { data, error } = await supabase
          .from('message_reactions')
          .insert([{ message_id: messageId, user_id: currentUser.id, emoji }])
          .select()
          .single();
        if (error) throw error;
        setReactionsByMessageId((prev) => ({
          ...prev,
          [messageId]: [...(prev[messageId] || []), data],
        }));
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  }, [reactionsByMessageId, currentUser?.id]);

  // ---------------------------------------------------------------------
  // Members / group management
  // ---------------------------------------------------------------------
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

  const handleJoinGroup = async () => {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{ group_id: group.id, user_id: currentUser.id }]);

      if (error) throw error;

      setIsJoined(true);
      await fetchGroupData();
      Alert.alert('Success', 'You have successfully joined the group!');
    } catch (err) {
      Alert.alert('Error', 'Could not join the group.');
    }
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

  const isReadByOthers = useCallback((message) => {
    return members.some(
      (m) => m.user_id !== currentUser?.id && m.last_read_at && new Date(m.last_read_at) >= new Date(message.created_at)
    );
  }, [members, currentUser?.id]);

  const findMessageById = useCallback((id) => messages.find((m) => m.id === id) || null, [messages]);

  return {
    // state
    messages, inputText, setInputText, refreshing, isSending, membersCount, isJoined,
    activeTab, setActiveTab, editingMessageId, setEditingMessageId, editMessageText, setEditMessageText,
    isEditingMessage, members, announcements, editingAnnouncementId, setEditingAnnouncementId,
    editText, setEditText, isEditingAnnouncement, showDropdown, setShowDropdown, groupIcon,
    isUploadingAvatar, showAnnouncementModal, setShowAnnouncementModal, announcementText,
    setAnnouncementText, isPostingAnnouncement, isAdmin, flatListRef,
    isLoading, loadError, hasMoreMessages, isLoadingMore, hasMoreMembers, isLoadingMoreMembers,
    isOnline, replyingTo, typingUsers, reactionsByMessageId,
    // handlers
    onRefresh, loadMoreMessages, loadMoreMembers, handleChangeGroupAvatar,
    handleSendMessage, handleInputChange, retryFailedMessage, discardFailedMessage,
    startReplyingTo, cancelReply, findMessageById,
    handleEditMessageManual, handlePostAnnouncement, handleStartEditing, handleEditAnnouncementManual,
    handleDeleteMessage, handleRemoveMember, handleShareGroup, handleJoinGroup, handleLeaveGroup,
    handleDeleteGroup, toggleReaction, isReadByOthers,
  };
};