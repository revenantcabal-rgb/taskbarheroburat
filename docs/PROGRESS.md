# TBH HUD — Progress vs. the plan

Living status tracker. **The plan** is [PRD.md](PRD.md) (goal list + phased roadmap + acceptance criteria).
**The current goal** is [SESSION-GOAL.md](SESSION-GOAL.md). **The trace over time** is [improvement.log](../improvement.log).
Keep this file honest and current — update it at the end of every working session.

Legend: ✅ done · 🟡 partial · 🔵 next (planned in SESSION-GOAL) · ⛔ deferred/blocked (reason given)

_Last updated: 2026-06-10, after session 4 — shipped Phase A (Codex) + Phase B (offline card) + Phase 7 (installer, Pages, auto-update)._

## Goal list (PRD §3) — where each goal stands
| # | Goal | Status | Notes / where it landed |
|---|------|--------|--------------------------|
| 1 | Inventory: names, rarity, icons, level, enchants (correct counts) | ✅ | + inherent stats & unique mods. **+ full-catalog Codex (6177 entries, owned-marked, drop sources/box contents).** 100% names/icons. |
| 2 | Gold: balance, lifetime, gold/hr (live+session) **+ per-act ranked** | 🟡 | Balance/lifetime/session ✅. **Per-act ranked ⛔** (needs memory lane). |
| 3 | XP: xp/hr (live+per act); per-hero XP **+ ETA to next level** | ⛔ | No xp/hr (memory). ETA not feasible — **no hero level/XP curve in the game tables**. |
| 4 | Clear time (per run, per stage/act) | ⛔ | Needs live combat (memory lane). Deferred for ban-safety. |
| 5 | Live combat: DPS, dmg, mobs, gold/s, xp/s, overlay | ⛔ | Memory lane → ban risk. **Deliberately not built.** |
| 6 | Per-hero perf + "who's carrying" + **WHY (source breakdown)** | ✅ | Full source breakdown shipped: per deployed hero, factual stats by Base/Gear/Tree + account-wide runes/pet. Live DPS share ⛔ (memory). |
| 7 | Loot timeline: timestamped, rarity+source, **rare alerts** | 🟡 | Timeline + offline rewards + **rare-drop alerts** (Legendary+ ★ + opt-in notify) ✅. Per-source attribution ⛔ (live drops not logged by the game). |
| 8 | Steam Market value for tradeables | ⛔ | Steam Inventory Service throttled/empty in this build (`CreateSteamItem … items is empty`). |
| 9 | Lifetime stats: kills, gold, per-difficulty **+ other aggregates** | ✅ | Kills/gold/per-difficulty ✅ + **calibrated kills-by-monster** (Type-0 subs sum == total kills). A few other aggregate Types remain unconfirmed → omitted, not guessed. |
| 10 | History / trends over time | ✅ | Trends tab from rolling save backups (session 2). |
| 11 | Runes: 197-node tree, names, leveled, cheapest-next | ✅ | Rune tab. |
| 12 | Blue-chest / cooldown tracker | ⛔ | 12-min cadence uncalibrated (no 720s in DropCooldown). Box **counts** surfaced instead. |
| 13 | Animated hero portraits | ✅ | 6 GIFs. |
| 14 | Private friends leaderboard (optional) | ⛔ | Phase 8, optional. Not started. |
| 15 | Premium UI that beats both competitors | ✅ | 8 tabs (+ Codex), polished navy theme. |
| 16 | One-click installer + hosted browser version | ✅ | **NSIS `TBH-HUD-Setup-1.0.0.exe` built** + **GitHub Pages live** (HTTPS): https://revenantcabal-rgb.github.io/taskbarheroburat/dashboard.html |
| 17 | Auto-update (electron-updater) | ✅ | Wired (publish=github) + **Release v1.0.0 published** with installer + latest.yml → auto-update live. |
| 18 | Patch resilience (graceful fallback, fast fixes) | 🟡 | Save-only is the mode; rebuild pipeline handles data patches; decrypt errors handled. |
| 19 | Read-only (never write game/save/memory) | ✅ | Re-audited session 2 — zero writes/injection. |
| 20 | No fabricated data | ✅ | Every label calibrated; honest fallbacks; deferrals over guesses. |
| 21 | GitHub home `revenantcabal-rgb/taskbarheroburat` | ✅ | Local = remote each push. |

