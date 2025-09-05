import DashboardClientContainer from '@/components/DashBoardClientContainer';
import Agenda from '@/components/Agenda';
import { verifySession } from '@/lib/sessions';
import { LoginForm } from '@/components/LoginForm';

export default async function DashboardPage() {

  const session = await verifySession();

  return (
    <div className="flex items-start md:flex-row bg-surface flex-grow p-0 md:p-8">
      <div className="flex flex-col md:flex-row gap-8 w-full">
          <div className="w-full md:w-2/3 flex flex-col sm:p-4 bg-white rounded-lg shadow-lg">
            <Agenda />
          </div>
          {
            !session?.username ? (
                            <div className="md:w-1/3 flex items-center justify-center p-2 md:p-8">
                            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg">
                                <div className="flex flex-col items-center mb-6 text-center gap-2">
                                    <h2 className="text-3xl font-bold text-primary">Connexion</h2>
                                    <p className="font-medium text-gray-600">Utiliser vos identifiants Lise</p>
                                </div>
                                <LoginForm />
                            </div>
                        </div>
            ) : <DashboardClientContainer />
          }
      </div>
    </div>
  );
}