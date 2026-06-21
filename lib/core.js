/* ============================================================
   Beacon — shared AI core (runs in Vercel functions AND in the
   Vite dev middleware). No dependencies; uses built-in fetch.

   Triage strategy (graceful degradation):
     1) local Ollama  — free real AI for local dev / `vercel dev`
     2) Anthropic Claude — for the deployed site, IF ANTHROPIC_API_KEY is set
     3) {ok:false, fallback:true} — client then uses its offline matcher
   ============================================================ */

export const CATEGORIES = [
  'mental_health','crisis','food','housing','health','safety','legal','financial','substance','youth_lgbtq'
];

export function buildPrompt(text) {
  return `You are "Beacon", a warm, calm community-support navigator for people who don't know where to turn.
Read the person's message and respond with ONLY a JSON object, no extra text.

Schema:
{
  "urgency": "emergency" | "high" | "moderate" | "low",
  "needs": [ one or more of: ${CATEGORIES.join(', ')} ],
  "summary": "one short, plain-language restatement of their whole situation",
  "reassurance": "1-2 warm, non-judgmental sentences spoken directly to the person",
  "whatToSay": "a short FIRST-PERSON script the person can read aloud when THEY call or walk in for help — write it as the person speaking, starting with 'Hi,'. Do NOT write it as the helper or counselor.",
  "steps": [ "2 to 4 short, concrete actions the person can take right now" ]
}

Rules:
- Be kind and human. Never diagnose or lecture.
- Include EVERY category in "needs" that applies — if they mention more than one problem (e.g. rent AND food), include all of them.
- If there is ANY risk to their life or someone's safety, set "urgency":"emergency" and include "crisis" in needs.

Example: for "I lost my job and can't pay rent, and I've barely eaten" -> needs: ["financial","housing","food"], and whatToSay starts like "Hi, I recently lost my job and I'm worried about losing my housing and affording food...".

Person's message: """${String(text).replace(/"/g, "'").slice(0, 1500)}"""`;
}

export function normalize(p) {
  const out = {
    urgency: ['emergency','high','moderate','low'].includes(p.urgency) ? p.urgency : 'moderate',
    needs: Array.isArray(p.needs) ? p.needs.filter(n => CATEGORIES.includes(n)) : [],
    summary: typeof p.summary === 'string' ? p.summary : '',
    reassurance: typeof p.reassurance === 'string' ? p.reassurance : '',
    whatToSay: typeof p.whatToSay === 'string' ? p.whatToSay : '',
    steps: Array.isArray(p.steps) ? p.steps.filter(s => typeof s === 'string').slice(0, 4) : []
  };
  if (!out.needs.length) out.needs = ['mental_health'];
  return out;
}

/* fetch with a timeout so production never hangs waiting on a missing Ollama */
async function fetchT(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function extractJson(s) {
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return (a >= 0 && b > a) ? s.slice(a, b + 1) : s;
}

const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

async function callOllama(text) {
  const tagsRes = await fetchT(`${OLLAMA}/api/tags`, {}, 1500);
  const tags = await tagsRes.json();
  let models = (tags.models || []).map(m => m.name).filter(n => !/embed/i.test(n));
  if (!models.length) throw new Error('no ollama chat models');
  const model = models.find(n => /(llama3\.2|qwen2\.5|phi3|gemma2|mistral)/i.test(n)) || models[0];
  const genRes = await fetchT(`${OLLAMA}/api/generate`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, prompt: buildPrompt(text), stream: false, format: 'json', options: { temperature: 0.3 } })
  }, 30000);
  const out = await genRes.json();
  return { model, result: normalize(JSON.parse(out.response)) };
}

async function callAnthropic(text, apiKey) {
  const r = await fetchT('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: buildPrompt(text) + '\n\nRespond with ONLY the JSON object.' }]
    })
  }, 20000);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || 'anthropic error');
  const txt = (j.content && j.content[0] && j.content[0].text) || '';
  return normalize(JSON.parse(extractJson(txt)));
}

export async function triage(text) {
  // 1) local Ollama (free real AI for local dev)
  try { const o = await callOllama(text); return { ok: true, source: 'ollama', model: o.model, result: o.result }; }
  catch (e) { /* fall through */ }
  // 2) Anthropic Claude (only if a key is configured — e.g. on Vercel)
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try { const result = await callAnthropic(text, key); return { ok: true, source: 'anthropic', model: 'Claude Haiku', result }; }
    catch (e) { /* fall through */ }
  }
  // 3) ask the client to use its built-in offline matcher
  return { ok: false, fallback: true };
}

export async function aiStatus() {
  try {
    const r = await fetchT(`${OLLAMA}/api/tags`, {}, 1200);
    const t = await r.json();
    const models = (t.models || []).map(m => m.name).filter(n => !/embed/i.test(n));
    if (models.length) return { available: true, label: 'Local AI ready · ' + models[0], source: 'ollama' };
  } catch (e) { /* no ollama */ }
  if (process.env.ANTHROPIC_API_KEY) return { available: true, label: 'Cloud AI ready · Claude', source: 'anthropic' };
  return { available: false, label: 'Offline mode (built-in)', source: null };
}
