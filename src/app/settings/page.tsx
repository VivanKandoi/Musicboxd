import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings-form";
import { PreferencesForm } from "@/components/preferences-form";
import { PremiumToggle } from "@/components/premium-toggle";
import { isPremium, PREMIUM_FEATURES } from "@/lib/entitlements";
import type { ThemeColorId, ThemeMode } from "@/lib/theme";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      themeColor: true,
      themeMode: true,
      isPrivate: true,
      dmPrivacy: true,
      notifyOnFollow: true,
      notifyOnLike: true,
      notifyOnComment: true,
      notifyOnMessage: true,
      notifyOnRelease: true,
      notifyOnAnniversary: true,
      emailNotifications: true,
    },
  });
  const premium = await isPremium(session.user.id);

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <div className="flex flex-col gap-10">
        <SettingsForm
          initialThemeColor={(user?.themeColor ?? "coral") as ThemeColorId}
          initialThemeMode={(user?.themeMode ?? "dark") as ThemeMode}
        />
        <section className="border-t border-border pt-8">
          <h2 className="mb-1 text-lg font-medium">Listening history</h2>
          <p className="mb-3 text-sm text-muted">
            Import your scrobbles from Last.fm to fill your diary and stats.
          </p>
          <Link
            href="/settings/import"
            className="inline-flex rounded-full border border-border px-4 py-1.5 text-sm text-foreground hover:border-accent"
          >
            Import from Last.fm
          </Link>
        </section>
        <div className="border-t border-border pt-8">
          <PremiumToggle initialEnabled={premium} features={Object.values(PREMIUM_FEATURES)} />
        </div>
        <div className="border-t border-border pt-8">
          <PreferencesForm
            initial={{
              isPrivate: user?.isPrivate ?? false,
              dmPrivacy: (user?.dmPrivacy ?? "everyone") as "everyone" | "followers" | "none",
              notifyOnFollow: user?.notifyOnFollow ?? true,
              notifyOnLike: user?.notifyOnLike ?? true,
              notifyOnComment: user?.notifyOnComment ?? true,
              notifyOnMessage: user?.notifyOnMessage ?? true,
              notifyOnRelease: user?.notifyOnRelease ?? true,
              notifyOnAnniversary: user?.notifyOnAnniversary ?? true,
              emailNotifications: user?.emailNotifications ?? true,
            }}
          />
        </div>
      </div>
    </div>
  );
}
