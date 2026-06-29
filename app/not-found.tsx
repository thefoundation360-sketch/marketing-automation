import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl font-bold text-mecca-gold">404</div>
      <p className="mt-3 text-mecca-muted">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-mecca-gold px-4 py-2 text-sm font-semibold text-mecca-black hover:bg-mecca-goldsoft"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
