import difflib
from pathlib import Path
import pickle
import re
import urllib.parse
import urllib.request

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request
from sklearn.metrics.pairwise import cosine_similarity

try:
    import yt_dlp
except ImportError:
    yt_dlp = None

try:
    from ytmusicapi import YTMusic
    ytmusic = YTMusic()
except Exception:
    ytmusic = None

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

app = Flask(__name__)
STREAM_CACHE = {}


def load_project_data():
    model_path = DATA_DIR / "model_df.pkl"
    scaled_path = DATA_DIR / "scaled_features.pkl"
    if not model_path.exists() or not scaled_path.exists():
        return None, None
    with open(model_path, "rb") as f:
        df = pickle.load(f)
    with open(scaled_path, "rb") as f:
        scaled = pickle.load(f)
    return df, scaled


model_df, scaled_features = load_project_data()
UNIQUE_LOWER_TITLES = (
    model_df["track_name"].astype(str).str.lower().drop_duplicates().tolist()
    if model_df is not None
    else []
)


def extract_track_meta(row):
    return {
        "song": str(row["track_name"]),
        "artist": str(row["artists"]),
        "album": str(row.get("album_name", "")),
        "genre": str(row["track_genre"]),
        "duration_ms": int(row.get("duration_ms", 210000) or 210000),
        "energy": round(float(row.get("energy", 0.65) or 0.65), 2),
        "danceability": round(float(row.get("danceability", 0.65) or 0.65), 2),
        "valence": round(float(row.get("valence", 0.5) or 0.5), 2),
        "tempo": round(float(row.get("tempo", 120.0) or 120.0), 1),
        "acousticness": round(float(row.get("acousticness", 0.2) or 0.2), 2),
    }


def find_best_track_match(song_name, artist_name=None):
    """Exact, substring, and typo-tolerant (fuzzy) lookup in model_df."""
    if model_df is None or not song_name:
        return None

    q = song_name.strip().lower()
    track_lower = model_df["track_name"].astype(str).str.lower()

    def filter_artist(df_sub):
        if not artist_name:
            return df_sub
        art_sub = df_sub[
            df_sub["artists"].astype(str).str.contains(
                artist_name, case=False, na=False, regex=False
            )
        ]
        return art_sub

    # 1. Exact title match
    matches = filter_artist(model_df[track_lower == q])
    # 2. Substring title match
    if matches.empty:
        matches = filter_artist(model_df[track_lower.str.contains(q, regex=False)])
    # 3. Typo-tolerant fuzzy title match
    if matches.empty and UNIQUE_LOWER_TITLES:
        close = difflib.get_close_matches(q, UNIQUE_LOWER_TITLES, n=5, cutoff=0.74)
        if close:
            matches = filter_artist(model_df[track_lower.isin(close)])

    if matches.empty:
        return None

    if "popularity" in matches.columns:
        matches = matches.sort_values("popularity", ascending=False)
    return matches.index[0]


