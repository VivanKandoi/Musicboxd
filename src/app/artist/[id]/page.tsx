import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getArtistDetail } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { FollowArtistButton } from "@/components/follow-artist-button";

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function ArtistPage({ params }: PageProps<"/artist/[id]">) {
  const { id } = await params;
  const [artist, session] = await Promise.all([getArtistDetail(id), auth()]);
  if (!artist) notFound();
  const isFollowing = session?.user
    ? Boolean(
        await prisma.artistFollow.findUnique({
          where: { userId_artistId: { userId: session.user.id, artistId: artist.id } },
        })
      )
    : false;
  const today = new Date();
  const upcoming = artist.albums.filter((a) => a.releaseDate && a.releaseDate > today);

  const albums = artist.albums.filter(
    (a) => a.releaseGroupType === "Album" && !(a.releaseDate && a.releaseDate > today)
  );
  const singleReleases = artist.albums.filter((a) => a.releaseGroupType !== "Album");
  const singleTracks = singleReleases.flatMap((release) =>
    release.tracks.map((track) => ({ ...track, release }))
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-2xl font-medium uppercase text-accent ring-1 ring-border">
          {artist.imageUrl ? (
            <Image
              src={artist.imageUrl}
              alt={artist.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            artist.name.slice(0, 2)
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">{artist.name}</h1>
          <p className="text-sm text-muted">
            {albums.length} {albums.length === 1 ? "album" : "albums"}
            {singleTracks.length > 0 &&
              ` · ${singleTracks.length} single${singleTracks.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {session?.user && (
          <div className="ml-auto">
            <FollowArtistButton artistId={artist.id} initiallyFollowing={isFollowing} />
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <section className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">Coming soon</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Link href={`/album/${a.id}`} className="text-foreground hover:text-accent">
                  {a.title}
                </Link>{" "}
                <span className="text-muted">
                  ·{" "}
                  {a.releaseDate!.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Albums</h2>
        {albums.length === 0 ? (
          <p className="text-sm text-muted">No albums in the catalog yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={{ ...album, artist }} />
            ))}
          </div>
        )}
      </section>

      {singleTracks.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Singles &amp; Other Tracks</h2>
          <p className="mb-2 text-xs text-muted">
            Songs not part of an album — click through to log or rate them.
          </p>
          <ol className="flex flex-col">
            {singleTracks.map((track) => (
              <li
                key={track.id}
                className="flex justify-between border-b border-border py-2 text-sm last:border-0"
              >
                <Link
                  href={`/album/${track.release.id}`}
                  className="text-foreground hover:text-accent hover:underline"
                >
                  {track.title}
                </Link>
                <span className="text-muted">{formatDuration(track.durationSec)}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
