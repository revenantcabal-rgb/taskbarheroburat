# TBH HUD — v1.0.4 build goal (for Claude Code)

Three features + ship everywhere. F1/F2 are **save-only and ban-safe**; F3 (crew leaderboard) is **opt-in and
privacy-safe** (brag-stats only, never the save). Everything in "Verified facts" below was confirmed against the
committed real save `test/live.es3` + `test/backups/*` during planning. Paste the next block into Claude Code as
your `/goal`.

---

## ⬇️ PASTE THIS INTO CLAUDE CODE (the /goal — 3,627 chars, under 4000)

```
TBH HUD v1.0.4 — 3 features + ship everywhere. Read CLAUDE.md, docs/PROGRESS.md, and the rest of docs/GOAL-v1.0.4.md (verified facts + slot map + file map) before coding. Rules: READ-ONLY to the game; calibrate-or-omit, no fabricated data; verify vs test/live.es3 + test/backups/*.

ARCH: live app = the INLINE engine in dashboard.html (Electron + browser). src/engine/saveEngine.js = Node mirror tested by scripts/verify_save.js. New fns go in BOTH (parity). HEAD-START: saveEngine.js already has perStageRates, gearGaps, runePlan, enchantStatus, statTotals + trendPoint{cur,combat} (written, NOT run-verified) — verify vs test/live.es3, then mirror to inline + build UI.

F1 HISTORY + PER-STAGE GOLD/HR (save-only; goals #2/#3):
- Persist a lean trendPoint per save-read to IndexedDB in the renderer (Electron+browser). SEPARATE db 'tbh-hud-history' (leave the 'handles' store alone). Load on startup; merge own-history + game backups into trends; hook append in onBytes().
- Per-stage: attribute the combat sub-counter delta (aggregate Type2/Sub1, calibrated) to currentStageKey over CLEAN intervals only (cur unchanged across the pair). Offline gold auto-excluded (it's in Sub2/3). Rank gold/hr + kills/hr by stage -> Trends; replace the Lifetime "best farming stage" deferral with the measured answer; + Overview one-liner. Caveats honest (clean intervals, includes idle, sharpens over time).

F2 BUILD ADVISOR (new "Advisor" tab):
- Gear-gap (headline): per hero/equipped slot find an UNEQUIPPED owned item of the SAME GEARTYPE strictly better (higher rarity, or =rarity+higher level). Greedy 1:1, each spare once. Provable upgrades only.
- Rune plan: greedy cheapest-first path within gold (costs are GOLD; table DB.runes[].lv) — steps+total+save-for.
- Enchant ROI: deployed-hero equipped items with open enchant slots (max 3).
- Stat sheet: base+gear+tree summed per stat -> Party tab (extend breakdownPanel w/ a Total row).

F3 CREW LEADERBOARD (goal #14; OPT-IN, privacy-safe):
- New "Crew" tab. OPT-IN only: pushes calibrated BRAG-STATS (name, max stage, lifetime gold, kills, net worth, top-3 hero levels, runes, latest achievement) — NEVER the save. Keep the no-account/nothing-uploaded default for non-opt-ins.
- Backend (Boss's stack): Vercel serverless API (POST /api/progress, GET /api/leaderboard) + Neon Postgres; gate a crew by a shared CREW CODE + display name (Clerk optional later). Store latest snapshot/member + small history for achievements. NEON url in Vercel env (never committed); CORS-allow the Pages + Vercel origins.
- LIVE: HUD polls GET ~30s; ranks the crew by a chosen stat; shows each member's latest stats + "latest achievement" (from snapshot deltas: new max stage / Legendary+ / hero level-up / rune milestone) + your gap to them. Friends join by entering the crew code; a Share button copies it.

SHIP EVERYWHERE (all, in order):
1. LOCAL: npm start clean; verify_save.js green vs test/live.es3; ?demo = 11 tabs, 0 console errors, no overflow @375.
2. GITHUB: commit+push revenantcabal-rgb/taskbarheroburat (Pages auto-updates). Release: gh release create v1.0.4 dist/TBH-HUD-Setup-1.0.4.exe dist/latest.yml dist/*.blockmap.
3. VERCEL: deploy site + /api functions; set Neon env; confirm live URL serves the new build + crew API responds.
4. NOTES: update CLAUDE.md (changelog + verified facts), docs/PROGRESS.md (goals #2/#3/#6/#14), improvement.log, README (features + crew setup/FAQ). Bump version -> 1.0.4 + ?v= on gamedata.min.js.

ACCEPTANCE: 4 ship steps done; golden rules intact (read-only, no fabricated data, crew is opt-in); per-stage + gear-gap + crew all show real data.
```

---

## What I verified against your real save (so nobody re-derives it)

