"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import DarkModeToggle from "./DarkModeToggle";
import { tbk } from "@/lib/types";
import { liseIdChecker } from "@/lib/validators";
import posthog from "posthog-js";
import { CURRENT_VERSION } from "@/lib/changelog";
import { useRouter } from "next/navigation";

interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: () => void;
}

const TBK_OPTIONS: tbk[] = [
	"Sibers",
	"Chalons",
	"Boquette",
	"Cluny",
	"Birse",
	"P3",
	"KIN",
	"Bordels",
];

const TOOLTIP_CONTENT = {
	liseId: {
		title: "Identifiant Lise",
		description: [
			"Votre identifiant Lise (ex: 2024-1234).",
			"Il est utilisé pour :",
			"- Charger votre emploi du temps.",
			"- Accéder à vos notes et absences (si vous vous connectez).",
			"Cet identifiant est stocké localement sur votre appareil pour faciliter la reconnexion.",
		],
	},
	tbk: {
		title: "Sélection du Tabagn'ss",
		description: [
			"Choisissez votre Tabagn'ss.",
			"Cela permet d'afficher le bon menu du Crous directement sur votre emploi du temps. (si disponible)",
		],
	},
	casino: {
		title: "Mode Casino",
		description: [
			"Au lieu de voir vos notes directement, elles seront cachées derrière un mini-jeu type caisse cs-go",
			"Désactivez-le pour un affichage instantané et classique de vos notes.",
		],
		videoSrc: "/videos/casino-demo.mp4",
	},
	stats: {
		title: "Statistiques Anonymes",
		description: [
			"Activez cette option pour aider à améliorer l'application.",
			"Des événements d'utilisation anonymes sont envoyés (ex: 'clic sur le bouton des notes').",
			"Aucune donnée personnelle (notes, absences) n'est jamais envoyée. Ce suivi est uniquement destiné à comprendre l'utilisation des fonctionnalités et à résoudre les bugs.",
		],
	},
};

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="ml-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-buttonSecondaryHover text-buttonTextSecondary text-xs font-semibold"
		aria-label="Afficher l'aide"
	>
		?
	</button>
);
const TooltipModal = ({
	content,
	onClose,
}: {
	content: any;
	onClose: () => void;
}) => (
	<div
		className="fixed inset-0 z-[60] flex items-center justify-center p-4"
		onClick={onClose}
		aria-modal="true"
		role="dialog"
	>
		<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
		<div
			className="relative bg-backgroundPrimary rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
			onClick={(e) => e.stopPropagation()}
		>
			<h3 className="text-xl font-semibold text-textPrimary mb-4">
				{content.title}
			</h3>
			{content.description.map((paragraph: string, index: number) => (
				<p key={index} className="text-textSecondary mb-2 last:mb-0">
					{paragraph}
				</p>
			))}
			{"videoSrc" in content && content.videoSrc && (
				<div className="mt-4 mb-4 aspect-video w-full rounded-lg overflow-hidden">
					<video
						width="100%"
						height="100%"
						autoPlay
						muted
						loop
						playsInline
						className="w-full h-full"
					>
						<source src={content.videoSrc} type="video/mp4" />
					</video>
				</div>
			)}
			<Button status="primary" onClick={onClose} className="w-full">
				J'ai compris
			</Button>
		</div>
	</div>
);

