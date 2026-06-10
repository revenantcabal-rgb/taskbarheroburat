# TBH HUD — project context (read this first)

Read-only companion app for the Steam game **TBH: Task Bar Hero** (appid 3678970, game v1.00.11).
Goal: a genuinely **better** companion than the existing tools (tbh-meter, tbh-copilot). The complete,
authoritative goal list and acceptance criteria live in **`docs/PRD.md`** — read it. In short: full inventory
with real names/icons/rarity/enchants, gold/hr & xp/hr per act, per-hero performance + "who's carrying" with
source breakdown, a live loot timeline with timestamps + rare-drop alerts + Steam Market value, live combat
stats, lifetime stats, history/trends, runes, and a blue-chest tracker. Ships as a one-click Windows installer
+ a hosted browser version, for the owner and friends.

**It never writes to or modifies the game. READ-ONLY only.** (The game uses CodeStage anti-cheat —
reading is safe, writing/injecting is not.)

Owner: Rob. GitHub: **`revenantcabal-rgb`** (his PERSONAL account), repo **`revenantcabal-rgb/taskbarheroburat`**.
NOTE (updated session 4): `gh` is now authed as **`revenantcabal-rgb` (active account, full `repo`+`workflow` scopes)** —
git push, `gh release`, and `gh api` (Pages) all work as revenantcabal. A second `Fusion-Data-Company` account is also in
the keyring but is NOT active — don't switch to it. Live distribution: Release **v1.0.0** + **GitHub Pages**
(https://revenantcabal-rgb.github.io/taskbarheroburat/dashboard.html).

## Project tracking (read these; keep them current)
- **The plan:** `docs/PRD.md` — goal list (§3), phased roadmap + acceptance criteria (§6).
- **Status vs the plan:** `docs/PROGRESS.md` — every goal/phase mapped to ✅/🟡/🔵/⛔ with reasons. The single
  source of truth for "where are we." **Update it at the end of every session.**
- **Trace over time:** `improvement.log` (repo root) — narrative status + what shipped each session. **Add an entry every session.**
- **Current goal:** `docs/SESSION-GOAL.md` — the paste-ready autonomous brief for the next run.
- End-of-session ritual: update `improvement.log` + `docs/PROGRESS.md` + refresh the DONE/Next sections below.

## Golden rules (do not break)
1. READ-ONLY. Never write to the game, its save, or its memory.
2. NO FABRICATED DATA. Every label (name, rarity, grade) must be calibrated against a known value —
   the game's own files or tbh-meter's run-log known values. Never invent or trust community guesses.
3. Verify changes against the REAL save, not assumptions.

## Tech stack
- Desktop: **Electron** (`src/main.js` main, `src/preload.js` preload, `dashboard.html` renderer).
  Renderer is vanilla HTML/JS today; may migrate to React+Vite+Tailwind to hit the polish bar.
- Engine: `src/engine/saveEngine.js` (Node, **zero dependencies**) — decrypt + parse + analytics.
- Packaging: electron-builder -> NSIS installer; electron-updater for GitHub auto-update.
- Browser build: `dashboard.html` runs standalone in Chrome/Edge (Web Crypto decrypt) — host on GitHub Pages for friends.

## VERIFIED technical facts

### Save file
- Path: `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`
- Easy Save 3, AES-128-CBC. Key = PBKDF2-HMAC-SHA1(password, salt = first 16 bytes (the IV), 100 iterations, 16-byte key).
  Password: `emuMqG3bLYJ938ZDCfieWJ`
- Double-encoded: `JSON.parse(decrypted).PlayerSaveData.value` is itself a STRING -> parse again.
  Quote any 16+ digit integer before the inner parse (item UniqueIds lose precision otherwise).
- Fields: `commonSaveData` {version, playTime(sec), maxCompletedStage, currentStageKey, currentStageWave,
  arrangedHeroKey (active party of 3), lastSavedTime (.NET ticks = n/10000 - 62135596800000 ms; NOTE: these are
  LOCAL wall-clock ticks, verified ~8h ahead of the file's UTC mtime = the user's TZ — for absolute "idle since
  save" anchor on the file's real UTC mtime (file.lastModified / fs.mtime), not the raw ticks)};
  `currenySaveDatas`[Key==100001].Quantity = gold; `heroSaveDatas`[] {heroKey, HeroLevel, HeroExp,
  AllocatedHeroAbilityPoint, AbilityPoint(unspent), equippedItemIds[10], equippedSKillKey[3], unlockedAttributeGroupKeys};
  `itemSaveDatas`[] = owned item instances (ItemKey + UniqueId + EnchantCount[3] + EnchantData[6]{StatModKey,Tier,
  Value,RecipeType,ModType,MaterialKey,StatType}); `stashSaveDatas`/`inventorySaveDatas`/`tradingStashSaveDatas`
  are **SLOT arrays — count only entries where ItemUniqueId != 0, NOT array length**; `attributeSaveDatas`[] (per-hero
  attribute tree levels); `RuneSaveData` (197 nodes {RuneKey, Level}); `cubeSaveLevelData` (crafting Cube);
  `aggregateSaveDatas` (lifetime counters, see below).
- Backups: the game keeps rolling `SaveFile_Live_1..5.es3.bak` + timestamped `SaveFile_Live_backup_YYYYMMDD_HHMMSS.es3`
  (~every few hours) — useful as historical diff points for trend charts (goal #10).

### aggregateSaveDatas (lifetime — partially decoded; finish it)
- Type 2 / SubKey 0 = lifetime **gold earned** (calibrated). **The Sub-keys are a SUM-VALIDATED gold-by-source
  partition: Sub0 == Sub1 + Sub2 + Sub3 exactly.** Sub1 = **gold from combat/stages** (delta-confirmed on the live
  save: Sub1 grows 1:1 with the total during active farming while Sub2/Sub3 stay flat). Sub2 + Sub3 = non-combat gold
  (offline + Cube + misc) — too small/uncalibrated to split into a standalone "Cube gold" figure, so bucketed honestly
  as "other" (golden rule). Surfaced as `aggregates.goldBySource {total,combat,other,validated}`.
- Type 0 / SubKey 0 = **total kills**. Type 0 sub-counters (10011, 10021-10023, 10031, 10041-10053, 20011-20091, …)
  = **per-MonsterKey kills** (VALIDATED: sum exactly to total kills). MonsterInfoData gives each monster's **base**
  RewardGold/RewardExp (baked into `DB.monsters {n,g,x}`) → "kills + base gold/xp per kill" (actual is higher with
  gold/XP buffs: Σ(kills×baseGold) ≈ 49% of Sub1, so per-kill values are labeled "base", never "actual earned").
- Type 16 / SubKey 0-3 = **UNKNOWN — DO NOT SHOW**. Previously guessed as per-difficulty completions
  (Normal/Nightmare/Hell/Torment) and *shipped*, but the LIVE save DISPROVES that reading: the account is Normal-only
  (`maxCompletedStage` 1210 = Act 2-10, the first difficulty band) yet Type 16 = `[263,179,83,1]` would claim
  Nightmare 179 / Hell 83 / Torment 1. **Removed in session 7.** Types 4/5/7/9/10/15 are likewise unconfirmed — OMIT
  all of them until a KNOWN-VALUE calibration confirms their meaning (golden rule). `verify_save.js` now asserts the
  app surfaces ONLY calibrated aggregates (Type 2/Sub0 gold + Type 0 kills/per-monster).

### THE CALIBRATION GOLDMINE — the game's own data tables (sharedassets0 TextAssets)
The game ships its entire balance/data model as **CSV TextAssets inside `sharedassets0.assets`** — this is the
authoritative source for everything; NEVER guess when you can read these. Extract with `scripts/dump_textassets.py`
(read-only). Key tables (header row = schema):
- **`ItemInfoData`** (5944 rows) — the item master: `ItemKey,ITEMTYPE,GRADE,PARTS,GEARTYPE,...,NameKey,
  DescriptionKey,GearKey,DropKey,Level,IsSteamItem,IconPath,IsCanExchangeMarketable`. NameKey -> localization;
  IconPath -> sprite; everything calibrated.
- **`GearInfoData`** — per-GearKey base/inherent stats + UniqueModKey (for item power / "who's carrying" math).
- **`StatModInfoData`** — StatModKey -> Tier -> STATTYPE/MODTYPE/Min/Max (enchant & mod stat names + roll ranges).
- `DropInfoData` (drop sources -> loot timeline "where it drops"), `RuneInfoData`/`RuneLevelInfoData` (197 runes
  -> NameKey + IconPath + costs), `SkillInfoData`/`SkillLevelInfoData`, `MonsterInfoData` (rewards/HP),
  `MaterialInfoData`, `UniqueModInfoData`, `AttributeInfoData`/`PassiveSkillInfoData` (hero trees, source breakdown),
  `GradeInfoData`, `GearTypeInfoData`, `SynthesisRecipeInfoData`/`CraftingRecipeInfoData`/`Cube*`, `OfflineRewardInfoData`.
  (45 tables total — see `scripts/find_item_table.py` output.)
- Localization: full **en-US (1824 keys)** is in the Addressable bundles under
  `StreamingAssets/aa/StandaloneWindows64/localization-*` (StringTable joined to its Shared Data by m_Id).
  Extracted by `scripts/extract_localization.py` -> committed at `src/engine/localization.min.json`
  (`ItemName_`511, `Stat`184, `ItemDescription_`115, `Passive_`56, `MonsterName_`52, `StatName_`40, `RuneName_`40,
  `SkillName_`/`SkillDescription_`36 each, `GearType_`20, `Grade_`11, `UniqueMod_`22, `StageName_`30, UI/Toast/...).

### Items (CALIBRATED from the tables above — DONE)
- RARITY = itemKey's **3rd digit** (0 Common…9 Cosmic). VALIDATED **5760/5760** gear rows: 3rd digit == `GRADE`
  column in ItemInfoData (was 7/7 vs run logs; now whole-dataset).
- itemKey structure: `[type:2][rarity:1][baseIndex:2][sub:1]`. A variant resolves to its base item via ItemInfoData's
  **NameKey** (= `ItemName_<baseId>`) and **IconPath**. **CORRECTION to a prior note in this file:** `342041` IS
  "Complete Crossbow" (Rare, Lvl15) — ItemInfoData gives NameKey `ItemName_340004` + IconPath `CROSSBOW_340004`.
  The earlier "342041 != Complete Crossbow" claim was wrong; the structural baseIndex decode matched the game 100%.
- `gamedata.min.json` is now **regenerated by `scripts/build_gamedata.py`** from ItemInfoData + StatModInfoData +
  RuneInfoData + localization: every item has authoritative `n,g,t,gt,lvl,ic` (+`steam,mkt,gk,dk,pt`); plus
  `stats` (StatModKey->stat name), `runes` (RuneKey->name/icon/maxlevel), `levels` (hero XP curve) and
  **`stages`** (StageName_<key>->name, 30; used by `stageLabel` to render "Act X-Y · <name>"). To refresh after a game patch:
  re-run dump_textassets.py + extract_localization.py + build_gamedata.py (+ extract_icons.py for art).
- 10 items (`150001-150010`, unused/unnamed/unowned type-15 placeholders) have no localized name -> honest
  `<Grade> Material` fallback. NEVER fabricate.
- MATERIALS: keep `g:null, mat:true` (tier is in the name, e.g. Soulstone - Normal; Minor Ruby).
- ICONS: **DONE** — 535 in `src/assets/sprites/Item_<id>.png` + 39 rune icons in `src/assets/runes/Rune_<path>.png`.
- Hero animations: 6 GIFs already in `src/assets/heroes/` (Hero_101..601). Classes: 101 Knight, 201 Ranger,
  301 Sorcerer, 401 Priest, 501 Hunter, 601 Slayer. (classId in run logs: Sorcerer=3, etc.)

### Three data lanes
1. Save file — persistent state (inventory, gold, heroes, runes, lifetime aggregates). Robust. Have it.
2. `Player.log` (same folder) — plaintext events: `OfflineReward` gold, `StageBox`/`Drop` loot, `ItemCache`
   Steam items. NO live combat. (loot timeline + blue-chest)
3. Memory — the ONLY source of live DPS / clear-time / exp-per-sec. Hard (IL2CPP + CodeStage obfuscation).
   Build our own read-only reader. (tbh-meter's was a separate `tbh-reader.exe`.)

### Steam Inventory / Market (goal #8)
Tradeable loot (the trade stash) flows through the **Steam Inventory Service** via the Heathen Steamworks asset
(seen in Player.log: `ItemCache` / `HandleInventoryResults` / `SteamInventoryResultReady_t`). Those items + their
live Steam Market value need the Steam Inventory/Market APIs (or read the in-game trade stash and cross-ref the
Community Market). Note: as of mid-2026 the devs throttled/disabled Market listing at times.

### Competitor to beat: tbh-meter (now UNINSTALLED from owner's PC)
- Electron + React + Vite + Tailwind. A separate `tbh-reader.exe` read game memory and wrote
  `~/tbh-meter/{live.json, session.json, logs/*.json, raw/*.json}`.
- live.json: {stageKey, act, stageNo, difficulty, mobs, total_mobs, damage_now, elapsed, gold_now, xp_now, party, drops}
- run log: {stage, mode, mobs, totalMobs, totalDamage, dps, clearTime, duration, goldGained, xpGained,
  xpPerSec, goldPerSec, heroes:[{heroKey,class,classId,level,exp,items:[{slot,slotId,grade,gradeId,itemKey,uniqueId,level,
  mods:[{recipeId,recipe,statId,stat,value,tier}]}]}]}  <-- these gradeIds are our rarity known-values.
- Features: runs table (per-run DPS/DMG/EXP/Gold/clear time), live overlay strip, blue-chest 12-min cooldown
  tracker, Discord leaderboard, settings (opacity, folder, run filters).
- Palette: #12131f / #1a1b2e navy, #3a3ff5 blue, #00bb7f green, #f99c00 amber, #ff2357 red.

## Current state (built + tested)
- `src/engine/saveEngine.js` — decrypt+parse+analytics (gold, heroes w/ class, corrected inventory counts,
  byRarity, trophies, lootDiff, runes, aggregates, rates/gold-hr). Tested on the real save. **Adds
  `iconId(key)`** — pure structural icon resolver: gear variants map to their base rarity-0 icon
  (`type+'00'+baseIndex`); `ownedItems` now also returns `icon` + raw `enchants`.
- `src/engine/gamedata.min.json` / `.js` — calibrated DB: `items` (5944, authoritative names + rarity-from-digit +
  materials), `stats` (62 enchant mods), `gear` (5440 GearKey -> inherent stats + unique mods), `skills` (36 named),
  `runes` (197, per-level effects+costs+tree). Rebuilt by `scripts/build_gamedata.py` from the game's own tables.
- `src/engine/item_names_en.json` — 511 authoritative item names from the game.
- `scripts/extract_icons.py` — read-only UnityPy extractor (Phase 2). Re-run to refresh icons after a game patch.
- `dashboard.html` — premium multi-tab UI: **Overview / Party / Inventory / Loot / Runes / Lifetime / Trends / Codex / Tips**.
  Animated hero GIFs, rarity-framed icon grid + enchant pips + tooltips (now incl. inherent stats + unique mods),
  per-hero equipped gear + skill chips, session gold/hr & kills/hr, rune tree (cheapest-next), lifetime stats +
  owned-by-rarity + kills-by-monster, History/Trends charts (SVG, from backups), Loot tab (boxes + offline rewards + save-diff drops).
  Inline engine mirrors saveEngine (standalone browser via Web Crypto + `Connect folder` dir picker AND Electron
  renderer). Verified headless vs the live save + real backups + Player.log; all 7 tabs, 0 console errors.
- `src/main.js`, `src/preload.js`, `package.json` — Electron app: auto-finds the save, watches it, feeds the renderer.
- `src/assets/heroes/*.gif` (6 animated hero portraits). **`src/assets/sprites/` — full 535-icon set extracted**
  (139 `Item_<id>` materials/currency + 396 gear `<TYPE>_<id>` -> keyed by numeric id) + `_manifest.json`.
- `.claude/launch.json` — static-server preview config (`python -m http.server`).

## DONE
- **Session 12 — gold-by-source + farming insights + Electron verified (v1.0.3):**
  • **Gold by source (calibrated):** Type 2 sub-keys are a sum-validated partition (Sub0 == Sub1+Sub2+Sub3); Sub1 =
    combat (delta-confirmed live). New Lifetime "Gold by source" panel: "From combat 99.5% / Other (offline, Cube, misc)
    0.5%". HONEST — the small "other" bucket isn't split, so no fabricated standalone "Cube gold". `goldBySource` in both
    engines + a verify_save sum assertion.
  • **Per-monster base rewards + honest "best farming stage":** `DB.monsters` now `{n,g,x}` (RewardGold/RewardExp);
    kills-by-monster shows "Ng/Nxp each (base)". A note answers "best gold/XP farming STAGE" truthfully: no StageInfoData
    (no monster→stage map) + a true per-stage rate needs the memory lane (not read) → no fabricated best-stage; the honest
    signals are per-monster base rewards + Trends gold/hr. (Σ(kills×baseGold) ≈ 49% of Sub1 due to buffs → "base" label.)
  • **BUG FIX (since session 7):** `el()` returns only the first element, so `el('<h3>…</h3>'+'<div class="panel">…')`
    silently dropped the panel — the **Owned-by-rarity bar+legend had been missing**. Switched it + the new gold panel to
    `frag()`. Audited the rest: other multi-line `el()` calls are single-root wrappers (fine).
  • **Electron smoke test (closed the gap):** ran `npm start` — clean launch (4 procs, 0 stderr, electron-updater no-ops
    in dev); window closed after. Renderer = the same dashboard.html verified in-browser.
  • **Version → 1.0.3** (cache-bust `?v=1.0.3`; DB gained monster rewards). The 1.0.2 line was never published; next
    release is 1.0.3 (includes all of sessions 7-12). Installer rebuilt.
- **Session 11 — styling + solidifying UX + per-hero level ETA (v1.0.2):**
  • **Per-hero "time to next level"** (Party cards + a "Time to next" roster column): XP remaining (calibrated) ÷ the
    XP/hr **MEASURED from this session** — never fabricated. `heroCumXp` (sum ExpForLevelUp[1..L-1] + HeroExp, survives
    a mid-session level-up) is baselined by `ensureSession()` at connect; `heroLevelEta` returns measuring / idle
    ("not gaining XP") / eta. `fmtEta` → min / Xh Ym / X days. Demo seeds a ~10-min session to showcase it. A Party-tab
    note states it's the player's real session pace, not a fixed prediction. (Mechanic-agnostic: benched heroes show
    "not gaining XP" only because the measured rate is 0 — we never assert the XP rule.)
  • **Fixed a significant first-impression bug:** on first connect/demo the active tab-page stayed `.hidden` (gate was
    showing), so the first paint was BLANK until a tab click. `render()` now toggles tab visibility (un-hides the active
    tab). Affects browser AND Electron. The "empty tab" screenshots earlier were this + the rise-animation fade timing.
  • **Accessibility:** global `:focus-visible` outline (var(--blue2)) on links/buttons/tabs/summary/inputs for keyboard nav.
  • **Styling:** Overview suggestion strip fixed (`.ss-t`/`.ss-b` were inline → block + 2-line clamp); tab fade snappier
    (`.tab-page` rise .35s→.26s). Full visual audit (all 9 tabs + connect screen, desktop + mobile) — cohesive premium look.
  • **Responsive** re-verified @375: 0 horizontal overflow; flex card 2-up; connect steps/trouble-note wrap.
- **Session 10 — connection blockers + flex + honest "no DPS" (v1.0.2):**
  • **Refresh no longer boots you out:** the picked folder/file handle is persisted in **IndexedDB** (`idbSet/idbGet`,
    store `handles`) and re-attached on reload by `restoreHandle()` — auto-resumes if `queryPermission`==='granted',
    else a one-click **Reconnect** box (`requestPermission` on a user gesture). `Disconnect` calls `forgetHandles()`.
    Browser-only (guarded by `!window.tbhNative`; Electron auto-connects).
  • **Blocked folder** ("this folder contains system files" = Chromium File System Access blocklist on AppData): added a
    gate **"Trouble connecting?"** `<details>` (Connect file / drag-drop / desktop app; pick TaskbarHero itself) **plus
    universal drag-and-drop** of `SaveFile_Live.es3` anywhere (classic File API → bypasses the blocklist). No dead end.
  • **Flex (honest):** new **Flex card** on the Overview — shareable brag stats (furthest stage, top hero, best rarity
    owned, kills, lifetime gold, runes) from calibrated save data + a **Copy-to-share** button (`flexShareText`). NO
    fabricated DPS. Reframed **"Who's carrying"** to answer "who hits hardest": no live DPS meter on purpose (needs the
    memory lane = ban risk); ranks by equipped gear power as the honest stand-in.
  • **Demo clarity:** "Preview sample"→"See a demo"; demo now shows an **amber "SAMPLE — not your data"** status (`.dot.demo`).
  • **Market items:** investigated → "purchased from market" is NOT calibratable (no origin flag; trade stash empty;
    Steam inventory throttled/empty this build). Honest Loot note now covers drop vs Cube-craft vs Market-buy can't be split.
- **Session 9 — Tips tab + Loot honesty + session correctness (v1.0.2, 9 tabs):**
  • **NEW "Tips" tab** (9th) + an Overview top-suggestion strip + a tab badge. **"Suggestions for you"** are computed
    ONLY from the current save and refresh each read — all calibrated: unspent ability points (per hero), deployed
    heroes with empty gear slots, the cheapest AFFORDABLE rune upgrade vs your gold (**VERIFIED: all 663 rune-level
    costs use the Gold currency**, CostItemKey 100001), stash near full, bench heroes far behind your mains, and
    stagnation (max-stage flat across the last 3 save-backup snapshots). **"Game tips"** = 10 knowledge cards incl. the
    owner's two (pets help even undeployed; ACT≠STAGE boss) + data-grounded ones. **Honest limit note:** live
    clear-time / per-map gold-rate optimizations are NOT shown (need the memory lane we don't read); Trends is the
    closest honest efficiency signal. No fabricated numbers.
  • **Loot — crafted vs dropped:** investigated and found it ISN'T calibratable — a Cube craft and a chest drop both
    mint a new gear UniqueId, the save has no origin flag, and Player.log logs neither (CraftingRecipeInfoData &
    SynthesisRecipeInfoData both output Gear). So renamed "Drop timeline" → **"New items"** with an honest note that
    drops AND Cube crafts both appear and can't be split; surfaced the real Cube level (`cubeSaveLevelData`).
  • **Loot — dual timestamps:** "Your time" (local) + "UTC" columns on the new-items timeline AND the offline-rewards
    table; new items are stamped with the save file's true UTC mtime so both columns are accurate.
  • **Session staleness (owner's question):** confirmed every read re-parses the FULL save → no stale accumulation; a
    newly-joined hero shows up correctly next read. **Fixed:** session gold/hr now uses LIFETIME gold earned (monotonic)
    not the balance, so spending gold never makes it negative. analyze() now also exposes `cube`.
- **Session 8 — UX + answering the owner's 3 questions (multi-user / uninstall / auto-update), v1.0.2:**
  • **Multi-user (confirmed + made obvious):** the app is a STATIC CLIENT-SIDE reader — each visitor connects their OWN
    local save in their OWN browser (File System Access API), nothing uploaded, no account, no shared backend. So anyone
    can use it independently and no one can see anyone else's data; hosting (Pages/Vercel) only decides WHERE the page
    lives, end users never "log in." Added a "👥 No account, no sign-in" line to the connect screen. ROBUSTNESS: `disconnect()`
    now resets the loot tracking (`lastUids`/`lootLog` + removes persisted `tbh_loot` + `logData`) so switching to a different
    save on the same browser is a clean slate (was: diffed vs the old save → false-flooded the timeline). Reloads still keep it.
  • **Auto-update made VISIBLE:** `main.js` wires electron-updater events → renderer; `preload.js` exposes `onUpdate` +
    `restartToUpdate`; an in-app bottom banner shows "Downloading… N%" then "Update ready · vX — restart to apply" + a
    Restart button (`quitAndInstall`). `autoInstallOnAppQuit=true` applies on next quit even without a click. Web never
    fires these. Publishing a new GitHub release pushes the update to all desktop installs.
  • **Uninstall (confirmed + polished):** NSIS `oneClick:false` builds an uninstaller (builder-debug: `WriteUninstaller`
    + `uninstaller.nsh`) + a Windows Add/Remove Programs entry. Added `uninstallDisplayName` "TBH HUD", desktop + Start-Menu
    shortcuts, `runAfterFinish`, `deleteAppDataOnUninstall:false`. Rebuilt the 1.0.2 installer (valid; fresh latest.yml).
  • README FAQ added (multi-user / uninstaller / auto-update, plain language). No DB change → `?v=1.0.2` unchanged.
- **Session 7 — DATA HONESTY + UX (v1.0.2)** (owner found these by REAL use; #1 rule: show ONLY what is TRUE in a user's own save):
  • **P1 — removed a SHIPPED FABRICATION:** the Lifetime "Difficulty completions" panel read aggregate Type 16 as
    Normal/Nightmare/Hell/Torment. That mapping is UNCALIBRATED and DISPROVEN by the live save (Normal-only,
    `maxCompletedStage` 1210 = Act 2-10, the first difficulty band, yet Type 16 = `[263,179,83,1]` would claim Nightmare
    179 / Hell 83 / Torment 1). Removed from both engines, the renderer, the demo, AND the README. `aggregates()` now
    surfaces ONLY calibrated counters: lifetime gold (Type 2/Sub0) + total kills (Type 0/Sub0, sum-validated by
    per-monster). Lifetime "Notes" explains the omission. `verify_save.js` extended with DATA-HONESTY ASSERTIONS (fails if
    `perDifficultyCompletions` is exposed or any non-whitelisted aggregate leaks; asserts kills-by-monster sum == totalKills;
    prints the Type-16 disproof). Live save: PASS.
  • **P2 — stage display:** never show the raw stageKey. New `stageLabel`/`stageActLabel`/`stageName` (both engines)
    decode `act=floor(k/100)-10, stage=k%100` (VERIFIED 1208→Act 2-8 "Sacred Tomb"; 1101→Act 1-1 "Pasture";
    1210→Act 2-10 "Pharaoh's Underchannel") + the real `StageName_<key>` where present, else "Act X-Y". `build_gamedata.py`
    bakes **`DB.stages`** (30 names from localization). Fixed Overview, Lifetime, Trends (chart + table). No raw-key leak.
  • **P3 — Overview clarity:** "Who's carrying" no longer prints "NN Σlvl · N gear · Rarity" — plain words ("Total gear
    level NN · N items · best <Rarity>") + a hint line + per-bar tooltips. New reusable `.hint` explainer class. No Σ.
  • **P4 — connect + disconnect:** rewrote the connect screen as 3 numbered step-cards (click Connect folder → paste the
    exact path with a one-click **Copy** button → Allow), privacy note kept. Added a header **"↩ Disconnect"** control:
    clears the loaded save + file/dir handles + live watchers + session/trends and returns to the connect screen.
    `setConnectedUI()` swaps pickers ↔ Disconnect; hidden in Electron (auto-connect).
  • **P5 — first-visit polish:** friendly "no save yet" placeholder on data tabs (icon + per-tab message + Connect/Browse
    buttons); gate step-cards / kbd chips / styled links. Responsive: 0 horizontal overflow @375 (mobile path wraps).
    Version → 1.0.2; cache-bust `gamedata.min.js?v=1.0.2` (DB gained `stages`). NOTE: the v1.0.2 desktop installer/release
    is not yet built+published — the WEB build (Pages) is current on push; publish a 1.0.2 release for Electron auto-update.
- **Session 5 — verify + responsive + real XP-to-next + Vercel-ready (v1.0.1):**
  • **Responsive:** measured real mobile overflow (page was 549px @375 — the non-wrapping header) and fixed it. Header
    wraps (status+buttons in `.actions`; ≤680px the header is static + the tab bar sticks to top); wide tables scroll
    in-panel via `.panel:has(> table){overflow-x:auto}`; mobile breakpoints (2-up cards, 1-up <380px, 66vh Codex).
    0 horizontal overflow at 375/768/1280; Codex cols 2/4/7.
  • **Real hero XP-to-next (killed a placeholder):** the hero bar was `level/20*100` (fake). Calibrated
    `LevelInfoData(Level,ExpForLevelUp)` vs the live save — HeroExp is per-level progress (all 6 heroes have
    HeroExp < ExpForLevelUp[L]) → `xpToNext = ExpForLevelUp[L] − HeroExp`. Real bar + "% → L<n+1> · <rem> XP" label +
    roster "XP to next" column. `DB.levels` baked; `xpToNext()` in saveEngine + inline; verify_save prints it.
  • **Distribution:** version → 1.0.1; rebuilt installer; **Release v1.0.1 published** (auto-update chain v1.0.0→v1.0.1).
    `gamedata.min.js?v=1.0.1` cache-busts the catalog so browsers never serve a stale DB after a rebuild (bump with version).
  • **Vercel-ready (2nd free host):** `vercel.json` (static/cleanUrls/cache headers) + root `index.html` (bare URL →
    dashboard, query/hash preserved — also fixes Pages bare URL). NOT auto-deployed (Vercel MCP only returns CLI/git
    instructions; only the Fusion Data Company team is available — repo is on personal GitHub). Owner: 1-click import.
- **Phase 7 — real run + packaging + distribution (SHIPPED):** (1) `npm start` smoke-tested — Electron launches clean
  (main + 4 procs, 0 stderr); electron-updater loads + no-ops correctly in dev. main.js now sends the save file's true
  UTC mtime (preload + dashboard `onSave` use it) so the offline timer is authoritative in Electron too. (2) NSIS
  installer `dist/TBH-HUD-Setup-1.0.0.exe` (76 MB, valid PE). **winCodeSign symlink fix** (no admin / Developer Mode
  here): set `win.signAndEditExecutable=false` + `win.verifyUpdateCodeSignature=false` — lossless for an unsigned,
  icon-less app and it skips the winCodeSign fetch (the symlink-extract step) entirely. (3) **GitHub Pages live** over
  HTTPS (+`.nojekyll`): https://revenantcabal-rgb.github.io/taskbarheroburat/dashboard.html (dashboard/DB/sprites HTTP
  200, correct MIME; Connect-folder works). (4) **electron-updater wired + Release v1.0.0 published** (installer +
  latest.yml + blockmap) → auto-update from GitHub releases. Installer is UNSIGNED (SmartScreen prompt — no cert).
- **Phase B — offline-rewards card (Overview):** live-ticking idle since last save + last offline collection
  (gold + rate from Player.log) + cap countdown. Dumped `OfflineRewardInfoData` (per-StageLevel yield params:
  BaseGold/Exp/KillCount/ClearCount) — but NONE of the 45 tables holds the offline **time-cap** (it's a code
  constant), so we DO NOT assume 8h: the cap + rate are LEARNED from the user's own Player.log `[OfflineReward]`
  events (reward==delta until the cap, then plateaus → real cap; rate = gold/reward of the latest). **TZ
  calibration (important):** the `.es3` `lastSavedTime` is stored as LOCAL `.NET` ticks — verified 8h ahead of the
  file's UTC mtime (the user's TZ) — so absolute "idle since save" is anchored on the file's true UTC mtime
  (`file.lastModified` in-app / `fs.mtime` in the harness), TZ-corrected ticks as fallback. `parseOfflineEvents()`
  + `offlineStatus()` mirrored in saveEngine.js; `verify_save.js` prints offline status + a tz check. Calibration:
  +739 gold / 93s (~7.95 g/s) reproduced exactly. No invented daily reset.
- **Phase A — full-catalog Codex (owner's #1 ask):** new virtualized **Codex** tab browsing the game's ENTIRE catalog
  (5944 items + 197 runes + 36 skills = 6177 entries), independent of ownership; owned items/runes/skills marked ✓.
  Filters (category/rarity/gearType/name+ID search), sort (rarity/level/name/id), owned-only toggle; windowed grid
  renders only visible rows (smooth at 6k). Per-entry detail modal: description (or honest "defined by stats" for gear),
  inherent stats + unique mod, material socket effects, rune per-level value/cost table, marketable/Steam flags,
  **drop sources** + **box contents**. Drop chain baked by `build_gamedata.py` into `DB.drops` (box `DropKey` →
  member `ItemKeys` via DropInfoData→ItemGroupInfoData; 41 keys, 5554 refs, all resolve; Korean ItemGroup names
  omitted). `boxContents()`/`dropSources()` mirrored in saveEngine.js; `analyze()` exposes `ownedSkills`. Works with
  NO save (`?codex` / gate link — the DB is the game's master catalog, not the inventory). New `scripts/audit_catalog.js`
  asserts 0 missing name + 0 missing icon over all 6177 (name 99.83% from the game + 10 honest fallbacks; icon 100%).
  Verified vs the live save (Node + headless): owned markers reconcile exactly (37 items + 56 runes + 9 named skills), 0 console errors.
- **Phase 2 (full game art):** 535 item icons + 39 rune icons extracted; every owned save item resolves to a real icon (100%).
- **Phase 3 (premium UI):** multi-tab dashboard that beats tbh-meter/tbh-copilot, verified vs the live save.
- **Authoritative names + localization:** found the game's own data tables (sharedassets0 TextAssets); item names,
  enchant stat names, and rune names are now 100% calibrated from the game (no guessing). gamedata.min.json
  regenerated; localization.min.json committed. Verified vs the live save.
- **Gear inherent stats + unique mods (task #1/#9-2):** `DB.gear` (GearKey -> labeled inherent stats from
  GearInfoData + unique-mod effect text from UniqueModInfoData; 5440 entries, 127 unique mods) now shown in item
  tooltips. NOT shown: GearInfoData BaseStat1/2 columns — the game ships no GearTypeInfoData mapping them to a stat
  type, so labeling them would be a guess (golden rule). No fake composite "power score"; inventory sort stays
  rarity+level (the game's own power indicators).
- **Phase 6 — History/Trends:** new Trends tab charts lifetime gold, kills, max-stage and gold/hr-by-interval over
  time from the game's own rolling+timestamped save backups (read-only). Browser `Connect folder`
  (showDirectoryPicker, mode:'read') reads the live save + all backups + Player.log; Electron pushes them over IPC.
  `trendPoint`/`buildTrends` in both engines. Verified vs the real folder (~24.7h, 10 points, gold/hr 36k->92k).
- **Phase 5 — Loot/log integration:** Loot tab shows Steam boxes held (Player.log GetBoxCount -> real DB names),
  offline-reward gold (real Unix timestamps), and the save-diff drop timeline (now timestamped with the save's
  lastSavedTime). Live combat drops are NOT in the game log (they go to the save) — handled honestly, no fabricated
  "12-min blue-chest" timer (DropCooldown has no 720s value; cadence unconfirmed -> not invented).
- **Equipped skills on heroes:** `DB.skills` (SkillInfoData + localization, 36 named skills) -> skill chips on hero
  cards + an "Equipped skills" roster column (e.g. Fireball/Lightning). Verified vs live save.
- **Read-only re-audit:** grepped the whole codebase — zero writes/injection to the game/save/memory. Every game
  path is opened read-only (UnityPy/csv readers, fs.readFile, fs.watch, browser file/dir pickers mode:'read',
  Web Crypto). All `open(...,"w")` and fs writes target our own repo outputs only.
- **Bug fixed:** hero cards silently dropped level/XP/gear-meta — `el(html)` returned only `t.content.firstChild`,
  so the 4-sibling heroCard block lost `.lvl/.xpbar/.meta` on every hero (demo + live). Added `frag()`; fixed.
- **scripts/verify_save.js:** read-only Node harness (decrypt+parse a real .es3, print snapshot + fabrication/icon
  coverage audit). Live save: 0 unresolved names, 100% icons.
- **Full "who's carrying" source breakdown (#2):** per deployed hero on Party, factual stat contributions by source —
  Base (HeroInfoData innate) / Gear (inherent+enchants) / Tree (leveled passives + active skills) + an account-wide
  panel (runes + active pet). New DB maps: heroes(+base), attributes(132), passives(108), pets(8). Labeled gear/build
  power, NOT live DPS; no fabricated composite %. Mirrored in saveEngine. (XP-to-next IS shown as of session 5 — the
  `LevelInfoData` curve was found + calibrated; the earlier "no level curve" note was wrong. Time-ETA still needs the memory lane.)
- **Loot & lifetime depth (#3):** active-pet card (PetInfoData → Dragon etc.); rare-drop alerts (Legendary+ ★ + opt-in
  silent Notification, OFF by default); **calibrated kills-by-monster** on Lifetime — aggregate Type-0 sub-counters are
  per-MonsterKey kills, VALIDATED to sum exactly to total kills (26 types, 0 unnamed). New DB.monsters (61). Other
  undecoded aggregate Types are omitted, not guessed.

## Next (priority order) — full acceptance criteria in docs/PRD.md
1. **Real-run verification + Phase 7 packaging:** the Electron app + browser `Connect folder` flow are verified only by
   code + a mock dir handle so far — launch them for real (`npm start`; real folder pick), fix anything live. Then NSIS
   installer + GitHub auto-update + GitHub Pages. NOTE: electron-builder hits a winCodeSign symlink error on Windows —
   extract only `windows\*` from the winCodeSign cache, or build with Developer Mode / elevated. (Pages: serve repo root;
   `Connect folder` needs HTTPS or localhost.) **This is the blocker to friends actually using it.**
2. **Phase 4 — Live telemetry (CAUTION):** own read-only memory reader -> per-run DPS, clear time, gold/s, xp/s,
   gold/hr & xp/hr PER ACT, per-hero DPS share. READ-ONLY only — no writing/injecting (CodeStage `[ACTk]` anti-cheat
   confirmed in Player.log). If ANY ban-safety doubt, DO NOT build it — the save+log lanes already cover most metrics.
3. **Phase 8 (optional)** — private friends leaderboard.

### Deferred / deliberately NOT built (golden rule)
- **Stage-box drop contents (task #9-1):** ✅ NOW SHIPPED in the Codex — DropKey -> DropInfoData -> ItemGroupInfoData ->
  member ItemKeys -> EN names ("Box can contain […]") + the reverse "Drops from […]" per item, baked into `DB.drops`.
  The Korean ItemGroup `GroupName` is omitted (never guessed). Per-source drop *rates* (the weighted/conditional,
  per-hero weights) are still NOT shown — optional, would need careful interpretation; the contents list is unweighted.
- **Per-act gold/hr (PRD #2) + live DPS (#5):** need the memory lane (which stage gold/xp is attributed to).
  Save+log give gold/hr over TIME (Trends) but can't attribute it per act. Pending Phase 4 (caution).
- **Steam Market value (PRD #8):** the Steam Inventory Service is throttled/empty in this build (Player.log shows
  `CreateSteamItem returned OK but items is empty`), so live market value isn't reliably available.
- **Stat %% interpretation:** exact meaning of MULTIPLICATIVE/ADDITIVE values not asserted; shown raw + modtype tag.

## Build / run  (app v1.0.3 · fully responsive: phone/tablet/desktop)
- Browser (no install): **https://revenantcabal-rgb.github.io/taskbarheroburat/** (GitHub Pages, HTTPS; bare URL works via
  index.html) -> Connect folder. Or open `dashboard.html` locally in Chrome/Edge. `?codex` browses the full catalog with no
  save; `?demo` loads sample data. NOTE: bump `?v=` on the `gamedata.min.js` script tag when the DB changes (cache-bust).
- Browser (Vercel, 2nd free host): repo is Vercel-ready (`vercel.json` + `index.html`) — import the GitHub repo at
  vercel.com for a one-click deploy. (Not auto-deployed: no interactive Vercel auth here; only the Fusion Data Company team is available.)
- Desktop: `npm install` then `npm start` (Electron; auto-finds the save, watches it, auto-updates from GitHub releases).
- Installer: `npm run dist` -> `dist/TBH-HUD-Setup-<ver>.exe`. **winCodeSign note:** building on a non-admin box without
  Developer Mode hits a symlink-extract error; `package.json` sets `win.signAndEditExecutable=false` +
  `verifyUpdateCodeSignature=false` to skip the winCodeSign fetch (we don't sign / have no .ico). To SIGN later, provide a
  cert (WIN_CSC_LINK) and re-enable those, with Developer Mode/elevation so winCodeSign extracts.
- Release/auto-update: `gh release create v<ver> dist/TBH-HUD-Setup-<ver>.exe dist/latest.yml dist/*.blockmap` (electron-updater reads latest.yml).
- Full-catalog audit: `node scripts/audit_catalog.js`. Live-save check: `node scripts/verify_save.js` (incl. offline tz check).