1. **Per-stage gold/hr is doable SAVE-ONLY** (the docs had it deferred as "needs the memory lane"). The
   calibrated combat sub-counter (aggregate **Type 2 / Sub 1**) is the farming signal; offline gold lands in
   Sub 2/3, so a combat-gold delta attributed to `currentStageKey` is clean gold-per-stage with **no
   subtraction and no guessing**. Across your 6 backups it rises **~36k/hr (Act 1-6) → ~84k/hr (Act 2-8)**.
2. **`equippedItemIds` are item UniqueIds**, not ItemKeys (7/7 matched instances). **Slot map:** 0 weapon,
   1 offhand, 2 helmet, 3 armor, 4 gloves, 5 boots, 8 ring, 6/7/9 accessory. The gear-gap finder must match
   candidates by **GEARTYPE**, not slot index (the weapon type is class-specific).
3. **The gear-gap feature pays off on day one:** your Hunter is wearing an **Iron Helmet (RARE L10)** while a
   **Chain Helmet (RARE L20)** sits unused in the stash — a free upgrade the advisor will flag.
4. **The structural bottleneck:** the app only ever sees one snapshot + the game's rolling backups. Recording
   the HUD's **own** snapshot history (IndexedDB, renderer-side, Electron + browser) unlocks real long-horizon
   trends *and* the per-stage rates above.

## F3 — Crew leaderboard, designed honestly (goal #14)

The HUD is intentionally **100% client-side today — no account, nothing uploaded** (a real privacy selling
point). The crew leaderboard must NOT break that for people who don't want it:

- **Opt-in only.** A toggle ("Share my progress with my crew") turns it on. Off by default; everyone else keeps
  the zero-upload experience.
- **Brag-stats only, never the save.** Push a small calibrated payload: display name, max stage, lifetime gold,
  total kills, net worth (sum of owned-item value or a simple proxy), top-3 hero levels, runes leveled, and a
  derived "latest achievement". The `.es3` never leaves the machine.
- **Backend = your stack.** Vercel serverless functions (`POST /api/progress`, `GET /api/leaderboard`) backed by
  Neon Postgres. A lightweight **crew code + display name** gates who shares a board (full Clerk auth can layer
  on later). Neon connection string lives in Vercel env vars (never committed). CORS-allow the GitHub Pages +
  Vercel origins.
- **Live-ish.** Each HUD polls `GET /api/leaderboard?crew=<code>` every ~30s and renders a **Crew** tab: members
  ranked by a chosen stat, each one's latest numbers, their **latest achievement** (derived from deltas between
  their pushed snapshots — new max stage, new Legendary+, a hero level-up, a rune milestone), and your gap to
  them. A **Share/Invite** button copies the crew code so friends can join from their own HUD.
- **Where it surfaces:** new "Crew" tab (the 11th). Reuses the existing card/bar styles.

## Ship everywhere — checklist (you asked for all of these)

1. **Local** — `npm start` clean; `node scripts/verify_save.js test/live.es3` green; `dashboard.html?demo`
   renders all 11 tabs, 0 console errors, no horizontal overflow at 375px.
2. **GitHub** — commit + push to `revenantcabal-rgb/taskbarheroburat` (GitHub Pages auto-rebuilds the web
   build). Publish the desktop release so existing installs auto-update:
   `gh release create v1.0.4 dist/TBH-HUD-Setup-1.0.4.exe dist/latest.yml dist/*.blockmap`.
3. **Vercel** — deploy the static site **and** the `/api` leaderboard functions; set the Neon env var; confirm
   the live URL serves the new build and the crew API responds.
4. **Notes (the GitHub docs)** — update `CLAUDE.md` (DONE changelog + the new VERIFIED facts: UniqueId slot
   map, the per-stage method, the leaderboard), `docs/PROGRESS.md` (goals #2/#3/#6/#14 + phases 4/8),
   `improvement.log` (a new session entry), and `README.md` (feature list + crew setup/FAQ). Bump version →
   1.0.4 and bump `?v=` on the `gamedata.min.js` script tag.

## Head-start already in the repo
`src/engine/saveEngine.js` now contains `perStageRates`, `gearGaps`, `runePlan`, `enchantStatus`,
`statTotals`, and an enriched `trendPoint` ({cur, combat}). They are written and exported but **not yet
run-verified in this session** (a tooling sync issue blocked the Node run). Have Claude Code verify them against
`test/live.es3` first, then mirror into the inline engine + build the UI. If you'd rather start clean, they can
be reverted in one step.

## File map (dashboard.html)
Inline engine ~575-840 · renderers: Overview 1121, Party 1253, Tips 1463, Lifetime 1486, Trends 1553, Codex
1695 · `TABS` array 1816 · nav buttons ~493 · tab `<div>`s ~541 · IndexedDB ~1922 · `onBytes` 1907 · demo data
2040 (extend so `?demo` shows the new UI). Engine: `src/engine/saveEngine.js`. Verify: `scripts/verify_save.js`.
