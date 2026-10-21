<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

從 **YouTube 和 2000+ 個支援的網站**下載影片、Shorts、音樂、頻道、Podcast或音軌 — 最高 4K HDR 60 fps，或匯出為 MP3 / AAC / Opus。在 Windows、macOS 和 Linux 本機執行。**無廣告、無臃腫、無付費推銷。**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## 功能

- **最佳畫質 · 僅音訊**
- **時間軸縮放 · 上一影格 · 下一影格 · 循環播放片段**
- **正在下載 → 正在合併 → 正在完成**
- 最高 **4K UHD（2160p）**、1440p、1080p、720p、480p、360p
- **音訊** — 將僅音訊匯出為 MP3、M4A/AAC、Opus 或 WAV。在互動式下載中，可用時選擇來源的原生環繞聲/Dolby 音軌（AC-3、E-AC-3、5.1、DRC），或設定全域預設 **優先環繞聲 / Dolby**
- **字幕**以 SRT、VTT 或 ASS 格式下載 — 手動或自動生成，支援任意可用語言
- **透過 yt-dlp 支援 2000+ 個其他網站** — Vimeo、Twitch、Twitter/X、TikTok、SoundCloud、Bandcamp、Bilibili、BBC iPlayer、archive.org 等眾多網站

## 從原始碼建置

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

**閱讀語言：** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · [العربية](README.ar.md) · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · [မြန်မာဘာသာ](README.my.md) · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **繁體中文**

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
