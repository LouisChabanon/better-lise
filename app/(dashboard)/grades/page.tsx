import GradeTableWrapper from "@/components/GradeTableWrapper";
import ProtectedView from "@/components/ProtectedView";
import { verifySession } from "@/lib/sessions";

export const metadata = {
  title: 'Mes Notes',
};

export default async function GradesPage() {
  const session = await verifySession();
  
  // We need to pass the gambling state. 
  // Since gambling is stored in localStorage (Client Side), 
  // GradeTable handles reading it. We just need to ensure GradeTable 
  // is a client component (it is).

  return (
    <ProtectedView session={session} title="Mes Notes">
        <div className="flex flex-col h-full">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">
                Mes Notes
            </h2>
            {/* Note: The GradeTable component in your source expects `gambling` prop.
                However, gambling state is client-side (localStorage).
                You should update GradeTable to read localStorage internally or wrap it 
                in a client component that reads it.
            */}
            <GradeTableWrapper session={session} />
        </div>
    </ProtectedView>
  );
}