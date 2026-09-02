import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import {
  getAlbumDetail,
  getAlbumRatingSummary,
  getAlbumRatingDistribution,
  getUserAlbumActivity,
  getAlbumReviews,
  getAlbumTrackRatings,
} from "@/lib/queries";
import { StarRating } from "@/components/star-rating";
import { LogForm } from "@/components/log-form";
import { ActivityItem } from "@/components/activity-item";
import { TrackRatingRow } from "@/components/track-rating-row";

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function AlbumPage({ params }: PageProps<"/album/[id]">) {
  const { id } = await params;
  const session = await auth();
  const album = await getAlbumDetail(id);
  if (!album) notFound();

  const [{ avgRating, ratingCount }, distribution, reviews, trackRatings] = await Promise.all([
    getAlbumRatingSummary(id),
    getAlbumRatingDistribution(id),
    getAlbumReviews(id, session?.user?.id ?? null),
    getAlbumTrackRatings(id, session?.user?.id ?? null),
  ]);

  const userActivity = session?.user
    ? await getUserAlbumActivity(session.user.id, id)
    : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border">
            {album.coverUrl && (
              <Image
                src={album.coverUrl}
                alt={album.title}
                fill
                sizes="220px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {album.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {album.genres.map(({ genre }) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{album.title}</h1>
              <p className="text-muted">
                <Link
                  href={`/artist/${album.artistId}`}
                  className="hover:text-accent hover:underline"
                >
                  {album.artist.name}
                </Link>
                {album.releaseDate &&
                  ` · Album: ${new Date(album.releaseDate).getFullYear()}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StarRating value={avgRating} readOnly />
              <span className="text-sm text-muted">
                {avgRating ? avgRating.toFixed(1) : "No ratings yet"}
                {ratingCount > 0 && ` (${ratingCount})`}
              </span>
            </div>

            {trackRatings.ratedTrackCount > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={trackRatings.albumTrackRating} readOnly size="sm" />
                <span className="text-xs text-muted">
                  Track rating: {trackRatings.albumTrackRating?.toFixed(1)} (from{" "}
                  {trackRatings.ratedTrackCount} rated{" "}
                  {trackRatings.ratedTrackCount === 1 ? "song" : "songs"})
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled
                title="Playback not available"
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted opacity-70"
              >
                <Play size={14} />
                Play Track
              </button>
              {session?.user ? (
                <LogForm albumId={album.id} hasLoggedBefore={(userActivity?.timesLogged ?? 0) > 0} />
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  Log in to log this album
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {userActivity && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium text-foreground">Your Log Activity</h2>
            <div className="flex gap-8">
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {userActivity.timesLogged}
                </p>
                <p className="text-xs text-muted">Times Logged</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-2xl font-semibold text-foreground">
                  {userActivity.latestRating ? (
                    <>
                      <span className="text-star">★</span>
                      {userActivity.latestRating}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-xs text-muted">Your Personal Rating</p>
              </div>
            </div>
            {userActivity.latestNote && (
              <p className="mt-3 border-t border-border pt-3 text-xs italic text-muted">
                &ldquo;{userActivity.latestNote}&rdquo;
              </p>
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-3 text-sm font-medium text-foreground">Community Sentiment</h2>
          <div className="mb-3 flex gap-8">
            <div>
              <p className="text-2xl font-semibold text-success">
                {avgRating ? avgRating.toFixed(1) : "—"}
                <span className="text-sm text-muted"> / 5</span>
              </p>
              <p className="text-xs text-muted">Average Rating</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{ratingCount}</p>
              <p className="text-xs text-muted">Total Ratings</p>
            </div>
          </div>
          {ratingCount > 0 && (
            <div className="flex flex-col gap-1.5">
              {distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-2">{d.star}★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-star"
                      style={{ width: `${d.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Tracklist</h2>
          <ol className="flex flex-col">
            {album.tracks.map((track) => (
              <TrackRatingRow
                key={track.id}
                trackId={track.id}
                title={track.title}
                trackNumber={track.trackNumber}
                duration={formatDuration(track.durationSec)}
                initialAvg={trackRatings.ratingByTrack[track.id]?.avg ?? null}
                initialCount={trackRatings.ratingByTrack[track.id]?.count ?? 0}
                initialMyRating={trackRatings.myRatingByTrack[track.id] ?? null}
                isAuthenticated={Boolean(session?.user)}
              />
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">Credits</h2>
          <ul className="flex flex-col gap-1.5">
            {album.credits.map((credit) => (
              <li key={credit.id} className="text-sm">
                <Link
                  href={`/people/${encodeURIComponent(credit.name)}`}
                  className="text-foreground hover:text-accent hover:underline"
                >
                  {credit.name}
                </Link>{" "}
                <span className="text-muted">— {credit.role}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/discover"
            className="mt-5 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-muted hover:border-accent/70"
          >
            <Sparkles size={14} className="shrink-0 text-accent" />
            Explore mood-based recommendations like this on Discover
          </Link>
        </section>
      </div>

      <section>
        <h2 className="mb-1 text-lg font-medium">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet — be the first.</p>
        ) : (
          <div>
            {reviews.map((log) => (
              <ActivityItem
                key={log.id}
                log={log}
                isAuthenticated={Boolean(session?.user)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
