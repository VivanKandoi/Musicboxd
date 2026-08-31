-- AlterTable
ALTER TABLE "Album" ADD COLUMN "musicbrainzId" TEXT;

-- AlterTable
ALTER TABLE "Artist" ADD COLUMN "musicbrainzId" TEXT;

-- AlterTable
ALTER TABLE "Track" ADD COLUMN "musicbrainzId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Album_musicbrainzId_key" ON "Album"("musicbrainzId");

-- CreateIndex
CREATE UNIQUE INDEX "Artist_musicbrainzId_key" ON "Artist"("musicbrainzId");

-- CreateIndex
CREATE UNIQUE INDEX "Track_musicbrainzId_key" ON "Track"("musicbrainzId");
