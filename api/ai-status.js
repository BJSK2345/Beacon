/* GET /api/ai-status — reports which AI backend is available
   (local Ollama, cloud Claude, or offline-only). */
import { aiStatus } from '../lib/core.js';
import { sendJson } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    sendJson(res, 200, await aiStatus());
  } catch (e) {
    sendJson(res, 200, { available: false, label: 'Offline mode (built-in)', source: null });
  }
}
