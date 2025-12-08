export interface Release {
	version: string;
	date: string;
	title: string;
	features: string[];
	fixes?: string[];
}

export const CURRENT_VERSION = "1.3.0";

export const CHANGELOG: Release[] = [
	{
		version: "1.3.0",
		date: "07 Dec 2025",
		title: "Notifications",
		features: [
			"Il est maintenant possible de recevoir une notification lorsque une nouvelle note est disponible",
			"Lorsque un membre de la demi promo charge une nouvelle note depuis Lise, les autres utilisateurs dans la même demi promo reçoivent une notif",
		],
		fixes: [
			"Amélioration de la détection des UE pour les moyennes",
			"Amélioration du contraste en mode clair",
		],
	},
	{
		version: "1.2.0",
		date: "01 Dec 2025",
		title: "Moyennes et Simulations",
		features: [
			"Ajout d'une page 'Mes Moyennes' permetant de voir ses moyennes par UE",
			"Système de simulation pour connaitre sa moyenne par UE après l'ajout d'une note",
			"Modification du thème clair pour une meilleure lisibilité",
		],
		fixes: ["Résolution d'un bug d'interface pour la page des absences"],
	},
	{
		version: "1.1.0",
		date: "27 Nov 2025",
		title: "Filtres et Statistiques",
		features: [
			"Ajout d'options de tri et filtres pour les notes",
			"Statistiques d'absences : Éstimation du pourcentage d'absence dans une UE",
			"Diverses améliorations d'interface, en particulier pour les petits écrans",
		],
		fixes: [
			"Tentative d'optimisation pour les vieux mobiles",
			"Amélioration de la gestion de session expirée.",
			"Validation client pour les identifiants",
		],
	},
	{
		version: "1.0.0",
		date: "24 Mai 2025",
		title: "Premiére version",
		features: [],
	},
];
