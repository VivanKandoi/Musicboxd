// Fallback cover pass for Semantic Discovery albums that still have no art after
// `npm run semantic:enrich`:
//  - albums matched to MusicBrainz: try the album's other releases (reissues, other countries)
//  - placeholder singles (no MusicBrainz match): search MusicBrainz for a release group with
//    the song's title by the same artist and use its cover only on a confident match
//   npm run semantic:covers
import { prisma } from "../../src/lib/prisma";
import { caaCover, mbGet } from "../../src/lib/musicbrainz";
import { normalizeArtist, normalizeTitle, similarity } from "../../src/lib/import-matching";

type Release = { id: string; status?: string; "cover-art-archive"?: { front?: boolean } };
type ReleaseGroupHit = { id: string; title: string; "artist-credit"?: { name: string; artist: { name: string } }[] };

const esc = (s: string) => s.replace(/(["\\])/g, "\\$1");

async function fromOtherReleases(releaseGroupMbid: string) {
  const data = await mbGet<{ releases: Release[] }>(`/release?release-group=${releaseGroupMbid}&fmt=json&limit=50`);
  const withArt = (data?.releases ?? [])
    .filter((r) => r["cover-art-archive"]?.front)
    .sort((a, b) => Number(b.status === "Official") - Number(a.status === "Official"));
  for (const r of withArt.slice(0, 3)) {
    const url = await caaCover(`release/${r.id}`);
    if (url) return url;
  }
  return null;
}

async function fromReleaseGroupSearch(title: string, artist: string) {
  const query = `releasegroup:"${esc(title)}" AND artist:"${esc(artist)}"`;
  const data = await mbGet<{ "release-groups": ReleaseGroupHit[] }>(
    `/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=10`
  );
  const wantTitle = normalizeTitle(title);
  const wantArtist = normalizeArtist(artist);
  for (const rg of data?.["release-groups"] ?? []) {
    const credit = rg["artist-credit"]?.[0];
    if (!credit) continue;
    const titleOk = similarity(wantTitle, normalizeTitle(rg.title)) >= 0.9;
    const artistOk = similarity(wantArtist, normalizeArtist(credit.artist.name)) >= 0.85;
    if (!titleOk || !artistOk) continue;
    const url = (await caaCover(`release-group/${rg.id}`)) ?? (await fromOtherReleases(rg.id));
    if (url) return url;
  }
  return null;
}

async function main() {
  const albums = await prisma.album.findMany({
    where: { coverUrl: null, tracks: { some: { allmusicId: { not: null } } } },
    select: { id: true, title: true, musicbrainzId: true, artist: { select: { name: true } } },
  });
  console.log(`${albums.length} Semantic Discovery albums without a cover`);

  let found = 0;
  for (const [i, album] of albums.entries()) {
    const url = album.musicbrainzId
      ? await fromOtherReleases(album.musicbrainzId)
      : await fromReleaseGroupSearch(album.title, album.artist.name);
    if (url) {
      await prisma.album.update({ where: { id: album.id }, data: { coverUrl: url } });
      found += 1;
    }
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${albums.length} checked · ${found} covers found`);
  }
  const remaining = await prisma.album.count({ where: { coverUrl: null, tracks: { some: { allmusicId: { not: null } } } } });
  console.log(`Done: ${found} more covers found; ${remaining} albums still have no cover art on MusicBrainz.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
