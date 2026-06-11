# TBH HUD — v1.0.5 build goal (for Claude Code)

A design-system revamp (fresh visual language, **light mode default**, full CSS-token refactor), an alignment
audit, the **Crew "Stat List"** comparison, and **public patch notes**. Paste the block below into Claude Code
as your `/goal`. Detail + the Stat List calibration target follow it.

> Decisions locked with the owner: fresh new look · light mode default · full design-token refactor · Crew "Stats" =
> the in-game **Stat List** panel.

---

## ⬇️ PASTE THIS INTO CLAUDE CODE (the /goal — 3,647 chars, under 4000)

```
TBH HUD v1.0.5 — design-system revamp + light/dark + Crew Stat List + public patch notes. Read CLAUDE.md, docs/PROGRESS.md, and docs/GOAL-v1.0.5.md (design principles + Stat List source map + the calibration target) BEFORE coding. Assumes v1.0.4 (history/per-stage, advisor, crew) is shipped. Rules: READ-ONLY to the game; calibrate-or-omit, NO fabricated data; verify vs test/live.es3 + test/backups/*.

1) DESIGN-TOKEN REFACTOR (full): move ALL color/spacing/type/radius/shadow to CSS variables under [data-theme="light"] and [data-theme="dark"]. Components use semantic tokens only (--bg,--surface,--surface2,--text,--text-dim,--border,--accent,--accent2,--good,--warn,--bad; spacing scale --s1..--s6; --radius; --shadow). NO hardcoded hex left in components.

2) FRESH VISUAL LANGUAGE (considered, not random): pick ONE hue family, build a proper tonal ramp, derive a small harmonious accent set; a type scale with consistent weights. LIGHT MODE IS PRIMARY — designed first, loads by default; dark is its paired counterpart, NOT an inversion. Text must meet WCAG AA contrast in BOTH themes. KEEP the game's canonical rarity colors (Common→Cosmic) recognizable in both — that's identity, don't reinvent it.

3) THEME TOGGLE: header button; default = LIGHT; persist in localStorage; honor it on reload; works in Electron + browser.

4) ALIGNMENT/SPACING AUDIT: one grid + spacing system. No misaligned cards, no orphan/out-of-style boxes; consistent gaps + card min-heights; defined breakpoints. Every tab must pass at 375/768/1280 — 0 horizontal overflow, nothing clipped. Fix offenders structurally, no band-aids.

5) CREW "STATS" = the in-game STAT LIST (the account-wide aggregate panel — Exploration/Combat/… lines like "70% Increased Exp Gain", "All Hero Attack Damage +10"). Only PARTLY in our data — VERIFIED: rune lines = RuneSaveData summed per-level by effect (DB.runes[].lv is additive); Movement/Attack Speed etc. = attribute-tree passives (DB.passives). NOT yet sourced: pet bonuses (DB.pets has names only, no stat values), exact source of "Increased Exp Gain"/"Hero Slot", and the Exploration/Combat GROUPING (no category field). BEFORE shipping ANY line: (a) sum each stat across ALL sources (runes + tree passives + pets if extracted); (b) map raw effect names → the game's display names + groups; (c) CALIBRATE every line value-for-value against the in-game Stat List screenshot (transcribed in docs/GOAL-v1.0.5.md). Show ONLY lines that match the game; omit/flag the rest (golden rule). If pet stats are needed, re-extract via scripts/dump_textassets.py + build_gamedata.py. Surface the Stat List standalone (Runes/Advisor area) AND as the Crew head-to-head comparison.

6) PATCH NOTES — PUBLIC + IN-APP: maintain a public CHANGELOG.md (repo root: what changed/added/fixed); append the same entry to improvement.log; put it in the GitHub Release body; AND add a clickable "What's new" to the HUD — a header button (or the version number) that opens a simple box/modal rendering the changelog, with a subtle dot when the running version is newer than the last one the user saw (last-seen flag in localStorage). Electron + browser, no backend.

SHIP (all, in order): npm start clean; verify_save.js green vs test/live.es3; ?demo every tab in BOTH themes, 0 console errors, no overflow @375/768/1280. Commit+push revenantcabal-rgb/taskbarheroburat (Pages auto-updates). gh release create v1.0.5 dist/TBH-HUD-Setup-1.0.5.exe dist/latest.yml dist/*.blockmap. Vercel: redeploy site + /api. Update CLAUDE.md, docs/PROGRESS.md, improvement.log, README, CHANGELOG.md. Bump version→1.0.5 + ?v= on gamedata.min.js.

ACCEPTANCE: light+dark both clean & AA-legible, default light; zero misalignment/overflow on every tab @375/768/1280; Crew Stat List shows ONLY calibrated lines matched to the in-game panel (uncalibrated omitted); patch notes public (CHANGELOG + Release) AND a clickable What's-new box in the app; all ship steps done; golden rules intact.
```

