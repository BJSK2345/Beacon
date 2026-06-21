/* Tiny request/response helpers that work both as a Vercel serverless
   function (req/res have .body/.status/.json) and as raw Node http
   handlers (used by the Vite dev middleware). */

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise(resolve => {
    let d = '';
    req.on('data', c => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export function sendJson(res, code, obj) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(code).json(obj);
    return;
  }
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}
