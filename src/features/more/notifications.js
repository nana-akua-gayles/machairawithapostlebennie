import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabaseClient';


const STORAGE_KEY = 'notificationsEnabled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function getSavedNotificationPreference() {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === 'true';
  } catch (e) {
    console.warn('Failed to read notification preference', e);
    return false;
  }
}

export async function getOsPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function enableNotifications() {
  if (!Device.isDevice) {
    return { enabled: false, token: null, error: 'Push notifications require a physical device.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    await AsyncStorage.setItem(STORAGE_KEY, 'false');
    return { enabled: false, token: null, error: 'Permission not granted.' };
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return { enabled: false, token: null, error: 'Missing extra.eas.projectId in app.json.' };
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error: dbError } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token, platform: Platform.OS, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,token' }
        );

      if (dbError) {
        return { enabled: false, token: null, error: dbError.message };
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    return { enabled: true, token, error: null };
  } catch (e) {
    return { enabled: false, token: null, error: e.message };
  }
}

export async function disableNotifications() {
  await AsyncStorage.setItem(STORAGE_KEY, 'false');
  return { enabled: false };
}