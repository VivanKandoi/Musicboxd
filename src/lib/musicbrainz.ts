// Small MusicBrainz client for the scheduled jobs. MusicBrainz allows about one request
// per second and requires a descriptive User-Agent.
const MB_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MusicBoxd/1.0 (https://github.com/VivanKandoi)";
const MIN_INTERVAL_MS = 1100;

let lastCall = 0;

export async function mbGet<T>(path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = lastCall + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();

    try {
      const res = await fetch(`${MB_BASE}${path}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  return null;
}

export type MBReleaseGroup = {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
};

export type MBRelease = {
  id: string;
  title: string;
  date?: string;
  status?: string;
  disambiguation?: string;
};

// Only full YYYY-MM-DD dates are usable for a calendar.
export function parseFullDate(date: string | undefined) {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
}
