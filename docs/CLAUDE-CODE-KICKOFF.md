# Kickoff prompt for Claude Code  — HISTORICAL

> **Historical (long superseded; superseded; see docs/PROGRESS.md for the current version).** This was the original kickoff. For current status see `docs/PROGRESS.md`
> + `improvement.log`; for the next autonomous run see `docs/SESSION-GOAL.md`. Kept for reference.

This prompt is a FOCUSED starting point (Phases 2-3). The COMPLETE goal list, competitive matrix, and
acceptance criteria are in `docs/PRD.md` — Claude Code must follow the whole roadmap there, not just this.

Paste this as your first message in Claude Code (opened in this project folder):

---
You're picking up the **TBH HUD** project. FIRST read `CLAUDE.md` and `docs/PRD.md` in full — they contain the
complete goal list (section 3 of the PRD), verified technical facts, the calibrated data rules, and the phased
roadmap with acceptance criteria. Follow that whole roadmap; the steps below are just where to start.

Already built and tested: the save-reading engine (`src/engine/saveEngine.js`), the calibrated item DB
(`src/engine/gamedata.min.json` + `item_names_en.json`, 511 authoritative names), the Electron shell
(`src/main.js`/`preload.js`), and a working but un-styled `dashboard.html`. Six animated hero GIFs are in
`src/assets/heroes/`.

Start with Phase 2 then Phase 3:
1. Extract the FULL item icon set from the game's `sharedassets0.assets` (+ `.resS`) using UnityPy, saved as
   `src/assets/sprites/Item_<id>.png`. Game install: `D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data`.
2. Redesign the dashboard into a premium dark UI that beats tbh-meter — animated hero GIFs, rarity-framed item
   icons with enchants, real names, gold/hr per act, loot timeline. Migrate to React+Vite+Tailwind if it helps.

Hard rules:
- READ-ONLY. Never write to the game / save / memory.
- NEVER fabricate item names or rarity. Use `src/engine/item_names_en.json` and the itemKey-3rd-digit rarity rule
  (validated 7/7 vs tbh-meter run logs). Materials use their tier name (e.g. "Soulstone - Normal").
- Verify every change against the real save at
  `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`.
- GitHub home is `revenantcabal-rgb/taskbarheroburat` (NOT the Fusion-Data-Company token on the machine).
---
