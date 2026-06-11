'use strict';
/* GET /api/leaderboard?code=<crew> — the latest opt-in snapshot per crew member (max 50, newest first).
   Returns { ok, members:[{ id, name, stats, achievement, updatedAt }] }. Ranking/sorting is done client-side
   so each player can rank the same crew by a different stat. */
const { CODE_RE, applyCors, sql, ensureSchema, sendJson, str, rateLimited, clientIp } = require('./_lib.js');

const READ_CAP_PER_MIN = 30;   // the client polls every 30s and only while the Crew tab is open

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'GET only' });

  const code = str((req.query && req.query.code) || '', 32);
  if (!CODE_RE.test(code || '')) return sendJson(res, 400, { ok: false, error: 'invalid crew code (3-32 letters, numbers, - or _)' });

  const s = sql();
  if (!s) return sendJson(res, 503, { ok: false, error: 'leaderboard not configured yet (no database attached)' });

  try {
    await ensureSchema(s);
    // v1.0.17: per-IP fixed-window rate limit
    if (await rateLimited(s, 'get:' + clientIp(req), READ_CAP_PER_MIN)) {
      return sendJson(res, 429, { ok: false, error: 'slow down — try again in a minute' });
    }
    const rows = await s`SELECT member_id, name, stats, achievement, updated_at
                         FROM tbh_crew_members WHERE crew_code = ${code}
                         ORDER BY updated_at DESC LIMIT 50`;
    return sendJson(res, 200, {
      ok: true,
      members: rows.map((r) => ({ id: r.member_id, name: r.name, stats: r.stats, achievement: r.achievement, updatedAt: r.updated_at })),
    });
  } catch (e) {
    console.error('leaderboard error', e);
    return sendJson(res, 500, { ok: false, error: 'database error' });
  }
};
