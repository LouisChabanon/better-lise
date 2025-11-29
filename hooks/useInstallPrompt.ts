import { useEffect, useState } from "react";

export default function useInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
	const [isInstallable, setIsInstallable] = useState(false);

	useEffect(() => {
		const handler = (e: Event) => {
			e.preventDefault(); // Prevent default prompt
			setDeferredPrompt(e);
			setIsInstallable(true);
		};

		window.addEventListener("beforeinstallprompt", handler);

		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);

	return { deferredPrompt, isInstallable };
}
