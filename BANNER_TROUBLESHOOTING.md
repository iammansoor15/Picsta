# Banner Display Troubleshooting Guide

## Issue: Blank/Gray Banners in "Your Banners" Screen

### Quick Diagnosis Steps

1. **Open "Your Banners" screen**
2. **Tap the 🔍 (magnifying glass) button** in the top-right corner
3. **Check the console logs and alert dialog**

### What to Look For in Debug Info

#### ✅ Good State
```
Directory exists: true
Files: 2
Banners in list: 2
```

#### ❌ Problem States

**Case 1: Directory exists but no files**
```
Directory exists: true
Files: 0
Banners in list: 2
```
**Solution**: The banners metadata exists but files are missing. Delete the broken entries.

**Case 2: Files exist but not in list**
```
Directory exists: true
Files: 2
Banners in list: 0
```
**Solution**: AsyncStorage is empty. Files exist but aren't tracked.

**Case 3: Nothing exists**
```
Directory exists: false
Files: 0
Banners in list: 0
```
**Solution**: No banners have been saved yet. Create a new banner.

### Common Causes & Solutions

#### 1. **File URI Format Issue**
**Symptom**: Images show gray/blank but files exist

**Check Console**: Look for errors like:
```
❌ Failed to load banner image: {...}
```

**Solution Applied**: The code now automatically handles `file://` prefix:
```javascript
const imageUri = item.uri.startsWith('file://') 
  ? item.uri 
  : `file://${item.uri}`;
```

#### 2. **File Path Doesn't Exist**
**Symptom**: Files were deleted or moved

**Check Console**: Look for:
```
⚠️ Banner file not found, removing from list
```

**Solution**: The `listBanners()` method automatically validates and removes invalid entries.

#### 3. **Temporary File Cleanup**
**Symptom**: Source files from ViewShot were cleaned up

**Root Cause**: ViewShot creates temp files that may be cleaned by the OS

**Solution Applied**: Files are now copied to permanent storage:
```javascript
await RNFS.copyFile(cleanUri, destPath);
// Stored in: RNFS.DocumentDirectoryPath/banners/
```

#### 4. **Android File Permissions**
**Symptom**: File access denied

**Check**: Ensure `react-native-fs` has proper permissions

**Add to AndroidManifest.xml** (if needed):
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

### Manual Cleanup

If you need to reset banner storage completely:

```javascript
// Add this button temporarily to UserBannersScreen
import BannerStorageService from '../services/BannerStorageService';

<TouchableOpacity onPress={async () => {
  await BannerStorageService.clearAllBanners();
  await loadBanners();
  Alert.alert('Success', 'All banners cleared');
}}>
  <Text>Clear All Banners</Text>
</TouchableOpacity>
```

### Verification Steps

After creating a new banner:

1. **Check Console Logs**:
   ```
   💾 Saving banner: {
     sourceUri: "...",
     cleanUri: "...",
     destPath: "..."
   }
   ✅ Banner file copied successfully
   ✅ Banner saved to: ... Size: XXXXX bytes
   ✅ Banner added to list. Total banners: X
   ```

2. **Navigate to "Your Banners"**:
   - Should see the banner preview
   - Tap 🔍 to verify files exist

3. **Test "Use" Button**:
   - Should apply banner to editor
   - Banner should display at top of template

### Expected Console Output (Working State)

When creating a banner:
```
💾 Saving banner: {
  sourceUri: "/data/user/0/.../cache/ReactNative-snapshot-image12345.png",
  cleanUri: "/data/user/0/.../cache/ReactNative-snapshot-image12345.png",
  destPath: "/data/user/0/.../files/banners/banner_1698765432100.png"
}
✅ Banner file copied successfully
✅ Banner saved to: ... Size: 45678 bytes
✅ Banner added to list. Total banners: 1
```

When loading banners:
```
📋 Loaded banners: {
  count: 1,
  banners: [
    {
      id: "1698765432100",
      uri: "/data/user/0/.../files/banners/banner_1698765432100.png",
      filename: "banner_1698765432100.png",
      uriLength: 78
    }
  ]
}
✅ Banner image loaded successfully: 1698765432100
```

### Still Having Issues?

1. **Rebuild the app**:
   ```bash
   npm start -- --reset-cache
   cd android && ./gradlew clean
   cd .. && npx react-native run-android
   ```

2. **Check file system permissions**

3. **Verify RNFS is properly linked**:
   ```bash
   npm ls react-native-fs
   ```

4. **Look for error messages** in the Metro bundler console

5. **Check device logs**:
   ```bash
   npx react-native log-android
   # or
   npx react-native log-ios
   ```

### Debug Console Commands

Run these in the debug session to inspect storage:

```javascript
// Check if directory exists
RNFS.exists(RNFS.DocumentDirectoryPath + '/banners')

// List files
RNFS.readDir(RNFS.DocumentDirectoryPath + '/banners')

// Check AsyncStorage
AsyncStorage.getItem('@user_banners_list')
```

### Contact Info

If issues persist after trying all troubleshooting steps, provide:
- Debug console output (🔍 button results)
- Full console logs when creating a banner
- Platform (Android/iOS) and version
- Device or emulator details
