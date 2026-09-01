/**
 * overlayGeometry.js
 *
 * Maps overlay positions/sizes from the editor's preview container (RN layout pixels,
 * top-left origin) into the source video's real pixel coordinate space.
 *
 * The preview renders the template video with resizeMode="contain"
 * (see HeroScreen.jsx's <Video resizeMode="contain" .../>), so this mapping replicates
 * CSS `object-fit: contain`: the video is scaled UNIFORMLY (the same factor on both axes)
 * so the complete frame remains visible, then centered with letterboxing on the short axis.
 *
 * This intentionally avoids independent X/Y scaling (containerWidth/videoWidth vs
 * containerHeight/videoHeight) - that only produces correct results when the container
 * and video share the exact same aspect ratio, and silently distorts overlay positions
 * (and stretches font sizes non-uniformly) whenever they don't. That's the bug in the
 * current server-side compositor (PicStar_Server video-controller.js scaleX/scaleY).
 */

/**
 * @param {number} containerWidth  Preview container width, in the same units as overlay x/y/width/height.
 * @param {number} containerHeight Preview container height.
 * @param {number} videoWidth      Source video's real pixel width.
 * @param {number} videoHeight     Source video's real pixel height.
 * @returns {{ scale: number, offsetX: number, offsetY: number }}
 */
export function computeContainTransform(containerWidth, containerHeight, videoWidth, videoHeight) {
  if (!(containerWidth > 0) || !(containerHeight > 0) || !(videoWidth > 0) || !(videoHeight > 0)) {
    throw new Error(
      `computeContainTransform: all dimensions must be positive numbers, got ` +
      `containerWidth=${containerWidth}, containerHeight=${containerHeight}, ` +
      `videoWidth=${videoWidth}, videoHeight=${videoHeight}`
    );
  }

  const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight);
  const offsetX = (containerWidth - videoWidth * scale) / 2;
  const offsetY = (containerHeight - videoHeight * scale) / 2;

  return { scale, offsetX, offsetY };
}

/**
 * Maps a single container-space point into video-pixel space.
 */
export function mapPointToVideo(point, transform) {
  const { x = 0, y = 0 } = point || {};
  const { scale, offsetX, offsetY } = transform;
  return {
    x: (x - offsetX) / scale,
    y: (y - offsetY) / scale,
  };
}

/**
 * Maps a full overlay (x, y, plus optional width/height/fontSize) from container space
 * into video-pixel space. width/height/fontSize scale by the same uniform factor as
 * position, since contain-fit scaling is uniform on both axes - unlike the old server-side
 * approach, this keeps circles circular and text proportions correct regardless of the
 * template's aspect ratio.
 *
 * Any other fields on the overlay (uri, color, fontWeight, backgroundColor, shape, text,
 * textAlign, ...) pass through unchanged so callers don't need to re-merge them.
 */
export function mapOverlayToVideo(overlay, transform) {
  const { x, y } = mapPointToVideo(overlay, transform);
  const { scale } = transform;

  const mapped = {
    ...overlay,
    x: Math.round(x),
    y: Math.round(y),
  };

  if (overlay.width != null) mapped.width = Math.round(overlay.width / scale);
  if (overlay.height != null) mapped.height = Math.round(overlay.height / scale);
  if (overlay.fontSize != null) mapped.fontSize = Math.round(overlay.fontSize / scale);
  if (overlay.borderRadius != null) mapped.borderRadius = Math.round(overlay.borderRadius / scale);

  return mapped;
}

/**
 * Convenience: maps a list of overlays (photos, texts, or [banner]) in one call.
 */
export function mapOverlaysToVideo(overlays, transform) {
  return (overlays || []).map(overlay => mapOverlayToVideo(overlay, transform));
}
