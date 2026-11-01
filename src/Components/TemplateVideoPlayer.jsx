import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, StyleSheet, Text, Pressable, View } from 'react-native';
import Video from 'react-native-video';
import AppConfig from '../config/AppConfig';
import { refreshVideoPlayback } from '../services/VideoPlaybackService';
import { getMp4Url, getPlaybackSource, getPosterUrl, getVideoId } from '../utils/videoPlayback';

const BUFFER_CONFIG = {
  minBufferMs: 3000,
  maxBufferMs: 15000,
  bufferForPlaybackMs: 500,
  bufferForPlaybackAfterRebufferMs: 1500,
  backBufferDurationMs: 0,
  cacheSizeMB: 64,
};

export default function TemplateVideoPlayer({ template, active = true, resizeMode = 'contain', style }) {
  const identity = [getVideoId(template), template?.media_version, template?.hls_url, template?.video_url].join('|');
  const [playback, setPlayback] = useState(template);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [foreground, setForeground] = useState(!['background', 'inactive'].includes(AppState.currentState));
  const generation = useRef(0);
  const refreshed = useRef(false);
  const fallingBack = useRef(false);
  const handlingError = useRef(false);
  const video = useRef(null);

  useEffect(() => {
    generation.current += 1;
    setPlayback(template);
    setFallback(false);
    setReady(false);
    setBuffering(true);
    setFailed(false);
    refreshed.current = false;
    fallingBack.current = false;
    handlingError.current = false;
    return () => { generation.current += 1; };
    // Identity includes every field that changes the playback source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => listener.remove();
  }, []);

  const selected = getPlaybackSource(playback, !fallback && AppConfig.VIDEO_PLAYBACK.USE_HLS);
  const source = useMemo(() => selected ? { ...selected, bufferConfig: BUFFER_CONFIG } : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected?.uri, selected?.type]);
  const poster = getPosterUrl(playback);

  const onError = useCallback(async () => {
    if (handlingError.current) return;
    handlingError.current = true;
    const current = generation.current;
    try {
      if (!refreshed.current && getVideoId(playback)) {
        refreshed.current = true;
        try {
          const fresh = await refreshVideoPlayback(playback);
          if (current !== generation.current) return;
          setPlayback(fresh);
          setReady(false);
          setBuffering(true);
          setAttempt(value => value + 1);
          return;
        } catch {
          if (current !== generation.current) return;
        }
      }
      if (!fallingBack.current && getMp4Url(playback)) {
        fallingBack.current = true;
        setFallback(true);
        setReady(false);
        setBuffering(true);
        setAttempt(value => value + 1);
        return;
      }
      setFailed(true);
      setBuffering(false);
    } finally {
      handlingError.current = false;
    }
  }, [playback]);

  const retry = () => {
    refreshed.current = false;
    fallingBack.current = false;
    setFailed(false);
    setFallback(false);
    setReady(false);
    setBuffering(true);
    setAttempt(value => value + 1);
  };

  return (
    <View style={[styles.container, style]}>
      {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFillObject} resizeMode={resizeMode} /> : null}
      {active && foreground && source && !failed ? (
        <Video
          key={source.uri + ':' + attempt}
          ref={video}
          testID="template-video-player"
          source={source}
          style={[StyleSheet.absoluteFillObject, !ready && styles.hidden]}
          resizeMode={resizeMode}
          repeat
          paused={!active || !foreground}
          muted={!active}
          volume={active ? 1 : 0}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          maxBitRate={0}
          onLoad={() => { if (active) video.current?.seek(0); }}
          onReadyForDisplay={() => { setReady(true); setBuffering(false); }}
          onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
          onError={onError}
        />
      ) : null}
      {active && foreground && buffering && !failed && source ? (
        <View pointerEvents="none" style={styles.center}><ActivityIndicator color="#FFFFFF" /></View>
      ) : null}
      {active && (failed || !source) ? (
        <Pressable style={styles.center} onPress={retry} accessibilityRole="button" accessibilityLabel="Retry video">
          <Text style={styles.message}>Video unavailable. Tap to retry.</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  hidden: { opacity: 0 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#FFFFFF', padding: 16, textAlign: 'center' },
});
