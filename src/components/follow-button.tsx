"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowButton({
  username,
  initiallyFollowing,
}: {
  username: string;
  initiallyFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch(`/api/follow/${username}`, { method: "POST" });
    setPending(false);
    if (res.ok) {
      const data = await res.json();
      setFollowing(data.following);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:border-accent disabled:opacity-50"
          : "rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
