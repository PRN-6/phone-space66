# ProGuard / R8 Rules for PHONE SPACE66 Companion

# Ktor & CIO Server Rules
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-dontwarn io.netty.**

# Kotlinx Serialization Rules
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.SerializationKt
-keepclassmembers class * {
    @kotlinx.serialization.SerialName <fields>;
    @kotlinx.serialization.Serializable <fields>;
}
-keepclasseswithmembers class * {
    kotlinx.serialization.KSerializer serializer(...);
}

# Protocol Models Preservation
-keep class com.phonespace66.companion.protocol.** { *; }

# Services Preservation
-keep class com.phonespace66.companion.core.CompanionService { *; }
-keep class com.phonespace66.companion.input.PhoneSpaceAccessibilityService { *; }
-keep class com.phonespace66.companion.notifications.PhoneSpaceNotificationListenerService { *; }
