'use strict';
/* POST /api/enchant-report — OPT-IN enchant crowd-calibration (v1.0.17, P5).
   Body: { tuples: [{ gt, mk, st }, ...] } — gear type, the stone's ItemKey, and the rolled STATTYPE of an
   enchant the player ALREADY HAS on a gear type whose slot category is uncalibrated. The dashboard lists
   every tuple on screen before the user clicks send; NOTHING else is accepted or stored — no save data,
   no crew code, no member id, no name. Storage is an aggregate counter per distinct tuple, so the data
   can confirm gt -> slot-category mappings from real observations (calibrate-or-omit, crowd edition). */
const { applyCors, sql, ensureSchema, sendJson, str, rateLimited, clientIp } = require('./_lib.js');

// the game's full GEARTYPE vocabulary (ItemInfoData; 20 values) — anything else is rejected
const GEARTYPES = ['SWORD', 'BOW', 'STAFF', 'SCEPTER', 'CROSSBOW', 'AXE', 'SHIELD', 'ARROW', 'ORB', 'TOME',
  'BOLT', 'HATCHET', 'HELMET', 'ARMOR', 'GLOVES', 'BOOTS', 'AMULET', 'EARING', 'RING', 'BRACER'];
const MAX_TUPLES_PER_CALL = 20;
const REPORT_CAP_PER_MIN = 5;
// the honest tuple space is small (20 gts x ~140 stones x ~180 stat types, but real combinations are far
// fewer) — a hard ceiling on distinct rows keeps a flood from growing the table unboundedly
const MAX_DISTINCT_ROWS = 5000;

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || !Array.isArray(body.tuples) || !body.tuples.length) {
    return sendJson(res, 400, { ok: false, error: 'tuples required' });
  }

  // validate + whitelist every tuple; anything malformed drops the whole call (it's 3 fields — be strict)
  const tuples = [];
  for (const t of body.tuples.slice(0, MAX_TUPLES_PER_CALL)) {
    const gt = str(t && t.gt, 16);
    const mk = Math.floor(Number(t && t.mk));
    const st = str(t && t.st, 48);
    if (GEARTYPES.indexOf(gt) < 0) return sendJson(res, 400, { ok: false, error: 'unknown gear type' });
    if (!(mk > 0 && mk < 100000000)) return sendJson(res, 400, { ok: false, error: 'invalid material key' });
    if (!st || !/^[A-Za-z0-9_]+$/.test(st)) return sendJson(res, 400, { ok: false, error: 'invalid stat type' });
    tuples.push({ gt, mk, st });
  }

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    if (await rateLimited(s, 'ench:' + clientIp(req), REPORT_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    const count = await s`SELECT count(*)::int AS c FROM tbh_enchant_reports`;
    const atCeiling = count.length && count[0].c >= MAX_DISTINCT_ROWS;
    let stored = 0;
    for (const t of tuples) {
      if (atCeiling) {
        // ceiling reached: still count EXISTING tuples (confirmations are the valuable signal), refuse new rows
        const r = await s`UPDATE tbh_enchant_reports SET n = n + 1, last_seen = now()
                          WHERE gt = ${t.gt} AND material_key = ${t.mk} AND stat_type = ${t.st} RETURNING n`;
        stored += r.length;
      } else {
        await s`INSERT INTO tbh_enchant_reports (gt, material_key, stat_type)
                VALUES (${t.gt}, ${t.mk}, ${t.st})
                ON CONFLICT (gt, material_key, stat_type) DO UPDATE SET n = tbh_enchant_reports.n + 1, last_seen = now()`;
        stored += 1;
      }
    }
    return sendJson(res, 200, { ok: true, stored });
  } catch (e) {
    console.error('enchant-report error', e);
    return sendJson(res, 500, { ok: false, error: 'crew service temporarily unavailable' });
  }
};
