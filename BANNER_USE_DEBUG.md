# Banner "Use" Button Debug Guide

## Issue
Banners display correctly in "Your Banners" screen, but appear blank/white when clicking "Use" button.

## What I Fixed

### 1. Added URI Formatting in `handleUseBanner`
The banner URI now properly includes `file://` prefix before being passed to the editor:

```javascript
// Format URI properly - ensure it has file:// prefix for React Native Image
let formattedUri = banner.uri.startsWith('file://') 
  ? banner.uri 
  : `file://${banner.uri}`;
```

### 2. Added Comprehensive Logging
You can now track the entire flow in the console:

**When clicking "Use" button:**
```
🎯 Using banner: {
  id: "...",
  uri: "...",
  filename: "..."
}
✅ Formatted banner URI: file://...
✅ Banner set via cropResultManager
```

**In HeroScreen (when banner is received):**
```
🎯 HeroScreen: Received cropResultManager event: {...}
🎯 HeroScreen: Processing banner: {
  photoNumber: "banner",
  croppedUri: "...",
  uriLength: XXX
}
✅ HeroScreen: Setting banner URI: ...
✅ HeroScreen: Banner enabled and URI set
🏷️ HeroScreen: Banner state changed: {
  bannerEnabled: true,
  bannerUri: "...",
  uriLength: XXX
}
```

## How to Debug

### Step 1: Check Console When Clicking "Use"
1. Open Metro bundler console or device logs
2. Go to "Your Banners" screen
3. Click "Use" on any banner
4. Look for these logs:

**✅ Good Flow:**
```
🎯 Using banner: {...}
✅ Formatted banner URI: file:///data/user/0/.../banners/banner_XXX.png?t=XXX
✅ Banner set via cropResultManager
🎯 HeroScreen: Received cropResultManager event
✅ HeroScreen: Setting banner URI
🏷️ HeroScreen: Banner state changed: { bannerEnabled: true, ... }
```

**❌ Problem Indicators:**
```
⚠️ HeroScreen: Payload is empty
⚠️ HeroScreen: Not a banner or missing URI
❌ HeroScreen: Error processing banner
```

### Step 2: Check Banner Display in HeroScreen
After clicking "Use", you should see the banner at the top of the template editor.

**If banner is blank/white:**
1. Check console for image load errors
2. Verify the URI format in logs
3. Check if `bannerEnabled` is `true`
4. Check if `bannerUri` has a value

### Step 3: Verify File Exists
Use the 🔍 debug button in "Your Banners" screen to verify:
- Directory exists: `true`
- Files count matches banners list count
- File sizes are not 0 bytes

## Common Issues & Solutions

### Issue 1: URI Without `file://` Prefix
**Symptom**: Banner appears blank
**Console**: URI like `/data/user/0/...` without `file://`
**Solution**: Already fixed - code now adds `file://` prefix

### Issue 2: cropResultManager Not Working
**Symptom**: No logs in HeroScreen after clicking "Use"
**Console**: Only sees "Using banner" but no "HeroScreen: Received" log
**Possible Causes**:
- HeroScreen not mounted
- Navigation state issue
- cropResultManager listener not attached

**Solution**: Check if you're navigating back to HeroScreen correctly

### Issue 3: File Path Changed
**Symptom**: Banner was working before but not now
**Console**: May show file load error
**Solution**: Files might have been deleted. Create a new banner.

### Issue 4: Image Component Not Rendering
**Symptom**: bannerUri is set but image doesn't show
**Check**:
1. Is `bannerEnabled` true?
2. Is the banner overlay being rendered?
3. Check for CSS/style issues hiding the banner

## Testing Steps

1. **Clean Test** (recommended):
   ```bash
   # Clear all existing banners
   # Use the 🔍 button > manually delete all banners
   # Or use clearAllBanners() method
   ```

2. **Create Fresh Banner**:
   - Go to HeroScreen
   - Open banner menu
   - Click "Create Banner"
   - Save it
   - Check console logs

3. **Use The Banner**:
   - Go to banner menu
   - Click "Use Your Banners"
   - Click "Use" on the banner
   - Watch console logs
   - Verify banner appears

## Expected Behavior

When working correctly:
1. Click "Use" → See formatted URI log
2. Navigate back to HeroScreen → See "Received" log
3. Banner appears at top of template (purple/blue/etc rectangle)
4. Can tap banner to focus/unfocus (shows X button)
5. Can remove banner from banner menu

## Still Not Working?

Collect this info:
1. **Full console output** from clicking "Use" to returning to editor
2. **Screenshots** of:
   - "Your Banners" screen (showing banner)
   - HeroScreen (showing blank/white banner area)
3. **Debug info** from 🔍 button
4. **Platform**: Android/iOS version
5. **App version**: Check package.json

Then we can investigate further!
