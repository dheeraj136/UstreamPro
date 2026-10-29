# Preserve JavaScript interface methods and WebView models
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.adblock.youtube.** { *; }
