# In-App Browser (Explore) Spec

Status: design revised after independent review (2026-10-13) — awaiting the
signed-in PO-token measurement and spec sign-off, then the implementation plan
Updated: 2026-10-13 (cross-platform spike, cookie-freshness experiment,
decisions D1–D6, review revision R1)

Research and rationale: [`youtube-auth-research.md`](youtube-auth-research.md).
**Read §2 and §6a before touching any of this.** The user-agent rule is
counter-intuitive and trivially broken by a well-meaning edit. Where this spec
and the research record disagree, this spec wins (the research keeps its
history; superseded points are marked there).

"Legacy" below is spec shorthand for what exists today — the Wizard (the **URL**
tab) and the `off` / `file` / `browser` cookie modes. It is not a glossary term
and never a UI label.

## Lives in

| Path | Role |
|---|---|
| `src/main/services/ExploreSessionService.ts` | **new** — owns the Explore partition: UA, proxy, permission/download policy, cookie reads, signed-in check and verification. Desktop adapter for `SessionCookieJarPort` |
| `src/main/services/netscapeCookieJar.ts` | **new** — pure `ExploreCookie[]` → Netscape text, with domain filter |
| `src/main/services/exploreEscalation.ts` | **new** — pure: does a failed run escalate? Matches `(errorKind, rawError/stderr)` (D1) |
| `src/shared/sites/types.ts`, `src/shared/sites/youtube.ts` | `Site.explore` capability (D5); owned `ExploreCookie` type — no Electron types in `src/shared` |
| `src/main/services/cookiesResolver.ts` | exhaustive switch over `(cookiesMode, auth)`; `file`/`browser`/`off` results unchanged |
| `src/main/services/YtDlp.ts` | `auth` run option (replaces `withoutCookies`); per-spawn jar via the injected port inside `invokeOnce`; stale-cookie warning detection |
| `src/main/services/YtDlp.ts` `invokeWithRetry` | escalated runs bypass the PoT ladder (no anonymous token); `HiddenWindowTokenProvider` `CHROME_UA` fix ships separately first (PR #263) |
| `src/main/services/ProbeService.ts` | probe-time escalation; `auth` on the probe result |
| `src/main/services/QueueService.ts` | carries `auth` from item to `StartDownloadInput`; persists escalation before the escalated spawn |
| `src/main/services/phases/VideoPhase.ts`, `SidecarSubsPhase.ts`, `SubtitleOnlyPhase.ts` | every `ytDlp.run` caller passes the job's `auth`; escalated jobs bypass `CookielessRetry` (D4) |
| `src/shared/schemas.ts` | `cookiesModeSchema` + `'explore'`; `jobAuthSchema`; `auth` on queue item, `probeInfoJsonRefSchema`, `startDownloadSchema`; new `common` fields |
| `src/shared/ipc.ts`, preload | `explore:*` channels, zod-validated in main |
| `src/renderer/src/components/wizard/DownloadProfilesHome.tsx` | the **existing** tab bar — Explore is added as one more tab |
| `src/renderer/src/store/wizard/probeErrorExperience.ts`, `DownloadProfilesSettingsTab.tsx`, `src/main/services/analytics.ts` | `explore` mode in error guidance, settings and the ban warning, analytics |
| `src/main/services/download/startupTempSweep.ts` | sweeps temp jars orphaned by a crash |
| `design/in-app-browser/` | mockups — `Main.dc.html` chosen, `MinWindow.dc.html` the 720x680 floor. **Gitignored (`/design/`), so local-only**; layout decisions are restated in [UI](#ui) |

## Goal

Add an **Explore** tab: an embedded browser where the user browses YouTube,
optionally signs in, and grabs what they find into the download flow. When a
download needs an account — sign-in required, private, age-restricted, or a bot
wall — Arroxy uses the Explore session's cookies for that job. This removes
manual cookie export and browser-picking, and fixes the "my cookies stopped
working" problem by construction (see *Cookie freshness — measured*).

## Non-goals

- **Not a replacement for the Wizard.** The `off` / `file` / `browser` cookie modes keep today's behaviour exactly; D6 *adds* `explore`.
- **Not a general-purpose browser.** v1 is YouTube plus Google sign-in only — not Gmail, not Search. Other sites are a planned extension through the site-adapter seam (D5), each gated on its own sign-in and freshness check — not built in v1.
- **Not multi-account.** One session, one signed-in identity.
- **Arroxy never handles credentials.** No reading, injecting, autofilling, or observing the sign-in form. The user types into Google's page; we only own the view it renders in.

## Decisions

### D1 — Explore cookies are used only when a job needs them

Downloads run signed out by default, exactly as today. A job **escalates** to
the Explore session only when a run fails in a way an account can fix, and only
if `cookiesMode` is `explore` (D6), `exploreEnabled` is on, and Explore is
signed in.

`ytdlp-errors` kinds alone do not separate these cases (a private video
classifies as `unavailable`; Watch Later and private playlists surface as
`unknown` / an empty playlist), so `exploreEscalation.ts` matches on
**`(errorKind, rawError/stderr)`**, app-side. The patterns are upstreamed to
`ytdlp-errors` later as a separately released change — never on this feature's
critical path.

| Escalates | Does not escalate |
|---|---|
| `loginRequired` | `ipBlock`, `rateLimit` — an account does not fix these, and signing in under throttling adds ban risk |
| `ageRestricted` | `geoBlocked`, `drmProtected` |
| `unavailable` **when** the message says private / members-only ("Private video", "members-only", "Join this channel") | `unavailable` otherwise (removed, terminated, …) |
| Account-only playlists: Watch Later / Liked (`list=WL`, `list=LL`), "playlist does not exist" on a private playlist | everything else |
| `botBlock`, **after** `invokeWithRetry`'s PoT ladder is exhausted | |

The members-only wording must be confirmed against a real members-only video
before the pattern is trusted.

**Escalation is decided in main and is sticky for the whole job.** Data flow:

1. **Probe escalation:** `ProbeService` re-runs the failed probe with the session and returns `auth: 'exploreSession'` on the probe result and on `probeInfoJsonRef` (the cached info-json is signed-in and must only ever be replayed by a signed-in run).
2. The renderer copies `auth` onto every queue item built from that probe — **playlist children inherit it**.
3. `QueueService` passes `auth` into `StartDownloadInput` (never `PreparedJob`, which describes *what* to download, not *as whom*).
4. **Video-phase escalation:** `VideoPhase` emits an escalation event that `QueueService` **persists before** the escalated spawn starts, so pause, crash or restart mid-run keeps the item signed in. The escalated run re-extracts — it never loads a signed-out probe's info-json.
5. Every `ytDlp.run` caller passes the job's `auth`: probe, `VideoPhase`, `SidecarSubsPhase`, `SubtitleOnlyPhase`. Title backfill stays anonymous (titles only; a failure there is harmless).
6. Probe entry points that must all honour this: Wizard single and bulk, hotkey, clipboard, profile quick-download, playlist hydration, Explore's Grab.

If Explore is not signed in, the error is shown as today plus a **"Sign in in
Explore"** action.

**Per-job budget.** Today a job can spawn up to ladder (3) × info-json fallback
(2) × auto-retry runs. Escalated runs get an explicit cap of **6 signed-in
spawns per job attempt**; exceeding it fails the job with the normal error
rather than retrying further. Tune from logs.

Rationale: the account is spent only where it unlocks something (yt-dlp
maintainers' and other apps' advice); the signed-out path stays primary;
signed-in sessions sometimes get *fewer* formats (why `CookielessRetry` exists).

### D2 — Sign-in happens inline in the Explore pane

The user clicks YouTube's own Sign in; Google's page renders in the same view —
the flow the spike verified on three platforms. No separate window. Reversible:
a dedicated window would wrap the same engine and session if the inline flow
proves cramped (e.g. reCAPTCHA at 720x680).

### D3 — Explore is on by default, with a "New" badge; the URL tab stays the launch tab

Arroxy already has a tab bar (`URL | Downloads | Profiles | Settings`, in
`DownloadProfilesHome.tsx`); Explore joins it right after URL —
`URL | Explore (New) | Downloads | Profiles | Settings`. Conditions:

1. **Lazy load.** Nothing in the Explore partition loads until the user first opens the tab — no YouTube page, RAM/CPU, autoplay, or Google tracking cookies for users who never use it. The view is torn down with the window; the session persists.
2. **Kill switch.** `exploreEnabled = false` hides the tab **and disables escalation**. The UA token is a per-user setting (validated, see the UA rule): support can tell users how to change it, but v1 has **no remote override** — a blocklisted token needs either user action or a release.
3. **Ban-risk notice** on Explore's first-run screen, before any sign-in: a downloader session carries account risk; use a secondary account (yt-dlp's own guidance).
4. **Wizard flows are unchanged.** The tab bar gains one tab; downloads started from the URL tab follow the selected cookie mode (D6), which is how they gain escalation.

### D4 — Escalated jobs never drop cookies

`CookielessRetry` does not apply to a job whose `auth` is `exploreSession`: it
escalated because the signed-out run failed, so a cookieless retry would fail
again. A quality-limited result on such a job is kept and reported, as today.
`CookielessRetry` is unchanged for `file` / `browser`.

### D5 — v1 is YouTube-only, structured for more sites

Site-specific facts live in the site adapter as an optional `explore`
capability, using an owned cookie type so `src/shared` stays Electron-free:

```ts
// src/shared — no Electron imports
interface ExploreCookie { name: string; value: string; domain: string; hostOnly: boolean; path: string; secure: boolean; httpOnly: boolean; session: boolean; expirationDate?: number }

interface SiteExplore {
  homeUrl: string                       // where the tab opens
  navigationHosts: HostRule[]           // top-level navigations allowed in-view (incl. the site's sign-in provider)
  cookieDomains: string[]               // a job's jar contains only these domains' cookies
  isSignedIn(cookies: ExploreCookie[]): boolean
}
```

YouTube's values:

- `cookieDomains`: **`youtube.com` only.** yt-dlp authenticates YouTube with YouTube's cookies; `.google.com` session cookies (which carry Gmail etc.) never reach a temp file. **Verified 2026-10-13:** a youtube.com-only jar (21 of 54 cookies) authenticates Watch Later exactly as the full jar does.
- `isSignedIn`: `LOGIN_INFO` plus a SAPISID-family cookie (yt-dlp's own `_has_auth_cookies` rule). Cheap and synchronous — a *presence* check; see verification below for *validity*.
- `navigationHosts`: see Navigation policy.

Adding a site = an `explore` entry **plus** re-running the sign-in and freshness
checks for that site. Not in v1: site switching, per-site sign-in status,
multi-site settings.

### D6 — Explore is a cookie mode

`cookiesMode` becomes `off | file | browser | explore`; the selected mode is the
one identity source, so a job never mixes two identities.

| Mode | Behaviour |
|---|---|
| `explore` | D1: anonymous by default; escalation uses the Explore session when signed in |
| `file`, `browser` | unchanged: those cookies on every run, `CookielessRetry` as today; no escalation |
| `off` | no cookies, ever — a real opt-out even when signed in to Explore |

- **Auto-switch at first Explore open, not at app start.** The first time a user opens the Explore tab with `cookiesMode === 'off'`, it switches to `explore` silently (they are opening the account feature). Users who never open Explore keep exactly today's settings and behaviour — no change to their error guidance, ban warning, analytics, or downgrade safety. A marker (`exploreModeAutoSwitched`) makes it happen once, so a later deliberate `off` is respected. The schema default stays `off`.
- **`file` / `browser` are never switched automatically** — those users are signed in today; a silent switch would break their gated downloads until they sign in to Explore, change on-every-run behaviour to on-demand, and may move them off a deliberately chosen secondary account.
- **In-tab nudge:** opening Explore while `cookiesMode` is `file` / `browser` (or a deliberate `off`) shows an alert naming the current mode — "Downloads use your cookies file, not your Explore sign-in" — with **[Use Explore sign-in]** (sets `cookiesMode` to `explore`; reversible in Settings) and **[Not now]** (remembered until `cookiesMode` next changes). It takes its own row above the browser view and never stacks with the first-run notice. Reuse the `CookiesErrorAlert` / `OpenCookiesSettingsButton` patterns.
- **Every `cookiesMode` consumer handles `explore` explicitly:**
  - `resolveCookies` becomes an exhaustive switch over `(mode, auth)` — today any non-`off`/`file` mode falls through to `browser` (`cookiesResolver.ts`), which would pass `--cookies-from-browser` to `explore` users with a leftover browser setting.
  - `probeErrorExperience.ts` (bot-wall / needs-cookies guidance keyed on `mode === 'off'`): under `explore`, signed out → "Sign in in Explore"; signed in → today's "enabled" variant.
  - Settings: `explore` option, and the ban warning shown for it (it is shown for any non-`off` mode today).
  - `ProbeService.probe`'s option type uses `CookiesMode`, not a hand-written literal union.
  - Analytics: `cookies_mode` gains `explore`; add an `escalated` property on download events. No URLs, titles or account data.
- **Downgrade:** an older build fails to parse `cookiesMode: 'explore'` and resets the `common` settings section to defaults (`SettingsStore`). Accepted and documented in the CHANGELOG — it only affects users who chose Explore.

## The rule that must not be broken

**Never claim to be a browser we are not.**

Google's sign-in gate does not check the engine — it checks for deception. A UA
string asserting Chrome/Brave/Firefox/Safari while Client Hints
(`Sec-CH-UA`, `navigator.userAgentData`) say otherwise is a detectable lie and
gets `/v3/signin/rejected`. A bland token that asserts nothing checkable passes
the full `GlifWebSignIn` flow.

- The Explore UA is Electron's default UA with the `Electron/<v>` and app-name tokens **replaced by the bland token `Desktop/1.0`**. Platform and Chromium version stay real so they agree with the client hints.
- **Not `Arroxy/<version>`.** It passes too, but names the downloader — a blocklist target and an account-flagging signal.
- **Never override Client Hints** to match a spoofed UA. That is the failure mode, not the fix.
- `exploreUserAgent` stores **only the token**, validated as `^[A-Za-z][A-Za-z0-9._-]*/[A-Za-z0-9._-]+$` and rejected if it names a browser (`Chrome`, `Firefox`, `Safari`, `Edg`, `OPR`, `Brave`, `Electron`, the app name). A pasted full UA is rejected, not stored.
- **UA invariant test:** the Explore UA must equal the platform's Electron default with exactly the `Electron/` and app-name tokens replaced by the configured token — no other change. Fails the build on any `Electron/`, app-name, or browser-identity token.

## Glossary additions

Add to [`GLOSSARY.md`](../GLOSSARY.md) (implementation-free, per its rules; reuse
the existing **Wizard** term rather than adding "Legacy"):

- **Explore** — the in-app browser tab where the user browses a supported site and may sign in.
- **Explore session** — the persistent, app-owned browsing identity behind Explore.
- **Explore cookies** — cookies read from the Explore session at the moment a download needs them. (Not "session cookies", which already means cookies that expire with the browser.)
- **Escalation** — switching one download from anonymous to the Explore session after a failure an account can fix.
- **Job auth** — the identity a download runs as: anonymous, or the Explore session after escalation; fixed for the rest of that download.

## Architecture

### Layering

Core download code never imports Electron or `ExploreSessionService`. The
session reaches yt-dlp through a port injected via `InvokeOptions`:

```ts
interface SessionCookieJarPort {
  // Writes a fresh, domain-filtered jar for the site, runs fn, deletes the jar — always.
  withJar<T>(siteId: SiteId, fn: (jarPath: string) => Promise<T>): Promise<T>
}
```

`ExploreSessionService` is the desktop adapter. This keeps the core/shell split
in [`dual-deploy-plan.md`](dual-deploy-plan.md) intact and makes the jar lifecycle unit-testable with a
fake port.

### Main process — `ExploreSessionService`

Owns the partition; nothing else may touch it.

```ts
class ExploreSessionService implements SessionCookieJarPort {
  getSession(): Session                          // persist:arroxy-explore
  getUserAgent(): string                         // Electron default with the token swapped
  readCookies(siteId: SiteId): Promise<ExploreCookie[]>   // live read, never cached, filtered to cookieDomains
  hasAuthCookies(siteId: SiteId): Promise<boolean>        // site.explore.isSignedIn — presence only
  verifySignedIn(siteId: SiteId): Promise<boolean>        // hidden page in the partition reads LOGGED_IN — validity
  signOut(): Promise<void>                       // clearStorageData on the partition
  withJar<T>(siteId: SiteId, fn: (jarPath: string) => Promise<T>): Promise<T>
}
```

Session setup, applied before anything loads:

- **`WebContentsView`**, not `<webview>` and not a second `BrowserWindow`; `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, no preload with app privileges. On Linux the app already runs with `--no-sandbox` (`build/afterPack.mjs`), so `sandbox: true` is a no-op there — an accepted, existing platform risk, stated rather than hidden.
- **Proxy:** the user's proxy setting is applied to the partition (as `HiddenWindowTokenProvider` does for its own), and proxy-auth `login` events are answered from it — otherwise cookies rotate from a different IP than yt-dlp uses.
- **Permissions:** `setPermissionRequestHandler` / `setPermissionCheckHandler` deny everything except what sign-in needs (to be confirmed in the manual matrix: WebAuthn/security keys, possibly clipboard-read for paste). Deny camera, mic, geolocation, notifications, MIDI.
- **Downloads:** `will-download` is cancelled; downloads go through Arroxy's pipeline only.
- **Devtools:** disabled when `app.isPackaged`; the gate is unit-tested (mock E2E runs unpackaged and cannot prove it).
- **YouTube's first-load self-reload** (`?themeRefresh=1`, `ERR_ABORTED`) is normal navigation, never a failure.

### Cookie handoff

```ts
type ResolvedCookies =
  | {kind: 'file'; path: string}
  | {kind: 'browser'; browser: CookiesBrowser}
  | {kind: 'session'; siteId: SiteId}   // explore mode + auth 'exploreSession'
```

`resolveCookies(settings, auth)` is an exhaustive switch over the mode; it stays
synchronous. Signed-in checks happen at escalation time and on the stale-cookie
path, not in the resolver.

**Never store a jar.** For `kind: 'session'`, `invokeOnce` calls
`port.withJar(siteId, jarPath => spawn(... '--cookies', jarPath ...))`: a fresh
read, a domain-filtered Netscape jar in Arroxy's own temp dir (`0600` on
macOS/Linux; on Windows the per-user temp dir's ACL is the protection — `0600`
means nothing there), deleted in a `finally`. The jar is scoped to **one
spawn** — `invokeOnce`, not `invokeWithRetry`, which can spawn up to three
times. A crash can orphan a jar, so the startup temp sweep deletes leftovers.

**Why exported cookies die, and why this design avoids it** (yt-dlp maintainers,
[#8227](https://github.com/yt-dlp/yt-dlp/issues/8227),
[#12482](https://github.com/yt-dlp/yt-dlp/issues/12482),
[#14872](https://github.com/yt-dlp/yt-dlp/issues/14872), PR
[#13014](https://github.com/yt-dlp/yt-dlp/pull/13014)): there is no time-based
expiry. Page JS in any open YouTube tab calls `RotateCookies` (~10 min cadence),
replacing `__Secure-1PSIDTS`/`3PSIDTS`; the server then rejects older copies by
clearing `LOGIN_INFO`. A copy whose source session is never used again lasts
days–weeks. Every app that captures cookies once (Seal, YTDLnis, Tyrrrz
YoutubeDownloader, Grayjay) has "login expired" reports. Because the Explore
session *is* the rotating browser, a read immediately before each spawn always
carries the newest values.

**Discard yt-dlp's write-back; never merge it into the session.** `--cookies FILE`
is read *and* rewritten on exit (`YoutubeDL.close()` → `cookiejar.save()`, not
atomic, no opt-out). The rewrite adds yt-dlp's own `PREF` (`hl=en`, `tz=UTC`),
`SOCS`, drops `HttpOnly`, and — on a stale run — carries the cleared
`LOGIN_INFO`, which merged back would sign Explore out. Measured: yt-dlp changes
only `PREF` and the `SIDCC` family; it never receives rotated sign-in cookies.

**Cookie freshness — measured 2026-10-13** (macOS, signed-in Explore-style
partition, hidden `youtube.com` page kept loaded and reloaded every 15 min to
stand in for a user browsing; 12 checks over 3 h; Watch Later as oracle):

| Finding | Evidence |
|---|---|
| The session rotates `__Secure-1PSIDTS`/`3PSIDTS` **every 10.0 min** while a YouTube page is loaded, and immediately on the first load after idling | 18 rotation pairs at 8.9, 19.0, 29.0 … 179.6 min |
| A copy **one rotation behind still authenticates** | 6/6 passes |
| A copy **two or more rotations behind is rejected** — yt-dlp warns *no longer valid* and runs signed out | 6/7 fails (one 2-behind copy passed at tick 4) |
| ⇒ a snapshot is safe for **≥ 10 min** after capture (until the 2nd rotation), at most ~20 min | |
| Presenting rejected copies did **not** harm the live session — no theft-detection revocation | 6 stale presentations; every following fresh check passed, `LOGGED_IN` stayed true |
| A fresh read before a spawn **always** authenticated | 12/12 |
| yt-dlp's write-back on success changes only `PREF`, `SIDCC` family, `__Secure-YNID`; on a rejected run it **deletes every auth cookie** (`LOGIN_INFO`, `SID`, `SAPISID`, `__Secure-1PSID`, …) | write-back diff per run, names only |

Consequences: per-spawn fresh reads are sufficient because the queue runs one
yt-dlp process per item (playlist items are separate queue items) and auth is
exercised in a spawn's first seconds. The only exposed path is a single spawn
whose authenticated requests span >10 min while a YouTube page is open in the
partition (e.g. enumerating a huge channel) — stale-cookie handling below
covers it. The write-back result makes "never merge" a hard rule.

### Presence vs validity, and stale-cookie handling

Cookie *presence* (`hasAuthCookies`) is not proof of a valid session: a password
change leaves a complete jar that authenticates nobody (research §6). And with
no YouTube page loaded nothing rotates, so simply re-reading the jar returns the
same cookies.

- **Before escalating:** `hasAuthCookies` must pass (cheap). No validity check and no keep-alive page: **measured 2026-10-13/14**, a session left 10 h with no YouTube page loaded (only signed-in yt-dlp runs in between, which do not rotate sign-in cookies) still authenticated yt-dlp from a fresh jar, and a page load afterwards reported `LOGGED_IN: true` — consistent with yt-dlp maintainers' "unused sessions last days–weeks". Validity is checked only when yt-dlp rejects the cookies (below).
- **On yt-dlp's warning** ("The provided YouTube account cookies are no longer valid…" — a warning, not an error; no `ytdlp-errors` kind): call `verifySignedIn`. If `LOGGED_IN` is true, retry the spawn **once** with a fresh jar. If false, Explore enters a **signed-out** state ("Signed out of Explore — sign in again") and the job fails with the "Sign in in Explore" action, rather than silently degrading.
- Both retries count against the per-job signed-in spawn cap (D1).

### Concurrency and pacing

- At most **2 escalated spawns run concurrently**; further escalated jobs wait (anonymous jobs are unaffected).
- At least **5 s between the starts of escalated spawns** (yt-dlp wiki: ~2,000 videos/hour signed-in; 5–10 s between items recommended).
- Concurrent `withJar` calls are safe: each gets its own jar, and reads never mutate the session.

### Navigation policy

Navigation rules govern **top-level and frame navigations** of the Explore view;
subresources (images, scripts, video from `ytimg.com`, `ggpht.com`,
`googlevideo.com`, `gstatic.com`, …) are not filtered in v1.

- **Allowed in-view:** `youtube.com` and subdomains, `youtu.be` (redirects into youtube.com), `accounts.google.com`, `accounts.youtube.com`, Google's ccTLD sign-in hops (`accounts.google.<cctld>` — the spike observed `accounts.google.co.in/accounts/SetSID`), and the consent pages (`consent.youtube.com`, `consent.google.com`) that EU users see first. **Not** `google.com` at large — Explore must not become a Gmail/Search browser.
- **User-initiated link to anywhere else** → `shell.openExternal`, **only** for `http:` / `https:` and only on a user gesture.
- **Redirect to an unexpected host during a navigation** (not user-initiated) → blocked and its host logged; never handed to the system browser (sign-in redirect URLs can carry session material such as `sidt`).
- `setWindowOpenHandler` → `{action: 'deny'}`, routing to the rules above. Verified 2026-10-13: the full sign-in (incl. reCAPTCHA and TOTP) opened **no popups** on any platform.
- Never inject scripts into `accounts.google.com` — not for convenience, not for diagnostics. (`verifySignedIn` reads `ytcfg` on `youtube.com` only.)
- The manual matrix logs every off-allowlist host hit during sign-in, to catch hops the spike did not see.

### PO tokens — never the anonymous token on an escalated run

Today every YouTube media run (and explicit single-video probe) mints a PO
token from the **anonymous** `HiddenWindowTokenProvider` and sends it with
`visitor_data` (`YtDlp.ts` `invokeOnce`; `TokenService` has one provider, one
cache). An escalated run would therefore pair signed-in cookies with a token
bound to a different, anonymous identity — the mismatch the research measured
as "cookies + `web.gvs` token → 0 formats". So:

- **An escalated run never receives the anonymous token.** Per the recommendation below, v1 sends it no token at all; if account-bound minting is ever needed, `TokenService` becomes keyed by identity (`anonymous` vs `account`, the latter minted inside the Explore partition and passed as `data_sync_id`).
- **Measured 2026-10-13** (macOS, yt-dlp `2026.10.10` nightly, public 4K video `aqz-KE-bpKQ`, `best-quality` profile; the signed-in jar was youtube.com-only and verified authenticated via Watch Later):

  | Run | Clients yt-dlp used | Result |
  |---|---|---|
  | Anonymous + anonymous token (today's pipeline, `smoke:download`) | `tv_samsung`, `visionos`, `web_embedded` | `401+258`, **2160p**, 1 attempt |
  | Signed-in + anonymous token (`smoke:download --cookies file:`) | `web_embedded`, `tv_samsung` | `401+258`, **2160p**, 1 attempt |
  | Signed-in, **no token** (raw yt-dlp) | `tv_samsung`, `web_embedded` | `401+258`, **2160p**; no withheld-formats warning |

  The research's "cookies + `web.gvs` token → 0 formats" came from the old `mweb` path and **does not reproduce** on current yt-dlp. The anonymous token on a signed-in run is harmless for formats but still pairs two identities.
- **Recommendation (needs sign-off — reverses the earlier "build account-bound minting with escalation"):** escalated runs send **no PO token** in v1. It removes the identity mismatch, measured full quality, and drops the largest piece of step 3 (minting inside the Explore partition, an identity-keyed `TokenService`). The pipeline's existing withheld-formats signal (`formatsWithheld`) is logged per escalated run; account-bound minting (`data_sync_id`) is added only if that signal shows up on escalated jobs. Not yet covered by the measurement: age-restricted / members-only videos, which need an age-verified account.
- Signed-in runs currently use `web_embedded` / `tv_samsung` / `web` ([yt-dlp #17805](https://github.com/yt-dlp/yt-dlp/pull/17805)); `android_vr` does not support cookies. Do not hard-code client assumptions; they move with yt-dlp releases.
- **`CHROME_UA` fix ships separately, first:** `HiddenWindowTokenProvider` declares `X11; Linux x86_64 … Chrome/130` regardless of host — the same class of lie as above, affecting every user's minting today. Its own PR and beta, independent of Explore.

## Settings and schema

Per house rule, enums go in [`src/shared/schemas.ts`](../src/shared/schemas.ts) as `z.enum` → `z.infer` → `.options`.

```ts
export const cookiesModeSchema = z.enum(['off', 'file', 'browser', 'explore'])
export const jobAuthSchema = z.enum(['anonymous', 'exploreSession'])
```

New `common` fields:

| Field | Type | Default | Notes |
|---|---|---|---|
| `exploreEnabled` | `boolean` | `true` | Shows the Explore tab; off also disables escalation (D3) |
| `exploreUserAgent` | `string?` | unset → `Desktop/1.0` | Token only, validated (UA rule) |
| `exploreNoticeSeen` | `boolean` | `false` | First-run ban-risk notice acknowledged |
| `exploreModeAutoSwitched` | `boolean` | `false` | D6 one-time `off` → `explore` at first Explore open |
| `exploreModeNudgeDismissedFor` | `CookiesMode?` | unset | D6 "Not now", cleared when `cookiesMode` changes |

`auth: JobAuth` (default `'anonymous'`) on: the queue item (persisted),
`probeInfoJsonRefSchema`, the probe result, and `startDownloadSchema`. Persisted
data is parsed through these schemas on load (trust boundary).

`YtDlpRunOptions.withoutCookies` is replaced by a single identity option
(`'configured' | 'none' | 'exploreSession'`), so callers state *which* identity
a run uses instead of combining flags.

## UI

Mockups: [`design/in-app-browser/`](../design/in-app-browser/) — `Main.dc.html`
is the chosen split layout, `MinWindow.dc.html` the 720x680 floor.

- **Tab bar:** the existing one gains Explore after URL (D3), with a "New" badge; URL stays the launch tab. With `exploreEnabled` off, the bar is exactly today's.
- **Explore first run:** ban-risk notice, then the YouTube home page. The view mounts on first open only (D3.1).
- **Sign-in inline** (D2) — nothing injected, no Arroxy UI over Google's form.
- **Split pane:** browser above, download controls below; must hold at 720x680. **Grab** takes the view's current URL (from `exploreStateChanged`) into the download flow — no second URL input.
- **No sign-in status chip**, except the explicit *signed-out* state after a failed verification (stale-cookie handling).
- **The native view paints over all DOM.** Overlay policy: the renderer reports a placeholder element's rect; main positions the view there (multiplied by the UI zoom factor, re-sent on resize/zoom). The view is **hidden** whenever the placeholder is unmounted or any modal/dialog/sheet is open (dialogs, the What's-new dialog, settings sheets). Toasts and the update banner must not render inside the placeholder's area. Alerts (nudge, notices) take layout rows *above* the placeholder.
- **Five tabs at the 720px floor** with the longest locales (`el`, `fr`, `my`) is the main layout risk. There is no tab-bar overflow test to extend today — add a case to `tests/browser/toggle-overflow.spec.ts`.
- shadcn primitives only; no Radix; `toggleVariants` rules; the ui-consistency ratchet must not rise.

## IPC

Add to `IPC_CHANNELS` in [`src/shared/ipc.ts`](../src/shared/ipc.ts); every
renderer → main payload is parsed with zod in main:

```
exploreNavigate      'explore:navigate'      // {kind: 'url', url} | {kind: 'back'|'forward'|'reload'|'home'}
exploreSetBounds     'explore:setBounds'     // {x, y, width, height} in CSS px; main applies the zoom factor
exploreSetVisible    'explore:setVisible'    // {visible: boolean} — overlay policy, unmount
exploreSignOut       'explore:signOut'
exploreGetState      'explore:getState'
exploreStateChanged  'explore:stateChanged'  // main → renderer
```

State: `{url, title, canGoBack, canGoForward, loading, signedIn, signedOutAfterVerify}`.
Grab reads `url` from state — no separate channel. **Cookies never cross IPC.**

## Security

- Temp jars: own temp dir, `0600` where meaningful, deleted in a `finally`, swept at startup, never in the output directory, filtered to the site's `cookieDomains` (YouTube: `youtube.com` only).
- Never log cookie values — names and domains only.
- If cookies are ever persisted outside the session (they should not be), encrypt at rest via `safeStorage`.
- **Cookie encryption at rest is a separate change.** The Explore partition is plaintext on disk today, like the existing token partition. The `EnableCookieEncryption` fuse is a **one-way, app-wide** switch with real risks: the macOS build is unsigned (`identity: null`), so the Keychain item may prompt or fail to decrypt after updates (a silent sign-out); the Flatpak lacks `--talk-name=org.freedesktop.secrets`; Linux without a keyring falls back to plaintext anyway; turning the fuse off later corrupts the store. It gets its own change, its own beta, and an ADR. **Explore may ship in beta without it; Explore may not reach a stable release without it** (or an explicit, recorded decision to accept plaintext).
- Account safety: concurrency and pacing caps above; ban-risk notice before sign-in.
- `NSBluetoothAlwaysUsageDescription` in the packaged macOS app's Info.plist, or Bluetooth security keys cannot complete 2FA.

## Testing

Following the layer ownership in AGENTS.md — Explore is **not** an excuse to
drive real YouTube login from CI.

| Layer | Covers |
|---|---|
| Unit (`tests/unit`) | Jar writer: host-only cookies (`FALSE`, no leading dot), `#HttpOnly_`, expiry `0` for session cookies, `__Host-`/`__Secure-` names; domain filter (`.google.com` excluded); escalation matcher over `(kind, message)` incl. private, members-only, WL/LL, botBlock-after-ladder, and every non-escalating kind; sticky `auth` through probe result → ref → queue item → `StartDownloadInput`, playlist inheritance, persistence before the escalated spawn; per-job spawn cap; concurrency/pacing; `CookielessRetry` bypass (D4); `resolveCookies` exhaustive over modes, `file`/`browser`/`off` unchanged; auto-switch at first open exactly once, later `off` respected, `file`/`browser` never switched; `probeErrorExperience` under `explore`; stale warning → verify → one retry / signed-out state; navigation policy decisions; `exploreUserAgent` validation; devtools gate; **UA invariant**; escalated runs never receive the anonymous PO token |
| Renderer (`tests/renderer`) | Explore tab after URL, "New" badge, URL still the launch tab, absent when `exploreEnabled` off; first-run notice; nudge shown/hidden/dismissed; view not mounted before first open; placeholder hidden while a modal is open |
| Browser mock (`tests/browser`) | Explore layout at 720x680 and 150% zoom; new tab-bar case in `toggle-overflow.spec.ts` across `el`/`fr`/`my` |
| Mock Electron E2E | Partition isolation from the app session; no cookies over IPC; no Explore partition activity before first open; `will-download` cancelled |
| Fixture Product E2E | Needs an **E2E-only hook** (gated on `ARROXY_E2E=1`) to seed cookies into the Explore partition. **Escalation scenario:** the fixture plugin reads a marker cookie via `self._get_cookies('https://www.youtube.com')` and raises "Sign in to confirm your age" without it; the probe fails anonymously, escalates, downloads. Oracles: the plugin reports the marker per request (reusing the existing `signedIn` request field), so other items are shown anonymous; the item's `auth` persisted; the file exists; deny proxy clean. **D4 scenario** with `COOKIE_LIMITED_VIDEO_ID`: an escalated, quality-limited job asserts no cookieless retry happens. **Never real YouTube auth.** |
| Manual | Cross-platform matrix on the product build (below), logging off-allowlist hosts |

**Manual matrix — executed 2026-10-13** with a throwaway spike (plain Electron
43.7.7, own persistent partition, UA token `Desktop/1.0`, no injection, no
synthetic input), a spare Google account with TOTP 2FA, signed in by hand.
Oracle: yt-dlp reads the account's Watch Later with the session jar and gets
*"The playlist does not exist"* without it.

| Platform | Page-load flow (`Desktop/1.0` / honest Electron control) | Real sign-in (pwd + TOTP) | `LOGGED_IN` | Cookies authenticate yt-dlp | Survives restart | Bot-wall relief |
|---|---|---|---|---|---|---|
| macOS 26 arm64 | `GlifWebSignIn` / `WebLiteSignIn` | pass | true | pass | pass | unproven |
| Windows 11 arm64 | `GlifWebSignIn` / `WebLiteSignIn` | pass | true | pass | pass | unproven |
| Ubuntu 26.04 arm64 (Wayland) | `GlifWebSignIn` / `WebLiteSignIn` | pass | true | pass | pass | unproven |

Observed on every platform, and binding on the implementation:

- **YouTube reloads itself on first load** (`?themeRefresh=1`), aborting the initial `loadURL` with `ERR_ABORTED`. Treat that abort as normal navigation, never as a failure. (`HiddenWindowTokenProvider` already loads the `themeRefresh` URL, likely for this reason.)
- **Google inserted `challenge/recaptcha` before the password step** every time (new account; may not apply to established ones). The Explore view must be large enough to solve a reCAPTCHA at the 720x680 floor.
- **Linux ran with `--no-sandbox`** — identical to the shipped Linux build (`build/afterPack.mjs`), so no deviation from production.
- Not yet run: x64 Windows/Linux (same Chromium; low risk — run one probe before release) and bot-wall relief (cannot be provoked on demand).

## Implementation order

0. **Separate PR, now:** `CHROME_UA` fix in `HiddenWindowTokenProvider` → **verify:** unit test on the UA; live smoke that anonymous minting still works on all three platforms.
1. **Seams, no behaviour change:** `ExploreCookie` + `Site.explore` (YouTube values), `netscapeCookieJar` + domain filter, `SessionCookieJarPort`, `cookiesModeSchema` + `'explore'` with an exhaustive `resolveCookies`, `jobAuthSchema`, the identity run option replacing `withoutCookies`, `explore` handled in `probeErrorExperience` / settings / analytics (option not yet offered in UI) → **verify:** unit tests; all existing tests pass untouched.
2. **`ExploreSessionService` headless:** partition, UA + validation, proxy, permissions, `will-download`, devtools gate, cookie reads, `hasAuthCookies`, `verifySignedIn`, port adapter, E2E-only seeding hook, startup jar sweep → **verify:** unit + mock E2E isolation.
3. **Escalation:** matcher; `auth` data flow (probe result → ref → queue item → `StartDownloadInput`, persistence, playlist inheritance, every `ytDlp.run` caller); `VideoPhase` persist-before-spawn; `CookielessRetry` bypass; escalated runs skip the PoT ladder (no anonymous token — see PO tokens); stale-warning handling; spawn cap, concurrency, pacing → **verify:** unit + fixture E2E escalation and D4 scenarios; a live escalated `smoke:download` reaches full quality.
4. **Explore UI:** tab, lazy `WebContentsView`, IPC (bounds/visibility/navigation/state), overlay policy, navigation policy, first-run notice, auto-switch at first open + nudge, `explore` in cookie settings, kill switch, Bluetooth plist key → **verify:** renderer + browser tests (720x680, 150%, worst-case locales).
5. **Shipping scope:** all app strings in every locale via `translate-arroxy-i18n`; update the English root `README.md` and a screenshot recipe; CHANGELOG (incl. the downgrade note); `GLOSSARY.md` glossary; ADR (UA rule + Explore as a cookie mode) → **verify:** `bun run check`.
6. **Manual matrix on the product build** (macOS, Windows, Linux + one x64 probe), logging off-allowlist hosts and the permissions sign-in actually requests → **verify:** the table above repeated against the real app.

**Separate track:** cookie encryption at rest (fuse) — own change, own beta, own
ADR; required before Explore reaches a stable release.

Steps 0–3 carry no UI risk. The spike retired the step that could have
invalidated the design.

## Open items

- **Escalated runs without a PO token** (PO tokens) — measured; recommendation awaits sign-off.
- **Members-only wording** — confirm the message against a real members-only video (D1).
- **Sign-in permissions** — which permissions Google's flow requests (security keys, paste), from the manual matrix.
