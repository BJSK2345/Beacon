/* POST /api/triage  — Vercel serverless function.
   Body: { text: string }. Returns the AI triage result, or
   { ok:false, fallback:true } so the client uses its offline matcher. */
import { triage } from '../lib/core.js';
import { readJson, sendJson } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, error: 'method not allowed' });
  const body = await readJson(req);
  const text = (body.text || '').toString();
  if (!text.trim()) return sendJson(res, 200, { ok: false, fallback: true });
  try {
    sendJson(res, 200, await triage(text));
  } catch (e) {
    sendJson(res, 200, { ok: false, fallback: true, error: String((e && e.message) || e) });
  }
}
