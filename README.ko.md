<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

**YouTube 및 지원되는 2000개 이상의 사이트**에서 동영상, Shorts, 음악, 채널, 팟캐스트 또는 오디오 트랙을 다운로드하세요. 60 fps 4K HDR까지, 또는 MP3 / AAC / Opus로 저장할 수 있습니다. Windows, macOS, Linux에서 로컬로 실행됩니다. **광고도, 불필요한 기능도, 유료 전환 유도도 없습니다.**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## 기능

- **최고 화질 · 오디오만**
- **타임라인 확대/축소 · 이전 프레임 · 다음 프레임 · 클립 반복**
- **다운로드 중 → 병합 중 → 마무리 중**
- 최대 **4K UHD(2160p)**, 1440p, 1080p, 720p, 480p, 360p
- **오디오** — 오디오만 MP3, M4A/AAC, Opus 또는 WAV로 내보냅니다. 대화형 다운로드에서는 소스가 제공하는 네이티브 서라운드/Dolby 트랙(AC-3, E-AC-3, 5.1, DRC)을 선택하거나 전역 기본값으로 **서라운드 / Dolby 우선**을 설정할 수 있습니다
- SRT, VTT 또는 ASS **자막** — 수동 또는 자동 생성, 제공되는 모든 언어
- yt-dlp를 통한 **2000개 이상의 기타 사이트** — Vimeo, Twitch, Twitter/X, TikTok, SoundCloud, Bandcamp, Bilibili, BBC iPlayer, archive.org 등

## 소스에서 빌드

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

**다른 언어로 읽기:** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · [العربية](README.ar.md) · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · [မြန်မာဘာသာ](README.my.md) · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · [日本語](README.ja.md) · **한국어** · [繁體中文](README.zh-Hant.md)

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
