# TuneMatch 🎧
An audio-feature music recommendation engine and custom glassmorphism web player built with Python (Flask, scikit-learn) and Vanilla JavaScript.

## Features
- **Audio-DNA Similarity Engine:** Combines Euclidean distance filtering and Cosine Similarity across scaled audio features (energy, danceability, valence, tempo, acousticness) with artist-diversity capping.
- **Typo-Tolerant Search & Live Fallback:** Fuzzy matching via `difflib` for local dataset tracks, plus live YouTube Radio fallback (`ytmusicapi` / `yt-dlp`) for new releases.
- **Interactive Web Player:** Real-time HTML5 Canvas waveform orb, interactive background bubbles, keyboard shortcuts (`Space` to play/pause, `←`/`→` for ±10s seek), and queue management.

## How to Run Locally
1. Clone this repository:
   ```bash
   git clone [https://github.com/YOUR_USERNAME/tunematch.git](https://github.com/YOUR_USERNAME/tunematch.git)
   cd tunematch
