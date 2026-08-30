import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedTrack = { title: string; durationSec: number };
type SeedCredit = { name: string; role: string };
type SeedAlbum = {
  title: string;
  artist: string;
  releaseDate: string;
  coverUrl: string;
  genres: string[];
  tracks: SeedTrack[];
  credits: SeedCredit[];
};

const albums: SeedAlbum[] = [
  {
    title: "In Rainbows",
    artist: "Radiohead",
    releaseDate: "2007-10-10",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80",
    genres: ["Alternative Rock", "Art Rock"],
    tracks: [
      { title: "15 Step", durationSec: 237 },
      { title: "Bodysnatchers", durationSec: 242 },
      { title: "Nude", durationSec: 255 },
      { title: "Weird Fishes/Arpeggi", durationSec: 318 },
      { title: "All I Need", durationSec: 229 },
      { title: "Reckoner", durationSec: 291 },
      { title: "House of Cards", durationSec: 327 },
      { title: "Jigsaw Falling Into Place", durationSec: 249 },
      { title: "Videotape", durationSec: 281 },
    ],
    credits: [
      { name: "Nigel Godrich", role: "Producer" },
      { name: "Thom Yorke", role: "Vocals, Guitar" },
    ],
  },
  {
    title: "To Pimp a Butterfly",
    artist: "Kendrick Lamar",
    releaseDate: "2015-03-15",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80",
    genres: ["Hip Hop", "Jazz Rap"],
    tracks: [
      { title: "Wesley's Theory", durationSec: 288 },
      { title: "For Free? (Interlude)", durationSec: 129 },
      { title: "King Kunta", durationSec: 234 },
      { title: "Institutionalized", durationSec: 271 },
      { title: "These Walls", durationSec: 320 },
      { title: "u", durationSec: 268 },
      { title: "Alright", durationSec: 219 },
      { title: "The Blacker the Berry", durationSec: 327 },
      { title: "Mortal Man", durationSec: 726 },
    ],
    credits: [
      { name: "Kendrick Lamar", role: "Vocals, Producer" },
      { name: "Terrace Martin", role: "Producer" },
      { name: "Flying Lotus", role: "Producer" },
    ],
  },
  {
    title: "Rumours",
    artist: "Fleetwood Mac",
    releaseDate: "1977-02-04",
    coverUrl:
      "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80",
    genres: ["Rock", "Pop Rock"],
    tracks: [
      { title: "Second Hand News", durationSec: 163 },
      { title: "Dreams", durationSec: 254 },
      { title: "Never Going Back Again", durationSec: 134 },
      { title: "Don't Stop", durationSec: 191 },
      { title: "Go Your Own Way", durationSec: 218 },
      { title: "The Chain", durationSec: 271 },
    ],
    credits: [
      { name: "Ken Caillat", role: "Producer" },
      { name: "Fleetwood Mac", role: "Producer" },
    ],
  },
  {
    title: "Blonde",
    artist: "Frank Ocean",
    releaseDate: "2016-08-20",
    coverUrl:
      "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&q=80",
    genres: ["R&B", "Alternative R&B"],
    tracks: [
      { title: "Nikes", durationSec: 314 },
      { title: "Ivy", durationSec: 249 },
      { title: "Pink + White", durationSec: 187 },
      { title: "Solo", durationSec: 257 },
      { title: "Self Control", durationSec: 249 },
      { title: "Nights", durationSec: 307 },
    ],
    credits: [
      { name: "Frank Ocean", role: "Vocals, Producer" },
      { name: "Malay", role: "Producer" },
    ],
  },
  {
    title: "Discovery",
    artist: "Daft Punk",
    releaseDate: "2001-03-12",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80&sat=-50",
    genres: ["Electronic", "House"],
    tracks: [
      { title: "One More Time", durationSec: 320 },
      { title: "Aerodynamic", durationSec: 212 },
      { title: "Digital Love", durationSec: 300 },
      { title: "Harder, Better, Faster, Stronger", durationSec: 224 },
      { title: "Voyager", durationSec: 228 },
    ],
    credits: [
      { name: "Thomas Bangalter", role: "Producer" },
      { name: "Guy-Manuel de Homem-Christo", role: "Producer" },
    ],
  },
  {
    title: "Blue",
    artist: "Joni Mitchell",
    releaseDate: "1971-06-22",
    coverUrl:
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&q=80",
    genres: ["Folk", "Singer-Songwriter"],
    tracks: [
      { title: "All I Want", durationSec: 218 },
      { title: "My Old Man", durationSec: 199 },
      { title: "Little Green", durationSec: 214 },
      { title: "Carey", durationSec: 213 },
      { title: "Blue", durationSec: 165 },
      { title: "River", durationSec: 244 },
    ],
    credits: [{ name: "Joni Mitchell", role: "Vocals, Producer" }],
  },
  {
    title: "good kid, m.A.A.d city",
    artist: "Kendrick Lamar",
    releaseDate: "2012-10-22",
    coverUrl:
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80&sat=-30",
    genres: ["Hip Hop", "West Coast Hip Hop"],
    tracks: [
      { title: "Sherane a.k.a Master Splinter's Daughter", durationSec: 252 },
      { title: "Bitch, Don't Kill My Vibe", durationSec: 320 },
      { title: "Backseat Freestyle", durationSec: 220 },
      { title: "Money Trees", durationSec: 386 },
      { title: "Swimming Pools (Drank)", durationSec: 313 },
    ],
    credits: [
      { name: "Kendrick Lamar", role: "Vocals" },
      { name: "Dr. Dre", role: "Executive Producer" },
    ],
  },
  {
    title: "Norman Fucking Rockwell!",
    artist: "Lana Del Rey",
    releaseDate: "2019-08-30",
    coverUrl:
      "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=600&q=80&sat=-30",
    genres: ["Pop", "Baroque Pop"],
    tracks: [
      { title: "Norman fucking Rockwell", durationSec: 335 },
      { title: "Mariners Apartment Complex", durationSec: 249 },
      { title: "Venice Bitch", durationSec: 574 },
      { title: "Doin' Time", durationSec: 200 },
      { title: "The Greatest", durationSec: 281 },
    ],
    credits: [
      { name: "Jack Antonoff", role: "Producer" },
      { name: "Lana Del Rey", role: "Vocals, Producer" },
    ],
  },
];

