import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from "../../config/supabaseClient";
import YoutubePlayer from 'react-native-youtube-iframe';
import { BookOpen, Search, History, Layers, Bookmark, Play, Bell, Calendar, BookText, User } from 'lucide-react-native';
import { TestimonySlider } from './TestimonySlider';
import { MachairaGallery } from './machairaGallery';
import { AppText } from '../../components/AppText';
import episodeBg from '../../../assets/images/episodeBg.jpg';
import { PastTabContent } from './homeArchive/PastTabContent';
import { RelatedTabContent } from './homeArchive/RelatedTabContent';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../context/AudioContext';
import { GuestProfileModalSheet } from '../onboarding/profile/GuestProfile';
import { LoggedInProfileModalSheet } from '../onboarding/profile/LoggedInProfile';
import { SearchScreen } from './homeArchive/SearchScreen';
import { useNotifications } from './useNotifications';

const MAX_FONT_SCALE = 1.3;
const TABS = ['Past', 'Related', 'Saved', 'Search'];

// TODO: move to a shared constants file if other screens need this
const DEVOTIONAL_SPEAKER = "Apostle Benjamin Nana Amissah Ansah";

// Used only if the featured_video row is missing/unreachable, so the
// section never renders empty.
const FALLBACK_VIDEO_ID = "9Rx_B4htGn0";

// Pulls the 11-char YouTube video ID out of whatever URL shape someone
// pastes into Supabase — watch URLs, youtu.be short links, embed URLs,
// or a bare ID typed in directly all need to resolve correctly since a
// non-technical person will be the one editing this.
function extractYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/live\/|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

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
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={tab}
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
          numberOfLines={1}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
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
      <AppText
        type="semiBold"
        numberOfLines={2}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        style={[styles.fallbackText, { color: colors.textSecondary }]}
      >
        {tabName} feed coming soon...
      </AppText>
    </View>
  );
});

