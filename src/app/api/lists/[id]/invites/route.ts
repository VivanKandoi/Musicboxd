import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getListAccess } from "@/lib/list-access";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: listId } = await params;

  const access = await getListAccess(listId, session.user.id);
  if (!access?.canManage) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const invite = await prisma.listInvite.create({
    data: {
      listId,
      createdById: session.user.id,
      token: randomBytes(18).toString("base64url"),
    },
  });

  return NextResponse.json(invite, { status: 201 });
}
