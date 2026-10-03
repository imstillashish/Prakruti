# Deployment — what ships where

One source of truth: everything is published by pushing to GitHub. Render and
Vercel pull from the repository; nothing is uploaded to them by hand.

| Target | Serves | Source | Config |
| :-- | :-- | :-- | :-- |
| GitHub | source, data, docs | — | `render.yaml`, `.vercelignore`, the guards |
| Render | API — https://prakruti-api.onrender.com | `main` only, auto-deploy on commit | `render.yaml`, `requirements.txt` |
| Vercel | dashboard — https://prakruti-ten.vercel.app | `main` = production, branches = previews | project root `frontend/`, `NEXT_PUBLIC_API_BASE_URL` |

## What the GitHub tree carries

- Source: `app.py` (Flask API), `ai/` (pipeline stages), `api/` (serving helpers),
  `frontend/` (Next.js dashboard), `.github/workflows/`.
- Committed data: `outputs/*.csv` and `outputs/*.json` (including the leaderboard
  artifacts) and `data/forecast_current.csv`. **The Render API serves these exact
  files** — a route reading a local-only path 404s in production (hit once with
  `outputs/interim/`, fixed by falling back to the committed snapshot).
- Docs, specs and plans.

Never tracked (see `.gitignore`): env files and keys beyond `*.example`, `*.db`
(including the 73 MB local `weather.db`), `.venv`, `scratch/`, `.freebuff/`,
`.planning/`, `docs/superpowers/`, `AGENTS.md`, `PRD.md`, `DESIGN.md`.

## What each host receives

- **Render** clones the repo root (no `rootDir`) and runs `pip install -r
  requirements.txt` plus gunicorn over `app.py`; it serves the committed CSVs. The
  free tier sleeps after ~15 min and is warmed by `keep-render-awake.yml`.
- **Vercel** builds only `frontend/` (project root directory). The Python tree is
  excluded by `.vercelignore`; env files are excluded at the project level
  (`frontend/.vercelignore`), so machine tokens never ride along.

## Push rules

1. Deploys run from `main` only. Render auto-deploys commits to `main`; Vercel
   builds production from it. Feature branches produce Vercel previews and nothing
   on Render.
2. Ship through git — no ad-hoc `vercel deploy` or dashboard builds for normal
   changes; production must match a reviewed commit.
3. Data refreshes are commits: the daily workflow writes `outputs/*` to `main`, and
   that commit is what delivers fresh data to both hosts.
4. `/health` stays a cheap answer-only route: it is the Render health probe and the
   keep-awake / nightly ping target.
5. Never commit env files; `frontend/.env.local` holds a live Vercel OIDC token.

## Enforcement

| Rule | Enforced by |
| :-- | :-- |
| No tracked env or secret files | `deploy-guard.yml` |
| `render.yaml` pinned to `main` + `/health` | `deploy-guard.yml` |
| No Codebuff/Freebuff commit trailers | `attribution-guard.yml` + local `commit-msg` / `pre-push` hooks |
| Colour hex stays in tokens | `palette-guard.yml` |
| API awake, dashboard real, data fresh | `keep-render-awake.yml`, `nightly-guard.yml` |

## Verify a deploy

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://prakruti-api.onrender.com/health   # 200
curl -sL https://prakruti-ten.vercel.app/ | grep -q "Forecast Intelligence" && echo "dashboard ok"
```

## Open items

- The Render service's live `healthCheckPath` is still empty; the blueprint now pins
  `/health`, so a blueprint sync applies it. If the service was created outside the
  blueprint, set it once under the service Settings page.
- Vercel project settings (root directory, production branch, env vars) live in the
  Vercel dashboard; the setup history is in the local
  `docs/superpowers/specs/2026-09-30-deployment-setup-design.md`.