def recommend_by_index(song_index, artist_name=None, n_recommendations=15):
    """Core TuneMatch V5 recommendation logic given a seed row index."""
    song = model_df.loc[song_index]
    genre = song["track_genre"]
    preferred_artist = artist_name.strip().lower() if artist_name else None

    genre_indices = model_df.index[model_df["track_genre"] == genre]

    distances = np.linalg.norm(
        scaled_features.loc[genre_indices].values
        - scaled_features.loc[[song_index]].values,
        axis=1,
    )
    candidate_indices = genre_indices[distances <= 2.5]

    similarities = cosine_similarity(
        scaled_features.loc[candidate_indices],
        scaled_features.loc[[song_index]],
    ).flatten()

    results = pd.DataFrame({
        "Index": candidate_indices,
        "Similarity": similarities,
        "Song": model_df.loc[candidate_indices, "track_name"].values,
        "Artist": model_df.loc[candidate_indices, "artists"].values,
        "Genre": model_df.loc[candidate_indices, "track_genre"].values,
    })

    results = results[results["Index"] != song_index].copy()
    results["Main Artist"] = results["Artist"].str.split(";").str[0].str.strip()

    results["Preferred Artist Match"] = results["Artist"].apply(
        lambda artists: (
            preferred_artist in {
                a.strip().lower() for a in str(artists).split(";")
            } if preferred_artist else False
        )
    )

    results["Ranking Score"] = (
        results["Similarity"] + results["Preferred Artist Match"] * 0.10
    )
    results = results.sort_values("Ranking Score", ascending=False)

    selected = []
    artist_counts = {}
    preferred_artist_count = 0

    for _, row in results.iterrows():
        lead_artist = str(row["Main Artist"]).lower()
        is_preferred = bool(row["Preferred Artist Match"])

        if is_preferred and preferred_artist_count >= 2:
            continue

        limit = 2 if (preferred_artist and lead_artist == preferred_artist) else 1
        if artist_counts.get(lead_artist, 0) >= limit:
            continue

        selected.append(row)
        artist_counts[lead_artist] = artist_counts.get(lead_artist, 0) + 1

        if is_preferred:
            preferred_artist_count += 1

        if len(selected) == n_recommendations:
            break

    final_results = pd.DataFrame(selected)
    if final_results.empty:
        return []

    final_results["Similarity (%)"] = final_results["Similarity"] * 100
    output = []
    for _, row in final_results.iterrows():
        idx = row["Index"]
        meta = extract_track_meta(model_df.loc[idx])
        meta["similarity"] = round(float(row["Similarity (%)"]), 1)
        output.append(meta)
    return output


