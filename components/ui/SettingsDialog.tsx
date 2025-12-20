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
	InfoCircleOutlined,
	CheckCircleFilled,
	WarningFilled,
	IdcardOutlined,
	AppstoreOutlined,
	ReadOutlined,
} from "@ant-design/icons";
import Link from "next/link";

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

// --- TEXTES ORIGINAUX (INCHANGÉS) ---
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

// --- COMPOSANTS UI ---

const SectionHeader = ({
	icon,
	title,
}: {
	icon: React.ReactNode;
	title: string;
}) => (
	<div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-3 mt-1">
		{icon} {title}
	</div>
);

const TooltipIcon = ({ onClick }: { onClick: () => void }) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onClick();
		}}
		className="ml-2 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-backgroundTertiary text-textTertiary hover:bg-primary hover:text-white transition-colors"
	>
		<InfoCircleOutlined className="text-[10px]" />
	</button>
);

const Switch = ({
	checked,
	onChange,
	disabled = false,
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	disabled?: boolean;
}) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={() => !disabled && onChange(!checked)}
		className={`
            relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-75
            ${checked ? "bg-primary" : "bg-backgroundTertiary"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
	>
		<span
			aria-hidden="true"
			className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
                ${checked ? "translate-x-5" : "translate-x-0"}
            `}
		/>
	</button>
);

const SettingRow = ({
	label,
	subLabel,
	action,
	tooltipKey,
	onTooltip,
	className = "",
}: any) => (
	<div
		className={`flex items-center justify-between p-3 bg-backgroundSecondary hover:bg-backgroundSecondary/80 transition-colors ${className}`}
	>
		<div className="flex items-center gap-2 overflow-hidden">
			<div className="flex flex-col">
				<div className="flex items-center">
					<span className="text-sm font-medium text-textPrimary">{label}</span>
					{tooltipKey && <TooltipIcon onClick={() => onTooltip(tooltipKey)} />}
				</div>
				{subLabel && (
					<span className="text-[10px] text-textTertiary leading-tight">
						{subLabel}
					</span>
				)}
			</div>
		</div>
		<div className="shrink-0 ml-4">{action}</div>
	</div>
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
	>
		<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
		<div
			className="relative bg-backgroundPrimary rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-primary/10 animate-in zoom-in-95 duration-200"
			onClick={(e) => e.stopPropagation()}
		>
			<h3 className="text-xl font-bold text-textPrimary mb-4 flex items-center gap-2">
				<InfoCircleOutlined className="text-primary" />
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
				<div className="mt-4 mb-4 aspect-video w-full rounded-lg overflow-hidden border border-backgroundTertiary shadow-sm">
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
			<Button status="secondary" onClick={onClose} className="w-full mt-4">
				Fermer
			</Button>
		</div>
	</div>
);

