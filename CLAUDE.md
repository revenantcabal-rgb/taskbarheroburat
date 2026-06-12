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

Owner: Mat (Mathew Mercado). GitHub: **`revenantcabal-rgb`** (his PERSONAL account), repo **`revenantcabal-rgb/taskbarheroburat`**.
All commits MUST be authored as **Mathew Mercado <revenantcabal@gmail.com>** — no other identity, no co-author trailers.
NOTE (updated session 4): `gh` is now authed as **`revenantcabal-rgb` (active account, full `repo`+`workflow` scopes)** —
git push, `gh release`, and `gh api` (Pages) all work as revenantcabal. A second, unrelated account is also in
the keyring but is NOT active — don't switch to it, and never reference it in this repo. Live distribution: Release **v1.0.0** + **GitHub Pages**
(https://revenantcabal-rgb.github.io/taskbarheroburat/dashboard.html).

## Project tracking (read these; keep them current)
- **The plan:** `docs/PRD.md` — goal list (§3), phased roadmap + acceptance criteria (§6).
- **Status vs the plan:** `docs/PROGRESS.md` — every goal/phase mapped to ✅/🟡/🔵/⛔ with reasons. The single
  source of truth for "where are we." **Update it at the end of every session.**
- **Trace over time:** `improvement.log` (repo root) — narrative status + what shipped each session. **Add an entry every session.**
- **Current state / what's next:** the §DONE + §Next in this file, `docs/PROGRESS.md`, and `improvement.log`.
  (`docs/GOAL.md`, `docs/SESSION-GOAL.md`, `docs/CLAUDE-CODE-KICKOFF.md` are HISTORICAL session briefs — not current.)
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
- **`equippedItemIds` are item UniqueIds, NOT ItemKeys** (verified: every equipped uid resolves to an owned instance).
  **Slot map (verified on the live save):** 0 weapon, 1 offhand, 2 helmet, 3 armor, 4 gloves, 5 boots, 8 ring,
  6/7/9 accessory. Gear matching must use **GEARTYPE (`gt`)**, never the slot index (the weapon type is class-specific).
- **Item Level = equip requirement (v1.0.7):** hero must be at least the item's Level. Calibrated: 43/43 equipped
  instances across BOTH real saves satisfy lvl<=heroLevel (zero counterexamples); verify_save.js asserts it stays true.
- **Enchant system (v1.0.7, calibrated from the save's own EnchantData):** enchanting consumes an fx-bearing
  material ("stone" — DECORATION/ENGRAVING/INSCRIPTION mts with `fx`), and the resulting STAT is deterministic =
  the stone's fx entry for the item's slot category (WEAPON/ARMOR/ACCESSORY/COMMON, from StatModGroupInfoData).
  Verified 4/4 applied enchants in both saves (MaterialKey→stone, rolled stat == category effect). Tier/value roll is
  RNG. gt→category mapping is calibrated ONLY for: weapon types (= the hero table's MainWeapon values → WEAPON;
  observed STAFF+CROSSBOW) and HELMET/ARMOR (observed → ARMOR); other gts get no category claim (golden rule).
- **OFFLINE vs ONLINE (v1.0.9, calibrated):** saves only exist while the game runs → offline progress arrives as
  one lump at reopen. Continuous-play snapshot pairs show wall−played jitter ≤0.15h; pairs containing a real
  closed-game gap show ≥0.49h and their OTHER-bucket gold delta matches Player.log offline collections EXACTLY
  (+235 == gold=235). So: wall−played > **0.25h** (OFFLINE_GAP_H, both engines) = closed-game detector; offline
  gold goes to Sub2/3 only (combat counter immune); offline XP/kills are UNVERIFIED (Player.log records only
  gold) → per-stage rates exclude offline-spanning intervals from XP/kill attribution, and the "offline grants
  XP" claim is never made.
- **Per-stage farming rates are derivable SAVE-ONLY (v1.0.4; no memory lane):** delta the calibrated combat-gold
  sub-counter (Type 2/Sub 1) between snapshots and attribute it to `currentStageKey`, counting only CLEAN intervals
  (cur unchanged across the pair). Offline gold is excluded by construction (it lands in Sub 2/3). Verified vs
  test/live.es3 + test/backups: Act 2-8 ≈ 84,911 gold/hr vs Act 1-6 ≈ 36,313. Engine fn: `perStageRates(points)`
  (both engines); rate includes idle time = the player's real average; sharpens as snapshots accumulate.
- **HUD-own snapshot history (v1.0.4):** the renderer persists a lean `trendPoint` per save read to IndexedDB db
  **`tbh-hud-history`** (store `points`, keyed by save time, capped 2400) — SEPARATE from the `tbh-hud`/`handles`
  connection store. Loaded on startup, merged with game backups into trends; cleared on Disconnect (same clean-slate
  rule as the loot timeline so two different saves never mix).

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

### The game's grouped Stat List (v1.0.11, CALIBRATED — calibrate-or-omit applied)
- The in-game "Stat List" panel (grouped Exploration / Combat / …) **is the RUNE aggregate** — nothing else feeds it.
  Proven by calibration against the owner's in-game screenshot + the live save: **8/9 transcribed lines matched the
  live save EXACTLY** (Increase Exp Amount 700→"70% Increased Exp Gain"; Additional Exp +1; Exp From Stage Boss Kill
  +80; Exp From Act Boss Kill +300; Exp From Normal Monster +1; Unlock Arrange Slot Count 2→"Hero Slot +2"; All Hero
  Move Speed 210→"21%"; All Hero Attack Damage +10), and the 9th (Attack Speed, screenshot 11%) was bracketed by the
  game's own rolling backups rising 10%→16% through 11% as runes were leveled overnight. **Passives and pets are NOT
  in this panel** (move-speed passives were unleveled in the calibration save yet the panel showed exactly the rune
  total; PetStatInfoData exists but contributes nothing here).
- **Display rules (calibrated):** wording = the game's own `AccountStat_<STATTYPE>` localization templates VERBATIM
  (localization.min.json has all ~37); templates containing `{0}%` display the raw rune total **÷10** (3 independent
  confirmations); `+{0}` templates display the raw total (6 confirmations). STATTYPE comes from RuneLevelInfoData
  (DB.runes[].eff = prettify(STATTYPE)).
- **Grouping:** the game ships NO category table (all 45 sharedassets0 TextAssets enumerated) — grouping is hardcoded
  in game code. Only screenshot-verified memberships ship: Exploration = the 5 exp lines + Hero Slot; Combat = Move
  Speed, Attack Speed, Attack Damage. Everything else (gold/chest/cube/offline/inventory lines) is **omitted from the
  grouped view** (raw totals still shown / runeStatList). The map lives in `STAT_LIST` in BOTH engines; the crew
  payload sends `statList:[{k,v}]` (raw values; server whitelist = the same 9 keys in api/_lib.js).

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
- `dashboard.html` — premium multi-tab UI (11): **Overview / Party / Inventory / Loot / Runes / Advisor / Lifetime / Trends / Crew / Codex / Tips**.
  **v1.0.11:** semantic-token design system with **light (default) + dark themes** (toggle in header; `tbh_theme`),
  uniform card grids on shared track tokens, the game's grouped **Stat List** on Runes + Crew, and an in-app
  ✨ **What's new** changelog modal (+ CHANGELOG.md, public).
  Animated hero GIFs, rarity-framed icon grid + enchant pips + tooltips (now incl. inherent stats + unique mods),
  per-hero equipped gear + skill chips, session gold/hr & kills/hr, rune tree (cheapest-next), lifetime stats +
  owned-by-rarity + kills-by-monster, History/Trends charts (SVG, from backups), Loot tab (boxes + offline rewards + save-diff drops).
  Inline engine mirrors saveEngine (standalone browser via Web Crypto + `Connect folder` dir picker AND Electron
  renderer). Verified headless vs the live save + real backups + Player.log; all 7 tabs, 0 console errors.
- `src/main.js`, `src/preload.js`, `package.json` — Electron app: auto-finds the save, watches it, feeds the renderer.
- `src/assets/heroes/*.gif` (6 animated hero portraits). **`src/assets/sprites/` — full 535-icon set extracted**
  (139 `Item_<id>` materials/currency + 396 gear `<TYPE>_<id>` -> keyed by numeric id) + `_manifest.json`.
- `.claude/launch.json` — static-server preview config (`python -m http.server`).

## DONE — compact changelog  (per-session trace: improvement.log · status table: docs/PROGRESS.md)
- **S24 (v1.0.20 + v1.0.21)** — **difficulty-labeled stages + an English/简体中文 language switch.** (v1.0.20) The
  leaderboard's meaningless **"Act 12-5"** is fixed: stage keys are BAND-CONTINUOUS, so `stageActLabel`/`stageLabel`
  (BOTH engines) decode the difficulty band — `2205 → "Act 3-5 · Torment"`. CALIBRATED from the game's OWN data: the
  4 `Difficulty_*` localization keys + the 4 difficulty Soulstones (`ItemName_190001-4`), with the 4-band × 3-act ×
  10-stage structure corroborated by `OfflineRewardInfoData`'s 116-stage total (= 30+30+30+26; Torment's last act is
  short). The Crew board re-decodes from the authoritative numeric `maxStage` key (`crewStage()`) so members on older
  clients render the new form without re-pushing. NOTE: no confirmed Nightmare+ key exists on the owner's Normal-only
  save — the band map is corroborated, not save-verified past Normal (confirm on the first Nightmare clear). (v1.0.21)
  **Language switch (中/EN, `tbh_lang`, applied pre-paint).** Game terms come from the game's OWN zh-Hans Addressable
  bundle — `scripts/extract_localization_zh.py` (READ-ONLY) emits `src/engine/i18n_zh.min.js` (`window.TBH_ZH` = game
  811 / stages 30 / diff 4 / grades 11; 39 rune effects joined by STATTYPE) + `localization.zh.min.json`. Runtime is
  renderer-only: `I18N_UI` (hand-translated chrome) + `zhT()` exact lookup (quote-insensitive via `_i18nNorm`) + a
  guarded **MutationObserver** translating the live DOM (text + title/placeholder/aria-label), restoring per-node
  originals on toggle-back; composites via a `\b`-safe word regex + punctuation phrases (**single short words MUST go
  in the word-regex, never plain substring** — `'ago'→前` corrupted "Dragon"→"Dr前n"; fixed). Stage labels localized
  at the source (`第3-5关 · 折磨`). ~100% Overview/Runes; long FRAGMENTED help-text + `mini.html` are the known tail.
  Shipped everywhere (web on push; desktop v1.0.20 + v1.0.21 — **i18n file verified inside the installer asar**).
- **S23c (v1.0.19)** — **loot freshness (owner: "crafted/synthesized, nothing appeared; no refresh").** Detection
  verified sound (craft → untagged entry, 9-mat synthesis → ⚒️ Cube — on the next save READ); real causes: items
  land at the game's next save WRITE, long-uptime desktops can lose fs.watch silently (frozen HUD, no error), and
  no manual refresh existed. FIXES: main.js mtime-poll WATCHDOG (save 5s / Player.log 30s) backstops the watcher;
  Loot "↻ Refresh now" wired per connect path (one-shot drops honestly disabled) + "save written … ago" stamp +
  next-save-write timing notes. verify_save's per-stage tolerance now scales with tiny-window display rounding
  (false alarm on the live save's fresh 0.1h stage; engine math was correct).
- **S23b (v1.0.18)** — **adversarial-review patch (4 confirmed findings, fixed same-day).** KEY DISCOVERY:
  `cubeRecipeSaveDatas[].MaxUnlockRecipeKey` = the save's REAL per-category Cube unlock state (0 = none; keys
  ascend within a category) — calibrated by a committed backup showing ENGRAVING locked at Cube 17 despite its
  level-15 gate → **unlocking is a PURCHASE**. `cubeUnlocks()` in BOTH engines; the Advisor Cube panel's ✓/🔒
  now use the real records (no records → no claims); verify_save asserts validity + level-gate consistency.
  Also: synthesis bands display BOTH requirement columns (min material tier + avg level); grade-identity is now
  a HARD bake-time assert in build_gamedata; target-picker focus survives save-driven re-renders.
- **S23 (v1.0.17)** — **GOAL-v1.0.16 P5+P6 → the wave is COMPLETE (P1–P6).** (P5a) **Codex recipes:** dumped the
  5 recipe tables the original whitelist skipped (CubeRecipe/CubeSubRecipe/CubeLevel/SynthesisDrop/ExtractionCost;
  install verified byte-identical to the v1.00.11 dump first); build_gamedata bakes DB.crafting(56)/synth(203)/
  synthBands(25 — VERIFIED grade-independent per (type,tier), 0 mismatches; MaterialAmount==9 in all 533 rows ==
  the v1.0.8 Cube pattern)/cube(8 localized types + 31 sub-unlocks + XP curve)/extraction(90); recipe output pools
  resolve through the same DB.drops chain as box contents (bake-time integrity asserts). Codex detail: "The Cube
  can make this" (crafting w/ ingredient tiles + unlock level + pool size; synthesis w/ bands + the game's own
  rule quoted) + "The Cube uses this" on materials; Advisor "The Cube" panel (8 tooltipped categories, sub-recipes
  ✓/🔒 vs the player's Cube level). Weights/LevelWeights exist in the raw data but compose in game code → OMITTED;
  UnlockCost currency unlabeled → none claimed. Engines in parity (recipeIndex/craftRecipesFor/synthPoolsFor/
  cubeUsesOf/cubeSubFor/synthBandsFor in BOTH); verify_save: integrity + 17 lookup spot-checks vs independent
  re-derivation. (P5b) **Enchant crowd-calibration (opt-in, tuple-only):** both mod parsers now carry matKey +
  the resolved STATTYPE string (the save's raw StatType is NUMERIC — caught pre-deploy; the string from StatModKey
  matches the original 4/4 calibration); the Advisor lists each (gt, stone, rolled stat) tuple on uncalibrated
  gts and one explicit click POSTs exactly those 3 fields to api/enchant-report (whitelist: the 20 real GEARTYPEs;
  aggregate counters, no identifiers, flood ceiling). (P5c) **Crew hardening (tbh-crew-api REDEPLOYED):** tbh_rate
  Postgres fixed-window rate limiting (fail-open) on every endpoint; api/prune (Mode A self-remove via code+memberId
  — the pair that can already overwrite the row; Mode B stale prune with a SERVER-ENFORCED 7-day floor); Crew tab
  "Remove my data" button. Live smoke test test/_crew_smoke.js (gitignored like all test scripts): 10/10 incl. the
  429 path and a TRUTHFUL enchant-report round-trip (the live save's own calibrated helmet tuple). (P6) **Targets:**
  "Your target" panel on Overview — gold amount / rune level (priced from the per-level cost table; "ready now"
  when affordable) / level-locked find (hero's measured XP/hr) / stage (history's measured progression, PLAYED
  time) — ETAs ONLY from measured rates, honest measuring/idle states, auto-clears with 🎉 when met; tbh_target
  cleared on Disconnect + demo. Also: "Safe to let go" reason chips wrap @375 (nowrap overflow on real saves —
  the P2 sweep had demo data loaded, which has no dupes; SWEEP WITH THE REAL SAVE from now on); blue-chest findings
  doc precision-corrected (raw DropInfoData HAS a Weight column — the original sweep searched the baked DB; every
  chest-bearing pool is a uniform class-selector or single-entry → conclusion unchanged, stronger).
- **S22 (v1.0.16)** — **the power-user wave (GOAL-v1.0.16 P1–P4).** (P1) **Loot controls:** rarity chips + origin
  filter + search + sort + date headers + paged "show more" with real counts (stored cap 120→500); CSV/JSON export
  (timeline + offline rewards, local+UTC); offline-rewards table paged the same way; honest **"where's my chest?"**
  note counting the game's own `CreateSteamItem … items is empty` Player.log lines per box key (those boxes live
  Steam-side, never reach the save — file-verified in COMMON-BOX-STEAM-ROUTING-FINDINGS.md, committed). (P2)
  **Inventory controls:** search/type/sort + enchanted-only + equipped/unequipped toggles (worn dot), ⚖ Compare
  (two same-gt items side-by-side, neutral GearInfoData facts, no verdicts), and **"Safe to let go"** — provably-
  redundant spares: ≥ maxWearers(gt) strictly-better same-gt pieces wearable whenever it is (HIGHER rarity at
  lvl ≤ its own; same-rarity-higher-level never counts — higher requirement). maxWearers from calibrated structure
  only (class weapons 1 via hero-table MainWeapon; one-slot-per-hero types 6; accessories 18 conservative).
  `redundantDupes`/`maxWearersGt` in BOTH engines + verify_save invariants (unequipped, independent dominator
  recount, never simultaneously gearGaps-advised); hand-verified vs the scepter dump. NEVER "sell this" (salvage
  uncalibrated). (P3) **Blue-chest tracker — measured, never asserted:** the blue chest = RARE Stage Boss Box;
  NO drop % / NO 12-min cooldown in the game files (BLUE-CHEST-DROP-RATE-FINDINGS.md, committed) → the tracker
  logs each save-diffed RARE-STAGEBOX arrival {t, stage, playHours, n} (same-read boxes collapse; cap 400; in
  tbh_loot; demo-isolated), and the panel shows the player's OWN same-stage + after-stage-switch gap medians with
  sample sizes, gaps in PLAYED time (closed-game periods flagged via the calibrated 0.25h detector). (P4)
  **Desktop mini-HUD + settings + shortcuts:** frameless alwaysOnTop mini window (mini.html) fed by the dashboard
  over IPC (gold · session gold/hr · stage · offline timer ticking off the save anchor · next rune step; SAMPLE
  tag in demo; bounds+opacity persisted in userData/mini-hud.json; screen-saver z-level; closes with main);
  ⚙ Settings modal (density compact via --s* token override, motion auto/on/off, default tab on launch,
  rare alerts; mini controls Electron-gated); shortcuts 1–9/0 + ←/→ cycle + `/` focus-search (inputs never
  trapped, dialogs own the keyboard). Loot/inventory control state resets on Disconnect + demo.
- **S21 (v1.0.15)** — **slow-update fix.** Differential downloads were the culprit (solid-7z NSIS ⇒ diff ≈ full
  79 MB fetched as thousands of sequential range requests; measured full-stream 1 MB/s vs 68 ms/ranged-request on
  the owner's line; 1.0.14's temp file sat at 0 bytes). Now: `disableDifferentialDownload=true` (main.js),
  `nsis.differentialPackage:false` (NO .blockmap shipped — old clients auto-fall back to full download), banner
  shows MB + live speed. **RELEASE COMMAND CHANGED: no blockmap asset** —
  `gh release create v<ver> dist/TBH-HUD-Setup-<ver>.exe dist/latest.yml --latest`.
- **S20 (v1.0.14)** — **version clarity + Steam boxes explained + demo log isolation.** Footer now shows
  "app v…" on every platform (was Electron-only; browser had no visible app version) with game-v/app-v tooltips;
  Electron shell version surfaces only if it differs from APP_VERSION. Loot "Steam boxes you're holding": hint
  explains the counts are REAL (Player.log GetBoxCount lines, names from ItemInfoData), boxes clickable → Codex
  contents. HONESTY FIX: loadDemo now REPLACES logData with sample data (real boxes/offline rewards could
  previously render under the SAMPLE badge if a save had been connected first).
- **S19 (v1.0.13)** — **Crew deep-dive + Advisor density + click-through everywhere.** Crew payload now carries the
  COMPLETE rune-total list (≤40 effects, names ≤48 chars — the old top-6/32-char caps were why the board's stat list
  looked "cut"); click any member row → pop-up with all brag-stats + grouped Stat List + ALL rune totals + a
  **Compare with** selector (defaults to you; `isMeMember()` is demo-aware) highlighting the larger value per line.
  Advisor: "At a glance" cards + per-swap inherent-stat comparison (GearInfoData values, tooltip display rules,
  no per-stat better/worse claim) + tooltips/Codex clicks on advisor items. Global: items/trophies/hero gear/loot
  entries/stones → Codex page; rune cards → per-level table; Stat-List lines + rune chips filter the rune grid
  (`runeEffFilter`). `catalogFind(cat,key)` prevents rune-vs-item key collisions. Server caps widened (api/_lib.js)
  + tbh-crew-api redeployed. loot entries now record `key` (older entries stay non-clickable).
- **S18b (v1.0.12)** — **dark theme redesigned** after owner feedback ("no difference in dark mode"): v1.0.11 dark had
  kept the legacy navy palette; the new dark is a real counterpart of the light design — slate-indigo ground
  (#10141f), elevated cards (#1c2235+), stronger borders, periwinkle accents (#7d96ff ramp); rarity hues untouched;
  AA re-verified (test/_contrast.js); only the `[data-theme="dark"]` block changed. Also VERIFIED on this machine
  that v1.0.11 desktop auto-update genuinely applied (updater downloaded + relaunched on 1.0.11 within ~70 min of
  the release) — the "not updated" impression was the unchanged dark palette.
- **S18 (v1.0.11)** — **visual revamp + the game's grouped Stat List + patch notes.** (1) **Design system:** semantic
  tokens under `:root[data-theme="light"|"dark"]` — **light is the DEFAULT** (applied pre-paint in <head>; persisted
  `tbh_theme`; 🌙/☀️ toggle in header .actions before #disconnectBtn); dark = the old navy palette re-mapped (dim text
  lightened to #8491b6 for AA). NO raw hex in component CSS (tints = color-mix on tokens; legacy var names aliased in
  :root); **WCAG AA verified programmatically in both themes** (test/_contrast.js); rarity hues canonical (lightness-
  tuned on light). Uneven boxes fixed: shared `--track-*` grid tokens + auto-FILL + one `--s1..7`/radius scale +
  flex-column cards; 11 tabs × {375,768,1280} × both themes = 0 overflow. (2) **Stat List (CALIBRATED — see VERIFIED
  facts):** the in-game grouped Stat List IS the rune aggregate; `statListFull` in BOTH engines renders the 9
  calibrated lines (Exploration 6 + Combat 3) with the game's own `AccountStat_*` template wording; grouped panel on
  Runes (raw totals kept below); crew payload gained `statList` `{k,v}` (server-whitelisted to the 9 keys) → board
  shows every member's grouped list + rank-by-stat; uncalibrated effects OMITTED from the grouped view. (3) **Patch
  notes:** CHANGELOG.md at repo root + in-app ✨ "What's new" modal (embedded CHANGELOG const — works on file:// in
  Electron) with a first-run dot via `tbh_lastSeenVersion`. KEEP IN SYNC at release: the CHANGELOG const in
  dashboard.html, CHANGELOG.md, and the Release body.
- **S17 (v1.0.10)** — rune **Stat List** (additive reading structurally proven: all 135 multi-level runes have
  constant per-level vals + rising costs; derivation shown in-UI; in-game-screen confirmation requested) on the
  Runes tab + top-6 as a crew flex line (server-whitelisted `runeStats`); crew members on older app versions get
  an explanatory version tag; header now says "game vX" (vs the HUD's "app vX" in the footer); doc sweep
  (PROGRESS caught up on sessions 13b-17 + backlog; stale 9-tab/v1.0.3 claims fixed); verify_save asserts
  package.json == APP_VERSION == ?v=.
- **S16 (v1.0.9)** — offline/online research (see VERIFIED facts) → per-stage rates exclude offline-spanning
  intervals from XP/kills (gold counter proven immune, kept); Trends "Online vs offline" section (played vs away
  hours, farming vs offline gold, away gaps, exact Player.log collections); crew stale rows dimmed + freeze note;
  "offline grants XP" claim removed (only gold verified).
- **S15 (v1.0.8)** — Crew play-hours chip + rank option; per-tier GEAR-ONLY breakdown (crew chips + Flex:
  "2 Immortal · 6 Legendary"; `tierCounts` both engines; rarity-NAMED stones can never count; server `tiers`
  whitelist; tbh-crew-api redeployed). **Loot origin inference:** the tracker remembers per-instance
  material-ness; 1 new gear + ≥9 material instances consumed in one save update = Cube synthesis pattern →
  "⚒️ Cube (likely)"; nothing consumed → "✦ found" (drop/market still indistinguishable); mixed → untagged.
  Origin column on Loot; alert wording fixed ("new item", not "drop").
- **S14 (v1.0.7)** — Advisor **equip-gating** (item Level = equip requirement, calibrated 43/43; unwearable upgrades
  become 🔒 level-locked notices, never advice); obsolete "Stages read as Act X-Y" tip removed; **per-stage XP/hr**
  (trendPoint.xp = summed cumulative hero XP; delta over clean intervals) + session XP/hr card + best-gold/hr &
  best-XP/hr suggestions on Tips/Overview/Trends/Lifetime; **Enchanting workshop** (compact per-hero open slots +
  owned stones with the game's own per-category effects + calibrated "ready to use" matches). All mirrored in both
  engines; verify_save asserts the new invariants.
- **S13c (v1.0.6) — AUTO-UPDATE WAS NEVER WORKING IN ANY SHIPPED BUILD; fixed.** Proof: attached --inspect to the
  INSTALLED app's main process → `require('electron-updater')` throws Cannot find module (the try/catch made it a
  silent no-op: no check, no error, ever). Cause: electron-updater sat in devDependencies since day one, and
  electron-builder packs only production `dependencies` into the asar. **RULE: electron-updater MUST stay in
  "dependencies".** Fixed + verified by running the freshly built win-unpacked app under --inspect: module loads,
  a real packaged check round-trips (checking-for-update → update-not-available). Users on ≤v1.0.5 need ONE manual
  reinstall (README warns); from v1.0.6 updates are genuinely automatic. Prior "auto-update chain live" doc claims
  were wrong — corrected here, in PROGRESS (#17) and the README.
- **S13b (v1.0.5)** — update UX: "↻ Check for updates" header button (desktop; visible checking/none/error states,
  quiet in background), 4h periodic re-check (launch-only before — an always-open HUD never saw new releases, and a
  check minutes after a release could miss it while GitHub's CDN propagated), `checking`/`none` update-status relays,
  app version in the footer. Browser build untouched (button is Electron-gated).
- **S13 (v1.0.4) — 3 features + ship everywhere.** **F1 History + per-stage gold/hr:** HUD-own snapshot history
  (IndexedDB `tbh-hud-history`; append in `onBytes`, load at startup, merge with backups, clear on Disconnect) +
  `perStageRates` (combat counter Type 2/Sub 1 over CLEAN single-stage intervals; offline gold auto-excluded) →
  Trends "Farming rate by stage" ranking + Lifetime measured "best farming stage" (replaces the deferral) + Overview
  one-liner. **F2 Advisor tab (10th):** provable gear-gap upgrades (same GEARTYPE, strictly better — higher rarity or
  same-rarity-higher-level; greedy 1:1; hand-verified vs the full gear dump), cheapest-first rune plan within gold
  (real `DB.runes[].lv` costs + save-for), open enchant slots on the deployed party; Party breakdown gained a **Total**
  row (`statTotals` = base+gear+tree summed). **F3 Crew tab (11th, goal #14) — OPT-IN:** crew code + display name, share
  toggle OFF by default, pushes ONLY calibrated brag-stats (never the save), ~30s polling, rank-by, achievements from
  snapshot deltas (server-derived), gap-to-you, copy invite; demo mode hard-disables sharing. Backend `api/progress.js`
  + `api/leaderboard.js` (Vercel serverless + `@neondatabase/serverless`) + Neon `tbh_crew_*`, deployed as
  **tbh-crew-api** (separate Vercel team; DATABASE_URL in Vercel env, never committed; CORS allowlist), verified
  live end-to-end. **Engine parity verified in-browser** (inline == Node on the same save) + verify_save.js invariant
  assertions for all new fns. 11 tabs, 0 console errors, 0 overflow @375; Electron clean; v1.0.4 released.
**The v1.0.2 → v1.0.3 wave (sessions 7-12).** The 1.0.2 line was built but never published; v1.0.3 superseded it.
- **S12 (v1.0.3)** — Lifetime **Gold by source** (Type 2 subs sum-validate; Sub1=combat, delta-confirmed → "combat 99.5% / other 0.5%"; "Cube gold" honestly inside the ~0.5% "other", not fabricated). **Per-monster base gold/xp** (MonsterInfoData → `DB.monsters {n,g,x}`). Honest **best-farming-STAGE** answer (not derivable — no stage→monster map + per-stage rate needs the memory lane). Bug fix: `el()` dropped-sibling had hidden Owned-by-rarity since S7 → `frag()`. **Electron smoke-tested** (`npm start` clean). `goldBySource` in both engines + a verify_save assertion.
- **S11 (v1.0.2)** — **Per-hero "time to next level"** (XP remaining ÷ session-measured XP/hr; `heroCumXp`/`heroLevelEta`/`ensureSession`; cards + roster). **Fixed blank-first-paint** (render() now un-hides the active tab — affected browser + Electron). Keyboard `:focus-visible`. Suggestion-strip + snappier tabs. Visual audit (cohesive, responsive @375).
- **S10 (v1.0.2)** — **Refresh-reconnect** (handle in IndexedDB; `restoreHandle`/`forgetHandles` + 1-click Reconnect). **Blocked-folder fix** ("contains system files"): "Trouble connecting?" help + universal **drag-drop** of the .es3 (bypasses the blocklist). **Flex card** + honest "no live DPS" Who's-carrying. "See a demo" + amber **SAMPLE** badge. Market-buy origin not isolable → honest note.
- **S9 (v1.0.2)** — **Tips tab (9th):** calibrated suggestions (unspent points, empty gear slots, cheapest affordable rune vs gold [all 663 rune costs = Gold, CostItemKey 100001], stash near full, bench heroes, stagnation) + 10 game tips + honest limit note. **Loot:** craft-vs-drop not separable → "New items" + note; dual local+UTC timestamps; `cube` exposed. **Session:** full re-parse = no stale data; gold/hr uses lifetime gold (spend-proof).
- **S8 (v1.0.2)** — Multi-user confirmed (static client-side reader; clean-slate `disconnect()`); **auto-update banner** (main.js events → preload `onUpdate`/`restartToUpdate` → in-app banner; `autoInstallOnAppQuit`); **uninstall** confirmed + polished (Add/Remove Programs entry + display name/shortcuts). README FAQ.
- **S7 (v1.0.2)** — **DATA HONESTY:** removed the shipped per-difficulty fabrication (Type 16, disproven by the Normal-only save) from engines/renderer/demo/README; verify_save asserts it. **Stages** decode to "Act X-Y" + real names (`stageLabel`/`stageActLabel`/`stageName` + `DB.stages`). Plain Overview (no Σ). 3-step connect + **Disconnect** (`setConnectedUI`). First-visit polish (`.hint`, no-save placeholder).

**Foundation (sessions ≤6, v1.0.0 → v1.0.1):** authoritative DB from the game's own CSV TextAssets (build_gamedata.py) — items / gear / stats / skills / heroes / attributes / passives / pets / monsters / runes / levels / stages / drop chain + en-US localization; 535 item + 39 rune icons. Premium 9-tab dashboard incl. **Codex** (full catalog, audit 100% / 6177), Party "who's carrying" source breakdown, real XP-to-next (LevelInfoData), Loot/Player.log, **Trends** (save backups), offline-rewards card (cap LEARNED from logs, TZ-corrected). NSIS installer + electron-updater + GitHub Pages (HTTPS); Releases v1.0.0 & v1.0.1 published. Fully responsive; Vercel-ready. (Full trace: improvement.log + git log.)

## Next (priority order) — acceptance criteria in docs/PRD.md
0. **i18n follow-up (started v1.0.21):** finish the long FRAGMENTED help/advisor sentences (split by inline `<b>`/
   `<span>` so the DOM translator can't exact-match — need source-level wrapping or de-fragmenting) and translate
   `mini.html`'s own labels (it already gets the localized stage label over IPC). Pattern + data: [[tbh-i18n-language-switch]].
   Also: the band difficulty map ([[tbh-stage-difficulty-decode]]) is corroborated but NOT save-verified past Normal —
   confirm the exact Nightmare key on the owner's first Nightmare clear.
1. **v1.0.21 is SHIPPED everywhere — difficulty-labeled stages (v1.0.20) + the English/简体中文 language switch (v1.0.21)** — desktop release (installer +
   latest.yml; **no blockmap since v1.0.15** — differential updates disabled for speed; auto-update WORKS from
   v1.0.6 on — older installs need one manual reinstall, see S13c), GitHub Pages on push, the owner's Vercel
   project (`mathew-mercado-s-projects/taskbarheroburat`) auto-deploys from the repo, and the **crew API is live**
   at `https://tbh-crew-api.vercel.app/api` (Vercel project `tbh-crew-api` — scope noted in `OPS-PRIVATE.local.md`,
   gitignored; Neon Postgres; DATABASE_URL in Vercel env only; redeploy it ONLY when api/* changes — last redeploy
   S23 with rate limiting + prune + enchant-report). To ship the NEXT version: bump `package.json` + `APP_VERSION`
   + the `?v=` cache-bust (gamedata.min.js AND i18n_zh.min.js) + add the CHANGELOG entry (const in dashboard.html AND CHANGELOG.md), `npm run dist`,
   then `gh release create v<ver> dist/TBH-HUD-Setup-<ver>.exe dist/latest.yml --latest`.
2. **Calibrations awaiting data:** the enchant gt→category map for GLOVES/BOOTS/RING/AMULET/EARING/BRACER +
   offhands — the opt-in crowd-calibration (S23) now collects tuples in `tbh_enchant_reports`; when a gt has
   multiple consistent confirmations that match the stone's own fx table, promote it in gtGroup/gtGroupD (BOTH
   engines) and re-verify. One in-game enchant on each type from the owner's save also calibrates it directly.
3. **Optional:** move the crew API under the owner's `taskbarheroburat` Vercel project (attach Neon storage there →
   auto-injects DATABASE_URL → change the `CREW_API` constant in dashboard.html; ONE canonical API at a time or crews
   split); sign the installer (cert); Clerk auth on the crew API; mini-HUD tray icon + global hotkey; the owner's
   Playwright scaffolding (untracked: playwright.config.js + tests/) — wire real browser tests onto it if wanted.

### Deferred / deliberately NOT built (golden rule — ban-safe / uncalibrated)
- **Phase 4 live telemetry** — per-run DPS, clear-time, gold/hr & xp/hr PER ACT, per-hero DPS share — needs reading game memory (CodeStage `[ACTk]` anti-cheat). Don't build unless provably ban-safe; the save + log lanes cover what's safe.
- **Steam Market value** — Inventory Service throttled/empty this build (`CreateSteamItem … items is empty`).
- **No calibrated signal → omitted:** per-item origin (craft vs drop vs market-buy); standalone "Cube gold" (bundled in the ~0.5% "other" gold bucket); per-stage XP/hr (no calibrated lifetime-XP aggregate — per-stage gold/hr + kills/hr ARE measured now, see VERIFIED facts); uncalibrated aggregate Types 16/4/5/7/9/10/15; 12-min blue-chest (no 720s in DropCooldown); Korean ItemGroup names; per-item drop %; stat MULT/ADD % meaning (shown raw + modtype tag).

## Build / run  (app v1.0.19 · light/dark themes · fully responsive: phone/tablet/desktop)
- **Crew API (v1.0.4):** `api/progress.js` + `api/leaderboard.js` run as Vercel serverless functions; canonical live
  endpoint = `https://tbh-crew-api.vercel.app/api` (the `CREW_API` constant in dashboard.html). Vercel project
  `tbh-crew-api` (separate Vercel team — CLI scope recorded in `OPS-PRIVATE.local.md`, gitignored); env var
  `DATABASE_URL` = a Neon Postgres URL (NEVER committed — beware: piping it via PowerShell `|` adds a BOM that breaks
  `neon()`; write to a temp file and `cmd /c "vercel env add ... < file"`). Tables `tbh_crew_members` /
  `tbh_crew_history` auto-create on first request. The same /api files also deploy with the owner's site project —
  harmless without a DATABASE_URL there (they return an honest 503).
- Browser (no install): **https://revenantcabal-rgb.github.io/taskbarheroburat/** (GitHub Pages, HTTPS; bare URL works via
  index.html) -> Connect folder. Or open `dashboard.html` locally in Chrome/Edge. `?codex` browses the full catalog with no
  save; `?demo` loads sample data. NOTE: bump `?v=` on the `gamedata.min.js` script tag when the DB changes (cache-bust).
- Browser (Vercel, 2nd live host): the owner's Vercel project **auto-deploys from this repo on every push**
  (https://taskbarheroburat.vercel.app/, verified live). CLI deploys here use a separate Vercel team — scope kept
  out of the repo (see `OPS-PRIVATE.local.md`, gitignored).
- Desktop: `npm install` then `npm start` (Electron; auto-finds the save, watches it, auto-updates from GitHub releases).
- Installer: `npm run dist` -> `dist/TBH-HUD-Setup-<ver>.exe`. **winCodeSign note:** building on a non-admin box without
  Developer Mode hits a symlink-extract error; `package.json` sets `win.signAndEditExecutable=false` +
  `verifyUpdateCodeSignature=false` to skip the winCodeSign fetch (we don't sign / have no .ico). To SIGN later, provide a
  cert (WIN_CSC_LINK) and re-enable those, with Developer Mode/elevation so winCodeSign extracts.
- Release/auto-update: `gh release create v<ver> dist/TBH-HUD-Setup-<ver>.exe dist/latest.yml --latest` (electron-updater reads latest.yml). **No `dist/*.blockmap` since v1.0.15** — differential downloads are disabled (they were pathologically slow; see S21).
- Full-catalog audit: `node scripts/audit_catalog.js`. Live-save check: `node scripts/verify_save.js` (incl. offline tz check).
