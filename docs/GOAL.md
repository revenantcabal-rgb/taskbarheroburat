# TBH HUD — GOAL (Session 7: HONESTY + UX).  `/goal` reads this. CONTINUE; do NOT redo shipped work.
Read CLAUDE.md + docs/PRD.md + improvement.log + docs/PROGRESS.md FIRST. Read-only, calibrated, verify vs the LIVE save,
commit + push each step. The user found these by REAL use; the #1 rule: people see ONLY what is TRUE in their own save.

## P1 — DATA HONESTY (CRITICAL — a shipped fabrication; fix first)
- REMOVE the "per-difficulty completions" (Normal/Nightmare/Hell/Torment) on Lifetime. It is an UNCALIBRATED GUESS,
  DISPROVEN by the live save: the account has only played NORMAL up to Act 2 (maxCompletedStage 1210, currentStageKey 1208),
  yet aggregate Type 16 = [259,176,82,1] would claim Nightmare 176 / Hell 82 / Torment 1. aggregate Types 16/4/5/7 are NOT
  confirmed to be per-difficulty. Per the golden rule (unconfirmed counters shown only if calibrated, else omitted), OMIT them.
- AUDIT every tab (Lifetime especially) for ANY stat shown without calibration; omit or label honestly "unconfirmed".
- KEEP only validated aggregates: Type 2/Sub0 = lifetime gold (calibrated); Type 0 = total kills + per-monster kills
  (validated: sub-counters sum exactly to total). Everything else: omit until a KNOWN-VALUE calibration confirms its meaning.
- verify_save.js / audit: assert nothing on Lifetime claims progress the save does not support (e.g. higher-difficulty
  completions for a Normal-only account).

## P2 — STAGE DISPLAY (truth, not raw keys)
- Never show the raw stageKey. Decode: act = floor(stageKey/100)-10, stage = stageKey%100 (VERIFIED: 1208 = "Act 2-8"
  per tbh-meter; StageName_1101 = "Pasture" = Act 1-1). So 1210 -> "Act 2-10". Show "Act X-Y" + the real stage name from
  StageName_<key> (30 names in localization.min.json) where present. Fix EVERYWHERE stage appears (Trends, Overview, etc.).

## P3 — OVERVIEW CLARITY (no jargon)
- The party summary "90 Σlvl · 6 gear · Legendary" + an unlabeled bar are cryptic. Replace with plain words a new user
  understands (e.g. "Total level 90 · 6 gear equipped · best Legendary") and LABEL the bar (what it measures) + a tooltip.
  No Σ / abbreviations / unexplained bars anywhere.

## P4 — CONNECT FOLDER: baby-simple + DISCONNECT
- Make connecting effortless: clear on-screen step-by-step (exact folder path, "pick the TaskbarHero folder", what to click),
  understandable by a non-technical user. Keep the existing privacy note (all local, read-only).
- Add a "Disconnect / Change folder" control (logout): clears the loaded save + handle and returns to the connect screen,
  so a user (esp. on the hosted site) can disconnect or switch to a different save.

## P5 — UI POLISH (the hosted / Vercel-facing experience)
- General polish toward a cleaner, friendlier look for first-time visitors on the web version; keep it responsive + fast.

## DEFERRED (note, never guess)
Live DPS/combat memory; per-act gold/hr; Steam Market value (throttled/empty); 12-min blue-chest; Korean ItemGroup names;
per-individual-item drop % (no within-group weights); item sets (don't exist); the meaning of aggregate Types 16/4/5/7/9/10/15
(omit until calibrated). The earlier Session-6 Codex depth (recipes + group-level drop rates) is still open AFTER P1-P5.

## LOOP & DONE
After each fix -> verify vs LIVE save (node scripts/verify_save.js + headless, all 8 tabs, 0 errors) -> commit -> push ->
update CLAUDE.md + docs/PROGRESS.md + improvement.log. Full regression ~45min.
DONE = P1-P5 shipped; NOTHING on any tab claims progress the save doesn't support; stages show "Act X-Y" + names; Overview
labels are plain + the bar is labeled; connect flow is idiot-proof with a disconnect button; UI polished; all pushed; docs
current; end summary (shipped, calibration evidence, confidence 1-10, next step).
