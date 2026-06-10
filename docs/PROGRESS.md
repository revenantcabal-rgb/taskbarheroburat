# TBH HUD — Progress vs. the plan

Living status tracker. **The plan** is [PRD.md](PRD.md) (goal list + phased roadmap + acceptance criteria).
**The trace over time** is [improvement.log](../improvement.log); **what's next** is CLAUDE.md §Next. (GOAL.md / SESSION-GOAL.md are historical.)
Keep this file honest and current — update it at the end of every working session.

Legend: ✅ done · 🟡 partial · ⛔ deferred/blocked (reason given)

_Last updated: 2026-06-11, after session 12 (v1.0.3) — gold-by-source (calibrated, combat vs other), per-monster base rewards + honest "best farming stage" answer, per-hero level ETA, connection fixes (refresh-reconnect, blocked-folder drag-drop), Tips tab, Flex card, blank-paint fix, Electron verified. NOTE: the 1.0.2 line (sessions 7-11) was built but never published; next release = v1.0.3. (Session 7 began the data-honesty work: removed the fabricated per-difficulty completions, stage decode, plain Overview, connect/disconnect.)_

## Goal list (PRD §3) — where each goal stands
| # | Goal | Status | Notes / where it landed |
|---|------|--------|--------------------------|
| 1 | Inventory: names, rarity, icons, level, enchants (correct counts) | ✅ | + inherent stats & unique mods. **+ full-catalog Codex (6177 entries, owned-marked, drop sources/box contents).** 100% names/icons. |
| 2 | Gold: balance, lifetime, gold/hr (live+session) **+ per-act ranked** | 🟡 | Balance/lifetime/session ✅ + **gold by source ✅** (session 12 — Type 2 sub-keys sum-validated: From combat ~99.5% vs Other; "Cube gold" is in the small "other" bucket, not separately calibrated → not isolated). **Per-act ranked ⛔** (needs the memory lane). |
| 3 | XP: xp/hr (live+per act); per-hero XP **+ ETA to next level** | 🟡 | **Per-hero XP-to-next-level ✅** (session 5) + **per-hero time-to-next-level ETA ✅** (session 11) — XP remaining ÷ XP/hr **measured from the session** (cumulative XP delta since connect), shown on cards + roster; honest "measuring…"/"not gaining XP" states. Per-*act* xp/hr (which stage the XP came from) still ⛔ (needs the memory lane). |
| 4 | Clear time (per run, per stage/act) | ⛔ | Needs live combat (memory lane). Deferred for ban-safety. |
| 5 | Live combat: DPS, dmg, mobs, gold/s, xp/s, overlay | ⛔ | Memory lane → ban risk. **Deliberately not built.** |
| 6 | Per-hero perf + "who's carrying" + **WHY (source breakdown)** | ✅ | Full source breakdown shipped: per deployed hero, factual stats by Base/Gear/Tree + account-wide runes/pet. Live DPS share ⛔ (memory). |
| 7 | Loot timeline: timestamped, rarity+source, **rare alerts** | 🟡 | Timeline + offline rewards + **rare-drop alerts** (Legendary+ ★ + opt-in notify) ✅. Per-source attribution ⛔ (live drops not logged by the game). |
| 8 | Steam Market value for tradeables | ⛔ | Steam Inventory Service throttled/empty in this build (`CreateSteamItem … items is empty`). |
| 9 | Lifetime stats: kills, gold **+ other aggregates** | ✅ | Total kills + lifetime gold (both calibrated) + **calibrated kills-by-monster** (Type-0 subs sum == total kills). **Per-difficulty completions REMOVED in session 7** — Type 16 is uncalibrated and was disproven by the live save (Normal-only at Act 2-10 yet claimed Nightmare/Hell/Torment); omitted per the golden rule. All other unconfirmed aggregate Types omitted, not guessed. |
| 10 | History / trends over time | ✅ | Trends tab from rolling save backups (session 2). |
| 11 | Runes: 197-node tree, names, leveled, cheapest-next | ✅ | Rune tab. |
| 12 | Blue-chest / cooldown tracker | ⛔ | 12-min cadence uncalibrated (no 720s in DropCooldown). Box **counts** surfaced instead. |
| 13 | Animated hero portraits | ✅ | 6 GIFs. |
| 14 | Private friends leaderboard (optional) | ⛔ | Phase 8, optional. Not started. |
| 15 | Premium UI that beats both competitors | ✅ | 9 tabs (incl. Codex + Tips), polished navy theme, **fully responsive** (phone/tablet/desktop). |
| 16 | One-click installer + hosted browser version | ✅ | **NSIS `TBH-HUD-Setup-1.0.1.exe`** + **GitHub Pages live** (HTTPS): https://revenantcabal-rgb.github.io/taskbarheroburat/ · **Vercel-ready** (vercel.json + index.html; owner 1-click import). |
| 17 | Auto-update (electron-updater) | ✅ | Wired (publish=github) + **Releases v1.0.0 & v1.0.1 published** (installer + latest.yml) → auto-update chain live. |
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
- **Hero XP-to-next-level + time-to-next-level** — ✅ BUILT: `LevelInfoData` curve calibrated (session 5) + a **time-ETA** (session 11) from the XP/hr **measured this session** (not the memory lane). Only per-*act* xp/hr (which stage XP came from) stays deferred.

