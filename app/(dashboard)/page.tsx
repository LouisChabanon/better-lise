import DashboardLayout from '@/components/DashboardLayout';
import InstallAppBanner from '@/components/InstallBanner';
import { verifySession } from '@/lib/sessions';

export default async function DashboardPage() {
  // get server session if available so we can pass it to the client layout
  const session = await verifySession();

  return (
    <div className="flex items-start md:flex-row bg-backgroundSecondary min-h-0 p-0 xl:p-8 lg:p-4 md:h-screen">
      <div className="flex md:flex-row gap-8 w-full md:h-full md:min-h-0">
        <InstallAppBanner />
        {/* Always show the dashboard. DashboardLayout will handle showing a login modal when the user tries to access protected views. */}
        <DashboardLayout session={session} />
      </div>
    </div>
  );
}