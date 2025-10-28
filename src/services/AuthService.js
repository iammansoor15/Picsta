import AppConfig from '../config/AppConfig';
import backgroundRemovalService from './BackgroundRemovalService';

// Resolve the base URL for auth requests.
// Use the same server base the rest of the app uses (single source of truth),
// then fall back to any explicitly configured auth URL, then production.
const base = () => {
  // 1) Prefer unified base used by BackgroundRemovalService (respects ServerConfig UI and env)
  const unified = backgroundRemovalService.getServerConfig()?.baseUrl;
  if (unified) return String(unified).replace(/\/$/, '');

  // 2) Fallback to explicit dev auth URL if provided (e.g., separate port in dev)
  const devAuth = AppConfig?.DEVELOPMENT?.DEV_AUTH_SERVER_URL;
  if (devAuth) return String(devAuth).replace(/\/$/, '');

  // 3) Fallback to explicit production auth URL or main production server URL
  const prodAuth = AppConfig?.PRODUCTION_AUTH_SERVER_URL || AppConfig?.PRODUCTION_SERVER_URL;
  if (prodAuth) return String(prodAuth).replace(/\/$/, '');

  // 4) Last resort - localhost default (useful for adb reverse or iOS sim)
  return 'http://localhost:10000';
};

const jsonHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
};

const handle = async (resp) => {
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json?.error || `Request failed: ${resp.status}`);
  }
  return json?.data || json;
};

// Small fetch timeout helper to avoid indefinite hangs on unreachable servers
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { signal: _ignored, ...rest } = options || {};
    const resp = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(timeoutId);
    return resp;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Request timeout - auth server not reachable');
    }
    throw err;
  }
}

export default {
  async register({ name, email, phone, password }) {
    const body = JSON.stringify({ name, email, phone, password });
    const authBase = base();
    console.log('AuthService.register: sending request', { hasName: Boolean(name), hasEmail: Boolean(email), hasPhone: Boolean(phone) });
    console.log('AuthService.register: base', authBase);
    const resp = await fetchWithTimeout(`${authBase}/api/auth/register`, { method: 'POST', headers: jsonHeaders, body }, 15000);
    console.log('AuthService.register: response status', resp.status);
    const data = await handle(resp);
    console.log('AuthService.register: success');
    return data;
  },
  async login({ identifier, email, phone, password }) {
    const body = JSON.stringify({ identifier, email, phone, password });
    const authBase = base();
    console.log('AuthService.login: sending request', { hasIdentifier: Boolean(identifier), hasEmail: Boolean(email), hasPhone: Boolean(phone) });
    console.log('AuthService.login: base', authBase);
    const resp = await fetchWithTimeout(`${authBase}/api/auth/login`, { method: 'POST', headers: jsonHeaders, body }, 15000);
    console.log('AuthService.login: response status', resp.status);
    const data = await handle(resp);
    console.log('AuthService.login: success');
    return data;
  },
  async me(token) {
    const authBase = base();
    console.log('AuthService.me: verifying token', { tokenLength: token ? String(token).length : 0, base: authBase });
    const resp = await fetchWithTimeout(`${authBase}/api/auth/me`, { method: 'GET', headers: { ...jsonHeaders, Authorization: `Bearer ${token}` } }, 15000);
    console.log('AuthService.me: response status', resp.status);
    const data = await handle(resp);
    console.log('AuthService.me: success');
    return data;
  }
};
