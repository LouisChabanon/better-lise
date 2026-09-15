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
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.betterlise.app.data.api.Achievement
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
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
import com.betterlise.app.ui.achievements.AchievementUnlockBanner
import com.betterlise.app.ui.achievements.AchievementsScreen
import com.betterlise.app.ui.achievements.AchievementsViewModel
import com.betterlise.app.domain.AchievementCelebration
import com.betterlise.app.ui.grades.reveal.Confetti
import com.betterlise.app.ui.health.LiseHealthScreen
import com.betterlise.app.ui.simulator.SimulatorViewModel
import kotlinx.coroutines.flow.map
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
private const val ACHIEVEMENTS_ROUTE = "achievements"
private const val LISE_STATUS_ROUTE = "lise-status"

@Composable
fun BetterLiseRoot(container: AppContainer) {
    val navController = rememberNavController()
    val factory = viewModelFactory {
        initializer { AgendaViewModel(container.session, container.settings, container.cache) }
        initializer { GradesViewModel(container.session, container.cache, container.health) }
        initializer { AbsencesViewModel(container.session, container.cache, container.health) }
        initializer { SettingsViewModel(container.session, container.settings, container.cache, container.localState::clearAll) }
        initializer { AchievementsViewModel(container.session, container.cache, container.localState) }
        initializer { LoginViewModel(container.session, container.settings) }
    }
    // Activity-scoped so tab switches keep loaded data
    val agenda: AgendaViewModel = viewModel(factory = factory)
    val grades: GradesViewModel = viewModel(factory = factory)
    val absences: AbsencesViewModel = viewModel(factory = factory)
    val settings: SettingsViewModel = viewModel(factory = factory)
    val achievements: AchievementsViewModel = viewModel(factory = factory)
    // The simulator works on the grades already loaded by the Notes tab
    val simulator: SimulatorViewModel = viewModel(
        factory = viewModelFactory {
            initializer {
                SimulatorViewModel(grades.state.map { it.grades.value.orEmpty() }, container.session, container.cache, container.localState)
            }
        },
    )

    val backStack by navController.currentBackStackEntryAsState()
    val destination = backStack?.destination
    val gradesState by grades.state.collectAsStateWithLifecycle()
    val achievementsState by achievements.state.collectAsStateWithLifecycle()
    val settingsState by settings.state.collectAsStateWithLifecycle()
    val openLogin = { navController.navigate(LOGIN_ROUTE) }
    val openAchievements = { navController.navigate(ACHIEVEMENTS_ROUTE) { launchSingleTop = true } }

    // A sync can bring the grade that unlocks an achievement
    LaunchedEffect(grades) { grades.synced.collect { achievements.refresh() } }
    val showsCelebration = achievementsState.pendingCelebration.isNotEmpty() &&
        !AchievementCelebration.shouldDefer(settingsState.settings.revealMode, gradesState.unreadCount)

    Box(Modifier.fillMaxSize()) {
        Scaffold(
            bottomBar = {
                if (destination?.route == null || destination.route in TopLevel.entries.map { it.route }) {
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
                    GradesScreen(
                        grades,
                        revealMode = settingsState.settings.revealMode,
                        onSignIn = openLogin,
                        simulator = simulator,
                        onOpenAchievements = openAchievements,
                    )
                }
                composable(TopLevel.Absences.route) { AbsencesScreen(absences, onSignIn = openLogin) }
                composable(TopLevel.Settings.route) {
                    SettingsScreen(
                        settings,
                        onSignIn = openLogin,
                        onOpenAchievements = openAchievements,
                        onOpenLiseStatus = { navController.navigate(LISE_STATUS_ROUTE) { launchSingleTop = true } },
                    )
                }
                composable(ACHIEVEMENTS_ROUTE) { AchievementsScreen(achievements, onBack = { navController.popBackStack() }) }
                composable(LISE_STATUS_ROUTE) { LiseHealthScreen(container.health, onBack = { navController.popBackStack() }) }
                composable(LOGIN_ROUTE) {
                    LoginScreen(viewModel(factory = factory)) { navController.popBackStack() }
                }
            }
        }

        if (showsCelebration) {
            Confetti(Modifier.fillMaxSize())
        }
        // Keep the banner's content while it animates out after being dismissed
        var celebrated by remember { mutableStateOf(emptyList<Achievement>()) }
        if (achievementsState.pendingCelebration.isNotEmpty()) celebrated = achievementsState.pendingCelebration
        AnimatedVisibility(
            visible = showsCelebration,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
            modifier = Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(horizontal = 16.dp, vertical = 8.dp),
        ) {
            AchievementUnlockBanner(
                achievements = celebrated,
                onOpen = {
                    achievements.markCelebrated()
                    openAchievements()
                },
                onDismiss = achievements::markCelebrated,
            )
        }
    }
}
