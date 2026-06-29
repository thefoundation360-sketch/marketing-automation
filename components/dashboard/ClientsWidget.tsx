import Link from "next/link";
import { getActiveClientRows } from "@/lib/data";
import { PROGRAM_LABELS, PROGRAM_MODULES } from "@/lib/constants";
import { Card, CardHeader, Avatar, EmptyState } from "@/components/ui";
import { IconClients, IconChevronRight } from "@/components/icons";

export default async function ClientsWidget() {
  const rows = await getActiveClientRows();

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={`Active Clients · ${rows.length}`}
        icon={<IconClients className="h-[18px] w-[18px]" />}
        action={
          <Link
            href="/clients"
            className="text-xs font-medium text-mecca-gold hover:underline"
          >
            All clients
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState>No active clients yet.</EmptyState>
      ) : (
        <ul className="divide-y divide-mecca-border">
          {rows.map(({ client, name }) => {
            const total = client.program_enrolled
              ? PROGRAM_MODULES[client.program_enrolled]
              : 0;
            const pct = total ? (client.modules_unlocked / total) * 100 : 0;
            return (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition hover:bg-mecca-cardhover"
                >
                  <Avatar name={name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-mecca-mist">
                        {name}
                      </span>
                      <span className="shrink-0 text-xs text-mecca-muted">
                        {client.program_enrolled
                          ? PROGRAM_LABELS[client.program_enrolled]
                          : "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mecca-panel">
                        <div
                          className="h-full rounded-full bg-mecca-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11px] text-mecca-muted">
                        Module {client.current_module}/{total || "—"}
                      </span>
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-mecca-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
