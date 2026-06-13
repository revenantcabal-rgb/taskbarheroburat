'use strict';
const crypto = require('crypto');
const ES3_PASSWORD = 'emuMqG3bLYJ938ZDCfieWJ';
const GOLD_KEY = 100001;
const NET_TICKS_TO_UNIX_MS = 62135596800000;
const RARITY = ['COMMON','UNCOMMON','RARE','LEGENDARY','IMMORTAL','ARCANA','BEYOND','CELESTIAL','DIVINE','COSMIC'];
let DB = null, _dropSrc = null, _recipeSrc = null;
function setDB(db){ DB = db; _dropSrc = null; _recipeSrc = null; }

function decryptEs3(buffer){ const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer); const iv=b.subarray(0,16),ct=b.subarray(16); const key=crypto.pbkdf2Sync(ES3_PASSWORD,iv,100,16,'sha1'); const d=crypto.createDecipheriv('aes-128-cbc',key,iv); return Buffer.concat([d.update(ct),d.final()]).toString('utf8'); }
function safeJsonParse(t){ return JSON.parse(String(t).replace(/([:\[,])(\s*)(\d{16,})(?=\s*[,\]}])/g,'$1$2"$3"')); }
function loadFromDecryptedText(o){ const outer=JSON.parse(o); let inner=outer.PlayerSaveData?outer.PlayerSaveData.value:outer; if(typeof inner==='string') inner=safeJsonParse(inner); return inner; }
function loadSave(buffer){ return loadFromDecryptedText(decryptEs3(buffer)); }
const netTicksToDate=t=>{const n=typeof t==='string'?Number(t):t;return n?new Date(n/10000-NET_TICKS_TO_UNIX_MS):null;};
const pick=(a,t,s)=>{const r=(a||[]).find(x=>x.Type===t&&x.SubKey===s);return r?r.Value:null;};
const nz=v=>v&&v!==0&&v!=='0';

// gearStats(gk): authoritative inherent stats + unique-mod text for a GearKey (DB.gear from GearInfoData/UniqueModInfoData). No fabrication.
function gearStats(gk){ return (gk&&DB&&DB.gear)?(DB.gear[gk]||DB.gear[String(gk)]||null):null; }
function itemInfo(key){ const i=DB&&DB.items&&(DB.items[key]||DB.items[String(key)]); return i?{name:i.n,grade:i.g,type:i.t,gt:i.gt,lvl:i.lvl,ic:i.ic,mat:!!i.mat,mt:i.mt||null,fx:i.fx||null,gk:i.gk,base:gearStats(i.gk)}:{name:'#'+key,grade:null,type:null,gt:null,lvl:null,ic:null,mat:false,mt:null,fx:null,gk:null,base:null}; }
// enchant stat-mod -> authoritative display name (DB.stats from the game's StatModInfoData). No fabrication.
function statName(modKey){ const s=DB&&DB.stats&&DB.stats[String(modKey)]; return s?s.sn:('Stat #'+modKey); }
// v1.0.17: also carries matKey (the consumed stone) + statType (the save's raw numeric stat id; the resolved
// STATTYPE string is in `stat`) — the calibration tuple for the opt-in enchant report. Display fields unchanged.
function resolveMods(ench){ return (ench||[]).filter(m=>m&&m.StatModKey).map(m=>{ const s=DB&&DB.stats&&DB.stats[String(m.StatModKey)]; return {name:s?s.sn:('Stat #'+m.StatType),value:m.Value,tier:m.Tier,mod:s?s.m:null,stat:s?s.s:null,matKey:(m.MaterialKey!=null?String(m.MaterialKey):null),statType:(m.StatType!=null?String(m.StatType):null)}; }); }
// Structural icon resolver: the game only ships base (rarity-0) gear icons (TYPE_<id>) plus
// Item_<id> for materials/currency. A gear key is [type:2][rarity:1][baseIndex:2][sub:1]; the icon
// for any rarity is the type's base icon at baseIndex (type+'00'+idx). Pure logic so it runs in the
// browser too; the renderer falls back to a placeholder on a 404 (img.onerror). Returns the icon id
// (render src = assets/sprites/Item_<iconId>.png). Never claims a specific base NAME — only the icon.
function iconId(key){ const s=String(key); if(s.length!==6) return s; const type=s.slice(0,2),rarity=s[2],suf=s.slice(3); if(rarity==='0') return s; return type+'00'+suf.slice(0,2); }
function heroClass(key){ const h=DB&&DB.heroes&&(DB.heroes[key]||DB.heroes[String(key)]); return h?h.cls:('#'+key); }
// XP-to-next-level (CALIBRATED: HeroExp is per-level progress, DB.levels[L]=ExpForLevelUp threshold). Not ETA.
function xpToNext(level,exp){ const need=DB&&DB.levels&&(DB.levels[level]||DB.levels[String(level)]);
  if(!need||need<=0) return {need:null,remaining:null,pct:null};
  const e=Math.max(0,Math.round(exp||0)); return {need:need,remaining:Math.max(0,need-e),pct:Math.max(0,Math.min(1,e/need))}; }
