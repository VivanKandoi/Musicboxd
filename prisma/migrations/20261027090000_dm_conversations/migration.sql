-- Move direct messages from sender/recipient columns to conversations + participants.

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "directKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" DATETIME,

    PRIMARY KEY ("conversationId", "userId"),
    CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Backfill: one conversation per pair of users who have exchanged messages.
-- directKey is the two user ids sorted and joined with ":".
INSERT INTO "Conversation" ("id", "isGroup", "directKey", "createdAt", "updatedAt")
SELECT
    'c' || lower(hex(randomblob(12))),
    false,
    k,
    MIN("createdAt"),
    MAX("createdAt")
FROM (
    SELECT min("senderId", "recipientId") || ':' || max("senderId", "recipientId") AS k, "createdAt"
    FROM "Message"
)
GROUP BY k;

-- Both people join; read state carries over as "last read up to the newest message
-- they had marked read".
INSERT INTO "ConversationParticipant" ("conversationId", "userId", "joinedAt", "lastReadAt")
SELECT c."id", u."userId", c."createdAt",
    (SELECT MAX(m."createdAt") FROM "Message" m
     WHERE m."recipientId" = u."userId"
       AND m."readAt" IS NOT NULL
       AND min(m."senderId", m."recipientId") || ':' || max(m."senderId", m."recipientId") = c."directKey")
FROM "Conversation" c
JOIN (
    SELECT DISTINCT min("senderId", "recipientId") || ':' || max("senderId", "recipientId") AS k, "senderId" AS "userId" FROM "Message"
    UNION
    SELECT DISTINCT min("senderId", "recipientId") || ':' || max("senderId", "recipientId") AS k, "recipientId" AS "userId" FROM "Message"
) u ON u.k = c."directKey";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT,
    "sharedAlbumId" TEXT,
    "sharedLogId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_sharedAlbumId_fkey" FOREIGN KEY ("sharedAlbumId") REFERENCES "Album" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_sharedLogId_fkey" FOREIGN KEY ("sharedLogId") REFERENCES "Log" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("id", "conversationId", "senderId", "text", "sharedAlbumId", "sharedLogId", "createdAt")
SELECT m."id", c."id", m."senderId", m."text", m."sharedAlbumId", m."sharedLogId", m."createdAt"
FROM "Message" m
JOIN "Conversation" c
  ON c."directKey" = min(m."senderId", m."recipientId") || ':' || max(m."senderId", m."recipientId");
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_directKey_key" ON "Conversation"("directKey");
CREATE INDEX "Conversation_updatedAt_idx" ON "Conversation"("updatedAt");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");
