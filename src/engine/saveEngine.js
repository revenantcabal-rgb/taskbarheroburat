'use strict';
const crypto = require('crypto');
const ES3_PASSWORD = 'emuMqG3bLYJ938ZDCfieWJ';
const GOLD_KEY = 100001;
const NET_TICKS_TO_UNIX_MS = 62135596800000;
const RARITY = ['COMMON','UNCOMMON','RARE','LEGENDARY','IMMORTAL','ARCANA','BEYOND','CELESTIAL','DIVINE','COSMIC'];
let DB = null, _dropSrc = null;
function setDB(db){ DB = db; _dropSrc = null; }

function decryptEs3(buffer){ const b=Buffer.isBuffer(buffer)?buffer:Buffer.from(buffer); const iv=b.subarray(0,16),ct=b.subarray(16); const key=crypto.pbkdf2Sync(ES3_PASSWORD,iv,100,16,'sha1'); const d=crypto.createDecipheriv('aes-128-cbc',key,iv); return Buffer.concat([d.update(ct),d.final()]).toString('utf8'); }
function safeJsonParse(t){ return JSON.parse(String(t).replace(/([:\[,])(\s*)(\d{16,})(?=\s*[,\]}])/g,'$1$2"$3"')); }
function loadFromDecryptedText(o){ const outer=JSON.parse(o); let inner=outer.PlayerSaveData?outer.PlayerSaveData.value:outer; if(typeof inner==='string') inner=safeJsonParse(inner); return inner; }
function loadSave(buffer){ return loadFromDecryptedText(decryptEs3(buffer)); }
const netTicksToDate=t=>{const n=typeof t==='string'?Number(t):t;return n?new Date(n/10000-NET_TICKS_TO_UNIX_MS):null;};
const pick=(a,t,s)=>{const r=(a||[]).find(x=>x.Type===t&&x.SubKey===s);return r?r.Value:null;};
const nz=v=>v&&v!==0&&v!=='0';

