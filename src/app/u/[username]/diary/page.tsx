import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserDiary } from "@/lib/queries";
import { ActivityItem } from "@/components/activity-item";

export default async function DiaryPage({ params }: PageProps<"/u/[username]/diary">) {
  const { username } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) notFound();

  const diary = await getUserDiary(user.id, session?.user?.id ?? null, 200);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">
        {user.name || user.username}&rsquo;s diary
      </h1>
      <p className="mb-4 text-sm text-muted">{diary.length} logged listens</p>
      {diary.length === 0 ? (
        <p className="text-sm text-muted">No logs yet.</p>
      ) : (
        <div>
          {diary.map((log) => (
            <ActivityItem key={log.id} log={log} isAuthenticated={Boolean(session?.user)} />
          ))}
        </div>
      )}
    </div>
  );
}
