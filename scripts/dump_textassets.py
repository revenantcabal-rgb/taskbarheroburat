import UnityPy, os
DATA=r"D:\steam\steamapps\common\TaskbarHero\TaskBarHero_Data\sharedassets0.assets"
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),"_gamedata_raw")
os.makedirs(OUT,exist_ok=True)
want=set(["ItemInfoData","GearInfoData","DropInfoData","ItemGroupInfoData","StatModInfoData",
  "GradeInfoData","GearTypeInfoData","RuneInfoData","RuneLevelInfoData","SkillInfoData","SkillLevelInfoData",
  "MonsterInfoData","MaterialInfoData","UniqueModInfoData","StatModGroupInfoData","AttributeInfoData",
  "PassiveSkillInfoData","ItemLevelScaleInfoData","GearTypeScaleInfoData","HeroInfoData","PetInfoData",
  "SynthesisRecipeInfoData","CraftingRecipeInfoData","OfflineRewardInfoData"])
env=UnityPy.load(DATA)
for obj in env.objects:
    if obj.type.name=="TextAsset":
        d=obj.read(); nm=d.m_Name
        if nm in want:
            raw=d.m_Script
            data=raw.encode("utf-8","surrogateescape") if isinstance(raw,str) else bytes(raw)
            with open(os.path.join(OUT,nm+".txt"),"wb") as f: f.write(data)
print("dumped to",OUT)
