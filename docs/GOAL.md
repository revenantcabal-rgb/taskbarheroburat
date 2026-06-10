# TBH HUD — GOAL (per phase).  `/goal` reads this.
Read CLAUDE.md + docs/PRD.md + improvement.log FIRST. Read-only, calibrated, verify vs the LIVE save, commit+push each step.
Golden rule: a helper, never game-breaking, never bannable; never fabricate — every label from the game's own tables/localization.

## COVERAGE REALITY (calibrated vs gamedata.min.json — built from the game's OWN master tables, NOT from what the owner has collected)
- items 5944: **name 100%, icon 100%, grade 100% of gear** (125 materials are g:null by design). So EVERY endgame item the
  owner has never seen is ALREADY in the DB with name+icon+rarity+effects. The low-level live save only verifies the ~40 OWNED.
- materials 125: 115 have full description + effects (`fx`: which stat per equip type); 10 (150001-150010) are unnamed
  placeholders -> honest fallback. runes 197, skills 36, stats 62, gear 5440 — all from the tables.
- The game ships only 115 ItemDescription strings: gear has NO flavor text (it's defined by STATS, which we have via DB.gear +
  enchants). "A description for every item" is impossible by the game's own design — show desc where it exists, stats/effects
  otherwise, honest "no description" never a guess.
- NOT yet done: full-catalog RENDER audit (dashboard verified only vs owned items); stage-box contents surfaced;
  OfflineRewardInfoData dumped.
- Confidence now: ~9/10 on DATA, ~7/10 on SURFACED+VERIFIED. This GOAL closes it to 10.

## PHASE A — FULL-CATALOG COVERAGE + CODEX (owner's #1 ask: every item, not just a low-level account's)
1. Codex view: browsable grid of the ENTIRE catalog (all 5944 items + 125 materials + 197 runes + 36 skills), each with real
   name + icon + rarity + level + description/effects, independent of ownership. Filter by type/rarity/gearType; mark owned vs not.
2. Surface descriptions + material effects (`fx`) + gear inherent stats + enchant mods in EVERY tooltip (owned AND not-owned).
3. Stage boxes: resolve DropKey -> DropInfoData -> ItemGroupInfoData -> member ItemKeys -> EN names; show "this box can contain:
   [items]" even though the group NAME is Korean (omit the Korean label, never guess it).
4. Full-catalog audit: extend scripts/verify_save.js (or new scripts/audit_catalog.js) to validate ALL 5944 items + runes +
   materials headless — assert 0 missing name, 0 missing icon, desc present where the game provides; print coverage %.
5. (Optional cross-check) https://www.tbhwiki.com is COMMUNITY data — use ONLY to cross-check or fill what the tables don't expose
   in English (Korean stage-box names, drop rates). LABEL anything wiki-sourced; the game's own tables ALWAYS win on conflict.
AC: Codex shows every item correctly; audit reports 100% name+icon across 5944; 0 console errors live + demo, all tabs.

## PHASE B — OFFLINE-CAP / RESET TIMER (save-only, safe)
1. Dump OfflineRewardInfoData (re-run scripts/dump_textassets.py for it) — extract the REAL offline cap + accrual rate. DO NOT
   assume 8h; calibrate the actual value from the table.
2. Countdown card from save `lastSavedTime`: show time-idle, reward banked, and time-until-cap ("offline rewards max in Xh Ym" /
   "capped — collect now"). Calibrate vs the Player.log [OfflineReward] deltas (saved/now/delta/reward) until they match exactly.
3. Server reset: only show a daily/server reset if a table actually evidences one. The offline cap is RELATIVE to lastSavedTime,
   not a fixed clock — DO NOT invent a reset time. "Best time to go offline" = anytime; just return before the cap.
AC: timer matches the game's offline accrual exactly.

## PHASE C — RUNE PANEL + "WHO'S CARRYING" full breakdown (save-only, safe)
1. Rune-tree panel: real names + icons + per-node current level + cheapest-next-upgrade + category (RuneInfoData/RuneLevelInfoData
   JOIN save RuneSaveData).
2. "Who's carrying" full source breakdown per deployed hero: base HeroInfoData / gear (DB.gear inherent + enchants) / tree
   (AttributeInfoData JOIN attributeSaveDatas + unlockedAttributeGroupKeys) / passives (PassiveSkillInfoData) / runes / pet
   (PetInfoData via ArrangedPetKey). LABEL gear/build power, NOT live DPS. No XP-to-next/ETA (no level curve in tables).
AC: both render save-only, calibrated, 0 console errors.

## DEFERRED (golden rule — note, never guess)
Live DPS/combat memory reading; per-act gold/hr (needs memory); Steam Market value (Inventory Service throttled/empty this build);
12-min blue-chest timer (no 720s in DropCooldown); Korean ItemGroup names (show box CONTENTS only).

## LOOP & DONE
Loop: pick -> implement (calibrated, read-only) -> verify vs LIVE save (node scripts/verify_save.js + headless, all tabs, 0 errors)
-> commit -> push -> update CLAUDE.md + docs/PROGRESS.md + improvement.log -> repeat. Full regression ~45min.
DONE = A + B + C shipped, audit reports full catalog coverage, every label calibrated + verified, provably read-only, all pushed,
docs current; end summary (shipped, calibration evidence, coverage %, confidence 1-10, exact next step). Target: 10/10 coverage.
