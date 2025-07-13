import { Typography} from 'antd';
import { getGradeData } from '@/actions/GetGrades';
import DashboardClientContainer from '@/components/DashBoardClientContainer';
import { verifySession } from '@/lib/sessions';
import { redirect } from 'next/navigation';



interface PageProps{
  searchParams: {
    reload?: string;
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {

  const { reload } = await searchParams;

  console.log("Reload parameter:", reload);

  const session = await verifySession();

  if (!session.username){
    redirect('/login');
  }

  const data = await getGradeData(reload === 'true');
  
  if (!data.success || !data.data) {
    return (
      <Typography style={{ textAlign: 'center', marginTop: '20px' }}>
        {data.errors || "Une erreur s'est produite lors de la récupération des notes."}
      </Typography>
    );
  }


  return (
    <div className="flex items-start md:flex-row bg-surface flex-grow p-0 md:p-8">
      <div className="flex flex-col md:flex-row gap-8 w-full">
        <DashboardClientContainer gradeData={data} />
      </div>
    </div>
  );
}