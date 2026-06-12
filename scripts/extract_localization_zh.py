#!/usr/bin/env python
"""Extract the game's official Simplified Chinese (zh-hans) localization (READ-ONLY)
and build the runtime i18n payload for the HUD. Mirrors extract_localization.py but
for the zh-hans string-table bundle. Outputs:
  - src/engine/localization.zh.min.json   {key: zh_text}   (full, for reference)
  - src/engine/i18n_zh.min.js             window.TBH_ZH={game,stages,diff,grades}
The `game` map (en_text -> zh_text) is what the HUD's DOM pass uses to translate the
game's own proper nouns (item / stat / rune / monster / skill / gear-type names) that
render as English text. Stage names + difficulty + grade get dedicated key-based maps
so the HUD can translate them precisely at the source (no en-text collisions)."""
import UnityPy, os, json, re
AA = r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
HERE = os.path.dirname(os.path.abspath(__file__))
ENG = os.path.join(HERE, "..", "src", "engine")
zh = os.path.join(AA, "localization-string-tables-chinese(simplified)(zh-hans)_assets_all.bundle")
shared = os.path.join(AA, "localization-assets-shared_assets_all.bundle")


def collect(env):
    tables = {}
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        tt = obj.read_typetree()
        nm = tt.get("m_Name", "")
        if "m_TableData" in tt and tt.get("m_TableData"):
            d = {}
            for e in tt["m_TableData"]:
                d[int(e["m_Id"])] = e.get("m_Localized", "")
            tables.setdefault(nm, {})["data"] = d
        if "m_Entries" in tt and "m_TableData" not in tt:
            s = {}
            for e in tt["m_Entries"]:
                s[int(e["m_Id"])] = e.get("m_Key", "")
            tables.setdefault(nm, {})["shared"] = s
    return tables


zt = collect(UnityPy.load(zh))
sh = collect(UnityPy.load(shared))


def base(n):
    return re.sub(r"_zh-Hans$", "", n).replace(" Shared Data", "").strip()


shared_by_base = {base(k): v.get("shared") for k, v in sh.items() if v.get("shared")}
loc = {}
for name, t in zt.items():
    data = t.get("data")
    if not data:
        continue
    sd = shared_by_base.get(base(name))
    if not sd:
        print("WARN no shared for", name)
        continue
    for i, txt in data.items():
        key = sd.get(i)
        if key:
            loc[key] = txt
    print(f"{name}: {len(data)} entries joined")

# load en localization to build en_text -> zh_text for the DOM pass
with open(os.path.join(ENG, "localization.min.json"), "r", encoding="utf-8") as f:
    en = json.load(f)

# proper-noun prefixes that render as plain text in the HUD (safe to translate by en-text).
# Names only — long descriptions / {0} templates are skipped below (won't exact-match a DOM node).
GAME_PREFIXES = ("ItemName_", "StatName_", "RuneName_", "MonsterName_", "SkillName_",
                 "GearType_", "UniqueMod_", "Passive_", "HeroName_", "StageName_",
                 "Difficulty_")
game = {}
collisions = 0
for k, ev in en.items():
    if not k.startswith(GAME_PREFIXES):
        continue
    zv = loc.get(k)
    if not ev or not zv or "{" in ev:   # skip empties + templates with placeholders
        continue
    if ev in game and game[ev] != zv:
        collisions += 1
        continue                         # keep first; ambiguous en text
    game[ev] = zv

# precise key-based maps (no en-text collision risk)
stages = {k[len("StageName_"):]: v for k, v in loc.items() if k.startswith("StageName_") and v}
diff = {en[k]: loc.get(k) for k in ("Difficulty_NORMAL", "Difficulty_NIGHTMARE",
        "Difficulty_HELL", "Difficulty_TORMENT") if k in en and loc.get(k)}
grades = {en[k]: loc[k] for k in en if k.startswith("Grade_") and loc.get(k) and en[k]}

# fold grades into the en->zh game map too, so rarity words (Legendary, Immortal, …)
# rendered as plain text get translated by the DOM pass.
for ev, zv in grades.items():
    game.setdefault(ev, zv)

payload = {"game": game, "stages": stages, "diff": diff, "grades": grades}

with open(os.path.join(ENG, "localization.zh.min.json"), "w", encoding="utf-8") as f:
    json.dump(loc, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
with open(os.path.join(ENG, "i18n_zh.min.js"), "w", encoding="utf-8") as f:
    f.write("window.TBH_ZH=")
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";")

print("\nTOTAL zh keys:", len(loc), "| collisions skipped:", collisions)
print("game en->zh entries:", len(game), "| stages:", len(stages),
      "| diff:", len(diff), "| grades:", len(grades))
print("diff:", diff)
print("grades:", grades)
print("samples:", {k: game[k] for k in list(game)[:6]})
print("StageName_1101 zh:", stages.get("1101"), "| StageName_1310 zh:", stages.get("1310"))
