/**
 * PM2 ecosystem configuration for running Office Repo outside Replit
 * (e.g. on the operator's own infrastructure for officerepo.com).
 *
 * Usage:
 *   1. Copy `.env.example` to `.env` and fill in real values (see also
 *      `frontend-web/.env.example`). Secrets are read from the environment —
 *      they are NOT inlined here.
 *   2. Export the variables into your shell (PM2 inherits the parent
 *      environment), for example:
 *         set -a && . ./.env && set +a
 *   3. Build the frontend once (only needed for the frontend process):
 *         cd frontend-web && npm install && npm run build && cd ..
 *   4. Start the managed processes:
 *         pm2 start ecosystem.config.cjs
 *      Other handy commands:
 *         pm2 status            # list processes
 *         pm2 logs              # tail logs
 *         pm2 restart all       # restart after a deploy
 *         pm2 startup && pm2 save   # persist across reboots
 *
 * Run only the backend:   pm2 start ecosystem.config.cjs --only officerepo-backend
 */

const path = require("path");

const REPO_ROOT = __dirname;
const BACKEND_PORT = process.env.BACKEND_PORT || "8000";
const FRONTEND_PORT = process.env.FRONTEND_PORT || "5000";
const ENVIRONMENT = process.env.ENVIRONMENT || "production";

module.exports = {
  apps: [
    {
      // FastAPI backend served by uvicorn (module path: backend.main:app).
      name: "officerepo-backend",
      script: "python",
      args: `-m uvicorn backend.main:app --host 0.0.0.0 --port ${BACKEND_PORT}`,
      interpreter: "none",
      cwd: REPO_ROOT,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      // Secrets/config come from the inherited shell environment / .env.
      // Only non-secret runtime hints are set here.
      env: {
        ENVIRONMENT: ENVIRONMENT,
        BACKEND_PORT: BACKEND_PORT,
      },
    },
    {
      // Optional: static frontend served by Vite's preview server.
      // Requires `npm run build` in frontend-web/ first. Comment this block
      // out if you serve the built `dist/` via Nginx/CDN instead.
      name: "officerepo-frontend",
      script: "npm",
      args: `run preview -- --host 0.0.0.0 --port ${FRONTEND_PORT}`,
      interpreter: "none",
      cwd: path.join(REPO_ROOT, "frontend-web"),
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        FRONTEND_PORT: FRONTEND_PORT,
      },
    },
  ],
};