def fallback_recommendations(song_name, artist_name=None, n_recommendations=15):
    """
    When a song is missing from model_df.pkl:
    1. Try YouTube Music's live Watch Playlist (ytmusicapi).
    2. If that fails/returns empty, extract YouTube's RD<videoId> Radio Mix via yt-dlp.
    """
    query = f"{song_name} {artist_name or ''}".strip()
    seed_video_id = None

    # --- Method 1: ytmusicapi ---
    if ytmusic is not None:
        try:
            search_results = ytmusic.search(query, filter="songs", limit=1)
            if not search_results:
                search_results = ytmusic.search(query, limit=1)
            if search_results:
                seed_video_id = search_results[0].get("videoId")
            if seed_video_id:
                watch_data = ytmusic.get_watch_playlist(
                    videoId=seed_video_id, limit=n_recommendations + 1
                )
                tracks = watch_data.get("tracks", [])
                output = []
                for idx, t in enumerate(tracks):
                    vid = t.get("videoId")
                    title = t.get("title")
                    if not vid or not title or vid == seed_video_id:
                        continue
                    artists_list = [
                        a.get("name", "") for a in t.get("artists", []) if a.get("name")
                    ]
                    artist_str = ";".join(artists_list) if artists_list else "YouTube Music"
                    album_obj = t.get("album")
                    album_name = (
                        album_obj.get("name", "YouTube Mix")
                        if isinstance(album_obj, dict)
                        else "YouTube Mix"
                    )

                    dur_str = str(t.get("length", "3:30"))
                    parts = [int(p) for p in dur_str.split(":") if p.isdigit()]
                    dur_ms = (parts[0] * 60 + parts[1]) * 1000 if len(parts) == 2 else 210000

                    output.append({
                        "song": title,
                        "artist": artist_str,
                        "album": album_name,
                        "genre": "yt-radio",
                        "duration_ms": dur_ms,
                        "energy": 0.70,
                        "danceability": 0.72,
                        "valence": 0.55,
                        "tempo": 115.0,
                        "acousticness": 0.20,
                        "similarity": round(max(80.0, 96.0 - idx * 1.1), 1),
                        "youtubeIds": [vid],
                    })
                    if len(output) >= n_recommendations:
                        return output
        except Exception as exc:
            app.logger.warning("ytmusicapi fallback failed: %s", exc)

    # --- Method 2: yt-dlp YouTube Radio Mix (list=RD<videoId>) ---
    if yt_dlp is not None:
        try:
            if not seed_video_id:
                with yt_dlp.YoutubeDL({
                    "quiet": True,
                    "no_warnings": True,
                    "default_search": "ytsearch1",
                }) as ydl:
                    s_info = ydl.extract_info(f"{query} audio", download=False)
                    entries = s_info.get("entries") or [s_info]
                    if entries and entries[0]:
                        seed_video_id = entries[0].get("id")

            if seed_video_id:
                mix_url = f"https://www.youtube.com/watch?v={seed_video_id}&list=RD{seed_video_id}"
                ydl_opts = {
                    "quiet": True,
                    "no_warnings": True,
                    "extract_flat": True,
                    "playlistend": n_recommendations + 2,
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    mix_info = ydl.extract_info(mix_url, download=False)

                output = []
                for entry in mix_info.get("entries") or []:
                    if not entry:
                        continue
                    vid = entry.get("id")
                    title = entry.get("title")
                    if not vid or not title or vid == seed_video_id:
                        continue
                    uploader = entry.get("uploader") or entry.get("channel") or "YouTube Mix"
                    output.append({
                        "song": title,
                        "artist": uploader,
                        "album": "YouTube Radio Mix",
                        "genre": "yt-radio",
                        "duration_ms": int((entry.get("duration") or 210) * 1000),
                        "energy": 0.70,
                        "danceability": 0.72,
                        "valence": 0.55,
                        "tempo": 115.0,
                        "acousticness": 0.20,
                        "similarity": round(max(80.0, 96.0 - len(output) * 1.1), 1),
                        "youtubeIds": [vid],
                    })
                    if len(output) >= n_recommendations:
                        break
                return output
        except Exception as exc:
            app.logger.warning("yt-dlp RD mix fallback failed: %s", exc)

    return []


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/recommend", methods=["POST"])
def recommend():
    if model_df is None or scaled_features is None:
        return jsonify({
            "error": "Project data is missing. Place model_df.pkl and scaled_features.pkl in data/."
        }), 503

    payload = request.get_json(silent=True) or {}
    song = str(payload.get("song", "")).strip()
    artist = str(payload.get("artist", "")).strip() or None
    count = int(payload.get("count", 15) or 15)
    count = max(10, min(20, count))

    if not song:
        return jsonify({"error": "Enter a song title first."}), 400

    try:
        song_index = find_best_track_match(song, artist)
        if song_index is not None:
            seed = extract_track_meta(model_df.loc[song_index])
            seed["similarity"] = 100.0
            recommendations = recommend_by_index(
                song_index, artist_name=artist, n_recommendations=count
            )
            return jsonify({
                "seed": seed,
                "recommendations": recommendations,
                "liveFallback": False,
            })

        # Direct YouTube live-track fallback for songs not in the dataset
        seed = {
            "song": song,
            "artist": artist or "Live YouTube Stream",
            "album": "Live YouTube Stream",
            "genre": "live-search",
            "duration_ms": 210000,
            "energy": 0.72,
            "danceability": 0.74,
            "valence": 0.58,
            "tempo": 118.0,
            "acousticness": 0.18,
            "similarity": 100.0,
        }
        recommendations = fallback_recommendations(
            song, artist_name=artist, n_recommendations=count
        )
        return jsonify({
            "seed": seed,
            "recommendations": recommendations,
            "liveFallback": True,
        })
    except Exception:
        app.logger.exception("Recommendation request failed")
        return jsonify({"error": "Something went wrong while generating recommendations."}), 500


@app.route("/api/songs")
def songs():
    """Title + artist lookup endpoint with popularity ranking and fuzzy typo fallback."""
    if model_df is None:
        return jsonify({"songs": []}), 503
    query = request.args.get("q", "").strip().lower()
    if len(query) < 2:
        return jsonify({"songs": []})

    tokens = [t for t in query.split() if t]
    track_lower = model_df["track_name"].astype(str).str.lower()
    artist_lower = model_df["artists"].astype(str).str.lower()

    mask = track_lower.str.contains(query, regex=False)
    if len(tokens) > 1 or not mask.any():
        combined = track_lower + " " + artist_lower
        token_mask = pd.Series(True, index=model_df.index)
        for tok in tokens:
            token_mask &= combined.str.contains(tok, regex=False)
        mask = mask | token_mask

    candidates = model_df[mask].copy()

    if len(candidates) < 5 and UNIQUE_LOWER_TITLES:
        close = difflib.get_close_matches(query, UNIQUE_LOWER_TITLES, n=6, cutoff=0.72)
        if close:
            fuzzy_df = model_df[track_lower.isin(close)].copy()
            candidates = pd.concat([candidates, fuzzy_df]).drop_duplicates()

    if candidates.empty:
        return jsonify({"songs": []})

    cand_lower = candidates["track_name"].astype(str).str.lower()
    candidates["_starts"] = cand_lower.str.startswith(query).astype(int)
    candidates["_exact"] = (cand_lower == query).astype(int)
    sort_cols = ["_exact", "_starts"]
    if "popularity" in candidates.columns:
        sort_cols.append("popularity")
    candidates = (
        candidates.sort_values(sort_cols, ascending=False)
        .drop_duplicates(subset=["track_name", "artists"])
        .head(12)
    )
    return jsonify({
        "songs": [
            {"song": str(row.track_name), "artist": str(row.artists)}
            for row in candidates[["track_name", "artists"]].itertuples(index=False)
        ]
    })


@app.route("/api/stream")
def stream_audio():
    """Option 1: Extract direct full-song audio stream URL using yt-dlp (no API key)."""
    if yt_dlp is None:
        return jsonify({"streamUrl": None, "reason": "yt-dlp not installed"}), 501

    query = request.args.get("q", "").strip()
    video_id = request.args.get("videoId", "").strip()
    if not query and not video_id:
        return jsonify({"streamUrl": None}), 400

    cache_key = f"vid:{video_id}" if video_id else query.lower()
    if cache_key in STREAM_CACHE:
        return jsonify(STREAM_CACHE[cache_key])

    ydl_opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "default_search": "ytsearch1",
    }
    target = (
        f"https://www.youtube.com/watch?v={video_id}"
        if video_id
        else f"{query} official audio"
    )

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(target, download=False)
        entry = info["entries"][0] if ("entries" in info and info["entries"]) else info
        payload = {
            "streamUrl": entry.get("url"),
            "duration": entry.get("duration"),
            "videoId": entry.get("id"),
        }
        if payload["streamUrl"]:
            STREAM_CACHE[cache_key] = payload
        return jsonify(payload)
    except Exception as exc:
        app.logger.warning("yt-dlp stream lookup failed: %s", exc)
        return jsonify({"streamUrl": None}), 500


@app.route("/api/yt_video")
def yt_video():
    """Option 2 Fallback: Return up to 5 candidate YouTube videoIds for embed playback."""
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"videoIds": []}), 400
    try:
        search_url = (
            "https://www.youtube.com/results?search_query="
            + urllib.parse.quote(f"{query} audio lyrics")
        )
        req = urllib.request.Request(
            search_url,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
        ids = re.findall(r'"videoId":"([a-zA-Z0-9_-]{11})"', html)
        seen = []
        for vid in ids:
            if vid not in seen:
                seen.append(vid)
            if len(seen) >= 5:
                break
        return jsonify({"videoIds": seen})
    except Exception:
        return jsonify({"videoIds": []})


if __name__ == "__main__":
    app.run(debug=True)