<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

Pobieraj filmy, Shorts, muzykę, kanały, podcasty i ścieżki dźwiękowe z **YouTube oraz ponad 2000 obsługiwanych serwisów** — nawet w 4K HDR przy 60 kl./s albo jako MP3 / AAC / Opus. Działa lokalnie na Windows, macOS i Linux. **Bez reklam, zbędnych dodatków i płatnych zachęt.**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## Funkcje

- **Najlepsza jakość · Tylko dźwięk**
- **Powiększenie osi czasu · Poprzednia klatka · Następna klatka · Zapętl fragment**
- **Pobieranie → Łączenie → Kończenie**
- Do **4K UHD (2160p)**, a także 1440p, 1080p, 720p, 480p i 360p
- **Dźwięk** — eksportuj sam dźwięk jako MP3, M4A/AAC, Opus lub WAV. Podczas pobierania interaktywnego możesz wybrać natywne ścieżki surround/Dolby źródła (AC-3, E-AC-3, 5.1, DRC), gdy są dostępne, albo ustawić globalne **Preferuj surround / Dolby**
- **Napisy** w SRT, VTT lub ASS — ręczne albo generowane automatycznie, w każdym dostępnym języku
- **Ponad 2000 innych serwisów** dzięki yt-dlp — Vimeo, Twitch, Twitter/X, TikTok, SoundCloud, Bandcamp, Bilibili, BBC iPlayer, archive.org i wiele innych

## Budowanie ze źródeł

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

**Przeczytaj w języku:** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · **Polski** · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · [العربية](README.ar.md) · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · [မြန်မာဘာသာ](README.my.md) · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [繁體中文](README.zh-Hant.md)

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
