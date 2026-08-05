import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  ScrollView,
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { Sparkles, ArrowUp, BookOpen, Heart, Calendar, MessageCircle, Lightbulb, Music, Zap, X, Compass } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export default function AIChatScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight(); 
  const [input, setInput] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState([]); 
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();
  const [userName, setUserName] = useState(null);
  const [awaitingName, setAwaitingName] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedMessageIndices, setSelectedMessageIndices] = useState([]);

  const saveMessagesToStorage = async (newMessages) => {
    try {
      const expiryDate = new Date().getTime() + (3 * 24 * 60 * 60 * 1000); 
      const payload = {
        expiry: expiryDate,
        messages: newMessages,
      };
      await AsyncStorage.setItem('@machaira_chat_history', JSON.stringify(payload));
    } catch (e) {
      console.log("Error saving chat history", e);
    }
  };

  useEffect(() => {
    const initChat = async () => {
      try {
        const savedName = await AsyncStorage.getItem('@machaira_user_name');
        if (savedName) {
          setUserName(savedName);
        } else {
          setAwaitingName(true);
          setMessages([{
            role: 'assistant',
            content: "Shalom, beloved. Before we step into fellowship and study together, what would you want me to call you?",
          }]);
          return;
        }

        // Load chat history & check expiration (3 days)
        const savedData = await AsyncStorage.getItem('@machaira_chat_history');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const now = new Date().getTime();
          
          if (now > parsedData.expiry) {
            await AsyncStorage.removeItem('@machaira_chat_history');
          } else if (parsedData.messages && parsedData.messages.length > 0) {
            setMessages(parsedData.messages);
          }
        }
      } catch (e) {
        console.log("Error initializing user", e);
      }
    };
    initChat();
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const companionPrompts = [
    { label: 'Deep Exegesis & Truth', icon: <BookOpen size={20} color={colors.primary} /> },
    { label: 'Walk in Grace & Power', icon: <Heart size={20} color={colors.primary} /> },
    { label: 'Morning Fellowship', icon: <Calendar size={20} color={colors.primary} /> },
    { label: 'Apostolic Wisdom', icon: <Lightbulb size={20} color={colors.primary} /> },
    { label: 'Navigating Doubts', icon: <MessageCircle size={20} color={colors.primary} /> },
    { label: 'Fresh Revelation', icon: <Zap size={20} color={colors.primary} /> },
  ];

  const renderFormattedText = (text, textColor) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);

    return (
      <AppText selectable={false} style={{ color: textColor, fontSize: 15, lineHeight: 24 }}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            const boldContent = part.slice(2, -2);
            return (
              <AppText key={index} selectable={false} type="bold" style={{ color: textColor, fontSize: 15, lineHeight: 24 }}>
                {boldContent}
              </AppText>
            );
          }
          return part;
        })}
      </AppText>
    );
  };

  const handleMessageLongPress = (index) => {
    Keyboard.dismiss();
    if (!isMultiSelectMode) {
      setSelectedMessageIndex(index);
    }
  };

  const handleMessagePress = (index) => {
    if (isMultiSelectMode) {
      setSelectedMessageIndices(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
    }
  };

  const handleSendMessage = async (textToSend) => {
    const question = textToSend || input;
    if (!question.trim() || loading) return;

    setInput('');
    Keyboard.dismiss();

    let updatedMessages;
    if (editingIndex !== null) {
      updatedMessages = [...messages];
      updatedMessages[editingIndex] = { role: 'user', content: question };
      updatedMessages = updatedMessages.slice(0, editingIndex + 1);
      setEditingIndex(null);
    } else {
      const userMsg = { role: 'user', content: question };
      updatedMessages = [...messages, userMsg];
    }

    setMessages(updatedMessages);
    setLoading(true);

    try {
      if (awaitingName && !userName) {
        const capturedName = question.trim();
        setUserName(capturedName);
        setAwaitingName(false);
        await AsyncStorage.setItem('@machaira_user_name', capturedName);


        const welcomeResponse = {
        role: 'assistant',
        content: `Glory, **${capturedName}**. It is a joy to walk closely with you in truth and grace. What word or spiritual question is resting on your heart today?`,
      };
      const newHistory = [...updatedMessages, welcomeResponse];
      setMessages(newHistory);
      saveMessagesToStorage(newHistory);
      setLoading(false);
      return;
      }

      let matches = [];

      if (question.startsWith("Companion: ")) {
        const categoryQuery = question.replace("Companion: ", "").trim();
        let { data } = await supabase
          .from('devotionals')
          .select('id, title, category, episode_number, pure_content')
          .ilike('category', `%${categoryQuery}%`)
          .limit(6);
        matches = data || [];
      } 

      if (!matches || matches.length === 0) {
        const stopWords = ['tell', 'about', 'what', 'how', 'why', 'the', 'and', 'for', 'with', 'from', 'that', 'this', 'is', 'in', 'are', 'can'];
        const searchWords = question
          .replace(/[^\w\s]/gi, '')
          .split(' ')
          .map(w => w.trim())
          .filter(w => w.length > 2 && !stopWords.includes(w.toLowerCase()));

        const primaryKeyword = searchWords[0] || question.trim().split(" ")[0] || "";

        if (primaryKeyword) {
          let { data } = await supabase
            .from('devotionals')
            .select('id, title, category, episode_number, pure_content')
            .or(`title.ilike.%${primaryKeyword}%,pure_content.ilike.%${primaryKeyword}%,category.ilike.%${primaryKeyword}%`)
            .limit(6);
          
          matches = data || [];
        }
      }

      if (!matches || matches.length === 0) {
        let { data: fallbackData } = await supabase
          .from('devotionals')
          .select('id, title, category, episode_number, pure_content')
          .order('episode_number', { ascending: true })
          .limit(6);
        matches = fallbackData || [];
      }

      const contextText = matches.length > 0 
        ? matches.map(m => `[Episode ${m.episode_number || 'N/A'}] Title: ${m.title}\nCategory: ${m.category}\nContent: ${m.pure_content ? m.pure_content.substring(0, 4000) : ''}...`).join("\n\n====================\n\n") 
        : "Foundational Machaira teachings.";

      const recentMessages = updatedMessages.slice(-6);
      const apiContents = recentMessages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const systemInstructionText = `
You are Machaira AI, serving as both a deeply intimate spiritual companion and a rigorous theological research assistant. **You speak precisely in the voice, cadence, authority, and pastoral warmth of Apostle Bennie.**
Personalization & Knowing the Believer:
- You are speaking directly with **${userName || 'Beloved'}**. Do not call anyone brother, sister nor son or whatsoever. Address them only by their name naturally in conversation as a spiritual father and mentor who knows them.
- Speak to their specific walk, addressing their questions with profound personal warmth and uncompromised truth.

Core Voice & Personality Guidelines:
1. **Apostle Bennie's Voice:** Speak with absolute conviction, deep revelatory insight and grace. Use phrasing, spiritual weight, and authoritative yet deeply loving tones characteristic as Apostle Bennie would but you are just a companion not Apostle Bennie.
2. **Deep Theological Rigor:** Do not give shallow or generic Christian platitudes. Break down scriptures structurally, examine spiritual principles line upon line, and provide deep exegetical insights drawn straight from the database texts below.
3. **Intimate Companionship:** Walk closely with the believer. Listen to their heart, address their questions with profound empathy combined with unwavering truth.
4. **Contextual Integration:** Synthesize arguments directly from the provided Machaira database archives, referencing episode themes naturally as a teacher would.
5. **Episode Suggestions:** At the very end of your response, recommend the relevant database episodes used for this teaching so the believer can go and read them. Format them cleanly.
6. **Clean Formatting Standards:** Absolutely **NO** raw asterisks, standalone markdown symbols, hash tags, or code block markers inside the response text. Use standard paragraphs with proper line spacing, and only use clean bold (**text**) where appropriate.

Reference Machaira Database Archives:
${contextText}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: apiContents,
        config: {
          systemInstruction: systemInstructionText,
        }
      });

      const aiResponseText = response?.text || "Let us look deeper into what the Spirit is unveiling here, child of God.";
      
      const aiMsg = { role: 'assistant', content: aiResponseText };
      setMessages(prev => {
        const newHistory = [...prev, aiMsg];
        saveMessagesToStorage(newHistory);
        return newHistory;
      });

    } catch (err) {
      console.error("Apostolic AI Error:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Let us steady our focus and try that once more in fellowship." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* 1. FIXED HEADER */}
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
          {isMultiSelectMode ? `${selectedMessageIndices.length} Selected` : "Machaira AI"}
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
                await AsyncStorage.removeItem('@machaira_chat_history');
              } else {
                await saveMessagesToStorage(updatedMessages);
              }
            }}
          >
            <AppText type="semiBold" style={{ color: '#ff5252', fontSize: 15 }}>Delete</AppText>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* 2. SCROLLABLE CONTENT */}
      <ScrollView 
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 ? (
          <View style={styles.heroContainer}>
            <Sparkles size={48} color={colors.primary} style={{ marginBottom: 20 }} />
            <AppText type="bold" style={[styles.title, { color: colors.text }]}>SHALOM, BELOVED !</AppText>
            <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Step into deep fellowship, revelation, and uncompromised truth.
            </AppText>

            <View style={styles.grid}>
              {companionPrompts.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSendMessage(`Companion: ${item.label}`)}
                >
                  {item.icon}
                  <AppText type="semiBold" style={[styles.cardText, { color: colors.text }]}>{item.label}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            {messages.map((msg, index) => {
              const isSelected = selectedMessageIndices.includes(index);
              return (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.9}
                  onLongPress={() => handleMessageLongPress(index)}
                  onPress={() => handleMessagePress(index)}
                  style={[
                    styles.messageBubble, 
                    msg.role === 'user' 
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
                  {msg.role === 'user' ? (
                    <AppText selectable={false} style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
                      {msg.content}
                    </AppText>
                  ) : (
                    renderFormattedText(msg.content, colors.text)
                  )}
                </TouchableOpacity>
              );
            })}
            {loading && (
              <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* 3. INPUT AREA */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <ArrowUp color={input ? "#fff" : colors.textSecondary} size={20} strokeWidth={3} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Classy Action Bottom Sheet */}
      {selectedMessageIndex !== null && (
        <View style={[styles.actionModalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setSelectedMessageIndex(null)} 
          />
          <View style={[styles.actionSheetContainer, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: tabBarHeight + 24 }]}>
            <View style={[styles.actionSheetIndicator, { backgroundColor: colors.border }]} />
            <AppText type="semiBold" style={[styles.actionSheetTitle, { color: colors.text }]}>Message Options</AppText>

            <TouchableOpacity 
              style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
              onPress={() => {
                Clipboard.setStringAsync(messages[selectedMessageIndex].content);
                setSelectedMessageIndex(null);
              }}
            >
              <AppText style={{ color: colors.text, fontSize: 16 }}>Copy Text</AppText>
            </TouchableOpacity>

            {messages[selectedMessageIndex]?.role === 'user' && (
              <TouchableOpacity 
                style={[styles.actionSheetOption, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setInput(messages[selectedMessageIndex].content);
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
                  await AsyncStorage.removeItem('@machaira_chat_history');
                } else {
                  await saveMessagesToStorage(updatedMessages);
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
  title: { fontSize: 24, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 400 },
  card: { width: '45%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 10, marginBottom: 8 },
  cardText: { fontSize: 12, textAlign: 'center' },
  chatContainer: { gap: 16, paddingBottom: 20 },
  messageBubble: { padding: 16, borderRadius: 16, maxWidth: '90%', position: 'relative' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, width: '100%' },
  checkboxContainer: { position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  checkboxInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  inputWrapper: { padding: 16, borderTopWidth: 1 },
  inputContainer: { flexDirection: 'row', borderRadius: 30, padding: 8, paddingLeft: 16, alignItems: 'center', borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingRight: 10, minHeight: 40, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  actionSheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 8,
  },
  actionSheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  actionSheetTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.6,
  },
  actionSheetOption: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 0.5,
  }
});