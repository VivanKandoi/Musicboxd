import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchCatalog } from "@/lib/queries";
import { AlbumCard } from "@/components/album-card";
import { FollowButton } from "@/components/follow-button";

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

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">
        Results for &ldquo;{query}&rdquo;
      </h1>

      <section>
        <h2 className="mb-3 text-lg font-medium">People</h2>
        {users.length === 0 ? (
          <p className="text-sm text-muted">No users found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <Link
                  href={`/u/${user.username}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-2 text-sm font-medium uppercase text-accent ring-1 ring-border">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      user.username.slice(0, 2)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {user.name || user.username}
                    </p>
                    <p className="truncate text-xs text-muted">
                      @{user.username}
                    </p>
                  </div>
                </Link>
                {session?.user && session.user.id !== user.id && (
                  <FollowButton
                    username={user.username}
                    initiallyFollowing={followingIds.has(user.id)}
                  />
                )}
              </div>
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
