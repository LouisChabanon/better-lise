import DashboardClientContainer from '@/components/DashBoardClientContainer';
import { verifySession } from '@/lib/sessions';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {

  const session = await verifySession();

  if (!session.username){
    redirect('/login');
  }




  return (
    <div className="flex items-start md:flex-row bg-surface flex-grow p-0 md:p-8">
      <div className="flex flex-col md:flex-row gap-8 w-full">
        <DashboardClientContainer />
      </div>
    </div>
  );
}