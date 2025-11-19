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
    <div className="flex items-start md:flex-row bg-backgroundSecondary min-h-0 p-0 xl:p-8 lg:p-4 md:h-screen">
      <div className="flex md:flex-row gap-8 w-full md:h-full md:min-h-0">
        <InstallAppBanner />
        <AppSidebar session={session}>
            {children}
        </AppSidebar>
      </div>
    </div>
  );
}