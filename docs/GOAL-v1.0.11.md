# TBH HUD — v1.0.11 build plan: visual revamp + full Stat List in Crew

**Type:** styling/UX + one data feature, layered on the shipped **v1.0.10** app (11 tabs, incl. Advisor + Crew).
**Audience of this doc:** the engineer (Claude Code) executing the build. Read it top to bottom before touching code.

---

## 0. Mission & impact (the "why")

TBH HUD is a **read-only insights companion** for the Steam game *TBH: Task Bar Hero*. It never touches the game —
it reads the player's own local save and shows them what's really going on. v1.0.10 is feature-complete; **v1.0.11
is about trust and polish**:

1. **Make it look like a product, not a tool.** A cohesive, considered visual language with a real **light** and
   **dark** theme — light as the default — so it reads as premium next to tbh-meter / tbh-copilot.
2. **Kill the visual sloppiness.** No mismatched, oversized, or orphaned boxes. Consistent cards everywhere.
3. **Deliver the Stat List the owner asked for.** Bring the game's own **Stat List** (the account-wide aggregate)
   into the **Crew** tab so friends compare real, calibrated power — not vibes.
4. **Be transparent.** Public, in-app patch notes so players see exactly what changed.

**Definition of done (impact level):** a friend opens the HUD, it's clean and legible in their preferred theme,
every card lines up, the Crew board shows real Stat List numbers that match their game, and they can see what's
new — and nothing in the build could ever get them banned.

---

## 1. NON-NEGOTIABLE CONTRACT — read-only, ban-safe, zero fabrication

This is the most important section. If a change would violate any rule here, **do not make it** — flag it instead.

### 1.1 Read-only & ban-safe (the game uses CodeStage anti-cheat)
We are an **external assistant** that only **reads files the game has already written to disk**. Reading is safe;
touching the running game is the ban vector.

- **ONLY these inputs, READ-only:** `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`,
  its rolling/timestamped `*.es3` / `*.es3.bak` backups, and `Player.log` / `Player-prev.log`. Open them for
  reading only.
- **NEVER write, modify, rename, move, or delete** any game file, save, or backup. The HUD's own data (history,
  settings, theme, last-seen version) lives only in the browser/Electron sandbox (IndexedDB / `localStorage`) —
  never in the game folder.
- **NEVER read or attach to the game's process or memory.** No `ReadProcessMemory`, no debugger/process attach,
  no DLL injection, no function hooking, no signature scanning of the running game, no overlay drawn **into** the
  game window. (Our own always-on-top HUD window is fine; injecting into the game is not.)
- **No automation of the game.** No input sending, no clicking, no macro, no packet/network interception of the
  game or Steam.
- **No new network calls about the game.** The only outbound traffic is the **existing opt-in Crew API**, which
  sends **only the brag-stats the user chose to share** — never the save file, never raw game data, and nothing
  at all unless the share toggle is ON.
- This update is **CSS + renderer + read-only aggregation only.** It introduces **no** new way of obtaining data.
  If a Stat List line needs data we don't already read from the save/tables, the answer is **re-extract from the
  game's shipped data files offline** (the `scripts/*.py` dumpers) — never by reading the live game.

### 1.2 Zero fabricated data, zero placeholders
Every value the user sees must be **true** and **traceable**.

