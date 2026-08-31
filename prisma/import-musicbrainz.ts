import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_AGENT = "MusicBoxd/1.0 (https://github.com/VivanKandoi)";
const MB_BASE = "https://musicbrainz.org/ws/2";
const CAA_BASE = "https://coverartarchive.org";
const MB_DELAY_MS = 1100;
const MAX_ALBUMS_PER_ARTIST = 8;

// Diverse curated list spanning genres. Names already in the mock seed are
// included too, so this import enriches/merges those existing rows with
// real MusicBrainz data instead of duplicating them.
const ARTISTS = [
  "Radiohead",
  "Fleetwood Mac",
  "Kendrick Lamar",
  "Lana Del Rey",
  "Frank Ocean",
  "Daft Punk",
  "Joni Mitchell",
  "Arctic Monkeys",
  "The Strokes",
  "Pink Floyd",
  "Nirvana",
  "The Beatles",
  "Led Zeppelin",
  "Tame Impala",
  "The National",
  "J. Cole",
  "Tyler, The Creator",
  "Kanye West",
  "Nas",
  "OutKast",
  "A Tribe Called Quest",
  "Travis Scott",
  "Taylor Swift",
  "Billie Eilish",
  "Dua Lipa",
  "Michael Jackson",
  "SZA",
  "Erykah Badu",
  "D'Angelo",
  "Amy Winehouse",
  "Sade",
  "Aphex Twin",
  "Bonobo",
  "Four Tet",
  "Bon Iver",
  "Sufjan Stevens",
  "Fleet Foxes",
  "Metallica",
  "Black Sabbath",
  "The Clash",
  "Rage Against the Machine",
  "Miles Davis",
  "John Coltrane",
  "Bad Bunny",
  "Rosalía",
  "Bob Marley & The Wailers",
];

type MBArtist = {
  id: string;
  name: string;
  tags?: { name: string; count: number }[];
};

type MBReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "secondary-types"?: string[];
};

type MBRelease = {
  id: string;
  status?: string;
  date?: string;
  "cover-art-archive"?: { front?: boolean };
};

type MBRecordingRef = {
  id: string;
  title: string;
  number: string;
  position: number;
  length?: number;
  recording?: { id: string };
};

type MBReleaseDetail = {
  id: string;
  media?: { tracks?: MBRecordingRef[] }[];
  relations?: MBRelation[];
};

