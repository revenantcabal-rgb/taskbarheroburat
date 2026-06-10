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
NOTE: the only GitHub token currently on the machine belongs to a different work account
(`Fusion-Data-Company`) — do NOT push with it. Push from Claude Code where Rob is signed in as revenantcabal,
or have him supply a token for that account.

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
  arrangedHeroKey (active party of 3), lastSavedTime (.NET ticks = n/10000 - 62135596800000 ms)};
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
- Type 2 / SubKey 0 = lifetime **gold earned** (calibrated: its delta matched a gold gain exactly). Sub 1/2/3 also large.
- Type 0 / SubKey 0 = **total kills**. Type 0 also has structured subkeys (10011, 10021-10023, 10031, 10041-10053,
  20011-20091) = likely per-monster/per-item-category counters.
- Type 16 / SubKey 0-3 = **per-difficulty completions** (Normal/Nightmare/Hell/Torment). Type 4/5/7 also have Sub 0-4
  (per-difficulty-ish). Type 10/15 = single counters. Decode the rest for richer lifetime stats.

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
  `stats` (StatModKey->stat name) and `runes` (RuneKey->name/icon/maxlevel). To refresh after a game patch:
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
- `dashboard.html` — premium multi-tab UI: **Overview / Party / Inventory / Loot / Runes / Lifetime / Trends / Codex**.
  Animated hero GIFs, rarity-framed icon grid + enchant pips + tooltips (now incl. inherent stats + unique mods),
  per-hero equipped gear + skill chips, session gold/hr & kills/hr, rune tree (cheapest-next), lifetime/difficulty/
  rarity charts, History/Trends charts (SVG, from backups), Loot tab (boxes + offline rewards + save-diff drops).
  Inline engine mirrors saveEngine (standalone browser via Web Crypto + `Connect folder` dir picker AND Electron
  renderer). Verified headless vs the live save + real backups + Player.log; all 7 tabs, 0 console errors.
- `src/main.js`, `src/preload.js`, `package.json` — Electron app: auto-finds the save, watches it, feeds the renderer.
- `src/assets/heroes/*.gif` (6 animated hero portraits). **`src/assets/sprites/` — full 535-icon set extracted**
  (139 `Item_<id>` materials/currency + 396 gear `<TYPE>_<id>` -> keyed by numeric id) + `_manifest.json`.
- `.claude/launch.json` — static-server preview config (`python -m http.server`).

## DONE
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
  power, NOT live DPS; no fabricated composite %. Mirrored in saveEngine. (XP-to-next NOT shown — no level curve in tables.)
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

## Build / run
- Browser: open `dashboard.html` in Chrome/Edge -> Connect save.
- Desktop: `npm install` then `npm start`.
- Installer: `npm run dist` -> `dist/TBH-HUD-Setup-<ver>.exe`.
