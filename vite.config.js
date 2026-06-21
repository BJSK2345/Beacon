import { defineConfig } from 'vite';
import triageHandler from './api/triage.js';
import statusHandler from './api/ai-status.js';

// Dev-only: run the same serverless API handlers under `npm run dev`,
// so local development (with Ollama) behaves like production on Vercel.
function devApi() {
  return {
    name: 'beacon-dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.startsWith('/api/triage')) return triageHandler(req, res);
        if (req.url.startsWith('/api/ai-status')) return statusHandler(req, res);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [devApi()],
  server: { port: 4179 },
});
