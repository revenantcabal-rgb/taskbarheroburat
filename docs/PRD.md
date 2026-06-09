# TBH HUD - Product Requirements

## 1. Summary
A read-only desktop + web companion for the Steam idle-RPG **TBH: Task Bar Hero**. It reads the player's local
save (and live memory) and presents a premium dashboard. Ships as a one-click Windows installer AND a hosted
browser version, for the owner and friends. **Read-only; never modifies the game.**

## 2. Why (the bar to beat)
- **tbh-meter** (closed source): live combat meter + runs history + blue-chest timer + Discord leaderboard.
  No inventory/build view, no full item data, only 3 bundled icons.
- **tbh-copilot** (MIT): save optimizer (farm/runes/gear). No live combat; item data wrong/incomplete
  (mislabels materials, only 78 icons, no real material names).
Neither fuses live + persistent data, neither has the full authoritative item set with icons, neither does
gold/hr per act calibrated to real clear rates. TBH HUD beats both.

## 3. FULL GOAL LIST (everything we are after — nothing here is optional unless marked)
Player-facing:
1. **Inventory** — every owned item with real name, rarity (color-framed), real icon, level, enchants/mods.
   Counts must be correct (stash/inventory are SLOT arrays — count filled slots only, not array length).
2. **Gold** — current balance, lifetime earned, gold/hr (live + session), and **gold/hr per act/stage, ranked**.
3. **XP** — xp/hr (live + per act); per-hero XP and ETA to next level.
4. **Clear time** — per run, per stage/act.
5. **Live combat** — DPS, total damage, mobs killed/total, elapsed, gold/s, xp/s; an always-on-top overlay strip.
6. **Per-hero performance** — level, gear, deployed status, DPS share, and **"who's carrying" + WHY**
   (break each hero's contribution down by source: base / gear / runes / enchants / pet).
7. **Loot timeline** — every drop, timestamped, with rarity + source (stage/act/mode); **rare-drop alerts**.
8. **Steam Market value** — for tradeable drops (trade-stash items via the Steam Inventory Service); show live
   market value per item and total.
9. **Lifetime stats** — total kills, total gold earned, per-difficulty completions (Normal/Nightmare/Hell/Torment),
   plus the other aggregate counters (decode the remaining aggregate Types — see CLAUDE.md).
10. **History / trends** — sessions over time: DPS progression as you level/gear, gold/hr trend, drop-luck
    tracking, "this gear swap raised DPS X%".
11. **Runes** — the 197-node rune tree with real rune names, leveled status, cheapest-next recommendations.
12. **Blue-chest / cooldown tracker** — auto-detect the 12-min blue-chest cooldown per stage and ping when ready;
    extend to all farmable cooldowns.
13. **Animated hero portraits** (GIFs).
14. **Private friends leaderboard** (optional) — the crew only.

Product / distribution:
15. **Premium UI** that visibly beats tbh-meter AND tbh-copilot.
16. **One-click Windows installer** (NSIS) for friends + a **hosted browser version** (GitHub Pages link).
17. **Auto-update** (electron-updater from GitHub releases).
18. **Patch resilience** — graceful fallback to save-only mode if the memory reader breaks after a game update;
    signature-based reader (not hardcoded offsets); ship fixes fast via auto-update.

Hard constraints:
19. **Read-only** — never write to the game / save / memory.
20. **No fabricated data** — calibrate every label against the game's own files or tbh-meter run-log known values.
21. **GitHub home:** `revenantcabal-rgb/taskbarheroburat` (Rob's PERSONAL account — NOT the Fusion-Data-Company
    work account, whose token is the only one currently stored on the machine).

## 4. Competitive feature matrix
| Capability | tbh-meter | tbh-copilot | TBH HUD (target) |
|---|---|---|---|
| Live per-run DPS / clear time | yes | - | yes |
| Inventory + gear + 197 runes | - | yes | yes (authoritative names/icons/rarity) |
| Gear enchants / mods shown | per-run | - | yes |
| Gold/hr & XP/hr per act (calibrated) | gold/s only | theoretical | yes |
| Loot timeline + timestamps + rare alerts | - | - | yes |
| Steam Market value per drop | - | gear price est. | yes (per item + total) |
| Real item icons (full set) | 3 | 78 | yes (extracted from game) |
| Animated hero portraits | tiny icons | - | yes (GIFs) |
| Blue-chest / cooldown tracker | yes | - | yes |
| Per-hero "who's carrying" + why | aggregate | computed | yes (live + computed + source breakdown) |
| History / trends over time | flat run list | - | yes (charts) |
| Private friends leaderboard | Discord | - | yes (optional) |
| Survives game patches | ships daily | save-only | graceful fallback + auto-update |

## 5. Data sources
See CLAUDE.md "VERIFIED technical facts" for the save format, decryption, field map, the itemKey rarity rule
(3rd digit, validated 7/7 vs run logs), localization tables, the Steam Inventory Service note, and the
memory/log lanes. All labels MUST be calibrated against the game's own files or tbh-meter run-log known
values — never guessed.

## 6. Phased roadmap + acceptance criteria
- **Phase 1 - Data foundation (done).** Decrypt+parse save; calibrated item DB (names from game localization,
  rarity from itemKey 3rd digit); corrected slot-vs-item counts; gold/hr via save-diff.
  AC: dashboard shows real gold/heroes/inventory/rarity from a live save, matching in-game values.
- **Phase 2 - Full game art.** Extract every item icon + monster sprite from `sharedassets0.assets` via UnityPy.
  AC: every owned item renders its real icon.
- **Phase 3 - Premium UI.** Beat tbh-meter: animated hero GIFs, rarity-framed icon grid, polished navy theme,
  overview/party/inventory/loot/lifetime + gear enchant display. AC: side-by-side clearly more polished AND more
  complete than tbh-meter.
- **Phase 4 - Live telemetry.** Per-run DPS/clear-time/gold-s/xp-s + gold/hr & xp/hr per act + per-hero DPS share
  with source breakdown. Build our own read-only memory reader (owner wants tbh-meter gone). AC: live overlay
  matches the game during combat.
- **Phase 5 - Loot timeline + rare alerts + Steam Market value + blue-chest tracker** (save-diff + Player.log tail
  + Steam Inventory Service for tradeables). AC: new drops appear with timestamp + rarity + market value; blue-chest
  12-min cooldown auto-tracked.
- **Phase 6 - History / trends.** Persist sessions; chart DPS/gold-hr/drop-luck over time. AC: weeks of trend visible.
- **Phase 7 - Packaging + distribution.** NSIS installer (fix winCodeSign), electron-updater auto-update from
  GitHub, GitHub Pages browser build. AC: a friend runs the Setup.exe and it works with zero config.
- **Phase 8 - Optional.** Private friends leaderboard.

## 7. Non-negotiables
Read-only. No fabricated data. Honest labels. Premium polish that visibly beats the competition.
