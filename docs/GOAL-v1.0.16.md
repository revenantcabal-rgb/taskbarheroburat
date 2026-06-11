# TBH HUD — GOAL v1.0.16: "THE BETTER VERSION" (power-user + honest depth)

> Read FIRST, in full: `CLAUDE.md`, `docs/PRD.md`, `improvement.log`, `docs/PROGRESS.md`.
> The app is **SHIPPED at v1.0.15** (11 tabs, light/dark, web + desktop + crew API). Do **NOT** rebuild done work.
> This brief is the next wave. Execute the phases **in priority order**. Every item below was grounded against the
> real code on 2026-06-11 (file/line refs are real) — but **re-verify against the current tree before you touch it**.

## GOLDEN RULE (non-negotiable — this is the whole project's spine)
1. **READ-ONLY.** Never write to / inject into the game, its save, or its memory (CodeStage `[ACTk]` anti-cheat).
2. **NO FABRICATED DATA.** Every label/number is calibrated from the game's own tables/localization or the player's
   own save/log — or it is **omitted**. Never guess, never quote community numbers as fact.
3. **VERIFY EVERY CHANGE vs the LIVE save** (`node scripts/verify_save.js` + headless browser, all tabs, 0 console
   errors). Commit + push each step; keep `CLAUDE.md` + `docs/PROGRESS.md` + `improvement.log` current.
4. Crew stays **opt-in only** and **never receives the save**.

## WHY THIS WAVE (the honest gap)
The data layer is excellent and the app is polished. The remaining weakness is **interaction + power-user reach**,
concentrated in three places that real daily use exposes:
- **Loot tab has ZERO filtering/search/sort/export** (`renderLoot`, dashboard.html ~1801–1869). The "New items"
  timeline only renders the latest **80** of **120** stored rows (`lootLog.slice(0,80)` @1846; stored cap @1348),
  offline rewards cap at **20** (@1824). Long-session players can't find a specific drop or keep a record.
- **Inventory filtering is rarity-only** — `ALL / <rarity> / Materials` buttons, sort hardcoded rarity→level
  (`renderInventory` ~1776–1799). No search, no gear-type filter, no "enchanted only", no "equipped/unequipped".
- **Codex already has the gold-standard controls** (search `.cxq`, type/rarity/gear selects, sort, owned-only) —
  so the fix is to bring that proven pattern to the tabs people live in, not invent anything.
Plus: the **desktop shell is a single 1180×840 window** (`src/main.js` ~50–53) — no always-on-top, tray, global
shortcuts, settings, or compact mode. And the **#1 player question (the "blue chest")** is answerable **honestly by
MEASUREMENT** — the method is already written up in `BLUE-CHEST-DROP-RATE-FINDINGS.md` §4.

---

## P1 — LOOT TAB: filter / search / sort / "load more" / export  (Boss's instinct; highest daily value)
Make the Loot tab as controllable as the Codex. Reuse the existing `.filters` chip pattern (Inventory) and the
`.cxbar` select/search pattern (Codex) — no new design language.
- **Filter bar on the "New items" timeline:** rarity chips (All + each owned rarity), an **Origin** filter
  (⚒️ Cube · ✦ found · — unclear; the tags already exist per entry, `l.src` @1848–1850), and a **free-text search**
  over item name. All client-side over the in-memory `lootLog`.
- **Sort:** newest-first (default) · rarity (high→low) · name.
- **"Show all / Load more":** stop truncating silently — render in pages (e.g. 80 at a time) with a count
  ("showing 80 of N") so nothing is hidden. Same treatment for the offline-rewards table (lift the 20-row cap).
- **Export:** a "⤓ Export" control that copies/downloads the timeline + offline rewards as **CSV and JSON**
  (local time + UTC + name + rarity + origin + level). Read-only, client-side; lets players keep records and feed P3.
