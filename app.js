/* =========================================================
   1. Lumora Near-Black Interactive Glowing Bubble Background
   ========================================================= */
(function initLumoraBackground() {
  const canvas = document.getElementById("lumora-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;

  const mouse = { x: -9999, y: -9999, active: false };
  const ripples = [];
  const bubbles = [];
  const sparks = [];

  const BUBBLE_COUNT = 42;
  const SPARK_COUNT = 75;
  const PALETTE = [
    "92, 242, 255",   // neon cyan
    "139, 158, 255",  // periwinkle
    "179, 154, 255",  // lavender
    "140, 230, 255"   // ice blue
  ];

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function makeBubble(randomY = true) {
    const r = Math.random() * 26 + 7;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + r + Math.random() * 40,
      r,
      baseR: r,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(Math.random() * 0.45 + 0.18),
      ox: 0,
      oy: 0,
      alpha: Math.random() * 0.24 + 0.08,
      hue: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: Math.random() * 0.02 + 0.008
    };
  }

  for (let i = 0; i < BUBBLE_COUNT; i++) bubbles.push(makeBubble(true));

  for (let i = 0; i < SPARK_COUNT; i++) {
    sparks.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.7 + 0.5,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -Math.random() * 0.28 - 0.06,
      alpha: Math.random() * 0.5 + 0.15,
      hue: PALETTE[Math.floor(Math.random() * PALETTE.length)]
    });
  }

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });
  window.addEventListener("mouseleave", () => { mouse.active = false; });

  window.addEventListener("click", (e) => {
    ripples.push({
      x: e.clientX,
      y: e.clientY,
      r: 8,
      maxR: 170,
      alpha: 0.45,
      hue: Math.random() > 0.4 ? "92, 242, 255" : "179, 154, 255"
    });
    for (const b of bubbles) {
      const dx = b.x - e.clientX;
      const dy = b.y - e.clientY;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist < 220) {
        const push = (1 - dist / 220) * 4.5;
        b.ox += (dx / dist) * push;
        b.oy += (dy / dist) * push;
      }
    }
  });

  let tick = 0;
  function frame() {
    tick += 0.02;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#050608";
    ctx.fillRect(0, 0, w, h);

    if (mouse.active) {
      const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 190);
      mg.addColorStop(0, "rgba(92, 242, 255, 0.09)");
      mg.addColorStop(0.5, "rgba(179, 154, 255, 0.04)");
      mg.addColorStop(1, "rgba(5, 6, 8, 0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 190, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; }
      if (s.x < -10) s.x = w + 10;
      if (s.x > w + 10) s.x = -10;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.hue}, ${s.alpha})`;
      ctx.fill();
    }

    const playingBoost = (typeof playerState !== "undefined" && playerState.isPlaying) ? 1.12 : 1;
    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      b.wobble += b.wobbleSpeed;
      b.x += b.vx + Math.sin(b.wobble) * 0.25 + b.ox;
      b.y += b.vy * playingBoost + b.oy;
      b.ox *= 0.92;
      b.oy *= 0.92;

      if (b.y < -b.r * 2) bubbles[i] = makeBubble(false);
      if (b.x < -b.r * 2) b.x = w + b.r;
      if (b.x > w + b.r * 2) b.x = -b.r;

      let proximityBoost = 0;
      if (mouse.active) {
        const dx = b.x - mouse.x;
        const dy = b.y - mouse.y;
        const dist = Math.hypot(dx, dy) || 1;
        const repelRadius = 155;
        if (dist < repelRadius) {
          const force = (1 - dist / repelRadius) * 1.4;
          b.ox += (dx / dist) * force;
          b.oy += (dy / dist) * force;
          proximityBoost = (1 - dist / repelRadius) * 0.35;
        }
      }

      const pulseR = b.baseR * (1 + Math.sin(tick * 2 + i) * 0.05 * playingBoost);
      b.r = pulseR;
      const alpha = Math.min(0.65, b.alpha + proximityBoost);

      const grad = ctx.createRadialGradient(
        b.x - b.r * 0.3,
        b.y - b.r * 0.3,
        b.r * 0.1,
        b.x,
        b.y,
        b.r
      );
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.55})`);
      grad.addColorStop(0.45, `rgba(${b.hue}, ${alpha * 0.42})`);
      grad.addColorStop(1, `rgba(${b.hue}, 0.02)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = `rgba(${b.hue}, ${Math.min(0.75, alpha + 0.14)})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.34, b.y - b.r * 0.34, Math.max(1.2, b.r * 0.14), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.7, alpha + 0.18)})`;
      ctx.fill();
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 4.2;
      rp.alpha *= 0.94;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rp.hue}, ${rp.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (rp.r >= rp.maxR || rp.alpha < 0.02) ripples.splice(i, 1);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* Scroll Reveal */
const revealEls = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("in-view");
    });
  }, { threshold: 0.06 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("in-view"));
}

/* Mobile nav toggle */
const menuToggle = document.getElementById("menu-toggle");
const navLinks = document.getElementById("nav-links");
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => navLinks.classList.toggle("open"));
}

/* =========================================================
   2. Full-Song Player (Option 1: yt-dlp Audio -> Option 2: YT Embed)
   ========================================================= */
const defaultSeed = {
  song: "Tum Hi Ho",
  artist: "Arijit Singh",
  album: "Aashiqui 2",
  genre: "pop-film",
  duration_ms: 262000,
  energy: 0.55,
  danceability: 0.51,
  valence: 0.34,
  tempo: 94.0,
  similarity: 100.0,
  youtubeIds: ["Umqb9KENgmk", "IJq0yyWug1k"]
};

const defaultRecs = [
  { song: 'Tum Hi Ho (From "Aashiqui 2")', artist: "Arijit Singh", album: "Aashiqui 2", genre: "pop-film", duration_ms: 262000, energy: 0.55, danceability: 0.51, valence: 0.34, tempo: 94.0, similarity: 100.0, youtubeIds: ["Umqb9KENgmk"] },
  { song: "Aasan Nahin Yahan", artist: "Arijit Singh", album: "Aashiqui 2", genre: "pop-film", duration_ms: 214000, energy: 0.58, danceability: 0.54, valence: 0.39, tempo: 98.0, similarity: 98.5, youtubeIds: ["wQ2M_6vC9bI"] },
  { song: "Dariya", artist: "Arko", album: "Baar Baar Dekho", genre: "pop-film", duration_ms: 221000, energy: 0.52, danceability: 0.49, valence: 0.31, tempo: 92.0, similarity: 98.1, youtubeIds: ["4xH4r0uP9pI"] },
  { song: "Tere Liye", artist: "Madan Mohan;Lata Mangeshkar;Roop Kumar Rathod", album: "Veer-Zaara", genre: "pop-film", duration_ms: 332000, energy: 0.48, danceability: 0.45, valence: 0.29, tempo: 88.0, similarity: 97.2, youtubeIds: ["4r63s80h8e8"] },
  { song: "Maana Ke Hum Yaar Nahin", artist: "Sachin-Jigar;Parineeti Chopra;Kausar Munir", album: "Meri Pyaari Bindu", genre: "pop-film", duration_ms: 265000, energy: 0.49, danceability: 0.52, valence: 0.38, tempo: 96.0, similarity: 95.2 },
  { song: "Kya Karoon?", artist: "Shankar-Ehsaan-Loy;Clinton Cerejo", album: "Wake Up Sid", genre: "pop-film", duration_ms: 253000, energy: 0.57, danceability: 0.55, valence: 0.42, tempo: 100.0, similarity: 95.0 },
  { song: "Rozana", artist: "Shreya Ghoshal;Rochak Kohli", album: "Naam Shabana", genre: "pop-film", duration_ms: 274000, energy: 0.51, danceability: 0.50, valence: 0.35, tempo: 90.0, similarity: 94.5 },
  { song: 'Lo Safar (From "Baaghi 2")', artist: "Jubin Nautiyal;Mithoon", album: "Baaghi 2", genre: "pop-film", duration_ms: 282000, energy: 0.54, danceability: 0.48, valence: 0.33, tempo: 95.0, similarity: 94.0 },
  { song: "Nazm Nazm feat. Ayushmann Khurana", artist: "Ayushmann Khurrana", album: "Bareilly Ki Barfi", genre: "pop-film", duration_ms: 227000, energy: 0.50, danceability: 0.56, valence: 0.44, tempo: 102.0, similarity: 93.8 },
  { song: "Tenu Na Bol Pawaan", artist: "Yasser Desai;Jyotica Tangri", album: "Behen Hogi Teri", genre: "pop-film", duration_ms: 235000, energy: 0.53, danceability: 0.52, valence: 0.36, tempo: 93.0, similarity: 93.6 },
  { song: "Agar Tum Saath Ho", artist: "Alka Yagnik;Arijit Singh", album: "Tamasha", genre: "pop-film", duration_ms: 341000, energy: 0.52, danceability: 0.56, valence: 0.41, tempo: 123.0, similarity: 92.4 },
  { song: "Channa Mereya", artist: "Pritam;Arijit Singh", album: "Ae Dil Hai Mushkil", genre: "pop-film", duration_ms: 289000, energy: 0.56, danceability: 0.53, valence: 0.37, tempo: 95.0, similarity: 91.9 }
];

const playerState = {
  seed: defaultSeed,
  recommendations: [...defaultRecs],
  queue: [defaultSeed, ...defaultRecs],
  currentIndex: 0,
  isPlaying: false,
  isMuted: false,
  isLoop: false,
  orbBarsMode: true,
  showVideo: false,
  liveFallback: false,
  mode: "none", // "audio" | "youtube" | "none"
  volume: 85,
  ytReady: false,
  ytPlayer: null,
  candidateIds: [],
  candidatePos: 0,
  pendingLoad: null,
  streamCache: {},
  ytCache: {},
  artCache: {}
};

const audioEl = document.getElementById("audio-element");
audioEl.removeAttribute("crossorigin");
audioEl.volume = playerState.volume / 100;

const elTitle = document.getElementById("player-title");
const elArtist = document.getElementById("player-artist");
const elAlbum = document.getElementById("player-album");
const elBadge = document.getElementById("player-genre-badge");
const elArtwork = document.getElementById("player-artwork");
const elYtFrame = document.getElementById("yt-player-wrap");
const elSourceBadge = document.getElementById("btn-toggle-video");
const elSeek = document.getElementById("player-seek");
const elCurrTime = document.getElementById("player-current-time");
const elTotTime = document.getElementById("player-total-time");
const elPlayIcon = document.getElementById("play-icon");
const elPlaybackStatus = document.getElementById("playback-status");
const elMiniBars = document.getElementById("mini-bars");
const elVolSlider = document.getElementById("vol-slider");
const elVolValue = document.getElementById("vol-value");
const elStatEnergy = document.getElementById("stat-energy");
const elStatDance = document.getElementById("stat-dance");
const elStatTempo = document.getElementById("stat-tempo");
const elQueueList = document.getElementById("gp-queue-list");
const elPanelAudio = document.getElementById("panel-audio");
const elPanelQueue = document.getElementById("panel-queue");
const elRightTitle = document.getElementById("right-panel-title");
const elRightSub = document.getElementById("right-panel-subtitle");
const elYtLink = document.getElementById("btn-youtube-link");
const elSeedCard = document.getElementById("seed-card");
const elRecGrid = document.getElementById("recommendation-grid");
const elResultCount = document.getElementById("result-count");

function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

function getCurrentTrack() {
  return playerState.queue[playerState.currentIndex] || defaultSeed;
}

function buildYouTubeUrl(track) {
  const vid = (track.youtubeIds && track.youtubeIds[0]) || track.youtubeId;
  if (vid) return `https://www.youtube.com/watch?v=${vid}`;
  const artist = String(track.artist || "").split(";")[0].trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.song} ${artist}`)}`;
}