function skillName(key){ const s=DB&&DB.skills&&(DB.skills[key]||DB.skills[String(key)]); return s?s.n:null; }
// --- who's-carrying source breakdown (mirror of the inline engine) ---
function sumStats(list){ const by={}; (list||[]).forEach(s=>{ if(s.v==null||s.v==='')return; const v=typeof s.v==='number'?s.v:parseFloat(s.v); if(isNaN(v))return; const k=(s.st||s.sn)+'|'+(s.m||''); if(!by[k])by[k]={sn:s.sn,st:s.st,m:s.m,v:0}; by[k].v+=v; }); return Object.values(by).filter(x=>x.v).sort((a,b)=>Math.abs(b.v)-Math.abs(a.v)); }
function heroBase(key){ const h=DB&&DB.heroes&&(DB.heroes[key]||DB.heroes[String(key)]); return (h&&h.base)||[]; }
function heroSources(hSave, equipped, attrSave){
  const gearList=[]; (equipped||[]).forEach(it=>{ (it.base&&it.base.i||[]).forEach(s=>gearList.push({sn:s.sn,st:s.st,m:s.m,v:s.v})); (it.mods||[]).forEach(m=>gearList.push({sn:m.name,st:m.name,m:m.mod,v:m.value})); });
  const treeList=[], treeSkills=[];
  (attrSave||[]).forEach(n=>{ if(!(n.Level>0))return; const a=DB&&DB.attributes&&DB.attributes[n.Key]; if(!a||String(a.h)!==String(hSave.heroKey))return;
    if(a.type==='PASSIVESKILL'){ const p=DB&&DB.passives&&DB.passives[a.val]; if(p&&p.v!=null)treeList.push({sn:p.sn,st:p.st,m:p.m,v:(typeof p.v==='number'?p.v:parseFloat(p.v)||0)*n.Level}); }
    else { const sk=DB&&DB.skills&&DB.skills[a.val]; if(sk&&!treeSkills.includes(sk.n))treeSkills.push(sk.n); } });
  return {base:heroBase(hSave.heroKey), gear:sumStats(gearList), tree:sumStats(treeList), treeSkills};
}
// per-MonsterKey kill counts from aggregateSaveDatas Type-0 sub-counters (sum == total kills; calibrated).
function killsByMonster(psd){ const out=[]; (psd.aggregateSaveDatas||[]).forEach(a=>{ if(a.Type!==0||a.SubKey===0||!(a.Value>0))return; const m=DB&&DB.monsters&&(DB.monsters[a.SubKey]||DB.monsters[String(a.SubKey)]); out.push({key:a.SubKey,name:(m&&m.n)||('Monster #'+a.SubKey),kills:a.Value,g:(m&&m.g)||0,x:(m&&m.x)||0}); }); return out.sort((x,y)=>y.kills-x.kills); }
function accountBuffs(psd){
  const runes=[]; (psd.RuneSaveData||[]).forEach(r=>{ const lv=r.Level||0; if(lv<=0)return; const d=DB&&DB.runes&&DB.runes[r.RuneKey]; if(!d)return; const cur=(d.lv||[]).find(x=>x.l===lv); runes.push({n:d.n,eff:d.eff,level:lv,val:cur?cur.val:null}); });
  runes.sort((a,b)=>b.level-a.level);
  const pk=(psd.commonSaveData||{}).ArrangedPetKey; const p=(pk&&DB&&DB.pets)?(DB.pets[pk]||DB.pets[String(pk)]):null;
  return {runes, pet:p?{key:pk,n:p.n,desc:p.desc}:(pk?{key:pk,n:'#'+pk}:null)};
}
// box contents: a STAGEBOX item's possible member ItemKeys (item.dk -> DB.drops, built from
// DropInfoData -> ItemGroupInfoData). Korean ItemGroup names are deliberately omitted (golden rule).
function boxContents(boxKey){ const it=DB&&DB.items&&(DB.items[boxKey]||DB.items[String(boxKey)]); if(!it||it.t!=='STAGEBOX'||!it.dk)return []; return (DB.drops&&DB.drops[it.dk])||[]; }
// reverse of DB.drops: which STAGEBOX items can drop a given ItemKey ("drops from"). Cached; reset by setDB.
function dropSources(itemKey){
  if(!_dropSrc){ _dropSrc={}; const items=(DB&&DB.items)||{};
    for(const k in items){ const i=items[k]; if(i.t==='STAGEBOX'&&i.dk){ const mem=(DB.drops&&DB.drops[i.dk])||[];
      for(const ik of mem){ (_dropSrc[ik]=_dropSrc[ik]||[]).push(k); } } } }
  return _dropSrc[String(itemKey)]||[];
}
// v1.0.17 (P5) — the Cube/recipe chain (DB.crafting / DB.synth / DB.synthBands / DB.cube, baked by
// build_gamedata.py from the game's own CraftingRecipe/SynthesisDrop/SynthesisRecipe/Cube* tables).
// Recipe OUTPUTS are DropKey pools resolved through the same DB.drops map as box contents — membership
// only, odds NEVER shown (the Weight/LevelWeight columns' composition semantics are uncalibrated).
function recipeIndex(){
  if(_recipeSrc) return _recipeSrc;
  _recipeSrc={};
  ((DB&&DB.crafting)||[]).forEach((c,i)=>((DB.drops&&DB.drops[c.dk])||[]).forEach(ik=>{ (_recipeSrc[ik]=_recipeSrc[ik]||{c:[],s:[]}).c.push(i); }));
  ((DB&&DB.synth)||[]).forEach((s,i)=>((DB.drops&&DB.drops[s.dk])||[]).forEach(ik=>{ (_recipeSrc[ik]=_recipeSrc[ik]||{c:[],s:[]}).s.push(i); }));
  return _recipeSrc;
}
// crafting recipes whose result pool can yield this item
function craftRecipesFor(itemKey){ const ix=recipeIndex()[String(itemKey)]; return ix?ix.c.map(i=>DB.crafting[i]):[]; }
// Cube-synthesis result pools that can yield this item ({lvl, tier, type, g, dk})
function synthPoolsFor(itemKey){ const ix=recipeIndex()[String(itemKey)]; return ix?ix.s.map(i=>DB.synth[i]):[]; }
// what the Cube CONSUMES this item for: crafting ingredient and/or offering coin
function cubeUsesOf(itemKey){ const k=String(itemKey);
  return { craft:((DB&&DB.crafting)||[]).filter(c=>(c.mats||[]).some(m=>String(m[0])===k)),
           offer:(((DB&&DB.cube)||{}).subs||[]).filter(e=>(e.mat||[]).some(m=>String(m[0])===k)) };
}
// the sub-recipe unlock row for a Cube recipe type (+tier where tiered): {lvl: UnlockCubeLevel, cost, n, ...}
function cubeSubFor(type,tier){ return ((((DB&&DB.cube)||{}).subs)||[]).filter(e=>e.t===type&&(tier==null||e.tier===tier))[0]||null; }
// v1.0.18 — the save's REAL per-category Cube unlock state: cubeRecipeSaveDatas[].MaxUnlockRecipeKey is the
// highest unlocked CubeSubRecipeKey in that category (0 = none). CALIBRATED: unlocking is a PAID action, not
// automatic at level — a real backup shows ENGRAVING MaxUnlockRecipeKey=0 at Cube level 17 despite its level-15
// requirement, unlocking only in a later snapshot. Returns {RECIPETYPE: maxKey} or null when the save has no rows.
function cubeUnlocks(psd){
  const rows=(psd&&psd.cubeRecipeSaveDatas)||[]; if(!rows.length) return null;
  const byKey={}; ((((DB&&DB.cube)||{}).types)||[]).forEach(t=>{ if(t.k!=null) byKey[t.k]=t.t; });
  const out={}; rows.forEach(r=>{ const t=byKey[r.CubeKey]; if(t) out[t]=r.MaxUnlockRecipeKey||0; });
  return out;
}
// the requirement bands for a synthesis (type, tier) — VERIFIED grade-independent at bake time
function synthBandsFor(type,tier){ const b=(DB&&DB.synthBands)||{}; return b[type+'|'+tier]||null; }

