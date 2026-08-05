import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from "../../config/supabaseClient";
import YoutubePlayer from 'react-native-youtube-iframe';
import { BookOpen, Search, History, Layers, Bookmark, Play, Bell, Calendar, BookText, User, Lock } from 'lucide-react-native';
import { TestimonySlider } from './TestimonySlider';
import { MachairaGallery } from './machairaGallery';
import { AppText } from '../../components/AppText'; 
import episodeBg from '../../../assets/images/episodeBg.jpg';
import { PastTabContent } from './homeArchive/PastTabContent';
import { RelatedTabContent } from './homeArchive/RelatedTabContent';
import { useTheme } from '../../context/ThemeContext';
import { GuestProfileModalSheet } from '../onboarding/profile/GuestProfile';
import { LoggedInProfileModalSheet, EphemeralToastBanner } from '../onboarding/profile/LoggedInProfile';
import { SearchScreen } from './homeArchive/SearchScreen';

const TABS = ['Past', 'Related', 'Saved', 'Search'];

// ==========================================
// 1. ATOMIC SUB-COMPONENTS
// ==========================================
const TabBarButton = React.memo(({ tab, isActive, onPress }) => {
  const { colors } = useTheme();
  const size = 14;
  const color = isActive ? colors.primary : colors.textSecondary;

  const tabIcon = useMemo(() => {
    switch (tab) {
      case 'Past': return <History color={color} size={size} strokeWidth={2.5} />;
      case 'Related': return <Layers color={color} size={size} strokeWidth={2.5} />;
      case 'Saved': return <Bookmark color={colors.textSecondary} size={size} strokeWidth={2.5} />;
      case 'Search': return <Search color={color} size={size} strokeWidth={2.5} />;
      default: return null;
    }
  }, [tab, color, colors.textSecondary]);

  return (
    <Pressable 
      onPress={onPress} 
      style={[
        styles.tabItemButton,
        isActive
          ? [styles.tabActive, { borderBottomColor: colors.primary }]
          : styles.tabInactive,
      ]}
    >
      <View style={styles.rowCenter}>
        {tabIcon}
        <AppText
          type="bold"
          style={[
            styles.tabLabelText,
            { color: colors.textSecondary },
            isActive && [styles.tabLabelActive, { color: colors.text }],
          ]}
        >
          {tab}
        </AppText>
      </View>
    </Pressable>
  );
});

const FallbackTabContent = React.memo(({ tabName }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.fallbackContainer,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <BookOpen color={colors.primary} size={24} />
      <AppText type="semiBold" style={[styles.fallbackText, { color: colors.textSecondary }]}>
        {tabName} feed coming soon...
      </AppText>
    </View>
  );
});

