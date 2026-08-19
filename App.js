import "react-native-url-polyfill/auto";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Image, StyleSheet, StatusBar, Platform, Pressable, Alert, Animated, Easing } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { Home, Book, FolderHeart, LayoutGrid } from "lucide-react-native";
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_900Black } from "@expo-google-fonts/montserrat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from "./src/config/supabaseClient";
import { AppText } from "./src/components/AppText";
import { OnboardingScreen } from "./src/features/onboarding/OnboardingScreen";
import AIChatScreen from "./src/features/machairaAi/chatScreen";
import HomeScreen from "./src/features/home/HomeScreenContent";
import NotificationsScreen from "./src/features/home/NotificationsScreen";
import { SavedScreen } from './src/features/home/homeArchive/SavedTabContent';
import { SearchScreen } from './src/features/home/homeArchive/SearchScreen';
import Devotional from "./src/features/home/DevotionalScreen";
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
import { AudioScreen } from "./src/features/Library/Audio";
import { ArticleDetailsScreen } from "./src/features/Library/ArticleDetailsScreen";
import { PartnerScreen } from "./src/features/more/partner";
import { PartnershipScreen } from "./src/features/more/PartnershipScreen";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import machairabot from "./assets/images/machairabot.png";
import * as Linking from "expo-linking";
import { executeGoogleSignIn } from "./src/features/onboarding/googleAuth";
import * as WebBrowser from "expo-web-browser";

