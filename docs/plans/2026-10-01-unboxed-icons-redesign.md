# Implementation Plan: Unboxed Editorial Icons Redesign

Remove the 36×36px rounded-corner square border boxes (`span.w-9.h-9.rounded-md.bg-secondary.border.border-border`) from icons across the entire site, giving icons better space, increased legibility, and a clean editorial appearance adhering to DESIGN.md v3.

## User Review Required

> [!NOTE]
> - Icons will now render cleanly and borderless beside their headings without grey box plates.
> - Page header icons will increase from cramped 18px to a crisp 24px (`w-6 h-6`, strokeWidth 1.85) for optimal visibility.
> - Section header icons will render at 18px (`w-4.5 h-4.5`), seamlessly integrated with title lines.
> - Alert hazard icons will display directly with their semantic colors (`text-destructive`, `text-warning`, `text-success`) without background box clutter.

---

## Proposed Changes

### Component 1: Page Header (`PageHeader.tsx`)

#### [MODIFY] [PageHeader.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/shell/PageHeader.tsx)
- Remove `<span className="w-9 h-9 shrink-0 rounded-md bg-secondary border border-border text-foreground flex items-center justify-center">`.
- Render the icon directly beside the title block:
  ```tsx
  <div className="flex items-start sm:items-center gap-3 min-w-0">
    <Icon className="w-6 h-6 text-foreground shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.85} />
    <div className="min-w-0">
      <h1 className="text-lg font-semibold text-foreground tracking-tight leading-6">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </div>
  ```

---

### Component 2: Section Banner (`SectionBanner.tsx`)

#### [MODIFY] [SectionBanner.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/shell/SectionBanner.tsx)
- Remove `<span className="w-9 h-9 shrink-0 rounded-md bg-secondary border border-border text-foreground flex items-center justify-center">`.
- Render the icon directly inline:
  ```tsx
  <div className="flex items-center gap-2.5 min-w-0">
    <Icon className="w-4.5 h-4.5 text-foreground shrink-0" strokeWidth={1.85} />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
        {pill && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] bg-secondary text-muted-foreground border border-border">
            {pill}
          </span>
        )}
      </div>
      {subline && <p className="text-xs text-muted-foreground mt-0.5">{subline}</p>}
    </div>
  </div>
  ```

---

### Component 3: Alert Center & Empty States (`AlertCenter/index.tsx`)

#### [MODIFY] [AlertCenter/index.tsx](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/AlertCenter/index.tsx)
- Remove `<span className="w-8 h-8 shrink-0 rounded-md bg-secondary border border-border text-destructive flex items-center justify-center">` and render `<AlertTriangle className="w-5 h-5 shrink-0 text-destructive mt-0.5" />`.
- In empty state, remove `<div className="w-9 h-9 mx-auto mb-2 rounded-md bg-card border border-success/20 text-success flex items-center justify-center">` and render `<CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />`.

---

## Verification Plan

### Automated Tests
- Run TypeScript check:
  ```bash
  cd frontend && npx tsc --noEmit
  ```
- Run Next.js production build:
  ```bash
  cd frontend && npm run build
  ```

### Manual Verification
- Verify on `http://localhost:3000/`:
  - Open `/rpi` (Risk Priority Index & Trust Atlas) — confirm the header icon has no box and is cleanly aligned with the title.
  - Open `/forecast`, `/model-intelligence`, `/extreme-weather`, `/model-performance`, `/data-health`, `/api` — confirm all page headers have unboxed, crisp icons.
  - Open the Alert Drawer from the TopBar — confirm alert items have clean, unboxed hazard icons.
- Deploy to Vercel and push to GitHub.
