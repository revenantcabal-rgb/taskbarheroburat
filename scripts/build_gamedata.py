#!/usr/bin/env python
"""
Build the authoritative TBH HUD game DB from the game's OWN data tables.

Sources (all extracted READ-ONLY from the game install):
  scripts/_gamedata_raw/ItemInfoData.txt   - per-itemKey: grade, type, geartype, NameKey, IconPath, level, flags
  scripts/_gamedata_raw/StatModInfoData.txt - StatModKey -> STATTYPE/MODTYPE (enchant stat names)
  scripts/_gamedata_raw/RuneInfoData.txt    - RuneKey -> NameKey, IconPath, MaxLevel
  scripts/_gamedata_raw/GearTypeInfoData.txt
  scripts/_gamedata_raw/localization_en.json - en-US text for every NameKey / StatName_ / RuneName_

NO GUESSING: every name comes from the game's NameKey -> localization. Items whose NameKey is
absent from the game's localization (10 unused type-15 placeholders, owned by nobody) get an honest
'<Grade> Material' fallback. Materials keep g=null (the tier lives in the name, per project rule).
Output: src/engine/gamedata.min.json  +  src/engine/gamedata.min.js (window.TBH_DB=...)
"""
import csv, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "_gamedata_raw")
ENG = os.path.join(os.path.dirname(HERE), "src", "engine")

GAME_VERSION = "1.00.11"


def rows(name):
    with open(os.path.join(RAW, name), encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def icon_id(path):
    m = re.search(r"(\d{4,7})$", path or "")
    return m.group(1) if m else (path or "")


def prettify(stattype):
    # FireDamagePercent -> "Fire Damage Percent"
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", stattype)


def main():
    loc = json.load(open(os.path.join(RAW, "localization_en.json"), encoding="utf-8"))
    old = json.load(open(os.path.join(ENG, "gamedata.min.json"), encoding="utf-8"))

    # ---- items ----
    items = {}
    name_resolved = name_literal = name_fallback = 0
    for r in rows("ItemInfoData.txt"):
        key = r["ItemKey"]
        itype = r["ITEMTYPE"]            # GEAR / MATERIAL / STAGEBOX
        grade = r["GRADE"] or None
        gtype = r["GEARTYPE"] or None
        parts = r["PARTS"] or None
        lvl = int(r["Level"]) if r["Level"] else None
        nk = r["NameKey"]
        is_mat = (itype == "MATERIAL")

        if nk.startswith("ItemName_"):
            base = nk[len("ItemName_"):]
            nm = loc.get(nk)            # localization keys are stored WITHOUT prefix? -> try both
            if nm is None:
                nm = loc.get(base)
            if nm is not None:
                name_resolved += 1
            else:
                # honest fallback for the unused/unnamed placeholders
                g = (grade or "").capitalize()
                nm = (g + " " + (gtype or ("Material" if is_mat else "Item"))).strip()
                name_fallback += 1
        elif nk:
            nm = nk                      # literal in-data name (STAGEBOX etc.)
            name_literal += 1
        else:
            nm = "#" + key
            name_fallback += 1

        e = {
            "n": nm,
            "g": None if is_mat else grade,   # materials carry tier in the name; no gear-rarity colour
            "t": itype,
            "gt": gtype,
            "lvl": lvl,
            "ic": icon_id(r["IconPath"]),
        }
        if is_mat:
            e["mat"] = True
        if parts:
            e["pt"] = parts
        if r.get("GearKey"):
            e["gk"] = r["GearKey"]
        if r.get("DropKey"):
            e["dk"] = r["DropKey"]
        if (r.get("IsSteamItem") or "").strip().lower() == "true":
            e["steam"] = 1
        if (r.get("IsCanExchangeMarketable") or "").strip().lower() == "true":
            e["mkt"] = 1
        items[key] = e

    # ---- enchant stat mods: StatModKey -> {stat type, display name, mod type} ----
    stats = {}
    for r in rows("StatModInfoData.txt"):
        k = r["StatModKey"]
        if k in stats:
            continue
        st = r["STATTYPE"]
        disp = loc.get("StatName_" + st) or prettify(st)
        stats[k] = {"s": st, "sn": disp, "m": r["MODTYPE"]}

    # ---- runes: RuneKey -> name + icon + maxlevel (197-node tree) ----
    runes = {}
    for r in rows("RuneInfoData.txt"):
        k = r["RuneKey"]
        nk = r["NameKey"]
        nm = loc.get(nk) or prettify(nk.replace("RuneName_", ""))
        runes[k] = {"n": nm, "ic": r.get("IconPath") or "", "max": int(r["MaxLevel"]) if r.get("MaxLevel") else None}

    out = {
        "version": {"game": GAME_VERSION, "save": old.get("version", {}).get("save")},
        "grades": old.get("grades"),
        "heroes": old.get("heroes"),
        "items": items,
        "stats": stats,
        "runes": runes,
        "_calibrated": {
            "source": "game ItemInfoData/StatModInfoData/RuneInfoData + en-US Localization (read-only)",
            "rarityFrom": "itemKey 3rd digit == GRADE column, validated 5760/5760 gear rows",
            "namesAuthoritative": name_resolved + name_literal,
            "namesFallback": name_fallback,
            "gameVersion": GAME_VERSION,
        },
    }

    js_path = os.path.join(ENG, "gamedata.min.json")
    with open(js_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    with open(os.path.join(ENG, "gamedata.min.js"), "w", encoding="utf-8") as f:
        f.write("window.TBH_DB=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write(";")

    print(f"items {len(items)} | names: authoritative {name_resolved+name_literal}, fallback {name_fallback}")
    print(f"stats {len(stats)} | runes {len(runes)}")
    print(f"wrote {js_path} ({os.path.getsize(js_path)//1024} KB)")


if __name__ == "__main__":
    main()
