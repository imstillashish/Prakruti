# Specification: Unboxed Editorial Icons Redesign

**Date:** 2026-10-01  
**Author:** Pair Programming Agent & Developer  
**Status:** Approved for Implementation  
**Design Standard:** DESIGN.md v3 (White Editorial System, Inter + JetBrains Mono)  
**Skills Consulted:** `impeccable` (distill/polish), `design-taste-frontend` (`VARIANCE: 5`, `MOTION: 3`, `DENSITY: 6`)

---

## 1. Problem Statement & Motivation

During page auditing on `http://localhost:3000/`, inspection of the header elements revealed that icons were enclosed in 36×36px rounded square boxes with borders (`span.w-9.h-9.rounded-md.bg-secondary.border.border-border`).
- **User Feedback:** *"There are many icon that have this round corner square border! I want you to remove this kind of box from every where from whole site and by doing the icons will get a better space for better visibility!"*
- **Design Assessment:** Trapping icons in a grey 1px-bordered square shrinks the visible icon to 16–18px, adds unnecessary visual boxiness, and gives the UI a generic dashboard template look rather than the high-end editorial feel of DESIGN.md v3.

---

## 2. Design Principles & Anti-Default Guardrails

- **Unboxed & Free-Breathing:** No rounded-corner square borders around decorative or informational icons. Icons sit naturally adjacent to typography.
- **Optical Scale & Legibility:** Page header icons increase from cramped 18px to a crisp 24px (`w-6 h-6`, strokeWidth 1.85); section header icons render at 18px (`w-4.5 h-4.5`).
- **Preserved Hierarchy & Geometry:** Panel radiuses (12px), button radiuses (8px), pill badges, and layout alignment remain 100% intact. We are removing redundant icon plates, not altering overall structural geometry.
- **Semantic Signals Only:** Alert icons in drawers and banners retain their purposeful semantic signals (`text-destructive`, `text-warning`, `text-success`) without being boxed in grey squares.

---

## 3. Targeted Component Updates

### 3.1. `PageHeader` ([`frontend/src/components/shell/PageHeader.tsx`](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/shell/PageHeader.tsx))
- **Remove:**
  ```tsx
  <span className="w-9 h-9 shrink-0 rounded-md bg-secondary border border-border text-foreground flex items-center justify-center">
    <Icon className="w-4.5 h-4.5" />
  </span>
  ```
- **Replace with:**
  ```tsx
  <div className="flex items-start sm:items-center gap-3 min-w-0">
    <Icon className="w-6 h-6 text-foreground shrink-0 mt-0.5 sm:mt-0" strokeWidth={1.85} />
    <div className="min-w-0">
      <h1 className="text-lg font-semibold text-foreground tracking-tight leading-6">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  </div>
  ```

### 3.2. `SectionBanner` ([`frontend/src/components/shell/SectionBanner.tsx`](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/shell/SectionBanner.tsx))
- **Remove:**
  ```tsx
  <span className="w-9 h-9 shrink-0 rounded-md bg-secondary border border-border text-foreground flex items-center justify-center">
    <Icon className="w-4 h-4" />
  </span>
  ```
- **Replace with:**
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

### 3.3. `AlertCenter` ([`frontend/src/components/AlertCenter/index.tsx`](file:///home/asp/.gemini/antigravity/scratch/SIH_MVP202681/frontend/src/components/AlertCenter/index.tsx))
- **Remove:**
  ```tsx
  <span className="w-8 h-8 shrink-0 rounded-md bg-secondary border border-border text-destructive flex items-center justify-center">
    <AlertTriangle size={16} />
  </span>
  ```
- **Replace with:**
  ```tsx
  <AlertTriangle className="w-5 h-5 shrink-0 text-destructive mt-0.5" />
  ```
- **Empty State Icon Box:**
  Remove `<div className="w-9 h-9 mx-auto mb-2 rounded-md bg-card border border-success/20 text-success flex items-center justify-center">` and render `<CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />`.

---

## 4. Verification & Quality Gates

1. **TypeScript Build:** `npx tsc --noEmit` must return 0 errors.
2. **Turbopack Build:** `npm run build` must complete cleanly with all routes prerendered.
3. **Visual Quality Audit:** Inspect all tabs on `http://localhost:3000` to confirm icons have crisp optical margins, perfect alignment with titles, and zero boxed border artifacts.
