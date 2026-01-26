"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
	CloseOutlined,
	ShareAltOutlined,
	PlusSquareOutlined,
	DownloadOutlined,
	MobileOutlined,
} from "@ant-design/icons";
import posthog from "posthog-js";

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallPrompt() {
	const [isVisible, setIsVisible] = useState(false);
	const [platform, setPlatform] = useState<
		"ios" | "android" | "desktop" | null
	>(null);
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);

	useEffect(() => {
		// Check if already in standalone mode
		const isStandalone =
			window.matchMedia("(display-mode: standalone)").matches ||
			(window.navigator as any).standalone === true;

		if (isStandalone) {
			return;
		}

		// Check verification in localStorage
		const hasDismissed = localStorage.getItem("pwa_install_dismissed");
		if (hasDismissed) {
			// Optional: Check if enough time has passed to show again (e.g. 7 days)
			return;
		}

		const userAgent = window.navigator.userAgent.toLowerCase();
		if (/iphone|ipad|ipod/.test(userAgent)) {
			setPlatform("ios");
			setIsVisible(true);
			if (posthog.has_opted_in_capturing()) {
				posthog.capture("pwa_install_prompt_shown", { platform: "ios" });
			}
		} else if (/android/.test(userAgent)) {
			setPlatform("android");
			// For Android, we wait for the beforeinstallprompt event
		}
	}, []);

	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			// Prevent the mini-infobar from appearing on mobile
			e.preventDefault();

			// detailed check for android to avoid showing on desktop chrome unless specific requirement
			// using the platform state we verified earlier or just assuming if event fires it's installable
			const userAgent = window.navigator.userAgent.toLowerCase();
			const isMobile = /android|iphone|ipad|ipod/.test(userAgent);

			// Only show if mobile (or if we want to support desktop PWA install too, but user asked for phone desktop)
			// The prompt specifically asked for "phone desktop on IOS and Android"
			if (isMobile) {
				setDeferredPrompt(e as BeforeInstallPromptEvent);
				setPlatform("android"); // Ensure android is set if event fires
				setIsVisible(true);

				if (posthog.has_opted_in_capturing()) {
					posthog.capture("pwa_install_prompt_shown", { platform: "android" });
				}
			}
		};

		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener(
				"beforeinstallprompt",
				handleBeforeInstallPrompt
			);
		};
	}, []);

	const handleDismiss = () => {
		setIsVisible(false);
		localStorage.setItem("pwa_install_dismissed", "true");
		if (posthog.has_opted_in_capturing()) {
			posthog.capture("pwa_install_prompt_dismissed", { platform });
		}
	};

	const handleInstallClick = async () => {
		if (!deferredPrompt) return;

		// Show the install prompt
		deferredPrompt.prompt();

		// Wait for the user to respond to the prompt
		const { outcome } = await deferredPrompt.userChoice;

		if (outcome === "accepted") {
			if (posthog.has_opted_in_capturing()) {
				posthog.capture("pwa_install_prompt_accepted", { platform: "android" });
			}
			setIsVisible(false);
		} else {
			if (posthog.has_opted_in_capturing()) {
				posthog.capture("pwa_install_prompt_dismissed", {
					platform: "android",
					reason: "native_prompt_cancelled",
				});
			}
		}

		setDeferredPrompt(null);
	};

	if (!isVisible) return null;

	return (
		<AnimatePresence>
			{isVisible && (
				<m.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96"
				>
					<div className="bg-backgroundPrimary border border-border rounded-xl shadow-2xl p-4 relative overflow-hidden">
						{/* Gradient Border Accent */}
						<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-primary-600" />

						<button
							onClick={handleDismiss}
							className="absolute top-2 right-2 text-textTertiary hover:text-textPrimary transition-colors p-1"
							aria-label="Close"
						>
							<CloseOutlined />
						</button>

						<div className="flex items-start gap-4 pt-2">
							<div className="h-12 w-12 bg-primary-container rounded-xl flex items-center justify-center text-primary text-xl flex-shrink-0">
								<MobileOutlined />
							</div>

							<div className="flex-1">
								<h3 className="font-bold text-textPrimary text-base mb-1">
									Installer Better Lise
								</h3>
								<p className="text-textSecondary text-sm mb-4">
									Pour une meilleure expérience, installez l'application sur
									votre écran d'accueil.
								</p>

								{platform === "ios" && (
									<div className="flex flex-col gap-2 text-sm text-textSecondary bg-backgroundSecondary/50 p-3 rounded-lg">
										<div className="flex items-center gap-2">
											<span className="flex items-center justify-center w-6 h-6 bg-backgroundPrimary rounded shadow-sm text-primary">
												<ShareAltOutlined />
											</span>
											<span>
												Appuyez sur{" "}
												<span className="font-semibold">Partager</span>
											</span>
										</div>
										<div className="flex items-center gap-2">
											<span className="flex items-center justify-center w-6 h-6 bg-backgroundPrimary rounded shadow-sm text-primary">
												<PlusSquareOutlined />
											</span>
											<span>
												Sélectionnez{" "}
												<span className="font-semibold">
													Sur l'écran d'accueil
												</span>
											</span>
										</div>
									</div>
								)}

								{platform === "android" && (
									<button
										onClick={handleInstallClick}
										className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
									>
										<DownloadOutlined />
										Installer maintenant
									</button>
								)}
							</div>
						</div>
					</div>
				</m.div>
			)}
		</AnimatePresence>
	);
}
