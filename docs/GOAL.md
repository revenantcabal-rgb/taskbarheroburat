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
- Crafting recipes — REAL: CraftingRecipeInfoData (56 rows: CraftingRecipeKey, ItemCraftingType, RecipeTier, Material,
  MaterialIndex, DropKey). Show "crafted from [materials]" + the result (the DropKey, which resolves through the drop chain).
- Synthesis recipes — REAL: SynthesisRecipeInfoData (533 rows: MinMaterialTier, MinResultLevel, ItemSynthesisType, GRADE,
  MaterialAmount, LevelWeight1-4). Show "synthesize N x [tier] -> [grade] result".
- Drop RATES — calibrate, do NOT over-claim. DropInfoData (6212 rows, 245 DropKeys) has a `Weight` column; within a DropKey
  the weights form a clean distribution that sums to ~100% (VERIFIED on a sample DropKey). BUT most reward entries are item
  GROUPS (REWARDTYPE ITEMGROUP), not single items, and ItemGroupInfoData has NO per-item weight; some entries are hero-only
  (HeroKeyCondition) and DropType varies (EachDropOneWeight / _DLCVariant / SelectOneByClass). So: show the GROUP/reward-level
  drop % (Weight/sum, summing ~100% per DropKey); flag per-hero drops; show DropType. Do NOT fabricate a precise per-individual
  -item % where within-group has no weights — show the group % (and "items equally likely" only if confirmed) or omit it.
- SET BONUSES: NONE exist (VERIFIED: no "set" column in any table, no set-bonus/effect string in localization, no Korean 세트
  anywhere). DO NOT build set bonuses — it would be fabrication. Note the absence and omit.
Bake recipe + drop-weight maps into scripts/build_gamedata.py (DB.recipes, DB.dropRates); rebuild; mirror in saveEngine.js +
inline engine; surface in the Codex modal. Extend scripts/audit_catalog.js to assert recipes resolve + group weights sum ~100%.
AC: Codex modal shows recipes + GROUP-level drop % (sum ~100%/DropKey) + per-hero/DropType flags; NO fabricated per-item % or
sets; audit passes; 0 console errors live + demo across all 8 tabs.

## DEFERRED (note, never guess)
Live DPS / combat memory (ban risk); per-act gold/hr & clear-time; Steam Market value (throttled/empty); 12-min blue-chest
(no 720s); Korean ItemGroup names; precise per-individual-item drop % (no within-group weights); item SETS (do not exist).

## LOOP & DONE
After each sub-task -> verify vs LIVE save (node scripts/verify_save.js + headless, all 8 tabs, 0 errors) -> commit -> push ->
update CLAUDE.md + docs/PROGRESS.md + improvement.log. Full regression ~45min.
DONE = both workstreams shipped (signing pipeline + docs + browser-first; Codex recipes + honest group-level drop-rates, no
fabricated per-item % or sets); all calibrated + verified + pushed; docs current; end summary (shipped, evidence, confidence 1-10, next).
