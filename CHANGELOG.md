# TBH HUD — Changelog

All notable changes to the read-only TBH: Task Bar Hero companion. The same notes are shown in-app
(✨ **What's new** in the header) and on each [GitHub Release](https://github.com/revenantcabal-rgb/taskbarheroburat/releases).
Every release is **read-only** — the HUD never writes to the game, its saves, or its memory.

## v1.0.25 — 2026-06-13

### Added — "Crew comes alive"
- **Activity feed.** A live stream of recent crew milestones, newest first: breaking into **Nightmare / Hell /
  Torment**, a **first Immortal/Arcana** gear drop, gold & kill milestones, hero level-ups, rune milestones.
- **Crew records (category crowns).** A strip at the top of the board showing who holds **Deepest / Richest /
  Deadliest / Most runes / Rarest gear**, with the holder crowned 👑.
- **Momentum + sparkline.** Each member shows a "📈 gaining X/hr" chip and a small lifetime-gold trend line —
  *measured from their own shared snapshots* (the crew API already kept this history; nothing new is collected).
- **Live presence.** A 🟢 dot marks members who shared in the last 2 minutes ("online now").
- **Catch-the-leader ETA.** Your own row shows a measured **"~Xd to pass \<leader\>"** when your pace makes it knowable.
- **Pinned rival.** A compact head-to-head card — you vs a chosen rival across the key stats, "ahead in X of Y."

All of the above is derived from the **same opt-in brag-stats you already share** — no new data leaves your
device, the crew API stays code-gated and account-free, and "Remove my data" now also clears your feed entries.

## v1.0.24 — 2026-06-13

### Fixed
- **Stage difficulty is now correct for Nightmare, Hell and Torment.** Higher-difficulty stages were showing the
  wrong band and act — a friend on **Nightmare Act 2-9** was labeled **"Act 3-9 · Torment."** The old decode treated
  the stage number as one continuous run of 12 acts; the game actually prefixes the difficulty into the key
  (`key = difficulty×1000 + act×100 + stage`, where `1`=Normal, `2`=Nightmare, `3`=Hell, `4`=Torment, calibrated
  straight from the game's own `StageInfoData`). Normal keys happened to decode the same under both readings, which
  is why the bug only became visible once players cleared past Normal. The Crew board re-decodes every member from
  their numeric stage key, so **friends don't need to update** for their stages to read correctly.

## v1.0.23 — 2026-06-12

### Fixed
- **Switching back to English now fully restores the UI.** The header, tab bar and connect screen were staying
  in Chinese after toggling 中 → EN. Cause: the restore step skipped any text node with no Latin letters as an
  optimization — but that's exactly every pure-Chinese label (`总览`, `断开连接`, …), so they were never restored.
  The page chrome is never re-rendered (unlike tab content, which rebuilds in the active language), so it stayed
  stuck in Chinese. The Latin fast-skip now applies only while translating, never while restoring. Verified across
  load-in-Chinese → English and repeated toggles, with zero leftover Chinese.

## v1.0.22 — 2026-06-12

### Fixed
- **Desktop mini-HUD now actually opens.** Its window file (`mini.html`) was never bundled into the installer —
  a packaging gap present since the mini-HUD shipped in v1.0.16 — so on installed builds the **🗗 Mini-HUD**
  button popped up a blank window. It's now included in the app. (It always worked when running from source in
  development, which is why it slipped through.)
- **Clarified:** the mini-HUD is a **desktop-only** always-on-top window — a browser can't float a window over a
  fullscreen game, so it intentionally **does not appear in the web version**, only in the installed Windows app.

## v1.0.21 — 2026-06-12

### Added
- **Language switch — English / 简体中文.** A **中 / EN** toggle in the header flips the entire HUD to
  Simplified Chinese (your choice is remembered on your device). **Game terms** — item, hero, stage, rune,
  rarity and difficulty names — are taken straight from the game's **own** zh-Hans localization bundle, so
  nothing is machine-guessed (golden rule); the HUD's own chrome is translated on top of that. Stage labels
  read out the difficulty too, e.g. `第3-5关 · 折磨` (Torment). Switching back to English restores everything.
  Coverage is highest on the core stat views (Overview / Runes ≈ 100%); some long explanatory help-text is
  still being translated.

## v1.0.20 — 2026-06-12

### Fixed
- **Stages now show the real act *and* difficulty.** A stage like `Act 3-5 · Torment` was previously displayed
  as the meaningless `Act 12-5`. The game has **4 difficulty bands** (Normal / Nightmare / Hell / Torment) of
  **3 acts each**, but the save numbers stages *continuously* across them — so anyone past Normal was shown an
  inflated act number (6, 9, 12…). The HUD now decodes the band and labels the difficulty, with names taken
  straight from the game's own data (`Difficulty_*` localization, corroborated by the four difficulty
  Soulstones). Higher difficulties also show the **stage name** again (they replay the Normal-band maps, so the
  name resolves via the equivalent Normal stage). On the **Crew board**, members still running an older app are
  re-decoded from their shared stage key automatically — nobody shows the old `Act 12-5` form.

