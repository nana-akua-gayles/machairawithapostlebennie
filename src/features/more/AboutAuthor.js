import React from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { ChevronLeft } from 'lucide-react-native';

export const AboutAuthorScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); 

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

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
        <AppText style={styles.mandateText}>
          Apostle Benjamin Nana Amissah Ansah is a renowned transgenerational leader and Sound Kingdom expositor with a mandate of influencing the techno-pluralistic society with the intent of Christ through the saturation and filling of every heart with the intrinsic knowledge of the fullness of the reigning life in Christ.
        </AppText>

        <AppText type="bold" style={styles.sectionTitle}>Global Footprint & Initiatives</AppText>
        <View style={styles.impactGrid}>
            <View style={styles.accentLine} />
          </View>
          <AppText style={styles.bodyText}>
            Through various life-transforming meetings, mission campaigns, and initiatives including YMS, GLOBAL ICONS, CDLS, SMEC, ONLINE MINISTRY SCHOOL, and IMOC, his leadership has broken systemic barriers:
          </AppText>

          <View style={styles.impactGrid}>
            <View style={styles.impactCard}>
              <View style={styles.cardAccent} />
              <AppText style={styles.cardText}>
                Inspired, nurtured, and equipped thousands of young people for ministry and global leadership.
              </AppText>
            </View>

            <View style={styles.impactCard}>
              <View style={styles.cardAccent} />
              <AppText style={styles.cardText}>
                Transformed villages and towns in Ghana through rural and urban mission campaigns.
              </AppText>
            </View>

            <View style={styles.impactCard}>
              <View style={styles.cardAccent} />
              <AppText style={styles.cardText}>
                Inspired and equipped over 5,000 missionaries globally.
              </AppText>
            </View>

            <View style={styles.impactCard}>
              <View style={styles.cardAccent} />
              <AppText style={styles.cardText}>
                Impacted Secondary and Tertiary institutions in Ghana through Transformational 360 (T360).
              </AppText>
            </View>
          </View>

          {/* Literary Work */}
          <View style={styles.devotionalBox}>
            <AppText style={styles.devotionalText}>
              He is the originating voice and prophetic author of <AppText type="bold" style={styles.italicHighlight}>Machaira with Apostle Bennie</AppText> devotional.
            </AppText>
          </View>

          {/* Dimensional Ministry */}
          <AppText style={styles.bodyText}>
            Apostle Benjamin Nana Amissah Ansah's multifaceted ministry encompasses sound prophetic-teaching, healing, and establishing believers in spiritual understanding.
          </AppText>

          <View style={styles.familySection}>
          <View style={styles.divider} />
          <AppText type="bold" style={styles.familyHeader}>A Legacy of Love</AppText>
          <AppText style={styles.familyBody}>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  // Fixed Header
  heroWrapper: { width: '100%', backgroundColor: '#1e293b' },
  heroImage: { width: '100%', flex: 1 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20 },
  heroTextContainer: { position: 'absolute', bottom: 32, left: 24, right: 24 },
  heroName: { fontSize: 34, color: '#ffffff' },
  heroTitle: { fontSize: 16, color: '#f1f5f9' },
  
  scrollContent: { padding: 24, paddingBottom: 40 },
  mandateText: { fontSize: 17, lineHeight: 28, color: '#0f172a', marginBottom: 32 },
  sectionTitle: { fontSize: 18, color: '#0f172a', textTransform: 'uppercase', marginBottom: 16 },
  accentLine: { height: 3, width: 40, backgroundColor: '#ef4444', marginTop: 6, borderRadius: 2 },
  bodyText: { fontSize: 16, lineHeight: 26, color: '#475569', marginBottom: 16 },
  
  familySection: { marginTop: 40, padding: 24, backgroundColor: '#fff1f2', borderRadius: 20, alignItems: 'center'},
  divider: { height: 2, width: 60, backgroundColor: '#ef4444', marginBottom: 16 },
  familyHeader: { fontSize: 20, color: '#991b1b', marginBottom: 8 },
  familyBody: { fontSize: 16, lineHeight: 26, color: '#451a03', textAlign: 'center', fontStyle: 'italic' },

  impactGrid: { gap: 12, marginBottom: 24 },
  impactCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, flexDirection: 'row', borderWidth: 1, borderColor: '#f1f5f9' },
  cardAccent: { width: 4, backgroundColor: '#ef4444', borderRadius: 2, marginRight: 12 },
  cardText: { flex: 1, fontSize: 15, lineHeight: 22, color: '#334155' },
   devotionalBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 16, padding: 20, marginBottom: 24,},
  devotionalText: { fontSize: 16, lineHeight: 24, color: '#991b1b', textAlign: 'center' },
  italicHighlight: { fontStyle: 'italic', color: '#ef4444' },
});