// Player.log offline-reward events (paired lines). reward==delta until the offline cap, then plateaus.
function parseOfflineEvents(text){
  const lines=String(text||'').split(/\r?\n/); const out=[]; let pend=null;
  for(const ln of lines){ if(ln.indexOf('[OfflineReward]')<0)continue;
    const mE=ln.match(/saved=(\d+),\s*now=(\d+),\s*delta=(\d+)s,\s*reward=(\d+)s(?:,\s*counter=(\d+))?/);
    if(mE){ pend={saved:+mE[1],now:+mE[2],delta:+mE[3],reward:+mE[4],counter:mE[5]?+mE[5]:null,t:(+mE[2])*1000}; continue; }
    const mG=ln.match(/gold=(\d+)/); if(mG){ const ev=pend||{t:null}; ev.gold=parseInt(mG[1],10);
      const mh=ln.match(/heroCount=(\d+)/); if(mh)ev.heroCount=+mh[1]; if(ev.reward>0)ev.rate=ev.gold/ev.reward; out.push(ev); pend=null; } }
  return out;
}
// offlineStatus: idle/banked/cap from save lastSavedTime + log events. CAP learned from the user's own logs
// (reward plateau where reward<delta) — NEVER assumed (no 8h, no daily reset). Mirror of the inline engine.
function offlineStatus(savedMs, events, nowMs){
  if(!savedMs)return null;
  const idleSec=Math.max(0,(nowMs-savedMs)/1000);
  const evs=(events||[]).filter(e=>e&&e.reward!=null).slice().sort((a,b)=>(b.now||0)-(a.now||0));
  const last=evs[0]||null;
  const capped=evs.filter(e=>e.delta>e.reward);
  const capSec=capped.length?Math.max(...capped.map(e=>e.reward)):null;
  const rate=(last&&last.reward>0)?(last.gold/last.reward):null;
  return {idleSec,last,rate,capSec,atCap:(capSec!=null&&idleSec>=capSec),
    timeToCapSec:(capSec!=null?Math.max(0,capSec-idleSec):null),
    bankedEst:(capSec!=null&&rate!=null)?Math.round(Math.min(idleSec,capSec)*rate):null,count:evs.length};
}
const rarityRank=g=>{const i=RARITY.indexOf(g);return i<0?-1:i;};

function gold(psd){ const c=(psd.currenySaveDatas||[]).find(x=>x.Key===GOLD_KEY); return c?c.Quantity:0; }
function heroes(psd){ const party=((psd.commonSaveData||{}).arrangedHeroKey||[]).map(String);
  return (psd.heroSaveDatas||[]).map(h=>{ const xp=xpToNext(h.HeroLevel,h.HeroExp);
    return {key:h.heroKey,cls:heroClass(h.heroKey),level:h.HeroLevel,exp:Math.round(h.HeroExp||0),
    xpNeed:xp.need,xpRemaining:xp.remaining,xpPct:xp.pct,
    pts:h.AllocatedHeroAbilityPoint,unspent:h.AbilityPoint,gear:(h.equippedItemIds||[]).filter(nz).length,
    skills:(h.equippedSKillKey||[]).filter(s=>s&&s!==-1).map(skillName).filter(Boolean),deployed:party.includes(String(h.heroKey))};}).sort((a,b)=>b.level-a.level); }
function inventory(psd){ const occ=a=>(psd[a]||[]).filter(s=>nz(s.ItemUniqueId)).length;
  return { owned:(psd.itemSaveDatas||[]).length, stashFilled:occ('stashSaveDatas'), stashSlots:(psd.stashSaveDatas||[]).length, invFilled:occ('inventorySaveDatas'), invSlots:(psd.inventorySaveDatas||[]).length, tradeFilled:occ('tradingStashSaveDatas') }; }
function ownedItems(psd){ return (psd.itemSaveDatas||[]).map(it=>{ const info=itemInfo(it.ItemKey); return {uid:String(it.UniqueId),key:String(it.ItemKey),icon:info.ic||iconId(it.ItemKey),ench:(it.EnchantCount||[]).reduce((a,b)=>a+b,0),mods:resolveMods(it.EnchantData),...info}; }); }
function byRarity(psd){ const g={}; for(const it of ownedItems(psd)){ if(it.grade) g[it.grade]=(g[it.grade]||0)+1; } return g; }
// trophies = GEAR ONLY (gt set, not a material). Materials are ungraded in the DB today, but several are NAMED
// with rarity words ("Scroll of Immortal Inscription", "Immortal Material") — the explicit gear-only filter
// guarantees stones can never count toward owning/flexing high-tier gear, now or after a game patch.
function trophies(psd){ return ownedItems(psd).filter(it=>it.gt&&!it.mat&&rarityRank(it.grade)>=3).sort((a,b)=>rarityRank(b.grade)-rarityRank(a.grade)); }
// per-tier GEAR-ONLY counts for Legendary and above — the flex/crew breakdown (e.g. {LEGENDARY:6, IMMORTAL:2})
function tierCounts(psd){ const out={}; ownedItems(psd).forEach(it=>{ if(!it.gt||it.mat) return; if(rarityRank(it.grade)>=3) out[it.grade]=(out[it.grade]||0)+1; }); return out; }
function lootDiff(prevPsd,curPsd){ const prev=new Set((prevPsd.itemSaveDatas||[]).map(it=>String(it.UniqueId))); return ownedItems(curPsd).filter(it=>!prev.has(it.uid)); }
function runes(psd){ const a=psd.RuneSaveData||[]; return {total:a.length,leveled:a.filter(r=>(r.Level||0)>0).length}; }
// Surfaces ONLY calibrated lifetime aggregates: Type 2/Sub0 = lifetime gold (its delta matched a gold gain
// exactly), Type 0/Sub0 = total kills (its per-MonsterKey sub-counters sum exactly to this). aggregate Type 16
// is deliberately NOT exposed: read as per-difficulty completions it is DISPROVEN by the save (Normal-only,
// maxCompletedStage in Act 2) yet would claim Nightmare/Hell/Torment progress → omitted (golden rule).
// Gold by source (CALIBRATED): Type 2 sub-keys are a sum-validated partition of lifetime gold — Sub0 = total and
// Sub1+Sub2+Sub3 == Sub0 exactly. Sub1 = gold from combat (delta-confirmed: it grows 1:1 with the total during
// active farming while Sub2/Sub3 stay flat). Sub2+Sub3 = non-combat gold (offline + Cube + misc) — those two can't
// be split into specific sources without further calibration, so we bucket them honestly as "other", never guessing
// which is "Cube". Returns null if the partition doesn't sum (don't show an unvalidated split).
function goldBySource(a){ const t=pick(a,2,0), c=pick(a,2,1), s2=pick(a,2,2), s3=pick(a,2,3); if(t==null) return null;
  const other=(s2||0)+(s3||0); const validated=(c!=null)&&((c+other)===t); return validated?{total:t,combat:c,other:other,validated:true}:null; }
