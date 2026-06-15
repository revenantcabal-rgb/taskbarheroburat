# TBH "Blue Chest" — Drop-Rate Investigation (file-verified)

**Game:** TBH: Task Bar Hero (Steam appid 3678970, game v1.00.11)
**Method:** read straight from the extracted game data + the mod's save engine. Every claim below is tagged **[VERIFIED]** (it's in the files) or **[COMMUNITY CLAIM — UNPROVEN]** (people say it, the files don't back it). No guessing.

---

## BOTTOM LINE (read this first)

1. **The "blue chest" = the Stage Boss Box** (the RARE-grade chest). **[VERIFIED]**
2. **There is NO numeric "drop rate" for the blue chest anywhere in the game's data files.** The game ships what's *inside* the chest and the *runes that raise its drop chance* — but not the base % itself. Anybody quoting you a hard number (e.g. "it's 4%") either measured it themselves or is guessing. **[VERIFIED — by absence]**
3. The "**farm and jump from Act to get blue chests consecutively**" thing rests on a claimed **12-minute (720-second) per-stage cooldown**. That number is **NOT in the game files** — the only `720`s in the entire data are combat damage stats. The trick is *plausible* but **not proven by the game itself.** **[COMMUNITY CLAIM — UNPROVEN]**
4. **"A blue box every ~20 minutes" is FALSE as a game rule.** There is no timer, cooldown, or fixed interval anywhere in the data. The blue box drops from STAGE BOSSES on a hidden chance, so the "interval" is just (your clear time) × (how many boss kills until it rolls) — it varies with your speed and the hidden odds, not a clock. A real drop log (the owner's own Player.log, §5) shows blue boxes arriving **irregularly**, tied to boss kills, never on a 20-min cadence. **[VERIFIED — by absence + measured]**
5. **"If I don't open common chests, a blue box always drops" is FALSE.** Normal and Stage-Boss chests are **completely independent systems**: each has its OWN drop-chance rune line (Normal ×15, Stage-Boss ×14, Act-Boss ×0 = guaranteed) and its OWN storage cap ("Max Amount Normal/Stage Boss/Act Boss Chest"), and the save tracks them as separate box types. Not opening commons has zero encoded link to the stage-boss roll. The owner's own log confirms it: commons dropped **27×** in a session while only **2** blue boxes appeared — they move independently. **[VERIFIED — game data + measured]**
6. **The only real lever on blue-box odds = the "Drop Chance Stage Boss Chest" runes** (Rune of Conquest family, +10–20% per level). That's the legitimate way to get more blue boxes — not chest-hoarding or stage-jump folklore. **[VERIFIED]**

---

## 1. What the "blue chest" actually is  **[VERIFIED]**

The game has exactly **three** treasure chests. Pulled from the localization table:

| In-game name | Source | Color tier |
|---|---|---|
| `TreasureChest_Normal` — "Common Treasure Chest" | normal monsters | COMMON |
| `TreasureChest_StageBoss` — "Stage Treasure Chest" | stage bosses | **RARE = blue** |
| `TreasureChest_ActBoss` — "Act Boss Treasure Chest" | act bosses | LEGENDARY (gold) |

The item table proves the color tiers. All 59 chest ("STAGEBOX") items split cleanly by grade:

| Grade | Count | Item name stem |
|---|---|---|
| COMMON | 19 | **"Normal Monster Box"** |
| **RARE** | **29** | **"Stage Boss Box"** ← the blue chest |
| LEGENDARY | 11 | **"Act Boss Box"** |

`RARE` is the canonical **blue** rarity hue in this game. The only RARE/blue chest is the **Stage Boss Box**.

> Note: the literal word **"Blue"** appears exactly **once** in the entire game data — as the monster **"Blue Golem."** The game never labels any chest "blue." "Blue chest" is a *player color-nickname*, not a game term — which is why the official tables won't answer a search for it directly.

**Proof:** `src/engine/localization.min.json` (TreasureChest_* keys); `src/engine/gamedata.min.json` → `items` (grade + names); single "Blue" hit = "Blue Golem" in `gamedata.min.js`.

---

## 2. The drop RATE — what the files do and don't contain  **[VERIFIED]**

> **PRECISION CORRECTION (2026-06-11, v1.0.17 session).** The original sentence here — "I searched the full
> 1.8 MB game-data dump for any drop-weight/probability field: zero" — searched the **baked**
> `gamedata.min.json`, not the raw CSVs. The raw `DropInfoData` **does** carry an integer `Weight` column per
> pool entry. The conclusion is **unchanged and now stronger**, verified directly against the raw table:
> every pool that contains a Stage Boss Box is either a **uniform class selector** (DropKey 9200010: the six
> class boxes 920001–920006, each weight 10000, picked by `HeroKeyCondition` — a selector, not a chance roll)
> or a **single-entry pool** (9200220/320/420/520: one box at weight 10000 = the pool's only outcome). Zero of
> the 59 STAGEBOX keys appear as weighted members of any mixed pool. So **no probability of a chest dropping
> is encoded anywhere** — what fires those pools, and how often, lives in game code. The measured tracker
> (Loot → Blue-chest tracker, v1.0.16) remains the only honest rate.

What *does* exist:

- **Drop tables** = box → list of possible item IDs (membership **only**, no weights). The extractor chain is `STAGEBOX item → DropKey → DropInfoData → ItemGroupInfoData`, and it pulls *which* items can come out — never the odds. (`scripts/build_gamedata.py`, lines ~252–274.)
- **Runes that *increase* Stage Boss Chest drop chance** — these exist and are real, but they're **multipliers on an unknown base**:
  - `Rune of Conquest` — "Drop Chance Stage Boss Chest Percent" — **+20% per level** (data value 200 ÷ 10), e.g. rune key 102.
  - other Conquest variants: **+15%/level** (150) and **+10%/level** (100).
  - (Normal-chest equivalents — "Rune of Exploration" — run +5% to +10% per level.)
- **Tell-tale asymmetry:** there is **no "Drop Chance Act Boss Chest" stat at all** (0 occurrences), while Normal and Stage Boss both have one. Act Boss chests only have **"Max Amount"** (storage capacity) and auto-open runes. That's the fingerprint of a chest that is **guaranteed on act-boss clear** — you can't have a "drop chance" stat for something that's 100%.

**Why no base %?** The actual per-pull weighting lives in the Korean `ItemGroupInfoData` weighting (and/or server logic) that the extractor **deliberately left uncalibrated** under its "no-guess" rule (`_calibrated.dropGroupNames = "omitted - … Korean/unlocalized (golden rule)"`). So **no honest single drop-rate % can be quoted from the files.**

**Proof:** `gamedata.min.json` (`drops`, `runes`, `_calibrated`); `src/engine/saveEngine.js` lines 55–63 (box contents = members only); `scripts/build_gamedata.py` lines 252–274.

---

## 3. "Jump from Act for consecutive blue chests" — verdict  **[COMMUNITY CLAIM — UNPROVEN]**

**The claim:** the blue (Stage Boss) chest has a cooldown *per stage*, so once you grab one on a stage you wait ~12 min for the next — **unless you switch to a different stage/act**, which has its own independent timer, letting you grab blue chests back-to-back.

**What the files say:**
- A community tool (**tbh-meter**) asserts a **12-minute blue-chest cooldown per stage**.
- The mod authors went looking for it in the game tables and found **no `720`s in `DropCooldown`** — the field isn't populated, and the chest items carry **no timer field** (their only fields are `dk, g, gt, ic, lvl, n, steam, t`).
- They classified the 12-min timer as **UNCALIBRATED** and **refused to ship it** — same "leave a note, not a guess" rule you run. Direct quotes from their own progress notes:
  - `docs/PROGRESS.md:25` — *"Blue-chest / cooldown tracker ⛔ — 12-min cadence uncalibrated (no 720s in DropCooldown). Box counts surfaced instead."*
  - `docs/PROGRESS.md:51` — *"12-min blue-chest timer — cadence not in the tables (DropCooldown has no 720s)."*
  - `docs/SESSION-GOAL.md:19` — *"DO NOT BUILD (golden rule): … 12-min blue-chest timer (no 720s in DropCooldown)."*
- The **Player.log** records only Steam *tradeable*-box errors (`[StageBox] Box opening timed out`, `[Drop] Box opening failed`) — **not** per-stage blue-chest spawn timestamps. So the log can't measure the cadence either.

**Verdict:** The "farm + jump Acts" technique is **consistent with** a per-stage-cooldown design and may well be real in practice — but it is **NOT proven by the game's own data.** Right now it's a forum claim, not a fact. Don't repeat the "12 minutes" as gospel.

---

## 4. How to actually PROVE it (the only honest path to a number)

The base rate and the cooldown aren't in the client tables, so the answer has to be **measured**, not read:

1. Park on **one** stage. Log a timestamp every time a **Stage Boss Box** lands. Measure the gaps.
2. Then **switch stages/acts** and immediately check whether a new blue chest is available with **no wait**.
3. If same-stage gaps cluster around a fixed interval (~12 min or whatever it really is) but **reset to zero on a stage switch**, the per-stage cooldown — and the "jump Acts" trick — is **proven** with measured data.

The HUD's loot timeline (save-diff + Player.log tail) is the right instrument; today it shows box **counts**. Add a **timestamped Stage-Boss-Box acquisition log across stage switches** and you'll have hard proof instead of forum lore. If you want, I'll build that measurement pass.

---

## 5. MEASURED from the owner's REAL save + Player.log (2026-06-15)  **[VERIFIED — measured]**

I did **not** need the owner to run anything new — the answer came from data already on disk: the live `.es3` save and `Player.log`.

**What the save stores about chests:** a `BoxData` object — parallel arrays `BoxTypes` (0 = Normal/common, 1 = Stage-Boss/blue, 2 = Act-Boss), `BoxUniqueId`, `BoxQuantity`. This is a **transient backlog** of boxes you're holding, not a cumulative counter — opening a box (or it routing to Steam) decrements it. Across the owner's save backups it bounced between e.g. `common 11 / blue 1` and `common 1 / blue 0`, so **you cannot count total drops from the save alone**, and the ~6h-apart backups are far too coarse for a per-drop cadence.

**What the Player.log gives (no timestamps):** the game periodically logs `GetBoxCount Success Count : N // ItemKey : <boxKey>`. Reading that sequence in log order and counting **upward transitions** = box drops (a lower bound, since the game samples the count only occasionally — quick drop→open cycles between two polls are missed). For the owner's two most recent sessions:

| Box | Current session (lower-bound drops) | Prior session (lower-bound drops) |
|---|---|---|
| Common (910xxx) | **27** | ~14 |
| **Stage-Boss / blue (920xxx)** | **2** | **~12 across stages** |
| Act-Boss (930xxx) | 0 | 0 |

(The `[ItemCache] Failed to add Steam item …` lines — 912× for common, 170× for blue — are **Steam-routing retries of the stuck backlog, NOT drops**; the boxes pile up locally because Steam's `AddItem` keeps returning `k_EResultFail`.)

**Verdicts these measurements support:**
- Blue boxes arrive **irregularly and far less often than commons** — consistent with a hidden per-boss-kill chance, **not** a 20-minute clock (debunks claim #4).
- Commons and blues move **independently** (27 commons vs 2 blues in the same window) — not opening commons did nothing to force blues (debunks claim #5).

**Can I give an exact personal rate?** Not from static files alone — the save's box backlog is transient and the log polls are sparse/untimestamped, so both undercount. **The right instrument is the HUD's own live blue-chest tracker** (Loot tab): it reads the save continuously while you play and logs each Stage-Boss-Box arrival with its stage + play-time. To get a hard number on *your* cadence — and to A/B test the common-chest theory directly — **run the HUD connected to your save for a farming session** (ideally compare a stretch with common auto-open OFF vs ON; the blue-box rate won't change, which settles it with your own data). Everything above is read-only — nothing in the game, save, or Steam was modified.

## Source index (file : what it proves)

| File | Proves |
|---|---|
| `src/engine/localization.min.json` | the 3 chest types (Normal / Stage Boss / Act Boss) |
| `src/engine/gamedata.min.json` → `items` | chest grades: COMMON=Normal, **RARE=Stage Boss (blue)**, LEGENDARY=Act Boss |
| `src/engine/gamedata.min.json` → `runes` | drop-chance runes exist for Normal + Stage Boss; **none** for Act Boss |
| `src/engine/gamedata.min.json` → full sweep | no weight/probability/odds/rate field anywhere |
| `src/engine/saveEngine.js` (L55–63) | box data = membership only, weights omitted by design |
| `scripts/build_gamedata.py` (L252–274) | extraction chain pulls box contents, not odds |
| `docs/PROGRESS.md` (L25, L51) | 12-min cadence = uncalibrated, no 720s in DropCooldown |
| `docs/SESSION-GOAL.md` (L19) | authors refused to ship the 12-min timer (golden rule) |
| `test/Player.log` | logs Steam box errors, not blue-chest spawn timing |

*Investigation run against the local repo on 2026-06-11. Read-only; nothing in the game or repo was modified.*
