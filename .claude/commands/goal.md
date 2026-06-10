Read in full: CLAUDE.md, docs/PRD.md, improvement.log, docs/PROGRESS.md, docs/GOAL.md.
The app is SHIPPED (v1.0.1) - do NOT rebuild completed work; check PROGRESS.md + improvement.log for what is DONE.
Execute the FOCUS workstreams in docs/GOAL.md (current: installer NO-MONEY signing pipeline + Codex depth), alternating to keep the app shippable. Work autonomously 2-3h, no stopping unless truly blocked.
READ-ONLY always (CodeStage [ACTk] anti-cheat) - never write/inject game/save/memory.
NEVER fabricate - calibrate every label from the game's own tables/localization (scripts/_gamedata_raw); honest fallback or omit.
Verify EVERY change vs the LIVE save (node scripts/verify_save.js + headless browser, all 8 tabs, 0 console errors).
Commit + push each step; keep CLAUDE.md + docs/PROGRESS.md + improvement.log current.
End with: shipped, calibration evidence, confidence 1-10, exact next step.