import {
	TrophyOutlined,
	FallOutlined,
	RocketOutlined,
	FireOutlined,
	ExperimentOutlined,
	ReloadOutlined,
	AimOutlined,
	HeartOutlined,
	FlagOutlined,
} from "@ant-design/icons";
import {
	ACHIEVEMENTS,
	AchievementDefinition,
	AchievementIcon,
} from "@/lib/achievements";

export type AchievementDef = Omit<AchievementDefinition, "icon"> & {
	icon: React.ReactNode;
};

const ICONS: Record<AchievementIcon, React.ReactNode> = {
	rocket: <RocketOutlined />,
	trophy: <TrophyOutlined />,
	fall: <FallOutlined />,
	reload: <ReloadOutlined />,
	fire: <FireOutlined />,
	aim: <AimOutlined />,
	heart: <HeartOutlined />,
	experiment: <ExperimentOutlined />,
	flag: <FlagOutlined />,
};

export const ACHIEVEMENTS_LIST: AchievementDef[] = ACHIEVEMENTS.map((a) => ({
	...a,
	icon: ICONS[a.icon],
}));
