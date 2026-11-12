-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class androidx.webkit.** { *; }
-dontwarn androidx.webkit.**
