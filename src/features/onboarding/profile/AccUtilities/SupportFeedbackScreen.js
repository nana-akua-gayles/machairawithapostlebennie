import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { ChevronLeft, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react-native';
import { AppText } from '../../../../components/AppText';

const FAQ_DATA = [
  { id: '1', q: 'Can I read the Machaira offline?', a: 'Yes! Every episode is fully accessible even without an internet connection.' },
  { id: '2', q: 'App is not opening after download.', a: 'Restart your phone and check your internet connection. Be sure you have the updated version.' },
  { id: '3', q: 'Is my note data synchronized?', a: 'Absolutely. As long as you are logged into your authenticated account, your notes and highlights synchronize automatically across devices.' },
  { id: '4', q: 'How do I log in as a guest?', a: 'Tap on the Guest Profile, On the pop up menu, click on Sign In Today. You will be redirected to log in with your google account.' },
];

export const SupportFeedbackScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets(); 
  const { width } = useWindowDimensions();
  const [expandedId, setExpandedId] = useState(null);

  const isLargeScreen = width > 450;
  const columnWidth = isLargeScreen ? '48%' : '100%';

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
      {/* Screen Header */}
      <View style={styles.screenHeader}>
        <Pressable 
          style={styles.backButtonFrame} 
          onPress={() => navigation?.canGoBack() && navigation.goBack()} 
          hitSlop={12}
        >
          <ChevronLeft color="#352a48" size={22} strokeWidth={2.5} />
          <AppText type="bold" style={styles.headerTitleText}>Help & Support</AppText>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: Math.max(insets.bottom, 40) }]}
      >
        {/* Visual Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.iconBackground}>
            <HelpCircle color="#ef4444" size={24} strokeWidth={2.2} />
          </View>
          <AppText type="bold" style={styles.bannerTitleText}>Frequently Asked Questions</AppText>
          <AppText type="regular" style={styles.bannerSubtitleText}>
            Find quick answers to common questions about our platform and services.
          </AppText>
        </View>

        {/* FAQ Content Area */}
        <View style={styles.faqContentContainer}>
          <View style={[styles.gridContainer, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
            {FAQ_DATA.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <Pressable 
                  key={item.id} 
                  onPress={() => toggleExpand(item.id)}
                  style={[styles.faqCard, { width: columnWidth }]}
                >
                  <View style={styles.cardRow}>
                    <AppText type="semiBold" style={styles.questionText}>{item.q}</AppText>
                    {isExpanded ? (
                      <ChevronUp color="#ef4444" size={16} />
                    ) : (
                      <ChevronDown color="#b91c1c" size={16} />
                    )}
                  </View>
                  
                  {isExpanded && (
                    <View style={styles.answerWrapper}>
                      <AppText type="regular" style={styles.answerText}>{item.a}</AppText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#f8fafc' },
  screenHeader: { height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backButtonFrame: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitleText: { fontSize: 18, color: '#352a48', letterSpacing: -0.5 },
  scrollContainer: { paddingHorizontal: 20, paddingTop: 24 },
  welcomeBanner: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 10 },
  iconBackground: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff1f1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bannerTitleText: { fontSize: 20, color: '#352a48', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  bannerSubtitleText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  faqContentContainer: { marginTop: 8 },
  gridContainer: { flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  faqCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: '#f1f5f9' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  questionText: { fontSize: 14, color: '#352a48', flex: 1, lineHeight: 20, fontWeight: '600' },
  answerWrapper: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  answerText: { fontSize: 13, color: '#64748b', lineHeight: 20, fontWeight: '400' }
});