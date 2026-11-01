export const isVideoTemplate = template => template?.resource_type === 'video' ||
  Boolean(template?.video_url || template?.hls_url);

export function getVideoId(template) {
  const id = String(template?.id || template?._id || '');
  return /^[a-f0-9]{24}$/i.test(id) ? id : null;
}

export function getMp4Url(template) {
  if (template?.source_mp4_url) return template.source_mp4_url;
  if (['pending', 'processing', 'failed'].includes(template?.hls_status)) return null;
  const url = template?.video_url || null;
  return url && !/\.m3u8(?:[?#]|$)/i.test(url) ? url : null;
}

export function getPosterUrl(template) {
  if (template && Object.prototype.hasOwnProperty.call(template, 'poster_url')) return template.poster_url || null;
  return template?.poster_url ||
    (template?.image_url && template.image_url !== template.video_url ? template.image_url : null);
}

export function getPlaybackSource(template, useHls = true) {
  if (useHls && template?.hls_url && template?.hls_status === 'ready') {
    return { uri: template.hls_url, type: 'm3u8' };
  }
  const uri = getMp4Url(template) || template?.video_url;
  return uri && !/\.m3u8(?:[?#]|$)/i.test(uri) ? { uri } : null;
}
