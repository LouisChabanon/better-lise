# Better Lise

Une interface alternative pour le portail académique de l'ENSAM. Plus fluide, plus rapide et pensée pour le mobile.

> ⚠️ **important :**
> Mon compte Lise va probablement expirer l'année prochaine, ce qui signifie que je ne pourrais plus tester l'application ni assurer sa maintenance. Si le projet te plaît et que tu souhaites le reprendre pour continuer à le faire exister, ta contribution ou une reprise globale du projet est la bienvenue ! Contacte-moi par mail ou Whatsapp si tu es intéressé.
-----

### Patch rapide si le scraper casse

Si l'ENSAM ajoute ou retire des pages dans le menus de Lise le scraper peut ne plus fonctionner. Pour patch il suffit de modifier le fichier [actions/GetGrades.ts](https://github.com/LouisChabanon/better-lise/blob/ac54b8656b0d54eb103c4d3b3e89d044818867f0/actions/GetGrades.ts) comme suit : https://github.com/LouisChabanon/better-lise/commit/ac54b8656b0d54eb103c4d3b3e89d044818867f0#r198184969


### Documentation

La documentation et les guides utilisateurs ont été déplacés sur le **[wiki](https://github.com/LouisChabanon/better-lise/wiki)**.

| 👨‍💻 **Pour les Développeurs** | 👤 **Pour les Utilisateurs** | ⚖️ **Légal & Infos** |
| :--- | :--- | :--- |
| • **[Installation & Configuration](https://github.com/LouisChabanon/better-lise/wiki/Installation-&-Setup)**<br>• **[Architecture](https://github.com/LouisChabanon/better-lise/wiki/Architecture)**<br>• **[Schéma de base de données](https://github.com/LouisChabanon/better-lise/wiki/Database-Schema)**<br>• **[Logique du Scraper](https://github.com/LouisChabanon/better-lise/wiki/The-Scraper-Logic)** | • **[Fonctionnalités](https://github.com/LouisChabanon/better-lise/wiki/Features-Overview)**<br>• **[Simulateur de moyennes](https://github.com/LouisChabanon/better-lise/wiki/Grade-Simulator)**<br>• **[Mode Casino & Succès (WIP)](https://github.com/LouisChabanon/better-lise/wiki/Casino-Mode-&-Achievements)**<br>• **[Notifications Push](https://github.com/LouisChabanon/better-lise/wiki/Push-Notifications)** | • **[Politique de Confidentialité](https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy)**<br> |

-----

## Fonctionnalités

  - **Agenda & Crous :** Emploi du temps synchronisé avec intégration automatique des menus du RU selon le campus.
  - **Notes Avancées :** Statistiques détaillées (moyenne promo, médiane, écart-type) et graphiques de distribution.
  - **Absences :** Suivi et estimation du taux d'absence par UE.
  - **Simulateur :** Calcul des futures moyennes en utilisant des coefficients communautaires.
  - **Notifications :** Reception d'alerte dès qu'une nouvelle note est détectée par la communauté.
  - **PWA :** Installable comme une application native sur iOS et Android.

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
2.  Créez une branche (`git checkout -b feat/NomFeature`).
3.  Committez vos changements (`git commit -m 'Description concise de l'ajout'`).
4.  Pushez (`git push origin feature/NomFeature`).
5.  Ouvrez une Pull Request.

## Assistance

Pour toute question, remarque ou signalement de bug :
**[louis.chabanon@gadz.org](mailto:louis.chabanon@gmail.com)**
