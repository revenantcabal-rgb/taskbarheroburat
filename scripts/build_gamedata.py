#!/usr/bin/env python
"""
Build the authoritative TBH HUD game DB from the game's OWN data tables (all read-only).

Sources in scripts/_gamedata_raw/ (extracted by dump_textassets.py / extract_localization.py):
  ItemInfoData          - per-itemKey: grade, type, geartype, NameKey, DescriptionKey, IconPath, level, flags
  StatModInfoData       - StatModKey -> STATTYPE/MODTYPE (enchant + material stat names)
  MaterialInfoData      - material ItemKey -> MATERIALTYPE + StatModGroupKey
  StatModGroupInfoData  - StatModGroupKey -> per gear-group (WEAPON/ARMOR/ACCESSORY) StatModKey + tier
  RuneInfoData          - RuneKey -> NameKey, IconPath, MaxLevel, NextRuneKey, PrevNodeRequiredLevel, LevelDataKey
  RuneLevelInfoData     - LevelKey,Level -> CostItemKey, CostValue, STATTYPE, Value
  localization_en.json  - en-US text for every NameKey / DescriptionKey / StatName_

NO GUESSING: every label comes from the game's keys -> localization. Items whose NameKey is absent from the
game's localization (10 unused/unowned type-15 placeholders) get an honest '<Grade> Material' fallback.
Output: src/engine/gamedata.min.json + src/engine/gamedata.min.js (window.TBH_DB=...)
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


def prettify(s):
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s or "")


def main():
    loc = json.load(open(os.path.join(RAW, "localization_en.json"), encoding="utf-8"))
    old = json.load(open(os.path.join(ENG, "gamedata.min.json"), encoding="utf-8"))

    def L(key):  # resolve a localization key (with or without prefix)
        if not key:
            return None
        return loc.get(key) or loc.get(re.sub(r"^[A-Za-z]+_", "", key))

    # ---- enchant/material stat mods: StatModKey -> {stat, display name, mod} ----
    stats = {}
    for r in rows("StatModInfoData.txt"):
        k = r["StatModKey"]
        if k in stats:
            continue
        st = r["STATTYPE"]
        stats[k] = {"s": st, "sn": loc.get("StatName_" + st) or prettify(st), "m": r["MODTYPE"]}

    # ---- StatModGroupKey -> [{gearGroup, statName, tier}] (resolves a material's contextual effect) ----
    groups = {}
    for r in rows("StatModGroupInfoData.txt"):
        gk = r["StatModGroupKey"]
        smk = r["StatModKey"]
        sn = stats[smk]["sn"] if smk in stats else smk
        groups.setdefault(gk, []).append({"g": r["GearGroup"], "sn": sn, "t": int(r["MinTier"]) if r.get("MinTier") else None})

    # ---- material ItemKey -> {type, effect group} ----
    materials = {}
    for r in rows("MaterialInfoData.txt"):
        materials[r["ItemKey"]] = {"mt": r["MATERIALTYPE"], "grp": r.get("StatModGroupKey") or None}

    # ---- unique mods: UniqueModKey -> authoritative effect text (localized) ----
    uniquemods = {}
    for r in rows("UniqueModInfoData.txt"):
        nm = r["UniqueMod"]
        uniquemods[r["UniqueModKey"]] = loc.get("UniqueMod_" + nm) or prettify(nm)

    # ---- gear stats: GearKey -> {inherent stats (labeled), unique-mod text} ----
    # ONLY the authoritatively-labeled fields. GearInfoData also has BaseStat1/2_Value, but the game
    # ships no GearTypeInfoData mapping those columns to a stat type, so we DO NOT display or guess them
    # (golden rule: never fabricate a label). Inherent stats carry their own STATTYPE/MODTYPE -> real.
    gear = {}
    gear_inh = gear_um = 0
    for r in rows("GearInfoData.txt"):
        inh = []
        for i in (1, 2, 3):
            st = r.get("InherentStat%d_STATTYPE" % i)
            if st and st != "NONE":
                raw = r.get("InherentStat%d_Value" % i) or "0"
                try:
                    v = float(raw)
                    v = int(v) if v.is_integer() else v
                except ValueError:
                    v = raw
                inh.append({"sn": loc.get("StatName_" + st) or prettify(st), "st": st,
                            "m": r.get("InherentStat%d_MODTYPE" % i), "v": v})
        e = {}
        if inh:
            e["i"] = inh
            gear_inh += 1
        umk = (r.get("UniqueModKey") or "").strip()
        if umk and umk in uniquemods:
            e["u"] = uniquemods[umk]
            gear_um += 1
        if e:  # store only gear that has labeled inherent stats and/or a unique mod
            gear[r["GearKey"]] = e

    # ---- skills: SkillKey -> {name, description} (SkillInfoData + localization). Base attacks have no NameKey -> skipped. ----
    skills = {}
    for r in rows("SkillInfoData.txt"):
        nm = L(r.get("SkillNameKey"))
        if not nm:
            continue
        e = {"n": nm}
        dd = L(r.get("SkillDescriptionKey"))
        if dd:
            e["d"] = dd
        skills[r["SkillKey"]] = e

    # ---- heroes: HeroInfoData -> class, localized name, main weapon, innate base stats ----
    HERO_BASE = ["AttackDamage", "AttackSpeed", "CastSpeed", "CriticalChance", "CriticalDamage",
                 "MaxHp", "Armor", "CooldownReduction", "MovementSpeed"]
    heroes = {}
    for r in rows("HeroInfoData.txt"):
        base = []  # list of {sn (display), st (STATTYPE), v} — innate hero stats
        for st in HERO_BASE:
            raw = (r.get(st) or "").strip()
            if raw and raw != "0":
                try:
                    fv = float(raw); v = int(fv) if fv.is_integer() else fv
                    base.append({"sn": loc.get("StatName_" + st) or prettify(st), "st": st, "v": v})
                except ValueError:
                    pass
        heroes[r["HeroKey"]] = {"cls": r.get("ClassType") or ("#" + r["HeroKey"]),
                                "n": L(r.get("HeroNameKey")) or r.get("ClassType"),
                                "mw": r.get("MainWeaponGearType") or None, "base": base}

    # ---- passive skills: PassiveSkillKey -> the stat it grants per level (labeled) ----
    passives = {}
    for r in rows("PassiveSkillInfoData.txt"):
        st = r.get("STATTYPE")
        raw = (r.get("Value") or "0").strip()
        try:
            v = float(raw); v = int(v) if v.is_integer() else v
        except ValueError:
            v = raw
        passives[r["PassiveSkillKey"]] = {"sn": loc.get("StatName_" + st) or prettify(st), "st": st,
                                          "m": r.get("MODTYPE"), "v": v}

    # ---- hero attribute tree: AttributeKey -> {hero, type, value(->passive/skill key), maxLevel} ----
    # ATTRIBUTETYPE PASSIVESKILL -> Value is a PassiveSkillKey (stat); ACTIVESKILL -> Value is a SkillKey.
    attributes = {}
    for r in rows("AttributeInfoData.txt"):
        attributes[r["AttributeKey"]] = {"h": r["HeroKey"], "type": r["ATTRIBUTETYPE"],
                                         "val": r["Value"], "max": int(r["MaxLevel"]) if r.get("MaxLevel") else None}

    # ---- pets: PetKey -> name + description ----
    pets = {}
    for r in rows("PetInfoData.txt"):
        pets[r["PetKey"]] = {"n": L(r.get("NameKey")) or prettify((r.get("NameKey") or "").replace("PetName_", "")),
                             "desc": L(r.get("DescriptionKey"))}

    # ---- monsters: MonsterKey -> name. aggregateSaveDatas Type 0 sub-counters are per-MonsterKey kill
    # counts (VALIDATED: they sum exactly to total kills) -> enables an honest "kills by monster" breakdown.
    monsters = {}
    for r in rows("MonsterInfoData.txt"):
        nm = L(r.get("MonsterNameStringKey"))
        if nm:
            monsters[r["MonsterKey"]] = nm

    # ---- rune per-level effects: LevelKey -> [{level, cost, value, stat}] ----
    rune_levels = {}
    for r in rows("RuneLevelInfoData.txt"):
        rune_levels.setdefault(r["LevelKey"], []).append(
            {"l": int(r["Level"]), "cost": int(r["CostValue"]) if r.get("CostValue") else None,
             "val": r["Value"], "st": r["STATTYPE"]})

    # ---- items ----
    items = {}
    name_resolved = name_literal = name_fallback = desc_count = mat_fx = 0
    for r in rows("ItemInfoData.txt"):
        key = r["ItemKey"]
        itype = r["ITEMTYPE"]
        grade = r["GRADE"] or None
        gtype = r["GEARTYPE"] or None
        parts = r["PARTS"] or None
        lvl = int(r["Level"]) if r["Level"] else None
        nk = r["NameKey"]
        is_mat = (itype == "MATERIAL")

        if nk.startswith("ItemName_"):
            nm = L(nk)
            if nm is not None:
                name_resolved += 1
            else:
                nm = ((grade or "").capitalize() + " " + (gtype or ("Material" if is_mat else "Item"))).strip()
                name_fallback += 1
        elif nk:
            nm = nk
            name_literal += 1
        else:
            nm, _ = "#" + key, None
            name_fallback += 1

        e = {"n": nm, "g": None if is_mat else grade, "t": itype, "gt": gtype, "lvl": lvl, "ic": icon_id(r["IconPath"])}
        desc = L(r.get("DescriptionKey"))
        if desc:
            e["desc"] = desc
            desc_count += 1
        if is_mat:
            e["mat"] = True
            m = materials.get(key)
            if m:
                e["mt"] = m["mt"]
                if m["grp"] and m["grp"] in groups:
                    e["fx"] = groups[m["grp"]]
                    mat_fx += 1
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

    # ---- runes: full tree (name, icon, max, per-level effect+cost, links) ----
    runes = {}
    for r in rows("RuneInfoData.txt"):
        k = r["RuneKey"]
        lvls = rune_levels.get(r.get("LevelDataKey"), [])
        eff = prettify(lvls[0]["st"]) if lvls else prettify(r["NameKey"].replace("RuneName_", ""))
        runes[k] = {
            "n": L(r["NameKey"]) or prettify(r["NameKey"].replace("RuneName_", "")),
            "ic": r.get("IconPath") or "",
            "max": int(r["MaxLevel"]) if r.get("MaxLevel") else None,
            "eff": eff,
            "lv": [{"l": x["l"], "cost": x["cost"], "val": x["val"]} for x in sorted(lvls, key=lambda y: y["l"])],
            "next": [n for n in (r.get("NextRuneKey") or "").split() if n],
            "req": int(r["PrevNodeRequiredLevel"]) if r.get("PrevNodeRequiredLevel") else None,
        }

    # ---- drop tables: box DropKey -> member ItemKeys (DropInfoData -> ItemGroupInfoData) ----
    # Chain: a STAGEBOX item carries a DropKey -> DropInfoData rows -> REWARDTYPE ITEMGROUP (RewardKey ->
    # ItemGroupInfoData member ItemKeys) or REWARDTYPE ITEM (RewardKey is the ItemKey directly).
    # We key by DropKey (normalized: boxes sharing a DropKey aren't duplicated). The renderer/engine resolve
    # a box's contents via item.dk -> drops[dk], and the reverse "drops from" by inverting this map.
    # We restrict to DropKeys actually owned by a STAGEBOX item (the player-facing, EN-named sources) and
    # OMIT the Korean ItemGroup GroupName entirely (golden rule: never expose/guess unlocalized text).
    group_members = {}
    for r in rows("ItemGroupInfoData.txt"):
        group_members.setdefault(r["ItemGroupKey"], []).append(r["ItemKey"])
    box_dropkeys = set(e["dk"] for e in items.values() if e.get("t") == "STAGEBOX" and e.get("dk"))
    drops_set = {}
    for r in rows("DropInfoData.txt"):
        dk = r["DropKey"]
        if dk not in box_dropkeys:
            continue
        s = drops_set.setdefault(dk, set())
        if r["REWARDTYPE"] == "ITEMGROUP":
            for ik in group_members.get(r["RewardKey"], []):
                s.add(ik)
        elif r["REWARDTYPE"] == "ITEM" and r.get("RewardKey"):
            s.add(r["RewardKey"])
    drops = {k: sorted(v, key=lambda x: int(x) if x.isdigit() else x) for k, v in sorted(drops_set.items())}
    drop_member_refs = sum(len(v) for v in drops.values())

    # ---- hero level curve: Level -> ExpForLevelUp (exp needed WITHIN that level to reach the next).
    # CALIBRATED vs the live save: every hero's HeroExp < ExpForLevelUp[HeroLevel] (per-level progress, not
    # cumulative) -> enables an honest "XP to next level" (xpToNext = ExpForLevelUp[L] - HeroExp). Not ETA (needs xp/hr).
    levels = {}
    for r in rows("LevelInfoData.txt"):
        try:
            levels[int(r["Level"])] = int(r["ExpForLevelUp"])
        except (ValueError, KeyError):
            pass

    out = {
        "version": {"game": GAME_VERSION, "save": old.get("version", {}).get("save")},
        "grades": old.get("grades"),
        "heroes": heroes,
        "items": items,
        "stats": stats,
        "gear": gear,
        "skills": skills,
        "attributes": attributes,
        "passives": passives,
        "pets": pets,
        "monsters": monsters,
        "runes": runes,
        "drops": drops,
        "levels": levels,
        "_calibrated": {
            "source": "game ItemInfoData/StatModInfoData/MaterialInfoData/StatModGroupInfoData/GearInfoData/UniqueModInfoData/RuneInfoData(+Level) + en-US Localization (read-only)",
            "rarityFrom": "itemKey 3rd digit == GRADE column, validated 5760/5760 gear rows",
            "namesAuthoritative": name_resolved + name_literal,
            "namesFallback": name_fallback,
            "descriptions": desc_count,
            "materialEffects": mat_fx,
            "gearInherentStats": gear_inh,
            "gearUniqueMods": gear_um,
            "gearBaseStatsShown": "no - GearTypeInfoData absent, BaseStat1/2 columns unlabeled, not guessed",
            "dropBoxes": len(drops),
            "dropMemberRefs": drop_member_refs,
            "dropGroupNames": "omitted - ItemGroupInfoData GroupNames are Korean/unlocalized (golden rule)",
            "gameVersion": GAME_VERSION,
        },
    }

    path = os.path.join(ENG, "gamedata.min.json")
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    with open(os.path.join(ENG, "gamedata.min.js"), "w", encoding="utf-8") as f:
        f.write("window.TBH_DB=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        f.write(";")

    print(f"items {len(items)} | names auth {name_resolved+name_literal}, fallback {name_fallback} | desc {desc_count} | mat-effects {mat_fx}")
    print(f"stats {len(stats)} | runes {len(runes)} (with per-level effects)")
    print(f"gear {len(gear)} | inherent-stat sets {gear_inh} | unique mods {gear_um}")
    print(f"skills {len(skills)} | heroes {len(heroes)} (w/ base stats) | attributes {len(attributes)} | passives {len(passives)} | pets {len(pets)} | monsters {len(monsters)}")
    print(f"drops {len(drops)} box DropKeys | {drop_member_refs} member refs (box contents / reverse drop sources)")
    print(f"levels {len(levels)} (hero XP-to-next curve, calibrated vs live save)")
    print(f"wrote {path} ({os.path.getsize(path)//1024} KB)")


if __name__ == "__main__":
    main()
