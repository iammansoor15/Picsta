import AppConfig from '../config/AppConfig';

class ImageMetadataService {
  constructor() {
    this.candidates = [AppConfig.BASE_URL];
    this.base = null; // will be picked by ensureBaseReady()
    this.probeTimeoutMs = 5000;
  }

  async testHost(host) {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), this.probeTimeoutMs);
    try {
      console.log('[ImageMetadataService] Probing host:', host);
      const res = await fetch(`${host}/api/templates/health`, { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
      console.log('[ImageMetadataService] Probe result:', host, res.ok);
      return res.ok;
    } catch (e) {
      console.warn('[ImageMetadataService] Probe failed:', host, e?.message || e);
      return false;
    } finally {
      clearTimeout(to);
    }
  }

  async ensureBaseReady() {
    if (this.base) return this.base;
    for (const host of this.candidates) {
      const ok = await this.testHost(host);
      if (ok) {
        this.base = host;
        console.log('[ImageMetadataService] Selected base:', this.base);
        return this.base;
      }
    }
    this.base = AppConfig.BASE_URL;
    console.warn('[ImageMetadataService] Falling back to base:', this.base);
    return this.base;
  }

  async saveImageMetadata({ image_url, category, photo_cont_pos, text_cont_pos }) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const base = await this.ensureBaseReady();
      const res = await fetch(`${base}/api/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url, category, photo_cont_pos, text_cont_pos }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`HTTP ${res.status}: ${err}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save image metadata');
      }
      return data;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
  async getLatestImage(params = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const base = await this.ensureBaseReady();
      const url = new URL(`${base}/api/images/latest`);
      if (params.category) url.searchParams.set('category', params.category);
      const res = await fetch(url.toString(), { method: 'GET', signal: controller.signal, headers: { 'Cache-Control': 'no-store' } });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch latest image');
      return data.data?.image || null;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }
}

export default new ImageMetadataService();
