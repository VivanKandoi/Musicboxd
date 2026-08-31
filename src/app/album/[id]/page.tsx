import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAlbumDetail,
  getAlbumRatingSummary,
  getAlbumReviews,
} from "@/lib/queries";
import { StarRating } from "@/components/star-rating";
import { LogForm } from "@/components/log-form";
import { ActivityItem } from "@/components/activity-item";

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

  const [{ avgRating, ratingCount }, reviews] = await Promise.all([
    getAlbumRatingSummary(id),
    getAlbumReviews(id, session?.user?.id ?? null),
  ]);

  const hasLoggedBefore = session?.user
    ? Boolean(
        await prisma.log.findFirst({
          where: { userId: session.user.id, albumId: id },
        })
      )
    : false;

  return (
    <div className="flex flex-col gap-8">
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
                ` · ${new Date(album.releaseDate).getFullYear()}`}
            </p>
          </div>

          {album.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {album.genres.map(({ genre }) => (
                <span
                  key={genre.id}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted"
                >
                  {genre.name}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <StarRating value={avgRating} readOnly />
            <span className="text-sm text-muted">
              {avgRating ? avgRating.toFixed(1) : "No ratings yet"}
              {ratingCount > 0 && ` (${ratingCount})`}
            </span>
          </div>

          {session?.user ? (
            <div className="mt-2">
              <LogForm albumId={album.id} hasLoggedBefore={hasLoggedBefore} />
            </div>
          ) : (
            <p className="text-sm text-muted">
              <a href="/login" className="text-accent hover:underline">
                Log in
              </a>{" "}
              to log this album.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-medium">Tracklist</h2>
          <ol className="flex flex-col gap-1">
            {album.tracks.map((track) => (
              <li
                key={track.id}
                className="flex justify-between border-b border-border py-1.5 text-sm last:border-0"
              >
                <span className="text-foreground">
                  <span className="mr-2 text-muted">{track.trackNumber}.</span>
                  {track.title}
                </span>
                <span className="text-muted">
                  {formatDuration(track.durationSec)}
                </span>
              </li>
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