/* YouTube IFrame API Hook (Option 2 fallback) */
window.onYouTubeIframeAPIReady = function () {
  if (!window.YT || !window.YT.Player) return;
  const originParam = window.location.origin && window.location.origin.startsWith("http")
    ? window.location.origin
    : undefined;
  playerState.ytPlayer = new window.YT.Player("yt-player-mount", {
    height: "100%",
    width: "100%",
    playerVars: {
      playsinline: 1,
      controls: 1,
      modestbranding: 1,
      rel: 0,
      ...(originParam ? { origin: originParam } : {})
    },
    events: {
      onReady: () => {
        playerState.ytReady = true;
        playerState.ytPlayer.setVolume(playerState.volume);
        if (playerState.pendingLoad) {
          const { ids, autoplay } = playerState.pendingLoad;
          playerState.pendingLoad = null;
          startYouTubeCandidates(ids, autoplay);
        }
      },
      onStateChange: (event) => {
        if (!window.YT || playerState.mode !== "youtube") return;
        if (event.data === window.YT.PlayerState.PLAYING) {
          playerState.isPlaying = true;
          elPlaybackStatus.textContent = "Playing full song via YouTube embed";
          renderPlayerMeta();
        } else if (event.data === window.YT.PlayerState.PAUSED) {
          playerState.isPlaying = false;
          elPlaybackStatus.textContent = "Paused";
          renderPlayerMeta();
        } else if (event.data === window.YT.PlayerState.ENDED) {
          if (playerState.isLoop) {
            playerState.ytPlayer.seekTo(0);
            playerState.ytPlayer.playVideo();
          } else {
            loadAndPlayTrack(playerState.currentIndex + 1, true);
          }
        }
      },
      onError: () => {
        if (playerState.mode !== "youtube") return;
        playerState.candidatePos += 1;
        if (playerState.candidatePos < playerState.candidateIds.length) {
          const nextId = playerState.candidateIds[playerState.candidatePos];
          elPlaybackStatus.textContent = "Switching to embeddable stream…";
          playerState.ytPlayer.loadVideoById(nextId);
        } else {
          playerState.isPlaying = false;
          elPlaybackStatus.textContent = "Run locally on http://127.0.0.1:5000 or click Open on YouTube ↗";
          renderPlayerMeta();
        }
      }
    }
  });
};

