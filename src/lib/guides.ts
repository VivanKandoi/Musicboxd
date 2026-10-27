import { prisma } from "@/lib/prisma";

export type Guide = {
  slug: string;
  title: string;
  kind: "genre" | "era";
  tagline: string;
  intro: string;
  genreNames?: string[];
  yearRange?: [number, number];
  gradient: string;
};

export const GUIDES: Guide[] = [
  {
    slug: "90s-alternative-grunge",
    title: "90s Alternative & Grunge",
    kind: "era",
    tagline: "Flannel, feedback, and radio-ready angst",
    intro:
      "The decade distortion went mainstream. A loose Seattle scene and a wave of alt-rock bands turned guitar fuzz and unresolved tension into the dominant sound of the era.",
    genreNames: ["Grunge", "Alternative Rock", "Post-grunge", "Alternative"],
    yearRange: [1990, 1999],
    gradient: "#6b7280, #374151",
  },
  {
    slug: "golden-age-hip-hop",
    title: "Golden Age Hip Hop",
    kind: "era",
    tagline: "The genre's most inventive, combative decade",
    intro:
      "From sample-heavy boom bap to coast-to-coast rivalries, this stretch set the vocabulary — rhyme schemes, production techniques, and attitude — that hip hop is still built on.",
    genreNames: [
      "Hip Hop",
      "East Coast Hip Hop",
      "West Coast Hip Hop",
      "Boom Bap",
      "Conscious Hip Hop",
      "Gangsta Rap",
    ],
    yearRange: [1986, 1999],
    gradient: "#f59e0b, #b45309",
  },
  {
    slug: "neo-soul-rnb",
    title: "Neo-Soul & R&B Deep Dive",
    kind: "genre",
    tagline: "Live instrumentation meets hip hop's pocket",
    intro:
      "Where classic soul's warmth met hip hop-influenced rhythm — loose grooves, jazzy chords, and unmistakably human performances.",
    genreNames: ["Neo Soul", "R&B", "Contemporary R&b", "Quiet Storm", "Alternative R&B"],
    gradient: "#be185d, #831843",
  },
  {
    slug: "psychedelic-progressive-rock",
    title: "Psychedelic & Progressive Rock",
    kind: "genre",
    tagline: "Concept albums, odd time signatures, altered states",
    intro:
      "Rock bands stopped thinking in three-minute singles and started thinking in suites — expanding the palette with studio experimentation and virtuosic playing.",
    genreNames: ["Psychedelic Rock", "Progressive Rock", "Art Rock", "Neo-psychedelia"],
    gradient: "#7c3aed, #4c1d95",
  },
  {
    slug: "post-punk-new-wave",
    title: "Post-Punk & New Wave",
    kind: "genre",
    tagline: "Punk's energy, rerouted through synths and art school",
    intro:
      "After punk burned fast and bright, its survivors got stranger — angular guitars, drum machines, and a colder, more cerebral kind of urgency.",
    genreNames: ["Post-punk", "New Wave", "Gothic Rock", "Art Punk", "Dance-punk"],
    gradient: "#0f766e, #134e4a",
  },
  {
    slug: "2010s-indie-bedroom-pop",
    title: "2010s Indie & Bedroom Pop",
    kind: "era",
    tagline: "Home recording goes mainstream",
    intro:
      "Cheap recording gear and internet distribution let a generation of artists make intimate, lo-fi records in their bedrooms — and still reach an audience.",
    genreNames: ["Indie Pop", "Indie Rock", "Indie Folk", "Noise Pop", "Folktronica"],
    yearRange: [2010, 2019],
    gradient: "#ec4899, #db2777",
  },
  {
    slug: "jazz-essentials",
    title: "Jazz Essentials: Bebop to Fusion",
    kind: "genre",
    tagline: "A half-century of reinvention in one genre",
    intro:
      "From the breakneck virtuosity of bebop to the electric experiments of fusion, jazz spent decades refusing to sit still.",
    genreNames: ["Jazz", "Modal Jazz", "Hard Bop", "Jazz Fusion", "Free Jazz", "Vocal Jazz"],
    gradient: "#1d4ed8, #1e3a8a",
  },
  {
    slug: "trap-modern-rap",
    title: "Trap & Modern Rap",
    kind: "era",
    tagline: "808s, ad-libs, and streaming-era hip hop",
    intro:
      "Atlanta's trap sound became the default grammar of modern rap — hi-hat rolls, sub-bass, and a streaming economy built for singles over albums.",
    genreNames: ["Trap", "Pop Rap", "Southern Hip Hop", "Hardcore Hip Hop"],
    yearRange: [2012, 2026],
    gradient: "#dc2626, #7f1d1d",
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export async function getGuidePicks(guide: Guide, take = 12) {
  const where = {
    AND: [
      guide.genreNames
        ? { genres: { some: { genre: { name: { in: guide.genreNames } } } } }
        : {},
      guide.yearRange
        ? {
            releaseDate: {
              gte: new Date(`${guide.yearRange[0]}-01-01`),
              lte: new Date(`${guide.yearRange[1]}-12-31`),
            },
          }
        : {},
    ],
  };

  const albums = await prisma.album.findMany({
    where,
    select: {
      id: true,
      title: true,
      coverUrl: true,
      releaseDate: true,
      artist: { select: { name: true } },
      logs: { where: { rating: { not: null } }, select: { rating: true } },
    },
    take: 150,
  });

  const ranked = albums
    .map((a) => {
      const ratings = a.logs.map((l) => l.rating as number);
      const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
      return { ...a, avgRating: avg, ratingCount: ratings.length };
    })
    .sort((a, b) => {
      if (a.avgRating == null && b.avgRating == null) return 0;
      if (a.avgRating == null) return 1;
      if (b.avgRating == null) return -1;
      if (b.ratingCount !== a.ratingCount && (b.ratingCount < 3 || a.ratingCount < 3)) {
        return b.ratingCount - a.ratingCount;
      }
      return b.avgRating - a.avgRating;
    })
    .slice(0, take);

  return ranked.map((a) => ({
    id: a.id,
    title: a.title,
    coverUrl: a.coverUrl,
    artist: a.artist.name,
    year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : null,
    avgRating: a.avgRating,
    ratingCount: a.ratingCount,
  }));
}
