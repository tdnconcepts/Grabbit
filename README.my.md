<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

**YouTube နှင့် ၂၀၀၀+ ထောက်ပံ့သောဆိုဒ်များ** မှ ဗီဒီယိုများ၊ Shorts၊ သီချင်းများ၊ channel များ၊ podcast များ သို့မဟုတ် audio track များကို ဒေါင်းလုဒ်ဆွဲပါ — 60 fps တွင် 4K HDR အထိ၊ သို့မဟုတ် MP3 / AAC / Opus အဖြစ်။ Windows, macOS နှင့် Linux တွင် သင့်ကွန်ပျူတာပေါ်တွင်သာ run ပါသည်။ **ကြော်ငြာမပါ၊ bloat မပါ၊ upsell မပါ။**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## လုပ်ဆောင်ချက်များ

- **အကောင်းဆုံးအရည်အသွေး · အသံသာ**
- **အချိန်လိုင်း ချဲ့ခြင်း · ယခင်ဖရိမ် · နောက်ဖရိမ် · အပိုင်းကို ထပ်ခါတလဲလဲ ဖွင့်ရန်**
- **ဒေါင်းလုဒ်လုပ်နေသည် → ပေါင်းစည်းနေသည် → အပြီးသတ်နေသည်**
- **4K UHD (2160p)** အထိ၊ 1440p, 1080p, 720p, 480p, 360p
- **အသံ** — အသံသာကို MP3၊ M4A/AAC၊ Opus သို့မဟုတ် WAV အဖြစ် export လုပ်ပါ။ interactive downloads တွင် ရနိုင်ပါက source ၏ native surround/Dolby tracks (AC-3၊ E-AC-3၊ 5.1၊ DRC) ကို ရွေးချယ်ပါ၊ သို့မဟုတ် global default **surround / Dolby ကို ဦးစားပေးပါ** ကို သတ်မှတ်ပါ
- SRT, VTT သို့မဟုတ် ASS တွင် **Subtitles** — ကိုယ်တိုင်ရိုက်ထည့်ထားသော သို့မဟုတ် auto-generated၊ မည်သည့် language မဆို
- **၂၀၀၀+ အခြားဆိုဒ်များ** yt-dlp မှတဆင့် — Vimeo, Twitch, Twitter/X, TikTok, SoundCloud, Bandcamp, Bilibili, BBC iPlayer, archive.org နှင့် အခြားအများကြီး

## Source code မှ Build လုပ်ခြင်း

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

**ဘာသာဖြင့် ဖတ်ရှုရန်:** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · [العربية](README.ar.md) · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · **မြန်မာဘာသာ** · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [繁體中文](README.zh-Hant.md)

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