function startYouTubeCandidates(ids, autoplay) {
  if (!ids || !ids.length) {
    elPlaybackStatus.textContent = "Click Open on YouTube ↗ to play full song";
    return;
  }
  playerState.mode = "youtube";
  playerState.showVideo = true;
  playerState.candidateIds = ids;
  playerState.candidatePos = 0;
  if (!playerState.ytReady || !playerState.ytPlayer) {
    playerState.pendingLoad = { ids, autoplay };
    return;
  }
  if (autoplay) {
    playerState.ytPlayer.loadVideoById(ids[0]);
  } else {
    playerState.ytPlayer.cueVideoById(ids[0]);
  }
}

async function fetchDirectStream(track) {
  const primaryArtist = String(track.artist || "").split(";")[0].trim();
  const knownId = (track.youtubeIds && track.youtubeIds[0]) || "";
  const key = knownId ? `vid:${knownId}` : `${track.song}::${primaryArtist}`.toLowerCase();
  if (playerState.streamCache[key] !== undefined) return playerState.streamCache[key];

  try {
    const params = new URLSearchParams({ q: `${track.song} ${primaryArtist}` });
    if (knownId) params.set("videoId", knownId);

    const res = await fetch(`/api/stream?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.streamUrl) {
        playerState.streamCache[key] = data;
        return data;
      }
    }
  } catch (_) {}
  playerState.streamCache[key] = null;
  return null;
}

async function fetchYouTubeVideoIds(track) {
  if (track.youtubeIds && track.youtubeIds.length) return track.youtubeIds;
  const primaryArtist = String(track.artist || "").split(";")[0].trim();
  const key = `${track.song}::${primaryArtist}`.toLowerCase();
  if (playerState.ytCache[key]) return playerState.ytCache[key];

  try {
    const res = await fetch(`/api/yt_video?q=${encodeURIComponent(`${track.song} ${primaryArtist}`)}`);
    if (res.ok) {
      const data = await res.json();
      const ids = data.videoIds || [];
      playerState.ytCache[key] = ids;
      return ids;
    }
  } catch (_) {}
  return [];
}

async function fetchTrackArtwork(track) {
  const primaryArtist = String(track.artist || "").split(";")[0].trim();
  const key = `${track.song}::${primaryArtist}`.toLowerCase();
  if (playerState.artCache[key] !== undefined) return playerState.artCache[key];

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${track.song} ${primaryArtist}`)}&media=music&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const hit = (data.results || [])[0];
      if (hit && hit.artworkUrl100) {
        playerState.artCache[key] = hit.artworkUrl100.replace("100x100bb", "500x500bb");
        return playerState.artCache[key];
      }
    }
  } catch (_) {}

  playerState.artCache[key] = null;
  return null;
}

