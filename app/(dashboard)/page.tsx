import AgendaWrapper from "@/components/AgendaWrapper";
import { verifySession } from "@/lib/sessions";

export default async function AgendaPage() {
	const session = await verifySession();

	return <AgendaWrapper session={session} />;
}
