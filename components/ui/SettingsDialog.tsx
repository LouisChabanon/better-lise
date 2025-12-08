"use client";

import { useEffect, useState } from "react";
import { Button } from "./Button";
import DarkModeToggle from "./DarkModeToggle";
import { tbk, PromoCode } from "@/lib/types";
import { liseIdChecker } from "@/lib/validators";
import posthog from "posthog-js";
import { CURRENT_VERSION } from "@/lib/changelog";
import { usePushNotification } from "@/hooks/usePushNotification";
import {
	updateUserClass,
	updateTbkDB,
	getUserClassAndTbkFromDB,
} from "@/actions/PushNotification";
import Link from "next/link";
import {
	BellOutlined,
	BellFilled,
	TeamOutlined,
	LockOutlined,
} from "@ant-design/icons";

interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: () => void;
	session: any;
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
			"Il sert égalment à gérer l'envoie des notifications",
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

const CLASSES = ["GIM1", "GIM2", "GIE1", "GIE2", "EXP", "Autre"] as PromoCode[];

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={onClick}
		className="ml-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-buttonSecondaryHover text-buttonTextSecondary text-xs font-semibold hover:bg-primary hover:text-white transition-colors"
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
	session,
}: SettingsDialogProps) {
	const [username, setUsername] = useState<string | null>("");
	const [tbkValue, setTbkValue] = useState<tbk>("Sibers");
	const [displayRUMenu, setDisplayRUMenu] = useState<boolean>(true);
	const [isGambling, setIsGambling] = useState(false);
	const [isOptedOut, setIsOptedOut] = useState(false);
	const [userClass, setUserClass] = useState("Autre");
	const { isSupported, isSubscribed, subscribe, unsubscribe } =
		usePushNotification();
	const [pushLoading, setPushLoading] = useState(false);
	const [tooltipKey, setTooltipKey] = useState<
		keyof typeof TOOLTIP_CONTENT | null
	>(null);
	const [error, setError] = useState<string | null>(null);

	const isUserLoggedIn = session?.isAuth && session?.username;

	useEffect(() => {
		if (!isOpen) return;

		const storedUser = localStorage.getItem("lise_id");
		if (storedUser) setUsername(storedUser);

		const storedTbk = localStorage.getItem("tbk");
		if (storedTbk) setTbkValue(storedTbk as tbk);

		const storedGambling = localStorage.getItem("gambling");
		if (storedGambling) setIsGambling(storedGambling === "true");

		const storedDisplayRUMenu = localStorage.getItem("display_ru_menu");
		if (storedDisplayRUMenu) setDisplayRUMenu(storedDisplayRUMenu === "true");

		if (posthog) {
			setIsOptedOut(posthog.has_opted_out_capturing());
		}

		// Sync with Database (Async)
		if (isUserLoggedIn) {
			setPushLoading(true);

			getUserClassAndTbkFromDB()
				.then((dbData) => {
					// Handle Class
					if (dbData?.class) {
						setUserClass(dbData.class);
					}

					// Handle TBK Logic
					if (dbData?.tbk) {
						// DB has data -> DB is always right
						setTbkValue(dbData.tbk as tbk);
						localStorage.setItem("tbk", dbData.tbk);
					} else if (storedTbk) {
						// DB is empty, but Local has data -> Sync Local to DB
						updateTbkDB(storedTbk as tbk);
					}
				})
				.catch((err) => console.error("Failed to sync settings:", err))
				.finally(() => setPushLoading(false));
		}
	}, [isOpen, isUserLoggedIn]);

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

	const handlePushToggle = async () => {
		setPushLoading(true);
		if (isSubscribed) {
			await unsubscribe();
		} else {
			const success = await subscribe();
			if (success && posthog.has_opted_in_capturing()) {
				posthog.capture("push_notifications_enabled", { class: userClass });
			}
		}
		setPushLoading(false);
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			role="dialog"
		>
			<div
				className="absolute inset-0 bg-black/40 backdrop-blur-sm"
				onClick={() => onClose()}
			/>

			<div className="relative bg-backgroundPrimary rounded-lg shadow-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg text-textPrimary font-semibold">Paramètres</h2>
					<Button status="secondary" onClick={() => onClose()}>
						✕
					</Button>
				</div>

				<div className="space-y-6">
					{/* --- ID Section --- */}
					<div className="space-y-2">
						<div className="flex items-center gap-1">
							<label className="font-medium text-textSecondary">
								Identifiant :
							</label>
							<TooltipIcon onClick={() => setTooltipKey("liseId")} />
						</div>
						<div className="flex items-center px-3 py-2 bg-backgroundSecondary rounded-lg focus-within:ring-1 focus-within:ring-primary-400">
							<input
								type="text"
								className="w-full bg-transparent focus:outline-none disabled:opacity-50"
								placeholder="2024-1234"
								value={username || ""}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>
						{isUserLoggedIn && username !== session.username && (
							<p className="text-[10px] text-badgeWarningText">
								Note: Vous êtes connecté en tant que {session.username}.
							</p>
						)}
					</div>

					{/* --- SOCIAL SECTION (Gated by Session) --- */}
					<div className="pt-4 border-t border-primary/10">
						<h3 className="text-xs font-bold text-textTertiary uppercase mb-3">
							Notifications
						</h3>

						{!isUserLoggedIn ? (
							<div className="flex flex-col items-center justify-center p-4 bg-backgroundSecondary/50 border border-dashed border-textTertiary/30 rounded-xl text-center gap-2">
								<LockOutlined className="text-xl text-textQuaternary" />
								<p className="text-sm text-textSecondary font-medium">
									Connectez-vous pour accéder <br />
									aux paramétres de notifications
								</p>
								<p className="text-xs text-textTertiary">
									Accédez à la page{" "}
									<Link
										href="/grades"
										className="text-primary"
										onClick={() => onClose()}
									>
										Mes Notes
									</Link>{" "}
									ou{" "}
									<Link
										href="/absences"
										className="text-primary"
										onClick={() => onClose()}
									>
										Mes Absences
									</Link>{" "}
									pour vous connecter.
								</p>
							</div>
						) : (
							<div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
								{/* Class Selector */}
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-primary">
										<TeamOutlined />
										<label className="font-medium text-textSecondary text-sm">
											Votre demi-promo :
										</label>
									</div>
									<select
										className="w-full rounded-lg border bg-backgroundSecondary px-3 py-2 border-primary-400 focus:outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
										value={userClass}
										onChange={(e) => setUserClass(e.target.value)}
										disabled={isSubscribed || pushLoading}
									>
										{CLASSES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
									<p className="text-[10px] text-textTertiary">
										{isSubscribed
											? "Désactivez les notifications pour changer de classe."
											: "Recevez une notif si better-lise pense qu'une nouvelle note est disponible"}
									</p>
								</div>

								{/* Push Toggle */}
								{isSupported && (
									<div
										className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors ${
											isSubscribed
												? "bg-primary-50 border-primary/30"
												: "bg-backgroundSecondary border-backgroundTertiary"
										}`}
									>
										<div className="flex items-center gap-3">
											<div
												className={`p-2 rounded-full ${
													isSubscribed
														? "bg-primary text-white"
														: "bg-textQuaternary/20 text-textQuaternary"
												}`}
											>
												{isSubscribed ? <BellFilled /> : <BellOutlined />}
											</div>
											<div className="flex flex-col">
												<span className="text-sm font-semibold text-textPrimary">
													Alertes Notes
												</span>
												<span className="text-[10px] text-textTertiary">
													{isSubscribed
														? "Vous êtes abonné"
														: "Soyez le premier au courant"}
												</span>
											</div>
										</div>
										<Button
											onClick={handlePushToggle}
											disabled={pushLoading}
											status={isSubscribed ? "secondary" : "primary"}
											className={`text-xs px-3 py-1.5 h-auto whitespace-nowrap ${
												isSubscribed
													? "text-error border-error/20 hover:bg-error/10 !text-error"
													: ""
											}`}
										>
											{pushLoading
												? "..."
												: isSubscribed
												? "Désactiver"
												: "Activer"}
										</Button>
									</div>
								)}
							</div>
						)}
					</div>

					{/* --- General Settings --- */}
					<div className="space-y-4 pt-4 border-t border-primary/10">
						<h3 className="text-xs font-bold text-textTertiary uppercase mb-1">
							Général
						</h3>
						<div className="flex items-center justify-between gap-4">
							<span className="font-medium text-textSecondary text-sm">
								Thème
							</span>
							<DarkModeToggle />
						</div>

						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-1">
								<label className="font-medium text-textSecondary text-sm">
									Tabagn'ss
								</label>
								<TooltipIcon onClick={() => setTooltipKey("tbk")} />
							</div>
							<select
								className="rounded-lg border bg-backgroundSecondary px-2 py-1 border-primary-400 text-sm w-32"
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

						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-1">
								<label className="font-medium text-textSecondary text-sm">
									Mode Casino
								</label>
								<TooltipIcon onClick={() => setTooltipKey("casino")} />
							</div>
							<input
								type="checkbox"
								checked={isGambling}
								onChange={handleGamblingToggle}
								className="h-5 w-5 rounded accent-buttonPrimaryBackground"
							/>
						</div>

						<div className="flex items-center justify-between gap-4">
							<label className="font-medium text-textSecondary text-sm">
								Afficher Menu RU
							</label>
							<input
								type="checkbox"
								checked={displayRUMenu}
								onChange={handleRuMenugToggle}
								className="h-5 w-5 rounded accent-buttonPrimaryBackground"
							/>
						</div>

						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-1">
								<label className="font-medium text-textSecondary text-sm">
									Stats anonymes
								</label>
								<TooltipIcon onClick={() => setTooltipKey("stats")} />
							</div>
							<input
								type="checkbox"
								checked={!isOptedOut}
								onChange={handleToggle}
								className="h-5 w-5 rounded accent-buttonPrimaryBackground"
							/>
						</div>
					</div>
				</div>

				<div className="mt-6 text-center text-sm flex flex-col gap-2">
					<button
						onClick={() => window.dispatchEvent(new Event("open-changelog"))}
						className="text-primary hover:text-primary-400 font-medium text-xs"
					>
						Version v{CURRENT_VERSION}
					</button>
					<a
						href="https://github.com/LouisChabanon/better-lise/blob/main/confidentialite.md"
						target="_blank"
						className="text-textTertiary hover:text-textPrimary underline text-xs"
					>
						Politique de confidentialité
					</a>
				</div>

				{error && (
					<div className="p-3 mt-4 bg-error-container border border-error/20 text-error rounded-lg text-xs text-center">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 mt-6">
					<Button status="secondary" onClick={() => onClose()}>
						Annuler
					</Button>
					<Button
						status="primary"
						onClick={() => {
							const cleanUsername = username?.trim() || "";
							if (!cleanUsername || !liseIdChecker(cleanUsername)) {
								setError("Identifiant Lise invalide.");
								return;
							}

							localStorage.setItem("lise_id", cleanUsername);
							localStorage.setItem("tbk", tbkValue);
							localStorage.setItem("gambling", isGambling.toString());
							localStorage.setItem("display_ru_menu", displayRUMenu.toString());

							// Save class only if logged in
							if (isUserLoggedIn) {
								localStorage.setItem("user_class", userClass as PromoCode);
								updateUserClass(userClass as PromoCode);
								updateTbkDB(tbkValue);
							}

							if (!isOptedOut) {
								posthog.identify(cleanUsername);
								posthog.people.set({
									tbk: tbkValue,
									gambling: isGambling,
									class: userClass,
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
					content={TOOLTIP_CONTENT[tooltipKey]}
					onClose={() => setTooltipKey(null)}
				/>
			)}
		</div>
	);
}
