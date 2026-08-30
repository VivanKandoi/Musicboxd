import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/nav/navbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getThemeColor } from "@/lib/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MusicBoxd — Log, rate, and discuss music",
  description:
    "A social music logging and discovery platform: log listens, rate albums, write reviews, and see what your friends are playing.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const prefs = session?.user
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { themeColor: true, themeMode: true },
      })
    : null;

  const mode = prefs?.themeMode === "light" ? "light" : "dark";
  const color = getThemeColor(prefs?.themeColor ?? "coral");

  return (
    <html
      lang="en"
      data-mode={mode}
      style={
        {
          "--accent": color.accent,
          "--accent-foreground": color.accentForeground,
        } as React.CSSProperties
      }
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
