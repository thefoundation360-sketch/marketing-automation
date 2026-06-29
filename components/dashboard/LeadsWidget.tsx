import { getDashboardStats } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { Card, CardHeader, StatTile, LinkButton } from "@/components/ui";
import { IconLeads, IconChevronRight } from "@/components/icons";

export default async function LeadsWidget() {
  const stats = await getDashboardStats();

  return (
    <Card>
      <CardHeader
        title="Leads"
        icon={<IconLeads className="h-[18px] w-[18px]" />}
        action={
          <LinkButton href="/leads" variant="ghost">
            View all <IconChevronRight className="h-4 w-4" />
          </LinkButton>
        }
      />
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
        <StatTile label="New this week" value={stats.newLeadsThisWeek} accent />
        <StatTile label="In pipeline" value={stats.leadsInPipeline} />
        <StatTile
          label="Conversion rate"
          value={formatPercent(stats.conversionRate)}
        />
      </div>
    </Card>
  );
}
