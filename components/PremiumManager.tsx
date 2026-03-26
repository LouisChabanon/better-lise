"use client";

import { useEffect, useState } from "react";
import PremiumModal from "@/components/ui/PremiumModal";
import posthog from "posthog-js";
import { redirect } from "next/navigation";

export default function PremiumManager() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleManualOpen = () => setIsOpen(true);
		window.addEventListener("open-premium-modal", handleManualOpen);
		return () => window.removeEventListener("open-premium-modal", handleManualOpen);
	}, []);

	useEffect(() => {
		const hasSeen = localStorage.getItem("premium_april_fools_seen");

		if (!hasSeen) {
			const timer = setTimeout(() => {
				setIsOpen(true);
				if (posthog?.has_opted_in_capturing()) {
					posthog?.capture("premium_april_fools_auto_open");
				}
			}, 2500); // Pop up after a short delay
			return () => clearTimeout(timer);
		}
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		localStorage.setItem("premium_april_fools_seen", "true");
	};

	return <PremiumModal isOpen={isOpen} onClose={handleClose} />;
}
