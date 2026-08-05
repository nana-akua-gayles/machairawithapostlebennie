import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../config/supabaseClient';

const redirectTo = 'machaira://';

  export const executeGoogleSignIn = async ({ forceAccountPicker = false } = {}) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          ...(forceAccountPicker && {
            queryParams: { prompt: 'select_account' },
          }),
        },
      });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No auth URL returned from Supabase.' };
    }

    // Open the OAuth URL in an in-app browser session and wait for the redirect
    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (authResult.type === 'success' && authResult.url) {
       const hashIndex = authResult.url.indexOf('#');
  const paramsString = hashIndex >= 0 ? authResult.url.substring(hashIndex + 1) : '';
  const params = new URLSearchParams(paramsString);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (sessionError) {
          return { success: false, error: sessionError.message };
        }
        return { success: true, data: sessionData.user };
      }
      return { success: false, error: 'No tokens found in redirect URL.' };
    }

    if (authResult.type === 'dismiss' || authResult.type === 'cancel') {
      return { success: false, error: 'Sign-in window dismissed by user.' };
    }

    return { success: false, error: 'Google sign-in did not complete.' };
  } catch (err) {
    return { success: false, error: err.message || 'Unexpected error during Google sign-in.' };
  }
};