import Agenda from '@/components/Agenda';
import { verifySession } from '@/lib/sessions';
import { LoginForm } from '@/components/LoginForm';
import { GradeTable } from '@/components/GradeTable';

export default async function DashboardPage() {

  const session = await verifySession();

  return (
    <div className="flex items-start md:flex-row bg-backgroundSecondary flex-grow p-0 md:p-8">
      <div className="flex flex-col md:flex-row gap-8 w-full">
          <div className="w-full md:w-2/3 flex flex-col sm:p-4 bg-backgroundPrimary rounded-lg shadow-lg">
            <Agenda />
          </div>
          {
            !session?.username ? (
                            <div className="md:w-1/3 flex items-center justify-center p-2 md:p-8">
                            <div className="max-w-md w-full bg-backgroundPrimary p-8 rounded-2xl shadow-lg">
                                <div className="flex flex-col items-center mb-6 text-center gap-2">
                                    <h2 className="text-3xl font-bold text-textPrimary">Connexion</h2>
                                    <p className="font-medium text-textTertiary">Utiliser vos identifiants Lise</p>
                                </div>
                                <LoginForm />
                            </div>
                        </div>
            ) :  
            <div id="grade-table" className="w-full md:w-1/3 flex flex-col p-4 bg-backgroundPrimary rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-textPrimary mb-4">Mes Notes</h2>
                <GradeTable />
            </div>
          }
      </div>
    </div>
  );
}