export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-mecca-gold/40 px-4 py-1 text-xs uppercase tracking-[0.2em] text-mecca-gold">
        Foundation Mecca
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Sync Master CRM
      </h1>
      <p className="max-w-xl text-balance text-mecca-slate/80">
        Business CRM and client management system for the Sync Master music
        coaching program. Project scaffold and database schema are ready.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        {["Leads", "Clients", "Sequences", "Bookings", "Messages"].map(
          (table) => (
            <span
              key={table}
              className="rounded-lg border border-mecca-ink/10 bg-white px-4 py-2 font-medium shadow-sm"
            >
              {table}
            </span>
          )
        )}
      </div>
    </main>
  );
}
