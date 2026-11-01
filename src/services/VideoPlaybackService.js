import AppConfig from '../config/AppConfig';
import { getVideoId } from '../utils/videoPlayback';

export async function refreshVideoPlayback(template) {
  const id = getVideoId(template);
  if (!id) return template;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(AppConfig.BASE_URL + '/api/videos/' + id + '/playback', {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    // Allow the app to run against the previous backend during rollout.
    if (response.status === 404) return template;
    if (!response.ok) throw new Error('Unable to refresh video playback.');
    const data = await response.json();
    if (!data.success || !data.data?.template) throw new Error('Video is unavailable.');
    return { ...template, ...data.data.template };
  } finally {
    clearTimeout(timer);
  }
}