async function loadAndPlayTrack(index, autoplay = true) {
  if (!playerState.queue.length) return;
  playerState.currentIndex = (index + playerState.queue.length) % playerState.queue.length;
  const track = getCurrentTrack();

  audioEl.pause();
  audioEl.removeAttribute("src");
  if (playerState.ytReady && playerState.ytPlayer && typeof playerState.ytPlayer.stopVideo === "function") {
    try { playerState.ytPlayer.stopVideo(); } catch (_) {}
  }

  playerState.isPlaying = false;
  playerState.mode = "none";
  renderPlayerMeta();
  elPlaybackStatus.textContent = autoplay ? "Loading full song…" : "Ready — click ▶ to play full song";

  const [artworkUrl, streamData] = await Promise.all([
    fetchTrackArtwork(track),
    autoplay ? fetchDirectStream(track) : Promise.resolve(null)
  ]);

  if (getCurrentTrack().song !== track.song) return;

  if (artworkUrl) {
    elArtwork.src = artworkUrl;
    elArtwork.classList.remove("hidden");
  } else {
    elArtwork.classList.add("hidden");
  }

  // Option 1: yt-dlp full-song pure audio stream
  if (streamData && streamData.streamUrl) {
    playerState.mode = "audio";
    playerState.showVideo = false;
    if (streamData.videoId) track.youtubeIds = [streamData.videoId];
    audioEl.src = streamData.streamUrl;
    try {
      await audioEl.play();
      playerState.isPlaying = true;
      elPlaybackStatus.textContent = "Playing full song (direct audio stream)";
      renderPlayerMeta();
      return;
    } catch (_) {
      // Fall through to YouTube embed
    }
  }

  // Option 2: YouTube IFrame Embed
  const videoIds = await fetchYouTubeVideoIds(track);
  if (getCurrentTrack().song !== track.song) return;
  if (videoIds.length) {
    track.youtubeIds = videoIds;
    startYouTubeCandidates(videoIds, autoplay);
  } else {
    elPlaybackStatus.textContent = "Click Open on YouTube ↗ to play full song";
  }

  renderPlayerMeta();
}

