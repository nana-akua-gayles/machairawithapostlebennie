import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../../config/supabaseClient';

export async function executeAppleSignIn() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'Apple did not return an identity token.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch (err) {
    if (err.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, error: 'Sign-in window dismissed by user.' };
    }
    return { success: false, error: err.message || 'Apple sign-in failed.' };
  }
}
