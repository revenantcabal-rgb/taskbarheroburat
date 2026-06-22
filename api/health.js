'use strict';
/* GET /api/health — DB liveness probe for ops/diagnosis.
   Returns a SANITIZED status only: no connection string, no secrets — just whether the database answers
   and, when it doesn't, a coarse failure CLASS so an outage is a one-URL diagnosis instead of digging
   through Vercel logs. Safe to curl publicly (this API only ever serves opt-in brag-stats; the DB holds
   nothing sensitive). Mirrors the other endpoints' use of the shared _lib helpers. */
const { applyCors, sql, sendJson } = require('./_lib.js');

// map a driver/Postgres error message to a coarse, non-sensitive class the owner can act on
function classify(msg) {
  const m = String(msg || '').toLowerCase();
  if (m.includes('password authentication') || (m.includes('role') && m.includes('does not exist'))) return 'auth_failed';
  if (m.includes('endpoint') && (m.includes('disabled') || m.includes('not enabled') || m.includes('could not be found') || m.includes('not found'))) return 'endpoint_disabled';
  if (m.includes('database') && m.includes('does not exist')) return 'database_missing';
  if (m.includes('suspend') || m.includes('quota') || m.includes('exceeded') || m.includes('limit')) return 'suspended_or_quota';
  if (m.includes('control plane') || m.includes('console request')) return 'neon_control_plane';
  if (m.includes('enotfound') || m.includes('fetch failed') || m.includes('econn') || m.includes('timeout') || m.includes('terminat') || m.includes('connect')) return 'unreachable';
  return 'unknown';
}
// never echo a connection string; cap length so a long stack can't bloat the response
function scrub(msg) { return String(msg || '').replace(/postgres(?:ql)?:\/\/[^\s'"]+/gi, '[redacted-url]').slice(0, 200); }

module.exports = async (req, res) => {
  if (applyCors(req, res)) return;
  const envVar = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'none');
  const s = sql();
  if (!s) return sendJson(res, 503, { ok: true, db: 'unconfigured', envVar, hint: 'no DATABASE_URL / POSTGRES_URL set on this deployment' });
  const t0 = Date.now();
  try {
    const r = await s`SELECT now() AS ts`;
    return sendJson(res, 200, { ok: true, db: 'up', envVar, ms: Date.now() - t0, ts: (r[0] && r[0].ts) || null });
  } catch (e) {
    return sendJson(res, 503, { ok: true, db: 'down', envVar, errorClass: classify(e && e.message), detail: scrub(e && e.message), ms: Date.now() - t0 });
  }
};
