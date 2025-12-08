# Better Lise

Better Lise est une interface alternative pour le portail académique de l'ENSAM. Elle offre une expérience utilisateur fluide, rapide et mobile-friendly pour consulter notes, emploi du temps et absences.

## Fonctionnalités

- **Agenda:** Emploi du temps avec intégration des menus du RU Crous.
- **Notes:** Consultation des notes avec calcul des moyennes et statistiques sur la demi-promo
- **Absences:** Consultation des absences avec estimation du taux d'absences par UE
- **Moyennes:** Simulation de l'impact des futures notes sur les moyennes par UE (Coefficients communautaires).
- **Notifications:** Notification Push lorsque une nouvelle note est publiée pour votre demi-promo
- **PWA:** Installable comme application native sur IOS et Android. 


## Technologies
Le projet repose sur les technologies suivantes :

- [Next.js](https://nextjs.org/docs) (App Router): Framework principal. Il gére à la fois le frontend (avec React) et le backend.
- [TypeScript](https://www.typescriptlang.org/): Le langage de programmation, c'est Javascript avec un typage intégré.
- [Tailwind CSS](https://tailwindcss.com/): Framework CSS qui permet l'implementation du style directement dans les composants React.
- [Prisma](https://www.prisma.io/orm): intéraction avec la base de données PostgreSQL
- [PostHog](https://posthog.com/): Suivi analytique anonyme pour le debugging. 
- D'autres libraries : cheerio (parsing HTML), antd-design (icon), chart.js (graphes), tanstack-query (management d'états) et d'autres...

## Installation

### 1. Prérquis Système

Pour contribuer au projet vous devez disposer des outils suivants :

- [Node.js 18+](https://nodejs.org/fr)
- Git pour la gestion de version
- Un éditeur de texte (VS Code par exemple)

### 2. Installation du projet

Exécutez les commandes suivantes dans un terminal :

```bash
# 1. Cloner le dépôt distant
git clone https://github.com/LouisChabanon/better-lise.git
cd better-lise

# 2. Installer les dépendances du projet
npm install

# 3. Configuration des variables d'environnement
# Copiez le fichier d'exemple et renseignez les clés nécessaires (contactez un mainteneur)
cp .env.example .env
```

Remplissez le fichier `.env` comme suit:
```bash
# Connexion Base de données (ex: via Docker)
DATABASE_URL="postgresql://dev_user:dev_password@localhost:5432/better_lise_local?schema=public"

# Sécurité (Générez une chaîne aléatoire : openssl rand -base64 32)
JWT_SECRET="votre_secret"

# URL cible (Lise officiel)
LISE_URI="https://lise.ensam.eu"

# Notifications (VAPID Keys pour web-push)
# Générer avec : npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="votre_cle_publique"
VAPID_PRIVATE_KEY="votre_cle_privee"
VAPID_SUBJECT="mailto:votre@email.com"

# Analytics (Optionnel en dev)
NEXT_PUBLIC_POSTHOG_KEY=""
NEXT_PUBLIC_POSTHOG_HOST=""
```

### 3. Initialisation de la base de données

Better-Lise utilise une base de données PostgreSQL. Après avoir configurer l'URL de connexion dans le fichier .env executer la commande :

```bash
# Synchronise le schéma Prisma avec votre base de données locale
npx prisma db push
```

### 4. Executer l'application
```
```bash
npm run dev
```

L'application sera accessible à l'addresse http://localhost:3000

## Architecture du projet

Next.js utilise un routage basé sur le système de fichiers. Pour plus d'infos voir [la documentation de Next.js](https://nextjs.org/docs/app/getting-started/project-structure) 
L'arborescence du projet s'organise comme suit :

- `app/`: Contient les pages et la définition des routes.
  - `app/page.tsx` : Page d'accueil avec agenda.
  - `app/(dashboard)/grades/page.tsx` : Page de consultation des notes.
  - `app/(dashboard)/absences/page.tsx` : Page de consultation des absences.
  - `app/(dashboard)/moyenne/page.tsx` : Page de calcul des moyennes.
  - layout.tsx : Définie la structure globale des pages (barre de navigation, footer etc...)
- `components/`: Liste des composants React réutilisables dans l'application (c'est très mal rangé pour l'instant. Certain composants comme `Agenda.tsx` sont en fait des pages entiéres)
  - `components/ui/` : Composants d'interfaces (Boutons, cartes, graphs)
- `actions/`: Logique serveur [Server Actions](https://nextjs.org/docs/app/guides/forms)
  - exemple: `actions/Auth` gére la logique d'authentification
- `lib/`: Fonctions utilitaires et de configuration
  - `lib/db.ts`: Instance du client Prisma
  - `lib/types`: typage
  - `lib/utils`: Fonctions utilitaires (scraping, calcul d'interface du calendrier etc...)
- `prisma/schema.prisma`: Définition du modèle de données

## Concepts Fondamentaux

### 1. Composants serveur et client

Next.js utilise par défaut le rendu coté serveur. Cependant le rendu coté serveur ne permet pas d'intéragir avec la page coté client (hooks comme `useState` etc...). Les composants clients sont identifiés par la directive `"use client"` en tête de fichier.

### 2. Scraping

Lise n'expose pas d'API pour récupérer les données, il faut donc simuler le comportement d'un utilisateur. Pour plus de détails voir [la documentation](https://github.com/louischabanon/docs/SCRAPING.md)

### 3. Gestion de la base de données (Prisma)

Le modéle de données est géré par le schema Prisma. Pour modifié le modéle il faut :
1. Éditer le fichier `prisma/schema.prisma`.
2. Exéctuter `npx prisma db push` pour appliquer les changements à la base de données.
3. Exécuter `npx prisma generate` pour générer le client TypeSript.

## Contribution

### 1. Forkez le projet, faites une branche nommée feat/description ou fix/description.

```bash
git checkout -b feature/nom-de-votre-fonctionnalite
```

### 2. Faites des commits clairs (pas comme moi)

```
git add .
git commit -m "Description concise de l'ajout"
git push origin feature/nom-de-votre-fonctionnalite
```

### 3. Ouvrez une PR avec description claire et captures d'écran si nécessaire.


## Assitance

Pour toutes questions ou remarques [contactez moi](mailto:louis.chabanon@gadz.org).
 