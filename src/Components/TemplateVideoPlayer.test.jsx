/* eslint-env jest */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Video from 'react-native-video';
import TemplateVideoPlayer from './TemplateVideoPlayer';
import { refreshVideoPlayback } from '../services/VideoPlaybackService';
jest.mock('../config/AppConfig', () => ({ VIDEO_PLAYBACK: { USE_HLS: true } }));
jest.mock('../services/VideoPlaybackService', () => ({ refreshVideoPlayback: jest.fn() }));
jest.mock('react-native-video', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return ReactMock.forwardRef((props, ref) => {
    ReactMock.useImperativeHandle(ref, () => ({ seek: jest.fn() }));
    return ReactMock.createElement(View, props);
  });
});
const asset = { id: '6a95ddcc6d547db8aa3fecbf', media_version: 'v1', hls_status: 'ready',
  hls_url: 'https://example.test/master.m3u8', source_mp4_url: 'https://example.test/source.mp4' };
let tree;
beforeEach(() => {
  jest.clearAllMocks();
  refreshVideoPlayback.mockImplementation(async template => ({ ...template, hls_url: 'https://example.test/fresh.m3u8' }));
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = null; });
it('uses adaptive HLS and does not mount offscreen decoders', async () => {
  await act(async () => { tree = renderer.create(<TemplateVideoPlayer template={asset} active />); });
  expect(tree.root.findByType(Video).props.source.type).toBe('m3u8');
  expect(tree.root.findByType(Video).props.maxBitRate).toBe(0);
  await act(async () => { tree.update(<TemplateVideoPlayer template={asset} active={false} />); });
  expect(tree.root.findAllByType(Video)).toHaveLength(0);
});
it('refreshes access once, falls back to MP4, and stops retrying', async () => {
  await act(async () => { tree = renderer.create(<TemplateVideoPlayer template={asset} active />); });
  await act(async () => { await tree.root.findByType(Video).props.onError({}); });
  expect(tree.root.findByType(Video).props.source.uri).toBe('https://example.test/fresh.m3u8');
  await act(async () => { await tree.root.findByType(Video).props.onError({}); });
  expect(tree.root.findByType(Video).props.source.uri).toBe(asset.source_mp4_url);
  await act(async () => { await tree.root.findByType(Video).props.onError({}); });
  expect(tree.root.findAllByType(Video)).toHaveLength(0);
  expect(refreshVideoPlayback).toHaveBeenCalledTimes(1);
});
it('resets playback when the asset changes', async () => {
  await act(async () => { tree = renderer.create(<TemplateVideoPlayer template={asset} active />); });
  await act(async () => { await tree.root.findByType(Video).props.onError({}); });
  await act(async () => { await tree.root.findByType(Video).props.onError({}); });
  const next = { ...asset, id: '6a782a3e99d4f92ca74f8d88', hls_url: 'https://example.test/next.m3u8' };
  await act(async () => { tree.update(<TemplateVideoPlayer template={next} active />); });
  expect(tree.root.findByType(Video).props.source.uri).toBe(next.hls_url);
});
