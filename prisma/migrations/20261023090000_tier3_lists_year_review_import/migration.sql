-- CreateTable
CREATE TABLE "ListMember" (
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("listId", "userId"),
    CONSTRAINT "ListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankedList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "ListInvite_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankedList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "YearStats" (
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "year"),
    CONSTRAINT "YearStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'lastfm',
    "externalUser" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stage" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "matched" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "unmatched" INTEGER NOT NULL DEFAULT 0,
    "listensCreated" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumTitle" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "listens" JSONB NOT NULL,
    "candidates" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAlbumId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportReviewItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportReviewItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "rating" REAL,
    "reviewText" TEXT,
    "listenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRelisten" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "playCount" INTEGER,
    "importKey" TEXT,
    CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Log_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("albumId", "createdAt", "id", "isRelisten", "listenedAt", "rating", "reviewText", "userId") SELECT "albumId", "createdAt", "id", "isRelisten", "listenedAt", "rating", "reviewText", "userId" FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
CREATE UNIQUE INDEX "Log_importKey_key" ON "Log"("importKey");
CREATE INDEX "Log_userId_idx" ON "Log"("userId");
CREATE INDEX "Log_albumId_idx" ON "Log"("albumId");
CREATE INDEX "Log_userId_createdAt_idx" ON "Log"("userId", "createdAt");
CREATE INDEX "Log_userId_listenedAt_idx" ON "Log"("userId", "listenedAt");

CREATE TABLE "new_RankedListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "note" TEXT,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RankedListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankedList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RankedListItem_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RankedListItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- Backfill: turn the old integer positions into fractional-index keys ("b" + two
-- base-62 digits, valid for the fractional-indexing library and in the same order),
-- and credit existing items to the list owner.
INSERT INTO "new_RankedListItem" ("id", "listId", "albumId", "rank", "note", "addedById")
SELECT
    i."id",
    i."listId",
    i."albumId",
    'b'
      || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', ((r.rn - 1) / 62) + 1, 1)
      || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', ((r.rn - 1) % 62) + 1, 1),
    i."note",
    l."userId"
FROM "RankedListItem" i
JOIN (
    SELECT "id", ROW_NUMBER() OVER (PARTITION BY "listId" ORDER BY "position", "id") AS rn
    FROM "RankedListItem"
) r ON r."id" = i."id"
JOIN "RankedList" l ON l."id" = i."listId";
DROP TABLE "RankedListItem";
ALTER TABLE "new_RankedListItem" RENAME TO "RankedListItem";
CREATE INDEX "RankedListItem_listId_rank_idx" ON "RankedListItem"("listId", "rank");
CREATE UNIQUE INDEX "RankedListItem_listId_albumId_key" ON "RankedListItem"("listId", "albumId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: every existing list's creator becomes its owner member.
INSERT INTO "ListMember" ("listId", "userId", "role")
SELECT "id", "userId", 'owner' FROM "RankedList";

-- CreateIndex
CREATE INDEX "ListMember_userId_idx" ON "ListMember"("userId");
CREATE UNIQUE INDEX "ListInvite_token_key" ON "ListInvite"("token");
CREATE INDEX "ListInvite_listId_idx" ON "ListInvite"("listId");
CREATE INDEX "ImportJob_userId_createdAt_idx" ON "ImportJob"("userId", "createdAt");
CREATE INDEX "ImportReviewItem_userId_status_idx" ON "ImportReviewItem"("userId", "status");
