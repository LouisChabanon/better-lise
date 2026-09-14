package com.betterlise.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.betterlise.app.AppContainer
import com.betterlise.app.ui.absences.AbsencesScreen
import com.betterlise.app.ui.absences.AbsencesViewModel
import com.betterlise.app.ui.agenda.AgendaScreen
import com.betterlise.app.ui.agenda.AgendaViewModel
import com.betterlise.app.ui.grades.GradesScreen
import com.betterlise.app.ui.grades.GradesViewModel
import com.betterlise.app.ui.login.LoginScreen
import com.betterlise.app.ui.login.LoginViewModel
import com.betterlise.app.ui.settings.SettingsScreen
import com.betterlise.app.ui.settings.SettingsViewModel

private enum class TopLevel(val route: String, val label: String, val icon: ImageVector) {
    Agenda("agenda", "Agenda", Icons.Rounded.CalendarMonth),
    Grades("grades", "Notes", Icons.Rounded.School),
    Absences("absences", "Absences", Icons.Rounded.EventBusy),
    Settings("settings", "Réglages", Icons.Rounded.Settings),
}

private const val LOGIN_ROUTE = "login"

@Composable
fun BetterLiseRoot(container: AppContainer) {
    val navController = rememberNavController()
    val factory = viewModelFactory {
        initializer { AgendaViewModel(container.session, container.settings, container.cache) }
        initializer { GradesViewModel(container.session, container.cache, container.health) }
        initializer { AbsencesViewModel(container.session, container.cache, container.health) }
        initializer { SettingsViewModel(container.session, container.settings, container.cache) }
        initializer { LoginViewModel(container.session, container.settings) }
    }
    // Activity-scoped so tab switches keep loaded data
    val agenda: AgendaViewModel = viewModel(factory = factory)
    val grades: GradesViewModel = viewModel(factory = factory)
    val absences: AbsencesViewModel = viewModel(factory = factory)
    val settings: SettingsViewModel = viewModel(factory = factory)

    val backStack by navController.currentBackStackEntryAsState()
    val destination = backStack?.destination
    val gradesState by grades.state.collectAsStateWithLifecycle()
    val openLogin = { navController.navigate(LOGIN_ROUTE) }

    Scaffold(
        bottomBar = {
            if (destination?.route != LOGIN_ROUTE) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    TopLevel.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = destination?.hierarchy?.any { it.route == tab.route } == true,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = {
                                BadgedBox(badge = {
                                    if (tab == TopLevel.Grades && gradesState.unreadCount > 0) Badge { Text("${gradesState.unreadCount}") }
                                }) { Icon(tab.icon, contentDescription = null) }
                            },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TopLevel.Agenda.route,
            modifier = Modifier.padding(bottom = padding.calculateBottomPadding()).consumeWindowInsets(padding),
        ) {
            composable(TopLevel.Agenda.route) { AgendaScreen(agenda) }
            composable(TopLevel.Grades.route) {
                val settingsState by settings.state.collectAsStateWithLifecycle()
                GradesScreen(grades, revealMode = settingsState.settings.revealMode, onSignIn = openLogin)
            }
            composable(TopLevel.Absences.route) { AbsencesScreen(absences, onSignIn = openLogin) }
            composable(TopLevel.Settings.route) { SettingsScreen(settings, onSignIn = openLogin) }
            composable(LOGIN_ROUTE) {
                LoginScreen(viewModel(factory = factory)) { navController.popBackStack() }
            }
        }
    }
}
