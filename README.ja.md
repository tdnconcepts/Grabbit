<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

**YouTube と 2000 以上の対応サイト**から動画・Shorts・音楽・チャンネル・ポッドキャスト・音声トラックをダウンロード — 最大 4K HDR 60fps、または MP3 / AAC / Opus として。Windows、macOS、Linux でローカル動作。**広告なし、余計なものなし、アップセルなし。**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## 機能

- **最高画質 · 音声のみ**
- **タイムラインのズーム · 前のフレーム · 次のフレーム · クリップをループ**
- **ダウンロード中 → 結合中 → 仕上げ中**
- 最大 **4K UHD（2160p）**、1440p、1080p、720p、480p、360p
- **音声** — 音声のみを MP3、M4A/AAC、Opus、WAV で書き出します。インタラクティブなダウンロードでは、利用可能な場合にソースのネイティブ サラウンド/Dolby トラック（AC-3、E-AC-3、5.1、DRC）を選択でき、グローバルな既定値 **サラウンド / Dolby を優先** を設定できます
- SRT、VTT、または ASS 形式の**字幕** — 手動または自動生成、利用可能な任意の言語
- **2000 以上の他サイト** via yt-dlp — Vimeo、Twitch、Twitter/X、TikTok、SoundCloud、Bandcamp、Bilibili、BBC iPlayer、archive.org など多数

## ソースからビルド

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

**言語：** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · [العربية](README.ar.md) · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · [မြန်မာဘာသာ](README.my.md) · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · **日本語** · [한국어](README.ko.md) · [繁體中文](README.zh-Hant.md)

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
