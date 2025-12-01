import AchievementsClientPage from "@/components/AchievementsPage";
import ProtectedView from "@/components/ProtectedView";
import { verifySession } from "@/lib/sessions";

export const metadata = {
	title: "Mes Succès",
};

export default async function AchievementsPage() {
	const session = await verifySession();

	return (
		<ProtectedView session={session} title="Mes Sucèss">
			<AchievementsClientPage />
		</ProtectedView>
	);
}
