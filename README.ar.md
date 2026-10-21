<div align="center">
  <img src="src/renderer/src/assets/App-icon-HQ.png" alt="Grabbit" width="140" />

# Grabbit

نزِّل مقاطع الفيديو وShorts والموسيقى والقنوات والبودكاست والمقاطع الصوتية من **يوتيوب وأكثر من 2000 موقع مدعوم** — حتى 4K HDR بـ 60 إطاراً في الثانية، أو بصيغ MP3 / AAC / Opus. يعمل محلياً على Windows وmacOS وLinux. **لا إعلانات، لا حشو، لا عروض ترويجية.**

</div>

<img src="build/Main-screenshot.png" alt="Grabbit" width="100%" />

## الميزات

- **أفضل جودة · صوت فقط**
- **تكبير المخطط الزمني · الإطار السابق · الإطار التالي · تكرار المقطع**
- **جارٍ التنزيل → جارٍ الدمج → جارٍ الإنهاء**
- حتى **4K UHD (2160p)**، 1440p، 1080p، 720p، 480p، 360p
- **الصوت** — تصدير الصوت فقط بصيغ MP3 أو M4A/AAC أو Opus أو WAV. في التنزيلات التفاعلية، اختر مسارات surround/Dolby الأصلية للمصدر (AC-3، E-AC-3، 5.1، DRC) عند توفرها، أو اضبط إعدادًا افتراضيًا عامًا **تفضيل المحيطي / Dolby**
- **ترجمات** بصيغ SRT أو VTT أو ASS — يدوية أو مولَّدة تلقائياً، بأي لغة متاحة
- **أكثر من 2000 موقع آخر** عبر yt-dlp — Vimeo وTwitch وTwitter/X وTikTok وSoundCloud وBandcamp وBilibili وBBC iPlayer وarchive.org وغيرها الكثير

## البناء من المصدر

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

**اقرأ بـ:** [Afaan Oromoo](README.om.md) · [Bahasa Indonesia](README.id.md) · [Deutsch](README.de.md) · [English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Kiswahili](README.sw.md) · [O'zbekcha](README.uz.md) · [Polski](README.pl.md) · [Português](README.pt.md) · [Tiếng Việt](README.vi.md) · [Türkçe](README.tr.md) · [አማርኛ](README.am.md) · **العربية** · [اردو](README.ur.md) · [پښتو](README.ps.md) · [فارسی](README.fa.md) · [বাংলা](README.bn.md) · [हिन्दी](README.hi.md) · [ไทย](README.th.md) · [မြန်မာဘာသာ](README.my.md) · [Ελληνικά](README.el.md) · [Русский](README.ru.md) · [Српски](README.sr.md) · [Українська](README.uk.md) · [中文](README.zh.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [繁體中文](README.zh-Hant.md)

MIT · [LICENSE](LICENSE) · [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt)

_Last updated: 2026-10-21._
