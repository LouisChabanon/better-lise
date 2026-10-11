import SwiftUI

@main
struct BetterLiseApp: App {
    @State private var environment = AppEnvironment()

    var body: some Scene {
        WindowGroup {
            RootTabView(environment: environment)
                .environment(environment.session)
                .environment(environment.settings)
                .tint(Theme.primary)
        }
    }
}
