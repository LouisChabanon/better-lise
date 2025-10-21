# Better Lise

Une application web améliorant l'expérience Lise pour les étudiants (gestion d'emploi du temps, notes, menus RU, etc.). Ce dépôt contient le frontend Next.js (TypeScript + Tailwind). Le projet vise à offrir une interface claire et performante pour consulter son planning, ses notes et, plus tard d'autres services disponibles dans Lise.

## Table des matières

- [Aperçu](#aper%C3%A7u)
- [Prérequis](#pr%C3%A9requis)
- [Installation et développement](#installation-et-d%C3%A9veloppement)
- [Déploiement](#d%C3%A9ploiement)
- [Fonctionnalités actuelles](#fonctionnalit%C3%A9s-actuelles)
- [Fonctionnalités prévues](#fonctionnalit%C3%A9s-pr%C3%A9vues)
- [Contribuer](#contribuer)


## Aperçu

Better Lise est une interface utilisateur couvrant :
- Consultation du planning (agenda) avec chevauchement d'événements et indication de l'heure courante.
- Connexion via l'identifiant Lise et récupération des notes.
- Affichage du menu RU (repas) et intégration des données Crous pour Metz et Chalon (Les autres campus ne sont pas encore implémentés).
- Thème sombre/clair, composants réutilisables et optimisations pour desktop/mobile.

Le frontend est un site Next.js React en TypeScript.

## Prérequis

- Node.js (version LTS, ex. 18+)
- npm ou pnpm (les commandes suivantes utilisent `npm`)
- Git

## Installation et développement

1. Cloner le dépôt:

```powershell
git clone https://github.com/LouisChabanon/better-lise.git
cd better-lise
```

2. Installer les dépendances :

```powershell
npm install
```

3. Lancer en développement:

```powershell
npm run dev
```

4. Ouvrir le navigateur sur http://localhost:3000 (ou le port configuré par Next.js)

Notes:
- Si vous utilisez `pnpm` ou `yarn`, adaptez les commandes (`pnpm install`, `pnpm dev`, etc.).
- Le frontend utilise Prisma (généré dans `/generated/prisma`). Assurez-vous d'exécuter `prisma generate` si vous modifiez le schéma Prisma.

## Déploiement

Les options courantes:

- Vercel (recommandé pour Next.js): branche `main` vers l'environnement Vercel.
  - Ajouter les variables d'environnement nécessaires dans le dashboard Vercel.
  - Activer les builds automatiques.

- Docker: créer une image Docker pour l'application. Exemple minimal:

  - Dockerfile (dans `/Dockerfile`) : construit l'application Next.js et sert l'application statique.


Variables d'environnement à prévoir (exemples):
- DATABASE_URL (pour Prisma)
- VERCEL_GIT_COMMIT_SHA (optionnel pour manifest/version)


## Fonctionnalités actuelles

(Cochez/complétez selon l'état réel)

- [x] Affichage du planning hebdomadaire
- [x] Calcul et affichage des chevauchements d'événements
- [x] Récupération des notes et affichage dans `GradeTable`
- [x] Affichage du menu RU pour un TBK donné
- [x] Auth minimal (sauvegarde local `lise_id`), formulaire de login (pas de stockage de mpd)
- [x] Thème clair/sombre

## Fonctionnalités prévues / Template

- Authentification complète (pour pouvoir notifier lors de l'ajout d'une note par exemple)
- Notifications push / Web Push
- Synchronisation avec calendriers externes (Google Calendar, Outlook)
- Visualisation des absences
- Améliorations d'accessibilité
- Documentation


## Contribuer

- Forkez le projet, faites une branche nommée `feat/description` ou `fix/description`.
- Ouvrez une PR avec description claire et captures d'écran si nécessaire.
- Faites des commits clairs (pas comme moi)