// gearStats(gk): authoritative inherent stats + unique-mod text for a GearKey (DB.gear from GearInfoData/UniqueModInfoData). No fabrication.
function gearStats(gk){ return (gk&&DB&&DB.gear)?(DB.gear[gk]||DB.gear[String(gk)]||null):null; }
function itemInfo(key){ const i=DB&&DB.items&&(DB.items[key]||DB.items[String(key)]); return i?{name:i.n,grade:i.g,type:i.t,gt:i.gt,lvl:i.lvl,ic:i.ic,mat:!!i.mat,gk:i.gk,base:gearStats(i.gk)}:{name:'#'+key,grade:null,type:null,gt:null,lvl:null,ic:null,mat:false,gk:null,base:null}; }
// enchant stat-mod -> authoritative display name (DB.stats from the game's StatModInfoData). No fabrication.
function statName(modKey){ const s=DB&&DB.stats&&DB.stats[String(modKey)]; return s?s.sn:('Stat #'+modKey); }
function resolveMods(ench){ return (ench||[]).filter(m=>m&&m.StatModKey).map(m=>{ const s=DB&&DB.stats&&DB.stats[String(m.StatModKey)]; return {name:s?s.sn:('Stat #'+m.StatType),value:m.Value,tier:m.Tier,mod:s?s.m:null,stat:s?s.s:null}; }); }
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
function trophies(psd){ return ownedItems(psd).filter(it=>rarityRank(it.grade)>=3).sort((a,b)=>rarityRank(b.grade)-rarityRank(a.grade)); }
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
// Stage display (P2): NEVER show the raw stageKey. Decode act=floor(k/100)-10, stage=k%100 (VERIFIED:
// 1208 -> "Act 2-8" (Sacred Tomb); 1101 -> "Act 1-1" (Pasture)). Append the real StageName_<key> where the
// game ships one (DB.stages, 30 names baked from localization), else just "Act X-Y". Out-of-range keys
// (act<1 / stage<1) return the raw key rather than a wrong guess. '' for null/empty.
function stageLabel(stageKey){
  if(stageKey==null||stageKey==='') return '';
  const k=Number(stageKey); if(!isFinite(k)) return String(stageKey);
  const act=Math.floor(k/100)-10, stg=k%100;
  if(act<1||stg<1) return String(stageKey);
  const label='Act '+act+'-'+stg;
  const nm=DB&&DB.stages&&(DB.stages[k]||DB.stages[String(k)]);
  return nm?(label+' · '+nm):label;
}
function summary(psd){ const c=psd.commonSaveData||{}; return {version:c.version,playTimeHours:c.playTime?+(c.playTime/3600).toFixed(1):null,maxCompletedStage:c.maxCompletedStage,maxStageLabel:stageLabel(c.maxCompletedStage),currentStage:c.currentStageKey,currentStageLabel:stageLabel(c.currentStageKey),currentWave:c.currentStageWave,arrangedParty:(c.arrangedHeroKey||[]).map(heroClass),activePet:c.ArrangedPetKey,lastSaved:netTicksToDate(c.lastSavedTime)}; }
function snapshotFromPsd(psd){ return {capturedAt:new Date().toISOString(),summary:summary(psd),gold:gold(psd),heroes:heroes(psd),inventory:inventory(psd),byRarity:byRarity(psd),trophies:trophies(psd),runes:runes(psd),aggregates:aggregates(psd)}; }
function snapshot(buffer){ return snapshotFromPsd(loadSave(buffer)); }
function rates(prev,cur){ const ms=new Date(cur.summary.lastSaved)-new Date(prev.summary.lastSaved); const h=ms/3600000; const d=(a,b)=>(a==null||b==null)?null:b-a; const ph=v=>(v==null||!h)?null:Math.round(v/h); const dg=d(prev.gold,cur.gold),dk=d(prev.aggregates.totalKills,cur.aggregates.totalKills); return {spanMinutes:+(ms/60000).toFixed(1),goldDelta:dg,goldPerHour:ph(dg),killsDelta:dk,killsPerHour:ph(dk)}; }
// History/trends — mirror of the inline engine. Lean scalar snapshot + per-interval rates from backups.
function trendPoint(psd){ const c=psd.commonSaveData||{}, a=psd.aggregateSaveDatas||[]; const goldRow=(psd.currenySaveDatas||[]).find(x=>x.Key===GOLD_KEY); const d=netTicksToDate(c.lastSavedTime); return {t:d?+d:null,gold:goldRow?goldRow.Quantity:0,lifeGold:pick(a,2,0),kills:pick(a,0,0),playH:c.playTime?+(c.playTime/3600).toFixed(2):null,maxStage:c.maxCompletedStage,items:(psd.itemSaveDatas||[]).length,runes:(psd.RuneSaveData||[]).filter(r=>(r.Level||0)>0).length}; }
function buildTrends(points){ const seen={},pts=[]; (points||[]).filter(p=>p&&p.t).sort((a,b)=>a.t-b.t).forEach(p=>{const k=p.t+'/'+p.lifeGold; if(seen[k])return; seen[k]=1; pts.push(p);}); for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i]; const dPlay=(b.playH!=null&&a.playH!=null)?b.playH-a.playH:null; const dWall=(b.t-a.t)/3600000; const h=(dPlay!=null&&dPlay>0.01)?dPlay:dWall; const dLife=(b.lifeGold!=null&&a.lifeGold!=null)?b.lifeGold-a.lifeGold:null; const dKills=(b.kills!=null&&a.kills!=null)?b.kills-a.kills:null; b.goldPerHr=(dLife!=null&&h>0.01)?Math.round(dLife/h):null; b.killsPerHr=(dKills!=null&&h>0.01)?Math.round(dKills/h):null; } return pts; }

module.exports={setDB,RARITY,decryptEs3,safeJsonParse,loadFromDecryptedText,loadSave,snapshot,snapshotFromPsd,gold,heroes,inventory,ownedItems,byRarity,trophies,lootDiff,runes,aggregates,summary,rates,trendPoint,buildTrends,netTicksToDate,itemInfo,gearStats,heroClass,skillName,heroSources,accountBuffs,killsByMonster,sumStats,iconId,statName,resolveMods,boxContents,dropSources,parseOfflineEvents,offlineStatus,xpToNext,stageLabel,GOLD_KEY};
