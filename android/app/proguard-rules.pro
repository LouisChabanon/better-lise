# kotlinx.serialization keeps generated serializers for @Serializable classes
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers @kotlinx.serialization.Serializable class com.betterlise.app.** {
    *** Companion;
    kotlinx.serialization.KSerializer serializer(...);
}