- Every number traces to exactly one of: **(a)** a field in the decrypted save, **(b)** a calibrated game data
  table (`gamedata.min.json` built from the game's own CSV/localization), or **(c)** a value the user typed
  (e.g. crew name/code). Nothing else.
- **No placeholders shipped as data:** no lorem ipsum, no "Example Hero", no dummy/sample numbers in non-demo
  paths, no "Coming soon" stubs presented as real stats, no hardcoded fake totals. (The `?demo` sample data is the
  **only** allowed synthetic path and it must stay clearly badged "SAMPLE — not your data".)
- **Estimates are labeled as estimates.** Anything measured/derived (rates, ETAs) says "measured"/"≈"; never
  dressed up as an exact game value.
- **The Stat List is calibrate-or-omit:** show a line **only** if its computed value matches the in-game Stat List
  for the same save. If a line can't be matched (unknown source, missing data), **omit it** — do not approximate,
  do not guess, do not show a partial number as if it were complete.
- **No fabricated colors-as-data:** choosing a fresh palette is design, not data — that's allowed and encouraged.
  The data-integrity rule applies to **stats/insights**, not to the visual theme.

### 1.3 Verification gates (must pass before shipping)
- `node scripts/verify_save.js test/live.es3` stays **green** (extend it with any new aggregation you add).
- New engine logic is **calibrated against `test/live.es3` + `test/backups/*`** and, for the Stat List, against the
  in-game screenshot (§6.4).
- Parity: any new engine function exists in **both** the inline engine in `dashboard.html` **and**
  `src/engine/saveEngine.js`.

---

## 2. Current state (verified via git/shell — build on this, don't reinvent it)

- `package.json` = **1.0.10**. `dashboard.html` (~2,900 lines) has **11 tabs**:
  `overview, party, inventory, loot, runes, advisor, lifetime, trends, crew, codex, tips` (`var TABS=[…]`).
- The **live app runs the inline engine inside `dashboard.html`** (browser + Electron). `src/engine/saveEngine.js`
  is the Node mirror that `scripts/verify_save.js` tests. **Keep them in parity.**
- `:root` already defines CSS variables — but a **single dark palette**, some used non-semantically:
  ```
  --bg #080a13  --bg2 #0b0e1a  --surface #121728  --surface2 #171d33  --surface3 #1f2742
  --line #262f4d  --line2 #36426b  --text #eef2fc  --muted #9aa7c8  --dim #6b769c
  --blue #4b7dff  --blue2 #6a93ff  --green #19c98b  --amber #f9a826  --red #ff3e6b  --purple #b072ff
  --gold #f2b441   --r-COMMON … --r-COSMIC (rarity)   --shadow …
  ```
  There is **no light theme, no `[data-theme]`, no toggle.** The `<body>` background also hardcodes blue/purple
  rgba radial gradients (lines ~22-26) that must move to tokens.
- Header (`<header>`, line ~509) holds `.brand` (logo + title + `#ver`), `.status` (`#dot` + `#statusText`), and an
  `.actions` area with `#disconnectBtn`. **The theme toggle and the "What's new" button go in `.actions`.**
- The **rune Stat List already exists**: `runeStatListD(RuneSaveData)` → `d.runeStats` = `[{eff, total}, …]`,
  rendered on the **Runes** tab ("Stat list", ~line 1699) and pushed to Crew (`crewStats.runeStats`, top-6; shown
  ~line 2280 as a 4-line snippet per member). We **extend** this, not rebuild it.

---

## 3. Workstream A — Design tokens + light/dark theming (microscopic)

**Goal:** one semantic token layer, two themes, light default, toggle persisted. No raw hex in components.

### 3.1 Restructure `:root` into semantic tokens under two themes
Replace the single `:root` palette with a token contract applied by a `data-theme` attribute on `<html>`:

```
:root[data-theme="light"] { /* PRIMARY — design this first */ … }
:root[data-theme="dark"]  { /* paired counterpart */ … }
```

Migrate the existing names to **semantic** ones (keep the old names as aliases pointing at the new tokens to avoid
a 2,900-line find/replace in one pass, then sweep components over):

| New semantic token | Role | Replaces (today) |
|---|---|---|
| `--bg`, `--bg-2` | page background layers | `--bg`, `--bg2` |
| `--surface`, `--surface-2`, `--surface-3` | cards / panels / elevated | `--surface`, `--surface2`, `--surface3` |
| `--border`, `--border-strong` | hairlines / stronger dividers | `--line`, `--line2` |
| `--text`, `--text-muted`, `--text-dim` | text ramp | `--text`, `--muted`, `--dim` |
| `--accent`, `--accent-2` | primary brand accent + hover | `--blue`, `--blue2` |
| `--accent-alt` | secondary accent (gradients) | `--purple` |
| `--good`, `--warn`, `--bad` | semantic status | `--green`, `--amber`, `--red` |
| `--gold` | gold currency (== LEGENDARY hue) | `--gold` |
| `--r-COMMON … --r-COSMIC` | **rarity — keep as-is** | unchanged |
| `--s1..--s6` | spacing scale (e.g. 4/8/12/16/24/32) | *(new — see §5)* |
| `--radius`, `--radius-lg` | corner radii | *(new — unify)* |
| `--shadow`, `--shadow-sm` | elevation | `--shadow` (+ a softer one for light) |

- Move the hardcoded `<body>` background gradients into tokens (e.g. `--bg-glow-1/2`) so light mode isn't a dark
  glow on a light page.
- **Sweep components:** every `var(--blue)` / `var(--purple)` / `var(--line)` etc. in component CSS becomes its
  semantic token. Grep for `var(--blue`, `var(--purple`, `var(--surface3`, `var(--line` and reassign. **No literal
  hex** should remain in component rules (only the theme blocks define hex).
- **Rarity stays put.** `--r-*` keep their hues in both themes (adjust *lightness* only if a rarity chip fails AA
  on a light surface).

### 3.2 Apply, default, persist, toggle
- On first load: `document.documentElement.dataset.theme = localStorage.getItem('tbh_theme') || 'light'`. **Default
  is light** (per owner). (Optional nicety: if no stored choice, you may honor `matchMedia('(prefers-color-scheme:
  dark)')` — but the owner's stated default is light, so light wins when there's no system signal.)
- Add a **toggle button in `header .actions`** (sun/moon). On click: flip `data-theme`, write `localStorage`,
  re-render nothing else (CSS vars cascade). Must work identically in Electron and browser.
- Place the toggle **before** `#disconnectBtn`; match the existing `button.ghost` styling.

---

## 4. Workstream B — Fresh visual language (high-level + guardrails)

Design the look; don't pick colors at random.

- **One hue family → a tonal ramp.** Choose a single base hue, generate ~8 steps, assign bg/surfaces/borders/text
  from the ramp. Accents come from a **small, deliberately harmonious set** (analogous or one complementary), not a
  pile of unrelated colors.
- **Light is designed first and is the default;** dark is a **re-mapped** counterpart (re-pick token values for a
  dark ground), **not** a CSS `invert()`.
- **Contrast:** body text and key labels meet **WCAG AA** (≥4.5:1) on their surface in **both** themes; large/loud
  text ≥3:1. Verify the worst cases: `--text-dim` on `--surface`, accent text on `--bg`, rarity chips on light.
- **Typography:** one stack, a defined size scale (e.g. 11.5 / 13 / 14.5 / 16 / 21 px already in use — formalize
  it), consistent weights, comfortable line-height. No mid-component font-size one-offs.
- **Keep brand cues:** the rarity colors and the hero/rarity framing are game identity — preserve them.

---

## 5. Workstream C — Fix the uneven boxes (microscopic — the owner's main complaint)

**Root cause (in the CSS today):** each grid declares its own min track width and nothing enforces equal heights:

```
.cards     grid-template-columns: repeat(auto-fit,  minmax(168px,1fr))
.party     …                       repeat(auto-fit,  minmax(190px,1fr))
.runegrid  …                       repeat(auto-fill, minmax(228px,1fr))
.tipgrid   …                       repeat(auto-fill, minmax(290px,1fr))
.flex-grid …                       repeat(auto-fit,  minmax(140px,1fr))
.invgrid   …                       repeat(auto-fill, minmax(76px,1fr))
```
With `auto-fit`, a row that doesn't fill stretches its cards **wider** than the rows above (the "some boxes are
bigger" effect); and cards with more content grow **taller** than their neighbors because nothing equalizes height.

**Fix — make it systemic, not per-box:**
1. **One spacing + radius scale** (`--s*`, `--radius*`) used by every card/panel; replace ad-hoc paddings/gaps.
2. **Equal heights within a row:** ensure grid items `align-items: stretch` (default) **and** give cards a layout
   that fills (e.g. card is `display:flex; flex-direction:column;` with a spacer, or set a sensible `min-height`)
   so siblings match.
3. **Unify the grid track scale.** Pick a small set of standard min-widths (e.g. a "stat card" width and a "wide
   card" width) as tokens and reuse them; don't let five grids use five different magic numbers. Prefer `auto-fill`
   over `auto-fit` for stat-card grids so a short last row doesn't balloon.
4. **Panels** (`.panel`) share one border/radius/padding recipe; tables inside them don't overflow (set
   `table-layout` / wrap long cells).

**Audit matrix (must pass):** every one of the 11 tabs, at widths **375 / 768 / 1280**, in **both** themes →
0 horizontal overflow, no clipped content, no card visibly larger than its siblings, consistent gaps.

---

## 6. Workstream D — Full Stat List → Crew (microscopic)

**Goal:** turn the rune-only Stat List into the **full in-game Stat List**, grouped like the game, and compare it
across the Crew.

### 6.1 What exists
`runeStatListD(RuneSaveData)` sums each **leveled rune's** per-level values by effect → `d.runeStats =
[{eff, total}]`. Shown on Runes; top-6 pushed to Crew; rendered as a 4-line snippet per member (~line 2280).

### 6.2 Build `statListFull(psd)` (engine — inline + `saveEngine.js`, parity)
Aggregate **every account-wide source** that the game folds into its Stat List, summed per stat:
- **Runes** — already have it (`runeStatListD`).
- **Attribute-tree passives** — `DB.passives` (108 entries, shape `{m, sn, st, v}`). Include the **account-wide**
  ones (the "All Hero …" / global effects), scaled by the leveled node count from `attributeSaveDatas`. (Per-hero-
  only passives are a separate, per-hero sheet — keep them out of the account Stat List unless the game shows them
  there; calibration decides.)
- **Pets** — owned pets grant account-wide bonuses, but `DB.pets` currently has **names only, no stat values**.
  If calibration shows pet-sourced lines are missing, **re-extract pet stats from the game's data files** via
  `scripts/dump_textassets.py` + `scripts/build_gamedata.py` (offline, read-only) and add them to `DB.pets`.
- Sum same-stat contributions across sources into one total per stat.

### 6.3 Group + label like the game
The game groups into **Exploration / Combat / …**. There is **no category field** in our tables, so build a
**stat → category** map and a **raw-effect → display-name** map, both **calibrated to the screenshot** (e.g.
`Increase Exp Amount` → "Increased Exp Gain"; `Additional Exp Stage Boss` → "Exp From Stage Boss Kill"). Keep the
map in data, not scattered in the renderer.

### 6.4 Calibration procedure (the gate)
1. Take a **fresh in-game Stat List screenshot** and the **save written at that moment** (the committed
   `test/live.es3` is an older state — its numbers won't match the screenshot in §10).
2. Compute `statListFull` for that save.
3. Compare **line by line**. For each line: matches → keep; differs → fix the source/sum/label; not produced →
   find the missing source (passive/pet/other) or **omit the line**.
4. Add an assertion to `verify_save.js` that the computed lines it *does* claim are internally consistent (e.g.
   rune contribution = Σ per-level values to current level).
5. **Ship only matched lines.** A visible "these match your in-game Runes → Stat List; report any mismatch" note is
   already the pattern on the Runes tab — keep that honesty.

### 6.5 Surface it
- **Runes/own view:** upgrade the existing "Stat list" to the full grouped list (Exploration/Combat/…).
- **Crew:** extend `crewStats` to send the **grouped Stat List** (cap the payload sensibly; brag-stats only, opt-in
  rule unchanged). In `renderCrew`, replace the 4-line rune snippet with each member's **full grouped Stat List**,
  and add a **rank/compare control** (pick a stat → sort the crew by it). Omit any uncalibrated line for everyone.

---

## 7. Workstream E — Patch notes (public + in-app)

- `CHANGELOG.md` at the **repo root** — `## v1.0.11 — <date>` with **Added / Changed / Fixed**. Public on GitHub +
  served on Pages.
- Append the same entry to `improvement.log` (dev trace) and paste it into the **GitHub Release body**.
- **In-app "What's new":** a button in `header .actions` (or make `#ver` clickable) opens a modal rendering the
  changelog (reuse the existing modal/overlay pattern from the Codex detail view). Show a **subtle dot** when
  `APP_VERSION` is newer than `localStorage.tbh_lastSeenVersion`; clear it when the modal is opened. Electron +
  browser, no backend.

---

## 8. Ship everywhere (exact order)

1. **Local:** `npm start` runs clean; `node scripts/verify_save.js test/live.es3` green; open
   `dashboard.html?demo` and verify **every tab in both themes** — 0 console errors, no overflow at 375/768/1280.
2. **GitHub:** commit + push to `revenantcabal-rgb/taskbarheroburat` (Pages auto-rebuilds the web build). Then
   `gh release create v1.0.11 dist/TBH-HUD-Setup-1.0.11.exe dist/latest.yml dist/*.blockmap` (Electron auto-update).
3. **Vercel:** redeploy the site + the crew `/api` functions; confirm the live URL + crew API respond.
4. **Notes/version:** update `CLAUDE.md`, `docs/PROGRESS.md`, `improvement.log`, `README.md`, `CHANGELOG.md`; bump
   `package.json` → `1.0.11`, `APP_VERSION`, and the `?v=` cache-bust on the `gamedata.min.js` tag (keep them equal
   — `verify_save.js` already asserts this).

---

## 9. Acceptance criteria (testable)

- [ ] Fresh **light + dark** themes; **light is default**; toggle persists across reloads; no raw hex left in
      component CSS; rarity colors intact in both themes; text passes **AA** in both.
- [ ] **Uniform cards** — no oversized/orphan boxes; **0 horizontal overflow** and nothing clipped on **all 11
      tabs** at **375/768/1280** in **both** themes.
- [ ] **Crew** shows each member's **full, grouped Stat List**, every line **calibrated** to the in-game panel;
      uncalibrated lines **omitted**; a rank/compare control works.
- [ ] Patch notes are **public** (`CHANGELOG.md` + Release) **and in-app** ("What's new" with new-version dot).
- [ ] **Contract intact:** read-only game files only; no memory/process/injection; no writes to the game folder; no
      fabricated/placeholder data anywhere outside the badged `?demo` path; `verify_save.js` green.
- [ ] Shipped to local + GitHub + Pages + Vercel; all docs updated; versions in sync.

---

## 10. Calibration target (transcribed from the in-game Stat List screenshot)

Known values to match (for the save that produced the screenshot — capture a fresh screenshot + save to calibrate):

```
Exploration
  70% Increased Exp Gain
  Additional Exp +1
  Exp From Stage Boss Kill +80
  Exp From Act Boss Kill +300
  Exp From Normal Monster Kill +1
  Hero Slot +2
Combat
  21% Increased All Hero Movement Speed
  11% Increased All Hero Attack Speed
  All Hero Attack Damage +10
  …(the panel scrolls — capture the remaining lines when calibrating)
```

**Source notes (verified this session):** rune lines come from `RuneSaveData × DB.runes[].lv` (additive); Movement/
Attack Speed–type lines come from `DB.passives`; **not yet sourced** — pet bonuses (`DB.pets` has no stat values
yet), the exact source of "Increased Exp Gain" and "Hero Slot", and the Exploration/Combat grouping (no category
field — derive + calibrate). Calibrate or omit.
