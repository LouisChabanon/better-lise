// Achievement definitions shared by the web app and /api/v1. Icons are keys so native apps
// can map them to their own symbol sets; the web maps them in lib/achievements-config.tsx.

export type AchievementIcon =
	| "rocket"
	| "trophy"
	| "fall"
	| "reload"
	| "fire"
	| "aim"
	| "heart"
	| "experiment"
	| "flag";

export type AchievementRarity = "Common" | "Rare" | "Legendary";

export type AchievementDefinition = {
	code: string;
	title: string;
	description: string;
	snark: string;
	icon: AchievementIcon;
	rarity: AchievementRarity;
	isSecret?: boolean;
};

/*
Idées :
- Classement ensam
- Absences après 1ere semaine
- Absence Dacunto
- Absence ACV
*/

export const ACHIEVEMENTS: AchievementDefinition[] = [
	{
		code: "FIRST_LOGIN",
		title: "Sal'ss!",
		description: "Connectez-vous pour la première fois.",
		snark: "",
		icon: "rocket",
		rarity: "Common",
	},
	{
		code: "ACADEMIC_GOAT",
		title: "Birseur fou",
		description: "Obtenez un 20/20",
		snark: "",
		icon: "trophy",
		rarity: "Rare",
	},
	{
		code: "WORST_CASE_SCENARIO",
		title: "Il a eu 0/20",
		description: "Obtenez 0/20 à une épreuve",
		snark: "C'est probablement la faute du prof",
		icon: "fall",
		rarity: "Rare",
	},
	{
		code: "REVAL",
		title: "Reval",
		description: "Aller au moins une fois en Reval",
		snark:
			"Pas besoin de réviser la reval, tu passeras au Jury de toute façon tkt",
		icon: "rocket",
		rarity: "Rare",
	},
	{
		code: "SACQUE",
		title: "Ami Sacqué",
		description: "Bienvenue au club",
		snark:
			"Ne pas sacqué une matiére c'est ne pas avoir eu la pleine expérience du TBK",
		icon: "reload",
		rarity: "Legendary",
		isSecret: true,
	},
	{
		code: "CLUTCH",
		title: "Clutcher fou",
		description: "Avoir pile 10/20 à une reval",
		snark: "On ne peux qu'aplaudir la perf",
		icon: "fire",
		rarity: "Legendary",
		isSecret: true,
	},
	{
		code: "SUR_FIL",
		title: "Sur le fil",
		description: "Obtenir 10/20",
		snark: "",
		icon: "aim",
		rarity: "Common",
	},
	{
		code: "PILLIER",
		title: "Pilier du tabagn'ss",
		description: "débloquer tous les succès",
		snark: "Bienvenue dans l'élite",
		icon: "heart",
		rarity: "Legendary",
	},
	{
		code: "DIEU_MATA",
		title: "Dieu des matériaux",
		description: "Obtenir plus de 18/20 à un DS de MATA",
		snark: "Même l'archi Morel n'est pas autant un maxeur",
		icon: "experiment",
		rarity: "Legendary",
	},
	{
		code: "SPEAK_ENGLISH",
		title: "Reval la LV1",
		description: "Dur dur",
		snark: "Dur dur",
		icon: "flag",
		rarity: "Rare",
	},
	{
		code: "STREAK_5",
		title: "Stréssé",
		description: "5 jours de suite",
		snark: "C'est un bon début",
		icon: "fire",
		rarity: "Common",
	},
	{
		code: "STREAK_10",
		title: "Streak x10",
		description: "Il mettra jamais les notes bro",
		snark: "Tu n'as rien de mieux à faire ?",
		icon: "fire",
		rarity: "Common",
	},
	{
		code: "STREAK_30",
		title: "Streak x30",
		description: "C'est maladif là...",
		snark: "C'est maladif là...",
		icon: "fire",
		rarity: "Rare",
	},
	{
		code: "STREAK_300",
		title: "Chômeur",
		description: "300 jours de suite",
		snark: "Va toucher de l'herbe sérieusement",
		icon: "trophy",
		rarity: "Legendary",
	},
];
