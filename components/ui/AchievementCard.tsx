"use client";
import { AchievementDef } from "@/lib/achievements-config";
import { motion } from "framer-motion";
import { LockOutlined, QuestionOutlined } from "@ant-design/icons";

const RARITY_STYLES = {
	Common: {
		border: "border-buttonSecondaryBorder",
		icon: "text-textPrimary",
		shadow: "shadow-primary/5",
		bg: "bg-backgroundSecondary",
		bar: "bg-primary",
		badgeText: "text-textPrimary",
		badgeBg: "bg-backgroundTertiary",
	},
	Rare: {
		border: "border-badgeSuccessText/30",
		icon: "text-badgeSuccessText",
		shadow: "shadow-badgeSuccessText/10",
		bg: "bg-badgeSuccessBg",
		bar: "bg-badgeSuccessText",
		badgeText: "text-badgeSuccessText",
		badgeBg: "bg-white/40 dark:bg-black/20",
	},
	Legendary: {
		border: "border-badgeWarningText/40",
		icon: "text-badgeWarningText",
		shadow: "shadow-badgeWarningText/15",
		bg: "bg-badgeWarningBg",
		bar: "bg-badgeWarningText",
		badgeText: "text-badgeWarningText",
		badgeBg: "bg-white/40 dark:bg-black/20",
	},
};

export default function AchievementCard({
	achievement,
	isUnlocked,
	onClick,
}: {
	achievement: AchievementDef;
	isUnlocked: boolean;
	onClick: () => void;
}) {
	const isObscured = !isUnlocked && achievement.isSecret;

	const rarityKey =
		(achievement.rarity as keyof typeof RARITY_STYLES) || "Common";
	const styles = RARITY_STYLES[rarityKey];

	return (
		<motion.div
			whileTap={{ scale: 0.95 }}
			onClick={onClick}
			className={`
        relative aspect-square flex flex-col items-center justify-center p-4 rounded-3xl text-center cursor-pointer overflow-hidden border transition-all duration-300
        ${
					isUnlocked
						? `bg-backgroundPrimary ${styles.border} ${styles.bg} shadow-sm hover:shadow-md`
						: "bg-backgroundSecondary border-transparent opacity-60 grayscale hover:opacity-80"
				}
      `}
		>
			{/* Legendary Shimmer Effect */}
			{isUnlocked && rarityKey === "Legendary" && (
				<div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-3xl">
					<div className="absolute top-0 left-[-150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] animate-[shimmer_3s_infinite]" />
				</div>
			)}

			{/* Rarity Status Bar (Top) */}
			{isUnlocked && (
				<div className={`absolute top-0 left-0 w-full h-1 ${styles.bar}`} />
			)}

			{/* Icon Container */}
			<div
				className={`
            text-4xl mb-3 transition-transform duration-300 z-10
            ${
							isUnlocked
								? `${styles.icon} drop-shadow-sm scale-110`
								: "text-textQuaternary"
						}
        `}
			>
				{isObscured ? (
					<QuestionOutlined />
				) : isUnlocked ? (
					achievement.icon
				) : (
					<LockOutlined />
				)}
			</div>

			{/* Text Content */}
			<h3
				className={`font-bold text-sm leading-tight mb-1 z-10 ${
					isUnlocked ? "text-textPrimary" : "text-textTertiary"
				}`}
			>
				{isObscured ? "???" : achievement.title}
			</h3>

			{!isObscured && (
				<p className="text-[10px] text-textTertiary line-clamp-2 z-10 font-medium">
					{achievement.description}
				</p>
			)}

			{/* Rarity Badge */}
			{isUnlocked && rarityKey !== "Common" && (
				<span
					className={`absolute bottom-2 text-[9px] uppercase tracking-widest font-extrabold px-2 py-0.5 rounded-md backdrop-blur-sm ${styles.badgeBg} ${styles.badgeText}`}
				>
					{rarityKey}
				</span>
			)}

			{/* Secret Badge */}
			{achievement.isSecret && !isUnlocked && (
				<span className="absolute bottom-2 text-[9px] uppercase tracking-widest text-textQuaternary font-bold opacity-50 bg-backgroundTertiary px-2 py-0.5 rounded">
					Secret
				</span>
			)}
		</motion.div>
	);
}