// --- MAIN COMPONENT ---

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

	const [tooltipKey, setTooltipKey] = useState<
		keyof typeof TOOLTIP_CONTENT | null
	>(null);
	const [pushLoading, setPushLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { isSupported, isSubscribed, subscribe, unsubscribe } =
		usePushNotification();
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

		const storedClass = localStorage.getItem("user_class");
		if (storedClass) setUserClass(storedClass);

		if (posthog) setIsOptedOut(posthog.has_opted_out_capturing());

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

	const handlePushToggle = async (checked: boolean) => {
		setPushLoading(true);
		try {
			if (!checked) {
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

	const handleSaveWrapper = () => {
		const cleanUsername = username?.trim() || "";
		if (!cleanUsername || !liseIdChecker(cleanUsername)) {
			setError("Identifiant Lise invalide (format 20xx-xxxx).");
			return;
		}

		setError(null);
		localStorage.setItem("lise_id", cleanUsername);
		localStorage.setItem("tbk", tbkValue);
		localStorage.setItem("user_class", userClass);
		localStorage.setItem("gambling", isGambling.toString());
		localStorage.setItem("display_ru_menu", displayRUMenu.toString());

		if (isUserLoggedIn) {
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
			<div
				className="absolute inset-0 bg-black/60 transition-opacity"
				onClick={() => onClose()}
			/>

			<div className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[85vh] sm:max-w-lg bg-backgroundPrimary sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:fade-in duration-200">
				{/* HEADER */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 shrink-0 bg-backgroundPrimary z-10">
					<h2 className="text-xl font-bold text-textPrimary">Paramètres</h2>
					<Button
						status="secondary"
						onClick={onClose}
						className="!p-2 h-8 w-8 flex items-center justify-center rounded-full"
					>
						✕
					</Button>
				</div>

				{/* BODY */}
				<div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
					{/* 1. COMPTE */}
					<section>
						<SectionHeader icon={<UserOutlined />} title="Compte" />
						<div className="space-y-4">
							{/* Identifiant */}
							<div>
								<div className="flex items-center mb-1">
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
									<p className="text-[10px] text-amber-500 mt-1 font-medium flex items-center gap-1">
										<WarningFilled /> Connecté en tant que {session.username}
									</p>
								)}
							</div>

							{/* Profil Académique */}
							<div>
								<SectionHeader
									icon={<IdcardOutlined />}
									title="Profil Académique"
								/>

								<div className="grid grid-cols-2 gap-4">
									{/* Demi-Promo */}
									<div>
										<label className="text-sm font-medium text-textSecondary block mb-1">
											Demi-Promo
										</label>
										<select
											value={userClass}
											onChange={(e) => setUserClass(e.target.value)}
											disabled={isSubscribed || pushLoading}
											className="w-full px-3 py-3 bg-backgroundSecondary rounded-xl border border-transparent outline-none disabled:opacity-50"
										>
											{CLASSES.map((c) => (
												<option key={c} value={c}>
													{c}
												</option>
											))}
										</select>
									</div>

									{/* Tabagn'ss */}
									<div>
										<div className="flex items-center mb-1">
											<label className="text-sm font-medium text-textSecondary block">
												Tabagn'ss
											</label>
											<div
												onClick={(e) => {
													e.stopPropagation();
													setTooltipKey("tbk");
												}}
												className="ml-1 text-textTertiary cursor-pointer hover:text-primary"
											>
												<InfoCircleOutlined style={{ fontSize: 10 }} />
											</div>
										</div>
										<select
											value={tbkValue}
											onChange={(e) => setTbkValue(e.target.value as tbk)}
											disabled={isSubscribed || pushLoading}
											className="w-full px-3 py-3 bg-backgroundSecondary rounded-xl border border-transparent outline-none disabled:opacity-50"
										>
											{TBK_OPTIONS.map((c) => (
												<option key={c} value={c}>
													{c}
												</option>
											))}
										</select>
									</div>
								</div>
								{isSubscribed && (
									<p className="text-[10px] text-textTertiary mt-2 leading-tight">
										<LockOutlined /> Désactivez les notifs pour changer.
									</p>
								)}
							</div>
						</div>
					</section>

					{/* 2. APPLICATION - Notifications */}
					<section>
						<SectionHeader icon={<BellFilled />} title="Notifications" />
						<div
							className={`
                            relative overflow-hidden rounded-xl border transition-all duration-300
                            ${
															!isUserLoggedIn
																? "bg-backgroundSecondary border-transparent opacity-90"
																: isSubscribed
																? "bg-primary/5 border-primary/40"
																: "bg-backgroundSecondary border-transparent"
														}
                        `}
						>
							{/* LOCKED OVERLAY */}
							{!isUserLoggedIn && (
								<div className="absolute inset-0 bg-backgroundSecondary/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-4">
									<LockOutlined className="text-xl text-textTertiary mb-2" />
									<p className="text-xs font-medium text-textSecondary">
										Connectez-vous pour activer les alertes.
									</p>
								</div>
							)}

							<div className="p-4">
								<div className="flex justify-between items-start mb-2">
									<div className="flex items-center gap-2">
										<h4 className="font-semibold text-textPrimary">
											Alertes de notes
										</h4>
										<TooltipIcon
											onClick={() => setTooltipKey("notifications")}
										/>
									</div>
									<Switch
										checked={isSubscribed}
										onChange={handlePushToggle}
										disabled={!isUserLoggedIn || pushLoading || !isSupported}
									/>
								</div>

								<p className="text-xs text-textTertiary leading-relaxed pr-8">
									[BETA] Recevez une notif quand better-lise pense qu'une
									nouvelle note existe pour{" "}
									<span className="font-bold">{userClass}</span> à{" "}
									<span className="font-bold">{tbkValue}</span>.
								</p>

								{isSubscribed && isUserLoggedIn && (
									<div className="mt-3 flex items-center gap-2 text-[10px] text-primary bg-primary/10 px-3 py-2 rounded-lg">
										<CheckCircleFilled />
										<span>
											Active pour {userClass} à {tbkValue}.
										</span>
									</div>
								)}
							</div>
						</div>
					</section>

					{/* 3. INTERFACE */}
					<section>
						<SectionHeader icon={<AppstoreOutlined />} title="Interface" />
						<div className="rounded-xl overflow-hidden divide-y divide-backgroundTertiary/50 border border-transparent">
							<SettingRow
								className="first:rounded-t-xl"
								label="Mode Sombre"
								action={<DarkModeToggle />}
							/>
							<SettingRow
								label="Mode Casino"
								subLabel="Animations 'Loot Box' pour les notes"
								tooltipKey="casino"
								onTooltip={setTooltipKey}
								action={
									<Switch checked={isGambling} onChange={setIsGambling} />
								}
							/>
							<SettingRow
								className="last:rounded-b-xl"
								label="Menu RU dans l'agenda"
								subLabel="Afficher le repas du midi"
								action={
									<Switch checked={displayRUMenu} onChange={setDisplayRUMenu} />
								}
							/>
						</div>
					</section>

					{/* 4. SYSTEME */}
					<section className="pb-4">
						<SectionHeader icon={<GlobalOutlined />} title="Système" />
						<div className="bg-backgroundSecondary rounded-xl overflow-hidden mb-6">
							<SettingRow
								label="Statistiques Anonymes"
								subLabel="Envoyer des données d'utilisation"
								tooltipKey="stats"
								onTooltip={setTooltipKey}
								action={
									<Switch
										checked={!isOptedOut}
										onChange={(v) => setIsOptedOut(!v)}
									/>
								}
							/>
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

						<div className="text-center pt-2 mt-4">
							<button
								onClick={() =>
									window.dispatchEvent(new Event("open-changelog"))
								}
								className="text-xs text-textTertiary hover:text-primary transition-colors block mx-auto mb-1 hover:underline"
							>
								Better Lise v{CURRENT_VERSION}
							</button>
							<a
								href="https://github.com/LouisChabanon/better-lise/wiki/Privacy-Policy"
								target="_blank"
								className="text-xs text-primary hover:underline block mb-2"
							>
								Politique de confidentialité
							</a>
							<p className="text-[10px] text-textQuaternary">
								Usiné à Siber'ss par Modo 4! Me223. 2025. <br />
								Hébergé gracieusement par{" "}
								<Link
									href="https://iresam.org"
									target="_blank"
									className="hover:underline"
								>
									IRESAM
								</Link>
								.
							</p>
						</div>
					</section>
				</div>

				{/* FOOTER */}
				<div className="p-4 bg-backgroundPrimary border-t border-primary/10 shrink-0 pb-safe">
					{error && (
						<div className="mb-3 p-2 bg-error/10 border border-error/20 text-error rounded-lg text-xs text-center font-medium">
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

			{/* INFO MODAL */}
			{tooltipKey && (
				<TooltipModal
					content={TOOLTIP_CONTENT[tooltipKey]}
					onClose={() => setTooltipKey(null)}
				/>
			)}
		</div>
	);
}
