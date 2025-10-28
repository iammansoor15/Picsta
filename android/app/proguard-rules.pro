# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native ProGuard rules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.yoga.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep React Native classes
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.common.** { *; }
-keep class com.facebook.react.module.** { *; }
-keep class com.facebook.react.devsupport.** { *; }
-keep class com.facebook.react.fabric.** { *; }

# Keep JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native modules
-keep class com.facebook.react.ReactPackage { *; }
-keep class com.facebook.react.shell.MainReactPackage { *; }
-keep class com.facebook.react.ReactNativeHost { *; }
-keep class com.facebook.react.ReactApplication { *; }
-keep class com.facebook.react.ReactApplicationContext { *; }

# Keep Flipper (if used)
-keep class com.facebook.flipper.** { *; }

# Keep Fresco (image loading library)
-keep class com.facebook.drawee.** { *; }
-keep class com.facebook.imagepipeline.** { *; }

# Keep OkHttp
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep JSC
-keep class org.webkit.** { *; }
-dontwarn org.webkit.**

# Keep AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Keep React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Keep React Native Image Picker
-keep class com.imagepicker.** { *; }

# Keep React Native Camera Roll
-keep class com.reactnativecommunity.cameraroll.** { *; }

# Keep React Native Linear Gradient
-keep class com.BV.LinearGradient.** { *; }

# Keep React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# Keep React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Keep React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# Keep React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# Keep React Native Modal
-keep class com.reactnativecommunity.rnmodal.** { *; }

# Keep React Native FS
-keep class com.rnfs.** { *; }

# Keep React Native Blob Util
-keep class com.ReactNativeBlobUtil.** { *; }

# Keep React Native View Shot
-keep class fr.greweb.reactnativeviewshot.** { *; }

# Keep React Native Image Resizer
-keep class fr.bamlab.rnimageresizer.** { *; }

# Keep your app's classes
-keep class com.narauna.narayna.** { *; }

# Generic keeps for reflection
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Don't warn about missing classes
-dontwarn com.facebook.react.**
-dontwarn com.facebook.jni.**
-dontwarn javax.annotation.**
-dontwarn sun.misc.Unsafe
