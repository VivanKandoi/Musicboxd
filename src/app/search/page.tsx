import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchCatalog } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { UserListItem } from "@/components/user-list-item";

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const session = await auth();

  if (!query) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-semibold">Search</h1>
        <p className="text-sm text-muted">
          Search for an album, artist, or user using the search bar above.
        </p>
      </div>
    );
  }

  const { albums, artists, users } = await searchCatalog(query);

  const followingIds = session?.user
    ? new Set(
        (
          await prisma.follow.findMany({
            where: {
              followerId: session.user.id,
              followingId: { in: users.map((u) => u.id) },
            },
            select: { followingId: true },
          })
        ).map((f) => f.followingId)
      )
    : new Set<string>();

  const hasArtistMatch = artists.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      {hasArtistMatch ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">Artists</h2>
          <div className="flex flex-col gap-3">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 hover:border-accent"
              >
                <span className="font-medium text-foreground">{artist.name}</span>
                <span className="text-xs text-muted">
                  {artist._count.albums}{" "}
                  {artist._count.albums === 1 ? "album" : "albums"}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-medium">People</h2>
            {users.length === 0 ? (
              <p className="text-sm text-muted">No users found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    showFollowButton={Boolean(session?.user && session.user.id !== user.id)}
                    isFollowing={followingIds.has(user.id)}
                  />
                ))}
              </div>
            )}
          </section>

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
        </>
      )}
    </div>
  );
}
