import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rankedListSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.listMember.findMany({
    where: { userId: session.user.id },
    include: {
      list: { include: { _count: { select: { items: true } } } },
    },
    orderBy: { list: { updatedAt: "desc" } },
  });

  return NextResponse.json({
    lists: memberships.map((m) => ({ ...m.list, role: m.role })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = rankedListSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const list = await prisma.rankedList.create({
    data: {
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      isPublic: parsed.data.isPublic ?? true,
      members: { create: { userId: session.user.id, role: "owner" } },
    },
  });

  return NextResponse.json(list, { status: 201 });
}
