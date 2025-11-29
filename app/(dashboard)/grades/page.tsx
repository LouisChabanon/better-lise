import GradeTableWrapper from "@/components/GradeTableWrapper";
import ProtectedView from "@/components/ProtectedView";
import { verifySession } from "@/lib/sessions";

export const metadata = {
  title: 'Mes Notes',
};

export default async function GradesPage() {
  const session = await verifySession();

  return (
    <ProtectedView session={session} title="Mes Notes">
        <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">
                Mes Notes
            </h2>
            <GradeTableWrapper session={session} />
        </div>
    </ProtectedView>
  );
}