export default function MachairaHome({
  user,
  navigation,
  onNavigateToSupport,
  profileVisible,
  setProfileVisible,
  onNavigateToMenuOption,
  onLogout,
  onTriggerLogin,
  onChangeAccount,
  onDeleteAccount
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('Past');
  const insets = useSafeAreaInsets();
  const { unreadCount } = useNotifications();
  const TAB_BAR_HEIGHT = 64;

  const isGuest = !user;

  const userDisplayName = useMemo(() => {
    if (isGuest) return 'Guest';
    return user?.name || 'User Account';
  }, [isGuest, user?.name]);

  const userAvatarUrl = isGuest ? null : user?.photo;

  const handleProfilePress = useCallback(() => setProfileVisible(true), [setProfileVisible]);

  const [latestDevotional, setLatestDevotional] = useState({
    episodeId: '',
    title: '',
    date: '',
    createdAt: null,
    image: episodeBg,
    audio_url: '',
  });
  const [devotionalStatus, setDevotionalStatus] = useState('loading');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const fetchLatestDevotional = useCallback(async () => {
    setDevotionalStatus('loading');
    try {
      const { data, error } = await supabase
        .from('devotionals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching latest devotional:', error);
        setDevotionalStatus('error');
        return;
      }

      if (!data) {
        setDevotionalStatus('empty');
        return;
      }

      setLatestDevotional({
        episodeId: data.id?.toString() || '217',
        title: data.title,
        date: data.created_at
          ? new Date(data.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          : 'Recent Episode',
        createdAt: data.created_at || null,
        image: data.flyer_url ? { uri: data.flyer_url } : episodeBg,
        audio_url: data.audio_url || '',
      });
      setDevotionalStatus('ready');
    } catch (err) {
      console.error('Error fetching latest devotional:', err);
      setDevotionalStatus('error');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      await fetchLatestDevotional();
    })();

    return () => {
      isMounted = false;
    };
  }, [fetchLatestDevotional]);

  const { playAudio } = useAudio();

  const handleListenNow = useCallback(() => {
    if (devotionalStatus !== 'ready') return;
    if (!latestDevotional.audio_url) return;

    navigation.navigate("FullDevotionalAudio", {
      devotional: {
        title: latestDevotional.title,
        speaker: DEVOTIONAL_SPEAKER,
        image: latestDevotional.image?.uri || latestDevotional.image,
        audioUrl: latestDevotional.audio_url,
        date: latestDevotional.date,
        createdAt: latestDevotional.createdAt,
      }
    });
  }, [devotionalStatus, latestDevotional, navigation]);

  const navLockRef = useRef(false);
  const handleDevotionalNavigation = useCallback(() => {
    if (navLockRef.current || devotionalStatus !== 'ready') return;
    navLockRef.current = true;
    navigation.navigate('Devotional', {
      episodeId: latestDevotional.episodeId,
      title: latestDevotional.title,
      date: latestDevotional.date,
    });
    setTimeout(() => { navLockRef.current = false; }, 800);
  }, [navigation, latestDevotional, devotionalStatus]);

  const handleSupportNavigation = useCallback(() => {
    if (onNavigateToSupport) {
      onNavigateToSupport();
    } else {
      navigation.navigate('SupportFeedback');
    }
  }, [onNavigateToSupport, navigation]);

  const [testimonyData] = useState([]);

  const [featuredVideoId, setFeaturedVideoId] = useState(FALLBACK_VIDEO_ID);

  useEffect(() => {
    let isMounted = true;

    async function fetchFeaturedVideo() {
      try {
        const { data, error } = await supabase
          .from('featured_video')
          .select('youtube_url')
          .eq('id', 1)
          .maybeSingle();

        if (error) throw error;
        if (!isMounted || !data?.youtube_url) return;

        const extractedId = extractYoutubeId(data.youtube_url);
        if (extractedId) setFeaturedVideoId(extractedId);
      } catch (err) {
        console.error('Error fetching featured video:', err);
        // Keep FALLBACK_VIDEO_ID on failure — section still renders.
      }
    }

    fetchFeaturedVideo();
    return () => { isMounted = false; };
  }, []);

  const heroTitleText =
    devotionalStatus === 'loading' ? 'Loading latest devotional...' :
    devotionalStatus === 'empty' ? 'No devotionals available yet — check back soon' :
    devotionalStatus === 'error' ? "Couldn't load the latest devotional" :
    latestDevotional.title;

  return (
    <View style={[styles.flexOne, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
        <Pressable style={styles.profileTarget} onPress={handleProfilePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={`Profile, ${userDisplayName}`}>
          <View style={styles.avatarAnchorContainer}>
            {userAvatarUrl ? (
              <Image source={{ uri: userAvatarUrl }} style={[styles.avatarImage, { backgroundColor: colors.card }]} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <User color={colors.primary} size={18} strokeWidth={2.5} />
              </View>
            )}
          </View>

          <View style={styles.flexOne}>
            <AppText type="regular" numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.greetingMicro, { color: colors.textSecondary }]}>
              Shalom!
            </AppText>
            <AppText type="bold" numberOfLines={1} ellipsizeMode="tail" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.profileName, { color: colors.text }]}>
              {userDisplayName}
            </AppText>
          </View>
        </Pressable>

        <Pressable style={[styles.subscribeBtn, { backgroundColor: colors.border }]} onPress={() => navigation.navigate('Notifications')} accessibilityRole="button" accessibilityLabel={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}>
          <Bell color={colors.textSecondary} size={21} strokeWidth={2.5} style={styles.bellIconSpacing} />
          {unreadCount > 0 && (
            <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]}>
              <AppText maxFontSizeMultiplier={1.1} style={[styles.notificationBadgeText, { color: colors.onPrimary }]}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 }]}>
        <View style={[styles.heroWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroImageContainer}>
            <Image
              source={imageError ? episodeBg : latestDevotional.image}
              style={[styles.heroImage, !imageLoaded && styles.imageHidden]}
              resizeMode="cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
            />
            {!imageLoaded && (
              <View style={[styles.heroImagePlaceholder, { backgroundColor: colors.border }]}>
                <AppText type="regular" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.placeholderText, { color: colors.textSecondary }]}>
                  Loading artwork...
                </AppText>
              </View>
            )}
          </View>

          <View style={styles.heroPane}>
            <View style={styles.rowCenter}>
              <Calendar color={colors.textSecondary} size={14} style={styles.calendarIconSpacing} />
              <AppText type="semiBold" numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.metaText, { color: colors.textSecondary }]}>
                {devotionalStatus === 'ready' ? latestDevotional.date : ' '}
              </AppText>
            </View>
            <AppText type="bold" numberOfLines={2} ellipsizeMode="tail" maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.episodeText, { color: colors.text }]}>
              {heroTitleText}
            </AppText>

            <View style={[styles.rowCenter, styles.actionRow]}>
              <Pressable
                style={[styles.listenBtn, { backgroundColor: colors.border, opacity: devotionalStatus === 'ready' ? 1 : 0.5 }]}
                onPress={devotionalStatus === 'error' ? fetchLatestDevotional : handleListenNow}
                disabled={devotionalStatus === 'loading' || devotionalStatus === 'empty'}
                accessibilityRole="button"
                accessibilityLabel={devotionalStatus === 'error' ? 'Retry loading episode' : 'Listen to episode'}
                accessibilityState={{ disabled: devotionalStatus === 'loading' || devotionalStatus === 'empty' }}
              >
                <Play color={colors.text} size={16} fill={colors.text} style={styles.playIconSpacing} />
                <AppText type="semiBold" numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.listenText, { color: colors.text }]}>
                  {devotionalStatus === 'error' ? 'Retry' : 'Listen Now'}
                </AppText>
              </Pressable>

              <Pressable
                style={[styles.readBtn, { backgroundColor: colors.primary, opacity: devotionalStatus === 'ready' ? 1 : 0.5 }]}
                onPress={handleDevotionalNavigation}
                disabled={devotionalStatus !== 'ready'}
                accessibilityRole="button"
                accessibilityLabel="Read episode text"
                accessibilityState={{ disabled: devotionalStatus !== 'ready' }}
              >
                <BookText color={colors.onPrimary} size={16} style={styles.bookIconSpacing} />
                <AppText type="semiBold" numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.readText, { color: colors.onPrimary }]}>
                  Read Text
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <AppText type="bold" numberOfLines={1} maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Explore Archive
          </AppText>
          <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
        </View>

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
          <PastTabContent onSelectEpisode={(item) => { navigation.navigate('Devotional', { episodeId: item.id.toString(), title: item.title, date: item.date }); }} />
        ) : activeTab === 'Related' ? (
          <RelatedTabContent onSelectEpisode={(item) => { navigation.navigate('Devotional', { episodeId: item.id.toString(), title: item.title, date: item.date, related: item.related }); }} />
        ) : activeTab === 'Search' ? (
          <SearchScreen onSelectEpisode={(item) => { navigation.navigate('Devotional', { episodeId: item.id.toString(), title: item.title, date: item.date }); }} />
        ) : (
          <FallbackTabContent tabName={activeTab} />
        )}

        <View style={[styles.youtubeWrapper, { borderColor: colors.border }]}>
          <YoutubePlayer
            height={Platform.OS === 'android' ? ((width - 32) * 9) / 16 + 40 : ((width - 32) * 9) / 16}
            width={width - 32}
            videoId={featuredVideoId}
          />
          <View style={[styles.liveBadge, { backgroundColor: colors.primary }]}>
            <AppText type="bold" maxFontSizeMultiplier={1.1} style={[styles.liveBadgeText, { color: colors.onPrimary }]}>LATEST</AppText>
          </View>
          <View style={[styles.heroPane, styles.youtubeTextPane]}>
            <AppText type="bold" numberOfLines={2} maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: colors.text, fontSize: 16 }}>
              The Commonwealth Digital Church
            </AppText>
            <AppText type="regular" numberOfLines={3} maxFontSizeMultiplier={MAX_FONT_SCALE} style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
              Worship with us from anywhere. Join all our services on Youtube.
            </AppText>
          </View>
        </View>

        <TestimonySlider data={testimonyData} />
        <MachairaGallery />
      </ScrollView>

      {isGuest ? (
        <GuestProfileModalSheet visible={profileVisible} onClose={() => setProfileVisible(false)} onTriggerLogin={onTriggerLogin} onNavigateToSupport={handleSupportNavigation} onNavigateToMenuOption={onNavigateToMenuOption} />
      ) : (
        <LoggedInProfileModalSheet visible={profileVisible} onClose={() => setProfileVisible(false)} user={user} onLogout={onLogout} onChangeAccount={onChangeAccount} onDeleteAccount={onDeleteAccount} onNavigateToSupport={handleSupportNavigation} onNavigateToMenuOption={onNavigateToMenuOption} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', width: '100%', gap: 10 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, marginBottom: 20 },
  profileTarget: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 16, minWidth: 0 },
  avatarAnchorContainer: { position: 'relative', width: 38, height: 38, flexShrink: 0 },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  greetingMicro: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  profileName: { fontSize: 15, marginTop: -1 },
  subscribeBtn: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 20, position: 'relative', flexShrink: 0 },
  heroWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 28, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16 }, android: { elevation: 3 } }) },
  heroImageContainer: { width: '100%', height: 175, position: 'relative' },
  heroImage: { width: '100%', height: 175 },
  imageHidden: { opacity: 0 },
  heroImagePlaceholder: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 13 },
  heroPane: { paddingHorizontal: 16, paddingVertical: 14, alignItems: 'flex-start', width: '100%' },
  youtubeTextPane: { marginTop: Platform.OS === 'android' ? 14 : 8 },
  metaText: { fontSize: Platform.OS === 'android' ? 12 : 13 },
  episodeText: { fontSize: Platform.OS === 'android' ? 15 : 17, lineHeight: Platform.OS === 'android' ? 21 : 23, marginVertical: 8, includeFontPadding: false, width: '100%' },
  listenBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  readBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  listenText: { fontSize: Platform.OS === 'android' ? 13 : 14, includeFontPadding: false },
  readText: { fontSize: Platform.OS === 'android' ? 13 : 14, includeFontPadding: false },
  sectionHeader: { marginTop: 22, marginBottom: 16, gap: 4 },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8, paddingLeft: 2 },
  sectionDivider: { height: 1, width: '30%', marginLeft: 2, opacity: 0.7 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 20, paddingHorizontal: 4 },
  tabItemButton: { paddingVertical: 8, flex: 1, alignItems: 'center', borderBottomWidth: 2, minWidth: 0 },
  tabInactive: { backgroundColor: 'transparent', borderBottomColor: 'transparent' },
  tabActive: { backgroundColor: 'transparent' },
  tabLabelText: { fontSize: 13, letterSpacing: -0.1, marginLeft: 5 },
  tabLabelActive: {},
  fallbackContainer: { borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 10 },
  fallbackText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  bellIconSpacing: { marginRight: 5 },
  calendarIconSpacing: { marginRight: 6 },
  playIconSpacing: { marginRight: 6 },
  bookIconSpacing: { marginRight: 6 },
  youtubeWrapper: { width: '100%', alignSelf: 'stretch', marginBottom: 20, marginTop: 60, backgroundColor: 'transparent', paddingHorizontal: 0, borderTopWidth: 1, borderBottomWidth: 1 },
  liveBadge: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  liveBadgeText: { fontSize: 10 },
  notificationBadge: { position: 'absolute', top: 4, right: 4, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationBadgeText: { fontSize: 10, fontWeight: '700' },
});
