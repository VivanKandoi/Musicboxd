# Future work and operating notes

Material for the report's "future work" and "implementation" sections. Verdicts follow the
Tier 3 plan (Oct 22, 2026).

## Deferred

**Local scene pages.** Deferred because event data is the blocker: Songkick's API is largely
closed to new developers and Bandsintown's requires approval. The feature also doesn't support
the thesis (audio–lyric representation learning). If revived: launch in 3–5 cities using
MusicBrainz area data for artists plus user-submitted shows, rather than a third-party events API.

**Native mobile app.** Deferred in favour of a responsive web app. The backend is already
API-first (every mutation is a JSON route handler under `src/app/api`), and the web app has a
mobile tab bar and phone-width layouts. If the project continues, React Native / Expo can reuse
those routes; a PWA manifest is the cheaper intermediate step.

## Built as "design only"

**Premium tier.** Entitlements live in an `Entitlement` table and are checked only through
`hasEntitlement()` in `src/lib/entitlements.ts`. A mock toggle in Settings grants them
(`source = "mock"`). The one Premium feature, custom album covers, is a per-user `CustomCover`
override applied only in that user's own views. Not built: Stripe billing (a webhook would
grant/revoke rows with `source = "stripe"`, with no other code changes) and ads.

**Group messaging.** Direct messages are stored as `Conversation` + `ConversationParticipant`
+ `Message`, not sender/recipient columns. A group chat is a conversation with
`isGroup = true`, a `title`, and more than two participants; unread state is per participant
(`lastReadAt`). Remaining work is UI only: creating a group, adding/removing people, and a
thread view keyed by conversation id instead of username.

## Known limitations

- **Email notifications.** The preference is stored, but no email is sent; it needs a mail
  provider (e.g. Resend or Amazon SES free tier) and a sender domain.
- **Recommendation evaluation.** `npm run eval:recs` measures Hit rate@10 / NDCG@10 against
  popularity and association-rule baselines. On the seeded demo data the numbers are not
  meaningful (3 synthetic users whose seed draws from a shared album pool, which favours the
  popularity baseline). Report results from `npm run eval:recs -- --source=lastfm` after
  several real Last.fm accounts have been imported.
- **Reissue detection** only scans MusicBrainz release titles and disambiguation comments for
  words like "deluxe" or "remaster", and checks a rotating slice of 60 highly rated albums per
  night to stay within MusicBrainz's rate limit.
- **Avatar uploads** are written to `public/uploads/avatars`, but Next.js only serves `public/`
  files that existed at build time, so new avatars won't appear on a production build until
  they're served through a route the way custom covers are (`/api/covers/[file]`).
- **Imported top albums** have play counts but no dates; they are stored as `undated` listens and
  kept out of date-based views (diary, streaks, year in review, "on this day").

## Scheduled jobs

| Command | When | What it does |
| --- | --- | --- |
| `npm run jobs:year-stats` | nightly | Precomputes year-in-review stats |
| `npm run jobs:releases` | nightly | Syncs followed artists' releases from MusicBrainz; sends release-day, anniversary (10/20/25/50 years) and reissue notifications |
| `npm run jobs:import-worker` | always on, or cron with `--once` | Runs Last.fm imports when the web app has `IMPORT_WORKER=external` (needed on serverless hosts) |

Example crontab (server time UTC):

```
15 3 * * *  cd /srv/musicboxd && npm run jobs:year-stats
30 3 * * *  cd /srv/musicboxd && npm run jobs:releases
*/5 * * * * cd /srv/musicboxd && npm run jobs:import-worker -- --once
```

## Evaluation commands

- `npm run eval:year-stats` — year-in-review vs an independent SQL recount for 3 seeded users.
- `npm run eval:recs [-- --source=lastfm]` — recommendations vs baselines.
- Still to build (Track A): Recall@10 on ~50 hand-labelled natural-language search queries, and
  rater agreement for GNN thematic tags.
