package com.phonespace66.companion.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = SilverAccent,
    secondary = Graphite,
    background = Charcoal950,
    surface = Charcoal900,
    surfaceVariant = Charcoal800,
    onPrimary = Charcoal950,
    onSecondary = Charcoal950,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    error = Color(0xFFEF4444)
)

@Composable
fun PhoneSpace66Theme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
