import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AcceptInviteButton } from "@/components/accept-invite-button";

export default async function ListInvitePage({ params }: PageProps<"/lists/invite/[token]">) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.listInvite.findUnique({
    where: { token },
    include: {
      list: {
        select: {
          id: true,
          title: true,
          user: { select: { username: true, name: true } },
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!invite || invite.revokedAt) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6 text-center">
        <p className="text-sm font-medium text-foreground">This invite link is no longer valid</p>
        <p className="mt-1 text-xs text-muted">Ask the list owner for a new one.</p>
      </div>
    );
  }

  if (session?.user) {
    const member = await prisma.listMember.findUnique({
      where: { listId_userId: { listId: invite.listId, userId: session.user.id } },
    });
    if (member) redirect(`/lists/${invite.listId}`);
  }

  const owner = invite.list.user.name || invite.list.user.username;

  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-surface p-6 text-center">
      <p className="text-xs text-muted">{owner} invited you to collaborate on</p>
      <h1 className="mt-1 text-xl font-semibold text-foreground">{invite.list.title}</h1>
      <p className="mt-1 text-xs text-muted">
        {invite.list._count.items} {invite.list._count.items === 1 ? "album" : "albums"}
      </p>
      <div className="mt-5 flex justify-center">
        {session?.user ? (
          <AcceptInviteButton token={token} />
        ) : (
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(`/lists/invite/${token}`)}`}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Log in to join
          </Link>
        )}
      </div>
    </div>
  );
}
