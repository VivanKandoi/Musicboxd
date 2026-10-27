import Image from "next/image";
import TiltedCard from "@/components/reactbits/TiltedCard";
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
  getAlbumPopularTags,
} from "@/lib/queries";
import { StarRating } from "@/components/star-rating";
import { LogForm } from "@/components/log-form";
import { ActivityItem } from "@/components/activity-item";
import { TrackRatingRow } from "@/components/track-rating-row";
import { AddToListButton } from "@/components/add-to-list-button";
import { ShareToDmButton } from "@/components/share-to-dm-button";
import { CustomCoverControl } from "@/components/custom-cover-control";
import { applyCustomCovers, hasEntitlement } from "@/lib/entitlements";

// Search links rather than exact IDs: the catalogue doesn't store streaming identifiers.
function listenLinks(title: string, artist: string) {
  const q = encodeURIComponent(`${artist} ${title}`);
  return [
    { label: "Spotify", href: `https://open.spotify.com/search/${q}` },
    { label: "Apple Music", href: `https://music.apple.com/search?term=${q}` },
    { label: "YouTube Music", href: `https://music.youtube.com/search?q=${q}` },
  ];
}

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function AlbumPage({ params, searchParams }: PageProps<"/album/[id]">) {
  const { id } = await params;
  const openLogForm = (await searchParams).log === "1";
  const session = await auth();
  const album = await getAlbumDetail(id);
  if (!album) notFound();

  const [{ avgRating, ratingCount }, distribution, reviews, trackRatings, popularTags] =
    await Promise.all([
      getAlbumRatingSummary(id),
      getAlbumRatingDistribution(id),
      getAlbumReviews(id, session?.user?.id ?? null),
      getAlbumTrackRatings(id, session?.user?.id ?? null),
      getAlbumPopularTags(id),
    ]);

  const viewerId = session?.user?.id;
  const [userActivity, canCustomize] = await Promise.all([
    viewerId ? getUserAlbumActivity(viewerId, id) : null,
    hasEntitlement(viewerId, "custom_covers"),
  ]);
  const catalogCover = album.coverUrl;
  await applyCustomCovers(viewerId, [album], (a) => a);
  await applyCustomCovers(viewerId, reviews, (log) => log.album);
  const hasCustomCover = album.coverUrl !== catalogCover;

  return (
    <div className="flex flex-col gap-8">
      <section className="relative isolate rounded-3xl border border-border bg-surface">
        {album.coverUrl && (
          <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
            <Image
              src={album.coverUrl}
              alt=""
              fill
              sizes="100vw"
              className="scale-125 object-cover opacity-45 blur-3xl saturate-150 [[data-mode=light]_&]:opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/75 to-surface/20" />
          </div>
        )}
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-end sm:gap-8 sm:p-8">
          <div className="flex w-full max-w-[260px] shrink-0 flex-col gap-2 self-center sm:self-auto">
            <div className="relative aspect-square w-full drop-shadow-2xl">
              <TiltedCard
                containerHeight="100%"
                containerWidth="100%"
                imageHeight="100%"
                imageWidth="100%"
                radius={14}
                rotateAmplitude={10}
                scaleOnHover={1.04}
                showTooltip={false}
                flipOnClick={false}
                gyroscope={false}
                intro={false}
              >
                <div className="absolute inset-0 rounded-[14px] bg-surface-2 ring-1 ring-inset ring-border" />
                {album.coverUrl && (
                  <Image src={album.coverUrl} alt={album.title} fill priority sizes="260px" className="object-cover" />
                )}
              </TiltedCard>
            </div>
            {canCustomize && <CustomCoverControl albumId={album.id} hasCustomCover={hasCustomCover} />}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Album{album.releaseDate && ` · ${new Date(album.releaseDate).getFullYear()}`}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{album.title}</h1>
              <Link
                href={`/artist/${album.artistId}`}
                className="mt-1 inline-block text-base font-medium text-foreground/80 hover:text-accent hover:underline"
              >
                {album.artist.name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="flex items-center gap-2">
                <StarRating value={avgRating} readOnly />
                <span className="text-muted">
                  {avgRating ? (
                    <>
                      <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span>
                      {` · ${ratingCount} ${ratingCount === 1 ? "rating" : "ratings"}`}
                    </>
                  ) : (
                    "No ratings yet"
                  )}
                </span>
              </span>
              {trackRatings.ratedTrackCount > 0 && (
                <span className="text-xs text-muted">
                  Tracks avg {trackRatings.albumTrackRating?.toFixed(1)}★ from {trackRatings.ratedTrackCount}{" "}
                  {trackRatings.ratedTrackCount === 1 ? "song" : "songs"}
                </span>
              )}
            </div>

            {album.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {album.genres.map(({ genre }) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-border bg-background/50 px-2.5 py-0.5 text-[11px] font-medium text-muted backdrop-blur"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {session?.user ? (
                <>
                  <LogForm
                    albumId={album.id}
                    hasLoggedBefore={(userActivity?.timesLogged ?? 0) > 0}
                    defaultOpen={openLogForm}
                    album={{ title: album.title, artist: album.artist.name, coverUrl: album.coverUrl }}
                  />
                  <span className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1.5">
                    <AddToListButton albumId={album.id} />
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1.5">
                    <ShareToDmButton sharedAlbumId={album.id} label="Share" />
                  </span>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  Log in to log this album
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Play size={12} />
                Listen on
              </span>
              {listenLinks(album.title, album.artist.name).map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-background/40 px-2.5 py-1 transition-colors hover:border-accent hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {userActivity && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-medium text-foreground">Your Log Activity</h2>
            <div className="flex flex-wrap gap-8">
              {(userActivity.timesLogged > 0 || !userActivity.lastfm) && (
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {userActivity.timesLogged}
                  </p>
                  <p className="text-xs text-muted">Times Logged</p>
                </div>
              )}
              {userActivity.lastfm && (
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {userActivity.lastfm.plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">Plays on Last.fm</p>
                </div>
              )}
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
            {userActivity.lastfm && (
              <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted">
                Play count imported from your Last.fm listening history
                {userActivity.lastfm.lastPlayed
                  ? ` · last played ${userActivity.lastfm.lastPlayed.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    })}`
                  : ""}
                . It isn&rsquo;t counted as a log.
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
          {popularTags.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs text-muted">Popular listening contexts</p>
              <div className="flex flex-wrap gap-1.5">
                {popularTags.map((t) => (
                  <span
                    key={t.name}
                    className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] text-muted"
                  >
                    #{t.name} · {t.count}
                  </span>
                ))}
              </div>
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
                viewerId={session?.user?.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
