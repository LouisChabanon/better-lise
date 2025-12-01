import {
	TrophyOutlined,
	FallOutlined,
	FrownOutlined,
	RocketOutlined,
	CoffeeOutlined,
	FireOutlined,
	ExperimentOutlined,
	ReloadOutlined,
	AimOutlined,
	HeartOutlined,
	TableOutlined,
	FlagOutlined,
} from "@ant-design/icons";

export type AchievementDef = {
	code: string;
	title: string;
	description: string;
	snark: string;
	icon: React.ReactNode;
	rarity: "Common" | "Rare" | "Legendary";
	isSecret?: boolean;
};

{
	/*
Idées :
- Classement ensam
- Streak
- Absences après 1ere semaine
- Absence Dacunto
- Absence ACV
- 	
*/
}

export const ACHIEVEMENTS_LIST: AchievementDef[] = [
	{
		code: "FIRST_LOGIN",
		title: "Sal'ss!",
		description: "Connectez-vous pour la première fois.",
		snark: "",
		icon: <RocketOutlined />,
		rarity: "Common",
	},
	{
		code: "ACADEMIC_GOAT",
		title: "Birseur fou",
		description: "Obtenez un 20/20",
		snark: "",
		icon: <TrophyOutlined />,
		rarity: "Rare",
	},
	{
		code: "WORST_CASE_SCENARIO",
		title: "Il a eu 0/20",
		description: "Obtenez 0/20 à une épreuve",
		snark: "C'est probablement la faute du prof",
		icon: <FallOutlined />,
		rarity: "Rare",
	},
	{
		code: "REVAL",
		title: "Reval",
		description: "Aller au moins une fois en Reval",
		snark:
			"Pas besoin de réviser la reval, tu passeras au Jury de toute façon tkt",
		icon: <RocketOutlined />,
		rarity: "Rare",
	},
	{
		code: "SACQUE",
		title: "Ami Sacqué",
		description: "Bienvenue au club",
		snark:
			"Ne pas sacqué une matiére c'est ne pas avoir eu la pleine expérience du TBK",
		icon: <ReloadOutlined />,
		rarity: "Legendary",
		isSecret: true,
	},
	{
		code: "CLUTCH",
		title: "Clutcher fou",
		description: "Avoir pile 10/20 à une reval",
		snark: "On ne peux qu'aplaudir la perf",
		icon: <FireOutlined />,
		rarity: "Legendary",
		isSecret: true,
	},
	{
		code: "SUR_FIL",
		title: "Sur le fil",
		description: "Obtenir 10/20",
		snark: "",
		icon: <AimOutlined />,
		rarity: "Common",
	},
	{
		code: "PILLIER",
		title: "Pilier du tabagn'ss",
		description: "débloquer tous les succès",
		snark: "Bienvenue dans l'élite",
		icon: <HeartOutlined />,
		rarity: "Legendary",
	},
	{
		code: "SERIEUX",
		title: "Étudiant sérieux",
		description: "Finir un semestre sans aucune heure d'absence injustifiée",
		snark: "Même les CMs de Farid ?",
		icon: <TableOutlined />,
		rarity: "Rare",
	},
	{
		code: "DIEU_MATA",
		title: "Dieu des matériaux",
		description: "Obtenir la meilleure note à un DS de MATA",
		snark: "Même l'archi Morel n'est pas autant un maxeur",
		icon: <ExperimentOutlined />,
		rarity: "Legendary",
	},
	{
		code: "SPEAK_ENGLISH",
		title: "Reval la LV1",
		description: "Même Hollande est meilleur en anglais",
		snark: "Même Hollande est meilleur en anglais",
		icon: <FlagOutlined />,
		rarity: "Rare",
	},
];
