# TBH HUD — GOAL (per phase).  `/goal` reads this. CONTINUE from current state; do NOT redo done work.
Read CLAUDE.md + docs/PRD.md + improvement.log + docs/PROGRESS.md FIRST, then START at the first PENDING phase below.
Golden rule: a helper, never game-breaking, never bannable; never fabricate — every label from the game's own tables/localization.
READ-ONLY always. Verify EVERY change vs the LIVE save (node scripts/verify_save.js + headless browser, all tabs, 0 console errors).
CONTINUOUS: after each sub-task -> verify -> commit -> push -> update CLAUDE.md + docs/PROGRESS.md + improvement.log. Full
regression ~45min. Work 2-3h non-stop; don't ask unless truly blocked.

## DONE (do NOT rebuild)
Phases 2 (535 icons + 39 rune icons), 3 (premium 7-tab dashboard), 5 (Player.log loot + rare alerts + pet card), 6 (History/Trends);
#2 full "who's carrying" source breakdown (Party); #3 loot/lifetime depth (pet card, rare alerts, kills-by-monster);
rune panel (names + icons + cheapest-next). Authoritative DB from the game's own CSV tables.

## COVERAGE REALITY (calibrated vs gamedata.min.json — the DB is the game's MASTER catalog, not the owner's inventory)
items 5944: name 100%, icon 100%, grade 100% of gear. materials 125 (115 with desc + effects `fx`). runes 197, skills 36, stats 62, gear 5440.
=> EVERY unseen endgame item is ALREADY in the DB. The low-level live save only verifies the ~50 OWNED.
The game ships only 115 ItemDescription strings (gear has NO flavor text — it's defined by STATS we already have): show desc
where it exists, stats/effects otherwise, honest "no description" — never a guess.
NOT yet: real end-to-end run; installer/Pages (Phase 7).

## PHASE A — FULL-CATALOG CODEX + AUDIT  ✅ DONE (session 4)
Shipped: virtualized Codex tab (6177 entries: 5944 items + 197 runes + 36 skills), filters (category/rarity/gearType/
search/sort) + owned-only toggle, owned markers, per-entry detail (desc/inherent stats/unique mod/material fx/rune
per-level/marketable). Drop chain calibrated into DB.drops (DropInfoData->ItemGroupInfoData): box contents + reverse
"drops from"; Korean ItemGroup names omitted. scripts/audit_catalog.js asserts 100% name+icon over 6177. Works with no
save (?codex). Verified vs the live save (Node audit + headless browser, all 8 tabs, 0 console errors).

### Original Phase A spec (for reference)
1. New "Codex" tab: browsable grid of the ENTIRE catalog (all 5944 items + 197 runes + 36 skills + 125 materials), each with
   real icon + name + rarity + level + type, INDEPENDENT of ownership. Mark owned vs not-owned.
2. Filters + search: type / gearType / rarity (Common..Cosmic) + name search; sort by rarity/level. Virtualize or paginate the
   5944 rows so it stays smooth with 0 console errors.
3. Detail per item: name, rarity, level, gearType, description (where the game provides), material effects (`fx`), gear inherent
   stats + unique mods, drop sources (DropInfoData -> where it drops), marketable flag.
4. Stage-box contents: DropKey -> DropInfoData -> ItemGroupInfoData -> member ItemKeys -> EN names; show "box can contain:
   [items]" — OMIT the Korean group name, never guess it.
5. Full-catalog audit: extend scripts/verify_save.js OR add scripts/audit_catalog.js — validate ALL 5944 items + runes +
   materials headless; assert 0 missing name, 0 missing icon, desc present where the game provides; print coverage %. Fix gaps.
6. (Optional) cross-check Korean stage-box names / drop rates vs https://www.tbhwiki.com — COMMUNITY data; label it; tables win on conflict.
AC: Codex renders the FULL catalog (owned + unseen) with working filters/search; audit prints 100% name+icon across 5944; 0 console errors live + demo.

## PHASE B — OFFLINE-CAP TIMER  ✅ DONE (session 4)
Shipped: "Offline rewards" card on Overview — live-ticking idle since last save + last collection (gold + rate from
Player.log) + cap countdown. FINDINGS: dumped OfflineRewardInfoData (per-StageLevel yield params: BaseGold/Exp/
KillCount/ClearCount), and confirmed NONE of the game's 45 data tables holds the offline time-cap (it's a code
constant) — so we do NOT assume 8h. Per the golden rule the cap+rate are LEARNED from the user's OWN Player.log
[OfflineReward] events (reward==delta until the cap, then plateaus; rate=gold/reward of the latest). TZ calibration:
the .es3 lastSavedTime is LOCAL .NET ticks (verified 8h ahead of the file's UTC mtime), so idle is anchored on the
file's true UTC mtime (file.lastModified in-app / fs.mtime in the harness), TZ-corrected ticks as fallback. No invented
daily reset. parseOfflineEvents+offlineStatus mirrored in saveEngine.js; verify_save.js prints offline status + tz check.
Calibration: +739g/93s (~7.95 g/s) reproduced exactly; 0 console errors.

### Original Phase B spec (for reference)
1. Dump OfflineRewardInfoData (extend scripts/dump_textassets.py); extract the REAL cap + accrual rate. DO NOT assume 8h.
2. Countdown card: from save lastSavedTime show time-idle, reward banked, time-until-cap ("offline rewards max in Xh Ym" /
   "capped - collect now"). Calibrate vs Player.log [OfflineReward] saved/now/delta/reward until they match exactly. Mirror in
   saveEngine.js + the inline engine.
3. No invented daily reset — the cap is RELATIVE to lastSavedTime. "Good time to go offline" = anytime; just return before the cap.
AC: timer matches the game's offline accrual exactly; 0 console errors.

## PHASE 7 — REAL END-TO-END RUN + PACKAGING  (the real-world blocker for friends)
1. Real run: `npm start` (Electron) vs the live save + the REAL browser Connect-folder native dialog (not the mock handle).
   Fix anything that breaks live. Confirm all tabs incl. Codex + offline timer render with real data, 0 console errors.
2. NSIS installer: `npm run dist`; fix the winCodeSign symlink error (extract only windows\* from the cache, or Developer Mode /
   elevated). Produce dist\TBH-HUD-Setup-<ver>.exe.
3. GitHub Pages: serve repo root over HTTPS (Connect folder needs HTTPS/localhost); publish so friends get a link.
4. Wire electron-updater auto-update to GitHub releases (latest.yml).
AC: real `npm start` works end-to-end; an installer .exe is produced; the Pages link loads the dashboard.

## IF A PHASE FINISHES EARLY — deepen (keep the 2-3h productive, always shippable)
More Codex depth (synthesis/crafting recipes via SynthesisRecipeInfoData/CraftingRecipeInfoData, set bonuses, per-source drop
rates); premium-styling polish; accessibility; perf; widen the audit to a descriptions/effects coverage %.

## DEFERRED (golden rule — note, never guess)
Live DPS / combat memory reading (CodeStage [ACTk] ban risk); per-act gold/hr & clear-time (memory lane); Steam Market value
(Inventory Service throttled/empty this build); 12-min blue-chest (no 720s in DropCooldown); Korean ItemGroup names; hero XP-to-next/ETA.

## DONE
A + B + 7 shipped; Codex covers the full catalog + audit reports 100%; offline timer calibrated; real `npm start` verified;
installer produced + Pages live; all committed + pushed; CLAUDE.md + PROGRESS.md + improvement.log current.
End summary: shipped, calibration evidence, coverage %, confidence 1-10, exact next step. Target 10/10.
