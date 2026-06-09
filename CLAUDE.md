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

### Items (CALIBRATED — never guess)
- "500+ unique items" (official). Game ships **511** `ItemName_<id>` strings in its Unity Localization
  (authoritative). Extracted to `src/engine/item_names_en.json`. The ~6000 ids in community data are those
  500+ base items x rarity/level variants.
- RARITY = the itemKey's **3rd digit**: 0 Common,1 Uncommon,2 Rare,3 Legendary,4 Immortal,5 Arcana,6 Beyond,
  7 Celestial,8 Divine,9 Cosmic. VALIDATED **7/7** against tbh-meter run-log gradeIds (gradeId == 3rd digit).
- itemKey structure: **[type:2][rarity:1][item index + level]**. Base item names are localized at the COMMON
  tier (e.g. crossbows `340001-340020` = Short/Leather/Long/Complete/Exceptional/Reinforced/Iron/... Crossbow;
  orbs `420001-420006` = Magic/Elder/Brilliant/Frozen/Prophecy/Dark Orb). A variant key (e.g. `342041` = Rare,
  lvl15) shares its base item's name. **TODO: finish the variant->base-id mapping so every itemKey resolves to its
  real name.** Until then: authoritative name from `item_names_en.json` if present, else honest `<Rarity> <Type>`
  (e.g. "Rare Staff") — NEVER community-fabricated names (community mislabeled e.g. 342041 as "Complete Crossbow";
  Complete Crossbow is actually 340004).
- MATERIALS: named with their tier (190001-190004 = Soulstone - Normal/Nightmare/Hell/Torment; 110001 = Minor Ruby).
  They do NOT use the gear rarity ladder — the tier is in the name. Don't show a gear grade for materials
  (`gamedata.min.json` already sets `g:null, mat:true` for them).
- Localization also contains (extract the same way — UnityPy: en-US StringTable joined to SharedTableData by m_Id):
  `ItemDescription_`(115), `MonsterName_`(52), `RuneName_`(40), `SkillName_`(36)+`SkillDescription_`(36),
  `StatName_`(40)/`Stat`(184), `Passive_`(56). Use for rune-tree names, skill display, monster names, stat tooltips.
- ICONS: NOT extracted yet. Full icon set is in the game's `sharedassets0.assets` (+ `.resS`, ~284MB) as
  Sprite/Texture2D — extract with **UnityPy** -> `src/assets/sprites/Item_<id>.png`. Community tool had 78 icons;
  tbh-meter only 3. This is the visual differentiator.
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
  byRarity, trophies, lootDiff, runes, aggregates, rates/gold-hr). Tested on the real save.
- `src/engine/gamedata.min.json` / `.js` — calibrated item DB (authoritative names + rarity-from-digit + materials fixed).
- `src/engine/item_names_en.json` — 511 authoritative item names from the game.
- `dashboard.html` — working browser/renderer dashboard (jsdom-verified). NEEDS premium restyle + icons + hero GIFs.
- `src/main.js`, `src/preload.js`, `package.json` — Electron app: auto-finds the save, watches it, feeds the renderer.
- `src/assets/heroes/*.gif` (6 animated hero portraits). `src/assets/sprites/` (3 sprites so far).

## Next (priority order) — full acceptance criteria in docs/PRD.md
1. Extract the FULL item icon set (UnityPy from sharedassets0) -> `src/assets/sprites/Item_<id>.png`.
2. Finish authoritative item-name decode (itemKey -> base name) + extract rune/skill/monster names.
3. Premium UI redesign that beats tbh-meter (hero GIFs, rarity-framed icons + enchants, polished navy theme, full feature set).
4. Live telemetry: own read-only reader -> per-run DPS, clear time, gold/s, xp/s, gold/hr & xp/hr PER ACT, per-hero DPS share + source breakdown.
5. Loot timeline (save-diff + Player.log tail) with timestamps + rare-drop alerts + Steam Market value.
6. History/trends over time (use save backups as diff points).
7. Blue-chest / cooldown tracker.
8. Installer + GitHub auto-update + GitHub Pages browser build. NOTE: electron-builder hits a winCodeSign
   symlink error on Windows — extract only `windows\*` from the winCodeSign cache, or build with Developer Mode / elevated.
9. Optional: private friends leaderboard.

## Build / run
- Browser: open `dashboard.html` in Chrome/Edge -> Connect save.
- Desktop: `npm install` then `npm start`.
- Installer: `npm run dist` -> `dist/TBH-HUD-Setup-<ver>.exe`.