## v1.0.19 — 2026-06-11

### Added
- **Loot tab: "↻ Refresh now" + a freshness stamp.** Crafts and Cube syntheses are detected from your **save
  file**, which the game writes on its own schedule — not the instant you craft. The Loot tab now shows
  **"save written … ago"** (so you can see whether the game has saved since your craft) and a **↻ Refresh now**
  button that re-reads the save, Player.log and backups on demand — on desktop and on web folder/file connects.
  One-time file drops can't be re-read (no handle), so the button says that honestly instead.

### Fixed
- **Desktop: a save-watch watchdog.** Windows can silently kill a long-running file watcher (typically after
  sleep/resume) — the HUD would then quietly freeze: stale gold, no new loot, nothing refreshing, no error.
  A lightweight mtime check (every 5 s for the save, ~30 s for Player.log) now backstops the watcher so reads
  always keep flowing. Detection itself was verified end-to-end: a craft (1 new item, materials consumed) and
  a synthesis (1 new item, 9+ materials consumed → tagged ⚒️ Cube) both log on the next save read.
- The verify harness's per-stage rate consistency check now tolerates the display-rounding of tiny measurement
  windows (a freshly-started stage measured over 0.1h tripped a false alarm — the engine math was correct).

## v1.0.18 — 2026-06-11

### Fixed
*(All four found by an adversarial review pass over v1.0.17 and fixed the same day.)*
- **The Cube panel's ✓/🔒 now come from your save's own unlock records** (`cubeRecipeSaveDatas.MaxUnlockRecipeKey`)
  instead of being inferred from your Cube level. Unlocking is a **purchase**: a real backup showed Engraving still
  locked at Cube 17 despite its level-15 gate, so level alone was the wrong signal. Saves without the records get
  no ✓/🔒 claims at all (calibrate-or-omit).
- **Synthesis "Reachable with…" lines state BOTH requirement columns** from the game's own row — minimum material
  **tier** and average **level**. The tier requirement varies between the side-by-side alternatives and was
  previously omitted, making the line a sufficiency claim the source data contradicted.
- **Typing in the target picker no longer loses focus** when a save update re-renders the Overview mid-keystroke
  (stray digits could even trigger the number-key tab shortcuts).
- **The data build now hard-fails if a future game patch makes synthesis bands diverge across grades** — the
  grade-free band display depends on that identity; it was verified but not previously enforced as an assertion.

## v1.0.17 — 2026-06-11

