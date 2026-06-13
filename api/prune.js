'use strict';
/* POST /api/prune — crew cleanup, two modes (v1.0.17, P5 hardening). No accounts exist, so the trust
   boundary is the same one the rest of the API already uses: the crew code (+ the member's own id).
   Mode A — self-remove ("forget me"):   { code, memberId }
     Deletes that member's row + history. Proving (code, memberId) is exactly the pair that can already
     OVERWRITE that row via /progress, so this adds zero new exposure.
   Mode B — stale prune:                 { code, olderThanDays }
     Deletes members not updated for at least olderThanDays (SERVER-ENFORCED FLOOR: 7 days — a leaked or
     guessed crew code can never remove an active member; anyone active re-appears on their next push
     anyway) + their orphaned history. Returns { ok, removed }.
   Also sweeps expired rate-limit windows opportunistically (the only janitor this table needs). */
const { CODE_RE, applyCors, sql, ensureSchema, sendJson, str, rateLimited, clientIp } = require('./_lib.js');

const PRUNE_CAP_PER_MIN = 6;
const MIN_STALE_DAYS = 7;

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return sendJson(res, 400, { ok: false, error: 'invalid JSON body' });

  const code = str(body.code, 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });
  const memberId = str(body.memberId, 64);
  const days = Math.floor(Number(body.olderThanDays));
  if (!memberId && !(days > 0)) return sendJson(res, 400, { ok: false, error: 'memberId (self-remove) or olderThanDays (stale prune) required' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    if (await rateLimited(s, 'prune:' + clientIp(req), PRUNE_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    let removed = 0;
    if (memberId) {
      const r = await s`DELETE FROM tbh_crew_members WHERE crew_code = ${code} AND member_id = ${memberId} RETURNING member_id`;
      await s`DELETE FROM tbh_crew_history WHERE crew_code = ${code} AND member_id = ${memberId}`;
      await s`DELETE FROM tbh_crew_events WHERE crew_code = ${code} AND member_id = ${memberId}`;   // also wipe their activity-feed entries
      removed = r.length;
    } else {
      const cut = Math.max(MIN_STALE_DAYS, days);
      const r = await s`DELETE FROM tbh_crew_members
                        WHERE crew_code = ${code} AND updated_at < now() - (${cut} * interval '1 day')
                        RETURNING member_id`;
      await s`DELETE FROM tbh_crew_history WHERE crew_code = ${code}
              AND member_id NOT IN (SELECT member_id FROM tbh_crew_members WHERE crew_code = ${code})`;
      await s`DELETE FROM tbh_crew_events WHERE crew_code = ${code}
              AND member_id NOT IN (SELECT member_id FROM tbh_crew_members WHERE crew_code = ${code})`;
      removed = r.length;
    }
    // opportunistic janitor: rate windows older than an hour are dead weight
    await s`DELETE FROM tbh_rate WHERE window_start < now() - interval '1 hour'`;
    return sendJson(res, 200, { ok: true, removed });
  } catch (e) {
    console.error('prune error', e);
    return sendJson(res, 500, { ok: false, error: 'database error' });
  }
};
