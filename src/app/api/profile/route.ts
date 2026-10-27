import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/validations";
import { deleteImage } from "@/lib/image-uploads";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, bio, avatarUrl } = parsed.data;
  const removingAvatar = avatarUrl !== undefined;
  const previous = removingAvatar
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } })
    : null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(removingAvatar ? { avatarUrl: null } : {}),
    },
    select: { username: true, name: true, bio: true, avatarUrl: true },
  });
  if (removingAvatar) await deleteImage("avatars", previous?.avatarUrl);

  return NextResponse.json(user);
}
