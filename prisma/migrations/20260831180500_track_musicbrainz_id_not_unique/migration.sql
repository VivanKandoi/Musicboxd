-- DropIndex
DROP INDEX "Track_musicbrainzId_key";

-- CreateIndex
CREATE INDEX "Track_musicbrainzId_idx" ON "Track"("musicbrainzId");
