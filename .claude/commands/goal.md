Read in full: CLAUDE.md, docs/PRD.md, improvement.log, docs/PROGRESS.md, docs/GOAL.md.
CONTINUE from the current state — check PROGRESS.md + improvement.log for what is DONE, then START at the first PENDING phase in
docs/GOAL.md (currently Phase A — full-catalog Codex). Do NOT rebuild completed work (Phases 2/3/5/6, #2 who's-carrying,
#3 loot/lifetime, rune panel are DONE). Work autonomously 2-3h, no stopping unless truly blocked.
READ-ONLY always (CodeStage [ACTk] anti-cheat) — never write/inject game/save/memory.
NEVER fabricate — calibrate every label from the game's own tables/localization (scripts/_gamedata_raw, src/engine/localization.min.json); honest fallback or omit.
Verify EVERY change vs the LIVE save (node scripts/verify_save.js + headless browser, all tabs incl. Codex, 0 console errors).
Commit + push each step; keep CLAUDE.md + docs/PROGRESS.md + improvement.log current after every change.
End with: shipped, calibration evidence, coverage %, confidence 1-10, exact next step.
