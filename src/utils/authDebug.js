import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Auth diagnostics.
 *
 * Filter for these in logcat with:   adb logcat *:S ReactNativeJS:V | grep AUTH-DEBUG
 * (or just search the Metro console for AUTH-DEBUG)
 *
 * Tokens are NEVER printed in full - only a short prefix plus length, which is
 * enough to tell "missing" from "present" from "different value".
 */

const TAG = '[AUTH-DEBUG]';

// Every key the app has ever used to store a token, in the order consumers check them.
const TOKEN_KEYS = ['authToken', 'AUTH_TOKEN'];
const USER_KEYS = ['user', 'AUTH_USER'];

const preview = (v) => {
  if (v === null || v === undefined) return '❌ MISSING';
  const s = String(v);
  if (!s.length) return '❌ EMPTY STRING';
  return `✅ ${s.slice(0, 10)}…(len ${s.length})`;
};

/**
 * Dump the complete stored auth state.
 * @param {string} where - label for the call site, e.g. 'download:HeroScreen'
 * @returns {Promise<object>} the raw values, so callers can assert on them
 */
export async function logAuthState(where) {
  try {
    const [authToken, AUTH_TOKEN, guestMode, user, AUTH_USER, subActive, subExpiry] =
      await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('AUTH_TOKEN'),
        AsyncStorage.getItem('GUEST_MODE'),
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('AUTH_USER'),
        AsyncStorage.getItem('subscriptionActive'),
        AsyncStorage.getItem('subscriptionExpiry'),
      ]);

    const anyToken = authToken || AUTH_TOKEN;

    console.log(`${TAG} ══════════ ${where} ══════════`);
    console.log(`${TAG}   authToken          :`, preview(authToken));
    console.log(`${TAG}   AUTH_TOKEN (legacy):`, preview(AUTH_TOKEN));
    console.log(`${TAG}   GUEST_MODE         :`, guestMode === null ? 'not set' : guestMode);
    console.log(`${TAG}   user               :`, user ? '✅ present' : '❌ MISSING');
    console.log(`${TAG}   AUTH_USER          :`, AUTH_USER ? '✅ present' : '❌ MISSING');
    console.log(`${TAG}   subscriptionActive :`, subActive === null ? 'not set' : subActive);
    console.log(`${TAG}   subscriptionExpiry :`, subExpiry || 'not set');

    // The two mismatches that actually break things, called out explicitly.
    if (authToken && !AUTH_TOKEN) {
      console.warn(
        `${TAG}   ⚠️  MISMATCH: 'authToken' is set but legacy 'AUTH_TOKEN' is not. ` +
        `Any screen reading ONLY 'AUTH_TOKEN' (ProfileHome.jsx, Header.jsx) will treat ` +
        `you as logged OUT and bounce you to the login screen.`,
      );
    }
    if (guestMode === 'true' && anyToken) {
      console.warn(
        `${TAG}   ⚠️  MISMATCH: GUEST_MODE is 'true' but a token exists. ` +
        `Download/share gates check GUEST_MODE only, so they will demand sign-in.`,
      );
    }
    console.log(`${TAG}   VERDICT            :`, anyToken ? 'has a token' : 'NO TOKEN ANYWHERE');
    console.log(`${TAG} ${'═'.repeat(20 + where.length)}`);

    return { authToken, AUTH_TOKEN, guestMode, user, AUTH_USER, anyToken };
  } catch (e) {
    console.error(`${TAG} failed to read auth state at ${where}:`, e?.message || e);
    return {};
  }
}

/**
 * Log a gate decision - whether an action was allowed through or blocked.
 * @param {string} where  - label for the gate, e.g. 'download:HeroScreen'
 * @param {boolean} blocked
 * @param {string} reason
 */
export function logGateDecision(where, blocked, reason) {
  if (blocked) {
    console.warn(`${TAG} 🚫 BLOCKED at ${where} — reason: ${reason}`);
  } else {
    console.log(`${TAG} ✅ ALLOWED at ${where} — ${reason}`);
  }
}

/**
 * Log every key AsyncStorage holds. Use when a value seems to vanish and you
 * need to see what is actually on disk.
 */
export async function logAllStorageKeys(where) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log(`${TAG} all AsyncStorage keys at ${where} (${keys.length}):`, keys.join(', '));
    return keys;
  } catch (e) {
    console.error(`${TAG} failed to list keys at ${where}:`, e?.message || e);
    return [];
  }
}

/**
 * The token lookup every consumer SHOULD use - checks all known keys.
 * Logs which key actually produced the value.
 */
export async function getTokenAnyKey(where = 'unknown') {
  for (const key of TOKEN_KEYS) {
    const token = await AsyncStorage.getItem(key);
    if (token) {
      console.log(`${TAG} token found under '${key}' at ${where}`);
      return token;
    }
  }
  console.warn(`${TAG} NO token under any of [${TOKEN_KEYS.join(', ')}] at ${where}`);
  return null;
}

export default { logAuthState, logGateDecision, logAllStorageKeys, getTokenAnyKey };
