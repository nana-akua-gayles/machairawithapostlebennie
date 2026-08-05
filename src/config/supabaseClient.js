import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// DEBUG LOG: See if the values are actually present
console.log("DEBUG ENV URL:", process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log("DEBUG ENV KEY:", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("CRITICAL: Supabase environment variables are not loaded!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    detectSessionInUrl: false,
  },
});