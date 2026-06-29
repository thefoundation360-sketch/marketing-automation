import { PageHeader, Card, CardHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

type Integration = {
  name: string;
  description: string;
  envVars: string[];
};

const INTEGRATIONS: Integration[] = [
  {
    name: "Supabase",
    description: "Database & auth",
    envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  { name: "Stripe", description: "Payments & revenue", envVars: ["STRIPE_SECRET_KEY"] },
  { name: "Resend", description: "Transactional email", envVars: ["RESEND_API_KEY"] },
  {
    name: "Twilio",
    description: "SMS messaging",
    envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
  },
];

export default function SettingsPage() {
  const status = INTEGRATIONS.map((i) => ({
    ...i,
    connected: i.envVars.every((v) => !!process.env[v]),
  }));

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Integrations and business configuration"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Integrations" />
          <ul className="divide-y divide-mecca-border">
            {status.map((i) => (
              <li
                key={i.name}
                className="flex items-center justify-between px-5 py-4"
              >
                <div>
                  <div className="text-sm font-medium text-mecca-mist">
                    {i.name}
                  </div>
                  <div className="text-xs text-mecca-muted">{i.description}</div>
                </div>
                {i.connected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-mecca-border bg-mecca-panel px-2.5 py-0.5 text-xs font-medium text-mecca-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-mecca-muted" />
                    Not configured
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Business Profile" />
          <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Field label="Business" value="Sync Master" />
            <Field label="Brand" value="Foundation Mecca" />
            <Field label="Owner" value="Admin" />
            <Field label="Timezone" value="America/New_York" />
          </dl>
          <div className="border-t border-mecca-border px-5 py-4 text-xs text-mecca-muted">
            Profile editing and team management are coming in a later release.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mecca-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-mecca-mist">{value}</dd>
    </div>
  );
}