## Phased roadmap (PRD §6)
| Phase | Status | Notes |
|-------|--------|-------|
| 1 — Data foundation | ✅ | decrypt+parse+analytics; calibrated DB; corrected counts; gold/hr. |
| 2 — Full game art | ✅ | 535 item + 39 rune icons. |
| 3 — Premium UI | ✅ | multi-tab dashboard. |
| 4 — Live telemetry | ⛔ | Memory lane → ban risk. Deferred indefinitely unless a provably-safe read exists. |
| 5 — Loot timeline + alerts + market + blue-chest | 🟡 | Timeline + boxes + offline rewards + rare-drop alerts ✅; market ⛔; blue-chest ⛔. |
| 6 — History / trends | ✅ | Trends tab (session 2). |
| 7 — Packaging + distribution | ✅ | NSIS installer built; GitHub Pages live (HTTPS); electron-updater wired + Release v1.0.0 published. winCodeSign symlink fixed via signAndEditExecutable/verifyUpdateCodeSignature=false. |
| 8 — Friends leaderboard | ⛔ | Optional. Not started. |

## Deferred / will-not-build (golden-rule decisions)
- **Live combat / DPS / per-act gold/hr / clear time** — require reading game memory → CodeStage (`[ACTk]`) ban risk. Not built; save+log lanes cover what's safe.
- **Steam Market value** — Steam Inventory Service is throttled/empty in this build.
- **12-min blue-chest timer** — cadence not in the tables (DropCooldown has no 720s). Box counts shown instead.
- **Stage-box drop contents** — ✅ now SHIPPED in the Codex: DropKey→DropInfoData→ItemGroupInfoData→member EN names ("Box can contain […]") + reverse "Drops from […]". The Korean ItemGroup `GroupName` is deliberately omitted (never guessed); per-source drop *rates* still not shown (weighted/conditional, optional).
- **Hero XP-to-next-level / ETA** — *re-open candidate:* `LevelInfoData(Level, ExpForLevelUp)` WAS found in the tables (session 4). XP-to-next may now be feasible if it applies to heroes; ETA still needs xp/hr (memory lane). Verify before building.

## Phased roadmap addendum (owner's GOAL.md)
| Phase | Status | Notes |
|-------|--------|-------|
| A — full-catalog Codex + audit | ✅ | New virtualized Codex tab (6177 entries), filters/search/sort, owned-marked, per-entry detail incl. drop sources/box contents; `audit_catalog.js` asserts 100% name+icon. |
| B — offline-rewards card | ✅ | Overview card: live idle since last save + last collection (gold+rate from Player.log) + cap countdown. Cap **learned from the user's own logs** (no game table holds it → no assumed 8h). TZ bug caught: ticks are LOCAL, idle anchored on file UTC mtime. |
| 7 — real run + packaging | ✅ | `npm start` runs clean; installer `TBH-HUD-Setup-1.0.0.exe`; Pages live (HTTPS); electron-updater wired + Release v1.0.0 published. |

## Current health
- **No console errors** vs the live save AND demo AND standalone (?codex) across all **8 tabs**; `npm start` (Electron) runs clean (main + 4 procs, 0 stderr).
- Read-only confirmed; all data calibrated (Codex owned-markers reconcile exactly: 37 items + 56 runes + 9 named skills; drop chain 5554/5554; audit 100% name+icon over 6177; offline +739g/93s reproduced; TZ offset caught + fixed via file mtime; Node+browser parity); local = remote.
- **Distribution live:** installer `dist/TBH-HUD-Setup-1.0.0.exe` (valid PE); Pages serves dashboard+DB+sprites HTTP 200 w/ correct MIME; Release v1.0.0 published (auto-update feed).
- **Confidence: 9/10.** Deduction: the installer + electron-updater were built/validated/published but not run through a full clean-machine install→update cycle here; the native Connect-folder dialog was exercised by code + a real-save fixture, not a hand-driven native session; installer is unsigned (SmartScreen prompt — no cert on the box).

## Next step
**A + B + 7 are SHIPPED — the app is distributable now** (installer + HTTPS Pages link + auto-update). Optional follow-ups:
- Owner: share the Pages link / installer with friends; optionally sign the installer with a real cert to drop the SmartScreen prompt.
- Bonus candidate: hero XP-to-next via the newly-found `LevelInfoData` curve (verify it applies to heroes first).
See [improvement.log](../improvement.log) · [GOAL.md](GOAL.md).
