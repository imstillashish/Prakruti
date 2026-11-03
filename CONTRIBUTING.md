# Contributing to Prakruti

Thanks for your interest. This is an active project — PRs are welcome.

## Quick start

```bash
git clone https://github.com/imstillashish/Prakruti.git
cd Prakruti
make dev          # starts both API (port 5000) and dashboard (port 3000)
```

## Workflow

1. **Pick an issue** — check [good first issues](https://github.com/imstillashish/Prakruti/labels/good%20first%20issue) if you're new
2. **Branch** off `main`: `git checkout -b fix/short-description`
3. **Make your change** — keep it focused, one thing per PR
4. **Tests must pass**: `pytest tests/ -x -q` and `cd frontend && npm run build`
5. **Open a PR** — CI runs automatically; a maintainer will review within a day

## What we're looking for

- New city support (the 45-city list is in `data/cities.json`)
- Better test coverage (see `tests/` — it's thin)
- Frontend accessibility fixes
- Documentation improvements

## What we're not looking for right now

- Full rewrites / framework swaps
- New ML models without baseline comparisons

## Code style

- Python: no linter config means keep it consistent with what's already there
- TypeScript: `npm run lint` before pushing (Biome, config in `frontend/`)
- Commit messages: `type(scope): short description` (conventional commits)

## Questions?

Open an issue or start a Discussion. We respond within a day.
