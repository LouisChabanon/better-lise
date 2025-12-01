export interface Release {
	version: string;
	date: string;
	title: string;
	features: string[];
	fixes?: string[];
}

export const CURRENT_VERSION = "1.1.0";

export const CHANGELOG: Release[] = [
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
