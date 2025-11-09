# Politique de Confidentialité de Better Lise

**MAJ:** 9 novembre 2025

Better Lise est un projet étudiant non officiel, développé pour offrir une meilleure expérience de Lise.

Il est expliqué ici, quelles informations sont collectées, pourquoi elles sont collectées, et comment elles peuvent être gérées.

---

## 1. En Bref (TLDR)

1.  **Le mot de passe Lise n'est JAMAIS stocké.** Il est utilisé une seule fois pour la connexion, puis est immédiatement oublié.
2.  **L'identifiant Lise (2024-1234 par exemple) et les notes sont stockés.**
3.  **Pourquoi les notes sont-elles stockées ?** Pour que des **statistiques anonymes** (moyenne, médiane, distribution) soient calculées, lesquelles sont montrées à tout les utilisateurs.
4.  **L'emploi du temps et les absences ne sont PAS stockés** sur les serveurs de l'application. Ils sont récupérés "à la volée" depuis Lise à chaque consultation.
5.  **Le suivi analytique** (qui sert à améliorer l'application) **peut être désactivé** à tout moment dans les paramètres.

---

## 2. Les Données Collectées et leur Utilisation

Des informations sont collectées de deux manières : celles fournies (les identifiants) et celles récupérées de Lise.

### Données de Connexion

* **Identifiant Lise (`username`)** : Il est utilisé pour la connexion à Lise et pour être associé aux notes qui sont stockées. Il est également sauvegardé sur l'appareil (`localStorage`) pour pré-remplir le champ de connexion et charger l'emploi du temps.
* **Mot de Passe Lise (`password`)** : Il n'est utilisé qu'une seule fois, en mémoire, pour être envoyé au serveur de Lise afin d'établir une session. **Il n'est jamais stocké dans la base de données.**
* **Cookie de Session Lise (`JSESSIONID`)** : Une fois la connexion établie, ce cookie est récupéré de Lise. Il est stocké de manière chiffrée dans le cookie de session de l'application (`jwt_token`) pour que la connexion reste active avec Lise pendant 2 heures.

### Données Académiques Stockées (Base de Données)

Pour que les performances soient améliorées et que des fonctionnalités uniques soient offertes, les informations suivantes sont sauvegardées dans la base de données sécurisée :

* **Les Notes (`Grade`)** : Le détail des notes (code du devoir, libellé, note, date, commentaire, professeurs) est stocké.

### Données Traitées sans Stockage

Les informations suivantes sont récupérées depuis Lise mais **ne sont pas** stockées dans la base de données :

* **L'Emploi du temps (`Calendar`)**
* **Les Absences (`Absence`)**

Ces données sont chargées à la demande et ne persistent pas sur les serveurs de l'application.

---

## 3. L'utilisation des notes pour les Statistiques

Lorsque le détail d'une note est consulté, les notes de tous les utilisateurs ayant cette note dans la base de données sont utilisées pour calculer des statistiques agrégées (moyenne, médiane, note min/max, distribution).

Ce calcul est **totalement anonyme**. La note individuelle ou l'identifiant ne peuvent être vus par personne. Cette fonctionnalité est essentielle au service et repose sur les données stockées.

---

## 4. Données Stockées sur l'Appareil (LocalStorage)

Pour le confort d'utilisation, certaines préférences sont stockées directement dans le navigateur de l'appareil :

* **`lise_id`** : L'identifiant, pour pré-remplir les champs.
* **`tbk`** : Le Tabagn'ss de l'utilisateur pour afficher le bon menu Crous (quand celui-ci est disponible).
* **`gambling`** : La préférence pour le "Mode Casino".
* **Préférences d'analyse** : Le choix d'activer ou de désactiver le suivi analytique.

---

## 5. Services Tiers et Analyse

Un minimum de services tiers est utilisé.

* **Vercel** : L'application est hébergée sur Vercel. Des données d'analyse (Vercel Analytics) et de performance (Speed Insights) sont collectées par Vercel. Celles-ci sont anonymes et respectueuses de la vie privée (elles n'utilisent pas de cookies).
* **PostHog** : Pour que l'utilisation de l'application soit comprise (ex: "quels boutons sont les plus cliqués ?", "quelle vue est la plus populaire ?") et que les bugs soient corrigés, PostHog est utilisé.

**Le contrôle est possible :** Ce suivi peut être désactivé à tout moment. La case **"Envoyer des statistiques anonymes"** doit simplement être décochée dans les paramètres de l'application.

---

## 6. Sécurité des Données

1.  Le mot de passe Lise n'est jamais stocké.
2.  La session de connexion à l'application est gérée par un cookie JWT.
3.  L'accès à la base de données est restreint et protégé.

---

## 8. Contact

Pour toute question ou pour toute demande de suppression de données, contacter:

**louis.chabanon@gadz.org**