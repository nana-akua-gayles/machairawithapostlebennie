import React from 'react';
import { View, StyleSheet, Pressable, Linking, ScrollView, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../../components/AppText';

const DATA = [
  { 
    id: '1', title: "Apostle Bennie's Handles", description: "Even on social media, God speaks!", color: '#8b5cf6', 
    links: [
      { name: 'Benjamin Nana Amissah Ansah', icon: 'facebook', url: 'https://www.facebook.com/share/1M2gzUTbZC/?mibextid=wwXIfr' },
      { name: 'Benjamin Nana Amissah Ansah', icon: 'instagram', url: 'https://www.instagram.com/apostle_bennie?igsh=ODhlNmllczYwZmQ0' },
    ] 
  },
  { 
    id: '2', title: "Machaira With Apostle Bennie Handles", description: "Stay tuned to what God's saying in the now!", color: '#ef4444', 
    links: [
      { name: 'Facebook', icon: 'facebook', url: 'https://www.facebook.com/share/1Bkgbpfjin/?mibextid=wwXIfr' },
      { name: 'Machaira with Apostle Bennie Daily Devotional', icon: 'instagram', url: 'https://www.instagram.com/machaira_with_apostlebennie?igsh=MXd2eWw2N3E3dWloag==' },
      { name: 'Machaira with Apostle Bennie Website', icon: 'globe', url: 'https://machairawithapostlebennie.org' },
    ] 
  },
  { 
    id: '3', title: "Christ Commonwealth Global Handles", description: "Let's turn your scroll into growth.", color: '#0ea5e9', 
    links: [
      { name: 'Christ Commonwealth Global', icon: 'facebook', url: 'https://www.facebook.com/share/1BjZ2kzkTs/?mibextid=wwXIfr' }, 
      { name: 'Christ Commonwealth Global', icon: 'instagram', url: 'https://www.instagram.com/christcommonwealthglobal?igsh=YWU5MzZ0bWhrNDRk' },
      { name: 'Christ Commonwealth Global', icon: 'youtube-play', url: 'https://youtube.com/@christcommonwealthglobal?si=pv5zFdbjOwtEzE9z' },
    ] 
  },
];

const FollowUsScreen = () => {
  const navigation = useNavigation();

  return (
    <LinearGradient colors={['#f8fafc', '#e2e8f0']} style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backButtonContainer}
            android_ripple={{ color: '#00000010', borderless: true }}
          >
            <ChevronLeft size={24} color="#1e293b" />
          </Pressable>
          <AppText type="bold" style={styles.title}>Connect with Us</AppText>
        </View>

        <View style={styles.scriptureContainer}>
          <AppText style={styles.scriptureRef}>1 Corinthians 11:1</AppText>
          <AppText style={styles.scriptureText}>"Be ye followers of me, even as I also am of Christ"</AppText>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {DATA.map((cat) => (
            <View key={cat.id} style={styles.card}>
              <View style={styles.cardTop}>
                <AppText type="bold" style={styles.catTitle}>{cat.title}</AppText>
                <AppText style={styles.description}>{cat.description}</AppText>
              </View>

              <View style={styles.linkGrid}>
                {cat.links.map((link, i) => (
                  <Pressable key={i} style={styles.linkItem} onPress={() => Linking.openURL(link.url)}>
                    <FontAwesome name={link.icon} size={20} color={cat.color} />
                    <AppText style={styles.linkText}>{link.name}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22,  backgroundColor: '#f1f5f9',  alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 22, color: '#0f172a' },
  scriptureContainer: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  scriptureRef: { fontSize: 14, color: '#64748b', marginBottom: 6, letterSpacing: 1 },
  scriptureText: { fontSize: 15, color: '#475569', fontStyle: 'italic', textAlign: 'center', lineHeight: 22 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,borderWidth: 1, borderColor: '#f1f5f9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 }
    })
  },
  cardTop: { marginBottom: 16 },
  catTitle: { fontSize: 18, color: '#1e293b' },
  description: { fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 18 },
  linkGrid: { gap: 12 },
  linkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#f1f5f9'},
  linkText: { fontSize: 13, color: '#334155', marginLeft: 12, flex: 1, fontWeight: '500' }
});

export default FollowUsScreen;