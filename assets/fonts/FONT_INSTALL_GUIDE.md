# Font Installation Guide

## Fonts Required for BannerCreate

Download these fonts from Google Fonts and place the `.ttf` files in this directory:

1. **Bitcount Prop Double** (if available)
   - Or use Bitcount Mono Double Grid from Google Fonts
   - File: `BitcountPropDouble-Regular.ttf`

2. **Bungee Shade**
   - URL: https://fonts.google.com/specimen/Bungee+Shade
   - File: `BungeeShade-Regular.ttf`

3. **Londrina Solid**
   - URL: https://fonts.google.com/specimen/Londrina+Solid
   - File: `LondrinaSolid-Regular.ttf`

4. **Londrina Sketch**
   - URL: https://fonts.google.com/specimen/Londrina+Sketch
   - File: `LondrinaSketch-Regular.ttf`

5. **Kumar One Outline**
   - URL: https://fonts.google.com/specimen/Kumar+One+Outline
   - File: `KumarOneOutline-Regular.ttf`

6. **Montserrat Alternates**
   - URL: https://fonts.google.com/specimen/Montserrat+Alternates
   - File: `MontserratAlternates-Regular.ttf`

7. **Pacifico**
   - URL: https://fonts.google.com/specimen/Pacifico
   - File: `Pacifico-Regular.ttf`

## Installation Steps

1. Download each font from Google Fonts (click "Download family")
2. Extract the ZIP files
3. Copy the `.ttf` files to `C:\Picstar\Picsta\assets\fonts\`
4. Run the linking command:
   ```bash
   npx react-native-asset
   ```
   OR (for older React Native versions)
   ```bash
   npx react-native link
   ```

5. Rebuild your app:
   ```bash
   # Android
   npx react-native run-android

   # iOS
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

## Font Names to Use in Code

After linking, use these exact names in your React Native code:

- `BungeeShade-Regular`
- `LondrinaSolid-Regular`
- `LondrinaSketch-Regular`
- `KumarOneOutline-Regular`
- `MontserratAlternates-Regular`
- `Pacifico-Regular`

## Quick Download Links

Visit https://fonts.google.com and search for each font name to download.
