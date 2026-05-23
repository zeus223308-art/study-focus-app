/** Runs on web OAuth popup before React loads — closes popup and returns token to opener. */
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined' && window.opener) {
  try {
    WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
  } catch {
    // Popup may already be closing via inline HTML script.
  }
}
