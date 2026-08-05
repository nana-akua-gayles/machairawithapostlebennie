import React, { useState, useRef, useEffect, memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, Pressable, Alert, Dimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { User, Handshake, Settings, Globe2, Heart, BookOpenCheck, Quote, MicVocal } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

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

const QuoteItem = memo(({ item }) => (
  <View style={styles.quoteWrapper}>
    <Quote color="#f65ca1" size={20} style={styles.quoteIcon} />
    <AppText style={styles.quoteText}>{item}</AppText>
    <AppText type="medium" style={styles.authorName}>~ Apostle Bennie</AppText>
  </View>
));

const AUTOPLAY_INTERVAL = 7000;

const TOOLS = [
  { id: 'about', title: 'About Author', icon: User, sub: 'The heart and mind behind Machaira', color: 'red', screen: 'AboutAuthor' },
  { id: 'trivia', title: 'Bible Trivia / Game', icon: BookOpenCheck, sub: 'Test your biblical knowledge', color: '#f59e0b', screen: 'BibleTrivia' },
  { id: 'partner', title: 'Be a Partner', icon: Handshake, sub: 'A co-labourer with God', color: '#f59e0b', screen: 'Partner' },
  { id: 'testimony', title: 'Testimonies', icon: MicVocal, sub: 'Share the workings of faith with the world', color: 'red', screen: 'Testimony' },
  { id: 'social', title: 'Community', icon: Globe2, sub: 'Join Biblical conversations', color: 'red', screen: 'Community' },
  { id: 'handle', title: 'Follow Us', icon: Heart, sub: 'Social Media handles', color: '#f59e0b', screen: 'FollowUs' },
  { id: 'settings', title: 'Settings', icon: Settings, sub: 'App preferences', color: '#352a48', screen: 'Settings' },
];

export const MoreScreen = () => {
  const navigation = useNavigation();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = prev === QUOTES.length - 1 ? 0 : prev + 1;
        scrollRef.current?.scrollTo({ x: width * nextIndex, animated: nextIndex !== 0 });
        return nextIndex;
      });
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const handleCardPress = (tool) => {
    if (tool.screen) {
      if (tool.screen === 'Testimony') {
        navigation.navigate('Testimony');
      } else {
        navigation.navigate(tool.screen);
      }
    } else {
      Alert.alert('Coming Soon', `${tool.title} will be available in a future update.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <AppText type="bold" style={styles.headerTitle}>More</AppText>
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
            <QuoteItem key={index} item={quote} />
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          {TOOLS.map((tool) => (
            <Pressable key={tool.id} style={styles.cardSmall} onPress={() => handleCardPress(tool)}>
              <View style={[styles.iconWrapper, { backgroundColor: `${tool.color}10` }]}>
                <tool.icon color={tool.color} size={24} />
              </View>
              <AppText type="bold" style={styles.cardLabel}>{tool.title}</AppText>
              <AppText style={styles.cardSub} numberOfLines={2}>{tool.sub}</AppText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 18, paddingBottom: 120 },
  headerContainer: { width: '100%', marginBottom: 10, marginTop: 10 },
  headerTitle: { fontSize: 32, color: '#0f172a', marginBottom: 15, paddingLeft: 20 },
  quoteWrapper: { width: width, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center' },
  quoteIcon: { marginBottom: 12, opacity: 0.6 },
  quoteText: { fontSize: 16, color: '#f65ca1', textAlign: 'center', lineHeight: 24 },
  authorName: { fontSize: 13, color: '#f65ca1', marginTop: 12, opacity: 0.8 },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardSmall: { width: '48%', height: 150, backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 12, borderColor: '#f1f5f9' },
  iconWrapper: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 14, color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#64748b', marginTop: 4 }
});