- **Date grouping (optional polish):** Today / Yesterday / earlier headers in the timeline.
- **"Boxes Steam hasn't delivered" honest note (NEW — file-verified, see `COMMON-BOX-STEAM-ROUTING-FINDINGS.md`):**
  `Player.log` proves the game mints common boxes (`itemBoxKey=910201`) that Steam never delivers — every mint is
  paired with `[ItemCache] CreateSteamItem returned OK but items is empty` (170/170 in the reference log). Those
  boxes go to the Steam inventory, **not** the local save, so they correctly never enter the "New items" timeline.
  Add a short, calibrated note near the Steam-boxes section — e.g. *"The game generated N boxes Steam hasn't
  delivered yet (it returned empty) — they're held on Steam, not in your save, so they don't show below."* — counted
  straight from the `CreateSteamItem … items is empty` lines (+ `GetBoxCount`). This turns "where's my chest?" into a
  one-line answer. **Never assert it's a HUD loss — it's a Steam/game-side throttle (same root as the deferred
  Market goal).**
- **AC:** filters + search + sort + paging all work over the real `lootLog`; export round-trips; the Steam-undelivered
  note counts only real `items is empty` log lines (0 if none); 0 console errors; 0 overflow @375 in both themes;
  `verify_save` still PASS.

## P2 — INVENTORY: Codex-grade controls + value tools
Bring the Codex's controls to the inventory you actually manage.
- **Search** (name / id), **gear-type filter** (from `gt`), **sort** (rarity · level · type · enchanted-first),
  and toggles **"enchanted only"** and **"equipped / unequipped"** (equip state is derivable from the heroes'
  `equippedItemIds` already parsed in `analyze`). Keep the existing rarity + Materials chips.
- **Item compare:** select two owned items of the **same gear type** → side-by-side inherent stats. Reuse the
  Advisor's per-swap comparison renderer (GearInfoData values, same display rules, **no "better/worse" verdict** on
  individual stats — golden rule).
