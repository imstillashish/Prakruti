#!/usr/bin/env python3
"""DESIGN.md §9.6 acceptance gate — one command, one verdict.

Merges the scratch probes (final_audit.py, tap_scan.py, budget_px.py) into a
single pass/fail summary for CI or a pre-push check.

    python3 scripts/audit_gate.py

Needs the production frontend already serving on :3011 (`next build` +
`next start -p 3011`) and the API on :5002; set PREVIEW_URL / API_URL to
override. Exits 0 only when every row passes.

Gates per tier: page height ≤ 3.0 viewport-heights on phone/tablet, ≤ 3.6 on
desktop; zero horizontal overflow; every interactive hit box ≥ 44×44 on the
touch tiers only — desktop is a pointer tier (24px WCAG floor) and its
175×40 nav-rail rows are not violations (docs/specs/2026-10-05-9-6-audit-triage.md).

Hit box = element rect unioned with its absolute ::after expansion (the repo's
after:-inset-* convention), so an expanded tap zone counts as passing. The
43.5px threshold absorbs Leaflet's fractional geometry (44px markers measure
43.9997). Findings are reported, not silently dropped: ones already recorded in
audit_gate_baseline.json (generated with --update-baseline) print as known and do
not fail the run — they are the documented punch list in
2026-10-05-9-6-audit-triage.md — anything new fails the gate. --strict ignores
the baseline; --update-baseline refreshes it after a fix batch lands.
"""
import json
import os
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = os.environ.get("PREVIEW_URL", "http://127.0.0.1:3011")
API_URL = os.environ.get("API_URL", "http://127.0.0.1:5002/health")
BASELINE_FILE = os.path.join(os.path.dirname(__file__), "audit_gate_baseline.json")
SECTIONS = [
    "Overview", "Forecast", "RPI & Trust Atlas", "Model Intelligence", "BYOM",
    "Extreme Weather", "Performance", "Leaderboard", "Data Health", "API Explorer",
]
# (width, height, budget vh, run tap scan) — tap scan on touch tiers only.
TIERS = [
    (390, 844, 3.0, True),
    (768, 1024, 3.0, True),
    (1440, 900, 3.6, False),
]

METRICS = """() => ({
  page: document.documentElement.scrollHeight,
  vh: window.innerHeight,
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  barBottom: (() => {
    const bar = document.querySelector('.fixed.bottom-0');
    if (!bar) return null;
    return Math.round(window.innerHeight - bar.getBoundingClientRect().bottom);
  })(),
})"""

# Hit-box scan, walked over the whole page in scroll steps so nothing below
# the fold escapes. The ::after union implements the repo's tap-zone convention.
TAP_SCAN = """() => {
  const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName)
    .replace(/\\s+/g, ' ').trim().slice(0, 40) || el.tagName.toLowerCase();
  const out = [];
  const sel = 'button, a[href], [role=button], input, select, .leaflet-marker-icon';
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    let w = r.width, h = r.height;
    const a = getComputedStyle(el, '::after');
    if (a.content && a.content !== 'none' && a.position === 'absolute') {
      const px = (v) => (v.endsWith('px') ? parseFloat(v) : 0);
      if (a.left !== 'auto' && a.right !== 'auto') w = r.width - px(a.left) - px(a.right);
      if (a.top !== 'auto' && a.bottom !== 'auto') h = r.height - px(a.top) - px(a.bottom);
    }
    if (w >= 43.5 && h >= 43.5) continue;
    out.push(`${Math.round(w)}x${Math.round(h)} ${label(el)}`);
  }
  return [...new Set(out)];
}"""


def wait_for(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                if resp.status < 500:
                    return True
        except OSError:
            if i < tries - 1:
                continue
    return False


def load_baseline():
    if not os.path.exists(BASELINE_FILE):
        return set()
    with open(BASELINE_FILE) as fh:
        return set(json.load(fh).get("known", []))


def main():
    update_baseline = "--update-baseline" in sys.argv
    strict = "--strict" in sys.argv
    known = set() if strict or update_baseline else load_baseline()
    for name, url in [("frontend", BASE), ("api", API_URL)]:
        if not wait_for(url):
            sys.exit(
                f"audit_gate: {name} not reachable at {url}\n"
                "  start: (cd .verify-build/frontend && npx next start -p 3011)  # after npx next build\n"
                "  api:   setsid -f env PORT=5002 python3 app.py"
            )

    failures = []
    all_findings = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for w, h, budget, tap_scan in TIERS:
            ctx = browser.new_context(
                viewport={"width": w, "height": h},
                has_touch=tap_scan,
                is_mobile=tap_scan,
            )
            page = ctx.new_page()
            page.set_default_timeout(20000)
            page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
            # The welcome splash is a first-run gate, not the dashboard surface:
            # seed its seen-flag and reload so every row measures the real UI.
            try:
                page.evaluate("window.sessionStorage.setItem('prakruti:welcome-seen','1')")
                page.reload(wait_until="domcontentloaded", timeout=30000)
            except Exception:
                pass
            page.wait_for_timeout(13000)
            print(f"\n=== {w}x{h} (budget {budget}) ===", flush=True)
            for label in SECTIONS:
                if label != "Overview":
                    try:
                        page.get_by_role("button", name=label, exact=True).first.click()
                    except Exception as exc:
                        failures.append(f"{w}x{h} {label}: nav click failed ({type(exc).__name__})")
                        continue
                    page.wait_for_timeout(6500)
                m = page.evaluate(METRICS)
                ratio = m["page"] / m["vh"]
                ok = ratio <= budget and m["overflow"] == 0
                print(
                    f"  {label:<20} {m['page']:>5}px {ratio:>5.2f}vh "
                    f"{'PASS' if ok else 'FAIL'}  overflow={m['overflow']} barDocked={m['barBottom']}",
                    flush=True,
                )
                if ratio > budget:
                    failures.append(f"{w}x{h} {label}: {ratio:.2f}vh > {budget}")
                if m["overflow"]:
                    failures.append(f"{w}x{h} {label}: {m['overflow']}px horizontal overflow")

                if not tap_scan:
                    continue
                found = set()
                for i in range(9):
                    page.evaluate(
                        "f => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * f))",
                        i / 8,
                    )
                    page.wait_for_timeout(300)
                    found.update(page.evaluate(TAP_SCAN))
                page.evaluate("window.scrollTo(0, 0)")
                if not found:
                    continue
                print("      tap < 44x44: " + "; ".join(sorted(found)[:8]), flush=True)
                for f in sorted(found):
                    fp = f"{w}:{label}:{f}"
                    all_findings.append(fp)
                    if fp not in known:
                        failures.append(f"{w}x{h} {label}: {f}")
            ctx.close()
        browser.close()

    print(flush=True)
    if update_baseline:
        with open(BASELINE_FILE, "w") as fh:
            json.dump({"known": sorted(set(all_findings))}, fh, indent=1)
            fh.write("\n")
        print(f"baseline written: {len(set(all_findings))} finding(s) -> {BASELINE_FILE}", flush=True)
        return

    if failures:
        print(f"GATE: FAIL ({len(failures)} finding(s))", flush=True)
        for f in failures:
            print(f"  - {f}", flush=True)
        sys.exit(1)
    n_known = len(set(all_findings))
    suffix = f" · {n_known} known tap finding(s) baselined" if n_known else ""
    print(
        f"GATE: PASS ({len(TIERS) * len(SECTIONS)}/{len(TIERS) * len(SECTIONS)} rows"
        f"{suffix})",
        flush=True,
    )


if __name__ == "__main__":
    main()
