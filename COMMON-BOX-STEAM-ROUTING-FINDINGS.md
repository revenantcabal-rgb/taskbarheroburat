# TBH — "Where did my common boxes go?" (Steam-routing investigation, file-verified)

**Game:** TBH: Task Bar Hero (Steam appid 3678970, game v1.00.11)
**Method:** read straight from the player's own `Player.log` + the calibrated game DB + the save-engine diff
(`test/_chest_forensics.js`). Every claim is tagged **[VERIFIED]** (it's in the files) or **[CAVEAT]** (can't be
re-checked now — said plainly). Read-only; nothing in the game or repo was modified.

---

## BOTTOM LINE (read this first)
The HUD is **not** missing a drop. The common boxes the game minted in that window **never reached your local save** —
they were routed to your **Steam inventory**, which the game itself reports as **empty** ("items is empty"). The
"New items" timeline reads your *local save*, so it correctly can't show what isn't there. **This is a Steam/game-side
issue, not a HUD bug.** **[VERIFIED]**

## 1. What the log shows  **[VERIFIED]**
In the current `test/Player.log`:
- **170 box-creation events — every single one `itemBoxKey=910201`.** The last 30 box mints are all `910201` too.
- **Every one is paired 1:1 with** `[ItemCache] CreateSteamItem returned OK but items is empty. itemBoxKey=910201`
  — **170 box mints, 170 "items is empty" lines.** The common boxes are routed down the `CreateSteamItem`
  (Steam-inventory) path, and Steam returns nothing.
- This is a known **game-side throttle** of the Steam Inventory Service (same root cause as the deferred "Steam
  Market value" goal — see `CLAUDE.md` / `docs/PRD.md` #8), not anything on the HUD's end.

## 2. What the two box keys actually are  **[VERIFIED — from the game DB]**
`src/engine/gamedata.min.json` → `items`:
| Key | Name | Grade |
|---|---|---|
| `910201` | **Normal Monster Box Lv20** | **COMMON** |
| `920201` | **Stage Boss Box Lv20** | **RARE** (the "blue chest") |

## 3. Why the asymmetry you noticed is exactly right  **[VERIFIED by absence]**
- The rare **Stage Boss Box (`920201`)** does **not** appear in the `CreateSteamItem … items is empty` path at all —
  it landed in your **save** and therefore **shows** in the timeline.
- The later **common boxes (`910201`)** all went to the **empty Steam queue** → not in `itemSaveDatas` → correctly
  absent from the timeline.
- Both keys do appear in the game's `GetBoxCount` lines (Steam-inventory count checks) — which is what feeds the
  separate **"Steam boxes you're holding"** section at the top of the Loot tab. Those counts are **Steam-driven and
  currently unreliable** because Steam keeps returning empty.

## 4. The one honest caveat  **[CAVEAT]**
The single common box that *did* land in the save (≈**12:24:44**) is the one you see. While checking, the game's own
rolling backup covering **~12:30** was **overwritten by its normal rotation**, so that exact minute can't be
re-inspected. The current save + the full log are otherwise consistent: common boxes are going to the (empty) Steam
inventory, not the save.

## 5. The fix that makes this less confusing (proposed — see `docs/GOAL-v1.0.16.md` P1)
`Player.log` literally tells us when the game mints boxes Steam isn't delivering ("items is empty"). So the HUD can add
an **honest Loot-tab note** — e.g. *"The game generated N boxes that Steam's inventory hasn't delivered yet (Steam
returned empty). They're held on Steam, not in your save — so they don't appear in the timeline below."* — read
directly from the `CreateSteamItem … items is empty` + `GetBoxCount` lines. Calibrated, read-only, no guessing. This
turns a "where's my chest?" mystery into a one-line explanation. **Wired into the next build as P1.**

---

## Source index (file : what it proves)
| File | Proves |
|---|---|
| `test/Player.log` (`itemBoxKey=910201` ×170) | 170 common-box mints, last 30 all `910201` |
| `test/Player.log` (`items is empty` ×170) | each mint routed to Steam, which returns empty (1:1 pairing) |
| `test/Player.log` (`GetBoxCount … ItemKey : 910201/920201`) | source of the Loot tab's "Steam boxes you're holding" counts |
| `src/engine/gamedata.min.json` → `items` | `910201` = Normal Monster Box (COMMON); `920201` = Stage Boss Box (RARE) |
| `test/_chest_forensics.js` | read-only save-diff forensics across snapshots (the same UniqueId diff the loot timeline uses) |

*Investigation re-verified against the local repo on 2026-06-11. Read-only; nothing modified.*
