# Installing FFmpeg Kit for Video Editing

## Why FFmpeg Kit?
For an editing app that needs to:
- Composite user photos onto video templates
- Add text overlays to videos
- Export edited videos with custom resolution
- Process videos efficiently

FFmpeg Kit is the industry standard.

## Installation

### Step 1: Install the package
```bash
npm install ffmpeg-kit-react-native --save
```

### Step 2: Choose the right package variant
FFmpeg Kit comes in different sizes. For your use case (video editing with overlays), use the **min** package:

```bash
# For Android
cd android
# Add to android/build.gradle or app/build.gradle
# implementation 'com.arthenica:ffmpeg-kit-min:6.0'

# For iOS
cd ios
pod install
```

### Step 3: Link (if needed)
```bash
npx react-native link ffmpeg-kit-react-native
```

## Alternative: Use Native Screen Recording

Instead of FFmpeg, we can use React Native's built-in capabilities:

### Option A: react-native-view-shot (Already Installed ✅)
- Captures frames as images
- Stitch frames into video using FFmpeg
- More control but complex

### Option B: react-native-media-capture
```bash
npm install react-native-media-capture --save
```
- Records screen natively
- Simpler but less control

### Option C: Hybrid Approach (Recommended for your app)
1. **For static templates (images)**: Use ViewShot ✅ (already working)
2. **For video templates**: 
   - Download template video
   - Use FFmpeg to overlay user photos/text
   - Export final video

## Recommended Solution

Since you're building an editing app, I recommend:

```bash
# Install FFmpeg Kit
npm install ffmpeg-kit-react-native --save

# Rebuild
cd android && ./gradlew clean
cd .. && npx react-native run-android
```

Then I can implement proper video compositing with:
- User photos overlaid on video templates
- Text overlays
- Custom positioning
- High-quality export

## Quick Fix Alternative

If you don't want to install FFmpeg right now, I can implement:
1. **For videos without user edits**: Download original template
2. **For videos with user edits**: Show a message "Video editing coming soon"
3. **Screenshots**: Capture current frame as image (for quick sharing)

Let me know which approach you prefer!
