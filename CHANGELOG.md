# TBH HUD — Changelog

All notable changes to the read-only TBH: Task Bar Hero companion. The same notes are shown in-app
(✨ **What's new** in the header) and on each [GitHub Release](https://github.com/revenantcabal-rgb/taskbarheroburat/releases).
Every release is **read-only** — the HUD never writes to the game, its saves, or its memory.

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
