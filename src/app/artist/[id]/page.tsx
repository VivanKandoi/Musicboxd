import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArtistDetail } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function ArtistPage({ params }: PageProps<"/artist/[id]">) {
  const { id } = await params;
  const artist = await getArtistDetail(id);
  if (!artist) notFound();

  const trackCount = artist.albums.reduce((sum, album) => sum + album.tracks.length, 0);

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
            {artist.albums.length} {artist.albums.length === 1 ? "album" : "albums"} ·{" "}
            {trackCount} tracks
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Albums</h2>
        {artist.albums.length === 0 ? (
          <p className="text-sm text-muted">No albums in the catalog yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {artist.albums.map((album) => (
              <AlbumCard key={album.id} album={{ ...album, artist }} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">All Tracks</h2>
        {trackCount === 0 ? (
          <p className="text-sm text-muted">No tracks in the catalog yet.</p>
        ) : (
          <div className="flex flex-col">
            {artist.albums.map((album) => (
              <div key={album.id} className="border-b border-border py-3 last:border-0">
                <Link
                  href={`/album/${album.id}`}
                  className="text-sm font-medium text-foreground hover:text-accent"
                >
                  {album.title}
                </Link>
                {album.releaseDate && (
                  <span className="ml-2 text-xs text-muted">
                    {new Date(album.releaseDate).getFullYear()}
                  </span>
                )}
                <ol className="mt-2 flex flex-col gap-1">
                  {album.tracks.map((track) => (
                    <li
                      key={track.id}
                      className="flex justify-between text-sm text-foreground/90"
                    >
                      <span>
                        <span className="mr-2 text-muted">{track.trackNumber}.</span>
                        {track.title}
                      </span>
                      <span className="text-muted">
                        {formatDuration(track.durationSec)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
