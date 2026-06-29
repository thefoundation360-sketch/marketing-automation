import { getLeads } from "@/lib/data";
import { PageHeader, Card, CardHeader } from "@/components/ui";
import RevenueWidget from "@/components/dashboard/RevenueWidget";
import LeadsWidget from "@/components/dashboard/LeadsWidget";
import ClientsWidget from "@/components/dashboard/ClientsWidget";
import PipelineBoard from "@/components/dashboard/PipelineBoard";
import TodayView from "@/components/dashboard/TodayView";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const leads = await getLeads();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your sync coaching business at a glance."
      />

      {/* Top row: revenue + leads stats */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RevenueWidget />
        <LeadsWidget />
      </div>

      {/* Pipeline board */}
      <div className="mt-5">
        <Card>
          <CardHeader
            title="Pipeline"
            action={
              <span className="text-xs text-mecca-muted">
                Drag a card to move stages
              </span>
            }
          />
          <div className="p-4">
            <PipelineBoard initialLeads={leads} />
          </div>
        </Card>
      </div>

      {/* Bottom: clients, today, activity */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ClientsWidget />
        <TodayView />
        <ActivityFeed />
      </div>
    </div>
  );
}
