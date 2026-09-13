package com.betterlise.app.ui.settings

import android.content.Intent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.betterlise.app.BuildConfig
import com.betterlise.app.data.settings.Campus
import com.betterlise.app.data.settings.Promo
import com.betterlise.app.domain.LiseId
import com.betterlise.app.ui.components.SurfaceCard
import com.betterlise.app.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: SettingsViewModel, onSignIn: () -> Unit) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var liseId by rememberSaveable { mutableStateOf("") }
    var picker by remember { mutableStateOf<Picker?>(null) }
    var confirmSignOut by remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(state.settings.liseId) { if (liseId.isEmpty()) liseId = state.settings.liseId }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                title = { Text("Réglages") },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
        ) {
            Section("Compte") {
                val username = state.username
                if (username != null) {
                    SettingRow("Connecté en tant que", username)
                    HorizontalDivider()
                    ActionRow("Se déconnecter", color = AppTheme.colors.danger.foreground) { confirmSignOut = true }
                } else {
                    ActionRow("Se connecter avec Lise", color = MaterialTheme.colorScheme.primary, onClick = onSignIn)
                }
            }

            Section("Identifiant Lise") {
                OutlinedTextField(
                    value = liseId,
                    onValueChange = {
                        liseId = it
                        if (LiseId.isValid(it) || it.isEmpty()) viewModel.setLiseId(it)
                    },
                    placeholder = { Text("20xx-xxxx") },
                    singleLine = true,
                    isError = liseId.isNotEmpty() && !LiseId.isValid(liseId),
                    supportingText = { Text("Utilisé pour afficher ton emploi du temps, même sans connexion.") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            Section("Campus & promo") {
                SettingRow("Tabagn'ss", state.settings.campus.displayName) { picker = Picker.Campus }
                HorizontalDivider()
                SettingRow("Demi-promo", state.settings.promo?.id ?: "Non renseignée") { picker = Picker.Promo }
                HorizontalDivider()
                Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Afficher le menu du RU", Modifier.weight(1f))
                    Switch(checked = state.settings.showRu, onCheckedChange = viewModel::setShowRu)
                }
                state.syncError?.let {
                    Text(it, color = AppTheme.colors.danger.foreground, style = MaterialTheme.typography.bodySmall)
                }
            }

            Section("À propos") {
                SettingRow("Version", BuildConfig.VERSION_NAME)
                HorizontalDivider()
                ActionRow("Code source", color = MaterialTheme.colorScheme.primary) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, "https://github.com/LouisChabanon/better-lise".toUri()))
                }
                HorizontalDivider()
                ActionRow("Politique de confidentialité", color = MaterialTheme.colorScheme.primary) {
                    context.startActivity(Intent(Intent.ACTION_VIEW, "https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy".toUri()))
                }
            }
        }
    }

    when (picker) {
        Picker.Campus -> ChoiceDialog(
            title = "Tabagn'ss",
            options = Campus.entries.map { it to it.displayName },
            selected = state.settings.campus,
            onSelect = { viewModel.setCampus(it); picker = null },
            onDismiss = { picker = null },
        )
        Picker.Promo -> ChoiceDialog(
            title = "Demi-promo",
            options = listOf<Pair<Promo?, String>>(null to "Non renseignée") + Promo.entries.map { it to it.id },
            selected = state.settings.promo,
            onSelect = { viewModel.setPromo(it); picker = null },
            onDismiss = { picker = null },
        )
        null -> Unit
    }

    if (confirmSignOut) {
        AlertDialog(
            onDismissRequest = { confirmSignOut = false },
            title = { Text("Se déconnecter ?") },
            confirmButton = {
                TextButton(onClick = { confirmSignOut = false; viewModel.signOut() }) {
                    Text("Se déconnecter", color = AppTheme.colors.danger.foreground)
                }
            },
            dismissButton = { TextButton(onClick = { confirmSignOut = false }) { Text("Annuler") } },
        )
    }
}

private enum class Picker { Campus, Promo }

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column {
        Text(
            title.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
        )
        SurfaceCard { content() }
    }
}

@Composable
private fun SettingRow(label: String, value: String, onClick: (() -> Unit)? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, Modifier.weight(1f))
        Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ActionRow(label: String, color: androidx.compose.ui.graphics.Color, onClick: () -> Unit) {
    Text(
        label,
        color = color,
        style = MaterialTheme.typography.titleSmall,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 12.dp),
    )
}

@Composable
private fun <T> ChoiceDialog(
    title: String,
    options: List<Pair<T, String>>,
    selected: T,
    onSelect: (T) -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                options.forEach { (value, label) ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .selectable(selected = value == selected, role = Role.RadioButton) { onSelect(value) }
                            .padding(vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = value == selected, onClick = null)
                        Text(label, Modifier.padding(start = 12.dp))
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Fermer") } },
    )
}
