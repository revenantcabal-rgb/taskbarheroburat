#!/usr/bin/env python
"""Extract the complete en-US localization (READ-ONLY) from the game's Addressable
bundles. Joins each StringTable's m_TableData (id->localized) to its Shared Data
m_Entries (id->key) -> {key: text}. Covers ItemTable + StringTable (stat/rune/
skill/monster/passive/etc.). Output: scripts/_gamedata_raw/localization_en.json"""
import UnityPy, os, json, re
AA=r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data\StreamingAssets\aa\StandaloneWindows64"
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"_gamedata_raw")
enus=os.path.join(AA,"localization-string-tables-english(unitedstates)(en-us)_assets_all.bundle")
shared=os.path.join(AA,"localization-assets-shared_assets_all.bundle")

def collect(env):
    tables={}  # name -> {'data':{id:text}, 'shared':{id:key}}
    for obj in env.objects:
        if obj.type.name!="MonoBehaviour": continue
        tt=obj.read_typetree()
        nm=tt.get("m_Name","")
        if "m_TableData" in tt and tt.get("m_TableData"):
            d={}
            for e in tt["m_TableData"]:
                d[int(e["m_Id"])]=e.get("m_Localized","")
            tables.setdefault(nm,{})["data"]=d
        if "m_Entries" in tt and "m_TableData" not in tt:
            s={}
            for e in tt["m_Entries"]:
                s[int(e["m_Id"])]=e.get("m_Key","")
            tables.setdefault(nm,{})["shared"]=s
    return tables

en=collect(UnityPy.load(enus))
sh=collect(UnityPy.load(shared))

loc={}
# match en-US data tables to shared by base name (strip suffixes)
def base(n): return n.replace("_en-US","").replace(" Shared Data","").strip()
shared_by_base={base(k):v.get("shared") for k,v in sh.items() if v.get("shared")}
for name,t in en.items():
    data=t.get("data")
    if not data: continue
    sd=shared_by_base.get(base(name))
    if not sd: 
        print("WARN no shared for",name); continue
    for i,txt in data.items():
        key=sd.get(i)
        if key: loc[key]=txt
    print(f"{name}: {len(data)} entries joined")

with open(os.path.join(OUT,"localization_en.json"),"w",encoding="utf-8") as f:
    json.dump(loc,f,ensure_ascii=False,separators=(",",":"),sort_keys=True)
# summary by prefix
from collections import Counter
pref=Counter(k.split("_")[0] for k in loc)
print("\nTOTAL keys:",len(loc))
print("by prefix:",dict(sorted(pref.items(),key=lambda x:-x[1])[:25]))
print("ItemName_150001:",loc.get("ItemName_150001"))
print("ItemName_340004:",loc.get("ItemName_340004"))
print("sample StatName:",[ (k,loc[k]) for k in loc if k.startswith("StatName")][:5])
print("sample RuneName:",[ (k,loc[k]) for k in loc if k.startswith("RuneName")][:3])
