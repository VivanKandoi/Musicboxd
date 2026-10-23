import { after, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { lastfmImportSchema } from "@/lib/validations";
import { lastfmConfigured } from "@/lib/lastfm";
import { failStaleJobs, runLastfmImport } from "@/lib/lastfm-import";

export const maxDuration = 300;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!lastfmConfigured()) {
    return NextResponse.json(
      { error: "Last.fm import isn't configured on this server (LASTFM_API_KEY is missing)" },
      { status: 503 }
    );
  }

  const parsed = lastfmImportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  await failStaleJobs(session.user.id);
  const active = await prisma.importJob.findFirst({
    where: { userId: session.user.id, status: { in: ["pending", "running"] } },
  });
  if (active) {
    return NextResponse.json({ error: "An import is already running", job: active }, { status: 409 });
  }

  const job = await prisma.importJob.create({
    data: { userId: session.user.id, externalUser: parsed.data.username },
  });

  after(() => runLastfmImport(job.id));

  return NextResponse.json(job, { status: 202 });
}
