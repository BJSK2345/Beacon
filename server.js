/* Optional zero-install local runner:  `node server.js`
   Serves the static app + the same AI endpoints used in production,
   reusing lib/core.js. (For the modern dev experience use `npm run dev`;
   for deployment, Vercel uses the functions in /api.) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { triage, aiStatus } from './lib/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4179;
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const sendJson = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/triage') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      let text = '';
      try { text = (JSON.parse(body || '{}').text || '').toString(); } catch {}
      if (!text.trim()) return sendJson(res, 200, { ok: false, fallback: true });
      try { sendJson(res, 200, await triage(text)); }
      catch (e) { sendJson(res, 200, { ok: false, fallback: true, error: String((e && e.message) || e) }); }
    });
    return;
  }
  if (url === '/api/ai-status') {
    try { sendJson(res, 200, await aiStatus()); }
    catch { sendJson(res, 200, { available: false, label: 'Offline mode (built-in)', source: null }); }
    return;
  }

  // static files
  let p = decodeURIComponent(url);
  if (p === '/') p = '/index.html';
  const file = path.join(__dirname, path.normalize(p));
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Beacon (local) running at http://localhost:' + PORT));
