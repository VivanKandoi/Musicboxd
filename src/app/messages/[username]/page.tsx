import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageThread } from "@/components/message-thread";

export default async function MessageThreadPage({
  params,
}: PageProps<"/messages/[username]">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { username } = await params;
  const other = await prisma.user.findUnique({ where: { username } });
  if (!other || other.id === session.user.id) notFound();

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      <MessageThread username={username} />
    </div>
  );
}