### Added
- **Codex recipes** — every item's Codex page now shows how the Cube can **make** it: crafting recipes
  (tier, Cube unlock level, clickable ingredient tiles, result-pool size — "which one is random; the game
  ships no odds to quote") and synthesis pools (tier, unlock level, grade/level band, requirement bands, and
  the game's own rule quoted verbatim: *"Synthesize 9 items of the same grade into one of a higher grade"*).
  Materials additionally show what the Cube **uses** them for (crafting ingredient lines; offering coins with
  their gold cost). Sourced from five newly extracted game tables (CubeRecipe/CubeSubRecipe/CubeLevel/
  SynthesisDrop/ExtractionCost InfoData) + the two recipe tables — **odds are never quoted**: the raw data
  carries weights, but how they compose lives in game code, so membership only (calibrate-or-omit).
- **The Cube reference** (Advisor) — all 8 recipe categories with the game's own localized tooltips on hover,
  and every sub-recipe chip marked ✓ unlocked / 🔒 locked against **your** Cube level.
- **Targets** — pin one goal on the Overview: **save up gold**, **a rune level** (priced from the game's own
  per-level cost table; "ready now" when affordable), **wear a level-locked find** (from the Advisor's real
  notices; ETA from that hero's measured XP/hr), or **clear a stage** (ETA from your history's measured
  progression, in played time). Every ETA uses only your own measured pace — honest "measuring…" /
  "not gaining" states, never an assumed rate — and the target clears itself with a 🎉 when reached.
- **Help calibrate (optional)** — if your save carries enchants on gear types whose slot category isn't
  verified yet, the Advisor lists the three-field tuples (gear type · stone · rolled stat) and one explicit
  click reports exactly those three fields. Never your save, no identifiers of any kind.
- **Crew: "Remove my data"** — one click deletes your row + history from the crew server (sharing flips off;
  friends keep theirs; rejoin any time).

### Changed
- **Crew server hardening** — rate limiting on every endpoint (Postgres fixed-window; the client's own pace
  is far below every cap), a prune endpoint (self-remove + stale-member cleanup with a **7-day server-enforced
  floor** so a leaked crew code can never remove an active member), and strict whitelist validation on the new
  calibration reports (the 20 real gear types only, aggregate counters, flood ceiling).
- The blue-chest findings doc gained a precision correction: the raw `DropInfoData` does carry per-entry
  weights (the original sweep searched the baked DB) — but every pool containing a Stage Boss Box is a uniform
  class-selector or single-entry pool, so the conclusion is unchanged and stronger: **no chest-drop probability
  exists anywhere in the client data**; the measured tracker stays the only honest rate.

## v1.0.16 — 2026-06-11

### Added
- **Loot tab controls** — rarity chips, an origin filter (⚒️ Cube / ✦ found / unclear), free-text search,
  sort (newest / rarity / name), Today/Yesterday date headers, and paged rendering with honest counts
  ("showing 80 of 214") — nothing is silently cut any more. The stored timeline grew from 120 to 500 items,
  and the offline-rewards table pages the same way.
- **Loot export** — one click downloads the full new-items timeline + offline rewards as **CSV or JSON**
  (local + UTC time, name, rarity, origin, level). Client-side, read-only.
- **"Where's my chest?" answered** — the game sometimes mints boxes that Steam returns *empty* for
  (`CreateSteamItem … items is empty` in your own Player.log). The Loot tab now counts exactly those lines:
  the boxes are held on the **Steam side**, never reach your save, and that's why they don't appear in the
  timeline. A Steam-side delay — not a missed drop. (Full investigation: COMMON-BOX-STEAM-ROUTING-FINDINGS.md.)
- **Blue-chest tracker — measured from YOUR play, never asserted.** The "blue chest" is the game's RARE
  **Stage Boss Box**; its drop % and the rumored 12-minute per-stage cooldown are **not in the game's files**
  (file-verified — BLUE-CHEST-DROP-RATE-FINDINGS.md). So the HUD measures instead: every Stage Boss Box that
  lands in your save is logged with your stage and play-hours, and the panel shows your own same-stage gaps
  and after-a-stage-switch gaps — medians, mins, maxes, **always with the sample size**. Gaps are shown in
  played time so closed-game periods don't stretch them.
- **Inventory power tools** — search (name/ID), gear-type filter, sort (rarity / level / type /
  enchanted-first), "✨ enchanted only" + equipped/unequipped toggles (worn items show a dot), and a
  **⚖ Compare mode**: pick two items of the same gear type for side-by-side inherent stats from the game's
  own gear table — facts only, no better/worse verdicts.
- **"Safe to let go" (redundant duplicates)** — spares listed **only on structural proof**: you own more
  strictly-better pieces of that gear type (higher rarity at the same-or-lower level requirement) than your
  whole roster could ever wear at once. Never a "sell" recommendation — salvage values aren't calibrated, so
  none are quoted.
- **Desktop mini-HUD** — a compact, frameless, always-on-top strip showing gold · session gold/hr · current
  stage · the offline-rewards timer · your next rune step. Fed by the same read-only save watcher (no new
  data lane); position, size and opacity are remembered; toggle it from the header or Settings.
- **Settings panel (⚙)** — compact density, reduced motion (or follow your system), default tab on launch,
  rare-item alerts, and the mini-HUD controls on desktop. Stored locally, never in your game.
- **Keyboard shortcuts** — **1–9/0** jump to the first ten tabs, **←/→** cycle through all eleven,
  **/** focuses the current tab's search box. Typing in a field is never hijacked.

## v1.0.15 — 2026-06-11

### Fixed
- **Extremely slow update downloads.** Root cause, diagnosed on a real install: differential "patch"
  downloads fetched nearly the whole 79 MB installer as thousands of tiny sequential range requests
  against GitHub's CDN (the installer is solid-compressed, so any change ripples through the entire
  archive) — many minutes instead of about one. Updates now stream the installer in a single download
  (~79 MB; measured ≈1 MB/s ≈ 80 s on the reference line), releases no longer ship a blockmap (so even
  older installs fall back to the fast full download immediately), and the update banner now shows
  **size + live speed** ("42% · 33 / 79 MB · 1.0 MB/s") so progress is always visible.

## v1.0.14 — 2026-06-11

### Added
- **App version vs game version, made explicit** — the footer now shows "app v…" (this HUD) on every
  platform, browser included (it was desktop-only); the header's "game v…" is your game's version read
  from the save. Both carry tooltips spelling out the difference.
- **Loot → "Steam boxes you're holding" explained** — these are **real counts**, not placeholders: the
  game writes a count line into your own Player.log whenever it checks its Steam inventory, and the HUD
  reads exactly that (names/rarities from the game's item table). Each box is now **clickable** — its
  Codex page shows what it can contain and whether it's marketable.

### Fixed
- Entering demo mode now replaces any previously-loaded Player.log data with clearly-sample data — real
  offline rewards / box counts can no longer appear under the SAMPLE badge.

## v1.0.13 — 2026-06-11

### Added
- **Crew member pop-up** — click any member for their **complete** shared stats: every brag-stat, the
  grouped Stat List in the game's own wording, and **all rune totals** (the board previously trimmed the
  list to six entries and truncated long stat names; both limits are gone).
- **Side-by-side compare** in the pop-up — pick any other member (defaults to you) and every stat lines
  up in two columns with the larger value highlighted.
- **Advisor "At a glance"** — upgrades ready, level-locked finds, open enchant slots and affordable rune
  steps, as cards at the top of the tab.
- **Advisor stat comparison** — every suggested swap now shows both items' inherent stats side by side
  (the game's own GearInfoData values, same display rules as the tooltips), plus a note when the current
  piece carries enchants or the upgrade has a unique mod. The previously-empty row space now carries
  real information.
- **Click-through everywhere** — items across the app (inventory, trophies, hero gear, advisor rows,
  new-loot entries, enchanting stones) open their full Codex page; rune cards open their per-level
  value/cost table; Stat-List lines and rune-total chips filter the rune grid to exactly the runes that
  grant that stat.

### Changed
- Crew rows are now compact previews (top stats + "+N more") since the complete list is one click away.
- Crew payload: the full rune-total list (up to 40 effects, names up to 48 chars) replaces the old
  top-6/32-char cap — same opt-in rules, still brag-stats only, never your save.

## v1.0.12 — 2026-06-11

### Changed
- **Dark theme redesigned** — a genuinely new dark counterpart of the light design: slate-indigo
  ground lifted off black, clearly elevated cards with stronger definition, and a periwinkle accent
  ramp. (v1.0.11's dark had carried the old navy palette over almost unchanged — it was supposed to
  feel new too.)
- Rarity colors and all readability guarantees unchanged: WCAG AA re-verified programmatically in
  the new dark; canonical rarity hues kept.

## v1.0.11 — 2026-06-11

### Added
- **Light theme** — a fresh, light-first design system, now the **default**, with a 🌙/☀️ toggle in the
  header; your choice is remembered on your device.
- **The game's grouped Stat List** (Exploration / Combat) on the **Runes** tab — grouping, wording and
  values calibrated line-by-line against the in-game panel (the wording is the game's own localization
  text). Lines whose in-game group/format isn't verified are **omitted, not guessed** — their raw totals
  remain in "All rune totals" below.
- **Crew Stat List compare** — members now share their grouped Stat List (same opt-in rules: brag-stats
  only, never your save, nothing at all unless sharing is ON), and the board can **rank the crew by any
  calibrated stat**.
- **Patch notes** — this public changelog plus the in-app ✨ What's new dialog; a small dot appears on
  the button the first time you run a new version.

### Changed
- **One design system across the app**: a single spacing / radius / card-width scale — cards in a row
  stay the same size, and a short last row no longer stretches wide (the "uneven boxes" fix).
- **Dark theme re-tuned** on the same semantic tokens (a re-mapped palette, not an inversion); the
  canonical rarity colors keep their hues in both themes.
- **All text meets WCAG AA contrast** in both themes (verified programmatically).

### Fixed
- Oversized / mismatched boxes on several tabs (grids stretched a short last row wider than its siblings).
- Low-contrast dim text in dark mode.

## v1.0.10 — 2026-06-11
### Added
- Rune **Stat List** on the Runes tab (account-wide totals from your leveled runes) with its derivation
  shown, plus a top-6 crew flex line.
### Changed
- Header now says "game v…" so it can't be confused with the app's own version (in the footer).
- Crew members on older app versions get an explanatory tag instead of silently fewer stats.

## v1.0.9 — 2026-06-10
### Added
- Trends → **Online vs offline**: hours played vs away, farming gold vs offline rewards — measured from
  your own history and Player.log.
### Fixed
- Per-stage XP/kill rates no longer count intervals that span closed-game time (offline lump-sums can't
  masquerade as farming).

## v1.0.8 — 2026-06-10
### Added
- Crew play-hours chip + rank option; per-tier gear breakdown ("2 Immortal · 6 Legendary") — gear only,
  rarity-named stones can never count.
- Loot **origin inference**: one new gear piece + 9 or more material instances consumed in the same save
  update = "⚒️ Cube (likely)"; nothing consumed = "✦ found". Mixed/unclear stays untagged.

## v1.0.7 — 2026-06-10
### Added
- Per-stage **XP/hr** (measured) + best-rate suggestions.
- **Enchanting workshop**: open slots on your deployed party + the stones you own with the game's own
  per-category effects.
### Changed
- Advisor upgrades are **equip-gated**: gear above the hero's level becomes a 🔒 level-locked notice,
  never advice.

## v1.0.6 — 2026-06-10
### Fixed
- **Auto-update was silently broken in every build before this one** (the updater module was never
  packaged). From v1.0.6 the app genuinely updates itself; v1.0.5 or older needs one manual reinstall.

## v1.0.5 — 2026-06-10
### Added
- "↻ Check for updates" header button with visible feedback, 4-hourly background re-check, app version
  in the footer.

## v1.0.4 — 2026-06-10
### Added
- **Per-stage farming rates** measured from your own save history + the HUD's own snapshot history.
- **Advisor** tab: provable gear upgrades, cheapest-first rune plan, open enchant slots.
- **Crew** tab: opt-in private leaderboard (share toggle OFF by default; brag-stats only, never your save).

## v1.0.3 — 2026-06-10
### Added
- Lifetime **Gold by source** (sum-validated combat vs other split).
- Per-monster base gold/XP per kill.
### Fixed
- Owned-by-rarity panel had been invisible since an earlier refactor.

## v1.0.2 — 2026-06-09
### Added
- Tips tab, loot timeline with rare-drop alerts, refresh-reconnect, drag-and-drop connect, demo mode.
### Changed
- Removed an uncalibrated "per-difficulty completions" stat the save disproves — the HUD only shows
  numbers it can prove.

## v1.0.0 / v1.0.1 — 2026-06-09
### Added
- First public build: inventory with real names/icons/rarity, party, runes, lifetime stats, trends from
  save backups, full-catalog Codex, Windows installer + browser version.
