'use strict';
/* Shared helpers for the TBH HUD crew API (Vercel serverless + Neon Postgres).
   PRIVACY CONTRACT (mirrors the dashboard's Crew tab): this API only ever receives the small, calibrated
   BRAG-STATS payload that the client shows the user before they opt in — never the save file. Everything
   stored is namespaced tbh_* in the database. A crew is gated by a shared code; no accounts. */
const { neon } = require('@neondatabase/serverless');

const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$/;

// CORS: reflect known origins (GitHub Pages + the Vercel hosts); the desktop app loads from file:// and sends
// no/`null` Origin, which isn't a CORS request the browser will block — give it `*`. Anything else gets no
// CORS header (the crew code, not CORS, is the access gate — this API only ever serves opt-in brag-stats).
const ALLOWED_ORIGINS = [
  'https://revenantcabal-rgb.github.io',
  'https://taskbarheroburat.vercel.app',
  'https://tbh-crew-api.vercel.app',
];
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || origin === 'null') res.setHeader('Access-Control-Allow-Origin', '*');
  else if (ALLOWED_ORIGINS.indexOf(origin) >= 0 || /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}

let _sql = null;
function sql() {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

let _schemaReady = null;
function ensureSchema(s) {
  if (!_schemaReady) _schemaReady = (async () => {
    await s`CREATE TABLE IF NOT EXISTS tbh_crew_members (
      crew_code text NOT NULL,
      member_id text NOT NULL,
      name text NOT NULL,
      stats jsonb NOT NULL,
      achievement jsonb,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (crew_code, member_id)
    )`;
    await s`CREATE TABLE IF NOT EXISTS tbh_crew_history (
      id bigserial PRIMARY KEY,
      crew_code text NOT NULL,
      member_id text NOT NULL,
      stats jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await s`CREATE INDEX IF NOT EXISTS tbh_crew_hist_idx ON tbh_crew_history (crew_code, member_id, id DESC)`;
  })().catch((e) => { _schemaReady = null; throw e; });
  return _schemaReady;
}

const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
// strip control characters, trim, clamp length — applied to every string that gets stored or echoed
const str = (v, max) => { if (typeof v !== 'string') return null; let out = ''; for (const ch of v) { const c = ch.charCodeAt(0); if (c >= 32 && c !== 127) out += ch; } return out.trim().slice(0, max); };

// whitelist + clamp the brag-stats payload — anything not listed here is dropped, never stored
const TIER_KEYS = ['LEGENDARY', 'IMMORTAL', 'ARCANA', 'BEYOND', 'CELESTIAL', 'DIVINE', 'COSMIC'];
// the calibrated Stat List line keys (v1.0.11) — mirrors STAT_LIST in the dashboard/saveEngine
const STATLIST_KEYS = ['IncreaseExpAmount', 'AdditionalExp', 'AdditionalExpStageBoss', 'AdditionalExpActBoss',
  'AdditionalExpNormalMonster', 'UnlockArrangeSlotCount', 'AllHeroMoveSpeed', 'AllHeroAttackSpeed', 'AllHeroAttackDamage'];
function cleanStats(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const heroes = Array.isArray(raw.topHeroes) ? raw.topHeroes.slice(0, 3).map((h) => ({
    cls: str(h && h.cls, 16) || '?', level: num(h && h.level) || 0,
  })) : [];
  // per-tier gear counts (v1.0.8): only the known tier names, only positive integers
  const tiers = {};
  if (raw.tiers && typeof raw.tiers === 'object') {
    TIER_KEYS.forEach((t) => { const n = num(raw.tiers[t]); if (n != null && n > 0) tiers[t] = Math.min(100000, Math.floor(n)); });
  }
  // top rune stats (v1.0.10): max 6 entries of {e: effect name, v: summed value}
  const runeStats = Array.isArray(raw.runeStats) ? raw.runeStats.slice(0, 6).map((s) => ({
    e: str(s && s.e, 32) || '?', v: num(s && s.v) || 0,
  })).filter((s) => s.e !== '?' && s.v > 0) : [];
  // grouped Stat List (v1.0.11): only the calibrated line keys, raw positive values — anything else is dropped
  const statList = Array.isArray(raw.statList) ? raw.statList.slice(0, 12).map((s) => ({
    k: str(s && s.k, 32) || '', v: num(s && s.v) || 0,
  })).filter((s) => STATLIST_KEYS.indexOf(s.k) >= 0 && s.v > 0) : [];
  return {
    maxStage: num(raw.maxStage) || 0,
    maxStageLabel: str(raw.maxStageLabel, 40) || '',
    lifeGold: num(raw.lifeGold),
    kills: num(raw.kills),
    gold: num(raw.gold),
    topHeroes: heroes,
    runesLeveled: num(raw.runesLeveled),
    runesTotal: num(raw.runesTotal),
    trophies: num(raw.trophies),
    tiers,
    runeStats,
    statList,
    playHours: num(raw.playHours),
    ver: str(raw.ver, 12),
  };
}

// "latest achievement" — derived ONLY from the member's own snapshot deltas (never invented):
// new max stage > new Legendary+ > top-hero level-up > a 10-runes milestone. First share = joined.
function deriveAchievement(prevStats, prevAch, stats) {
  const now = new Date().toISOString();
  if (!prevStats) return { t: now, text: 'Joined the crew' };
  if ((stats.maxStage || 0) > (prevStats.maxStage || 0)) return { t: now, text: 'Reached ' + (stats.maxStageLabel || ('stage ' + stats.maxStage)) };
  if ((stats.trophies || 0) > (prevStats.trophies || 0)) return { t: now, text: 'Found a new Legendary+ item' };
  const top = (a) => (a && a.topHeroes || []).reduce((m, h) => Math.max(m, h.level || 0), 0);
  const tn = top(stats), tp = top(prevStats);
  if (tn > tp) {
    const h = (stats.topHeroes || []).filter((x) => (x.level || 0) === tn)[0];
    return { t: now, text: (h ? h.cls : 'A hero') + ' hit Lv ' + tn };
  }
  if (Math.floor((stats.runesLeveled || 0) / 10) > Math.floor((prevStats.runesLeveled || 0) / 10)) {
    return { t: now, text: stats.runesLeveled + ' runes leveled' };
  }
  return prevAch || null;   // nothing new — keep the last real achievement
}

function sendJson(res, code, obj) { res.status(code).json(obj); }

module.exports = { CODE_RE, applyCors, sql, ensureSchema, cleanStats, deriveAchievement, sendJson, str };