- **"Safe to let go" finder (calibrated):** surface owned gear that is **strictly dominated** by another item you
  already own/equip of the same `gt` (higher rarity, or same rarity + higher level) — the **inverse** of the
  Advisor gap finder (`gearGapsD`), so it's provable, not advice. Label it "redundant duplicates", never "sell this"
  (the game's salvage value isn't calibrated → don't quote a number).
- **AC:** every control filters the real owned set; compare matches Codex/tooltip values exactly; the duplicate
  finder only lists provable dominations (hand-verify vs the gear dump); 0 console errors; `verify_save` PASS.

## P3 — BLUE-CHEST / STAGE-BOSS-BOX MEASUREMENT (the honest answer to the #1 player question)
The base drop % and the rumored 12-min cooldown are **NOT in the game files** (proven in
`BLUE-CHEST-DROP-RATE-FINDINGS.md` §2–3). The only honest path is **measurement from the player's own data** (§4).
- **Instrument it:** when the loot tracker logs a new **Stage Boss Box** (RARE-grade STAGEBOX) or a save-diff shows
  one acquired, record `{ timestamp, currentStageKey }`. Persist alongside `tbh_loot` (localStorage) like the rest.
- **Show, don't assert:** a small "Blue-chest tracker (measured from your play)" panel — per-stage gaps between
  acquisitions, and whether switching stages coincided with a faster next chest. Display **only the player's own
  measured intervals**. **Never** print "12 minutes" or a "%" as fact — state it's measured, sample size N, and
  that the game files contain no rate (link the findings doc's conclusion verbatim).
- **AC:** with the real save/log it records real Stage-Boss-Box events; the panel shows measured gaps + N; it makes
  **zero** uncalibrated numeric claims; honest empty-state before enough data; `verify_save` PASS.

## P4 — DESKTOP: compact always-on-top mini-HUD + settings + shortcuts  (delivers the PRD's "overlay" intent, ban-safe)
The PRD wanted an always-on-top strip; it was deferred **only because live combat needs memory**. A **save-based**
mini-HUD needs no memory and is fully ban-safe.
- **Mini-HUD (Electron):** a second small, frameless, `alwaysOnTop` `BrowserWindow` (`src/main.js`) showing
  gold · session gold/hr · current stage (Act X-Y) · offline-rewards timer · next affordable rune. Fed by the same
  save read — **no new data lane**. Toggle from the header; remember position/size.
- **Settings panel:** opacity (desktop), default tab on launch, density (comfortable/compact), notification prefs,
  reduced-motion. (tbh-meter had settings; TBH HUD has none today.)
- **Global shortcuts:** number/arrow keys to switch tabs, `/` to focus the active search box (focus rings already
  exist; this is the natural next step). Browser build degrades gracefully (mini-HUD + opacity are Electron-gated).
- **AC:** mini-HUD updates live from the save and is provably read-only; settings persist (localStorage); shortcuts
  don't trap typing in inputs; web build unaffected; `verify_save` PASS.

## P5 — DATA DEPTH (calibrated only) + crew hardening  (from the standing backlog)
- **Codex recipes:** surface `SynthesisRecipeInfoData` / `CraftingRecipeInfoData` / `Cube*` ("what the Cube makes",
  inputs→output) in the Codex detail. **Item sets do NOT exist in this game** (verified) → do **not** add "set
  bonuses". Korean-only fields stay omitted.
- **Enchant gt→category crowd-calibration:** boots/gloves/rings/offhands are still uncalibrated (PROGRESS backlog).
  Add a one-click, opt-in "report this enchant" that captures only the calibration tuple (gt, MaterialKey, rolled
  StatType) so unobserved categories get confirmed from real data — never shipped as a guess until it matches.
- **Crew API hardening:** a prune/delete endpoint (stale members/abandoned crews — one smoke row exists), simple
  rate limiting, optional Clerk auth. (`api/*`; redeploy `tbh-crew-api` only when `api/*` changes.)
- **AC:** recipes render from the real tables (no guessed odds); enchant-report sends only the tuple, opt-in, never
  the save; crew endpoints covered by a smoke test; `verify_save` PASS.

## P6 — TARGETS / GOALS TRACKER (ties the measured rates together)
Let a player pin a target — a rune level, a specific gear upgrade, or a stage — and show an **ETA from their own
measured rate** (reuse `perStageRates` gold/hr + `runePlanD` costs + the session XP/hr already built). Honest states
("measuring…", "not gaining") exactly like the existing per-hero ETA. **AC:** ETA uses only measured rates; never a
fabricated pace; clears when the target is met.

---

## DEFERRED / DO-NOT-BUILD (golden rule — leave a note, never guess)
Live DPS / clear-time / per-hero DPS share / per-act *live* gold/hr (memory lane = CodeStage ban risk); a quoted
blue-chest **%** or a hard **12-min** cooldown (not in the files — P3 only ever **measures**, never asserts); Steam
Market value (Inventory Service throttled/empty this build); per-item craft-vs-drop-vs-market origin beyond the
existing Cube-consumption inference; uncalibrated aggregate Types 16/4/5/7/9/10/15; Korean ItemGroup names; per-item
drop %; item **set bonuses** (sets don't exist).

## LOOP & DONE
For each item: implement (calibrated, read-only, mirrored in BOTH engines where the change is data-side) → verify vs
the LIVE save (`node scripts/verify_save.js` + headless, all 11 tabs, 0 console errors, 0 overflow @375 both themes)
→ commit → push → update `CLAUDE.md` + `docs/PROGRESS.md` + `improvement.log` + the in-app CHANGELOG const + public
`CHANGELOG.md`. **Ship:** bump `package.json` + `APP_VERSION` + the `?v=` cache-bust, `npm run dist`, then
`gh release create v<ver> dist/TBH-HUD-Setup-<ver>.exe dist/latest.yml --latest` (no blockmap since v1.0.15).
**DONE = P1–P4 shipped and verified** (P5/P6 as time allows), every label calibrated, provably read-only, docs +
changelog current, pushed everywhere; end with: shipped, calibration evidence, confidence 1–10, exact next step.
