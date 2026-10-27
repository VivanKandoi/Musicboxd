import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getYearsWithListens } from "@/lib/year-in-review";

export default async function LatestYearPage({ params }: PageProps<"/u/[username]/year">) {
  const { username } = await params;
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) notFound();

  const [latest] = await getYearsWithListens(user.id);
  redirect(`/u/${username}/year/${latest ?? new Date().getUTCFullYear()}`);
}
