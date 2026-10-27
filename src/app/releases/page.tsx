import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarDays, PartyPopper } from "lucide-react";
import { auth } from "@/lib/auth";
import { getReleaseCalendar } from "@/lib/release-calendar";
import { applyCustomCovers } from "@/lib/entitlements";

type CalendarAlbum = {
  id: string;
  title: string;
  coverUrl: string | null;
  releaseDate: Date | null;
  releaseGroupType: string;
  artist: { id: string; name: string };
};

const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

function groupByMonth(albums: CalendarAlbum[]) {
  const groups = new Map<string, CalendarAlbum[]>();
  for (const a of albums) {
    const key = fmt(a.releaseDate!, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.entries()];
}

export default async function ReleasesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/releases");

  const calendar = await getReleaseCalendar(session.user.id);
  await Promise.all([
    applyCustomCovers(session.user.id, calendar.upcoming, (a) => a),
    applyCustomCovers(session.user.id, calendar.recent, (a) => a),
    applyCustomCovers(session.user.id, calendar.anniversaries, (a) => a),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
          <CalendarDays size={24} className="text-accent" />
          Release calendar
        </h1>
        <p className="mt-1 text-sm text-muted">
          New and upcoming releases from artists you follow, plus milestone anniversaries of albums you
          rated highly. You&rsquo;ll get a notification on release day.
        </p>
      </div>

      {calendar.anniversaries.length > 0 && (
        <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <PartyPopper size={15} className="text-accent" />
            Anniversaries this month
          </h2>
          <ul className="flex flex-col gap-2">
            {calendar.anniversaries.map((a) => (
              <li key={a.id} className="text-sm">
                <Link href={`/album/${a.id}`} className="font-medium text-foreground hover:text-accent">
                  {a.title}
                </Link>{" "}
                <span className="text-muted">
                  by {a.artist.name} turns {a.years} on {fmt(a.releaseDate!, { month: "long", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {calendar.followedArtists.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-foreground">You&rsquo;re not following any artists yet.</p>
          <p className="mt-1 text-xs text-muted">
            Use &ldquo;Follow artist&rdquo; on an artist page to see their releases here.
          </p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-medium">Coming up</h2>
            {calendar.upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nothing announced yet from the artists you follow.</p>
            ) : (
              groupByMonth(calendar.upcoming).map(([month, albums]) => (
                <div key={month} className="mb-4">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{month}</h3>
                  <ReleaseList albums={albums} />
                </div>
              ))
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-medium">Out recently</h2>
            {calendar.recent.length === 0 ? (
              <p className="text-sm text-muted">No releases in the last 60 days.</p>
            ) : (
              <ReleaseList albums={calendar.recent} showLog />
            )}
          </section>

          <p className="text-xs text-muted">
            Following:{" "}
            {calendar.followedArtists.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ", "}
                <Link href={`/artist/${a.id}`} className="hover:text-accent">
                  {a.name}
                </Link>
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
}

function ReleaseList({ albums, showLog = false }: { albums: CalendarAlbum[]; showLog?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {albums.map((a) => (
        <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <div className="w-12 shrink-0 text-center">
            <p className="text-lg font-semibold leading-none text-foreground">{fmt(a.releaseDate!, { day: "numeric" })}</p>
            <p className="text-[10px] uppercase text-muted">{fmt(a.releaseDate!, { month: "short" })}</p>
          </div>
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
            {a.coverUrl && <Image src={a.coverUrl} alt={a.title} fill sizes="48px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/album/${a.id}`} className="truncate text-sm font-medium text-foreground hover:text-accent">
              {a.title}
            </Link>
            <p className="truncate text-xs text-muted">
              <Link href={`/artist/${a.artist.id}`} className="hover:text-foreground">
                {a.artist.name}
              </Link>
              {a.releaseGroupType !== "Album" && ` · ${a.releaseGroupType}`}
            </p>
          </div>
          {showLog && (
            <Link
              href={`/album/${a.id}?log=1`}
              className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground"
            >
              Log it
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
