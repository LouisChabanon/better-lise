"use client";
import Agenda from "./Agenda";
import { useState } from "react";
import SettingsDialog from "./ui/SettingsDialog";

export default function AgendaWrapper({ session }: { session: any }) {
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<>
			<Agenda onSettingsClick={() => setSettingsOpen(true)} />
			<SettingsDialog
				isOpen={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				onSave={() => setSettingsOpen(false)}
				session={session}
			/>
		</>
	);
}