// ==========================================
// 2. MAIN CORE COMPONENT
// ==========================================
export default function MachairaHome({ 
  user, 
  navigation, 
  onNavigateToSupport, 
  profileVisible, 
  setProfileVisible,
  onNavigateToMenuOption,
  onLogout,
  onTriggerLogin,
  onResumeSession,
  onChangeAccount,
  onDeleteAccount
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions(); // Dynamic dimension listener
  const [activeTab, setActiveTab] = useState('Past');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = 64;

  const isGuest = !user;
  const isLoggedOut = !!(user && user.isLoggedOut);

  const greetingText = useMemo(() => {
    if (isLoggedOut) return 'Sword sheathed, Return soon!';
    return 'Shalom!';
  }, [isLoggedOut]);

  const userDisplayName = useMemo(() => {
    if (isGuest || isLoggedOut) return 'Guest';
    return user?.name || 'User Account';
  }, [isGuest, isLoggedOut, user?.name]);

  const userAvatarUrl = isGuest || isLoggedOut ? null : user?.photo;

  const handleProfilePress = useCallback(() => setProfileVisible(true), [setProfileVisible]);
  
  const [latestDevotional, setLatestDevotional] = useState({
    episodeId: '',
    title: 'Loading latest devotional...',
    date: '',
    image: episodeBg,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchLatestDevotional() {
      try {
        const { data, error } = await supabase
          .from('devotionals') 
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error && isMounted) {
          setLatestDevotional({
            episodeId: data.id?.toString() || '217',
            title: data.title,
            date: data.created_at ? new Date(data.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Recent Episode',
            image: data.flyer_url ? { uri: data.flyer_url } : episodeBg,
          });
        }
      } catch (err) {
        console.error('Error fetching latest devotional:', err);
      }
    }

    fetchLatestDevotional();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDevotionalNavigation = useCallback(() => {
    navigation.navigate('Devotional', {
      episodeId: latestDevotional.episodeId,
      title: latestDevotional.title,
      date: latestDevotional.date,
    });
  }, [navigation, latestDevotional]);

  const handleSupportNavigation = useCallback(() => {
    if (onNavigateToSupport) {
      onNavigateToSupport();
    } else {
      navigation.navigate('SupportFeedback'); 
    }
  }, [onNavigateToSupport, navigation]);

  const logoutTimeoutRef = useRef(null);

  const handleLogout = useCallback(() => {
    setToast({ visible: true, message: 'You have logged out of your account.' });
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
  
    logoutTimeoutRef.current = setTimeout(() => {
      onLogout?.();
      logoutTimeoutRef.current = null;
    }, 3200);
  }, [onLogout]);

  const handleContinueSession = useCallback(async () => {
    const resumeFn = onResumeSession ?? onTriggerLogin;
    const result = await resumeFn?.();
    if (result?.resumed) {
      const firstName = (user?.name || 'friend').split(' ')[0];
      setToast({ visible: true, message: `Welcome back, ${firstName}!` });
    }
  }, [onResumeSession, onTriggerLogin, user]);

  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };
  }, []);

  const [testimonyData] = useState([]);

  return (
    <View style={[styles.flexOne, { backgroundColor: colors.background }]}>
      {/* Profile Header Section */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable 
          style={styles.profileTarget} 
          onPress={handleProfilePress} 
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.avatarAnchorContainer}>
            {userAvatarUrl ? (
              <Image
                source={{ uri: userAvatarUrl }}
                style={[styles.avatarImage, { backgroundColor: colors.card }]}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.card },
                  isLoggedOut && [
                    styles.avatarLoggedOutFallback,
                    { backgroundColor: colors.card, borderColor: colors.primary },
                  ],
                ]}
              >
                <User color={colors.primary} size={18} strokeWidth={2.5} />
              </View>
            )}
            {isLoggedOut && (
              <View
                style={[
                  styles.lockBadgeFrame,
                  { backgroundColor: colors.primary, borderColor: colors.background },
                ]}
              >
                <Lock color="#ffffff" size={8} strokeWidth={3} />
              </View>
            )}
          </View>

          <View style={styles.flexOne}>
            <AppText 
              type={isLoggedOut ? "bold" : "regular"}
              style={[
                styles.greetingMicro,
                { color: colors.textSecondary },
                isLoggedOut && [styles.greetingLoggedOutMicro, { color: colors.primary }],
              ]}
              numberOfLines={1}
            >
              {greetingText}
            </AppText>
            <AppText 
              type="bold" 
              numberOfLines={1} 
              style={[
                styles.profileName,
                { color: colors.text },
                isLoggedOut && [styles.profileLoggedOutName, { color: colors.text }],
              ]}
            >
              {userDisplayName}
            </AppText>
          </View>
        </Pressable>

        <Pressable style={[styles.subscribeBtn, { backgroundColor: colors.border }]}>
          <Bell color={colors.textSecondary} size={21} strokeWidth={2.5} style={styles.bellIconSpacing} />
        </Pressable>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 }
        ]}     
      >
        {/* Dynamic Hero Card Section */}
        <View
          style={[
            styles.heroWrapper,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Image
            source={latestDevotional.image}
            style={[styles.heroImage, { backgroundColor: colors.border }]}
            resizeMode="cover"
          />
          <View style={styles.heroPane}>
            <View style={styles.rowCenter}>
              <Calendar color={colors.textSecondary} size={14} style={styles.calendarIconSpacing} />
              <AppText type="semiBold" style={[styles.metaText, { color: colors.textSecondary }]}>
                {latestDevotional.date}
              </AppText>
            </View>
            <AppText
              type="bold"
              style={[styles.episodeText, { color: colors.text }]}
              numberOfLines={2}
            >
              {latestDevotional.title}
            </AppText>
             
            <View style={[styles.rowCenter, styles.actionRow]}>
              <Pressable style={[styles.listenBtn, { backgroundColor: colors.border }]}>
                <Play color={colors.text} size={16} fill={colors.text} style={styles.playIconSpacing} />
                <AppText type="semiBold" style={[styles.listenText, { color: colors.text }]}>
                  Listen Now
                </AppText>
              </Pressable>
               
              <Pressable
                style={[styles.readBtn, { backgroundColor: colors.primary }]}
                onPress={handleDevotionalNavigation}
              >
                <BookText color="#fff" size={16} style={styles.bookIconSpacing} />
                <AppText type="semiBold" style={styles.readText}>Read Text</AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Section Divider Headers */}
        <View style={styles.sectionHeader}>
          <AppText type="bold" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Explore Archive
          </AppText>
          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
        </View>

        {/* Segment Filter Selection Menu */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TabBarButton
              key={tab}
              tab={tab}
              isActive={tab === activeTab}
              onPress={() => {
                if (tab === 'Saved') {
                  navigation.navigate('SavedScreen');
                } else if (tab === 'Search') {
                  navigation.navigate('SearchScreen');
                } else {
                  setActiveTab(tab);
                }
              }}
            />
          ))}
        </View>
         
        {activeTab === 'Past' ? (
          <PastTabContent 
            onSelectEpisode={(item) => {
              navigation.navigate('Devotional', {
                episodeId: item.id.toString(),
                title: item.title,
                date: item.date,
              });
            }} 
          />
         ) : activeTab === 'Related' ? (
          <RelatedTabContent 
            onSelectEpisode={(item) => {
              navigation.navigate('Devotional', {
                episodeId: item.id.toString(),
                title: item.title,
                date: item.date,
                related: item.related,
              });
            }} 
          />
         ) : activeTab === 'Search' ? (
          <SearchScreen
            onSelectEpisode={(item) => {
              navigation.navigate('Devotional', {
                episodeId: item.id.toString(),
                title: item.title,
                date: item.date,
              });
            }} 
          />
         ) : (
          <FallbackTabContent tabName={activeTab} />
        )}

        <View style={[styles.youtubeWrapper, { borderColor: colors.border }]}>
          <YoutubePlayer
            height={245}
            width={width - 32} // Account for container horizontal padding
            videoId={"9Rx_B4htGn0"} 
          />
          <View style={styles.liveBadge}>
            <AppText type="bold" style={styles.liveBadgeText}>LIVE</AppText>
          </View>
          <View style={styles.heroPane}>
            <AppText type="bold" style={{ color: colors.text, fontSize: 16 }}>
              The Commonwealth Digital Church
            </AppText>
            <AppText type="regular" style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
              Worship with us from anywhere. Join all our services on Youtube.
            </AppText>
          </View>
        </View>

        <TestimonySlider data={testimonyData} />
        <MachairaGallery />
      </ScrollView>

      {/* Dynamic Overlay Sheets Dispatcher */}
      {isGuest ? (
        <GuestProfileModalSheet
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
          onTriggerLogin={onTriggerLogin}
          onNavigateToSupport={handleSupportNavigation}
          onNavigateToMenuOption={onNavigateToMenuOption}
        />
      ) : (
        <LoggedInProfileModalSheet
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
          user={user}
          isLoggedOut={isLoggedOut}
          onLogin={handleContinueSession}
          onLogout={handleLogout}
          onChangeAccount={onChangeAccount}
          onDeleteAccount={onDeleteAccount}
          onNavigateToSupport={handleSupportNavigation}
          onNavigateToMenuOption={onNavigateToMenuOption}
        />
      )}

      <EphemeralToastBanner
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

