Read these in full, then work autonomously: CLAUDE.md, docs/PRD.md, improvement.log, docs/GOAL.md.
Execute docs/GOAL.md Phases A -> B -> C in order, alternating to keep the app shippable.
READ-ONLY always (CodeStage [ACTk] anti-cheat) — never write/inject game/save/memory.
NEVER fabricate — calibrate every label from the game's own tables/localization (scripts/_gamedata_raw, src/engine/localization.min.json); honest fallback or omit.
Verify EVERY change vs the LIVE save (node scripts/verify_save.js + headless browser, all tabs, 0 console errors).
Commit + push each step; keep CLAUDE.md + docs/PROGRESS.md + improvement.log current.
End with: shipped, calibration evidence, coverage %, confidence 1-10, exact next step.
