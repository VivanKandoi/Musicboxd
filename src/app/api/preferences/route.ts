import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { preferencesSchema } from "@/lib/validations";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({
    isPrivate: user.isPrivate,
    dmPrivacy: user.dmPrivacy,
    notifyOnFollow: user.notifyOnFollow,
    notifyOnLike: user.notifyOnLike,
    notifyOnComment: user.notifyOnComment,
    notifyOnMessage: user.notifyOnMessage,
    emailNotifications: user.emailNotifications,
  });
}
