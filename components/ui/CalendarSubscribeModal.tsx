"use client";
import { useEffect, useMemo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import posthog from "posthog-js";
import {
	CalendarOutlined,
	AppleOutlined,
	GoogleOutlined,
	CopyOutlined,
	CheckOutlined,
	CloseOutlined,
} from "@ant-design/icons";
import { Button } from "./Button";
import crousData from "@/crous_data.json";
import { liseIdChecker } from "@/lib/validators";

const COPY_FEEDBACK_MS = 2000;

interface CalendarSubscribeModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type SubscribeTarget = "webcal" | "google" | "copy";

function trackSubscribe(target: SubscribeTarget, includeRu: boolean) {
	if (posthog?.has_opted_in_capturing()) {
		posthog.capture("calendar_subscribe_clicked", { target, includeRu });
	}
}

export default function CalendarSubscribeModal({
	isOpen,
	onClose,
}: CalendarSubscribeModalProps) {
	const [liseId, setLiseId] = useState<string | null>(null);
	const [tbk, setTbk] = useState<string>("Sibers");
	const [includeRu, setIncludeRu] = useState(false);
	const [copied, setCopied] = useState(false);

	// Settings may change while the modal is closed, re-read them on open
	useEffect(() => {
		if (!isOpen) return;
		setLiseId(localStorage.getItem("lise_id"));
		setTbk(localStorage.getItem("tbk") || "Sibers");
		setIncludeRu(localStorage.getItem("display_ru_menu") === "true");
		setCopied(false);
		if (posthog?.has_opted_in_capturing()) {
			posthog.capture("calendar_subscribe_opened");
		}
	}, [isOpen]);

	const hasCrous = crousData.CrousData.some((item) => item.tbk === tbk);
	const isValidId = liseId !== null && liseIdChecker(liseId);

	const urls = useMemo(() => {
		if (!isValidId || typeof window === "undefined") return null;
		const query = includeRu && hasCrous ? `?ru=${encodeURIComponent(tbk)}` : "";
		const path = `${window.location.host}/api/calendar/${liseId}.ics${query}`;
		const webcal = `webcal://${path}`;
		return {
			https: `${window.location.protocol}//${path}`,
			webcal,
			google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
		};
	}, [isValidId, liseId, includeRu, hasCrous, tbk]);

	const handleCopy = async () => {
		if (!urls) return;
		try {
			await navigator.clipboard.writeText(urls.https);
			setCopied(true);
			trackSubscribe("copy", includeRu);
			setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
		} catch {
			// Clipboard can be blocked (permissions, insecure context): let the
			// user select the visible URL manually instead.
			setCopied(false);
		}
	};

	const linkBase =
		"flex items-center justify-center gap-2 w-full font-medium rounded-lg px-5 py-2.5 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-colors";

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<m.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/60"
						onClick={onClose}
					/>
					<m.div
						role="dialog"
						aria-modal="true"
						aria-labelledby="calendar-subscribe-title"
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="relative bg-backgroundPrimary w-full max-w-md rounded-2xl border border-primary/20 overflow-hidden flex flex-col"
					>
						<div className="relative bg-backgroundSecondary p-6 border-b border-backgroundTertiary">
							<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300" />
							<div className="flex justify-between items-start">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-primary text-xl">
										<CalendarOutlined />
									</div>
									<div>
										<h2
											id="calendar-subscribe-title"
											className="text-xl font-bold text-textPrimary"
										>
											S&apos;abonner à l&apos;agenda
										</h2>
										<p className="text-xs text-textTertiary font-medium">
											l&apos;emploi du temps Better-Lise dans ton appli
											calendrier
										</p>
									</div>
								</div>
								<button
									onClick={onClose}
									aria-label="Fermer"
									className="text-textTertiary hover:text-textPrimary transition-colors"
								>
									<CloseOutlined />
								</button>
							</div>
						</div>

						<div className="p-6 space-y-4">
							{!urls ? (
								<p className="text-sm text-textSecondary">
									Renseigne d&apos;abord ton identifiant Lise dans les
									paramètres pour générer ton lien d&apos;abonnement.
								</p>
							) : (
								<>
									{hasCrous && (
										<label className="flex items-center gap-3 text-sm text-textSecondary cursor-pointer">
											<input
												type="checkbox"
												checked={includeRu}
												onChange={(e) => setIncludeRu(e.target.checked)}
												className="h-4 w-4 accent-primary"
											/>
											Inclure le menu du RU ({tbk})
										</label>
									)}

									<a
										href={urls.webcal}
										onClick={() => trackSubscribe("webcal", includeRu)}
										className={`${linkBase} text-buttonTextPrimary bg-buttonPrimaryBackground hover:bg-buttonPrimaryHover`}
									>
										<AppleOutlined /> S&apos;abonner (Apple / Outlook)
									</a>
									<a
										href={urls.google}
										target="_blank"
										rel="noopener noreferrer"
										onClick={() => trackSubscribe("google", includeRu)}
										className={`${linkBase} bg-buttonBackgroundSecondary text-buttonTextSecondary hover:bg-buttonSecondaryHover border border-buttonSecondaryBorder`}
									>
										<GoogleOutlined /> Ajouter à Google Agenda
									</a>

									<div className="flex items-center gap-2">
										<input
											readOnly
											value={urls.https}
											onFocus={(e) => e.target.select()}
											aria-label="Lien d'abonnement"
											className="flex-1 min-w-0 text-xs bg-backgroundSecondary text-textSecondary border border-backgroundTertiary rounded-lg px-3 py-2.5"
										/>
										<Button status="secondary" onClick={handleCopy}>
											{copied ? <CheckOutlined /> : <CopyOutlined />}
										</Button>
									</div>
									{copied && (
										<p className="text-xs text-primary" role="status">
											Lien copié
										</p>
									)}
								</>
							)}
						</div>
					</m.div>
				</div>
			)}
		</AnimatePresence>
	);
}
