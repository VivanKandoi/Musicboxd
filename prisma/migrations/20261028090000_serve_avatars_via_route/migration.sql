-- Avatars are now served by /api/avatars/[file] instead of from public/ (Next.js only serves
-- public/ files that existed at build time). The route still reads old files from
-- public/uploads/avatars, so only the URL changes.
UPDATE "User"
SET "avatarUrl" = '/api/avatars/' || substr("avatarUrl", length('/uploads/avatars/') + 1)
WHERE "avatarUrl" LIKE '/uploads/avatars/%';
