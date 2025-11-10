# UserTemplatesScreen - Exact HeroScreen Replica Plan

## Current Issues
1. Profile photo not using PanResponder (no drag/resize)
2. Static photo using direct positioning instead of Reanimated transforms
3. Missing banner overlay support
4. Missing all photo/text positioning logic from HeroScreen
5. Menu bar items not matching exact order/spacing

## Required Changes

### 1. Photo Container System (Copy from HeroScreen)
```javascript
// HeroScreen uses:
- pan1X, pan1Y as useSharedValue
- animatedStyle1 with transforms
- panResponder1 for dragging
- resizePanResponder1 for resizing
- clampPhoto1PositionForSize function
```

### 2. ViewShot Container Structure
```javascript
// HeroScreen wraps in:
<ViewShot ref={viewShotRef}>
  <TouchableWithoutFeedback onPress={handleBackgroundPress}>
    <View style={imageContainerWrapper}>
      <View style={imageWrapper}>
        {/* Template Image */}
        {/* Banner Overlay */}
        {/* Static Photo with PanResponder */}
        {/* Dynamic Photos */}
        {/* Text Elements */}
      </View>
    </View>
  </TouchableWithoutFeedback>
</ViewShot>
```

### 3. Menu Bar (Copy Exact Structure)
```javascript
// HeroScreen uses FlatList with exact items:
1. ShapeDropdownFixed
2. Remove BG (WandSvgIcon)
3. Banner (BannerSvgIcon)
4. Text (TextSvgIcon)
5. Photo (PhotoSvgIcon)
6. Template (TemplateSvgIcon)
```

### 4. Missing Functions to Copy
- handleBackgroundPress
- handlePhotoContainerPress (for static photo)
- Pan responders for static photo
- Resize responders
- Position clamping logic

## Action Items
1. Copy entire photo positioning system from HeroScreen
2. Add PanResponder for static photo dragging
3. Add resize PanResponder for static photo
4. Copy handleBackgroundPress to unfocus elements
5. Ensure ViewShot structure matches exactly
6. Add banner overlay rendering
7. Fix menu bar to exact order/spacing
