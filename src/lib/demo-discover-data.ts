// Static placeholder content for the Discover / semantic-search preview.
// There is no ML model behind this yet (see project scope: audio-lyric
// embedding search is a later phase) - this is a visual demo of where that
// feature will live, not a working recommender.

export const DEMO_RECOMMENDATIONS = [
  {
    title: "Retrograde Motion",
    artist: "Solaris Unit",
    reason: "Similar to your recent listens · High energy synth",
    match: 98,
    gradient: "#7c3aed, #ec4899",
  },
  {
    title: "Whispers of the Sea",
    artist: "Oceanic Mist",
    reason: "Based on your recent mood",
    match: 94,
    gradient: "#0ea5e9, #06b6d4",
  },
  {
    title: "Starlight Drive",
    artist: "Hologram Club",
    reason: "Perfect fit for night-driving tempo curves",
    match: 91,
    gradient: "#f59e0b, #ef4444",
  },
];

export const DEMO_SUGGESTIONS = [
  "Upbeat songs for a rainy day",
  "Music that sounds like driving at sunset",
  "Melancholy but beautiful instrumentals",
  "Slow acoustic lo-fi beat warm ambient",
];

export type DemoDiscoverResult = {
  slug: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  match: number;
  tags: string[];
  gradient: string;
  audioProfile: { label: string; value: number };
  lyricRelevance: { label: string; value: number };
  reviewSentiment: { label: string; value: number };
  themes: string[];
  summary: string;
  reviewInfluences: { name: string; quote: string }[];
};

export const DEMO_DISCOVER_RESULTS: DemoDiscoverResult[] = [
  {
    slug: "halcyon-days",
    title: "Halcyon Days",
    artist: "Memory Lane",
    album: "Nostalgia Trip",
    year: 2024,
    match: 94,
    tags: ["nostalgic", "hopeful", "warm"],
    gradient: "#f59e0b, #ef4444",
    audioProfile: { label: "Acoustic warmth, medium tempo, analog grain", value: 45 },
    lyricRelevance: { label: "Reflections on passing youth, summer endings", value: 30 },
    reviewSentiment: { label: "Frequently cited as ‘beautifully nostalgic’", value: 25 },
    themes: ["#nostalgia", "#hope", "#warmth", "#acoustic-intimacy", "#fading-summer", "#melancholy-twilight"],
    summary:
      "“Halcyon Days” surfaces because its acoustic fingerprint aligns with a “hopeful yet nostalgic sunset” mood. The lyrics lean on bittersweet imagery of twilight and changing seasons, layered over warm, organic guitar tones that mirror that nostalgia.",
    reviewInfluences: [
      { name: "Dana Miller", quote: "This sounds exactly like sitting on a warm porch watching the sun dip below the trees." },
      { name: "Leo Kim", quote: "Bittersweet melodies that remind you of old friends you haven't seen in a decade." },
    ],
  },
  {
    slug: "golden-hour-shimmer",
    title: "Golden Hour Shimmer",
    artist: "Lofi Fields",
    album: "Golden Hour Shimmer",
    year: 2023,
    match: 92,
    tags: ["hopeful", "dreamy", "acoustic"],
    gradient: "#fb923c, #f59e0b",
    audioProfile: { label: "Bright acoustic guitar, mid tempo, tape warmth", value: 42 },
    lyricRelevance: { label: "Optimistic imagery of open roads and light", value: 33 },
    reviewSentiment: { label: "Often described as ‘comforting’", value: 25 },
    themes: ["#golden-hour", "#hope", "#daydream", "#acoustic"],
    summary:
      "A dreamy, acoustic-forward track whose bright chord voicings and optimistic lyrical imagery match a warm, hopeful mood profile closely.",
    reviewInfluences: [
      { name: "Priya N.", quote: "The kind of song that makes an ordinary drive feel cinematic." },
    ],
  },
  {
    slug: "echoes-of-the-coast",
    title: "Echoes of the Coast",
    artist: "Coastal Drift",
    album: "Echoes of the Coast",
    year: 2022,
    match: 89,
    tags: ["nostalgic", "airy", "sea mist"],
    gradient: "#0ea5e9, #38bdf8",
    audioProfile: { label: "Airy reverb, sparse instrumentation", value: 40 },
    lyricRelevance: { label: "Coastal, distance, and memory imagery", value: 35 },
    reviewSentiment: { label: "Reviewers cite ‘wistful’ often", value: 25 },
    themes: ["#coastal", "#nostalgia", "#reverb", "#memory"],
    summary:
      "Sparse, reverb-heavy production and lyrics steeped in coastal memory give this track a wistful, nostalgic character.",
    reviewInfluences: [
      { name: "Owen T.", quote: "Feels like looking at old photos from a summer you can barely remember." },
    ],
  },
  {
    slug: "autumn-leaves-whispering",
    title: "Autumn Leaves Whispering",
    artist: "Folk Whisper",
    album: "Autumn Leaves Whispering",
    year: 2021,
    match: 87,
    tags: ["warm", "intimate", "gentle"],
    gradient: "#b45309, #f59e0b",
    audioProfile: { label: "Fingerpicked guitar, close-mic vocals", value: 48 },
    lyricRelevance: { label: "Gentle, seasonal, intimate storytelling", value: 32 },
    reviewSentiment: { label: "Described as ‘gentle’ and ‘warm’", value: 20 },
    themes: ["#autumn", "#intimacy", "#fingerpicked", "#gentle"],
    summary:
      "Close-mic'd vocals and fingerpicked guitar create an intimate, gentle atmosphere that mirrors warm, nostalgic seasonal imagery.",
    reviewInfluences: [
      { name: "Maya R.", quote: "Feels like a quiet conversation with an old friend." },
    ],
  },
  {
    slug: "sorrow-and-silk",
    title: "Sorrow & Silk",
    artist: "Elysian Bloom",
    album: "Sorrow & Silk",
    year: 2024,
    match: 85,
    tags: ["hopeful", "melancholy", "beautiful"],
    gradient: "#6366f1, #a855f7",
    audioProfile: { label: "Orchestral pop, lush strings", value: 44 },
    lyricRelevance: { label: "Bittersweet hope amid loss", value: 31 },
    reviewSentiment: { label: "Cited as ‘heavy but spectacular’", value: 25 },
    themes: ["#orchestral", "#bittersweet", "#strings", "#hope"],
    summary:
      "Lush orchestral pop arrangement carries lyrics that balance sorrow with an undercurrent of hope, matching a bittersweet mood profile.",
    reviewInfluences: [
      { name: "Sarah Jenkins", quote: "Intense orchestral pop chords. Felt a bit heavy for the morning but the violin work is spectacular." },
    ],
  },
];
