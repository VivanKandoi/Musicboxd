import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasEntitlement } from "@/lib/entitlements";
import { deleteImage, MAX_IMAGE_BYTES, saveImage, sniffImage } from "@/lib/image-uploads";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await hasEntitlement(session.user.id, "custom_covers"))) {
    return NextResponse.json({ error: "Custom covers are a Premium feature" }, { status: 403 });
  }
  const { id: albumId } = await params;

  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true } });
  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const file = (await request.formData()).get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be 3MB or smaller" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = sniffImage(bytes);
  if (!ext) {
    return NextResponse.json({ error: "Use a PNG, JPEG, WebP or GIF image" }, { status: 400 });
  }

  const key = { userId_albumId: { userId: session.user.id, albumId } };
  const previous = await prisma.customCover.findUnique({ where: key });
  const imageUrl = await saveImage("covers", bytes, ext);
  await prisma.customCover.upsert({
    where: key,
    update: { imageUrl },
    create: { userId: session.user.id, albumId, imageUrl },
  });
  if (previous) await deleteImage("covers", previous.imageUrl);

  return NextResponse.json({ imageUrl });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: albumId } = await params;

  const key = { userId_albumId: { userId: session.user.id, albumId } };
  const existing = await prisma.customCover.findUnique({ where: key });
  if (existing) {
    await prisma.customCover.delete({ where: key });
    await deleteImage("covers", existing.imageUrl);
  }
  return NextResponse.json({ ok: true });
}
