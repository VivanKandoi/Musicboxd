"""Export the Semantic Discovery bundle from the research data.

Reads the 1,844-song searched catalogue from "Semantic Music Retrieval Through Multimodal
Fusion of Audio, Lyrics, and User-Generated Reviews" and writes what the app needs to
prisma/data/semantic/:

  songs.json    metadata per song (no lyrics, no review text), in embedding row order
  lyrics.f32    1844 x 384 all-MiniLM-L6-v2 lyric embeddings (float32, little-endian)
  reviews.f32   1844 x 384 MiniLM mean-pooled YouTube-comment embeddings
  audio.f32     1844 x 512 LAION-CLAP audio embeddings

Usage (from the repo root):
  python3 scripts/semantic/export_bundle.py "Model Data and Code/MERGE_Bimodal_Complete/MERGE_Bimodal_Complete"
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path("prisma/data/semantic")


def split_weighted(names, weights, limit):
    """AllMusic weights: lower = more relevant (e.g. Louis Armstrong is Jazz 7, Pop/Rock 9)."""
    if not isinstance(names, str):
        return []
    items = [n.strip() for n in names.split(",") if n.strip()]
    if isinstance(weights, str):
        w = [float(x) for x in weights.split(",")]
        if len(w) == len(items):
            items = [n for _, n in sorted(zip(w, items), key=lambda p: p[0])]
    return items[:limit]


def clean(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return v


def main(data_dir: str):
    d = Path(data_dir)
    cmp = d / "seven_model_comparison"
    songs = pd.read_csv(cmp / "common_1844_songs.csv", usecols=["AllMusic Id", "Quadrant", "Artist", "Title"])
    meta = pd.read_csv(d / "merge_bimodal_complete_metadata.csv")
    av = pd.read_csv(d / "merge_bimodal_complete_av_values.csv")

    meta = meta.merge(av, on=["Audio_Song", "Lyric_Song"], how="left")
    joined = songs.merge(meta.drop(columns=["Quadrant", "Artist", "Title"]), on="AllMusic Id", how="left")
    assert len(joined) == len(songs) and joined["AllMusic Id"].tolist() == songs["AllMusic Id"].tolist()

    records = []
    for _, r in joined.iterrows():
        year = clean(r.get("ActualYear"))
        try:
            year = int(str(year)[:4]) if year is not None else None
        except ValueError:
            year = None
        records.append(
            {
                "id": r["AllMusic Id"],
                "artist": r["Artist"],
                "title": r["Title"],
                "quadrant": r["Quadrant"],
                "year": year,
                "durationSec": int(r["Duration"]) if clean(r.get("Duration")) is not None else None,
                "valence": round(float(r["Valence"]), 4) if clean(r.get("Valence")) is not None else None,
                "arousal": round(float(r["Arousal"]), 4) if clean(r.get("Arousal")) is not None else None,
                "genres": split_weighted(r.get("Genres"), r.get("GenreWeights"), 3),
                # Styles are AllMusic's specific sub-genres and are often more accurate.
                "styles": split_weighted(r.get("Styles"), r.get("StyleWeights"), 3),
                "moods": split_weighted(r.get("MoodsAll"), r.get("MoodsAllWeights"), 8),
                "themes": split_weighted(r.get("Themes"), r.get("ThemeWeights"), 6),
            }
        )

    OUT.mkdir(parents=True, exist_ok=True)
    for name, file, dim in [
        ("lyrics", "lyrics_embeddings_1844.npy", 384),
        ("reviews", "review_embeddings_1844.npy", 384),
        ("audio", "audio_embeddings_1844.npy", 512),
    ]:
        arr = np.load(cmp / file).astype("<f4")
        assert arr.shape == (len(records), dim), (file, arr.shape)
        assert np.allclose(np.linalg.norm(arr, axis=1), 1, atol=1e-4), f"{file} rows are not unit length"
        arr.tofile(OUT / f"{name}.f32")

    meta_out = {
        "source": "MERGE Bimodal Complete, 1,844-song searched catalogue",
        "spaces": {
            "lyrics": {"dim": 384, "model": "sentence-transformers/all-MiniLM-L6-v2"},
            "reviews": {"dim": 384, "model": "sentence-transformers/all-MiniLM-L6-v2 (mean of 5 comments)"},
            "audio": {"dim": 512, "model": "laion_clap (enable_fusion=False)"},
        },
        "songs": records,
    }
    (OUT / "songs.json").write_text(json.dumps(meta_out, ensure_ascii=False, indent=0))
    print(f"wrote {len(records)} songs to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
