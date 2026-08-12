import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

export const AboutAuthorScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        translucent 
        backgroundColor="transparent" 
      />

      <View style={[styles.heroWrapper, { height: 380 + insets.top }]}>
        <Image 
          source={require('../../../assets/images/Apostle3.jpg')}
          style={[styles.heroImage, { marginTop: insets.top }]} 
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />
        <Pressable 
          style={[styles.backButton, { top: insets.top + 10 }]} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <View style={styles.heroTextContainer}>
          <AppText type="bold" style={styles.heroName}>Apostle Bennie</AppText>
          <AppText style={styles.heroTitle}>The originating voice and prophetic author of the Machaira devotional.</AppText>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <AppText style={[styles.mandateText, { color: colors.text }]}>
          Apostle Benjamin Nana Amissah Ansah is a renowned transgenerational leader and Sound Kingdom expositor with a mandate of influencing the techno-pluralistic society with the intent of Christ through the saturation and filling of every heart with the intrinsic knowledge of the fullness of the reigning life in Christ.
        </AppText>

        <AppText type="bold" style={[styles.sectionTitle, { color: colors.text }]}>Global Footprint & Initiatives</AppText>
        <View style={styles.accentLine} />

        <AppText style={[styles.bodyText, { color: colors.textSecondary }]}>
          Through various life-transforming meetings, mission campaigns, and initiatives including YMS, GLOBAL ICONS, CDLS, SMEC, ONLINE MINISTRY SCHOOL, and IMOC, his leadership has broken systemic barriers:
        </AppText>

        <View style={styles.impactGrid}>
          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardAccent} />
            <AppText style={[styles.cardText, { color: colors.text }]}>
              Inspired, nurtured, and equipped thousands of young people for ministry and global leadership.
            </AppText>
          </View>

          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardAccent} />
            <AppText style={[styles.cardText, { color: colors.text }]}>
              Transformed villages and towns in Ghana through rural and urban mission campaigns.
            </AppText>
          </View>

          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardAccent} />
            <AppText style={[styles.cardText, { color: colors.text }]}>
              Inspired and equipped over 5,000 missionaries globally.
            </AppText>
          </View>

          <View style={[styles.impactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardAccent} />
            <AppText style={[styles.cardText, { color: colors.text }]}>
              Impacted Secondary and Tertiary institutions in Ghana through Transformational 360 (T360).
            </AppText>
          </View>
        </View>

        {/* Literary Work */}
        <View style={[styles.devotionalBox, { 
          backgroundColor: colors.card, 
          borderColor: colors.border 
        }]}>
          <AppText style={[styles.devotionalText, { color: colors.text }]}>
            He is the originating voice and prophetic author of <AppText type="bold" style={[styles.italicHighlight, { color: '#ef4444' }]}>Machaira with Apostle Bennie</AppText> devotional.
          </AppText>
        </View>

        {/* Dimensional Ministry */}
        <AppText style={[styles.bodyText, { color: colors.textSecondary }]}>
          Apostle Benjamin Nana Amissah Ansah's multifaceted ministry encompasses sound prophetic-teaching, healing, and establishing believers in spiritual understanding.
        </AppText>

        <View style={[styles.familySection, { 
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderWidth: 1
        }]}>
          <View style={styles.divider} />
          <AppText type="bold" style={[styles.familyHeader, { color: colors.text }]}>A Legacy of Love</AppText>
          <AppText style={[styles.familyBody, { color: colors.textSecondary }]}>
            Beyond his public ministry, Apostle Benjamin walks in the beauty of a godly home. 
            He is happily married to his partner in purpose, Pastor Selly, and together they are 
            blessed with three lovely daughters: Jethra, Tiphara, and Liselle.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroWrapper: { width: '100%', backgroundColor: '#1e293b' },
  heroImage: { width: '100%', flex: 1 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  heroTextContainer: { position: 'absolute', bottom: 32, left: 24, right: 24 },
  heroName: { fontSize: 34, color: '#ffffff' },
  heroTitle: { fontSize: 16, color: '#f1f5f9' },
  
  scrollContent: { padding: 24, paddingBottom: 40 },
  mandateText: { fontSize: 17, lineHeight: 28, marginBottom: 24 },
  sectionTitle: { fontSize: 18, textTransform: 'uppercase', marginBottom: 6 },
  accentLine: { height: 3, width: 40, backgroundColor: '#ef4444', marginBottom: 16, borderRadius: 2 },
  bodyText: { fontSize: 16, lineHeight: 26, marginBottom: 16 },
  
  familySection: { marginTop: 32, padding: 24, borderRadius: 20, alignItems: 'center' },
  divider: { height: 2, width: 60, backgroundColor: '#ef4444', marginBottom: 16 },
  familyHeader: { fontSize: 20, marginBottom: 8 },
  familyBody: { fontSize: 16, lineHeight: 26, textAlign: 'center', fontStyle: 'italic' },

  impactGrid: { gap: 12, marginBottom: 24 },
  impactCard: { borderRadius: 14, padding: 16, flexDirection: 'row', borderWidth: 1 },
  cardAccent: { width: 4, backgroundColor: '#ef4444', borderRadius: 2, marginRight: 12 },
  cardText: { flex: 1, fontSize: 15, lineHeight: 22 },
  devotionalBox: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 24 },
  devotionalText: { fontSize: 16, lineHeight: 24, textAlign: 'center' },
  italicHighlight: { fontStyle: 'italic' },
});