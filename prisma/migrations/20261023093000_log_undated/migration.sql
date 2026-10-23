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
    "undated" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Log_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Log" ("albumId", "createdAt", "id", "importKey", "isRelisten", "listenedAt", "playCount", "rating", "reviewText", "source", "userId") SELECT "albumId", "createdAt", "id", "importKey", "isRelisten", "listenedAt", "playCount", "rating", "reviewText", "source", "userId" FROM "Log";
DROP TABLE "Log";
ALTER TABLE "new_Log" RENAME TO "Log";
CREATE UNIQUE INDEX "Log_importKey_key" ON "Log"("importKey");
CREATE INDEX "Log_userId_idx" ON "Log"("userId");
CREATE INDEX "Log_albumId_idx" ON "Log"("albumId");
CREATE INDEX "Log_userId_createdAt_idx" ON "Log"("userId", "createdAt");
CREATE INDEX "Log_userId_listenedAt_idx" ON "Log"("userId", "listenedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

