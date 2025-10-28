package com.facebook.react;

import android.content.Context;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.views.view.WindowUtilKt;
import com.facebook.react.soloader.OpenSourceMergedSoMapping;
import com.facebook.soloader.SoLoader;
import java.io.IOException;

/**
 * Custom app entry point that uses the correct BuildConfig package.
 */
public class CustomReactNativeEntryPoint {
  public static void loadReactNative(Context context) {
    try {
      SoLoader.init(context, OpenSourceMergedSoMapping.INSTANCE);
    } catch (IOException error) {
      throw new RuntimeException(error);
    }

    if (com.narauna.narayna.BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      DefaultNewArchitectureEntryPoint.load();
    }

    if (com.narauna.narayna.BuildConfig.IS_EDGE_TO_EDGE_ENABLED) {
      WindowUtilKt.setEdgeToEdgeFeatureFlagOn();
    }
  }
}