function aggregates(psd){ const a=psd.aggregateSaveDatas||[]; return { lifetimeGold:pick(a,2,0), totalKills:pick(a,0,0), goldBySource:goldBySource(a) }; }
// Stage display: NEVER show the raw stageKey. CALIBRATED from the game's OWN StageInfoData (columns
// StageKey, STAGEDIFFICULITY, Act, StageNo): the key is DIFFICULTY-PREFIXED, NOT band-continuous —
//   stageKey = difficulty*1000 + act*100 + stageNo,  difficulty 1..4 = Normal/Nightmare/Hell/Torment,
//   act 1..3, stageNo 1..10  (120 stages = 30 per difficulty, verified row-for-row against StageInfoData).
// e.g. 1208 -> Normal Act 2-8 (Sacred Tomb); 2209 -> Nightmare Act 2-9; 3310 -> Hell Act 3-10; 4101 -> Torment Act 1-1.
// (Earlier builds wrongly used floor(k/100)-10 with a 3-acts-per-band split, which mislabeled every Nightmare+
// key — real Nightmare 2209 showed as "Act 3-9 · Torment". Normal keys decode the same either way, so it went
// unnoticed until a crew member cleared past Normal.) Stage NAMES exist only for the Normal maps; higher
// difficulties replay them, so the name resolves via the equivalent Normal key (1000+act*100+stg). Out-of-range
// keys return the raw key rather than a wrong guess. '' for null/empty.
const DIFFICULTIES=['Normal','Nightmare','Hell','Torment'];
function stageLabel(stageKey){
  if(stageKey==null||stageKey==='') return '';
  const k=Number(stageKey); if(!isFinite(k)) return String(stageKey);
  const di=Math.floor(k/1000)-1, act=Math.floor(k%1000/100), stg=k%100;
  if(di<0||di>3||act<1||act>3||stg<1) return String(stageKey);
  const diff=DIFFICULTIES[di]||null;
  const nk=(10+act)*100+stg, nm=DB&&DB.stages&&(DB.stages[nk]||DB.stages[String(nk)]);
  return 'Act '+act+'-'+stg+(diff?(' · '+diff):'')+(nm?(' · '+nm):'');
}
function summary(psd){ const c=psd.commonSaveData||{}; return {version:c.version,playTimeHours:c.playTime?+(c.playTime/3600).toFixed(1):null,maxCompletedStage:c.maxCompletedStage,maxStageLabel:stageLabel(c.maxCompletedStage),currentStage:c.currentStageKey,currentStageLabel:stageLabel(c.currentStageKey),currentWave:c.currentStageWave,arrangedParty:(c.arrangedHeroKey||[]).map(heroClass),activePet:c.ArrangedPetKey,lastSaved:netTicksToDate(c.lastSavedTime)}; }
function snapshotFromPsd(psd){ return {capturedAt:new Date().toISOString(),summary:summary(psd),gold:gold(psd),heroes:heroes(psd),inventory:inventory(psd),byRarity:byRarity(psd),trophies:trophies(psd),runes:runes(psd),aggregates:aggregates(psd)}; }
function snapshot(buffer){ return snapshotFromPsd(loadSave(buffer)); }
function rates(prev,cur){ const ms=new Date(cur.summary.lastSaved)-new Date(prev.summary.lastSaved); const h=ms/3600000; const d=(a,b)=>(a==null||b==null)?null:b-a; const ph=v=>(v==null||!h)?null:Math.round(v/h); const dg=d(prev.gold,cur.gold),dk=d(prev.aggregates.totalKills,cur.aggregates.totalKills); return {spanMinutes:+(ms/60000).toFixed(1),goldDelta:dg,goldPerHour:ph(dg),killsDelta:dk,killsPerHour:ph(dk)}; }
// History/trends — mirror of the inline engine. Lean scalar snapshot + per-interval rates from backups.
// cumulative XP for one hero = the full level-curve below the current level + current progress (calibrated:
// HeroExp is per-level progress vs DB.levels[L]=ExpForLevelUp). Summed over all heroes it is the account's
// total XP state — its delta between snapshots = XP actually gained (powers per-stage XP/hr, v1.0.7).
function cumXp(level,exp){ let t=Math.max(0,Math.round(exp||0)); for(let l=1;l<(level||1);l++){ const e=DB&&DB.levels&&(DB.levels[l]||DB.levels[String(l)]); if(e)t+=e; } return t; }
function accountXp(psd){ return (psd.heroSaveDatas||[]).reduce((s,h)=>s+cumXp(h.HeroLevel,h.HeroExp),0); }
function trendPoint(psd){ const c=psd.commonSaveData||{}, a=psd.aggregateSaveDatas||[]; const goldRow=(psd.currenySaveDatas||[]).find(x=>x.Key===GOLD_KEY); const d=netTicksToDate(c.lastSavedTime); return {t:d?+d:null,gold:goldRow?goldRow.Quantity:0,lifeGold:pick(a,2,0),combat:pick(a,2,1),kills:pick(a,0,0),xp:accountXp(psd),cur:c.currentStageKey,playH:c.playTime?+(c.playTime/3600).toFixed(2):null,maxStage:c.maxCompletedStage,items:(psd.itemSaveDatas||[]).length,runes:(psd.RuneSaveData||[]).filter(r=>(r.Level||0)>0).length}; }
function buildTrends(points){ const seen={},pts=[]; (points||[]).filter(p=>p&&p.t).sort((a,b)=>a.t-b.t).forEach(p=>{const k=p.t+'/'+p.lifeGold; if(seen[k])return; seen[k]=1; pts.push(p);}); for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i]; const dPlay=(b.playH!=null&&a.playH!=null)?b.playH-a.playH:null; const dWall=(b.t-a.t)/3600000; const h=(dPlay!=null&&dPlay>0.01)?dPlay:dWall; const dLife=(b.lifeGold!=null&&a.lifeGold!=null)?b.lifeGold-a.lifeGold:null; const dKills=(b.kills!=null&&a.kills!=null)?b.kills-a.kills:null; b.goldPerHr=(dLife!=null&&h>0.01)?Math.round(dLife/h):null; b.killsPerHr=(dKills!=null&&h>0.01)?Math.round(dKills/h):null; } return pts; }

