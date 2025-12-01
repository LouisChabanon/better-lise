"use client";

import { useEffect, useState } from "react";
import ChangelogModal from "@/components/ui/ChangelogModal";
import { CURRENT_VERSION } from "@/lib/changelog";
import posthog from "posthog-js";

export default function ChangelogManager() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		const handleManualOpen = () => setIsOpen(true);
		window.addEventListener("open-changelog", handleManualOpen);
		return () => window.removeEventListener("open-changelog", handleManualOpen);
	}, []);

	useEffect(() => {
		const lastSeenVersion = localStorage.getItem("changelog_last_seen");

		if (lastSeenVersion !== CURRENT_VERSION) {
			const timer = setTimeout(() => {
				setIsOpen(true);
				if (posthog.has_opted_in_capturing()) {
					posthog.capture("changelog_auto_open", { version: CURRENT_VERSION });
				}
			}, 1500);
			return () => clearTimeout(timer);
		}
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		localStorage.setItem("changelog_last_seen", CURRENT_VERSION);
	};

	return <ChangelogModal isOpen={isOpen} onClose={handleClose} />;
}