export default function SettingsDialog({
	isOpen,
	onClose,
	onSave,
}: SettingsDialogProps) {
	const [username, setUsername] = useState<string | null>("");
	const [tbkValue, setTbkValue] = useState<tbk>("Sibers");
	const [displayRUMenu, setDisplayRUMenu] = useState<boolean>(true);
	const [isGambling, setIsGambling] = useState(false);
	const [isOptedOut, setIsOptedOut] = useState(false);
	const [tooltipKey, setTooltipKey] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const storedUser = localStorage.getItem("lise_id");
		if (storedUser) setUsername(storedUser);

		const storedTbk = localStorage.getItem("tbk");
		if (storedTbk) setTbkValue(storedTbk as tbk);

		const storedGambling = localStorage.getItem("gambling");
		if (storedGambling) setIsGambling(storedGambling === "true");

		const storedDisplayRUMenu = localStorage.getItem("display_ru_menu");
		if (storedDisplayRUMenu) setDisplayRUMenu(storedDisplayRUMenu === "true");

		if (isOpen && posthog) {
			setIsOptedOut(posthog.has_opted_out_capturing());
		}
	}, [isOpen]);

	const handleVersionClick = (e: React.MouseEvent) => {
		window.dispatchEvent(new Event("open-changelog"));
	};

	if (!isOpen) return null;

	const handleToggle = () => setIsOptedOut(!isOptedOut);

	const handleGamblingToggle = () => {
		const newState = !isGambling;
		setIsGambling(newState);
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("settings_toggle_gambling", { enabled: newState });
		}
	};

	const handleRuMenugToggle = () => {
		const newState = !displayRUMenu;
		setDisplayRUMenu(newState);
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("settings_toggle_ru_menu", { enabled: newState });
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			aria-modal="true"
			role="dialog"
		>
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={() => onClose()}
				aria-hidden="true"
			/>

			<div className="relative bg-backgroundPrimary rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg text-textPrimary font-semibold">Paramètres</h2>
					<Button
						status="secondary"
						onClick={() => onClose()}
						aria-label="Fermer les paramètres"
					>
						✕
					</Button>
				</div>

				{/* body */}
				<div className="space-y-6">
					<div className="space-y-2">
						<label className="font-medium text-textSecondary flex items-center">
							Identifiant :{" "}
							<TooltipIcon onClick={() => setTooltipKey("liseId")} />
						</label>
						<div className="flex items-center px-3 py-2 bg-backgroundSecondary rounded-lg focus-within:ring-1 focus-within:ring-primary-400">
							<input
								id="settings-lise-input"
								type="text"
								className="w-full bg-transparent focus:outline-none"
								placeholder="20xx-xxxx"
								defaultValue={username || ""}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="font-medium text-textSecondary flex items-center">
							Tabagn'ss : <TooltipIcon onClick={() => setTooltipKey("tbk")} />
						</label>
						<select
							className="w-full rounded-lg border bg-backgroundSecondary px-3 py-2 border-primary-400"
							value={tbkValue}
							onChange={(e) => setTbkValue(e.target.value as tbk)}
						>
							{TBK_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					</div>

					<div className="space-y-4 pt-4 border-t border-primary">
						<div className="flex items-center justify-between gap-4">
							<span className="font-medium text-textSecondary">Thème :</span>
							<DarkModeToggle />
						</div>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center">
								<label className="font-medium text-textSecondary cursor-pointer">
									Mode Casino :
								</label>
								<TooltipIcon onClick={() => setTooltipKey("casino")} />
							</div>
							<input
								type="checkbox"
								checked={isGambling}
								onChange={handleGamblingToggle}
								className="h-5 w-5 rounded text-primary-400 accent-buttonPrimaryBackground"
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center">
								<label className="font-medium text-textSecondary cursor-pointer">
									Statistiques Anonymes :
								</label>
								<TooltipIcon onClick={() => setTooltipKey("stats")} />
							</div>
							<input
								type="checkbox"
								checked={!isOptedOut}
								onChange={handleToggle}
								className="h-5 w-5 rounded text-primary-400 accent-buttonPrimaryBackground"
							/>
						</div>
						<div className="flex items-center justify-between gap-4">
							<label className="font-medium text-textSecondary cursor-pointer">
								Menu RU :
							</label>
							<input
								type="checkbox"
								checked={displayRUMenu}
								onChange={handleRuMenugToggle}
								className="h-5 w-5 rounded text-primary-400 accent-buttonPrimaryBackground"
							/>
						</div>
					</div>
				</div>

				<div className="mt-6 text-center text-sm flex flex-col gap-2">
					<button
						onClick={handleVersionClick}
						className="text-primary hover:text-primary-400 font-medium select-none active:scale-95 transition-transform"
					>
						Version (v{CURRENT_VERSION})
					</button>
					<a
						href="https://github.com/LouisChabanon/better-lise/blob/main/confidentialite.md"
						target="_blank"
						className="text-textTertiary hover:text-textPrimary underline"
					>
						Politique de confidentialité
					</a>
				</div>

				{error && (
					<div className="p-3 mt-6 bg-error-container border border-error/20 text-error rounded-lg text-sm font-medium text-center overflow-hidden">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 mt-8">
					<Button status="secondary" onClick={() => onClose()} type="button">
						Annuler
					</Button>
					<Button
						status="primary"
						type="submit"
						onClick={() => {
							const cleanUsername = username?.trim() || "";
							if (!cleanUsername) {
								setError("Identifiant requis.");
								return;
							}
							if (username && !liseIdChecker(username)) {
								setError("Identifiant invalide (20xx-xxxx).");
								return;
							}

							localStorage.setItem("lise_id", cleanUsername);
							localStorage.setItem("tbk", tbkValue);
							localStorage.setItem("gambling", isGambling.toString());
							localStorage.setItem("display_ru_menu", displayRUMenu.toString());

							if (!isOptedOut) {
								posthog.identify(cleanUsername);
								posthog.people.set({
									tbk: tbkValue,
									gambling_enabled: isGambling,
									ru_menu_enabled: displayRUMenu,
								});
							}
							isOptedOut
								? posthog.opt_out_capturing()
								: posthog.opt_in_capturing();
							onSave();
						}}
					>
						Sauvegarder
					</Button>
				</div>
			</div>
			{tooltipKey && (
				<TooltipModal
					content={TOOLTIP_CONTENT[tooltipKey as keyof typeof TOOLTIP_CONTENT]}
					onClose={() => setTooltipKey(null)}
				/>
			)}
		</div>
	);
}