// ============================================================================
// Per-stage farming rates (goal #2/#3, ban-safe). MEASURED from save snapshots over time — not derived from a
// stage→monster table and not the live memory lane. Attribution uses the CALIBRATED combat sub-counter
// (aggregate Type 2 / Sub 1): on the real save it grows 1:1 with farming while offline/Cube/misc gold lands in
// Sub 2/3, so a combat-gold delta is, by construction, gold earned at the active stage — offline gold excluded
// with no guessing. Only "clean" intervals (the active stage `cur` unchanged across the pair) are counted; an
// interval where the stage changed is an ambiguous split and is omitted (honest). Rate includes idle time = the
// player's real average. The finer the snapshot cadence (the HUD's own history), the sharper this gets.
// An interval whose wall-clock exceeds its PLAYED time by more than this spans closed-game ("offline") time.
// Calibrated: continuous-play pairs in both real histories show wall-played jitter of 0.0-0.15h; pairs that
// contained a real game restart (their "other" gold matches Player.log offline collections exactly) show 0.49h+.
const OFFLINE_GAP_H=0.25;
function perStageRates(points){
  const pts=buildTrends(points); const by={};
  for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i];
    if(a.cur==null||b.cur==null||String(a.cur)!==String(b.cur)) continue;   // clean (non-transition) intervals only
    const stg=Number(b.cur); if(!(stg>0)) continue;
    const dPlay=(b.playH!=null&&a.playH!=null)?(b.playH-a.playH):null, dWall=(b.t-a.t)/3600000;
    const h=(dPlay!=null&&dPlay>0.01)?dPlay:dWall; if(!(h>0.01)) continue;
    // offline-spanning interval: the game was closed for part of it. Combat gold stays safe to attribute
    // (PROVEN immune — offline gold lands in Sub2/3, matching Player.log collections exactly), but the XP and
    // kill deltas may include the offline collection granted at reopen -> never attribute those to a stage.
    const offline=(dPlay!=null)&&((dWall-dPlay)>OFFLINE_GAP_H);
    const dC=(b.combat!=null&&a.combat!=null)?(b.combat-a.combat):null;
    const dK=(b.kills!=null&&a.kills!=null)?(b.kills-a.kills):null;
    const dX=(b.xp!=null&&a.xp!=null)?(b.xp-a.xp):null;                      // older stored points may lack xp -> null
    if(dC==null||dC<0) continue;                                            // need calibrated combat-gold, monotonic
    if(!by[stg]) by[stg]={stage:stg,combat:0,kills:0,killHours:0,xp:0,xpHours:0,hours:0,intervals:0};
    by[stg].combat+=dC; by[stg].hours+=h; by[stg].intervals++;
    if(!offline){ if(dK!=null&&dK>0){by[stg].kills+=dK;} by[stg].killHours+=h;
      if(dX!=null&&dX>=0){ by[stg].xp+=dX; by[stg].xpHours+=h; } }
  }
  const out=Object.keys(by).map(k=>{ const s=by[k];
    return {stage:s.stage,label:stageLabel(s.stage),
      goldPerHr:s.hours>0.01?Math.round(s.combat/s.hours):null,
      killsPerHr:s.killHours>0.01?Math.round(s.kills/s.killHours):null,
      xpPerHr:s.xpHours>0.01?Math.round(s.xp/s.xpHours):null,
      hours:+s.hours.toFixed(2),combatGold:s.combat,kills:s.kills,xp:s.xp,intervals:s.intervals}; });
  out.sort((x,y)=>(y.goldPerHr||0)-(x.goldPerHr||0));
  return out;
}

// ============================================================================
// Build advisor (goal #6 deepened; beats tbh-copilot with authoritative data). All save-derived, no fabrication.

// gearGaps: "you own better gear than you're wearing." Per hero, per equipped item, find an UNEQUIPPED owned item
// of the SAME GEARTYPE that is strictly better — higher rarity, or equal rarity & higher item level. ONLY provable
// upgrades are flagged (equal rarity+level is a sidegrade, never claimed better). Matching by gt keeps every
// suggestion class-valid. Greedy one-to-one assignment so a single spare item is offered only once.
// v1.0.7 — EQUIP GATING: an item's Level reads as its equip requirement (calibrated: every equipped instance in
// both real saves satisfies item.lvl <= hero level, 43/43, zero counterexamples). A strictly-better spare the hero
// can't wear YET is returned as a LOCKED notice ({locked:true, needLevel}) — informative, never advised as an equip.
function gearGaps(psd){
  const owned=ownedItems(psd), byUid={}; owned.forEach(o=>byUid[o.uid]=o);
  const party=((psd.commonSaveData||{}).arrangedHeroKey||[]).map(String);
  const equippedUids={}, heroes_=[];
  (psd.heroSaveDatas||[]).forEach(h=>{ const eq=(h.equippedItemIds||[]).filter(nz).map(u=>byUid[String(u)]).filter(Boolean);
    eq.forEach(e=>equippedUids[e.uid]=1);
    heroes_.push({key:String(h.heroKey),cls:heroClass(h.heroKey),level:h.HeroLevel,deployed:party.indexOf(String(h.heroKey))>=0,eq}); });
  const freeByGt={};
  owned.forEach(o=>{ if(equippedUids[o.uid]||!o.gt||o.mat) return; (freeByGt[o.gt]=freeByGt[o.gt]||[]).push(o); });
  Object.keys(freeByGt).forEach(gt=>freeByGt[gt].sort((a,b)=>(rarityRank(b.grade)-rarityRank(a.grade))||((b.lvl||0)-(a.lvl||0))));
  const cand=[];
  heroes_.forEach(h=>h.eq.forEach(e=>{ const pool=freeByGt[e.gt]||[]; const er=rarityRank(e.grade), el=e.lvl||0;
    let bestEquip=null, bestLocked=null;
    for(let i=0;i<pool.length;i++){ const c=pool[i], cr=rarityRank(c.grade), cl=c.lvl||0;
      if(!(cr>er||(cr===er&&cl>el))) continue;                       // not strictly better
      if(cl<=(h.level||0)){ if(!bestEquip){ bestEquip={c,cr,cl}; break; } }   // pool is best-first: first equippable wins
      else if(!bestLocked) bestLocked={c,cr,cl};                      // best locked seen before the first equippable
    }
    const mk=(b,locked)=>({hero:h.cls,heroKey:h.key,heroLevel:h.level,deployed:h.deployed,gt:e.gt,locked:locked,
      needLevel:locked?(b.cl||0):null,
      cur:{name:e.name,grade:e.grade,lvl:e.lvl,icon:e.icon,uid:e.uid},
      up:{name:b.c.name,grade:b.c.grade,lvl:b.c.lvl,icon:b.c.icon,uid:b.c.uid},
      reason:(b.cr>er?'higher rarity':'higher level'),jump:(b.cr-er)*1000+(b.cl-el)});
    if(bestEquip) cand.push(mk(bestEquip,false));
    if(bestLocked&&(!bestEquip||bestLocked.cr>bestEquip.cr||(bestLocked.cr===bestEquip.cr&&bestLocked.cl>bestEquip.cl)))
      cand.push(mk(bestLocked,true));                                 // notify only if it beats what we can advise
  }));
  cand.sort((a,b)=>(a.locked-b.locked)||(b.deployed-a.deployed)||(b.jump-a.jump));   // equippable advice claims spares first
  const usedUp={}, usedSlot={}, out=[];
  cand.forEach(g=>{ if(usedUp[g.up.uid]) return; const sk=g.heroKey+'|'+g.cur.uid+'|'+(g.locked?'L':'E'); if(usedSlot[sk]) return;
    usedUp[g.up.uid]=1; usedSlot[sk]=1; out.push(g); });
  return out;
}

