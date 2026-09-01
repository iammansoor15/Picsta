import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Single source of truth for the auth token.
 *
 * History: the token has been stored under two different keys. The OTP login wrote
 * only 'authToken', while older screens read only 'AUTH_TOKEN'. Those screens therefore
 * saw a signed-in user as logged out. Write with setToken() and read with getToken()
 * so that can't happen again.
 */

// Read order. 'authToken' is current; 'AUTH_TOKEN' is legacy, kept so that existing
// installs stay signed in and any not-yet-migrated reader keeps working.
export const TOKEN_KEYS = ['authToken', 'AUTH_TOKEN'];
export const USER_KEYS = ['user', 'AUTH_USER'];

/** Get the auth token from whichever key holds it. */
export async function getToken() {
  for (const key of TOKEN_KEYS) {
    try {
      const token = await AsyncStorage.getItem(key);
      if (token) return token;
    } catch (e) {
      console.warn(`[authToken] failed reading '${key}':`, e?.message || e);
    }
  }
  return null;
}

/** True if a token is stored under any known key. */
export async function isLoggedIn() {
  return !!(await getToken());
}

/**
 * Persist the token under EVERY known key, and clear GUEST_MODE.
 * Writing all keys keeps legacy readers working; clearing GUEST_MODE stops the
 * download/share gates from treating a signed-in user as a guest (nothing else
 * in the app ever cleared that flag).
 */
export async function setToken(token, user) {
  if (!token) {
    console.warn('[authToken] setToken called with no token - ignoring');
    return;
  }
  for (const key of TOKEN_KEYS) {
    await AsyncStorage.setItem(key, token);
  }
  if (user !== undefined && user !== null) {
    const serialised = typeof user === 'string' ? user : JSON.stringify(user);
    for (const key of USER_KEYS) {
      await AsyncStorage.setItem(key, serialised);
    }
  }
  // A user who once tapped "Skip" keeps GUEST_MODE='true' forever otherwise.
  await AsyncStorage.removeItem('GUEST_MODE');
  console.log(`[authToken] stored token under [${TOKEN_KEYS.join(', ')}] and cleared GUEST_MODE`);
}

/** Remove every token/user key and the guest flag. */
export async function clearToken() {
  const keys = [...TOKEN_KEYS, ...USER_KEYS, 'tempAuthToken', 'GUEST_MODE'];
  await AsyncStorage.multiRemove(keys);
  console.log(`[authToken] cleared [${keys.join(', ')}]`);
}

export default { TOKEN_KEYS, USER_KEYS, getToken, isLoggedIn, setToken, clearToken };
