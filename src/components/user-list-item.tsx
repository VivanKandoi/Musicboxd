import Link from "next/link";
import Image from "next/image";
import { FollowButton } from "@/components/follow-button";

export function UserListItem({
  user,
  showFollowButton,
  isFollowing,
}: {
  user: { id: string; username: string; name: string | null; avatarUrl: string | null };
  showFollowButton: boolean;
  isFollowing: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
      <Link href={`/u/${user.username}`} className="flex min-w-0 items-center gap-3">
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
          <p className="truncate text-xs text-muted">@{user.username}</p>
        </div>
      </Link>
      {showFollowButton && (
        <FollowButton username={user.username} initiallyFollowing={isFollowing} />
      )}
    </div>
  );
}