// redundantDupes (v1.0.16): provably-redundant UNEQUIPPED spares — the INVERSE of gearGaps, structural proof only.
// An unequipped gear item X is listed ONLY when the player owns >= maxWearers(gt) DISTINCT pieces of the same
// GEARTYPE that are strictly better AND wearable whenever X is: HIGHER rarity at an item level (= equip
// requirement, calibrated v1.0.7) <= X's. Any hero who could ever equip X could equip any of those instead, and
// at most maxWearers(gt) copies of the type can be worn at once across the whole roster — so X can never be the
// best available choice for any slot, now or after any level-up. Same-rarity-higher-level pieces do NOT count as
// dominators here (their requirement is higher, so a low-level hero might wear X but not them). No stat
// judgement, no salvage-value claim (the game's salvage prices aren't calibrated) — "redundant", never "sell".
// maxWearers per GEARTYPE, from calibrated structure only:
//   • the 6 class main weapons (hero table MainWeapon): 1 wearer each
//   • HELMET/ARMOR/GLOVES/BOOTS/RING + the 6 offhand types: ONE slot per hero (slot map calibrated on the live
//     save) -> 6 (offhand class-pairing is NOT calibrated, so any hero is allowed = the conservative bound)
//   • AMULET/EARING/BRACER + anything unknown: 18 (3 accessory slots x 6 heroes — most conservative)
function maxWearersGt(gt){
  const H=(DB&&DB.heroes)||{}; let n=0; Object.keys(H).forEach(k=>{ if(H[k].mw===gt) n++; });
  if(n) return n;
  if(gt==='HELMET'||gt==='ARMOR'||gt==='GLOVES'||gt==='BOOTS'||gt==='RING') return 6;
  if(gt==='SHIELD'||gt==='ARROW'||gt==='ORB'||gt==='TOME'||gt==='BOLT'||gt==='HATCHET') return 6;
  return 18;
}
function redundantDupes(psd){
  const owned=ownedItems(psd), byUid={}; owned.forEach(o=>byUid[o.uid]=o);
  const equippedUids={};
  (psd.heroSaveDatas||[]).forEach(h=>(h.equippedItemIds||[]).filter(nz).forEach(u=>equippedUids[String(u)]=1));
  const byGt={};
  owned.forEach(o=>{ if(!o.gt||o.mat) return; (byGt[o.gt]=byGt[o.gt]||[]).push(o); });
  const out=[];
  Object.keys(byGt).forEach(gt=>{ const pool=byGt[gt], need=maxWearersGt(gt);
    pool.forEach(x=>{ if(equippedUids[x.uid]) return;
      const xr=rarityRank(x.grade), xl=x.lvl||0;
      const doms=pool.filter(y=>y.uid!==x.uid&&rarityRank(y.grade)>xr&&(y.lvl||0)<=xl);
      if(doms.length>=need){
        doms.sort((a,b)=>(rarityRank(b.grade)-rarityRank(a.grade))||((b.lvl||0)-(a.lvl||0)));
        out.push({name:x.name,grade:x.grade,lvl:x.lvl,icon:x.icon,uid:x.uid,key:x.key,gt,
          need,beat:doms.length,by:doms.slice(0,3).map(d=>({name:d.name,grade:d.grade,lvl:d.lvl,icon:d.icon,uid:d.uid}))});
      } });
  });
  out.sort((a,b)=>(rarityRank(b.grade)-rarityRank(a.grade))||((b.lvl||0)-(a.lvl||0)));
  return out;
}

// runeStatList: the account-wide rune Stat List (v1.0.10) — mirrors the game's Runes -> Stat List. Per effect,
// sum the per-level values of every leveled rune up to its current level. Reading justified structurally: all
// 135 multi-level runes have CONSTANT per-level values with RISING per-level costs — "value at level" would
// make levels 2+ pure gold sinks, so each level grants its value. Derivation (runes x levels) is returned so
// the UI can show its work and any mismatch with the in-game list is immediately visible.
function runeStatList(psd){
  const lvlOf={}; (psd.RuneSaveData||[]).forEach(r=>lvlOf[String(r.RuneKey)]=r.Level||0);
  const by={};
  Object.keys((DB&&DB.runes)||{}).forEach(k=>{ const d=DB.runes[k]; const L=lvlOf[k]||0; if(!L||!d.lv) return;
    let tot=0,ok=false;
    d.lv.forEach(x=>{ if(x.l<=L){ const v=parseFloat(x.val); if(!isNaN(v)){tot+=v;ok=true;} } });
    if(!ok) return;
    if(!by[d.eff]) by[d.eff]={eff:d.eff,total:0,levels:0,runes:0};
    by[d.eff].total+=tot; by[d.eff].levels+=L; by[d.eff].runes++; });
  return Object.keys(by).map(k=>by[k]).sort((a,b)=>b.total-a.total);
}

