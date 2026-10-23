"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

type Job = {
  id: string;
  externalUser: string;
  status: "pending" | "running" | "done" | "failed";
  stage: string | null;
  total: number;
  processed: number;
  matched: number;
  queued: number;
  unmatched: number;
  listensCreated: number;
  error: string | null;
  finishedAt: string | null;
};

const isActive = (job: Job | null) => job?.status === "pending" || job?.status === "running";

export function LastfmImportPanel({
  configured,
  importedCount,
  initialJob,
}: {
  configured: boolean;
  importedCount: number;
  initialJob: Job | null;
}) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(initialJob);
  const [username, setUsername] = useState(initialJob?.externalUser ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const jobId = job?.id;
  const active = isActive(job);

  useEffect(() => {
    if (!jobId || !active) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/import/jobs/${jobId}`);
      if (!res.ok || cancelled) return;
      const next: Job = await res.json();
      setJob(next);
      if (!isActive(next)) router.refresh();
    }, 1500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [jobId, active, router]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/import/lastfm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok) {
      setJob(data);
    } else if (res.status === 409 && data.job) {
      setJob(data.job);
    } else {
      setError(data.error ?? "Couldn't start the import");
    }
  }

  const pct = job && job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg font-medium">Last.fm</h2>
      {importedCount > 0 && (
        <p className="mb-3 text-xs text-muted">{importedCount} imported listens in your library.</p>
      )}

      {!configured ? (
        <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted">
          Last.fm import isn&rsquo;t set up on this server yet. Add a free API key from
          last.fm/api as <code className="text-foreground">LASTFM_API_KEY</code> in{" "}
          <code className="text-foreground">.env</code> and restart the app.
        </p>
      ) : (
        <form onSubmit={start} className="flex flex-col gap-2 sm:flex-row">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your Last.fm username"
            disabled={active}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={active || submitting || username.trim().length < 2}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Download size={14} />
            {job?.status === "done" ? "Import again" : "Import"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}

      {job && (
        <div className="mt-4 rounded-lg bg-background p-3">
          {active ? (
            <>
              <p className="flex items-center gap-2 text-sm text-foreground">
                <Loader2 size={14} className="animate-spin text-accent" />
                {job.stage ?? "Starting…"}
              </p>
              {job.total > 0 && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              )}
            </>
          ) : job.status === "failed" ? (
            <p className="text-sm text-accent">Import from @{job.externalUser} failed: {job.error}</p>
          ) : (
            <p className="text-sm text-foreground">Imported from @{job.externalUser}.</p>
          )}
          {(job.processed > 0 || job.status === "done") && (
            <p className="mt-2 text-xs text-muted">
              {job.matched} albums matched · {job.listensCreated} listens saved · {job.queued} need
              review · {job.unmatched} not in the catalog
            </p>
          )}
        </div>
      )}
    </section>
  );
}
