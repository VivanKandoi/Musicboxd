import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ListMusic } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateListForm } from "@/components/create-list-form";

export default async function UserListsPage({ params }: PageProps<"/u/[username]/lists">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const isOwnLists = session?.user?.id === user.id;

  const viewerId = session?.user?.id;
  const lists = await prisma.rankedList.findMany({
    where: {
      members: { some: { userId: user.id } },
      ...(isOwnLists
        ? {}
        : {
            OR: [
              { isPublic: true },
              ...(viewerId ? [{ members: { some: { userId: viewerId } } }] : []),
            ],
          }),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      items: {
        orderBy: { rank: "asc" },
        take: 4,
        include: { album: { select: { coverUrl: true, title: true } } },
      },
      members: { where: { userId: user.id }, select: { role: true } },
      _count: { select: { items: true, members: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isOwnLists ? "Your Lists" : `${user.name || user.username}'s Lists`}
        </h1>
        {isOwnLists && <CreateListForm />}
      </div>

      {lists.length === 0 ? (
        <p className="text-sm text-muted">No lists yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="rounded-xl border border-border bg-surface p-4 hover:border-accent"
            >
              <div className="mb-3 grid grid-cols-4 gap-1">
                {Array.from({ length: 4 }).map((_, i) => {
                  const item = list.items[i];
                  return (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-md bg-surface-2"
                    >
                      {item?.album.coverUrl && (
                        <Image
                          src={item.album.coverUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <ListMusic size={14} className="shrink-0 text-accent" />
                <p className="truncate text-sm font-medium text-foreground">{list.title}</p>
              </div>
              <p className="text-xs text-muted">
                {list._count.items} {list._count.items === 1 ? "album" : "albums"}
                {list.members[0]?.role === "editor"
                  ? " · Collaborator"
                  : list._count.members > 1 && " · Shared"}
                {!list.isPublic && " · Private"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
