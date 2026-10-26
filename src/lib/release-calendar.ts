import { prisma } from "@/lib/prisma";
import { mbGet, parseFullDate, type MBRelease, type MBReleaseGroup } from "@/lib/musicbrainz";
import { createNotification } from "@/lib/notifications";

export const MILESTONE_YEARS = [10, 20, 25, 50];
const HIGH_RATING = 4;
const RECENT_DAYS = 60;
const ARTIST_RECHECK_MS = 20 * 60 * 60 * 1000;
const MAX_ARTISTS_PER_RUN = 60;
const MAX_REISSUE_CHECKS_PER_RUN = 60;
const REISSUE_WORDS = /reissue|deluxe|remaster|anniversary|expanded|super deluxe/i;

const DAY_MS = 86400000;
const startOfUtcDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

type Log = (msg: string) => void;

// 1. Pull new and upcoming release groups for followed artists into the catalog.
async function syncFollowedArtists(today: Date, log: Log) {
  const artists = await prisma.artist.findMany({
    where: {
      musicbrainzId: { not: null },
      followers: { some: {} },
      OR: [{ releasesCheckedAt: null }, { releasesCheckedAt: { lt: new Date(Date.now() - ARTIST_RECHECK_MS) } }],
    },
    orderBy: { releasesCheckedAt: { sort: "asc", nulls: "first" } },
    take: MAX_ARTISTS_PER_RUN,
    select: { id: true, name: true, musicbrainzId: true },
  });

  const cutoff = new Date(today.getTime() - RECENT_DAYS * DAY_MS);
  let added = 0;
  for (const artist of artists) {
    const data = await mbGet<{ "release-groups": MBReleaseGroup[] }>(
      `/release-group?artist=${artist.musicbrainzId}&type=album|ep&fmt=json&limit=100`
    );
    if (!data) {
      log(`  ${artist.name}: MusicBrainz lookup failed, will retry next run`);
      continue;
    }
    for (const rg of data["release-groups"]) {
      const date = parseFullDate(rg["first-release-date"]);
      if (!date || date < cutoff) continue;
      if (rg["secondary-types"]?.length) continue; // skip live albums, compilations, remixes
      const existing = await prisma.album.findUnique({ where: { musicbrainzId: rg.id }, select: { id: true } });
      if (existing) {
        await prisma.album.update({ where: { id: existing.id }, data: { releaseDate: date } });
        continue;
      }
      await prisma.album.create({
        data: {
          title: rg.title,
          releaseDate: date,
          releaseGroupType: rg["primary-type"] === "EP" ? "EP" : "Album",
          artistId: artist.id,
          musicbrainzId: rg.id,
        },
      });
      added += 1;
      log(`  + ${artist.name} — ${rg.title} (${rg["first-release-date"]})`);
    }
    await prisma.artist.update({ where: { id: artist.id }, data: { releasesCheckedAt: new Date() } });
  }
  return { artistsChecked: artists.length, releasesAdded: added };
}

// 2. Release day: tell an artist's followers, linking to a pre-filled log form.
async function notifyReleaseDay(today: Date) {
  const albums = await prisma.album.findMany({
    where: { releaseDate: { gte: today, lt: new Date(today.getTime() + DAY_MS) }, artist: { followers: { some: {} } } },
    select: { id: true, artist: { select: { followers: { select: { userId: true } } } } },
  });
  let sent = 0;
  for (const album of albums) {
    for (const { userId } of album.artist.followers) {
      const n = await createNotification({
        userId,
        type: "release",
        albumId: album.id,
        dedupeKey: `release:${userId}:${album.id}`,
      });
      if (n) sent += 1;
    }
  }
  return sent;
}

// Distinct (user, album) pairs the user rated highly, with release dates.
async function highlyRatedAlbums() {
  const rows = await prisma.log.findMany({
    where: { rating: { gte: HIGH_RATING }, album: { releaseDate: { not: null } } },
    distinct: ["userId", "albumId"],
    select: { userId: true, album: { select: { id: true, releaseDate: true, musicbrainzId: true } } },
  });
  return rows;
}

// 3. Milestone anniversaries (10/20/25/50 years) of albums each user rated highly.
async function notifyAnniversaries(today: Date) {
  let sent = 0;
  for (const { userId, album } of await highlyRatedAlbums()) {
    const release = album.releaseDate!;
    if (release.getUTCMonth() !== today.getUTCMonth() || release.getUTCDate() !== today.getUTCDate()) continue;
    const years = today.getUTCFullYear() - release.getUTCFullYear();
    if (!MILESTONE_YEARS.includes(years)) continue;
    const n = await createNotification({
      userId,
      type: "anniversary",
      albumId: album.id,
      dedupeKey: `anniversary:${userId}:${album.id}:${today.getUTCFullYear()}`,
    });
    if (n) sent += 1;
  }
  return sent;
}

