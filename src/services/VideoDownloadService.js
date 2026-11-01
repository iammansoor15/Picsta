import RNFS from 'react-native-fs';
import { refreshVideoPlayback } from './VideoPlaybackService';
import { getMp4Url, getVideoId } from '../utils/videoPlayback';

function hash(value) {
  let first = 0, second = 0;
  for (let i = 0; i < value.length; i++) {
    first = (first * 31 + value.charCodeAt(i)) % 4294967296;
    second = (second * 37 + value.charCodeAt(i)) % 4294967296;
  }
  return first.toString(16).padStart(8, '0') + second.toString(16).padStart(8, '0');
}

class VideoDownloadService {
  constructor() {
    this.directory = RNFS.CachesDirectoryPath + '/winter-video-exports';
    this.pending = new Map();
  }

  async getSource(template) {
    let fresh = template;
    try { fresh = await refreshVideoPlayback(template); } catch {
      // A previously downloaded source can still be exported when offline.
    }
    const remoteUrl = getMp4Url(fresh);
    if (!remoteUrl) throw new Error('This video is still being prepared. Please try again shortly.');
    const stableUrl = remoteUrl.split('?')[0].replace(/(\/api\/media\/video\/[^/]+\/)[^/]+\//, '$1');
    if (remoteUrl.startsWith('file://') || remoteUrl.startsWith('/')) {
      return { remoteUrl, localUri: remoteUrl.replace(/^file:\/\//, '') };
    }
    const id = getVideoId(fresh), version = String(fresh.media_version || 'legacy');
    const key = id && /^[a-zA-Z0-9-]{1,80}$/.test(version) ? id + '_' + version : hash(stableUrl);
    const file = this.directory + '/' + key + '.mp4';
    await RNFS.mkdir(this.directory);
    if (await RNFS.exists(file)) {
      const stat = await RNFS.stat(file);
      if (Number(stat.size) > 0) return { remoteUrl, localUri: file };
      await RNFS.unlink(file);
    }
    if (!this.pending.has(key)) {
      const download = (async () => {
        const partial = file + '.part';
        try {
          const result = await RNFS.downloadFile({ fromUrl: remoteUrl, toFile: partial }).promise;
          if (result.statusCode !== 200 || !(Number((await RNFS.stat(partial)).size) > 0)) {
            throw new Error('Unable to download the video for export.');
          }
          await RNFS.moveFile(partial, file);
          await this.prune(file);
          return file;
        } catch (error) {
          if (await RNFS.exists(partial)) await RNFS.unlink(partial).catch(() => {});
          throw error;
        } finally {
          this.pending.delete(key);
        }
      })();
      this.pending.set(key, download);
    }
    return { remoteUrl, localUri: await this.pending.get(key) };
  }

  async prune(current) {
    try {
      const files = (await RNFS.readDir(this.directory))
        .filter(file => file.isFile() && /^[a-zA-Z0-9_-]+\.mp4$/.test(file.name))
        .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
      let bytes = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        bytes += Number(file.size);
        if (file.path !== current && i >= 2 && bytes > 256 * 1024 * 1024) {
          await RNFS.unlink(file.path);
        }
      }
    } catch {
      // Cache maintenance must not prevent saving a completed video.
    }
  }
}

export default new VideoDownloadService();