---

## Design principles (so "fresh" stays cohesive, not random)

1. **One hue family, a real tonal ramp.** Pick a single base hue, generate ~8 tints/shades, and assign roles
   (bg, surfaces, borders, text) from that ramp. Accents come from a small, deliberately harmonious set
   (e.g. analogous or a single complementary), not a grab-bag of colors. No "random color + a darker color".
2. **Light is the designed-first, default theme;** dark is its paired counterpart (re-mapped tokens, not an
   inversion). Both must pass **WCAG AA** for text.
3. **Design tokens are the contract.** Everything themeable lives in CSS variables under
   `[data-theme="light"]` / `[data-theme="dark"]`; components reference only semantic tokens. This is what makes
   the toggle and any future re-skin one-line changes.
4. **Rarity colors are sacred.** Common→Cosmic keep their identity in both themes (tune lightness for contrast,
   keep the hue). They tie the HUD to the game.
5. **Typography:** one font stack, a defined size/weight scale, consistent line-heights. Readability first.

## Alignment / spacing audit
One spacing scale (`--s1..--s6`) and one grid. Every card/panel shares gap + radius + min-height rules. Kill
orphan boxes and off-style one-offs. Acceptance: 0 horizontal overflow and nothing clipped at **375 / 768 /
1280** on **every** tab, in **both** themes.

## Crew "Stats" = the in-game **Stat List** — what's real, what isn't (VERIFIED this session)

The "Stat List" panel is the player's **account-wide aggregate** — the summed effect of multiple systems,
grouped into Exploration / Combat / … Probing the real save + game tables:

- ✅ **Rune-sourced lines ARE derivable** — sum each leveled rune's per-level value by effect
  (`RuneSaveData` × `DB.runes[].lv`, additive). Covers Attack Damage, Attack Speed, Gold/Exp-from-boss,
  inventory/skill/arrange slots, drop-chance, etc.
- ✅ **Attribute-tree lines ARE derivable** — Movement Speed, Attack Speed and similar come from the passive
  trees (`DB.passives`, 108 entries with `{m, sn, st, v}`).
- ⚠️ **NOT yet sourced:** **pet bonuses** (`DB.pets` currently holds names + unlock text only — *no stat
  values*), the exact source of **"Increased Exp Gain"** and **"Hero Slot +2"**, and the
  **Exploration/Combat grouping** (no category field exists in our tables — the game groups these; we don't have
  that map yet).
- 🔒 **Golden-rule gate:** reconstruct, then **calibrate each line value-for-value against the in-game Stat List
  screenshot taken from the same save**. Ship only lines that match; omit/flag the rest. If pet stats are
  required to match, re-extract them via `scripts/dump_textassets.py` + `scripts/build_gamedata.py`.

### Calibration target (transcribed from the owner's in-game Stat List screenshot)
Use these as known values; the HUD's computed Stat List must match (for the save that produced this screenshot —
the committed `test/live.es3` fixture is an older state with different numbers, so calibrate against a fresh
screenshot+save pair).

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
  …(panel scrolls — capture the rest when calibrating)
```

**Where it surfaces:** a Stat List view of the player's own aggregate (Runes/Advisor area) **and** the same
stats as the **Crew** head-to-head comparison (rank/compare members by chosen Stat List lines).

## Patch notes — make them public
- `CHANGELOG.md` at the repo root (human-readable: Added / Changed / Fixed per version) — visible to anyone on
  GitHub + served on Pages.
- Append the same entry to `improvement.log` (the dev trace).
- Paste it into the **GitHub Release body** for v1.0.5 so desktop users see what changed.
- **In-app:** a clickable **"What's new"** — a header button (or the clickable version number) that opens a
  simple box/modal rendering the changelog. Show a subtle dot when the running version is newer than the last
  one the user saw (track last-seen in `localStorage`). Works in Electron + browser, no backend.

## Ship everywhere
Local (npm start clean, verify_save green, ?demo both themes 0 errors no overflow) → GitHub (push + `gh release
create v1.0.5 …`) → Vercel (redeploy site + /api) → Notes (CLAUDE.md, docs/PROGRESS.md, improvement.log, README,
CHANGELOG.md; bump version → 1.0.5 + `?v=` cache-bust).