function renderPlayerMeta() {
  const track = getCurrentTrack();
  elTitle.textContent = track.song;
  elArtist.textContent = track.artist;
  elAlbum.textContent = `${track.album || "TuneMatch Mix"} · ${Number(track.similarity || 100).toFixed(1)}% match`;
  elBadge.textContent = track.genre || "audio";
  elPlayIcon.textContent = playerState.isPlaying ? "❚❚" : "▶";
  elMiniBars.classList.toggle("playing", playerState.isPlaying);
  elYtFrame.classList.toggle("hidden", !(playerState.showVideo && playerState.mode === "youtube"));
  elSourceBadge.textContent = playerState.mode === "audio" ? "HD" : (playerState.showVideo ? "ART" : "YT");

  const fallbackDur = Math.round((track.duration_ms || 210000) / 1000);
  if (!playerState.isPlaying && playerState.mode === "none") {
    elTotTime.textContent = formatTime(fallbackDur);
    elSeek.max = fallbackDur;
  }

  elStatEnergy.textContent = Number(track.energy ?? 0.6).toFixed(2);
  elStatDance.textContent = Number(track.danceability ?? 0.6).toFixed(2);
  elStatTempo.textContent = Math.round(track.tempo ?? 120);

  elYtLink.href = buildYouTubeUrl(track);
  renderQueueList();
  renderTracklist();
}

function renderQueueList() {
  elQueueList.innerHTML = "";
  playerState.queue.forEach((item, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gp-queue-item" + (idx === playerState.currentIndex ? " active" : "");
    btn.innerHTML = `<strong>${escapeHTML(item.song)}</strong><small>${escapeHTML(item.artist)} · ${Number(item.similarity || 100).toFixed(0)}%</small>`;
    btn.addEventListener("click", () => loadAndPlayTrack(idx, true));
    elQueueList.appendChild(btn);
  });
}

