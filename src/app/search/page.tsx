import Link from "next/link";
import { searchCatalog } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  if (!query) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted">
          Search for an album or artist using the search bar above.
        </p>
      </div>
    );
  }

  const { albums, artists } = await searchCatalog(query);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <section>
        <h2 className="mb-3 text-lg font-medium">Albums</h2>
        {albums.length === 0 ? (
          <p className="text-sm text-muted">No albums found.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Artists</h2>
        {artists.length === 0 ? (
          <p className="text-sm text-muted">No artists found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {artists.map((artist) => (
              <div key={artist.id}>
                <p className="font-medium text-foreground">{artist.name}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {artist.albums.map((album) => (
                    <Link
                      key={album.id}
                      href={`/album/${album.id}`}
                      className="rounded-full border border-border px-3 py-1 text-xs text-muted hover:border-accent hover:text-foreground"
                    >
                      {album.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
