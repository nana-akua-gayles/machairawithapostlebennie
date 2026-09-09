import "react-native-url-polyfill/auto";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Image, StyleSheet, StatusBar, Platform, Pressable, Alert, Animated, Easing } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { Home, Book, FolderHeart, LayoutGrid } from "lucide-react-native";
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_900Black } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaystackProvider } from "react-native-paystack-webview";
import { supabase } from "./src/config/supabaseClient";
import { AppText } from "./src/components/AppText";
import { OnboardingScreen } from "./src/features/onboarding/OnboardingScreen";
import AIChatScreen from "./src/features/machairaAi/chatScreen";
import HomeScreen from "./src/features/home/HomeScreenContent";
import NotificationsScreen from "./src/features/home/NotificationsScreen";
import { SavedScreen } from './src/features/home/homeArchive/SavedTabContent';
import { SearchScreen } from './src/features/home/homeArchive/SearchScreen';
import StreakScreen from './src/features/home/homeArchive/StreakScreen';
import Devotional from "./src/features/home/DevotionalScreen";
import { syncDevotionals } from "./src/features/home/devotionalSync";
import { replayPendingBookmarkActions } from "./src/features/home/bookmarkSync";
import NetInfo from "@react-native-community/netinfo";
import FullAlbumScreen from "./src/features/home/fullAlbum";
import { BibleTabContent } from "./src/features/bible/BibleTabContent";
import { MoreScreen } from "./src/features/more/moreScreen";
import { LibraryScreen } from "./src/features/Library/library";
import { FeaturedArchiveScreen } from "./src/features/Library/FeaturedArchiveScreen";
import { AllArticlesScreen } from "./src/features/Library/AllArticlesScreen";
import { AllAudioScreen } from "./src/features/Library/AllAudioScreen";
import { AllStoreScreen } from "./src/features/Library/AllStoreScreen";
import { StoreItemDetailsScreen } from "./src/features/Library/Storeitemdetailsscreen";
import { SupportFeedbackScreen } from "./src/features/onboarding/profile/AccUtilities/SupportFeedbackScreen";
import MyNotesTabContent from "./src/features/onboarding/profile/AccUtilities/MyNotes";
import { ProfileDetailsScreen } from "./src/features/onboarding/profile/ProfileDetailsScreen";
import { EditProfileScreen } from "./src/features/onboarding/profile/EditProfileScreen";
import { AboutAuthorScreen } from "./src/features/more/AboutAuthor";
import FollowUsScreen from "./src/features/more/followUs";
import SettingsScreen from "./src/features/more/Settings";
import VersionScreen from "./src/features/more/Version";
import PrivacyPolicyScreen from "./src/features/more/PrivacyPolicy";
import { ContactSupportScreen } from "./src/features/more/ContactSupport";
import { CommunityScreen } from "./src/features/more/community/CommunityScreen";
import { ShortsViewerScreen } from './src/features/more/community/ShortsViewerScreen';
import { BibleTrivia } from "./src/features/more/BibleTrivia";
import WordScrambleScreen from "./src/features/more/WordScrambleScreen";
import { WordScrambleStages } from "./src/features/more/WordScrambleStages";
import { GroupDetailScreen } from './src/features/more/community/groupChat/GroupDetailScreen';
import WordSearchScreen from "./src/features/more/WordSearchScreen";
import WordSearchStages from "./src/features/more/WordSearchStages";
import { ThreadsStages } from "./src/features/more/ThreadsStages";
import { ThreadsofMachaira } from "./src/features/more/ThreadsofMachaira";
import { GameLeaderboard } from "./src/features/more/GameLeaderboard";
import { Testimony } from "./src/features/more/Testimony";
import { ArticleDetailsScreen } from "./src/features/Library/ArticleDetailsScreen";
import { PartnerScreen } from "./src/features/more/partner";
import { PartnershipScreen } from "./src/features/more/PartnershipScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AudioProvider, useAudio } from "./src/context/AudioContext";
import { MiniAudioPlayer } from "./src/features/home/MiniAudioPlayer";
import { FullDevotionalAudioScreen } from "./src/features/home/FullDevotionalAudioScreen";
import machairabot from "./assets/images/MacAi1.png";
import * as Linking from "expo-linking";
import { executeGoogleSignIn } from "./src/features/onboarding/googleAuth";
import * as WebBrowser from "expo-web-browser";

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();

