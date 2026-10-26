import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Lock } from "lucide-react";
import { getUserDiary, getUserStats } from "@/lib/queries";
import { computeBadges } from "@/lib/badges";
import { getCompatibility } from "@/lib/compatibility";
import { applyCustomCovers } from "@/lib/entitlements";
import { FollowButton } from "@/components/follow-button";
import { EditProfileForm } from "@/components/edit-profile-form";
import { FiveFavesEditor } from "@/components/five-faves-editor";
import { ActivityItem } from "@/components/activity-item";
import { BadgesSection } from "@/components/badges-section";

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      fiveFaves: {
        orderBy: { position: "asc" },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
              artist: { select: { name: true } },
            },
          },
        },
      },
      _count: { select: { followers: true, following: true } },
    },
  });
  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;
  const isFollowing = session?.user
    ? Boolean(
        await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: user.id,
            },
          },
        })
      )
    : false;

  const canViewPrivateContent = isOwnProfile || isFollowing || !user.isPrivate;

  const compatibility =
    session?.user && !isOwnProfile ? await getCompatibility(session.user.id, user.id) : null;

  const [stats, diary, badges] = canViewPrivateContent
    ? await Promise.all([
        getUserStats(user.id),
        getUserDiary(user.id, session?.user?.id ?? null, 10),
        computeBadges(user.id),
      ])
    : [null, null, null];
  await Promise.all([
    applyCustomCovers(session?.user?.id, user.fiveFaves, (f) => f.album),
    applyCustomCovers(session?.user?.id, diary ?? [], (log) => log.album),
  ]);

  if (!canViewPrivateContent) {
    return (
      <div className="flex flex-col gap-8">
        <ProfileHeader
          user={user}
          isOwnProfile={isOwnProfile}
          isFollowing={isFollowing}
          hasSession={Boolean(session?.user)}
          compatibility={compatibility}
        />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-10 text-center">
          <Lock size={20} className="text-muted" />
          <p className="text-sm font-medium text-foreground">This profile is private</p>
          <p className="text-xs text-muted">
            Follow @{user.username} to see their diary, stats, and favorites.
          </p>
        </div>
      </div>
    );
  }

  if (!stats || !diary || !badges) return null;

  return (
    <div className="flex flex-col gap-8">
      <ProfileHeader
        user={user}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        hasSession={Boolean(session?.user)}
        compatibility={compatibility}
      />

      <BadgesSection badges={badges} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Five Faves</h2>
        </div>
        {isOwnProfile && (
          <div className="mb-3">
            <FiveFavesEditor initial={user.fiveFaves.map((f) => f.album)} />
          </div>
        )}
        {user.fiveFaves.length === 0 ? (
          <p className="text-sm text-muted">No favorites picked yet.</p>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {user.fiveFaves.map((f) => (
              <Link key={f.id} href={`/album/${f.album.id}`} className="group">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-surface-2 ring-1 ring-border group-hover:ring-accent">
                  {f.album.coverUrl && (
                    <Image
                      src={f.album.coverUrl}
                      alt={f.album.title}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-foreground">{f.album.title}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Stats</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Logs" value={stats.totalLogs} />
          <StatTile label="Unique albums" value={stats.albumsLogged} />
          <StatTile
            label="Avg rating given"
            value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"}
          />
          <StatTile label="Genres explored" value={stats.topGenres.length} />
        </div>
        {stats.topGenres.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.topGenres.map((g) => (
              <span
                key={g.name}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted"
              >
                {g.name} · {g.count}
              </span>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium">Diary</h2>
          <Link
            href={`/u/${user.username}/diary`}
            className="text-xs text-muted hover:text-accent"
          >
            View all
          </Link>
        </div>
        {diary.length === 0 ? (
          <p className="text-sm text-muted">No logs yet.</p>
        ) : (
          <div>
            {diary.map((log) => (
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

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function ProfileHeader({
  user,
  isOwnProfile,
  isFollowing,
  hasSession,
  compatibility,
}: {
  user: {
    username: string;
    name: string | null;
    bio: string | null;
    avatarUrl: string | null;
    isPrivate: boolean;
    _count: { followers: number; following: number };
  };
  isOwnProfile: boolean;
  isFollowing: boolean;
  hasSession: boolean;
  compatibility?: { score: number; basis: "ratings" | "genres"; sharedCount: number } | null;
}) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xl font-medium uppercase text-accent ring-1 ring-border">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.username}
              width={64}
              height={64}
              priority
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            user.username.slice(0, 2)
          )}
        </div>
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-semibold">
            {user.name || user.username}
            {user.isPrivate && <Lock size={13} className="text-muted" />}
          </h1>
          <p className="text-sm text-muted">@{user.username}</p>
          {compatibility && (
            <p className="mt-1 text-xs text-accent">
              {compatibility.score}% taste match
              <span className="text-muted">
                {" "}
                ({compatibility.basis === "ratings" ? "shared ratings" : "shared genres"})
              </span>
            </p>
          )}
          {user.bio && <p className="mt-2 max-w-md text-sm text-foreground/90">{user.bio}</p>}
          <div className="mt-2 flex gap-4 text-sm text-muted">
            <Link href={`/u/${user.username}/followers`} className="hover:text-foreground">
              <span className="font-medium text-foreground">{user._count.followers}</span>{" "}
              followers
            </Link>
            <Link href={`/u/${user.username}/following`} className="hover:text-foreground">
              <span className="font-medium text-foreground">{user._count.following}</span>{" "}
              following
            </Link>
            <Link href={`/u/${user.username}/lists`} className="hover:text-foreground">
              Lists
            </Link>
            <Link href={`/u/${user.username}/year`} className="hover:text-foreground">
              Year in review
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isOwnProfile ? (
          <EditProfileForm
            initialName={user.name ?? ""}
            initialBio={user.bio ?? ""}
            initialAvatarUrl={user.avatarUrl}
          />
        ) : hasSession ? (
          <div className="flex items-center gap-2">
            <FollowButton username={user.username} initiallyFollowing={isFollowing} />
            <Link
              href={`/messages/${user.username}`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:border-accent hover:text-foreground"
            >
              Message
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
