import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fiveFavesSchema } from "@/lib/validations";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = fiveFavesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { albumIds } = parsed.data;
  const unique = Array.from(new Set(albumIds));

  await prisma.$transaction([
    prisma.fiveFave.deleteMany({ where: { userId: session.user.id } }),
    ...unique.map((albumId, i) =>
      prisma.fiveFave.create({
        data: { userId: session.user.id, albumId, position: i + 1 },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
