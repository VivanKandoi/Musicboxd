-- AlterTable
ALTER TABLE "Track" ADD COLUMN "allmusicId" TEXT;
ALTER TABLE "Track" ADD COLUMN "arousal" REAL;
ALTER TABLE "Track" ADD COLUMN "quadrant" TEXT;
ALTER TABLE "Track" ADD COLUMN "songTags" JSONB;
ALTER TABLE "Track" ADD COLUMN "valence" REAL;

-- CreateTable
CREATE TABLE "TrackEmbedding" (
    "trackId" TEXT NOT NULL,
    "space" TEXT NOT NULL,
    "dim" INTEGER NOT NULL,
    "vector" BLOB NOT NULL,

    PRIMARY KEY ("trackId", "space"),
    CONSTRAINT "TrackEmbedding_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TrackEmbedding_space_idx" ON "TrackEmbedding"("space");

-- CreateIndex
CREATE UNIQUE INDEX "Track_allmusicId_key" ON "Track"("allmusicId");

