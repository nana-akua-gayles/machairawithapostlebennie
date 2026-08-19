import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { View, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList, Keyboard, ActivityIndicator } from 'react-native';
import { Sparkles, ArrowUp, BookOpen, Heart, Calendar, MessageCircle, Lightbulb, Zap, X, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { createClient } from '@supabase/supabase-js';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../config/supabaseClient';


const MAX_STORED_MESSAGES = 20;
const REQUEST_TIMEOUT_MS = 20000;

const RESPONSE_STYLES = [
  { key: 'concise', label: 'Concise' },
  { key: 'standard', label: 'Standard' },
  { key: 'deep', label: 'Deep Dive' },
];

// Strips characters that have special meaning in PostgREST filter syntax
// (comma, parens, %, *) so user-typed text can't alter or break the query.
const sanitizeForFilter = (str) => str.replace(/[,()%*]/g, '').trim();

const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
};

const renderFormattedText = (text, textColor, primaryColor) => {
  if (!text || typeof text !== 'string') return null;
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

  return (
    <View style={styles.structuredTextContainer}>
      {paragraphs.map((paragraph, pIdx) => {
        const isBullet = paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ');
        const cleanParagraph = isBullet ? paragraph.trim().substring(2) : paragraph;
        const parts = cleanParagraph.split(/(\*\*.*?\*\*)/g);

        return (
          <View key={`para_${pIdx}`} style={[styles.paragraphBlock, isBullet && styles.bulletBlock]}>
            {isBullet && <AppText style={[styles.bulletDot, { color: primaryColor }]}>•</AppText>}
            <AppText selectable={false} style={{ color: textColor, fontSize: 15, lineHeight: 24, flex: 1 }}>
              {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  const boldContent = part.slice(2, -2);
                  return (
                    <AppText key={`bold_${pIdx}_${index}`} selectable={false} type="bold" style={{ color: textColor, fontSize: 15, lineHeight: 24 }}>
                      {boldContent}
                    </AppText>
                  );
                }
                return (
                  <AppText key={`text_${pIdx}_${index}`} selectable={false} style={{ color: textColor, fontSize: 15, lineHeight: 24 }}>
                    {part}
                  </AppText>
                );
              })}
            </AppText>
          </View>
        );
      })}
    </View>
  );
};

const MessageItem = memo(({ item: msg, index, isSelected, isMultiSelectMode, colors, userName, onLongPress, onPress }) => {
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
      {!isUser && (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <Sparkles size={16} color="#FFF" />
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={() => onLongPress(index)}
        onPress={() => onPress && onPress(index)}
        style={[
          styles.messageBubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }]
            : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }],
          isMultiSelectMode && isSelected && { borderColor: '#ff5252', borderWidth: 2 }
        ]}
      >
        {isMultiSelectMode && (
          <View style={[styles.checkboxContainer, { borderColor: isSelected ? '#ff5252' : colors.border, backgroundColor: isSelected ? '#ff5252' : 'transparent' }]}>
            {isSelected && <View style={styles.checkboxInner} />}
          </View>
        )}

        {!isUser && (
          <View style={[styles.aiHeaderTag, { borderBottomColor: colors.border }]}>
            <AppText type="bold" style={{ color: colors.primary, fontSize: 12 }}>MACHAIRA AI</AppText>
          </View>
        )}

        {isUser ? (
          <AppText selectable={false} style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
            {typeof msg.content === 'string' ? msg.content : ''}
          </AppText>
        ) : (
          renderFormattedText(msg.content, colors.text, colors.primary)
        )}
      </TouchableOpacity>

      {isUser && (
        <View style={[styles.avatarContainer, { backgroundColor: colors.border }]}>
          <AppText type="bold" style={{ color: colors.text, fontSize: 13 }}>
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </AppText>
        </View>
      )}
    </View>
  );
});

