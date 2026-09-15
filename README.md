# Better Lise

Une interface alternative pour le portail académique de l'ENSAM. Plus fluide, plus rapide et pensée pour le mobile.

> ⚠️ **important :**
> Mon compte Lise va probablement expirer l'année prochaine, ce qui signifie que je ne pourrais plus tester l'application ni assurer sa maintenance. Si le projet te plaît et que tu souhaites le reprendre pour continuer à le faire exister, ta contribution ou une reprise globale du projet est la bienvenue ! Contacte-moi par mail ou Whatsapp si tu es intéressé.
-----

### Documentation Complète

La documentation technique et les guides utilisateurs ont été déplacés sur le **[wiki](https://github.com/LouisChabanon/better-lise/wiki)**.

| 👨‍💻 **Pour les Développeurs** | 👤 **Pour les Utilisateurs** | ⚖️ **Légal & Infos** |
| :--- | :--- | :--- |
| • **[Installation & Configuration](https://github.com/LouisChabanon/better-lise/wiki/Installation-&-Setup)**<br>• **[Architecture](https://github.com/LouisChabanon/better-lise/wiki/Architecture)**<br>• **[Schéma de base de données](https://github.com/LouisChabanon/better-lise/wiki/Database-Schema)**<br>• **[Logique du Scraper](https://github.com/LouisChabanon/better-lise/wiki/The-Scraper-Logic)** | • **[Fonctionnalités](https://github.com/LouisChabanon/better-lise/wiki/Features-Overview)**<br>• **[Simulateur de moyennes](https://github.com/LouisChabanon/better-lise/wiki/Grade-Simulator)**<br>• **[Mode Casino & Succès (WIP)](https://github.com/LouisChabanon/better-lise/wiki/Casino-Mode-&-Achievements)**<br>• **[Notifications Push](https://github.com/LouisChabanon/better-lise/wiki/Push-Notifications)** | • **[Politique de Confidentialité](https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy)**<br> |

-----

## Fonctionnalités Principales

  - **Agenda & Crous :** Emploi du temps synchronisé avec intégration automatique des menus du RU selon le campus.
  - **Notes Avancées :** Statistiques détaillées (moyenne promo, médiane, écart-type) et graphiques de distribution.
  - **Absences :** Suivi et estimation du taux d'absence par UE.
  - **Simulateur :** Calcul des futures moyennes en utilisant des coefficients communautaires.
  - **Notifications :** Reception d'alerte dès qu'une nouvelle note est détectée par la communauté.
  - **Applications natives :** Apps iOS (SwiftUI) et Android (Jetpack Compose), en plus de la PWA, avec le Mode Révélation (révélation animée des nouvelles notes, sons et vibrations), le simulateur de moyennes, les succès et le statut de Lise.

## Quick Start (Développement)

> Pour le guide d'installation détaillé (Docker, Variables d'environnement), consultez la page **[Installation & Configuration](https://github.com/LouisChabanon/better-lise/wiki/Installation-&-Setup)**.

```bash
# 1. Cloner le projet
git clone https://github.com/LouisChabanon/better-lise.git
cd better-lise

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
# (générez-les clés VAPID/JWT)
cp .env.example .env

# 4. Synchroniser la base de données
npx prisma db push

# 5. Lancer le serveur de dev
npm run dev
```

L'application sera accessible sur `http://localhost:3000`.

## 📱 Applications natives

Better Lise dispose d'applications natives iOS et Android (en plus du site web) :

| | iOS (`ios/`) | Android (`android/`) |
| :--- | :--- | :--- |
| **Stack** | Swift 6, SwiftUI, Swift Charts (iOS 17+) | Kotlin, Jetpack Compose, Material 3 (Android 8+) |
| **Réseau** | `URLSession` | OkHttp + kotlinx.serialization |
| **Session** | Trousseau iOS | Android Keystore (AES-GCM) |

Les deux applications consomment l'API REST `/api/v1` exposée par le serveur Next.js (authentification par jeton Bearer). Toute la logique Lise (scraping, statistiques, notifications) reste côté serveur.

### Endpoints `/api/v1`

| Méthode | Route | Auth |
| :--- | :--- | :--- |
| `POST` | `/auth/login` · `/auth/logout` | – · Bearer |
| `GET` / `PATCH` / `DELETE` | `/me` | Bearer |
| `GET` | `/agenda?liseId=&tbk=&ru=` | publique |
| `GET` | `/grades?refresh=` · `/grades/{code}/stats` | Bearer |
| `POST` | `/grades/{code}/opened` · `/grades/opened` · `/grades/{code}/new` | Bearer |
| `GET` / `PUT` | `/grades/weights` · `/grades/{code}/weight` | Bearer |
| `GET` | `/achievements` | Bearer |
| `GET` | `/absences` | Bearer |
| `GET` | `/health` | publique |

Réponses : `{ success, data, error: { code, message } | null }`.

- `GET /achievements` débloque les succès mérités puis renvoie la liste complète (`newlyUnlocked` ne contient que les succès débloqués par cet appel). Les succès secrets encore verrouillés sont masqués (`title: "???"`).
- `GET /grades/weights` renvoie les coefficients communautaires (`{ weights: { code: coeff } }`) ; `PUT /grades/{code}/weight` avec `{ "weight": 2 }` enregistre le vote de l'utilisateur (le compte de démonstration n'enregistre jamais de vote).
- `GET /health` renvoie la moyenne des deux dernières heures (`avgDuration`, `count`), un `status` (`unknown`, `ok`, `slow`, `very_slow`) et l'historique `hourly` des 24 dernières heures.

`DELETE /me` supprime le compte **Better Lise** et toutes les données qu'il stocke (notes enregistrées, absences, succès, votes de coefficients, abonnements aux notifications), puis ferme la session Lise en cours. Le compte **Lise de l'ENSAM n'est ni supprimé ni modifié** : se reconnecter recrée simplement un compte Better Lise vide. Les apps iOS et Android l'exposent dans *Réglages → Supprimer mon compte Better Lise*.

## 📲 Développement mobile

### Prérequis

| | iOS | Android |
| :--- | :--- | :--- |
| **Outils** | macOS, Xcode 26, [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`) | JDK 17, SDK Android 36 (Android Studio conseillé) |
| **Ouvrir le projet** | `ios/BetterLise.xcodeproj` | dossier `android/` |
| **Backend** | `npm run dev` (port 3000) | `npm run dev` (port 3000) |

### Lancer les apps en local

```bash
# Backend (port 3000)
npm run dev
npm test               # tests de l'API (vitest)

# iOS
cd ios && xcodegen generate
xcodebuild test -scheme BetterLise -destination 'platform=iOS Simulator,name=iPhone 17 Pro'
# Debug → http://localhost:3000, Release → https://www.better-lise.com (ios/BetterLise/Config/*.xcconfig)

# Android
cd android && ./gradlew testDebugUnitTest assembleDebug
./gradlew installDebug  # installe sur l'émulateur / l'appareil connecté
# Debug → http://10.0.2.2:3000 (émulateur), Release → https://www.better-lise.com
```

> **iOS :** le projet Xcode est généré à partir de `ios/project.yml`. Ajoutez/supprimez les fichiers sur le disque puis relancez `xcodegen generate` plutôt que de modifier le `.xcodeproj` à la main (les réglages de build se font dans `project.yml` ou les `.xcconfig`).

### Architecture

Les deux apps suivent la même organisation, pour qu'une fonctionnalité se porte facilement de l'une à l'autre :

| Rôle | iOS (`ios/BetterLise/`) | Android (`android/app/src/main/java/com/betterlise/app/`) |
| :--- | :--- | :--- |
| Point d'entrée & injection | `App/` (`AppEnvironment`) | `BetterLiseApplication`, `AppContainer`, `MainActivity` |
| Client API, DTOs, endpoints | `Core/API/` | `data/api/` |
| Session & stockage sécurisé | `Core/Auth/` | `data/auth/` |
| Cache hors-ligne des réponses | `Core/Cache/` | `data/cache/` |
| Préférences | `Core/Settings/` | `data/settings/` |
| Logique pure (tri, agenda…) | dans `Features/` | `domain/` |
| Écrans + ViewModels | `Features/<Écran>/` | `ui/<écran>/` |
| Thème & composants communs | `Design/` | `ui/theme/`, `ui/components/` |
| Sons (Mode Révélation) | `Resources/Sounds/` | `res/raw/` |

- Les ViewModels sont `@MainActor @Observable` côté iOS et exposent un `StateFlow` côté Android.
- Swift 6 est compilé en concurrence stricte (`SWIFT_STRICT_CONCURRENCY: complete`) : pas de warning toléré.
- Les DTOs reflètent exactement les réponses de `/api/v1` : toute modification d'une route doit être répercutée dans `Core/API/DTOs.swift` **et** `data/api/Dto.kt`.

### Tests

| | Unitaires | UI |
| :--- | :--- | :--- |
| **iOS** | `ios/BetterLiseTests/` — réseau simulé via `StubURLProtocol` | `ios/BetterLiseUITests/` — l'argument de lancement `-uiTestStubAPI YES` remplace l'API par des réponses figées et une session connectée (`App/UITestSupport.swift`, compilé en Debug uniquement) |
| **Android** | `android/app/src/test/` — JUnit + `MockWebServer` | Tests Compose exécutés sur la JVM avec Robolectric (`*UiTest.kt`), aucun émulateur requis |

```bash
# iOS : un seul fichier de tests
xcodebuild test -scheme BetterLise -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:BetterLiseTests/GradesViewModelTests

# Android : une seule classe de tests
./gradlew testDebugUnitTest --tests 'com.betterlise.app.GradesViewModelTest'
```

Aucun test mobile ne dépend d'un vrai serveur ni d'un compte Lise.

### Ajouter une fonctionnalité

1. **Backend** : créer la route dans `app/api/v1/…/route.ts` en s'appuyant sur `lib/api/` (`withAuth`, `fail`/`fromResult`, schémas `zod` de `validation.ts`), puis la tester dans `__tests__/routes.test.ts`.
2. **Contrat** : ajouter l'endpoint et ses DTOs dans les deux apps (`Endpoint.swift` / `Endpoints.kt`) et mettre à jour le tableau des endpoints ci-dessus.
3. **iOS puis Android** : implémenter l'écran et son ViewModel en gardant la même structure et les mêmes libellés (en français) sur les deux plateformes.
4. **Tests** : couvrir le ViewModel et la logique pure sur chaque plateforme ; si le parcours est derrière la connexion, compléter le stub d'API des tests UI.

### Tester sur un vrai téléphone

Sur un appareil physique, `localhost` désigne le téléphone lui-même. Le plus simple est d'exposer le serveur de dev en HTTPS sur votre tailnet [Tailscale](https://tailscale.com) (certificat valide, aucune exception réseau à ajouter) :

```bash
tailscale serve --bg 3000   # → https://<votre-mac>.<tailnet>.ts.net
```

Puis indiquez cette URL, uniquement pour vos builds de debug (fichiers ignorés par git) :

- **iOS** : copiez `ios/BetterLise/Config/Local.xcconfig.example` vers `Local.xcconfig` et renseignez `API_BASE_URL` et votre `DEVELOPMENT_TEAM`.
- **Android** : ajoutez `betterlise.apiBaseUrl=https://<votre-mac>.<tailnet>.ts.net` dans `android/local.properties`.

### Compte de démonstration (review App Store / Play Store)

Les équipes de review ont besoin d'un compte fonctionnel sans accès à Lise. L'identifiant **`0000-0000`** se connecte avec le mot de passe défini dans la variable d'environnement `DEMO_ACCOUNT_PASSWORD` (compte désactivé si elle est absente) :

```bash
# .env (et variables d'environnement de production)
DEMO_ACCOUNT_PASSWORD=<mot-de-passe-long-et-aléatoire>
```

- Aucune requête n'est envoyée à Lise : notes, statistiques, absences et emploi du temps viennent des données fictives de `lib/services/demo.ts` (dates recalculées par rapport au jour courant).
- Chaque connexion remet les notes à zéro : deux notes non ouvertes permettent de montrer le Mode Révélation.
- Les codes des notes commencent par `DEMO_` : elles n'apparaissent jamais dans les statistiques des vrais étudiants, et le compte ne reçoit jamais de notification de nouvelle note.
- Renseignez l'identifiant et le mot de passe dans *App Store Connect → App Review Information* et *Play Console → Accès à l'application*.

## 🛠 Technologies

Le projet repose sur la stack suivante :

  - **Framework :** [Next.js 15](https://nextjs.org/) (App Router)
  - **Langage :** [TypeScript](https://www.typescriptlang.org/)
  - **Style :** [Tailwind CSS](https://tailwindcss.com/)
  - **Data :** [Prisma](https://www.prisma.io/) & PostgreSQL
  - **Scraping :** Cheerio & Tough-Cookie

## 🤝 Contribution

Toute contribution est la bienvenue \!

1.  Forkez le projet.
2.  Créez une branche (`git checkout -b feature/NomFeature`).
3.  Committez vos changements (`git commit -m 'Description concise de l'ajout'`).
4.  Pushez (`git push origin feature/NomFeature`).
5.  Ouvrez une Pull Request.

## Assistance

Pour toute question, remarque ou signalement de bug :
**[louis.chabanon@gadz.org](mailto:louis.chabanon@gadz.org)**