function renderTracklist() {
  const seed = playerState.seed;
  if (seed) {
    elSeedCard.innerHTML = `
      <div>
        <small>${playerState.liveFallback ? "LIVE YOUTUBE RADIO MIX · STREAMED VIA YT" : "SEED TRACK · CLICK TO PLAY FULL SONG"}</small>
        <strong>${escapeHTML(seed.song)}</strong>
        <span> — ${escapeHTML(seed.artist)} · ${escapeHTML(seed.genre)}</span>
      </div>
      <span class="match-pill">${playerState.liveFallback ? "YT Radio" : "100% seed"}</span>`;
    elSeedCard.onclick = () => loadAndPlayTrack(0, true);
    
  } else {
    elSeedCard.innerHTML = "";
  }

  // Always wipe previous song's recommendations first
  elRecGrid.innerHTML = "";

  if (!playerState.recommendations || playerState.recommendations.length === 0) {
    elResultCount.textContent = "0 recommendations";
    elRecGrid.innerHTML = `
      <div class="track-row" style="grid-template-columns: 1fr; cursor: default; text-align: center; padding: 24px; color: var(--muted);">
        <p>Playing directly from YouTube — this track isn't in the local Spotify dataset, so no similarity recommendations are available.</p>
      </div>`;
    return;
  }

  const activeSong = getCurrentTrack().song;
  playerState.recommendations.forEach((item, idx) => {
    const queueIdx = playerState.seed ? idx + 1 : idx;
    const isCurrent = item.song === activeSong;
    const row = document.createElement("div");
    row.className = "track-row" + (isCurrent ? " playing" : "");
    row.innerHTML = `
      <span class="track-idx">${isCurrent && playerState.isPlaying ? "♫" : String(idx + 1).padStart(2, "0")}</span>
      <div class="track-main">
        <h3>${escapeHTML(item.song)}</h3>
        <p>${escapeHTML(item.artist)}</p>
      </div>
      <span class="genre-tag col-genre">${escapeHTML(item.genre)}</span>
      <span class="match-pill col-match">${Number(item.similarity).toFixed(1)}%</span>
      <div class="track-actions">
        <button type="button" class="row-play-btn" aria-label="Play ${escapeHTML(item.song)}">${isCurrent && playerState.isPlaying ? "❚❚" : "▶"}</button>
        <a class="row-yt-link" href="${buildYouTubeUrl(item)}" target="_blank" rel="noopener noreferrer" title="Open on YouTube" aria-label="Open ${escapeHTML(item.song)} on YouTube">↗</a>
      </div>`;

    row.addEventListener("click", (e) => {
      if (e.target.closest(".row-yt-link")) return;
      if (isCurrent && (playerState.mode === "audio" || playerState.mode === "youtube")) {
        togglePlayPause();
      } else {
        loadAndPlayTrack(queueIdx, true);
      }
    });
    elRecGrid.appendChild(row);
  });
  elResultCount.textContent = `${playerState.recommendations.length} recommendations`;
}

async function togglePlayPause() {
  if (playerState.mode === "audio" && audioEl.src) {
    if (audioEl.paused) {
      await audioEl.play().catch(() => {});
      playerState.isPlaying = true;
      elPlaybackStatus.textContent = "Playing full song (direct audio stream)";
    } else {
      audioEl.pause();
      playerState.isPlaying = false;
      elPlaybackStatus.textContent = "Paused";
    }
    renderPlayerMeta();
    return;
  }

  if (playerState.mode === "youtube" && playerState.ytReady && playerState.ytPlayer) {
    const st = playerState.ytPlayer.getPlayerState();
    if (st === window.YT.PlayerState.PLAYING) {
      playerState.ytPlayer.pauseVideo();
    } else if (st === window.YT.PlayerState.PAUSED || st === window.YT.PlayerState.CUED) {
      playerState.ytPlayer.playVideo();
    } else {
      loadAndPlayTrack(playerState.currentIndex, true);
    }
    return;
  }

  await loadAndPlayTrack(playerState.currentIndex, true);
}

/* Audio element events (Option 1) */
audioEl.addEventListener("timeupdate", () => {
  if (playerState.mode !== "audio") return;
  const dur = audioEl.duration || Math.round((getCurrentTrack().duration_ms || 210000) / 1000);
  elSeek.max = dur;
  elSeek.value = audioEl.currentTime;
  elCurrTime.textContent = formatTime(audioEl.currentTime);
  elTotTime.textContent = formatTime(dur);
});

audioEl.addEventListener("ended", () => {
  if (playerState.mode !== "audio") return;
  if (playerState.isLoop) {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  } else {
    loadAndPlayTrack(playerState.currentIndex + 1, true);
  }
});

/* YouTube Progress Sync Loop (Option 2) */
setInterval(() => {
  if (!playerState.isPlaying || playerState.mode !== "youtube" || !playerState.ytReady || !playerState.ytPlayer) return;
  if (typeof playerState.ytPlayer.getCurrentTime === "function") {
    const curr = playerState.ytPlayer.getCurrentTime() || 0;
    const dur = playerState.ytPlayer.getDuration() || Math.round((getCurrentTrack().duration_ms || 210000) / 1000);
    elSeek.max = dur;
    elSeek.value = curr;
    elCurrTime.textContent = formatTime(curr);
    elTotTime.textContent = formatTime(dur);
  }
}, 500);

/* Controls */
document.getElementById("btn-play").addEventListener("click", togglePlayPause);
document.getElementById("btn-prev").addEventListener("click", () => loadAndPlayTrack(playerState.currentIndex - 1, true));
document.getElementById("btn-next").addEventListener("click", () => loadAndPlayTrack(playerState.currentIndex + 1, true));