// statListFull: the game's GROUPED Stat List (v1.0.11) — the account-wide panel the game shows, grouped
// Exploration/Combat with the game's own wording. CALIBRATED line by line against an in-game Stat List
// screenshot + the live save (8/9 lines exact on the capture day; the 9th — All Hero Attack Speed — was
// bracketed rising 10%→16% through the screenshot's 11% by the game's own rolling backups as runes were
// leveled, same additive counter + same /10 display family as the two verified percent lines).
// Sources, all verified:
//   • values  = runeStatList totals (the rune aggregate IS this panel: per-hero tree passives and pets were
//     ruled out — move-speed passives are unleveled in the calibration save yet the panel shows 21%, exactly
//     the rune total 210/10; every other transcribed line equals its rune total with no other contribution)
//   • wording = the game's own AccountStat_<STATTYPE> localization templates, verbatim
//   • display = {0}%-style templates render value/10 (verified 700→70, 210→21, 110→11); +{0} templates
//     render the raw value (verified +1/+80/+300/+2/+10)
// CALIBRATE-OR-OMIT: effects NOT in this map (gold/chest/cube/offline/slot lines) are real raw totals but
// their group + display in the game's panel are unverified (no category table ships in the game files), so
// the grouped view omits them. The complete raw totals stay available via runeStatList.
const STAT_LIST = [
  { k: 'IncreaseExpAmount',          eff: 'Increase Exp Amount',           g: 'Exploration', pct: true,  t: '{0}% Increased Exp Gain' },
  { k: 'AdditionalExp',              eff: 'Additional Exp',                g: 'Exploration', pct: false, t: 'Additional Exp +{0}' },
  { k: 'AdditionalExpStageBoss',     eff: 'Additional Exp Stage Boss',     g: 'Exploration', pct: false, t: 'Exp From Stage Boss Kill +{0}' },
  { k: 'AdditionalExpActBoss',       eff: 'Additional Exp Act Boss',       g: 'Exploration', pct: false, t: 'Exp From Act Boss Kill +{0}' },
  { k: 'AdditionalExpNormalMonster', eff: 'Additional Exp Normal Monster', g: 'Exploration', pct: false, t: 'Exp From Normal Monster Kill +{0}' },
  { k: 'UnlockArrangeSlotCount',     eff: 'Unlock Arrange Slot Count',     g: 'Exploration', pct: false, t: 'Hero Slot +{0}' },
  { k: 'AllHeroMoveSpeed',           eff: 'All Hero Move Speed',           g: 'Combat',      pct: true,  t: '{0}% Increased All Hero Movement Speed' },
  { k: 'AllHeroAttackSpeed',         eff: 'All Hero Attack Speed',         g: 'Combat',      pct: true,  t: '{0}% Increased All Hero Attack Speed' },
  { k: 'AllHeroAttackDamage',        eff: 'All Hero Attack Damage',        g: 'Combat',      pct: false, t: 'All Hero Attack Damage +{0}' },
];
function statListFull(psd) {
  const totals = {}; runeStatList(psd).forEach(s => { totals[s.eff] = s; });
  const groups = [], byG = {};
  STAT_LIST.forEach(m => {
    const s = totals[m.eff]; if (!s || !(s.total > 0)) return;   // zero/absent lines omitted (only acquired stats shown)
    const disp = m.pct ? s.total / 10 : s.total;
    const line = { k: m.k, eff: m.eff, raw: s.total, disp, pct: m.pct, text: m.t.replace('{0}', String(disp)), runes: s.runes, levels: s.levels };
    if (!byG[m.g]) { byG[m.g] = { group: m.g, lines: [] }; groups.push(byG[m.g]); }
    byG[m.g].lines.push(line);
  });
  return groups;
}

// onlineOffline: ONLINE vs OFFLINE progress measured across the snapshot history (v1.0.9).
// Per consecutive pair: played time comes from the save's own playTime; closed-game ("away") time =
// wall-clock minus played where that exceeds the jitter threshold. Gold splits by the calibrated partition:
// combat (Sub1, only grows in active play) vs other (Sub2/3 — offline rewards land here; PROVEN: the bucket's
// delta matched Player.log offline collections exactly). Each away gap is reported with the other-gold that
// arrived across it (the offline collection, possibly + small Cube/misc — labeled honestly).
function onlineOffline(points){
  const pts=buildTrends(points);
  const out={playedH:0,awayH:0,goldCombat:0,goldOther:0,gaps:[],intervals:0};
  for(let i=1;i<pts.length;i++){ const a=pts[i-1], b=pts[i];
    const dWall=(b.t-a.t)/3600000;
    const dPlay=(b.playH!=null&&a.playH!=null)?(b.playH-a.playH):null;
    if(dPlay==null||dWall<=0) continue;
    const dC=(b.combat!=null&&a.combat!=null)?Math.max(0,b.combat-a.combat):0;
    const dLife=(b.lifeGold!=null&&a.lifeGold!=null)?Math.max(0,b.lifeGold-a.lifeGold):0;
    const dOther=Math.max(0,dLife-dC);
    out.playedH+=Math.max(0,dPlay); out.goldCombat+=dC; out.goldOther+=dOther; out.intervals++;
    const away=dWall-dPlay;
    if(away>OFFLINE_GAP_H){ out.awayH+=away; out.gaps.push({t:b.t,awayH:+away.toFixed(2),otherGold:dOther}); }
  }
  out.playedH=+out.playedH.toFixed(2); out.awayH=+out.awayH.toFixed(2);
  out.gaps.sort((x,y)=>y.t-x.t);
  return out;
}

