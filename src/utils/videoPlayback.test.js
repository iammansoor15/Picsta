import { getMp4Url, getPlaybackSource, getPosterUrl, getVideoId } from './videoPlayback';
const asset = { id: '6a95ddcc6d547db8aa3fecbf', hls_status: 'ready',
  hls_url: 'https://example.test/master.m3u8', source_mp4_url: 'https://example.test/source.mp4', poster_url: 'https://example.test/poster.jpg' };
it('selects HLS when ready and MP4 when disabled or processing', () => {
  expect(getPlaybackSource(asset)).toEqual({ uri: asset.hls_url, type: 'm3u8' });
  expect(getPlaybackSource(asset, false)).toEqual({ uri: asset.source_mp4_url });
  expect(getPlaybackSource({ ...asset, hls_status: 'processing' }).uri).toBe(asset.source_mp4_url);
});
it('keeps legacy MP4 playable and never exports a playlist as MP4', () => {
  expect(getPlaybackSource({ video_url: 'video.mp4' })).toEqual({ uri: 'video.mp4' });
  expect(getMp4Url({ video_url: 'master.m3u8?token=x' })).toBeNull();
  expect(getMp4Url({ hls_status: 'pending', video_url: 'original.webm' })).toBeNull();
});
it('recognizes stable IDs and excludes video URLs from poster images', () => {
  expect(getVideoId({ _id: asset.id })).toBe(asset.id);
  expect(getVideoId({ id: '../bad' })).toBeNull();
  expect(getPosterUrl({ image_url: 'same.mp4', video_url: 'same.mp4' })).toBeNull();
  expect(getPosterUrl(asset)).toBe(asset.poster_url);
});
