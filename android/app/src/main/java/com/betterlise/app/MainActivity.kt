package com.betterlise.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.betterlise.app.ui.navigation.BetterLiseRoot
import com.betterlise.app.ui.theme.BetterLiseTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val container = (application as BetterLiseApplication).container
        setContent {
            BetterLiseTheme {
                BetterLiseRoot(container)
            }
        }
    }
}