// enchantStones: socketable enchant materials the player OWNS. CALIBRATED end-to-end from the save's own
// EnchantData rows: every applied enchant's MaterialKey resolves to one of these fx-bearing materials, and the
// rolled stat equals that material's fx entry for the item's slot category (4/4 across both real saves) — so the
// per-category stat shown here is the game's own deterministic table, not a guess. (Tier/value roll is game RNG.)
function enchantStones(psd){
  const byKey={};
  (psd.itemSaveDatas||[]).forEach(it=>{ const i=DB&&DB.items&&DB.items[String(it.ItemKey)];
    if(!i||!i.mat||!i.fx||!i.fx.length) return;
    const k=String(it.ItemKey);
    if(!byKey[k]) byKey[k]={key:k,name:i.n,grade:i.g||null,icon:i.ic||iconId(k),mt:i.mt||null,fx:i.fx,count:0};
    byKey[k].count++; });
  return Object.values(byKey).sort((a,b)=>(rarityRank(b.grade)-rarityRank(a.grade))||(b.count-a.count));
}
// slot-category for a GEARTYPE — ONLY where calibrated: the game's own hero table defines main-weapon types
// (HeroInfoData MainWeapon -> WEAPON group, observed for STAFF + CROSSBOW in applied enchants), and HELMET/ARMOR
// were observed rolling the ARMOR-group effect. Everything else returns null (shown without a category claim).
function gtGroup(gt){
  if(!gt) return null;
  const mw={}; const H=(DB&&DB.heroes)||{}; Object.keys(H).forEach(k=>{ if(H[k].mw) mw[H[k].mw]=1; });
  if(mw[gt]) return 'WEAPON';
  if(gt==='HELMET'||gt==='ARMOR') return 'ARMOR';
  return null;
}
// v1.0.28 — EMPIRICAL gt->category from the player's OWN applied enchants (golden-rule: read, never guessed).
// Each applied enchant's rolled stat equals exactly one of its stone's per-category fx entries (the game's own
// deterministic table), so the matching fx category IS the gear type's slot category. This extends the static
// gtGroup() baseline to whatever the player has actually enchanted — dropping the "category unknown" asterisk
// wherever the save can prove the answer (gloves/boots/rings/amulets/etc. the moment they hold one enchant).
function _statNorm(s){ return String(s||'').replace(/\s+/g,'').toLowerCase(); }
function gtGroupFromEnchants(psd){
  const map={};
  (psd&&psd.itemSaveDatas||[]).forEach(it=>{
    const info=itemInfo(it.ItemKey), gt=info.gt; if(!gt||info.mat||map[gt]) return;
    resolveMods(it.EnchantData).forEach(md=>{
      if(map[gt]||!md||md.matKey==null) return;
      const stone=DB&&DB.items&&(DB.items[md.matKey]||DB.items[String(md.matKey)]); if(!stone||!stone.fx) return;
      const rolled=_statNorm(md.name)||_statNorm(md.stat);
      const hit=stone.fx.filter(f=>_statNorm(f.sn)===rolled)[0];
      if(hit&&hit.g) map[gt]=hit.g;
    });
  });
  return map;
}

// runePlan: greedy cheapest-first rune-upgrade path within a gold budget. Rune level costs are GOLD (verified:
// all rune-level costs use the Gold currency). Walks the full per-level cost table (DB.runes[].lv) so multi-step
// paths price correctly. Bounded to a short "next moves" list. Also returns the cheapest unaffordable next (save-for).
function runePlan(psd,gold){
  const lvlOf={}; (psd.RuneSaveData||[]).forEach(r=>lvlOf[String(r.RuneKey)]=r.Level||0);
  const R=(DB&&DB.runes)||{}, runes=[];
  Object.keys(R).forEach(k=>{ const d=R[k]; if(!d.max) return; runes.push({key:k,name:d.n,eff:d.eff,level:lvlOf[k]||0,max:d.max,lv:d.lv||[]}); });
  const nextCost=r=>{ if(r.level>=r.max) return null; const nl=(r.lv||[]).filter(x=>x.l===r.level+1)[0]; return (nl&&nl.cost!=null)?nl.cost:null; };
  let budget=(gold||0); const steps=[]; let guard=0;
  while(guard++<60){ let best=null;
    runes.forEach(r=>{ const c=nextCost(r); if(c==null||c>budget) return; if(best==null||c<best.c) best={r,c}; });
    if(!best) break;
    steps.push({name:best.r.name,from:best.r.level,to:best.r.level+1,max:best.r.max,cost:best.c,eff:best.r.eff});
    budget-=best.c; best.r.level++; if(steps.length>=12) break; }
  // save-for = the cheapest UNAFFORDABLE next step (cost beyond the leftover budget). Must exclude anything still
  // affordable: when the 12-step list is capped but gold remains, the next rune is affordable, not a save-for goal
  // (labelling it "save for" would be misleading — data-honesty). null when every remaining step is affordable.
  let cheapestNext=null;
  runes.forEach(r=>{ const c=nextCost(r); if(c==null||c<=budget) return; if(cheapestNext==null||c<cheapestNext.cost) cheapestNext={name:r.name,level:r.level,max:r.max,cost:c,eff:r.eff}; });
  return {gold:(gold||0),steps,spent:(gold||0)-budget,remaining:budget,cheapestNext};
}

// enchantStatus: equipped items on DEPLOYED heroes that still have open enchant slots (each item holds up to 3).
// Honest — surfaces the fill state only; never claims a specific reroll outcome.
function enchantStatus(psd){
  const owned=ownedItems(psd), byUid={}; owned.forEach(o=>byUid[o.uid]=o);
  const party=((psd.commonSaveData||{}).arrangedHeroKey||[]).map(String), out=[];
  (psd.heroSaveDatas||[]).forEach(h=>{ if(party.indexOf(String(h.heroKey))<0) return;
    (h.equippedItemIds||[]).filter(nz).forEach(u=>{ const o=byUid[String(u)]; if(!o||o.mat||!o.gt) return;
      const used=o.ench||0; if(used<3) out.push({hero:heroClass(h.heroKey),name:o.name,grade:o.grade,gt:o.gt,lvl:o.lvl,icon:o.icon,used,open:3-used}); }); });
  out.sort((a,b)=>a.used-b.used);
  return out;
}

// statTotals: a hero's full computed stat sheet = base + gear + tree, summed per stat (reuses sumStats). The
// account-wide runes/pet apply on top (shown separately). No fabricated composite — just the real numbers added up.
function statTotals(sources){ const s=sources||{}; return sumStats([].concat(s.base||[],s.gear||[],s.tree||[])); }

module.exports={setDB,RARITY,decryptEs3,safeJsonParse,loadFromDecryptedText,loadSave,snapshot,snapshotFromPsd,gold,heroes,inventory,ownedItems,byRarity,trophies,tierCounts,lootDiff,runes,aggregates,summary,rates,trendPoint,buildTrends,perStageRates,onlineOffline,gearGaps,redundantDupes,maxWearersGt,runePlan,enchantStatus,enchantStones,gtGroup,gtGroupFromEnchants,statTotals,runeStatList,statListFull,STAT_LIST,cumXp,accountXp,netTicksToDate,itemInfo,gearStats,heroClass,skillName,heroSources,accountBuffs,killsByMonster,sumStats,iconId,statName,resolveMods,boxContents,dropSources,craftRecipesFor,synthPoolsFor,cubeUsesOf,cubeSubFor,synthBandsFor,cubeUnlocks,parseOfflineEvents,offlineStatus,xpToNext,stageLabel,GOLD_KEY};
