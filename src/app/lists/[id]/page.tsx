import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListAccess } from "@/lib/list-access";
import { ListEditor } from "@/components/list-editor";
import { ListCollaborators } from "@/components/list-collaborators";

export default async function ListPage({ params }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const session = await auth();

  const access = await getListAccess(id, session?.user?.id);
  if (!access?.canView) notFound();

  const list = await prisma.rankedList.findUniqueOrThrow({
    where: { id },
    include: {
      user: { select: { username: true, name: true } },
      items: {
        orderBy: { rank: "asc" },
        include: {
          album: {
            select: {
              id: true,
              title: true,
              coverUrl: true,
              artist: { select: { name: true } },
            },
          },
          addedBy: { select: { username: true, name: true } },
        },
      },
      members: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, name: true } } },
      },
      invites: access.canManage
        ? { where: { revokedAt: null }, orderBy: { createdAt: "desc" } }
        : false,
    },
  });

  const editors = list.members.filter((m) => m.role === "editor");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted">
          A ranked list by{" "}
          <Link href={`/u/${list.user.username}`} className="hover:text-accent">
            {list.user.name || list.user.username}
          </Link>
          {editors.length > 0 &&
            ` with ${editors.length} ${editors.length === 1 ? "collaborator" : "collaborators"}`}
          {!list.isPublic && " · Private"}
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{list.title}</h1>
        {list.description && <p className="mt-1 text-sm text-muted">{list.description}</p>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <ListEditor
          listId={list.id}
          canEdit={access.canEditItems}
          showAddedBy={list.members.length > 1}
          initialItems={list.items.map((item) => ({
            id: item.id,
            note: item.note,
            album: item.album,
            addedBy: item.addedBy,
          }))}
        />

        <ListCollaborators
          listId={list.id}
          viewerId={session?.user?.id ?? null}
          viewerRole={access.role}
          members={list.members.map((m) => ({ role: m.role, user: m.user }))}
          invites={(list.invites ?? []).map((i) => ({ id: i.id, token: i.token }))}
        />
      </div>
    </div>
  );
}
