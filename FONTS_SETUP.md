# Google Fonts Setup for BannerCreate

## Quick Setup Guide

### Step 1: Download Fonts from Google Fonts

Visit these links and click "Download family" for each:

1. [Bungee Shade](https://fonts.google.com/specimen/Bungee+Shade)
2. [Londrina Solid](https://fonts.google.com/specimen/Londrina+Solid)
3. [Londrina Sketch](https://fonts.google.com/specimen/Londrina+Sketch)
4. [Kumar One Outline](https://fonts.google.com/specimen/Kumar+One+Outline)
5. [Montserrat Alternates](https://fonts.google.com/specimen/Montserrat+Alternates)
6. [Pacifico](https://fonts.google.com/specimen/Pacifico)

### Step 2: Extract and Copy Font Files

1. Extract each downloaded ZIP file
2. Look for the `.ttf` files (usually in a `static` folder)
3. Copy these specific files to `C:\Picstar\Picsta\assets\fonts\`:
   - `BungeeShade-Regular.ttf`
   - `LondrinaSolid-Regular.ttf`
   - `LondrinaSketch-Regular.ttf`
   - `KumarOneOutline-Regular.ttf`
   - `MontserratAlternates-Regular.ttf`
   - `Pacifico-Regular.ttf`

### Step 3: Link Fonts to React Native

Run this command in your project directory:

```bash
npx react-native-asset
```

If that doesn't work, try:
```bash
npx react-native link
```

### Step 4: Rebuild Your App

**For Android:**
```bash
npx react-native run-android
```

**For iOS:**
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

## Verification

After setup, the fonts will work in the BannerCreate component. You should see these font options:
- Bungee Shade
- Londrina Solid
- Londrina Sketch
- Kumar One Outline
- Montserrat Alternates
- Pacifico

## Troubleshooting

### Fonts not showing?
1. Make sure the `.ttf` files are in `assets/fonts/`
2. Check the file names match exactly (case-sensitive)
3. Run `npx react-native-asset` again
4. Clean and rebuild:
   ```bash
   # Android
   cd android && ./gradlew clean && cd ..
   
   # iOS
   cd ios && rm -rf Pods && pod install && cd ..
   ```

### Still having issues?
- Verify `react-native.config.js` exists in your project root
- Check that it contains: `assets: ['./assets/fonts/']`
- Restart Metro bundler with cache clear: `npx react-native start --reset-cache`

## Files Created/Modified

✅ `react-native.config.js` - Configuration for font linking
✅ `assets/fonts/` - Directory for font files
✅ `src/Components/BannerCreate.jsx` - Updated to use Google Fonts
✅ This guide - Setup instructions

Your React Native CLI project structure is preserved - no Expo dependencies added!
