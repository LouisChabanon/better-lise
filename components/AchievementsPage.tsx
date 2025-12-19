"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS_LIST, AchievementDef } from "@/lib/achievements-config";
import {
	checkAndUnlockAchievements,
	getUnlockedAchievements,
} from "@/actions/Achievements";
import AchievementCard from "@/components/ui/AchievementCard";
import { m } from "framer-motion";
import confetti from "canvas-confetti";
import {
	LockFilled,
	StarFilled,
	TrophyFilled,
	EyeInvisibleOutlined,
} from "@ant-design/icons";

export default function AchievementsClientPage() {
	const [unlockedCodes, setUnlockedCodes] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getUnlockedAchievements().then((codes) => {
			setUnlockedCodes(new Set(codes));
			setLoading(false);
		});

		checkAndUnlockAchievements().then((result) => {
			if (result!.newUnlocks && result!.newUnlocks.length > 0) {
				confetti({
					particleCount: 150,
					spread: 70,
					origin: { y: 0.6 },
					colors: ["#7551CC", "#D7CCF3", "#FFD700"],
				});

				setUnlockedCodes((prev) => {
					const next = new Set(prev);
					result!.newUnlocks.forEach((u) => next.add(u!.code));
					return next;
				});
			}
		});
	}, []);

	const totalAchievements = ACHIEVEMENTS_LIST.length;
	const unlockedCount = unlockedCodes.size;
	const progress = Math.round((unlockedCount / totalAchievements) * 100);

	// Rarity Stats
	const legendaryCount = ACHIEVEMENTS_LIST.filter(
		(a) => unlockedCodes.has(a.code) && a.rarity === "Legendary"
	).length;
	const rareCount = ACHIEVEMENTS_LIST.filter(
		(a) => unlockedCodes.has(a.code) && a.rarity === "Rare"
	).length;

	// Secret Stats
	const totalSecrets = ACHIEVEMENTS_LIST.filter((a) => a.isSecret).length;
	const unlockedSecrets = ACHIEVEMENTS_LIST.filter(
		(a) => a.isSecret && unlockedCodes.has(a.code)
	).length;

	return (
		<div className="flex flex-col h-full max-w-6xl mx-auto p-4 sm:p-6 pb-24">
			{/* Header */}
			<div className="flex flex-col gap-2 mb-8">
				<h2 className="text-2xl font-bold text-textPrimary">Mes succès</h2>
				<p className="text-textTertiary text-sm">Visualiser vos succès.</p>
			</div>

			{/* Stats Dashboard */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				{/* Card 1: Global Progress */}
				<div className="bg-backgroundSecondary border border-backgroundTertiary p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
					<div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
						<TrophyFilled className="text-6xl text-primary" />
					</div>
					<span className="text-xs font-bold text-textTertiary uppercase tracking-wider z-10">
						Progression
					</span>
					<div className="flex items-end gap-2 mt-2 z-10">
						<span className="text-4xl font-black text-textPrimary">
							{progress}%
						</span>
						<span className="text-sm text-textTertiary mb-1.5 font-medium">
							complété
						</span>
					</div>
					<div className="w-full h-2 bg-backgroundTertiary rounded-full mt-4 overflow-hidden">
						<m.div
							className="h-full bg-primary"
							initial={{ width: 0 }}
							animate={{ width: `${progress}%` }}
							transition={{ duration: 1, ease: "circOut" }}
						/>
					</div>
				</div>

				{/* Card 2: Rarity / Prestige */}
				<div className="bg-backgroundSecondary border border-backgroundTertiary p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
					<div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
						<StarFilled className="text-6xl text-yellow-500" />
					</div>
					<span className="text-xs font-bold text-textTertiary uppercase tracking-wider z-10">
						Prestige
					</span>
					<div className="flex flex-col gap-2 mt-3 z-10">
						<div className="flex items-center justify-between text-sm">
							<span className="text-badgeWarningText font-bold flex items-center gap-2">
								<StarFilled /> Légendaire
							</span>
							<span className="font-mono bg-badgeWarningBg px-2 rounded text-badgeWarningText">
								{legendaryCount}
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-badgeSuccessText font-bold flex items-center gap-2">
								<StarFilled /> Rare
							</span>
							<span className="font-mono bg-badgeSuccessBg px-2 rounded text-badgeSuccessText">
								{rareCount}
							</span>
						</div>
					</div>
				</div>

				{/* Card 3: Secrets Hunter */}
				<div className="bg-backgroundSecondary border border-backgroundTertiary p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
					<div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
						<EyeInvisibleOutlined className="text-6xl text-textQuaternary" />
					</div>
					<span className="text-xs font-bold text-textTertiary uppercase tracking-wider z-10">
						Secrets
					</span>
					<div className="flex items-end gap-2 mt-2 z-10">
						<span className="text-4xl font-black text-textPrimary">
							{unlockedSecrets}
						</span>
						<span className="text-sm text-textTertiary mb-1.5 font-medium">
							/ {totalSecrets} découverts
						</span>
					</div>
					<p className="text-xs text-textQuaternary mt-4">
						Certains succès sont cachés... cherchez bien.
					</p>
				</div>
			</div>

			{/* Grid of Achievements */}
			{loading ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-pulse">
					{[...Array(10)].map((_, i) => (
						<div
							key={i}
							className="aspect-square bg-backgroundSecondary rounded-3xl"
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
					{ACHIEVEMENTS_LIST.map((ach) => (
						<AchievementCard
							key={ach.code}
							achievement={ach}
							isUnlocked={unlockedCodes.has(ach.code)}
							onClick={() => {}}
						/>
					))}
				</div>
			)}
		</div>
	);
}
