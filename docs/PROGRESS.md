# TBH HUD — Progress vs. the plan

Living status tracker. **The plan** is [PRD.md](PRD.md) (goal list + phased roadmap + acceptance criteria).
**The current goal** is [SESSION-GOAL.md](SESSION-GOAL.md). **The trace over time** is [improvement.log](../improvement.log).
Keep this file honest and current — update it at the end of every working session.

Legend: ✅ done · 🟡 partial · 🔵 next (planned in SESSION-GOAL) · ⛔ deferred/blocked (reason given)

_Last updated: 2026-06-10, after session 4 — shipped Phase A (full-catalog Codex tab + drop chain + audit)._

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
| 16 | One-click installer + hosted browser version | 🟡 | Electron app + standalone browser build work. **NSIS installer & GitHub Pages ⛔ (Phase 7).** |
| 17 | Auto-update (electron-updater) | ⛔ | Phase 7. Not started. |
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
| 7 — Packaging + distribution | ⛔ | **Not started.** NSIS installer (winCodeSign fix) + Pages + auto-update. |
| 8 — Friends leaderboard | ⛔ | Optional. Not started. |

## Deferred / will-not-build (golden-rule decisions)
- **Live combat / DPS / per-act gold/hr / clear time** — require reading game memory → CodeStage (`[ACTk]`) ban risk. Not built; save+log lanes cover what's safe.
- **Steam Market value** — Steam Inventory Service is throttled/empty in this build.
- **12-min blue-chest timer** — cadence not in the tables (DropCooldown has no 720s). Box counts shown instead.
- **Stage-box drop contents** — ✅ now SHIPPED in the Codex: DropKey→DropInfoData→ItemGroupInfoData→member EN names ("Box can contain […]") + reverse "Drops from […]". The Korean ItemGroup `GroupName` is deliberately omitted (never guessed); per-source drop *rates* still not shown (weighted/conditional, optional).
- **Hero XP-to-next-level / ETA** — no level/XP curve exists in the extracted game tables.

## Phased roadmap addendum (owner's GOAL.md)
| Phase | Status | Notes |
|-------|--------|-------|
| A — full-catalog Codex + audit | ✅ | New virtualized Codex tab (6177 entries), filters/search/sort, owned-marked, per-entry detail incl. drop sources/box contents; `audit_catalog.js` asserts 100% name+icon. |
| B — offline-cap timer | 🔵 | Next. Dump `OfflineRewardInfoData`, countdown from `lastSavedTime`, calibrate vs Player.log `[OfflineReward]`. |
| 7 — real run + packaging | 🔵 | After B. Real `npm start` + native Connect-folder; NSIS installer; GitHub Pages; electron-updater. |

## Current health
- **No console errors** vs the live save AND demo AND standalone (?codex) across all **8 tabs** (re-verified this session via headless browser fetching the live-save fixture through the real code path).
- Read-only confirmed; all new data calibrated (Codex owned-markers reconcile exactly: 37 items + 56 runes + 9 named skills; drop chain resolves 5554/5554; audit 100% name+icon over 6177; Node+browser parity); local = remote.
- **Confidence: 9/10.** Deduction: the Electron app and the browser `Connect folder` *native dialog* were verified by code + a fetch of the live-save fixture, not a real native end-to-end run; offline timer (B) not built; no installer/Pages yet; screenshot tool times out on the animated UI (tooling, not app).

## Next step
**Phase A (Codex) is shipped.** Remaining on the owner's roadmap ([GOAL.md](GOAL.md)):
- **Phase B — offline-cap timer**: dump `OfflineRewardInfoData`, show time-until-cap from save `lastSavedTime` (calibrate the
  real cap vs the Player.log `[OfflineReward]` deltas — do NOT assume 8h). Mirror in saveEngine.js + the inline engine.
- **Real-run verification + Phase 7 packaging**: launch Electron (`npm start`) + the real `Connect folder` flow, fix anything
  live, then NSIS installer (winCodeSign fix) + GitHub Pages so friends can use it.
See [SESSION-GOAL.md](SESSION-GOAL.md) · [improvement.log](../improvement.log) · [GOAL.md](GOAL.md).
