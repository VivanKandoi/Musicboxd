/* eslint-disable @next/next/no-img-element -- Satori renders plain <img>, not next/image */
import { ImageResponse } from "next/og";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewProfileContent } from "@/lib/profile-access";
import { getYearStats } from "@/lib/year-in-review";

const COVER_HOSTS = [/^images\.unsplash\.com$/, /^i\.scdn\.co$/, /\.discogs\.com$/, /(^|\.)coverartarchive\.org$/];
const MAX_COVER_BYTES = 2_000_000;

async function coverDataUri(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !COVER_HOSTS.some((h) => h.test(parsed.hostname))) return null;
    const res = await fetch(parsed, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png|webp)/.test(type)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_COVER_BYTES) return null;
    return `data:${type.split(";")[0]};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; year: string }> }
) {
  const { username, year: rawYear } = await params;
  const year = Number(rawYear);
  if (!Number.isInteger(year) || year < 1950 || year > 2100) {
    return new Response("Not found", { status: 404 });
  }

  const session = await auth();
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await canViewProfileContent(session?.user?.id, user))) {
    return new Response("Not found", { status: 404 });
  }

  const stats = await getYearStats(user.id, year);
  const albums = stats.topAlbums.slice(0, 3);
  const covers = await Promise.all(albums.map((a) => coverDataUri(a.coverUrl)));
  const name = user.name || user.username;

  const accent = "#f59e0b";
  const muted = "#a3a0aa";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 72,
          background: "linear-gradient(160deg, #1c1408 0%, #0a0a0c 45%, #0a0a0c 100%)",
          color: "#f7f6f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: accent, letterSpacing: 4 }}>
          MUSICBOXD · YEAR IN REVIEW
        </div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, marginTop: 18, lineHeight: 1.05 }}>
          {`${name}'s ${year} in music`}
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 56 }}>
          {[
            [stats.totalListens, "listens"],
            [stats.uniqueAlbums, "albums"],
            [stats.genresExplored, "genres"],
            [stats.longestStreak?.days ?? 0, "day streak"],
          ].map(([value, label]) => (
            <div
              key={String(label)}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "26px 24px",
                borderRadius: 24,
                background: "#17171a",
                border: "2px solid #27272b",
              }}
            >
              <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>{String(value)}</div>
              <div style={{ display: "flex", fontSize: 26, color: muted }}>{String(label)}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", fontSize: 30, color: muted, marginTop: 64 }}>Top albums</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 22 }}>
          {albums.length === 0 && (
            <div style={{ display: "flex", fontSize: 32, color: muted }}>No listens logged yet.</div>
          )}
          {albums.map((a, i) => (
            <div key={a.albumId} style={{ display: "flex", alignItems: "center", gap: 28 }}>
              <div style={{ display: "flex", width: 40, fontSize: 40, fontWeight: 700, color: accent }}>
                {String(i + 1)}
              </div>
              {covers[i] ? (
                <img src={covers[i]!} width={150} height={150} style={{ borderRadius: 16, objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ display: "flex", width: 150, height: 150, borderRadius: 16, background: "#1f1f23" }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
                  {a.title.length > 34 ? `${a.title.slice(0, 33)}…` : a.title}
                </div>
                <div style={{ display: "flex", fontSize: 28, color: muted, marginTop: 4 }}>
                  {`${a.artist} · ${a.listens} listens`}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", fontSize: 26, color: muted }}>
          <div style={{ display: "flex" }}>
            {stats.topGenres[0] ? `Top genre: ${stats.topGenres[0].name}` : ""}
          </div>
          <div style={{ display: "flex" }}>{`@${user.username}`}</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: { "Cache-Control": "private, max-age=600" },
    }
  );
}