SplashScreen.preventAutoHideAsync().catch(() => {});
WebBrowser.maybeCompleteAuthSession();
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
  const activeUserContext = useMemo(() => user, [user]);
  const tabIconColor = isDark ? "#ffffff" : colors.primary;
  const tabIconInactiveColor = isDark ? "#ffffff" : colors.tabBarInactive;

  const renderIcon = useCallback((IconComponent, focused, color) => (
    <View style={styles.iconContainer}>
      <IconComponent color={color} size={20} strokeWidth={focused ? 2 : 1.5} />
      {focused && <View style={[styles.minimalDot, { backgroundColor: colors.primary }]} />}
    </View>
  ), [colors]);

  const handleMenuOption = useCallback((targetId) => {
    setProfileVisible(false);
    if (targetId === "notes" || targetId === "Saved") navigation.navigate("MyNotes");
    else if (targetId === "support") navigation.navigate("SupportFeedback");
  }, [navigation]);

  const handleSupportNavigation = useCallback(() => navigation.navigate("SupportFeedback"), [navigation]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, []);

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
          <MemoizedHomeScreen {...props} user={activeUserContext} profileVisible={profileVisible} setProfileVisible={setProfileVisible} onLogout={onLogout} onTriggerLogin={onTriggerLogin} onChangeAccount={onChangeAccount} onDeleteAccount={onDeleteAccount} onNavigateToSupport={handleSupportNavigation} onNavigateToMenuOption={handleMenuOption} />
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
            const aiIconColor = isFocused ? "#fff" : (isDark ? "#ffffff" : colors.primary);
            return (
              <Pressable {...props}>
                <Animated.View style={[styles.aiIconAnchor, { transform: [{ scale: pulseAnim }], backgroundColor: isFocused ? colors.primary : (isDark ? "#262626" : "#fef2f2") }]}>
                  <Image source={machairabot} style={[styles.aiNavImage, { tintColor: aiIconColor }]} />
                  <AppText type="bold" style={[styles.aiButtonLabel, { color: aiIconColor }]}>A I</AppText>
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
  const navTheme = { ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme.colors : DefaultTheme.colors), background: colors.background, card: colors.background, text: colors.text } };
  return <NavigationContainer theme={navTheme}>{children}</NavigationContainer>;
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

  const writeProfileDiskCache = async (profileObj) => {
    try {
      if (profileObj) await AsyncStorage.setItem(DISK_USER_CACHE_KEY, JSON.stringify(profileObj));
    } catch (err) {
      console.warn("Disk writing write validation fault:", err);
    }
  };

  const mapSupabaseUserToState = useCallback((user) => {
    const profileModel = {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User Account",
      email: user.email,
      photo: user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      isLoggedOut: false,
    };
    setAuthenticatedUser(profileModel);
    writeProfileDiskCache(profileModel);
  }, []);

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
      // Calls the delete-account Edge Function, which verifies the
      // caller's own auth token server-side and deletes the user via
      // the Supabase admin API — the DB cascade (see the migration)
      // then cleans up profiles/streaks/saved_episodes/notes.
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw new Error(error.message);
      await AsyncStorage.removeItem(DISK_USER_CACHE_KEY);
      setAuthenticatedUser(null);
      await handleGlobalLogout();
      setHasCompletedOnboarding(false);
      Alert.alert("Success", "Your profile has been permanently removed.");
    } catch (e) {
      console.warn("Error running account deletion flow:", e);
      Alert.alert("Deletion Failed", `Server rejected data teardown request: ${e.message}`);
    }
  }, [authenticatedUser, handleGlobalLogout]);

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
    const result = await executeGoogleSignIn({ forceAccountPicker: true });
    if (result?.error && result.error !== "Sign-in window dismissed by user.") Alert.alert("Authentication Failure", result.error);
  }, []);

  useEffect(() => {
    let authSubscription;
    async function prepareApplication() {
      try {
        const cachedPayload = await AsyncStorage.getItem(DISK_USER_CACHE_KEY);
        if (cachedPayload) setAuthenticatedUser(JSON.parse(cachedPayload));

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          mapSupabaseUserToState(session.user);
          setHasCompletedOnboarding(true);
        } else if (cachedPayload) {
          setHasCompletedOnboarding(true);
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
        setAppIsReady(true);
      }
    }
    prepareApplication();
    return () => { if (authSubscription) authSubscription.unsubscribe(); };
  }, [mapSupabaseUserToState]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) await SplashScreen.hideAsync();
  }, [appIsReady, fontsLoaded]);

  const handleExploreAsGuest = useCallback(() => {
    setAuthenticatedUser(null);
    setHasCompletedOnboarding(true);
  }, []);

  const handleAuthSuccess = useCallback((data) => {
    if (data?.user) {
      mapSupabaseUserToState(data.user);
      setHasCompletedOnboarding(true);
    }
  }, [mapSupabaseUserToState]);

  if (!appIsReady || !fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <View style={styles.flexOne} onLayout={onLayoutRootView}>
          <ThemeProvider>
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
                    <Stack.Screen name="Audio" component={AudioScreen} />
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
                  </React.Fragment>
                )}
              </Stack.Navigator>
            </ThemeAwareNavigation>
          </ThemeProvider>
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  navLabel: { fontSize: 10, marginTop: 4, textAlign: "center", fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  aiCenter: { flex: 1, paddingHorizontal: 16, justifyContent: "center", backgroundColor: "#f8fafc" },
  fallbackContainer: { backgroundColor: "#ffffff", borderRadius: 16, padding: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#f1f5f9" },
  fallbackText: { color: "#64748b", fontSize: 14, marginTop: 8 },
  aiLogo: { width: 64, height: 64, marginBottom: 12 },
  footer: { flexDirection: "row", backgroundColor: "#ffffff", borderTopWidth: 1, borderTopColor: "#f1f5f9", position: "absolute", bottom: 0, left: 0, right: 0, overflow: "visible", ...Platform.select({ ios: { shadowColor: "#0f172a", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.03, shadowRadius: 10 }, android: { elevation: 8 } }) },
  iconContainer: { alignItems: "center", justifyContent: "center", position: "relative" },
  minimalDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: -6 },
  navButtonAI: { justifyContent: "flex-start", alignItems: "center" },
  navButtonAIFocused: { transform: [{ scale: 1.05 }] },
  aiIconAnchor: { width: 64, height: 54, borderRadius: 29, alignItems: "center", justifyContent: "center", borderColor: "#fff", ...Platform.select({ ios: { shadowColor: "#ef4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 4 } }) },
  aiIconAnchorFocused: { borderWidth: 1 },
  aiNavImage: { width: 22, height: 22, marginBottom: 2 },
  aiButtonLabel: { fontSize: 9, letterSpacing: -0.2, textAlign: "center", fontWeight: "900" },
});
