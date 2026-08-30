import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import type { ThemeColorId, ThemeMode } from "@/lib/theme";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { themeColor: true, themeMode: true },
  });

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <SettingsForm
        initialThemeColor={(user?.themeColor ?? "coral") as ThemeColorId}
        initialThemeMode={(user?.themeMode ?? "dark") as ThemeMode}
      />
    </div>
  );
}
