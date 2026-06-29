import Link from "next/link";
import { getActivity, type ActivityItem } from "@/lib/data";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { IconMail, IconBookings, IconBolt, IconLeads } from "@/components/icons";

const KIND_ICON: Record<ActivityItem["kind"], React.ReactNode> = {
  message: <IconMail className="h-3.5 w-3.5" />,
  booking: <IconBookings className="h-3.5 w-3.5" />,
  sequence: <IconBolt className="h-3.5 w-3.5" />,
  lead: <IconLeads className="h-3.5 w-3.5" />,
};

export default async function ActivityFeed() {
  const items = await getActivity(10);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Recent Activity" />
      {items.length === 0 ? (
        <EmptyState>No activity yet.</EmptyState>
      ) : (
        <ul className="flex-1 divide-y divide-mecca-border">
          {items.map((item) => {
            const body = (
              <div className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mecca-gold/10 text-mecca-gold">
                  {KIND_ICON[item.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-mecca-mist">{item.title}</div>
                  {item.detail && (
                    <div className="truncate text-xs text-mecca-muted">
                      {item.detail}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-mecca-muted">
                  {timeAgo(item.at)}
                </span>
              </div>
            );
            return (
              <li key={item.id} className="transition hover:bg-mecca-cardhover">
                {item.href ? <Link href={item.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
