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
import {
	BellFilled,
	LockOutlined,
	GithubOutlined,
	MailOutlined,
	UserOutlined,
	SettingOutlined,
	GlobalOutlined,
	ReadOutlined,
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

const CLASSES = ["GIM1", "GIM2", "GIE1", "GIE2", "Autre"];

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
			"Cela permet d'afficher le bon menu du Crous directement sur votre emploi du temps (si disponible).",
		],
	},
	casino: {
		title: "Mode Casino",
		description: [
			"Au lieu de voir vos notes directement, elles seront cachées derrière un mini-jeu type caisse CS:GO.",
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
	notifications: {
		title: "Notifications",
		description: [
			"Recevez une notification lorsque un autre utilisateur de la même demi-promo et du même TBK reçoit une nouvelle note",
			"L'envoie de la notification ne s'effectue que si un utilisateur se connecte et télécharge une nouvelle note depuis Lise",
			"Il est possible de recevoir des notifications pour des notes qui ne vous concerne pas (ex: LV1, LV2, note de TP etc...)",
		],
	},
};

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick();
		}}
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
		<div className="absolute inset-0 bg-black/40" />
		<div
			className="relative bg-backgroundPrimary rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto border border-primary/20 animate-in zoom-in-95 duration-200"
			onClick={(e) => e.stopPropagation()}
		>
			<h3 className="text-xl font-semibold text-textPrimary mb-4">
				{content.title}
			</h3>
			{content.description.map((paragraph: string, index: number) => (
				<p
					key={index}
					className="text-textSecondary mb-2 last:mb-0 text-sm leading-relaxed"
				>
					{paragraph}
				</p>
			))}
			{"videoSrc" in content && content.videoSrc && (
				<div className="mt-4 mb-4 aspect-video w-full rounded-lg overflow-hidden border border-backgroundTertiary">
					<video
						width="100%"
						height="100%"
						autoPlay
						muted
						loop
						playsInline
						className="w-full h-full object-cover"
					>
						<source src={content.videoSrc} type="video/mp4" />
					</video>
				</div>
			)}
			<Button status="primary" onClick={onClose} className="w-full mt-4">
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
	// --- STATE MANAGEMENT ---
	const [username, setUsername] = useState<string | null>("");
	const [tbkValue, setTbkValue] = useState<tbk>("Sibers");
	const [displayRUMenu, setDisplayRUMenu] = useState<boolean>(true);
	const [isGambling, setIsGambling] = useState(false);
	const [isOptedOut, setIsOptedOut] = useState(false);
	const [userClass, setUserClass] = useState("Autre");
	const [tooltipKey, setTooltipKey] = useState<
		keyof typeof TOOLTIP_CONTENT | null
	>(null);

	const { isSupported, isSubscribed, subscribe, unsubscribe } =
		usePushNotification();
	const [pushLoading, setPushLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isUserLoggedIn = session?.isAuth && session?.username;

	// --- INITIALIZATION ---
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

		if (isUserLoggedIn) {
			getUserClassAndTbkFromDB().then((dbData) => {
				if (dbData?.class) setUserClass(dbData.class);
				if (dbData?.tbk) {
					setTbkValue(dbData.tbk as tbk);
					localStorage.setItem("tbk", dbData.tbk);
				} else if (storedTbk) {
					updateTbkDB(storedTbk as tbk);
				}
			});
		}
	}, [isOpen, isUserLoggedIn]);

	if (!isOpen) return null;

	// --- HANDLERS ---
	const handlePushToggle = async () => {
		setPushLoading(true);
		try {
			if (isSubscribed) {
				await unsubscribe();
			} else {
				const success = await subscribe();
				if (success && posthog.has_opted_in_capturing()) {
					posthog.capture("push_notifications_enabled", { class: userClass });
				}
			}
		} catch (e) {
			console.error(e);
		} finally {
			setPushLoading(false);
		}
	};

	const handleClose = () => {
		const cleanUsername = username?.trim() || "";
		if (!cleanUsername || !liseIdChecker(cleanUsername)) {
			setError("Identifiant Lise invalide (format 20xx-xxxx).");
			return;
		}
		setError(null);
		onClose();
	};

	const handleSaveWrapper = () => {
		const cleanUsername = username?.trim() || "";
		if (!cleanUsername || !liseIdChecker(cleanUsername)) {
			setError("Identifiant Lise invalide (format 20xx-xxxx).");
			return;
		}

		setError(null);
		localStorage.setItem("lise_id", cleanUsername);
		localStorage.setItem("tbk", tbkValue);
		localStorage.setItem("gambling", isGambling.toString());
		localStorage.setItem("display_ru_menu", displayRUMenu.toString());

		if (isUserLoggedIn) {
			localStorage.setItem("user_class", userClass);
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
		isOptedOut ? posthog.opt_out_capturing() : posthog.opt_in_capturing();

		onSave();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center isolate">
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/60 transition-opacity"
				onClick={handleClose}
			/>

			{/* CONTAINER
			 */}
			<div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-backgroundPrimary sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:fade-in duration-200">
				{/* --- 1. HEADER (Fixed) --- */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 shrink-0 bg-backgroundPrimary z-10">
					<h2 className="text-xl font-bold text-textPrimary">Paramètres</h2>
					<Button
						status="secondary"
						onClick={handleClose}
						className="!p-2 h-8 w-8 flex items-center justify-center rounded-full"
					>
						✕
					</Button>
				</div>

				{/* --- 2. SCROLLABLE BODY --- */}
				<div className="flex-1 overflow-y-auto p-6 space-y-8">
					{/* Section: Compte */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
							<UserOutlined /> Compte
						</div>

						<div className="space-y-1">
							<div className="flex items-center">
								<label className="text-sm font-medium text-textSecondary">
									Identifiant Lise
								</label>
								<TooltipIcon onClick={() => setTooltipKey("liseId")} />
							</div>

							<input
								type="text"
								className="w-full px-4 py-3 bg-backgroundSecondary rounded-xl border border-transparent focus:border-primary focus:bg-backgroundPrimary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
								placeholder="20xx-xxxx"
								value={username || ""}
								onChange={(e) => setUsername(e.target.value)}
							/>
							{isUserLoggedIn && username !== session.username && (
								<p className="text-[10px] text-amber-600 mt-1">
									⚠️ Connecté en tant que {session.username}
								</p>
							)}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-medium text-textSecondary block mb-1">
									Votre Demi-Promo
								</label>

								<select
									className="w-full px-3 py-3 bg-backgroundSecondary rounded-xl border border-transparent outline-none disabled:opacity-50"
									value={userClass}
									onChange={(e) => setUserClass(e.target.value)}
									disabled={!isUserLoggedIn || isSubscribed}
								>
									{CLASSES.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
								{!isUserLoggedIn && (
									<p className="text-[10px] p-1 text-textTertiary">
										<LockOutlined /> Connectez-vous pour changer de demi-promo
									</p>
								)}
								{isSubscribed && isUserLoggedIn && (
									<p className="text-[10px] p-1 text-textTertiary">
										<LockOutlined /> Désactivez les notifications pour changer
										de demi-promo
									</p>
								)}
							</div>
							<div>
								<div className="flex items-center">
									<label className="text-sm font-medium text-textSecondary block mb-1">
										Tabagn'ss
									</label>
									<TooltipIcon onClick={() => setTooltipKey("tbk")} />
								</div>

								<select
									className="w-full px-3 py-3 bg-backgroundSecondary rounded-xl border border-transparent outline-none"
									value={tbkValue}
									onChange={(e) => setTbkValue(e.target.value as tbk)}
								>
									{TBK_OPTIONS.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</div>
						</div>
					</section>

					{/* Section: App & Notifications */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
							<SettingOutlined /> Application
						</div>

						{/* Notification Card */}
						<div
							className={`p-4 rounded-xl border transition-all ${
								isSubscribed
									? "bg-primary/5 border-primary/30"
									: "bg-backgroundSecondary border-transparent"
							}`}
						>
							<div className="flex justify-between items-center mb-2">
								<div className="flex items-center gap-2 font-semibold text-textPrimary">
									<BellFilled
										className={
											isSubscribed ? "text-primary" : "text-textQuaternary"
										}
									/>
									<div className="flex items-center">
										Notifications
										<TooltipIcon
											onClick={() => setTooltipKey("notifications")}
										/>
									</div>
								</div>
								{isUserLoggedIn && isSupported && (
									<div
										onClick={handlePushToggle}
										className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${
											isSubscribed ? "bg-primary" : "bg-gray-300"
										}`}
									>
										<div
											className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
												isSubscribed ? "translate-x-4" : ""
											}`}
										/>
									</div>
								)}
							</div>
							<p className="text-xs text-textTertiary leading-relaxed">
								{!isUserLoggedIn
									? "Connectez-vous pour activer les alertes de notes."
									: "[BETA] Recevez une notif quand better-lise pense qu'une nouvelle note existe."}
							</p>
						</div>

						{/* Toggles List */}
						<div className="bg-backgroundSecondary rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
							<div className="flex items-center justify-between p-4">
								<span className="text-sm font-medium text-textSecondary">
									Mode Sombre
								</span>
								<DarkModeToggle />
							</div>
							<div className="flex items-center justify-between p-4">
								<div className="flex items-center">
									<span className="text-sm font-medium text-textSecondary">
										Mode Casino
									</span>
									<TooltipIcon onClick={() => setTooltipKey("casino")} />
								</div>

								<input
									type="checkbox"
									checked={isGambling}
									onChange={() => setIsGambling(!isGambling)}
									className="w-5 h-5 accent-primary"
								/>
							</div>
							<div className="flex items-center justify-between p-4">
								<span className="text-sm font-medium text-textSecondary">
									Menu RU dans l'agenda
								</span>
								<input
									type="checkbox"
									checked={displayRUMenu}
									onChange={() => setDisplayRUMenu(!displayRUMenu)}
									className="w-5 h-5 accent-primary"
								/>
							</div>
							<div className="flex items-center justify-between p-4">
								<div className="flex items-center">
									<span className="text-sm font-medium text-textSecondary">
										Stats Anonymes
									</span>
									<TooltipIcon onClick={() => setTooltipKey("stats")} />
								</div>
								<input
									type="checkbox"
									checked={!isOptedOut}
									onChange={() => setIsOptedOut(!isOptedOut)}
									className="w-5 h-5 accent-primary"
								/>
							</div>
						</div>
					</section>

					{/* Section: Support */}
					<section className="space-y-4 pb-4">
						<div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
							<GlobalOutlined /> Support
						</div>
						<div className="grid grid-cols-3 gap-3">
							<a
								href="https://github.com/LouisChabanon/better-lise"
								target="_blank"
								className="flex flex-col items-center justify-center p-3 bg-backgroundSecondary rounded-xl hover:bg-backgroundTertiary transition-colors text-textSecondary"
								onClick={() =>
									posthog.has_opted_in_capturing()
										? posthog.capture("github_click_event")
										: ""
								}
							>
								<GithubOutlined className="text-xl mb-1" />
								<span className="text-xs font-medium">Code Source</span>
							</a>
							<a
								href="https://github.com/LouisChabanon/better-lise/wiki"
								target="_blank"
								className="flex flex-col items-center justify-center p-3 bg-backgroundSecondary rounded-xl hover:bg-backgroundTertiary transition-colors text-textSecondary"
								onClick={() =>
									posthog.has_opted_in_capturing()
										? posthog.capture("wiki_click_event")
										: ""
								}
							>
								<ReadOutlined className="text-xl mb-1" />
								<span className="text-xs font-medium">Wiki</span>
							</a>
							<a
								href="mailto:louis.chabanon@gadz.org"
								className="flex flex-col items-center justify-center p-3 bg-backgroundSecondary rounded-xl hover:bg-backgroundTertiary transition-colors text-textSecondary"
								onClick={() =>
									posthog.has_opted_in_capturing()
										? posthog.capture("mail_click_event")
										: ""
								}
							>
								<MailOutlined className="text-xl mb-1" />
								<span className="text-xs font-medium">Signaler un bug</span>
							</a>
						</div>
						<div className="flex justify-center pt-2">
							<div className="text-center flex flex-col">
								<button
									className="text-xs text-textTertiary cursor-pointer hover:underline"
									onClick={() =>
										window.dispatchEvent(new Event("open-changelog"))
									}
								>
									Better Lise v{CURRENT_VERSION}
								</button>
								<a
									href="https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy"
									target="_blank"
									className="text-xs text-primary hover:underline"
								>
									Politique de confidentialité
								</a>
							</div>
						</div>
						<div className="text-center">
							<p className="text-textTertiary text-xs">
								Usiné à Siber'ss par Modo 4! Me223. 2025.
							</p>
						</div>
					</section>
				</div>

				{/* --- 3. STICKY FOOTER --- */}
				<div className="p-4 bg-backgroundPrimary border-t border-primary/10 shrink-0 pb-safe">
					{error && (
						<div className="mb-3 p-3 bg-error-container border border-error/20 text-error rounded-xl text-sm text-center font-medium animate-in slide-in-from-bottom-2">
							{error}
						</div>
					)}
					<div className="grid grid-cols-2 gap-3">
						<Button
							status="secondary"
							onClick={onClose}
							className="w-full justify-center"
						>
							Annuler
						</Button>
						<Button
							status="primary"
							onClick={handleSaveWrapper}
							className="w-full justify-center"
						>
							Enregistrer
						</Button>
					</div>
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