const users = [
  { username: "vivan", email: "vivan@example.com", name: "Vivan" },
  { username: "samarpana", email: "samarpana@example.com", name: "Samarpana" },
  { username: "saivya", email: "saivya@example.com", name: "Saivya" },
  { username: "rashi", email: "rashi@example.com", name: "Rashi" },
];

async function main() {
  console.log("Seeding genres, artists, and albums...");

  const genreNames = Array.from(new Set(albums.flatMap((a) => a.genres)));
  const genreByName = new Map<string, string>();
  for (const name of genreNames) {
    const genre = await prisma.genre.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    genreByName.set(name, genre.id);
  }

  const artistNames = Array.from(new Set(albums.map((a) => a.artist)));
  const artistByName = new Map<string, string>();
  for (const name of artistNames) {
    let artist = await prisma.artist.findFirst({ where: { name } });
    if (!artist) {
      artist = await prisma.artist.create({ data: { name } });
    }
    artistByName.set(name, artist.id);
  }

  const albumIds: string[] = [];
  for (const a of albums) {
    const existing = await prisma.album.findFirst({ where: { title: a.title } });
    const album =
      existing ??
      (await prisma.album.create({
        data: {
          title: a.title,
          coverUrl: a.coverUrl,
          releaseDate: new Date(a.releaseDate),
          artistId: artistByName.get(a.artist)!,
          tracks: {
            create: a.tracks.map((t, i) => ({
              title: t.title,
              trackNumber: i + 1,
              durationSec: t.durationSec,
            })),
          },
          credits: {
            create: a.credits,
          },
          genres: {
            create: a.genres.map((g) => ({ genreId: genreByName.get(g)! })),
          },
        },
      }));
    albumIds.push(album.id);
  }

  console.log("Seeding demo users...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const userIds: string[] = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash, bio: `Hi, I'm ${u.name}. Music is life.` },
    });
    userIds.push(user.id);
  }

  console.log("Seeding follow graph...");
  for (let i = 0; i < userIds.length; i++) {
    for (let j = 0; j < userIds.length; j++) {
      if (i === j) continue;
      if ((i + j) % 2 === 0) {
        await prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: userIds[i],
              followingId: userIds[j],
            },
          },
          update: {},
          create: { followerId: userIds[i], followingId: userIds[j] },
        });
      }
    }
  }

  console.log("Seeding logs, reviews, likes, comments...");
  const sampleReviews = [
    "A masterclass in mood and texture. Revisits well.",
    "Every track earns its place on this one.",
    "Grew on me a lot after the third listen.",
    "Not my favorite from this artist but still solid.",
    "This is the one I put on when I need to think.",
  ];

  let logCounter = 0;
  const createdLogIds: string[] = [];
  for (let ui = 0; ui < userIds.length; ui++) {
    for (let ai = 0; ai < albumIds.length; ai++) {
      if ((ui + ai) % 2 !== 0) continue;
      logCounter++;
      const rating = [3, 3.5, 4, 4.5, 5][(ui + ai) % 5];
      const daysAgo = ((ui + 1) * (ai + 1)) % 40;
      const log = await prisma.log.create({
        data: {
          userId: userIds[ui],
          albumId: albumIds[ai],
          rating,
          reviewText: (ui + ai) % 3 === 0 ? sampleReviews[(ui + ai) % sampleReviews.length] : null,
          listenedAt: new Date(Date.now() - daysAgo * 86400000),
        },
      });
      createdLogIds.push(log.id);
    }
  }

  for (const logId of createdLogIds) {
    for (const userId of userIds) {
      if (Math.random() < 0.3) {
        await prisma.like.upsert({
          where: { userId_logId: { userId, logId } },
          update: {},
          create: { userId, logId },
        });
      }
    }
  }

  const commentTexts = [
    "This is such a good pick.",
    "Adding this to my queue right now.",
    "Completely agree with this take.",
    "Underrated album honestly.",
  ];
  for (const logId of createdLogIds.slice(0, 10)) {
    const commenter = userIds[Math.floor(Math.random() * userIds.length)];
    await prisma.comment.create({
      data: {
        logId,
        userId: commenter,
        text: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      },
    });
  }

  console.log("Seeding Five Faves...");
  for (const userId of userIds) {
    const shuffled = [...albumIds].sort(() => Math.random() - 0.5).slice(0, 5);
    for (let i = 0; i < shuffled.length; i++) {
      await prisma.fiveFave.upsert({
        where: { userId_position: { userId, position: i + 1 } },
        update: { albumId: shuffled[i] },
        create: { userId, albumId: shuffled[i], position: i + 1 },
      });
    }
  }

  console.log(`Done. ${logCounter} logs created across ${userIds.length} users and ${albumIds.length} albums.`);
  console.log("Demo login: any of vivan / samarpana / saivya / rashi, password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
