import { getRevenue } from "@/lib/stripe";
import { formatCurrency } from "@/lib/format";
import { Card, CardHeader, StatTile, Badge } from "@/components/ui";
import { IconRevenue } from "@/components/icons";

export default async function RevenueWidget() {
  const rev = await getRevenue();
  const delta = rev.lastMonth
    ? (rev.thisMonth - rev.lastMonth) / rev.lastMonth
    : 0;
  const up = delta >= 0;

  return (
    <Card>
      <CardHeader
        title="Revenue"
        icon={<IconRevenue className="h-[18px] w-[18px]" />}
        action={
          <Badge
            className={
              rev.live
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-mecca-border bg-mecca-panel text-mecca-muted"
            }
          >
            {rev.live ? "Stripe · live" : "Sample data"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
        <StatTile
          label="This month"
          value={formatCurrency(rev.thisMonth)}
          accent
          hint={
            <span className={up ? "text-emerald-400" : "text-red-400"}>
              {up ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}% vs last month
            </span>
          }
        />
        <StatTile
          label="Last month"
          value={formatCurrency(rev.lastMonth)}
        />
        <StatTile label="All time" value={formatCurrency(rev.allTime)} />
      </div>
    </Card>
  );
}
