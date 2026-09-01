@file:androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)

package com.codebinary.winter.videocomposer

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import androidx.media3.common.Effect
import androidx.media3.common.MediaItem
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.OverlaySettings
import androidx.media3.effect.TextureOverlay
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.google.common.collect.ImmutableList
import java.io.File

/**
 * On-device video overlay compositing, backing VideoCompositeService.compositeVideoOnDevice
 * (see Picsta/src/services/VideoCompositeService.js). Renders photo/text/banner overlays onto
 * a template video using Media3 Transformer, entirely on-device - no upload, no server FFmpeg,
 * audio preserved automatically since it's never touched.
 *
 * Overlay positioning here always comes in as top-left pixel coordinates in the *video's own*
 * pixel space (already mapped by src/utils/overlayGeometry.js's contain-aware transform), which
 * this module converts into Media3's normalized [-1,1], Y-up, center-origin overlay anchors.
 */
class VideoComposerModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    private const val TAG = "VideoComposer"
  }

  override fun getName(): String = "VideoComposer"

  @ReactMethod
  fun getVideoInfo(path: String, promise: Promise) {
    try {
      val retriever = MediaMetadataRetriever()
      retriever.setDataSource(path)

      var width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
        ?.toIntOrNull() ?: 0
      var height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
        ?.toIntOrNull() ?: 0
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)
        ?.toIntOrNull() ?: 0
      val durationMs = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
        ?.toLongOrNull() ?: 0L
      retriever.release()

      // A 90/270 rotation means the stored frame is sideways relative to how it's displayed -
      // swap so callers always get the visually-correct (displayed) width/height.
      if (rotation == 90 || rotation == 270) {
        val swap = width
        width = height
        height = swap
      }

      if (width <= 0 || height <= 0) {
        promise.reject("VIDEO_INFO_ERROR", "Could not read video dimensions for $path")
        return
      }

      val result: WritableMap = Arguments.createMap()
      result.putInt("width", width)
      result.putInt("height", height)
      result.putInt("rotation", rotation)
      result.putDouble("duration", durationMs.toDouble())
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("VIDEO_INFO_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun composite(params: ReadableMap, promise: Promise) {
    try {
      val inputPath = params.getString("inputPath")
      val outputPath = params.getString("outputPath")
      if (inputPath == null || outputPath == null) {
        promise.reject("COMPOSITE_ERROR", "inputPath and outputPath are required")
        return
      }
      if (!params.hasKey("width") || !params.hasKey("height")) {
        promise.reject("COMPOSITE_ERROR", "width and height (source video pixel size) are required")
        return
      }
      val frameWidth = params.getInt("width")
      val frameHeight = params.getInt("height")

      // Transformer refuses to write over an existing file.
      val outputFile = File(outputPath)
      if (outputFile.exists()) outputFile.delete()
      outputFile.parentFile?.mkdirs()

      val overlays = mutableListOf<TextureOverlay>()

      // Each overlay is built independently: one bad photo/text (unreadable file, bad color
      // string, etc.) must never take the rest of the overlays down with it. Previously a
      // single failure here either silently vanished (no record of *why*) or - since
      // buildBitmapOverlay throws on decode failure - aborted the whole composite before later
      // overlays (e.g. text) were even attempted. Log loudly and skip just that one instead.
      params.getArray("photos")?.let { photos ->
        for (i in 0 until photos.size()) {
          photos.getMap(i)?.let { photo ->
            try {
              overlays.add(buildBitmapOverlay(photo, frameWidth, frameHeight))
            } catch (e: Exception) {
              Log.e(TAG, "Skipping photo overlay #$i - failed to build", e)
            }
          }
        }
      }

      params.getArray("texts")?.let { texts ->
        for (i in 0 until texts.size()) {
          texts.getMap(i)?.let { text ->
            try {
              overlays.add(buildTextOverlay(text, frameWidth, frameHeight))
            } catch (e: Exception) {
              Log.e(TAG, "Skipping text overlay #$i - failed to build", e)
            }
          }
        }
      }

      params.getMap("banner")?.let { banner ->
        try {
          overlays.add(buildBitmapOverlay(banner, frameWidth, frameHeight))
        } catch (e: Exception) {
          Log.e(TAG, "Skipping banner overlay - failed to build", e)
        }
      }

      Log.i(TAG, "Rendering ${overlays.size} overlays on ${frameWidth}x${frameHeight} video")

      val effects = if (overlays.isEmpty()) {
        Effects(emptyList(), emptyList())
      } else {
        Effects(emptyList(), listOf(OverlayEffect(ImmutableList.copyOf(overlays)) as Effect))
      }

      val mediaItem = MediaItem.fromUri(Uri.fromFile(File(inputPath)))
      val editedMediaItem = EditedMediaItem.Builder(mediaItem)
        .setEffects(effects)
        .build()

      // Transformer must be built/started on a thread with a Looper.
      UiThreadUtil.runOnUiThread {
        try {
          val transformer = Transformer.Builder(reactApplicationContext)
            .addListener(object : Transformer.Listener {
              override fun onCompleted(composition: Composition, exportResult: ExportResult) {
                val result: WritableMap = Arguments.createMap()
                result.putString("outputPath", outputPath)
                promise.resolve(result)
              }

              override fun onError(
                composition: Composition,
                exportResult: ExportResult,
                exportException: ExportException
              ) {
                promise.reject("COMPOSITE_ERROR", exportException.message, exportException)
              }
            })
            .build()

          transformer.start(editedMediaItem, outputPath)
        } catch (e: Exception) {
          promise.reject("COMPOSITE_ERROR", e.message, e)
        }
      }
    } catch (e: Exception) {
      promise.reject("COMPOSITE_ERROR", e.message, e)
    }
  }

  private fun buildBitmapOverlay(map: ReadableMap, frameWidth: Int, frameHeight: Int): BitmapOverlay {
    val path = if (map.hasKey("path")) map.getString("path") else null
    require(!path.isNullOrEmpty()) { "Bitmap overlay path is required" }

    val source = decodeBitmap(path)
      ?: throw IllegalArgumentException("Unable to decode bitmap overlay: $path")

    val targetWidth = (if (map.hasKey("width")) map.getInt("width") else source.width).coerceAtLeast(1)
    val targetHeight = (if (map.hasKey("height")) map.getInt("height") else source.height).coerceAtLeast(1)
    val x = if (map.hasKey("x")) map.getDouble("x") else 0.0
    val y = if (map.hasKey("y")) map.getDouble("y") else 0.0
    val shape = if (map.hasKey("shape")) map.getString("shape") else "square"
    val borderRadius = if (map.hasKey("borderRadius")) map.getDouble("borderRadius").toFloat() else 0f
    val resizeMode = if (map.hasKey("resizeMode")) map.getString("resizeMode") else "cover"
    val rotation = if (map.hasKey("rotation")) map.getDouble("rotation").toFloat() else 0f

    val bitmap = renderBitmapForTarget(
      source,
      targetWidth,
      targetHeight,
      resizeMode ?: "cover",
      shape ?: "square",
      borderRadius
    )

    val (overlayAnchor, backgroundAnchor) = anchorsForBox(
      x, y, targetWidth, targetHeight, frameWidth, frameHeight
    )

    val settings = OverlaySettings.Builder()
      .setOverlayFrameAnchor(overlayAnchor.first, overlayAnchor.second)
      .setBackgroundFrameAnchor(backgroundAnchor.first, backgroundAnchor.second)
      .setRotationDegrees(rotation)
      .build()

    Log.i(
      TAG,
      "Bitmap path=$path decoded=${source.width}x${source.height} target=${targetWidth}x${targetHeight} " +
        "position=($x,$y) mode=$resizeMode shape=$shape"
    )
    return BitmapOverlay.createStaticBitmapOverlay(bitmap, settings)
  }

  private fun decodeBitmap(path: String): Bitmap? {
    return try {
      if (path.startsWith("content://")) {
        // Only ever hand a genuine content:// string to Uri.parse()/ContentResolver. Running a
        // plain filesystem path through Uri.parse() applies URI-encoding semantics (scheme/query/
        // fragment splitting) to a string that was never URI-encoded, which can silently mis-parse
        // (or truncate) a path containing '#', '?', '%', or a space.
        reactApplicationContext.contentResolver.openInputStream(Uri.parse(path))?.use {
          BitmapFactory.decodeStream(it)
        }
      } else {
        BitmapFactory.decodeFile(path)
      }
    } catch (error: Exception) {
      Log.e(TAG, "Bitmap decode failed for $path", error)
      null
    }
  }

  private fun renderBitmapForTarget(
    source: Bitmap,
    targetWidth: Int,
    targetHeight: Int,
    resizeMode: String,
    shape: String,
    borderRadius: Float
  ): Bitmap {
    val output = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(output)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    val clip = Path()
    val bounds = RectF(0f, 0f, targetWidth.toFloat(), targetHeight.toFloat())
    if (shape == "circle") {
      clip.addOval(bounds, Path.Direction.CW)
    } else {
      val radius = borderRadius.coerceAtLeast(0f)
      clip.addRoundRect(bounds, radius, radius, Path.Direction.CW)
    }
    canvas.clipPath(clip)

    val scale = if (resizeMode == "contain") {
      minOf(targetWidth.toFloat() / source.width, targetHeight.toFloat() / source.height)
    } else {
      maxOf(targetWidth.toFloat() / source.width, targetHeight.toFloat() / source.height)
    }
    val drawnWidth = source.width * scale
    val drawnHeight = source.height * scale
    val left = (targetWidth - drawnWidth) / 2f
    val top = (targetHeight - drawnHeight) / 2f
    canvas.drawBitmap(source, null, RectF(left, top, left + drawnWidth, top + drawnHeight), paint)
    return output
  }

  private fun buildTextOverlay(map: ReadableMap, frameWidth: Int, frameHeight: Int): BitmapOverlay {
    val text = if (map.hasKey("text")) map.getString("text") else null
    require(!text.isNullOrEmpty()) { "Text overlay text is required" }

    val x = if (map.hasKey("x")) map.getDouble("x") else 0.0
    val y = if (map.hasKey("y")) map.getDouble("y") else 0.0
    val width = (if (map.hasKey("width")) map.getInt("width") else 120).coerceAtLeast(1)
    val height = (if (map.hasKey("height")) map.getInt("height") else 40).coerceAtLeast(1)
    val fontSize = (if (map.hasKey("fontSize")) map.getInt("fontSize") else 24).coerceAtLeast(1)
    val colorStr = if (map.hasKey("color")) map.getString("color") else "#000000"
    val fontWeight = if (map.hasKey("fontWeight")) map.getString("fontWeight") else "normal"
    val fontFamily = if (map.hasKey("fontFamily")) map.getString("fontFamily") else null
    val textAlign = if (map.hasKey("textAlign")) map.getString("textAlign") else "center"
    val backgroundColorStr =
      if (map.hasKey("backgroundColor")) map.getString("backgroundColor") else "transparent"
    val rotation = if (map.hasKey("rotation")) map.getDouble("rotation").toFloat() else 0f

    val isBold = fontWeight != null && fontWeight in listOf("bold", "700", "800", "900")
    val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
      textSize = fontSize.toFloat()
      color = parseColorString(colorStr) ?: Color.BLACK
      typeface = Typeface.create(fontFamily, if (isBold) Typeface.BOLD else Typeface.NORMAL)
    }
    val alignment = when (textAlign) {
      "left" -> Layout.Alignment.ALIGN_NORMAL
      "right" -> Layout.Alignment.ALIGN_OPPOSITE
      else -> Layout.Alignment.ALIGN_CENTER
    }
    // includePad(false): Android's StaticLayout, with padding included, adds extra vertical
    // space above ascent / below descent from the font's raw metrics. React Native's <Text>
    // does not include that legacy padding, so leaving it on here shifts the text's vertical
    // position (and the box-centering math below, which uses layout.height) versus what the
    // live editor preview shows - a small, consistent alignment drift rather than a big jump.
    val layout = StaticLayout.Builder.obtain(text, 0, text.length, textPaint, width)
      .setAlignment(alignment)
      .setIncludePad(false)
      .build()

    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    parseColorString(backgroundColorStr)?.let { canvas.drawColor(it) }
    canvas.save()
    canvas.translate(0f, ((height - layout.height) / 2f).coerceAtLeast(0f))
    layout.draw(canvas)
    canvas.restore()

    val (overlayAnchor, backgroundAnchor) = anchorsForBox(
      x, y, width, height, frameWidth, frameHeight
    )
    val settings = OverlaySettings.Builder()
      .setOverlayFrameAnchor(overlayAnchor.first, overlayAnchor.second)
      .setBackgroundFrameAnchor(backgroundAnchor.first, backgroundAnchor.second)
      .setRotationDegrees(rotation)
      .build()

    Log.i(
      TAG,
      "Text value=${text.take(30)} box=${width}x${height} position=($x,$y) " +
        "fontSize=$fontSize align=$textAlign background=$backgroundColorStr"
    )
    return BitmapOverlay.createStaticBitmapOverlay(bitmap, settings)
  }

  /** Accepts "#RRGGBB", "#AARRGGBB", named colors, "rgb(r,g,b)" and "rgba(r,g,b,a)". */
  private fun parseColorString(raw: String?): Int? {
    if (raw.isNullOrEmpty() || raw == "transparent") return null
    return try {
      if (raw.startsWith("rgba") || raw.startsWith("rgb")) {
        val parts = raw.substringAfter('(').substringBefore(')').split(',').map { it.trim() }
        val r = parts[0].toInt()
        val g = parts[1].toInt()
        val b = parts[2].toInt()
        val a = if (parts.size > 3) (parts[3].toFloat() * 255).toInt() else 255
        Color.argb(a, r, g, b)
      } else {
        Color.parseColor(raw)
      }
    } catch (e: Exception) {
      null
    }
  }

  /**
   * Media3's OverlaySettings positions overlays via normalized [-1,1] anchors in a
   * GL-style, Y-up, center-origin coordinate space - not raster pixel coordinates. This
   * converts a desired top-left pixel box into center anchors. Center anchoring keeps both
   * placement and rotation consistent with React Native's center-origin transforms.
   */
  private fun anchorsForBox(
    xPx: Double,
    yPx: Double,
    boxWidth: Int,
    boxHeight: Int,
    frameWidth: Int,
    frameHeight: Int
  ): Pair<Pair<Float, Float>, Pair<Float, Float>> {
    val centerX = xPx + boxWidth / 2.0
    val centerY = yPx + boxHeight / 2.0
    val bgX = ((centerX / frameWidth) * 2 - 1).toFloat()
    val bgY = (1 - (centerY / frameHeight) * 2).toFloat()
    return Pair(0f to 0f, bgX to bgY)
  }
}
