'use strict';
/* POST /api/progress — an OPT-IN brag-stats push from a HUD client.
   Body: { code, member:{id,name}, stats:{...} } (see _lib.cleanStats for the full whitelist — nothing else
   is stored). Upserts the member's latest snapshot, keeps a short history, and derives the member's
   "latest achievement" from their own snapshot deltas. Returns { ok, achievement }. */
const { CODE_RE, applyCors, sql, ensureSchema, cleanStats, deriveAchievement, sendJson, str, rateLimited } = require('./_lib.js');

const HISTORY_KEEP = 20;
const PUSH_CAP_PER_MIN = 6;   // the client self-throttles to ~1/min; 6 leaves room for join/toggle bursts

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== 'object') return sendJson(res, 400, { ok: false, error: 'invalid JSON body' });

  const code = str(body.code, 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });
  const memberId = str(body.member && body.member.id, 64);
  const name = str(body.member && body.member.name, 24);
  if (!memberId || !name) return sendJson(res, 400, { ok: false, error: 'member id and display name required' });
  const stats = cleanStats(body.stats);
  if (!stats) return sendJson(res, 400, { ok: false, error: 'stats payload required' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    // v1.0.17: per-(crew, member) fixed-window rate limit — BEFORE the heavier upsert work
    if (await rateLimited(s, 'push:' + code + ':' + memberId, PUSH_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    const prev = await s`SELECT stats, achievement FROM tbh_crew_members WHERE crew_code = ${code} AND member_id = ${memberId}`;
    const achievement = deriveAchievement(prev.length ? prev[0].stats : null, prev.length ? prev[0].achievement : null, stats);
    await s`INSERT INTO tbh_crew_members (crew_code, member_id, name, stats, achievement, updated_at)
            VALUES (${code}, ${memberId}, ${name}, ${JSON.stringify(stats)}::jsonb, ${achievement ? JSON.stringify(achievement) : null}::jsonb, now())
            ON CONFLICT (crew_code, member_id)
            DO UPDATE SET name = EXCLUDED.name, stats = EXCLUDED.stats, achievement = EXCLUDED.achievement, updated_at = now()`;
    await s`INSERT INTO tbh_crew_history (crew_code, member_id, stats) VALUES (${code}, ${memberId}, ${JSON.stringify(stats)}::jsonb)`;
    // keep the per-member history small — achievements only need the recent snapshots
    await s`DELETE FROM tbh_crew_history WHERE id IN (
              SELECT id FROM tbh_crew_history WHERE crew_code = ${code} AND member_id = ${memberId}
              ORDER BY id DESC OFFSET ${HISTORY_KEEP})`;
    return sendJson(res, 200, { ok: true, achievement });
  } catch (e) {
    console.error('progress error', e);
    return sendJson(res, 500, { ok: false, error: 'database error' });
  }
};