export default function AIChatScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [input, setInput] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);
  const [userName, setUserName] = useState(null);
  const [awaitingName, setAwaitingName] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIndices, setSelectedMessageIndices] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('guest');
  const [responseStyle, setResponseStyle] = useState('standard');
  const [showStylePicker, setShowStylePicker] = useState(false);
  const usedEpisodeIdsRef = useRef(new Set());

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getUserNameKey = (uid) => `@machaira_user_name_${uid}`;
  const getChatHistoryKey = (uid) => `@machaira_chat_history_${uid}`;
  const getStyleKey = (uid) => `@machaira_response_style_${uid}`;

  const saveMessagesToStorage = async (newMessages, uid) => {
    try {
      const trimmedMessages = newMessages.slice(-MAX_STORED_MESSAGES);
      const expiryDate = new Date().getTime() + (3 * 24 * 60 * 60 * 1000);
      const payload = { expiry: expiryDate, messages: trimmedMessages };
      await AsyncStorage.setItem(getChatHistoryKey(uid), JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving chat history', e);
    }
  };

  
  const loadResponseStyle = async (uid) => {
    try {
      if (uid !== 'guest' && supabase) {
        const { data, error } = await supabase
          .from('user_ai_preferences')
          .select('response_style')
          .eq('user_id', uid)
          .maybeSingle();
        if (!error && data?.response_style) {
          setResponseStyle(data.response_style);
          await AsyncStorage.setItem(getStyleKey(uid), data.response_style);
          return;
        }
      }
      const cached = await AsyncStorage.getItem(getStyleKey(uid));
      setResponseStyle(cached || 'standard');
    } catch (e) {
      console.error('Error loading response style', e);
      setResponseStyle('standard');
    }
  };

  const updateResponseStyle = async (style) => {
    setResponseStyle(style);
    setShowStylePicker(false);
    try {
      await AsyncStorage.setItem(getStyleKey(currentUserId), style);
      if (currentUserId !== 'guest' && supabase) {
        await supabase
          .from('user_ai_preferences')
          .upsert({ user_id: currentUserId, response_style: style, display_name: userName }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.error('Error saving response style', e);
    }
  };

  const loadUserDataForUser = async (uid) => {
    try {
      setCurrentUserId(uid);
      setUserName(null);
      setAwaitingName(false);
      setMessages([]);
      setSelectedMessageIndex(null);
      setEditingIndex(null);
      setIsMultiSelectMode(false);
      setSelectedMessageIndices([]);
      usedEpisodeIdsRef.current.clear();

      await loadResponseStyle(uid);
      if (!isMountedRef.current) return;

      const savedName = await AsyncStorage.getItem(getUserNameKey(uid));
      if (!isMountedRef.current) return; 
      if (savedName) {
        setUserName(savedName);
        setAwaitingName(false);
      } else {
        setUserName(null);
        setAwaitingName(true);
        setMessages([{
          id: 'msg_welcome_' + Date.now(),
          role: 'assistant',
          content: "Shalom, beloved. Before we step into fellowship and study together, what would you want me to call you?",
        }]);
        return;
      }

      const savedData = await AsyncStorage.getItem(getChatHistoryKey(uid));
      if (!isMountedRef.current) return;
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const now = new Date().getTime();

        if (now > parsedData.expiry) {
          await AsyncStorage.removeItem(getChatHistoryKey(uid));
          setMessages([]);
        } else if (parsedData.messages && parsedData.messages.length > 0) {
          const sanitizedMessages = parsedData.messages.map((m, idx) => ({
            ...m,
            id: m.id || `msg_loaded_${idx}_${Date.now()}`
          }));
          setMessages(sanitizedMessages);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      console.error('Error loading user profile chat context', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!supabase) return;
      let isMounted = true;
      let didInit = false;

      const initChat = async () => {
        if (didInit) return;
        didInit = true;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const uid = user?.id || 'guest';
          if (isMounted) await loadUserDataForUser(uid);
        } catch (e) {
          console.error('Error initializing user profile chat context', e);
        }
      };

      initChat();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return;
        if (!didInit) return;
        if (isMounted) {
          const uid = session?.user?.id || 'guest';
          await loadUserDataForUser(uid);
        }
      });

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
      };
    }, [])
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollToEnd = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd(true);
  }, [messages.length, loading]);

  const companionPrompts = [
    { label: 'Deep Exegesis & Truth', icon: <BookOpen size={20} color={colors.primary} /> },
    { label: 'Walk in Grace & Power', icon: <Heart size={20} color={colors.primary} /> },
    { label: 'Morning Fellowship', icon: <Calendar size={20} color={colors.primary} /> },
    { label: 'Apostolic Wisdom', icon: <Lightbulb size={20} color={colors.primary} /> },
    { label: 'Navigating Doubts', icon: <MessageCircle size={20} color={colors.primary} /> },
    { label: 'Fresh Revelation', icon: <Zap size={20} color={colors.primary} /> },
  ];

  const handleMessageLongPress = useCallback((index) => {
    Keyboard.dismiss();
    if (!isMultiSelectMode) setSelectedMessageIndex(index);
  }, [isMultiSelectMode]);

  const handleMessagePress = useCallback((index) => {
    if (isMultiSelectMode) {
      setSelectedMessageIndices(prev =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  }, [isMultiSelectMode]);

  const handleSendMessage = async (textToSend) => {
    const question = textToSend || input;
    if (!question.trim() || loading || !supabase) return;

    setInput('');
    Keyboard.dismiss();

    let updatedMessages;
    if (editingIndex !== null) {
      updatedMessages = [...messages];
      updatedMessages[editingIndex] = { id: messages[editingIndex].id || ('msg_user_' + Date.now()), role: 'user', content: question };
      updatedMessages = updatedMessages.slice(0, editingIndex + 1);
      setEditingIndex(null);
    } else {
      const userMsg = {
        id: 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        role: 'user',
        content: question
      };
      updatedMessages = [...messages, userMsg];
    }

    setMessages(updatedMessages);
    setLoading(true);

    try {
      if (awaitingName && !userName) {
        const capturedName = question.trim();
        setUserName(capturedName);
        setAwaitingName(false);
        await AsyncStorage.setItem(getUserNameKey(currentUserId), capturedName);
        if (currentUserId !== 'guest') {
          await supabase.from('user_ai_preferences').upsert(
            { user_id: currentUserId, display_name: capturedName, response_style: responseStyle },
            { onConflict: 'user_id' }
          );
        }

        const welcomeResponse = {
          id: 'msg_welcome_resp_' + Date.now(),
          role: 'assistant',
          content: `Glory, **${capturedName}**. It is a joy to walk closely with you in truth and grace. What word or spiritual question is resting on your heart today?`,
        };
        const newHistory = [...updatedMessages, welcomeResponse];
        setMessages(newHistory);
        saveMessagesToStorage(newHistory, currentUserId);
        setLoading(false);
        return;
      }

      let matches = [];

      if (question.startsWith('Companion: ')) {
        const categoryQuery = sanitizeForFilter(question.replace('Companion: ', ''));
        const { data, error } = await supabase
          .from('devotionals')
          .select('id, title, category, episode_number, pure_content')
          .ilike('category', `%${categoryQuery}%`)
          .limit(15);
        if (error) console.error('Category query error:', error);
        matches = data || [];
      } else {
        const stopWords = new Set(['tell', 'about', 'what', 'how', 'why', 'the', 'and', 'for', 'with', 'from', 'that', 'this', 'is', 'in', 'are', 'can']);
        const searchWords = question
          .replace(/[^\w\s]/gi, '')
          .split(/\s+/)
          .map(w => w.trim())
          .filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

        const rawKeyword = searchWords[0] || question.trim().split(/\s+/)[0] || '';
        const primaryKeyword = sanitizeForFilter(rawKeyword);

        if (primaryKeyword) {
          const { data, error } = await supabase
            .from('devotionals')
            .select('id, title, category, episode_number, pure_content')
            .or(`title.ilike.%${primaryKeyword}%,pure_content.ilike.%${primaryKeyword}%,category.ilike.%${primaryKeyword}%`)
            .limit(15);
          if (error) console.error('Keyword query error:', error);
          matches = data || [];
        }
      }

      if (!matches || matches.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('devotionals')
          .select('id, title, category, episode_number, pure_content')
          .order('episode_number', { ascending: false })
          .limit(15);
        if (fallbackError) console.error('Fallback query error:', fallbackError);
        matches = fallbackData || [];
      }

      let freshMatches = matches.filter(m => !usedEpisodeIdsRef.current.has(m.id));
      if (freshMatches.length === 0) {
        usedEpisodeIdsRef.current.clear();
        freshMatches = matches;
      }

      const selectedMatches = freshMatches.sort(() => 0.5 - Math.random()).slice(0, 3);
      selectedMatches.forEach(m => usedEpisodeIdsRef.current.add(m.id));

      const contextText = selectedMatches.length > 0
        ? selectedMatches.map(m => `[Episode ${m.episode_number || 'N/A'}] Title: ${m.title}\nCategory: ${m.category}\nContent: ${m.pure_content ? m.pure_content.substring(0, 3000) : ''}...`).join('\n\n====================\n\n')
        : 'Referenced Machaira Episodes.';

      const recentMessages = updatedMessages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const invokePromise = supabase.functions.invoke('gemini-chat', {
        body: { question, userName, contextText, recentMessages, responseStyle },
      });

      const { data: fnData, error: fnError } = await withTimeout(invokePromise, REQUEST_TIMEOUT_MS);
      if (!isMountedRef.current) return;

      if (fnError) {
        const status = fnError?.context?.status;
        if (status === 429) {
          setMessages(prev => [
            ...prev,
            {
              id: 'msg_limit_' + Date.now(),
              role: 'assistant',
              content: "You've reached today's message limit. Please come back tomorrow — rest is holy too.",
            }
          ]);
          return;
        }
        throw fnError;
      }

      const aiResponseText = fnData?.text || 'Let us look deeper into what the Spirit is unveiling here, child of God.';

      const aiMsg = {
        id: 'msg_ai_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        role: 'assistant',
        content: aiResponseText
      };

      setMessages(prev => {
        const newHistory = [...prev, aiMsg];
        saveMessagesToStorage(newHistory, currentUserId);
        return newHistory;
      });
    } catch (err) {
      const isTimeout = err?.message === 'TIMEOUT';
      console.error('AI Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: 'msg_err_' + Date.now(),
          role: 'assistant',
          content: isTimeout
            ? 'That took longer than expected. Let us steady our focus and try again.'
            : 'Let us steady our focus and try again.'
        }
      ]);
    } finally {
      if (isMountedRef.current) {
      setLoading(false);
    }
  }}

  const renderItem = useCallback(({ item, index }) => (
    <MessageItem
      item={item}
      index={index}
      isSelected={selectedMessageIndices.includes(index)}
      isMultiSelectMode={isMultiSelectMode}
      colors={colors}
      userName={userName}
      onLongPress={handleMessageLongPress}
      onPress={handleMessagePress}
    />
  ), [selectedMessageIndices, isMultiSelectMode, colors, userName, handleMessageLongPress, handleMessagePress]);

  const renderEmptyComponent = () => (
    <View style={styles.heroContainer}>
      <Sparkles size={48} color={colors.primary} style={{ marginBottom: 20 }} />
      <AppText type="bold" style={[styles.title, { color: colors.text }]}>SHALOM, BELOVED !</AppText>
      <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
        Step into deep fellowship, revelation, and uncompromised truth.
      </AppText>

      <View style={styles.grid}>
        {companionPrompts.map((item, index) => (
          <TouchableOpacity
            key={`prompt_${index}`}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSendMessage(`Companion: ${item.label}`)}
          >
            {item.icon}
            <AppText type="semiBold" style={[styles.cardText, { color: colors.text }]}>{item.label}</AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={[styles.messageRow, styles.aiRow]}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
          <Sparkles size={16} color="#FFF" />
        </View>
        <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={[styles.header, { marginTop: insets.top, borderColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (isMultiSelectMode) {
              setIsMultiSelectMode(false);
              setSelectedMessageIndices([]);
            } else {
              Keyboard.dismiss();
            }
          }}
          style={styles.backBtn}
        >
          {isMultiSelectMode ? <X color={colors.text} size={24} /> : (isKeyboardVisible && <X color={colors.text} size={24} />)}
        </TouchableOpacity>

        <AppText type="bold" style={{ color: colors.text, fontSize: 18 }}>
          {isMultiSelectMode ? `${selectedMessageIndices.length} Selected` : 'Machaira AI'}
        </AppText>

        {isMultiSelectMode && selectedMessageIndices.length > 0 ? (
          <TouchableOpacity
            style={styles.headerDeleteBtn}
            onPress={async () => {
              const updatedMessages = messages.filter((_, index) => !selectedMessageIndices.includes(index));
              setMessages(updatedMessages);
              setIsMultiSelectMode(false);
              setSelectedMessageIndices([]);
              if (updatedMessages.length === 0) {
                await AsyncStorage.removeItem(getChatHistoryKey(currentUserId));
              } else {
                await saveMessagesToStorage(updatedMessages, currentUserId);
              }
            }}
          >
            <AppText type="semiBold" style={{ color: '#ff5252', fontSize: 15 }}>Delete</AppText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowStylePicker(true)}>
            <SlidersHorizontal color={colors.text} size={20} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item?.id ? String(item.id) : `msg_${index}`}
        renderItem={renderItem}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={12}
        removeClippedSubviews={Platform.OS === 'android'}
        onContentSizeChange={() => scrollToEnd(false)}
        inverted={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <View style={[styles.inputWrapper, {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: tabBarHeight + 12,
        }]}>
          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Let's talk about Jesus..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, { backgroundColor: input ? colors.primary : colors.border }]}
              onPress={() => handleSendMessage(input)}
            >
              <ArrowUp color={input ? '#fff' : colors.textSecondary} size={20} strokeWidth={3} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Response style picker */}
      {showStylePicker && (
        <View style={[styles.actionModalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowStylePicker(false)} />
          <View style={[styles.actionSheetContainer, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: tabBarHeight + 24 }]}>
            <View style={[styles.actionSheetIndicator, { backgroundColor: colors.border }]} />
            <AppText type="semiBold" style={[styles.actionSheetTitle, { color: colors.text }]}>Answer Length</AppText>
            {RESPONSE_STYLES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
                onPress={() => updateResponseStyle(s.key)}
              >
                <AppText style={{ color: responseStyle === s.key ? colors.primary : colors.text, fontSize: 16 }}>
                  {s.label}{responseStyle === s.key ? '  ✓' : ''}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Message Action Sheet */}
      {selectedMessageIndex !== null && (
        <View style={[styles.actionModalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setSelectedMessageIndex(null)} />
          <View style={[styles.actionSheetContainer, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: tabBarHeight + 24 }]}>
            <View style={[styles.actionSheetIndicator, { backgroundColor: colors.border }]} />
            <AppText type="semiBold" style={[styles.actionSheetTitle, { color: colors.text }]}>Message Options</AppText>

            <TouchableOpacity
              style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                const textToCopy = typeof messages[selectedMessageIndex]?.content === 'string' ? messages[selectedMessageIndex].content : '';
                Clipboard.setStringAsync(textToCopy);
                setSelectedMessageIndex(null);
              }}
            >
              <AppText style={{ color: colors.text, fontSize: 16 }}>Copy Text</AppText>
            </TouchableOpacity>

            {messages[selectedMessageIndex]?.role === 'user' && (
              <TouchableOpacity
                style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  const editContent = typeof messages[selectedMessageIndex]?.content === 'string' ? messages[selectedMessageIndex].content : '';
                  setInput(editContent);
                  setEditingIndex(selectedMessageIndex);
                  setSelectedMessageIndex(null);
                }}
              >
                <AppText style={{ color: colors.text, fontSize: 16 }}>Edit Message</AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                const idx = selectedMessageIndex;
                setSelectedMessageIndex(null);
                setIsMultiSelectMode(true);
                setSelectedMessageIndices([idx]);
              }}
            >
              <AppText style={{ color: colors.text, fontSize: 16 }}>Select Multiple</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={async () => {
                const updatedMessages = messages.filter((_, i) => i !== selectedMessageIndex);
                setMessages(updatedMessages);
                if (updatedMessages.length === 0) {
                  await AsyncStorage.removeItem(getChatHistoryKey(currentUserId));
                } else {
                  await saveMessagesToStorage(updatedMessages, currentUserId);
                }
                setSelectedMessageIndex(null);
              }}
            >
              <AppText style={{ color: '#ff5252', fontSize: 16 }}>Delete Message</AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerDeleteBtn: { height: 40, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 4 },
  scrollContent: { flexGrow: 1, padding: 20 },
  heroContainer: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  title: { fontSize: 21, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 400 },
  card: { width: '45%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 10, marginBottom: 8 },
  cardText: { fontSize: 12, textAlign: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6, gap: 8 },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  avatarContainer: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  messageBubble: { padding: 16, borderRadius: 16, maxWidth: '82%', position: 'relative' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4, },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, width: '100%' },
  aiHeaderTag: { borderBottomWidth: 1, paddingBottom: 6, marginBottom: 8 },
  checkboxContainer: { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkboxInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  structuredTextContainer: { gap: 10 },
  paragraphBlock: { flexDirection: 'row' },
  bulletBlock: { paddingLeft: 4 },
  bulletDot: { fontSize: 16, marginRight: 8, lineHeight: 24 },
  inputWrapper: { padding: 16, borderTopWidth: 1 },
  inputContainer: { flexDirection: 'row', borderRadius: 30, padding: 8, paddingLeft: 16, alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingRight: 10, minHeight: 40, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionModalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 9999 },
  actionSheetContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderBottomWidth: 0, gap: 8 },
  actionSheetIndicator: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  actionSheetTitle: { fontSize: 14, textAlign: 'center', marginBottom: 12, opacity: 0.6 },
  actionSheetOption: { paddingVertical: 14, alignItems: 'center', borderBottomWidth: 0.5 }
});