## Phased roadmap addendum (owner's GOAL.md)
| Phase | Status | Notes |
|-------|--------|-------|
| A — full-catalog Codex + audit | ✅ | New virtualized Codex tab (6177 entries), filters/search/sort, owned-marked, per-entry detail incl. drop sources/box contents; `audit_catalog.js` asserts 100% name+icon. |
| B — offline-rewards card | ✅ | Overview card: live idle since last save + last collection (gold+rate from Player.log) + cap countdown. Cap **learned from the user's own logs** (no game table holds it → no assumed 8h). TZ bug caught: ticks are LOCAL, idle anchored on file UTC mtime. |
| 7 — real run + packaging | ✅ | `npm start` runs clean; installer `TBH-HUD-Setup-1.0.1.exe`; Pages live (HTTPS); electron-updater wired + Releases v1.0.0/v1.0.1 published. |
| 5b — responsiveness + XP-to-next + Vercel-ready (session 5) | ✅ | Mobile/tablet/desktop responsive (0 overflow); real hero XP-to-next (killed the `level/20` placeholder); cache-bust `?v=`; vercel.json + index.html; v1.0.1 shipped. |
| P1-P5 — data honesty + UX (session 7, v1.0.2) | ✅ | **P1** removed the fabricated per-difficulty completions (Type 16, disproven by the Normal-only save) → engines/renderer/demo/README; verify_save.js now asserts data honesty. **P2** stages decode to "Act X-Y" + real StageName (DB.stages baked) everywhere; no raw-key leak. **P3** plain-language "Who's carrying" (no Σ; labeled bar + tooltips + hint). **P4** baby-simple 3-step connect screen w/ copy-path + a Disconnect/Change-folder control. **P5** friendly no-save placeholder + gate polish. Verified Node + headless, 0 errors. |
| UX + the 3 owner questions (session 8, v1.0.2) | ✅ | **Multi-user:** confirmed it's a static client-side reader (no account/server; anyone uses their own save independently, nothing uploaded) + added a "No account, no sign-in" reassurance line; Disconnect now resets loot tracking so switching saves is a clean slate. **Auto-update:** made it VISIBLE — electron-updater events → an in-app "Update ready · Restart" banner (autoInstallOnAppQuit too); web is always current on load. **Uninstall:** confirmed the NSIS uninstaller + Add/Remove Programs entry (builder-debug: WriteUninstaller/uninstaller.nsh) + polished display name & shortcuts; installer rebuilt. README FAQ added. |
| Gold-by-source + farming insights (session 12, v1.0.3) | ✅ | **Gold by source** on Lifetime (Type 2 subs, sum-validated: From combat 99.5% / Other 0.5%; "Cube gold" honestly left in the tiny "other" bucket, not fabricated). **Per-monster base rewards** (RewardGold/RewardExp → DB.monsters {n,g,x}; "Ng/Nxp each (base)"). Honest **"best farming stage"** answer: not derivable (no StageInfoData; per-stage rate = memory lane) → use per-monster rewards + Trends. **Bug fix:** `el()` dropped-sibling bug had hidden the Owned-by-rarity bar/legend since session 7 → `frag()`. **Electron smoke-tested** (npm start clean). Version → 1.0.3. |
| Per-hero level ETA (session 11, v1.0.2) | ✅ | **Time to next level** per hero (cards + roster column): XP remaining ÷ XP/hr MEASURED from the session (cumulative-XP delta since connect; survives mid-session level-ups). Honest states (measuring… / not gaining XP / ≈ time); Party-tab note that it's the player's real pace. No fabricated rate. |
| Styling + solidify UX (session 11, v1.0.2) | ✅ | **Fixed blank-first-paint bug** (active tab stayed hidden on first connect/demo → render() now un-hides it; affects browser + Electron). Added keyboard **:focus-visible** rings (accessibility). Fixed Overview suggestion-strip layout (was mashed inline); snappier tab fade. Full visual audit across all 9 tabs + connect screen (desktop + mobile) — cohesive; 0 horizontal overflow @375. |
| Connection fixes + flex + honest DPS (session 10, v1.0.2) | ✅ | **Refresh-boot FIXED:** handle persisted in IndexedDB + re-attached on reload (auto-resume or 1-click Reconnect); Disconnect clears it. **Blocked-folder FIXED:** "Trouble connecting?" help + universal drag-and-drop of the .es3 (bypasses Chrome's AppData blocklist). **Flex:** Overview "Flex card" (calibrated brag stats + copy-to-share); reframed "Who's carrying" to answer "who hits hardest" honestly (no live DPS — needs the memory lane = ban risk). **Demo:** "See a demo" + amber "SAMPLE — not your data". **Market items:** not calibratable (no origin flag; trade stash empty; Steam inventory throttled) → honest note, no guessing. |
| Tips + Loot honesty + session (session 9, v1.0.2) | ✅ | **NEW Tips tab (9th)** + Overview suggestion strip: calibrated "Suggestions for you" (unspent ability points, empty gear slots, cheapest AFFORDABLE rune upgrade vs gold — all 663 rune costs verified as Gold — stash full, bench heroes behind, stagnation from trends) that refresh each read; 10 "Game tips" incl. the owner's; honest note that live clear-time/per-map optimizations need the memory lane (not built). **Loot:** craft-vs-drop is NOT calibratable (both mint new UniqueIds; no origin flag; CraftingRecipe/SynthesisRecipe both output Gear) → renamed to "New items" with an honest note + real Cube level; added dual **local + UTC** timestamp columns (timeline + offline rewards). **Session:** verified full re-parse each read = no stale data, new heroes appear correctly; fixed gold/hr to use lifetime gold (spend-proof). |

## Current health
- **DATA HONESTY (P1):** nothing on any tab claims progress the save doesn't support. The fabricated per-difficulty completions are gone; `verify_save.js` PASSES new assertions vs the LIVE save (no `perDifficultyCompletions`; only the whitelisted calibrated aggregates surface; kills-by-monster sum == totalKills; the Type-16 disproof is printed).
- **No console errors** vs demo + standalone (?codex) + synthetic trends across all **9 tabs**; live-save engine path verified by `verify_save.js`.
- **Stages (P2):** decode to "Act X-Y" + real StageName everywhere (Overview/Lifetime/Trends); verified 1101→Act 1-1 Pasture, 1208→Act 2-8 Sacred Tomb, 1210→Act 2-10 Pharaoh's Underchannel; no raw stage-key leak.
- **Fully responsive:** 0 horizontal overflow at 375 / 768 / 1280; the new connect screen + no-save placeholder wrap cleanly on mobile (375).
- Read-only confirmed; data calibrated (audit 100% over 6177; DB rebuilt with `stages`; Node+browser parity); local = remote.
- **Multi-user / privacy:** static client-side reader — every visitor connects their OWN local save in their OWN browser (File System Access API); no account, no server, nothing uploaded → unlimited independent users, zero shared state. Disconnect resets loot tracking so switching saves is a clean slate.
- **Auto-update:** desktop app checks GitHub releases on launch, auto-downloads a newer version, and shows an in-app "Update ready — Restart" banner (applies on next quit regardless). Publishing a release pushes it to everyone. Web is always current on load.
- **Uninstall:** the NSIS installer registers in Windows Add/Remove Programs as "TBH HUD" (confirmed via builder-debug: WriteUninstaller + uninstaller.nsh); per-user, never touches the game.
- **Distribution:** WEB is current on push — Pages serves the new build + DB at `?v=1.0.3`. The **v1.0.3 desktop installer is rebuilt + ready in `dist/`** (gold-by-source, per-hero ETA, Tips, Flex, connection fixes, blank-paint fix) **but NOT yet published as a release** (owner's choice; existing Electron installs stay on v1.0.1 until a release is published). **Electron app smoke-tested this session** (`npm start` clean: 4 procs, 0 stderr). Vercel-ready (not yet deployed). The 1.0.2 line was built but never published; next release = v1.0.3.
- **Confidence: 9/10.** Deduction: the v1.0.3 desktop release isn't published yet (web is current on push); the native folder picker / refresh-reconnect / drag-drop are logic-+-demo-verified, not driven on real hardware here (need owner/friend to confirm); installer unsigned (SmartScreen).

## Next step
**Everything shipped to the web (Pages) on push.** Follow-ups (highest value first):
- **Publish the v1.0.3 desktop release** so existing installs auto-update: `gh release create v1.0.3 dist/TBH-HUD-Setup-1.0.3.exe dist/latest.yml dist/TBH-HUD-Setup-1.0.3.exe.blockmap`.
- **Vercel (owner, 1 click):** import `revenantcabal-rgb/taskbarheroburat` at vercel.com — repo is Vercel-ready. (Pages is already live.)
- **Sign the installer** (cert) to drop the SmartScreen prompt. **Deepen the Codex:** synthesis/crafting recipes, set bonuses, per-source drop rates.
See [improvement.log](../improvement.log) · CLAUDE.md.
