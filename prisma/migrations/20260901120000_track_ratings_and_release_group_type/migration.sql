-- CreateTable
CREATE TABLE "TrackRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrackRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrackRating_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Album" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "coverUrl" TEXT,
    "releaseDate" DATETIME,
    "releaseGroupType" TEXT NOT NULL DEFAULT 'Album',
    "artistId" TEXT NOT NULL,
    "spotifyId" TEXT,
    "discogsId" TEXT,
    "musicbrainzId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Album_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Album" ("artistId", "coverUrl", "createdAt", "discogsId", "id", "musicbrainzId", "releaseDate", "spotifyId", "title") SELECT "artistId", "coverUrl", "createdAt", "discogsId", "id", "musicbrainzId", "releaseDate", "spotifyId", "title" FROM "Album";
DROP TABLE "Album";
ALTER TABLE "new_Album" RENAME TO "Album";
CREATE UNIQUE INDEX "Album_spotifyId_key" ON "Album"("spotifyId");
CREATE UNIQUE INDEX "Album_discogsId_key" ON "Album"("discogsId");
CREATE UNIQUE INDEX "Album_musicbrainzId_key" ON "Album"("musicbrainzId");
CREATE INDEX "Album_artistId_idx" ON "Album"("artistId");
CREATE INDEX "Album_title_idx" ON "Album"("title");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrackRating_trackId_idx" ON "TrackRating"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackRating_userId_trackId_key" ON "TrackRating"("userId", "trackId");
