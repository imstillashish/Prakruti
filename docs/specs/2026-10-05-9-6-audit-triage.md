# §9.6 Audit Triage — 2026-10-05

**Context:** full gate run after commit `e376d6e` (44px touch floor to `lg:` + hit-area
expansions). All 27 section/viewport height rows pass except phone Overview (3.77) and
Forecast (3.62), both measured identical at pristine HEAD — pre-existing, tracked by the
2026-10-04 refit spec. This note triages every residual `tap < 44x44` flag the probe still
prints, so the gate can whitelist artifacts instead of dying in noise.

## Real defects (fix, small)

**1. API Explorer controls at tablet — `ApiPage.tsx`.**
`94x25 Copy JSON`, `224x26 INPUT` (param field), `22x33 BUTTON` (endpoint send). The page's
own console layout was built desktop-first; the param input, copy button and send button
carry no `min-h-[44px]` floor and no `after:-inset` expansion. Same fix batch as Bench:
44px floor/zone up to `lg:`. Low severity (page is a developer surface) but it is a real
touch-tier violation the gate must not whitelist.

**2. Leaflet popup chrome on the map surfaces — phone + tablet RPI / Extreme Weather.**
`32x32 E <city> <model>` station rows, `192x26 INPUT`, `28x28 BUTTON`, `24x24 Close popup`
— all inside the Leaflet station popup (third-party chrome plus the popup's content row).
The repo already treats map markers as legitimate geometry, but popup *controls* are ours
to style: expand hit areas via the `after:-inset` convention against
`.leaflet-popup-close-button` and the popup's action button/select in the map stylesheet.

## Not defects (document, whitelist in the gate)

**3. Desktop nav-rail rows, 175×40 — pointer tier, rule does not apply.**
The 9 section buttons + Collapse measure 175×39.5 (py-2.5). DESIGN.md §9.6 gates 44×44 on
touch viewports; 1440×900 is a pointer tier where WCAG's floor is 24px and 40px rows with
175px width are comfortably compliant. Not a defect; the gate runs its tap check only on
390/768.

**4. Explain glossary glyph, 13×13 ("What is Average Forecast Error").**
The 13px glyph is the visual design (superscript "what is this" marker); its hit zone is
45×45 via `after:-inset-4` — size-compliant under the hit-area measurement the 10-04 spec
§6 defines. The probe flags it only through the sibling-overlap check: glossary rows sit
at a 22px pitch, so two 45px zones must overlap geometrically. Pre-existing, unavoidable
at that row pitch, and a tap still lands on a control. Documented; not fixed.

**5. Map station markers themselves (`44x44 Jaipur 0.1 mm` etc.).**
Listed at exactly 44×44 — the flag fires on float rounding (43.9997). Legitimate geometry
per AGENTS.md (Leaflet markers are the approved rounded-full exception) and already at the
gated size. Probe artifact; whitelist by ≥43.5 threshold.

## Disposition

Items 1–2 become one small fix batch (tracked separately, not part of the Overview/Forecast
refit); items 3–5 are encoded as the gate script's whitelist with pointers to this note.
Phone Overview/Forecast budgets remain open per the 10-04 spec §4 and are the subject of
the current refit task.
