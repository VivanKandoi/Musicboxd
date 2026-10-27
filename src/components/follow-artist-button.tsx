"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellPlus, BellRing } from "lucide-react";

export function FollowArtistButton({ artistId, initiallyFollowing }: { artistId: string; initiallyFollowing: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initiallyFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const res = await fetch(`/api/artists/${artistId}/follow`, { method: "POST" });
    setPending(false);
    if (res.ok) {
      setFollowing((await res.json()).following);
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={following ? "You'll be notified about new releases" : "Get notified about new releases"}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 ${
        following
          ? "border border-border text-foreground hover:border-accent"
          : "bg-accent text-accent-foreground hover:opacity-90"
      }`}
    >
      {following ? <BellRing size={14} /> : <BellPlus size={14} />}
      {following ? "Following" : "Follow artist"}
    </button>
  );
}
