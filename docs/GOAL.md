# TBH HUD — GOAL (Session 6).  `/goal` reads this. CONTINUE; do NOT redo shipped work.
Read CLAUDE.md + docs/PRD.md + improvement.log + docs/PROGRESS.md FIRST. Read-only, calibrated, verify vs the LIVE save,
commit + push each step. Golden rule: a helper, never bannable; never fabricate — every label from the game's own tables.

## SHIPPED (do NOT rebuild) — v1.0.1
Phases 2/3/5/6/A/B/7 + who's-carrying + loot/lifetime + rune panel + real XP-to-next + full responsiveness + NSIS installer
+ GitHub Pages (live) + electron-updater. 8 tabs, audit 100% over 6177 catalog entries. All committed + pushed.

## FOCUS — two workstreams; alternate so the app stays shippable:

### 1. INSTALLER SIGNING — the NO-MONEY path (do NOT buy a cert)
Reality (verified): a self-signed cert does NOT remove SmartScreen (untrusted -> still warns). Every TRUSTED cert costs money
EXCEPT free open-source programs (SignPath Foundation / SSL.com OSS / OSSign), and even a free OV signature only earns
SmartScreen trust as download reputation builds (only paid EV is instant). So:
- Make the BROWSER version (GitHub Pages link) the PRIMARY "give this to friends" path in README + the app's about/help —
  it has NO SmartScreen at all.
- Keep the installer UNSIGNED but document the one-time "More info -> Run anyway" clearly (README + short FAQ), like tbh-meter.
  Unsigned != unsafe.
- Wire the signing PIPELINE so it is drop-in once a free OSS cert is obtained: env-var cert path
  (WIN_CSC_LINK/WIN_CSC_KEY_PASSWORD, re-enable win.signAndEditExecutable + verifyUpdateCodeSignature only when a cert is
  present). Write docs/SIGNING.md: the free routes (SignPath Foundation etc.) + the honest reputation caveat. DO NOT claim it
  is signed until a real cert actually signs it; never commit a cert.
AC: README + about lead with the browser link; installer "Run anyway" documented; docs/SIGNING.md written; signing config in
place behind env vars; build still produces the unsigned installer cleanly; nothing fabricated.

### 2. CODEX DEPTH (calibrated from the game's own tables; read-only)
- Crafting recipes: CraftingRecipeInfoData (CraftingRecipeKey, ItemCraftingType, RecipeTier, Material, MaterialIndex, DropKey).
  Show "crafted from [materials]" + result(s) via DropKey in the Codex detail modal.
- Synthesis recipes: SynthesisRecipeInfoData (MinMaterialTier, MinResultLevel, ItemSynthesisType, GRADE, MaterialAmount,
  LevelWeight1-4). Show "synthesize N x [tier] -> [grade] result".
- Drop RATES: DropInfoData has a `Weight` column (+ HeroKeyCondition). Compute per-member drop % = Weight / sum(Weight) within
  the DropKey/ItemGroup; show the % next to each box-content item; flag per-hero conditional drops where HeroKeyCondition set.
  CALIBRATE: the percentages within a group must sum to ~100%.
- SET BONUSES: NONE exist in the game data (no set table/column in GearInfoData/UniqueModInfoData/ItemInfoData). DO NOT build
  set bonuses — it would be fabrication. Note the absence and omit.
Bake recipe + drop-weight maps into scripts/build_gamedata.py (DB.recipes, DB.dropRates); rebuild; mirror in saveEngine.js +
inline engine; surface in the Codex modal. Extend scripts/audit_catalog.js to assert recipe + drop-rate resolution.
AC: Codex modal shows recipes + drop % (summing ~100% per group) + per-hero drop conditions; NO fabricated sets; audit passes;
0 console errors live + demo across all 8 tabs.

## DEFERRED (note, never guess)
Live DPS / combat memory (ban risk); per-act gold/hr & clear-time (memory lane); Steam Market value (throttled/empty);
12-min blue-chest (no 720s); Korean ItemGroup names; item SETS (do not exist in the data).

## LOOP & DONE
After each sub-task -> verify vs LIVE save (node scripts/verify_save.js + headless, all 8 tabs, 0 errors) -> commit -> push ->
update CLAUDE.md + docs/PROGRESS.md + improvement.log. Full regression ~45min.
DONE = both workstreams shipped (signing pipeline + docs + browser-first; Codex recipes + drop-rates, no sets); all calibrated
+ verified + pushed; docs current; end summary (shipped, calibration evidence, confidence 1-10, exact next step).
