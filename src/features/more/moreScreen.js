import React, { useState, useRef, useEffect, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, Pressable, Alert, Dimensions, Platform } from 'react-native';
import { AppText } from '../../components/AppText';
import { User, Handshake, Settings, Globe2, Heart, BookOpenCheck, Quote, MicVocal, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const QUOTES = [
  "Don’t make decisions just because of challenges. Make decisions which are consistent with the revelation of Jesus.",
  "Stop worrying and start praying. Pray over everything no matter how little it may seem to be. Hallelujah!",
  "Why take a ring-side seat, whiles you are to step forward to shine the light of the gospel?",
  "It's humbling, how through my ministry the Lord turned folks with no interest in Church or even God into gospel heralds.",
  "Until you stop the self-pity party, destinies are going to be destroyed. The worthlessness feelings will not make you a blessing",
  "Irrespective of what you think of yourself or your history, the Lord knows you by name precious one. You matter to Him and He values you.",
  "No matter the present day evil, God’s provision of grace is superabounding. As many as will turn to God and have faith in Him shall be satisfied by God grace.",
  "Test all things by the WORD OF GOD; that is true discernment not cynicism.",
  "God upholds His words over His works, for His works is a finished matter. The end can only be GLORIOUS!",
  "It's not by mistake God brought you to a fellowship like this, it's by His stakes.",
  "The righteousness of God is not your second nature. It is your original nature. That is your identity.",
  "To be called unto Glory is to be a satisfaction unto others. Glory is not kept but shown. People must see God through you!",
  "God takes interest in you when you take interest in the affairs of His Kingdom. Your life is part of God's battle strategy. Beloved be a warrior Son.",
  "With God, He doesn't ask you what you bring to the table. He prepares the table before you. Yours is to faithfully enjoy.",
  "Until you become a living scarifice, you cannot be offered to God. What cannot be offered to God cannot be used by Him.",
  "God's commandment does not lead to burdensome grave; God's commandment as revealed in Christ, IS LIFE.",
  "Anything that brings glory to God must be done in faith. Faith is an unflinching confidence in who God is and what He has said.",
  "There are words or utterances which are designed to pierce and wound your heart. The goal is to leave you discoraged. Don't allow negative words to ruin your courage.",
  "Until your mind can see or imagine the manifestation of what God has said, the hands cannot handle it.",
  "Every communication of God is to take us on a journey of understanding. God's questions lead men into light."
];

const QuoteItem = memo(({ item, pageWidth }) => (
  <View style={[styles.quoteWrapper, { width: pageWidth }]}>
    <Quote color="#f65ca1" size={20} style={styles.quoteIcon} />
    <AppText style={styles.quoteText} maxFontSizeMultiplier={1.2}>
      {item}
    </AppText>
    <AppText type="medium" style={styles.authorName} maxFontSizeMultiplier={1.2}>
      ~ Apostle Bennie
    </AppText>
  </View>
));

const AUTOPLAY_INTERVAL = 7000;

const TOOLS = [
  { id: 'about', title: 'About Author', icon: User, sub: 'The heart and mind behind Machaira', color: '#ff5252', screen: 'AboutAuthor' },
  { id: 'trivia', title: 'Bible Trivia / Game', icon: BookOpenCheck, sub: 'Test your biblical knowledge', color: '#f59e0b', screen: 'BibleTrivia', requiresAuth: true },
  { id: 'partner', title: 'Be a Partner', icon: Handshake, sub: 'A co-labourer with God', color: '#f59e0b', screen: 'Partner' },
  { id: 'testimony', title: 'Testimonies', icon: MicVocal, sub: 'Share the workings of faith with the world', color: '#ff5252', screen: 'Testimony', requiresAuth: true },
  { id: 'social', title: 'Community', icon: Globe2, sub: 'Join Biblical conversations', color: '#ff5252', screen: 'Community', requiresAuth: true },
  { id: 'handle', title: 'Follow Us', icon: Heart, sub: 'Social Media handles', color: '#f59e0b', screen: 'FollowUs' },
  { id: 'settings', title: 'Settings', icon: Settings, sub: 'App preferences', color: '#a855f7', screen: 'Settings' },
];

export const MoreScreen = ({ user, onRequireAuth }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = prev === QUOTES.length - 1 ? 0 : prev + 1;
        scrollRef.current?.scrollTo({ x: windowWidth * nextIndex, animated: nextIndex !== 0 });
        return nextIndex;
      });
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [windowWidth]);

  const handleCardPress = (tool) => {
    if (tool.requiresAuth && !user) {
      Alert.alert('Sign in required', `Please sign in to access ${tool.title}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: onRequireAuth },
      ]);
      return;
    }
    if (tool.screen) {
      navigation.navigate(tool.screen);
    } else {
      Alert.alert('Coming Soon', `${tool.title} will be available in a future update.`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]} maxFontSizeMultiplier={1.2}>
          More
        </AppText>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideSize = event.nativeEvent.layoutMeasurement.width;
            const offset = event.nativeEvent.contentOffset.x;
            const newIndex = Math.round(offset / slideSize);
            setActiveIndex(newIndex);
          }}
        >
          {QUOTES.map((quote, index) => (
            <QuoteItem key={`quote_${index}`} item={quote} pageWidth={windowWidth} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          {TOOLS.map((tool) => {
            const IconComponent = tool.icon;
            const locked = tool.requiresAuth && !user;
            return (
              <Pressable
                key={tool.id}
                style={[styles.cardSmall, { backgroundColor: colors.card, borderColor: colors.border }, locked && styles.cardLocked]}
                onPress={() => handleCardPress(tool)}
              >
                <View style={[styles.iconWrapper, { backgroundColor: `${tool.color}15` }]}>
                  <IconComponent color={tool.color} size={24} />
                  {locked && (
                    <View style={styles.lockBadge}>
                      <Lock color="#FFFFFF" size={10} />
                    </View>
                  )}
                </View>
                <AppText type="bold" style={[styles.cardLabel, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {tool.title}
                </AppText>
                <AppText style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={2} maxFontSizeMultiplier={1.1}>
                  {locked ? 'Sign in to access' : tool.sub}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 120 },
  headerContainer: { width: '100%', marginBottom: 10, marginTop: 10 },
  headerTitle: { fontSize: 22, marginBottom: 15, paddingLeft: 20 },
  quoteWrapper: { paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  quoteIcon: { marginBottom: 8, opacity: 0.6 },
  quoteText: { fontSize: 14, color: '#f65ca1', textAlign: 'center', lineHeight: 20 },
  authorName: { fontSize: 11, color: '#f65ca1', marginTop: 8, opacity: 0.8 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardSmall: { width: '48%', minHeight: 135, borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 14 },
  cardLocked: { opacity: 0.6 },
  iconWrapper: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  lockBadge: { position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#64748B', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  cardLabel: { fontSize: 13 },
  cardSub: { fontSize: 11, marginTop: 4, lineHeight: 15 }
});
