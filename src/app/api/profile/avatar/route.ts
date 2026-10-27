import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteImage, MAX_IMAGE_BYTES, saveImage, sniffImage } from "@/lib/image-uploads";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 3MB or smaller." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) {
    return NextResponse.json(
      { error: "Unsupported image type. Use PNG, JPEG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const previous = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  });
  const avatarUrl = await saveImage("avatars", bytes, ext);
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl } });
  await deleteImage("avatars", previous?.avatarUrl);

  return NextResponse.json({ avatarUrl });
}