// 4. Reissues: a highly rated album's release group gained a recent release tagged as a
// reissue/deluxe/remaster. Checks a rotating slice each run to respect MusicBrainz limits.
async function notifyReissues(today: Date, log: Log) {
  const pairs = (await highlyRatedAlbums()).filter((p) => p.album.musicbrainzId);
  const albumIds = [...new Set(pairs.map((p) => p.album.id))].sort();
  if (albumIds.length === 0) return { checked: 0, sent: 0 };

  const dayNumber = Math.floor(today.getTime() / DAY_MS);
  const start = (dayNumber * MAX_REISSUE_CHECKS_PER_RUN) % albumIds.length;
  const slice = [...albumIds.slice(start), ...albumIds.slice(0, start)].slice(0, MAX_REISSUE_CHECKS_PER_RUN);
  const since = new Date(today.getTime() - 14 * DAY_MS);

  let sent = 0;
  for (const albumId of slice) {
    const mbid = pairs.find((p) => p.album.id === albumId)!.album.musicbrainzId!;
    const data = await mbGet<{ releases: MBRelease[] }>(`/release?release-group=${mbid}&fmt=json&limit=100`);
    const reissue = data?.releases.find((r) => {
      const date = parseFullDate(r.date);
      return date && date >= since && date <= today && REISSUE_WORDS.test(`${r.disambiguation ?? ""} ${r.title}`);
    });
    if (!reissue) continue;
    log(`  reissue: ${reissue.title} (${reissue.disambiguation ?? reissue.date})`);
    for (const p of pairs.filter((p) => p.album.id === albumId)) {
      const n = await createNotification({
        userId: p.userId,
        type: "reissue",
        albumId,
        dedupeKey: `reissue:${p.userId}:${albumId}:${reissue.id}`,
      });
      if (n) sent += 1;
    }
  }
  return { checked: slice.length, sent };
}

export async function runReleaseCalendarJob({ now = new Date(), log = console.log as Log } = {}) {
  const today = startOfUtcDay(now);
  log("Syncing releases for followed artists…");
  const sync = await syncFollowedArtists(today, log);
  const releaseNotifications = await notifyReleaseDay(today);
  const anniversaryNotifications = await notifyAnniversaries(today);
  log("Checking for reissues…");
  const reissues = await notifyReissues(today, log);
  return { ...sync, releaseNotifications, anniversaryNotifications, reissueChecks: reissues.checked, reissueNotifications: reissues.sent };
}

export async function getReleaseCalendar(userId: string, now = new Date()) {
  const today = startOfUtcDay(now);
  const follows = await prisma.artistFollow.findMany({
    where: { userId },
    include: { artist: { select: { id: true, name: true } } },
    orderBy: { artist: { name: "asc" } },
  });
  const artistIds = follows.map((f) => f.artistId);
  const albumSelect = {
    id: true,
    title: true,
    coverUrl: true,
    releaseDate: true,
    releaseGroupType: true,
    artist: { select: { id: true, name: true } },
  } as const;

  const [upcoming, recent, rated] = await Promise.all([
    prisma.album.findMany({
      where: { artistId: { in: artistIds }, releaseDate: { gte: today } },
      orderBy: { releaseDate: "asc" },
      take: 50,
      select: albumSelect,
    }),
    prisma.album.findMany({
      where: {
        artistId: { in: artistIds },
        releaseDate: { gte: new Date(today.getTime() - RECENT_DAYS * DAY_MS), lt: today },
      },
      orderBy: { releaseDate: "desc" },
      take: 50,
      select: albumSelect,
    }),
    prisma.log.findMany({
      where: { userId, rating: { gte: HIGH_RATING }, album: { releaseDate: { not: null } } },
      distinct: ["albumId"],
      select: { album: { select: albumSelect } },
    }),
  ]);

  const month = today.getUTCMonth();
  const anniversaries = rated
    .map((r) => r.album)
    .filter((a) => a.releaseDate!.getUTCMonth() === month)
    .map((a) => ({ ...a, years: today.getUTCFullYear() - a.releaseDate!.getUTCFullYear() }))
    .filter((a) => MILESTONE_YEARS.includes(a.years))
    .sort((a, b) => a.releaseDate!.getUTCDate() - b.releaseDate!.getUTCDate());

  return { followedArtists: follows.map((f) => f.artist), upcoming, recent, anniversaries };
}