elSeek.addEventListener("input", () => {
  const val = Number(elSeek.value);
  if (playerState.mode === "audio" && audioEl.src) {
    audioEl.currentTime = val;
  } else if (playerState.mode === "youtube" && playerState.ytReady && playerState.ytPlayer) {
    playerState.ytPlayer.seekTo(val, true);
  }
});

elVolSlider.addEventListener("input", () => {
  const val = Number(elVolSlider.value);
  playerState.volume = val;
  audioEl.volume = playerState.isMuted ? 0 : val / 100;
  if (playerState.ytReady && playerState.ytPlayer) {
    playerState.ytPlayer.setVolume(playerState.isMuted ? 0 : val);
  }
  elVolValue.textContent = `${val}%`;
});

function seekBy(delta) {
  if (playerState.mode === "audio" && audioEl.src) {
    const dur = audioEl.duration || Math.round((getCurrentTrack().duration_ms || 210000) / 1000);
    const next = Math.max(0, Math.min(dur, audioEl.currentTime + delta));
    audioEl.currentTime = next;
    elSeek.value = next;
    elCurrTime.textContent = formatTime(next);
  } else if (playerState.mode === "youtube" && playerState.ytReady && playerState.ytPlayer) {
    const dur = playerState.ytPlayer.getDuration() || Math.round((getCurrentTrack().duration_ms || 210000) / 1000);
    const curr = playerState.ytPlayer.getCurrentTime() || 0;
    const next = Math.max(0, Math.min(dur, curr + delta));
    playerState.ytPlayer.seekTo(next, true);
    elSeek.value = next;
    elCurrTime.textContent = formatTime(next);
  }
}

document.getElementById("btn-back-10")?.addEventListener("click", () => seekBy(-10));
document.getElementById("btn-fwd-10")?.addEventListener("click", () => seekBy(10));
document.getElementById("btn-nudge-back")?.addEventListener("click", () => seekBy(-10));
document.getElementById("btn-nudge-fwd")?.addEventListener("click", () => seekBy(10));

/* =========================================================
   Keyboard Shortcuts: Spacebar (Play/Pause) & Arrow Keys (-10s / +10s)
   ========================================================= */
document.addEventListener("keydown", (event) => {
  const active = document.activeElement;
  const tag = active ? active.tagName.toLowerCase() : "";
  // Don't hijack typing inside search inputs or editable elements
  if (tag === "input" || tag === "textarea" || active?.isContentEditable) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault(); // Prevent page scroll
    togglePlayPause();
  } else if (event.code === "ArrowLeft") {
    event.preventDefault();
    seekBy(-10);
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    seekBy(10);
  }
});

document.getElementById("btn-loop").addEventListener("click", (e) => {
  playerState.isLoop = !playerState.isLoop;
  e.currentTarget.classList.toggle("active", playerState.isLoop);
});

document.getElementById("btn-mute").addEventListener("click", (e) => {
  playerState.isMuted = !playerState.isMuted;
  audioEl.muted = playerState.isMuted;
  if (playerState.ytReady && playerState.ytPlayer) {
    if (playerState.isMuted) playerState.ytPlayer.mute();
    else playerState.ytPlayer.unMute();
  }
  e.currentTarget.textContent = playerState.isMuted ? "🔇" : "🔊";
});

document.getElementById("btn-shuffle").addEventListener("click", () => {
  if (playerState.queue.length <= 1) return;
  loadAndPlayTrack(Math.floor(Math.random() * playerState.queue.length), true);
});

document.getElementById("orb-mode-btn").addEventListener("click", () => {
  playerState.orbBarsMode = !playerState.orbBarsMode;
});

document.getElementById("btn-toggle-video").addEventListener("click", () => {
  playerState.showVideo = !playerState.showVideo;
  elYtFrame.classList.toggle("hidden", !(playerState.showVideo && playerState.mode === "youtube"));
  elSourceBadge.textContent = playerState.showVideo ? "ART" : "YT";
});

function switchRightPanel(showQueue) {
  elPanelAudio.classList.toggle("hidden", showQueue);
  elPanelQueue.classList.toggle("hidden", !showQueue);
  elRightTitle.textContent = showQueue ? "Queue" : "Audio DNA";
  elRightSub.textContent = showQueue ? `${playerState.queue.length} tracks` : "Full Track Playback";
}

