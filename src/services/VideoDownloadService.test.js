import RNFS from 'react-native-fs';
import service from './VideoDownloadService';
import { refreshVideoPlayback } from './VideoPlaybackService';
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/cache', mkdir: jest.fn(), exists: jest.fn(), stat: jest.fn(),
  downloadFile: jest.fn(), moveFile: jest.fn(), unlink: jest.fn(), readDir: jest.fn(),
}));
jest.mock('./VideoPlaybackService', () => ({ refreshVideoPlayback: jest.fn() }));
const asset = { id: '6a95ddcc6d547db8aa3fecbf', media_version: 'v1', hls_status: 'ready',
  hls_url: 'https://example.test/master.m3u8', source_mp4_url: 'https://example.test/source.mp4' };
beforeEach(() => {
  jest.clearAllMocks(); service.pending.clear();
  refreshVideoPlayback.mockImplementation(async template => template);
  RNFS.exists.mockResolvedValue(false); RNFS.stat.mockResolvedValue({ size: 20 });
  RNFS.mkdir.mockResolvedValue(); RNFS.moveFile.mockResolvedValue(); RNFS.unlink.mockResolvedValue();
  RNFS.readDir.mockResolvedValue([]);
  RNFS.downloadFile.mockReturnValue({ promise: Promise.resolve({ statusCode: 200 }) });
});
it('downloads MP4 only when requested and shares concurrent downloads', async () => {
  expect(RNFS.downloadFile).not.toHaveBeenCalled();
  const [first, second] = await Promise.all([service.getSource(asset), service.getSource(asset)]);
  expect(RNFS.downloadFile).toHaveBeenCalledTimes(1);
  expect(RNFS.downloadFile).toHaveBeenCalledWith(expect.objectContaining({ fromUrl: asset.source_mp4_url }));
  expect(first.localUri).toBe(second.localUri);
  expect(RNFS.moveFile).toHaveBeenCalled();
});
it('reuses completed files when metadata cannot be refreshed offline', async () => {
  refreshVideoPlayback.mockRejectedValue(new Error('Offline')); RNFS.exists.mockResolvedValue(true);
  expect((await service.getSource(asset)).localUri).toContain('/winter-video-exports/');
  expect(RNFS.downloadFile).not.toHaveBeenCalled();
});
it('rejects failed or empty downloads instead of caching them', async () => {
  RNFS.downloadFile.mockReturnValue({ promise: Promise.resolve({ statusCode: 403 }) });
  await expect(service.getSource(asset)).rejects.toThrow('Unable to download');
  expect(RNFS.moveFile).not.toHaveBeenCalled();
  RNFS.downloadFile.mockReturnValue({ promise: Promise.resolve({ statusCode: 200 }) });
  RNFS.stat.mockResolvedValue({ size: 0 });
  await expect(service.getSource(asset)).rejects.toThrow('Unable to download');
});
it('never downloads an HLS playlist for export', async () => {
  await expect(service.getSource({ video_url: asset.hls_url })).rejects.toThrow('still being prepared');
  expect(RNFS.downloadFile).not.toHaveBeenCalled();
});