export const navigationRef = createNavigationContainerRef();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();
const DISK_USER_CACHE_KEY = "@machaira_authenticated_user_cache";

const CenterScreen = React.memo(({ title }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <AppText type="bold">{title}</AppText>
    </View>
  );
});

const MemoizedMyNotes = React.memo(({ navigation }) => (
  <MyNotesTabContent onBack={() => navigation.goBack()} onNavigateToCreateNote={() => console.log("Compose notes pipeline triggered...")} />
));

const MemoizedHomeScreen = React.memo((props) => <HomeScreen {...props} />);

function BaseTabNavigator({ route, navigation, user, onLogout, onTriggerLogin, onChangeAccount, onDeleteAccount }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);
  const [userStats, setUserStats] = useState({ streakCount: 0, savedCount: 0 });
  const activeUserContext = useMemo(() => user, [user]);
  const tabIconColor = isDark ? "#ffffff" : colors.primary;
  const tabIconInactiveColor = isDark ? "#ffffff" : colors.tabBarInactive;

  useEffect(() => {
    let isMounted = true;
    async function fetchLiveStats() {
      if (!user?.id) return;
      try {
        const [profileRes, savedRes] = await Promise.all([
          supabase.from("profiles").select("current_streak").eq("id", user.id).single(),
          supabase.from("saved_devotionals").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        if (isMounted) {
          setUserStats({
            streakCount: profileRes.data?.current_streak || 0,
            savedCount: savedRes.count || 0,
          });
        }
      } catch (err) {
        console.warn("Failed to fetch live profile stats:", err);
      }
    }

    if (profileVisible) {
      fetchLiveStats();
    }
    return () => { isMounted = false; };
  }, [profileVisible, user?.id]);

  const renderIcon = useCallback((IconComponent, focused, color) => (
    <View style={styles.iconContainer}>
      <IconComponent color={color} size={20} strokeWidth={focused ? 2 : 1.5} />
      {focused && <View style={[styles.minimalDot, { backgroundColor: colors.primary }]} />}
    </View>
  ), [colors]);

  const handleMenuOption = useCallback((targetId) => {
    setProfileVisible(false);
    if (targetId === "notes") {
      navigation.navigate("MyNotes");
    } else if (targetId === "saved") {
      navigation.navigate("SavedScreen"); 
    } else if (targetId === "support") {
      navigation.navigate("SupportFeedback");
    } else if (targetId === "profile_details") {
      navigation.navigate("ProfileDetails", {
        user: activeUserContext,
      });
    } else if (targetId === "streaks") {
      navigation.navigate("streaks");
    }
  }, [navigation, activeUserContext]);

  const handleSupportNavigation = useCallback(() => navigation.navigate("SupportFeedback"), [navigation]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: tabIconColor,
        tabBarInactiveTintColor: tabIconInactiveColor,
        tabBarLabelStyle: styles.navLabel,
        tabBarStyle: [styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, height: 64 + insets.bottom, paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }],
      }}
    >
      <Tab.Screen name="Home" options={{ tabBarIcon: ({ color, focused }) => renderIcon(Home, focused, color) }}>
        {(props) => (
          <MemoizedHomeScreen 
            {...props} 
            user={activeUserContext} 
            stats={userStats}
            profileVisible={profileVisible} 
            setProfileVisible={setProfileVisible} 
            onLogout={onLogout} 
            onTriggerLogin={onTriggerLogin} 
            onChangeAccount={onChangeAccount} 
            onDeleteAccount={onDeleteAccount} 
            onNavigateToSupport={handleSupportNavigation} 
            onNavigateToMenuOption={handleMenuOption} 
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Bible" options={{ tabBarIcon: ({ color, focused }) => renderIcon(Book, focused, color) }}>
        {() => <View style={styles.flexOne}><BibleTabContent tabBarHeight={64 + insets.bottom} /></View>}
      </Tab.Screen>

      <Tab.Screen
        name="AI_Chat"
        component={AIChatScreen}
        listeners={{
          tabPress: (e) => {
            if (!activeUserContext) {
              e.preventDefault();
              Alert.alert("Sign in required", "Please sign in to use the AI assistant.", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign In", onPress: onTriggerLogin },
              ]);
            }
          },
        }}
        options={{
          tabBarButton: (props) => {
            const isFocused = props.accessibilityState?.selected;
            const labelColor = isFocused ? "#fff" : (isDark ? "#ffffff" : colors.primary);
            return (
              <Pressable {...props}>
                <Animated.View style={[styles.aiIconAnchor, { transform: [{ scale: pulseAnim }], backgroundColor: isFocused ? colors.primary : (isDark ? "#262626" : "#fef2f2") }]}>
                  <Image source={machairabot} style={styles.aiNavImage} />
                  <AppText type="bold" style={[styles.aiButtonLabel, { color: labelColor }]}>A I</AppText>
                </Animated.View>
              </Pressable>
            );
          },
        }}
      />

      <Tab.Screen name="Library" options={{ tabBarIcon: ({ color, focused }) => renderIcon(FolderHeart, focused, color) }}>
        {() => <View style={styles.flexOne}><LibraryScreen /></View>}
      </Tab.Screen>

      <Tab.Screen name="More" options={{ tabBarIcon: ({ color, focused }) => renderIcon(LayoutGrid, focused, color) }}>
        {() => <View style={styles.flexOne}><MoreScreen user={activeUserContext} onRequireAuth={onTriggerLogin} /></View>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const MemoizedBaseTabNavigator = React.memo(BaseTabNavigator);

const linking = { prefixes: ["machaira://", Linking.createURL("/")], config: { screens: { MainTabs: "auth-callback" } } };

function ThemeAwareNavigation({ children }) {
  const { isDark, colors } = useTheme();
  const { setFocusedRouteName } = useAudio();
  const navTheme = { ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: colors.background, card: colors.background, text: colors.text } };

  const updateFocusedRoute = useCallback(() => {
    const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
    setFocusedRouteName?.(currentRoute?.name);
  }, [setFocusedRouteName]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={updateFocusedRoute}
      onStateChange={updateFocusedRoute}
    >
      {children}
      <MiniAudioPlayer />
    </NavigationContainer>
  );
}

export default function App() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);

  const [fontsLoaded] = useFonts({
    "Montserrat-Regular": Montserrat_400Regular,
    "Montserrat-SemiBold": Montserrat_600SemiBold,
    "Montserrat-Bold": Montserrat_700Bold,
    "Montserrat-Black": Montserrat_900Black,
  });

  const writeProfileDiskCache = useCallback(async (profileObj) => {
    try {
      if (profileObj) await AsyncStorage.setItem(DISK_USER_CACHE_KEY, JSON.stringify(profileObj));
    } catch (err) {
      console.warn("Disk writing write validation fault:", err);
    }
  }, []);

  const mapSupabaseUserToState = useCallback((user) => {
    if (!user) return;
    const profileModel = {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User Account",
      email: user.email,
      photo: user.user_metadata?.avatar_url || null,
      isLoggedOut: false,
    };
    setAuthenticatedUser(profileModel);
    writeProfileDiskCache(profileModel);

    replayPendingBookmarkActions(user.id)
      .then(({ replayed }) => {
        if (replayed > 0) console.log(`Replayed ${replayed} queued bookmark action(s).`);
      })
      .catch((err) => console.warn("Bookmark replay failed:", err));
  }, [writeProfileDiskCache]);

  const handleGlobalLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Error signing out of Supabase:", err);
    }
    try {
      await AsyncStorage.removeItem(DISK_USER_CACHE_KEY);
    } catch (err) {
      console.warn("Error clearing disk cache on logout:", err);
    }
    setAuthenticatedUser(null);
  }, []);

  const handleAccountDeletion = useCallback(async () => {
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await AsyncStorage.removeItem(DISK_USER_CACHE_KEY);
      setAuthenticatedUser(null);
      await handleGlobalLogout();
      setHasCompletedOnboarding(false);
      Alert.alert("Success", "Your profile has been permanently removed.");
    } catch (e) {
      console.warn("Error running account deletion flow:", e);
      const reason = e?.message || "Please try again or contact support.";
      Alert.alert("Deletion Failed", `Server rejected data teardown request: ${reason}`);
    }
  }, [handleGlobalLogout]);

  const handleTriggerLogin = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        mapSupabaseUserToState(session.user);
        return { resumed: true };
      }
      const result = await executeGoogleSignIn();
      if (result?.error && result.error !== "Sign-in window dismissed by user.") Alert.alert("Authentication Failure", result.error);
      return { resumed: false, success: !!result?.success };
    } catch (e) {
      console.warn("Error resuming session:", e);
      return { resumed: false, success: false };
    }
  }, [mapSupabaseUserToState]);

  const handleSwitchToNewAccount = useCallback(async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.warn("Error clearing session before account switch:", e);
    }
    try {
      const result = await executeGoogleSignIn({ forceAccountPicker: true });
      if (result?.error && result.error !== "Sign-in window dismissed by user.") Alert.alert("Authentication Failure", result.error);
    } catch (e) {
      console.warn("Error switching account:", e);
      Alert.alert("Authentication Failure", e?.message || "Could not switch accounts. Please try again.");
    }
  }, []);

  useEffect(() => {
    let authSubscription;
    let isMounted = true;

    async function prepareApplication() {
      try {
        syncDevotionals()
          .then(({ totalSynced }) => {
            if (totalSynced > 0) console.log(`Synced ${totalSynced} devotional(s).`);
          })
          .catch((err) => console.warn("Devotional sync failed (will retry next launch):", err));

        const cachedPayload = await AsyncStorage.getItem(DISK_USER_CACHE_KEY);
        if (cachedPayload) {
          try {
            const parsedUser = JSON.parse(cachedPayload);
            if (isMounted) setAuthenticatedUser(parsedUser);
          } catch (parseErr) {
            console.warn("Disk cache was corrupted, clearing it:", parseErr);
            await AsyncStorage.removeItem(DISK_USER_CACHE_KEY).catch(() => {});
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          mapSupabaseUserToState(session.user);
          if (isMounted) setHasCompletedOnboarding(true);
        } else if (cachedPayload) {
          if (isMounted) setHasCompletedOnboarding(true);
        }

        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            mapSupabaseUserToState(session.user);
            setHasCompletedOnboarding(true);
          } else if (event === "SIGNED_OUT") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            AsyncStorage.removeItem(DISK_USER_CACHE_KEY).catch(() => {});
            setAuthenticatedUser(null);
          }
        });
        authSubscription = data?.subscription;
      } catch (e) {
        console.warn("Storage runtime initialization error:", e);
      } finally {
        if (isMounted) setAppIsReady(true);
      }
    }
    prepareApplication();
    return () => {
      isMounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, [mapSupabaseUserToState]);

  useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected && authenticatedUser?.id) {
      replayPendingBookmarkActions(authenticatedUser.id).catch((err) =>
        console.warn("Bookmark replay on reconnect failed:", err)
      );
    }
  });
  return () => unsubscribe();
}, [authenticatedUser]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) await SplashScreen.hideAsync();
  }, [appIsReady, fontsLoaded]);

  const handleExploreAsGuest = useCallback(() => {
    setAuthenticatedUser(null);
    setHasCompletedOnboarding(true);
  }, []);

  const handleAuthSuccess = useCallback((user) => {
    if (user) {
      mapSupabaseUserToState(user);
      setHasCompletedOnboarding(true);
    }
  }, [mapSupabaseUserToState]);

  if (!appIsReady || !fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaystackProvider publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY}>
          <View style={styles.flexOne} onLayout={onLayoutRootView}>
            <ThemeProvider>
              <AudioProvider>
                <ThemeAwareNavigation>
                  <StatusBar barStyle="default" />
                  <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_bottom" }}>
                    {!hasCompletedOnboarding ? (
                      <Stack.Screen name="Onboarding">
                        {(props) => (
                          <OnboardingScreen {...props} onExploreAsGuest={handleExploreAsGuest} onAuthSuccess={handleAuthSuccess} isReturningFromGuest={!!authenticatedUser?.isLoggedOut} savedUserContext={authenticatedUser || null} />
                        )}
                      </Stack.Screen>
                    ) : (
                      <React.Fragment>
                        <Stack.Screen name="MainTabs">
                          {(props) => (
                            <MemoizedBaseTabNavigator {...props} user={authenticatedUser} onLogout={handleGlobalLogout} onTriggerLogin={handleTriggerLogin} onChangeAccount={handleSwitchToNewAccount} onDeleteAccount={handleAccountDeletion} />
                          )}
                        </Stack.Screen>
                        <Stack.Screen name="SupportFeedback" component={SupportFeedbackScreen} />
                        <Stack.Screen name="MyNotes" component={MemoizedMyNotes} />
                        <Stack.Screen name="Testimony" component={Testimony} />
                        <Stack.Screen name="AboutAuthor" component={AboutAuthorScreen} />
                        <Stack.Screen name="SavedScreen">{(props) => <SavedScreen {...props} user={authenticatedUser} />}</Stack.Screen>
                        <Stack.Screen name="SearchScreen" component={SearchScreen} />
                        <Stack.Screen name="FollowUs" component={FollowUsScreen} />
                        <Stack.Screen name="Devotional" component={Devotional} />
                        <Stack.Screen name="Settings" component={SettingsScreen} />
                        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="Version" component={VersionScreen} />
                        <Stack.Screen name="ContactSupport" component={ContactSupportScreen} />
                        <Stack.Screen name="ArticleDetails" component={ArticleDetailsScreen} />
                        <Stack.Screen name="Partner" component={PartnerScreen} />
                        <Stack.Screen name="PartnershipScreen" component={PartnershipScreen} />
                        <Stack.Screen name="Community" component={CommunityScreen} />
                        <Stack.Screen name="BibleTrivia" component={BibleTrivia} />
                        <Stack.Screen name="GameLeaderboard" component={GameLeaderboard} />
                        <Stack.Screen name="WordScrambleScreen" component={WordScrambleScreen} />
                        <Stack.Screen name="WordScrambleStages" component={WordScrambleStages} />
                        <Stack.Screen name="WordSearchScreen" component={WordSearchScreen} />
                        <Stack.Screen name="WordSearchStages" component={WordSearchStages} />
                        <Stack.Screen name="ThreadsStages" component={ThreadsStages} />
                        <Stack.Screen name="ThreadsofMachaira" component={ThreadsofMachaira} />
                        <Stack.Screen name="ShortsViewerScreen" component={ShortsViewerScreen} />
                        <Stack.Screen name="GroupDetailScreen" component={GroupDetailScreen} />
                        <Stack.Screen name="AllArticles" component={AllArticlesScreen} />
                        <Stack.Screen name="FeaturedArchive" component={FeaturedArchiveScreen} />
                        <Stack.Screen name="AllAudio" component={AllAudioScreen} />
                        <Stack.Screen name="AllStore" component={AllStoreScreen} />
                        <Stack.Screen name="StoreItemDetails" component={StoreItemDetailsScreen} />
                        <Stack.Screen name="Notifications" component={NotificationsScreen} />
                        <Stack.Screen name="fullAlbum" component={FullAlbumScreen} />
                        <Stack.Screen name="FullDevotionalAudio" component={FullDevotionalAudioScreen} />
                        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
                        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                        <Stack.Screen name="streaks" component={StreakScreen}/>
                      </React.Fragment>
                    )}
                  </Stack.Navigator>
                </ThemeAwareNavigation>
              </AudioProvider>
            </ThemeProvider>
          </View>
        </PaystackProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  navLabel: { fontSize: 10, marginTop: 4, textAlign: "center", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  footer: { flexDirection: "row", backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#f1f5f9", position: "absolute", bottom: 0, left: 0, right: 0, overflow: "visible", ...Platform.select({ ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10 }, android: { elevation: 8 } }) },
  iconContainer: { alignItems: "center", justifyContent: "center", position: "relative" },
  minimalDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: -6 },
  aiIconAnchor: { width: 64, height: 54, borderRadius: 29, alignItems: "center", justifyContent: "center", borderColor: "#fff", ...Platform.select({ ios: { shadowColor: "#ef4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 4 } }) },
  aiNavImage: { width: 32, height: 32, marginBottom: 2},
  aiButtonLabel: { fontSize: 9, letterSpacing: -0.2, textAlign: "center", fontWeight: "900" },
});