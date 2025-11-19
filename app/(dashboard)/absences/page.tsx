import AbsencesStats from "@/components/AbsencesStats";
import { AbsencesTable } from "@/components/AbsencesTable";
import ProtectedView from "@/components/ProtectedView";
import { verifySession } from "@/lib/sessions";

export const metadata = {
  title: 'Mes Absences',
};

export default async function AbsencesPage() {
  const session = await verifySession();

  return (
    <ProtectedView session={session} title="Mes Absences">
        <div className="flex flex-col h-full gap-4">
            <AbsencesStats session={session} />
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                 <AbsencesTable session={session} />
            </div>
        </div>
    </ProtectedView>
  );
}