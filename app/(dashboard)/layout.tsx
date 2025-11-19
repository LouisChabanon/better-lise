import AppSidebar from '@/components/AppSidebar';
import InstallAppBanner from '@/components/InstallBanner';
import { verifySession } from '@/lib/sessions';

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();

  return (
    <div className="flex items-start md:flex-row bg-backgroundSecondary min-h-0 p-0 xl:p-8 lg:p-4 h-full">
      <div className="flex md:flex-row gap-8 w-full h-full md:min-h-0">
        <AppSidebar session={session}>
            {children}
        </AppSidebar>
      </div>
    </div>
  );
}