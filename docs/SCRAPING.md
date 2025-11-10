# Documentation : Scraper Lise

Ce document détaille la méthodologie utilisée pour scraper des informations depuis Lise. Lise (basé sur [JavaServer Faces - JSF](https://fr.wikipedia.org/wiki/JavaServer_Faces)) est particulièrement complexe à scraper en raison de sa nature "stateful" (gardant un état).

Contrairement à un site web classique, il ne suffit pas de visiter une URL pour obtenir les notes ou les absences. Il est nécessaire de simuler une navigation complète, y compris la gestion des cookies de session et la manipulation de l'état de la vue JSF.



## Partie 1 : L'Authentification (Bypass du CAS)

Le code (voir `actions/Auth.ts`) n'utilise pas le portail CAS habituel (Microsoft Auth). Il cible directement le point de terminaison de connexion (`/login`) de Lise.

* **Objectif** : Obtenir le cookie de session `JSESSIONID`.
* **Méthode** : Une requête `POST` est envoyée à `https://lise.ensam.eu/login`.
* **Charge utile (Payload)** : La requête envoie les données de formulaire au format `application/x-www-form-urlencoded` :
    * `username` : L'identifiant de l'utilisateur (ex: `2024-1234`).
    * `password` : Le mot de passe de l'utilisateur.
    * `j_idt28` : Un champ caché requis par le formulaire JSF, envoyé avec une valeur vide.
* **Gestion de la Réponse** :
    * **En cas de succès** : Lise retourne un statut `302 Found` (redirection). Le cookie `JSESSIONID` est alors automatiquement capturé dans la cookie jar (`tough-cookie`).
    * **En cas d'échec** : (identifiants incorrects, etc.) Lise retourne un statut `200 OK` et affiche à nouveau la page de connexion. Le code interprète ce `200` comme un échec d'authentification.


> Pour une raison inconnue, le point de terminaison `/login` redirige parfois (je n'ai pas réussi à reproduire le bug) vers le CAS au lieu d'afficher le formulaire d'authentification interne (ce qui fait échouer le scraping). Si quelqu'un arrive à savoir pourquoi ou à trouver une solution fiable, je suis preneur !



## Partie 2 : La Navigation JSF

### JSF et Lise, c'est de la merde.

Avant de commencer, JFS, en plus d'être une horreur pour les yeux est une technologie archaïque et une horreur absolue à scraper et même à utiliser, impossible de faire un raccourci vers un URL spécifique par exemple.

Pas d'API REST, pas d'URL propres. Tout est géré par un état de session (`ViewState`) qui doit être constamment récupéré, analysé et renvoyé au serveur. La moindre erreur dans cet état, le moindre oubli d'un champ caché obscur (`"javax.faces.source": "form:j_idt849:j_idt852"` par exemple), et Lise vous renvoie une maxi page blanche. C'est instable, verbeux et très fragile. Bref, c'est de la merde.

### La technique

Récupérer les notes (`GetGrades.ts`) ou les absences (`GetAbsences.ts`) est l'étape la plus complexe. Pour simuler un simple clic sur "Mes Notes" il faut un total de 4 requetes pour mimer le comportement du JavaScript de Lise. Cette méthode est très instable et très lente mais c'est le seul moyen.

> **Utilisez Burp Suite**
>
> Pour déterminer la séquence exacte des requêtes, la charge utile et les en-têtes requis, un outil comme **Burp Suite** est très partique.

Voici la séquence décomposée :

1.  **Étape 1 : Obtenir le ViewState Initial**
    * Une requête `GET` est envoyée à l'URL de base (`https://lise.ensam.eu/`).
    * Le `JSESSIONID` (obtenu en Partie 1) est inclus dans la cookie jar.
    * On analyse le HTML de la réponse avec Cheerio pour extraire le `javax.faces.ViewState` initial et d'autres champs cachés (comme `form:idInit`).

2.  **Étape 2 : Première requête AJAX (Clic sur le menu)**
    * Une requête `POST` AJAX (`Faces-Request: partial/ajax`) est envoyée à `.../MainMenuPage.xhtml`.
    * **Charge utile** : Cette requête simule un clic sur le menu latéral de Lise et inclut le `ViewState` de l'Étape 1.
    * **Réponse** : Le serveur renvoie du XML. On analyse ce XML (`cheerio.load(xml, {xmlMode: true})`) pour extraire le **nouveau `javax.faces.ViewState`** mis à jour, trouvé dans une balise `<update id="j_id1:javax.faces.ViewState:0">`.

3.  **Étape 3 : Deuxième requête AJAX (Clic sur le sous-menu)**
    * Une seconde requête `POST` AJAX est envoyée à `.../MainMenuPage.xhtml`.
    * **Charge utile** : Cette requête simule le clic sur le lien "Mes Notes" dans la barre latérale.
        * `webscolaapp.Sidebar.ID_SUBMENU`: `"submenu_47356"` (pour les notes) ou `"submenu_47054"` (pour les absences).
        * `javax.faces.ViewState` : Le **nouveau** jeton obtenu à l'Étape 2.

4.  **Étape 4 : Troisième requête AJAX (Chargement du contenu)**
    * Une troisième et dernière requête `POST` AJAX est envoyée.
    * **Charge utile** : Cette requête finale indique au serveur de charger le contenu du panneau principal.
        * `form:sidebar_menuid`: `"4_0"` (pour les notes) ou `"1_0"` (pour les absences).
        * `javax.faces.ViewState` : Le jeton `ViewState` le plus récent.
    * **Réponse** : Le serveur renvoie enfin le HTML contenant le tableau des données (notes ou absences).


## Partie 4 : La Voie Facile - L'Emploi du Temps (iCal)

Heureusement, tout n'est pas horrible. Contrairement au reste du site, Lise expose un endpoint public pour l'emploi du temps (voir `GetCalendar.ts`).

1.  **Méthode** : Une simple requête `GET` (sans cookie de session) est envoyée.
2.  **URL** : `http://lise.ensam.eu/ical_apprenant/[username]` (où `[username]` est l'identifiant Lise).
3.  **Traitement** : La réponse est un flux de données au format iCalendar (`.ics`).