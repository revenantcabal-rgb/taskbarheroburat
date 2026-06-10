# TBH HUD — Changelog

All notable changes to the read-only TBH: Task Bar Hero companion. The same notes are shown in-app
(✨ **What's new** in the header) and on each [GitHub Release](https://github.com/revenantcabal-rgb/taskbarheroburat/releases).
Every release is **read-only** — the HUD never writes to the game, its saves, or its memory.

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
