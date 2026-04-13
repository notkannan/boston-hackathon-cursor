import { SupportTickets } from "@/components/SupportTickets";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <a
            href="https://cursorboston.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            {/* Cursor logo mark */}
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="size-4 text-white">
                <path d="M13 3L4 14h8l-1 7 9-11h-8l1-7z" fill="currentColor" />
              </svg>
            </div>
            <span className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              Cursor Boston
            </span>
          </a>
          <span className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Support
          </span>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-linear-to-b from-accent/60 to-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
            How can we help?
          </h1>
          <p className="text-base text-muted-foreground max-w-lg">
            Questions about events, hackathon registration, Discord, or anything else — we&apos;re here.
          </p>
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <SupportTickets />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="max-w-2xl mx-auto px-6 h-12 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            © 2026 Cursor Boston
          </span>
          <a
            href="mailto:hello@cursorboston.com"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            hello@cursorboston.com
          </a>
        </div>
      </footer>
    </div>
  );
}
