# Rhynode Finance ProGuard rules for release builds.
# These keep the classes and annotations that React Native / Expo modules
# need at runtime (reflection, JNI, TurboModules, etc.).

# Keep annotations and metadata that native module discovery relies on.
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable

# Keep the application class and generated package.
-keep class com.rhynode.finance.** { *; }

# React Native core classes used by reflection / TurboModules.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-dontwarn com.facebook.react.**

# Hermes runtime.
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.hermes.**

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.common.** { *; }

# Gesture handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# Expo core modules (loaded by reflection).
-keep class expo.modules.** { *; }
-keep class expo.modules.core.** { *; }
-keepclassmembers class * {
    @expo.modules.core.interfaces.ExpoMethod *;
}

# Expo SQLite
-keep class expo.modules.sqlite.** { *; }
-keep class android.database.sqlite.** { *; }

# Expo Secure Store / Android Keystore
-keep class javax.crypto.** { *; }
-keep class android.security.keystore.** { *; }

# Expo Notifications
-keep class expo.modules.notifications.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Expo Camera
-keep class expo.modules.camera.** { *; }

# Expo Local Authentication
-keep class expo.modules.localauthentication.** { *; }

# Community packages loaded via autolinking reflection.
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.reactnativecommunity.netinfo.** { *; }

# Web browser / Chrome Custom Tabs
-keep class androidx.browser.** { *; }

# Keep Kotlin metadata where used by native modules.
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.coroutines.jvm.internal.** {
    <fields>;
}

# Remove verbose logging in release.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}
