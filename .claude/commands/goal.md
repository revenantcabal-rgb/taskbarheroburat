Read in full: CLAUDE.md, docs/PRD.md, improvement.log, docs/PROGRESS.md, docs/GOAL.md.
The app is SHIPPED (v1.0.1) - do NOT rebuild completed work; check PROGRESS.md + improvement.log for what is DONE.
Execute docs/GOAL.md in order (current: P1 data-honesty fix -> P2 stage display -> P3 overview clarity -> P4 connect/disconnect -> P5 UI polish). These were found by REAL use - people must see ONLY what is TRUE in their own save.
READ-ONLY always (CodeStage [ACTk] anti-cheat) - never write/inject game/save/memory.
NEVER fabricate - calibrate every label from the game's own tables/localization (scripts/_gamedata_raw); honest fallback or OMIT.
Verify EVERY change vs the LIVE save (node scripts/verify_save.js + headless browser, all 8 tabs, 0 console errors).
Commit + push each step; keep CLAUDE.md + docs/PROGRESS.md + improvement.log current.
End with: shipped, calibration evidence, confidence 1-10, exact next step.