#!/usr/bin/env python
"""
TBH HUD - item icon extractor (Phase 2).

READ-ONLY against the game install. Reads the item-icon sprites out of the
game's sharedassets0.assets (+ .resS) and writes them to src/assets/sprites/
as Item_<id>.png at native resolution (16x16 RGBA pixel art).

Two sprite naming schemes carry item icons inside sharedassets0:
  - Item_<id>        -> materials / consumables / currency (e.g. Item_190001)
  - <TYPE>_<id>      -> gear, where TYPE is the weapon/armour class in CAPS
                        (e.g. CROSSBOW_340001, ORB_420001, BOOTS_530019)
Both end in the numeric ItemKey. We key every output by that numeric id so the
renderer only ever needs Item_<numericKey>.png.

Never writes to the game folder. UnityPy.load() only reads.
"""
import os
import re
import sys
import json

import UnityPy

GAME_DATA = r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data"
SRC = os.path.join(GAME_DATA, "sharedassets0.assets")

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
OUT_DIR = os.path.join(PROJECT, "src", "assets", "sprites")

# Item_<id>  OR  <CAPS TYPE>_<id>  (id = 4-7 digits, the numeric ItemKey)
PAT_ITEM = re.compile(r"^Item_(\d{4,7})$")
PAT_GEAR = re.compile(r"^([A-Z][A-Z0-9]+)_(\d{5,7})$")


def numeric_id(name):
    m = PAT_ITEM.match(name)
    if m:
        return m.group(1)
    m = PAT_GEAR.match(name)
    if m:
        return m.group(2)
    return None


def main():
    if not os.path.isfile(SRC):
        sys.exit(f"ERROR: game asset not found: {SRC}")
    os.makedirs(OUT_DIR, exist_ok=True)

    env = UnityPy.load(SRC)

    # name -> object, keep the first occurrence per numeric id
    by_id = {}
    for obj in env.objects:
        if obj.type.name != "Sprite":
            continue
        try:
            name = obj.read().m_Name
        except Exception:
            continue
        if not name:
            continue
        iid = numeric_id(name)
        if iid and iid not in by_id:
            by_id[iid] = (name, obj)

    print(f"matched {len(by_id)} item-icon sprites")

    written, skipped, sizes = 0, 0, {}
    manifest = {}
    for iid, (name, obj) in sorted(by_id.items()):
        try:
            img = obj.read().image
        except Exception as e:
            print(f"  SKIP {iid} ({name}): read error {e}")
            skipped += 1
            continue
        if img is None:
            skipped += 1
            continue
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        # discard fully transparent (placeholder) sprites
        if img.getbbox() is None:
            skipped += 1
            continue
        out = os.path.join(OUT_DIR, f"Item_{iid}.png")
        img.save(out)
        sizes[img.size] = sizes.get(img.size, 0) + 1
        manifest[iid] = {"src_name": name, "w": img.size[0], "h": img.size[1]}
        written += 1

    # write a manifest so the renderer / name-decode can know what exists
    with open(os.path.join(OUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, separators=(",", ":"), sort_keys=True)

    print(f"written {written}, skipped {skipped}")
    print("native sizes:", {f"{w}x{h}": n for (w, h), n in sorted(sizes.items())})
    print(f"output: {OUT_DIR}")


if __name__ == "__main__":
    main()
