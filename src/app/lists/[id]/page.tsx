import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListEditor } from "@/components/list-editor";

export default async function ListPage({ params }: PageProps<"/lists/[id]">) {
  const { id } = await params;
  const session = await auth();

  const list = await prisma.rankedList.findUnique({
    where: { id },
    include: {
      user: { select: { username: true, name: true, avatarUrl: true } },
      items: {
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
    },
  });
  if (!list) notFound();

  const isOwner = session?.user?.id === list.userId;
  if (!list.isPublic && !isOwner) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-muted">
          A ranked list by{" "}
          <Link href={`/u/${list.user.username}`} className="hover:text-accent">
            {list.user.name || list.user.username}
          </Link>
          {!list.isPublic && " · Private"}
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{list.title}</h1>
        {list.description && <p className="mt-1 text-sm text-muted">{list.description}</p>}
      </div>

      <ListEditor
        listId={list.id}
        isOwner={isOwner}
        initialItems={list.items.map((item) => ({
          id: item.id,
          note: item.note,
          album: item.album,
        }))}
      />
    </div>
  );
}
