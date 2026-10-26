import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { setMockPremium } from "@/lib/entitlements";

// Mock toggle for the demo: grants or removes the Premium entitlements. No billing.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = z.object({ enabled: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await setMockPremium(session.user.id, parsed.data.enabled);
  return NextResponse.json({ enabled: parsed.data.enabled });
}
