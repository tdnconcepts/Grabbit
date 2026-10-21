<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

Download videos, Shorts, music, channels, podcasts, or audio tracks from **YouTube and 2000+ supported sites** — up to 4K HDR at 60 fps, or as MP3 / AAC / Opus. Runs locally on Windows, macOS, and Linux. **No ads, no bloat, no upsells.**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## Features

- **Best quality · Audio only**
- **Timeline zoom · Previous frame · Next frame · Loop clip**
- **Downloading → Merging → Finishing**
- Up to **4K UHD (2160p)**, 1440p, 1080p, 720p, 480p, 360p
- **Audio** — export audio-only as MP3, M4A/AAC, Opus, or WAV. In interactive downloads, pick the source's native surround/Dolby tracks (AC-3, E-AC-3, 5.1, DRC) when available, or set a global **Prefer surround / Dolby** default
- **Subtitles** in SRT, VTT, or ASS — manual or auto-generated, in any available language
- **2000+ other sites** via yt-dlp — Vimeo, Twitch, Twitter/X, TikTok, SoundCloud, Bandcamp, Bilibili, BBC iPlayer, archive.org, and many more

## Build from source

Node.js (`.node-version`) · Bun (`package.json`)

```bash
git clone https://github.com/tdnconcepts/Grabbit.git
cd Grabbit
bun run bootstrap
bun run doctor
bun run dev
```

```bash
bun run build
bun run dist
```

---


MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)