type MBRelation = {
  type: string;
  artist?: { name: string };
  "target-type"?: string;
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mbFetch<T>(path: string, retries = 3): Promise<T | null> {
  const url = `${MB_BASE}${path}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    await sleep(MB_DELAY_MS);
    if (res.ok) {
      return (await res.json()) as T;
    }
    if (res.status === 503 || res.status === 429) {
      await sleep(2000 * attempt);
      continue;
    }
    console.warn(`  MusicBrainz ${res.status} for ${path}`);
    return null;
  }
  return null;
}

async function fetchCoverUrl(releaseId: string): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${releaseId}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    await sleep(300);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      images?: { front?: boolean; image: string; thumbnails?: Record<string, string> }[];
    };
    const front = data.images?.find((img) => img.front) ?? data.images?.[0];
    return front?.thumbnails?.["500"] ?? front?.image ?? null;
  } catch {
    return null;
  }
}

function titleCase(s: string) {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

async function upsertArtist(mbArtist: MBArtist) {
  const existingByMbid = await prisma.artist.findUnique({
    where: { musicbrainzId: mbArtist.id },
  });
  if (existingByMbid) return existingByMbid;

  const existingByName = await prisma.artist.findFirst({
    where: { name: mbArtist.name },
  });
  if (existingByName) {
    return prisma.artist.update({
      where: { id: existingByName.id },
      data: { musicbrainzId: mbArtist.id },
    });
  }

  return prisma.artist.create({
    data: { name: mbArtist.name, musicbrainzId: mbArtist.id },
  });
}

async function upsertAlbum(params: {
  artistId: string;
  title: string;
  musicbrainzId: string;
  releaseDate: Date | null;
  coverUrl: string | null;
}) {
  const existingByMbid = await prisma.album.findUnique({
    where: { musicbrainzId: params.musicbrainzId },
  });
  if (existingByMbid) return existingByMbid;

  const existingByTitle = await prisma.album.findFirst({
    where: { title: params.title, artistId: params.artistId },
  });
  if (existingByTitle) {
    return prisma.album.update({
      where: { id: existingByTitle.id },
      data: {
        musicbrainzId: params.musicbrainzId,
        coverUrl: existingByTitle.coverUrl ?? params.coverUrl,
        releaseDate: existingByTitle.releaseDate ?? params.releaseDate,
      },
    });
  }

  return prisma.album.create({
    data: {
      title: params.title,
      artistId: params.artistId,
      musicbrainzId: params.musicbrainzId,
      releaseDate: params.releaseDate,
      coverUrl: params.coverUrl,
    },
  });
}

async function importGenres(albumId: string, tags: { name: string; count: number }[]) {
  const top = tags
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  for (const tag of top) {
    const name = titleCase(tag.name);
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.albumGenre.upsert({
      where: { albumId_genreId: { albumId, genreId: genre.id } },
      update: {},
      create: { albumId, genreId: genre.id },
    });
  }
}

async function importTracksAndCredits(
  albumId: string,
  releaseDetail: MBReleaseDetail,
  primaryArtistName: string
) {
  const tracks = releaseDetail.media?.[0]?.tracks ?? [];

  await prisma.track.deleteMany({ where: { albumId } });
  for (const track of tracks) {
    await prisma.track.create({
      data: {
        albumId,
        title: track.title,
        trackNumber: Number(track.number) || track.position,
        durationSec: track.length ? Math.round(track.length / 1000) : null,
        musicbrainzId: track.recording?.id ?? null,
      },
    });
  }

  const creditRows = new Map<string, string>();
  creditRows.set(primaryArtistName, "Primary Artist");
  for (const rel of releaseDetail.relations ?? []) {
    if (rel["target-type"] === "artist" && rel.artist?.name) {
      creditRows.set(rel.artist.name, titleCase(rel.type));
    }
  }

  if (tracks[0]?.recording?.id) {
    const recRels = await mbFetch<{ relations?: MBRelation[] }>(
      `/recording/${tracks[0].recording.id}?inc=artist-rels&fmt=json`
    );
    for (const rel of recRels?.relations ?? []) {
      if (rel["target-type"] === "artist" && rel.artist?.name) {
        creditRows.set(rel.artist.name, titleCase(rel.type));
      }
    }
  }

  await prisma.credit.deleteMany({ where: { albumId } });
  for (const [name, role] of creditRows) {
    await prisma.credit.create({ data: { albumId, name, role } });
  }
}

async function importArtistAlbums(artistName: string) {
  console.log(`\n=== ${artistName} ===`);
  const searchResult = await mbFetch<{ artists: MBArtist[] }>(
    `/artist?query=${encodeURIComponent(`artist:${artistName}`)}&fmt=json&limit=1`
  );
  const mbArtist = searchResult?.artists?.[0];
  if (!mbArtist) {
    console.warn(`  No MusicBrainz artist found for "${artistName}"`);
    return;
  }

  const artist = await upsertArtist(mbArtist);

  const rgResult = await mbFetch<{ "release-groups": MBReleaseGroup[] }>(
    `/release-group?artist=${mbArtist.id}&type=album&fmt=json&limit=100`
  );
  const releaseGroups = (rgResult?.["release-groups"] ?? [])
    .filter((rg) => !rg["secondary-types"]?.length)
    .sort((a, b) =>
      (a["first-release-date"] ?? "9999").localeCompare(b["first-release-date"] ?? "9999")
    )
    .slice(0, MAX_ALBUMS_PER_ARTIST);

  for (const rg of releaseGroups) {
    console.log(`  - ${rg.title}`);
    const releasesResult = await mbFetch<{ releases: MBRelease[] }>(
      `/release?release-group=${rg.id}&fmt=json&limit=25`
    );
    const releases = releasesResult?.releases ?? [];
    const chosen =
      releases.find((r) => r.status === "Official" && r["cover-art-archive"]?.front) ??
      releases.find((r) => r.status === "Official") ??
      releases[0];
    if (!chosen) {
      console.warn(`    No release found, skipping`);
      continue;
    }

    const detail = await mbFetch<MBReleaseDetail>(
      `/release/${chosen.id}?inc=recordings+artist-credits+artist-rels&fmt=json`
    );
    if (!detail) continue;

    const coverUrl = chosen["cover-art-archive"]?.front
      ? await fetchCoverUrl(chosen.id)
      : null;

    const releaseDate = rg["first-release-date"]
      ? new Date(rg["first-release-date"])
      : null;

    const album = await upsertAlbum({
      artistId: artist.id,
      title: rg.title,
      musicbrainzId: rg.id,
      releaseDate: releaseDate && !isNaN(releaseDate.getTime()) ? releaseDate : null,
      coverUrl,
    });

    await importTracksAndCredits(album.id, detail, artist.name);
    await importGenres(album.id, mbArtist.tags ?? []);
  }
}

async function main() {
  console.log(`Importing catalog data for ${ARTISTS.length} artists from MusicBrainz...`);
  for (const artistName of ARTISTS) {
    try {
      await importArtistAlbums(artistName);
    } catch (err) {
      console.error(`Failed on ${artistName}:`, err);
    }
  }
  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