document.getElementById("btn-toggle-panel").addEventListener("click", () => {
  switchRightPanel(elPanelQueue.classList.contains("hidden"));
});
document.getElementById("btn-open-queue").addEventListener("click", () => {
  switchRightPanel(elPanelQueue.classList.contains("hidden"));
});

/* =========================================================
   3. Glowing Cyan Orb Waveform Renderer
   ========================================================= */
(function initWaveformOrb() {
  const canvas = document.getElementById("waveform-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const midY = H / 2;
  let phase = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const track = getCurrentTrack();
    const energy = track.energy ?? 0.6;
    const tempoFactor = ((track.tempo || 110) / 120) * (playerState.isPlaying ? 0.08 : 0.016);
    const ampScale = (playerState.isPlaying ? 52 : 22) * (0.55 + energy * 0.65);
    phase += tempoFactor;

    if (playerState.orbBarsMode) {
      const bars = 46;
      const step = W / bars;
      for (let i = 0; i < bars; i++) {
        const x = i * step + step * 0.5;
        const normX = (x - W / 2) / (W / 2);
        const envelope = Math.max(0, 1 - normX * normX);
        const hVal = Math.abs(Math.sin(i * 0.45 + phase * 1.4) * Math.cos(i * 0.22 - phase)) * ampScale * 0.9 * envelope;
        ctx.strokeStyle = "rgba(92, 242, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x, midY + hVal);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.shadowColor = "#5cf2ff";
    ctx.shadowBlur = 16;
    ctx.strokeStyle = "#aefaff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 2) {
      const normX = (x - W / 2) / (W / 2);
      const envelope = Math.pow(Math.max(0, 1 - normX * normX), 1.4);
      const y =
        midY +
        Math.sin(normX * 7.5 + phase) * ampScale * envelope +
        Math.sin(normX * 13 - phase * 1.3) * (ampScale * 0.35) * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "rgba(130, 210, 255, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 3) {
      const normX = (x - W / 2) / (W / 2);
      const envelope = Math.pow(Math.max(0, 1 - normX * normX), 1.4);
      const y = midY - Math.sin(normX * 6 - phase * 0.9) * (ampScale * 0.65) * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();

/* =========================================================
   4. Search, Autocomplete & Recommendation Fetching (15 tracks)
   ========================================================= */
const form = document.getElementById("recommend-form");
const songInput = document.getElementById("song");
const artistInput = document.getElementById("artist");
const autoList = document.getElementById("autocomplete-list");
const statusBox = document.getElementById("status");
const submitButton = form.querySelector("button[type='submit']");

let autoTimer = null;
songInput.addEventListener("input", () => {
  clearTimeout(autoTimer);
  const q = songInput.value.trim();
  if (q.length < 2) {
    autoList.classList.add("hidden");
    return;
  }
  autoTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = data.songs || [];
      if (!items.length) {
        autoList.classList.add("hidden");
        return;
      }
      autoList.innerHTML = "";
      items.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "autocomplete-item";
        btn.innerHTML = `<span>${escapeHTML(item.song)}</span><small>${escapeHTML(item.artist)}</small>`;
        btn.addEventListener("click", () => {
          songInput.value = item.song;
          artistInput.value = item.artist.split(";")[0];
          autoList.classList.add("hidden");
        });
        autoList.appendChild(btn);
      });
      autoList.classList.remove("hidden");
    } catch (_) {}
  }, 220);
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".ws-field")) {
    autoList.classList.add("hidden");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const song = songInput.value.trim();
  const artist = artistInput.value.trim();
  if (!song) return;

  autoList.classList.add("hidden");
  statusBox.className = "status";
  statusBox.textContent = "Searching track and checking dataset…";
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Searching…";

  // Immediately clear old recommendations so stale tracks never linger
  playerState.recommendations = [];
  playerState.liveFallback = false;
  renderTracklist();

  try {
    const response = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ song, artist, count: 15 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not get recommendations.");

    const recs = data.recommendations || [];
    playerState.seed = data.seed || null;
    playerState.recommendations = recs;
    playerState.liveFallback = Boolean(data.liveFallback);
    playerState.queue = data.seed ? [data.seed, ...recs] : recs;

    if (recs.length) {
      statusBox.textContent = `${recs.length} recommendations ready — playing full track now.`;
    } else {
      statusBox.textContent = "Playing live from YouTube (not in local dataset for recommendations).";
    }

    await loadAndPlayTrack(0, true);
  } catch (error) {
    statusBox.className = "status error";
    statusBox.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Find Mix";
  }
});

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

loadAndPlayTrack(0, false);