// ==========================================
// 3. CLEAN STYLES MANAGEMENT
// ==========================================
const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', width: '100%' }, 
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    marginBottom: 20 
  },
  profileTarget: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 16 },
  avatarAnchorContainer: { position: 'relative', width: 38, height: 38 },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1, 
    borderColor: '#fed7aa' 
  },
  avatarLoggedOutFallback: {},
  lockBadgeFrame: { 
    position: 'absolute', 
    bottom: -1, 
    right: -1, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1.5 
  },
  greetingMicro: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  greetingLoggedOutMicro: { textTransform: 'none' },
  profileName: { fontSize: 15, marginTop: -1 },
  profileLoggedOutName: {},
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 20 },
  heroWrapper: { 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 28, 
    borderWidth: 1, 
    ...Platform.select({ 
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16 }, 
      android: { elevation: 4 } 
    }) 
  },
  heroImage: { width: '100%', height: 195 },
  heroPane: { padding: 20, alignItems: 'flex-start' },
  metaText: { fontSize: 13 },
  episodeText: { fontSize: 18, lineHeight: 24, marginBottom: 20 },
  listenBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  readBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  listenText: { fontSize: 14 },
  readText: { color: '#ffffff', fontSize: 14 },
  sectionHeader: { marginTop: 22, marginBottom: 16, gap: 4 },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 2 },
  sectionDivider: { height: 1, width: '30%', marginLeft: 2, opacity: 0.7 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20, paddingHorizontal: 4 },
  tabItemButton: { paddingVertical: 8, flex: 1, alignItems: 'center', borderBottomWidth: 2 },
  tabInactive: { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
  tabActive: { backgroundColor: 'transparent' },
  tabLabelText: { fontSize: 13, letterSpacing: -0.1, marginLeft: 5 }, 
  tabLabelActive: {},
  fallbackContainer: { borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 10 },
  fallbackText: { fontSize: 14, marginTop: 8 },
  bellIconSpacing: { marginRight: 5 },
  calendarIconSpacing: { marginRight: 6 },
  playIconSpacing: { marginRight: 8 },
  bookIconSpacing: { marginRight: 8 },
  youtubeWrapper: { 
    width: '100%', 
    alignSelf: 'stretch', 
    marginBottom: 20, 
    marginTop: 60, 
    backgroundColor: 'transparent', 
    paddingHorizontal: 0, 
    borderTopWidth: 1, 
    borderBottomWidth: 1 
  },
  liveBadge: { 
    position: 'absolute', 
    top: 10, 
    left: 10, 
    backgroundColor: '#ef4444', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4 
  },
  liveBadgeText: { color: '#fff', fontSize: 10 }
});