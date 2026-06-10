# TBH HUD — Changelog (improvement log / trace)

Chronological record of what shipped, grounded in git history. Status vs. the plan lives in
[PROGRESS.md](PROGRESS.md); the plan is [PRD.md](PRD.md). Newest session first.
Add an entry at the end of every working session (commit range + what changed + how it was verified).

---

## Session 2 — 2026-06-10 (commits `5ead8a8` … `11a1ec7`)
Theme: harden + close coverage gaps. Drove the dashboard headless vs `?demo` and the live save throughout.

- **`5ead8a8` fix** — hero cards silently dropped level/XP/gear-meta on every hero (demo + live). Cause: `el()`
  returned only `t.content.firstChild`, discarding 3 of `heroCard`'s 4 sibling divs. Added `frag()`. Added
  `scripts/verify_save.js` (read-only Node snapshot + fabrication/icon-coverage audit).
- **`1ebbb85` feat** — gear inherent stats + unique mods in tooltips. New `DB.gear` (5440 entries, 127 unique mods)
  from GearInfoData + UniqueModInfoData. **Did NOT** label BaseStat1/2 (no GearTypeInfoData) or invent a power score.
- **`83a9e34` chore** — gitignore `*.es3.bak` / `*.bak` / `test/` (the old `*.es3` missed rolling backups).
- **`44647e3` feat** — **History/Trends tab (Phase 6)**: SVG charts of lifetime gold / kills / max-stage /
  gold-per-hr from the game's rolling save backups. New browser `Connect folder` (showDirectoryPicker) + Electron
  backup IPC. `trendPoint`/`buildTrends` in both engines. Verified ~24.7h, 10 points, gold/hr 36k→92k.
- **`541eb7f` feat** — **Player.log loot integration (Phase 5)**: Steam boxes held (real DB names), offline-reward
  gold (real Unix timestamps), save-diff drops (now stamped with the save's own time). No fabricated blue-chest timer.
- **`989c7c4` feat** — equipped skill names on heroes. New `DB.skills` (36 named) → chips on cards + roster column.
- **`36e2d24` polish** — honor `prefers-reduced-motion` (accessibility).
- **`11a1ec7` feat** — "Who's carrying" gear-strength ranking on Overview (factual Σ item-level + top rarity,
  labeled "not live DPS").
- **`fdd5276` docs** — CLAUDE.md updated to reality (features, bug, deferrals).

Verified: all 7 tabs render with 0 console errors vs live save AND demo; Node engine parity re-confirmed vs the
freshest live save (43 items, 0 unresolved names, 100% icons). Read-only re-audited — zero writes/injection.

---

## Session 1 — 2026-06-10 (commits `73d949d` … `26d9919`)
Theme: build the foundation through Phase 3 + authoritative calibration.

- **`73d949d`** — initial commit: save engine (decrypt+parse+analytics), Electron shell, first dashboard.
- **`c4efbf2`** — Phase 2: extracted the full 535-icon item set + structural icon resolver.
- **`e606532`** — Phase 3: premium multi-tab dashboard (Overview/Party/Inventory/Loot/Lifetime).
- **`98605cd`** — docs: marked Phase 2 & 3 done.
- **`233d7d2`** — authoritative item names + enchant/rune localization from the game's own tables (no guessing).
- **`4632339`** — docs: documented the game data tables; corrected the 342041 note.
- **`ee62fe8`** — full-catalog coverage: item descriptions, material effects, rune tree (calibrated).
- **`26d9919`** — docs: added the autonomous session brief (SESSION-GOAL.md).

Outcome: Phases 1–3 complete; DB calibrated from the game's CSV TextAssets; verified vs the live save.
