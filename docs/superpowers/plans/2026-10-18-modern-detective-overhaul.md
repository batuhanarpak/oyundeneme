# Modern Detective Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Neon Breach from a "neon game" into a "Professional Digital Investigator Console" with a refined visual identity, corrected game loops, and functional cross-device connectivity.

**Architecture:** 
- **Frontend:** Next.js 16.4.2 (App Router) on Vercel.
- **Backend:** PartyServer on Cloudflare Workers + Durable Objects.
- **Styling:** Tailwind CSS v3 + CSS Custom Properties (Design Tokens).
- **State:** Zustand-like store (`useGameStore.ts`).

**Tech Stack:** Next.js, React 18, Tailwind CSS, PartyServer, Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-10-18-modern-detective-overhaul.md`

## Global Constraints
- **Typography:** Editorial Serif (Headings), Inter (UI), JetBrains Mono (Data).
- **Assets:** Zero external raster images; only code-drawn SVG/Canvas.
- **Icons:** No emojis; use `components/ui/Icons.tsx` or `components/ui/SkillIcons.tsx`.
- **Connectivity:** Must support cross-device play via `NEXT_PUBLIC_PARTYKIT_HOST`.
- **Performance:** No layout shift on font load; maintain 60fps on `CityBackground`.

## Review Focus
- **Font Hydration:** Ensure no layout shift or "flash of unstyled text" when switching from system fonts to the Serif/Inter/Mono triad.
- **Cross-Device Relay:** Verify that a player on Mobile can join a player on Desktop via the Cloudflare host.
- **TowerMode Colors:** Verify that falling words regain their neon borders and glows (fixing the `var(--neon-cyan)55` bug).
- **SpaceMode Frame:** Ensure the "Drone Network" terminology is consistent across all UI labels (no "ship" or "space" mentions).
- **Victory/Defeat flow:** Ensure no mode "stalls" or loops infinitely after the win/loss condition is met.

---

### Task 1: Typography & Global Tokens

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Global CSS variables for the new palette and font-family assignments.

- [x] **Step 1: Implement `next/font/google` in `app/layout.tsx`**
  - Import `Inter` and `Fraunces` (or `Playfair Display`).
  - Apply `Inter` to `body` and create a CSS variable for the Serif font.
- [x] **Step 2: Update `app/globals.css` tokens**
  - Refine `--bg-void` and `--bg-deep` for a professional navy/black depth.
  - Replace "neon soup" logic with a disciplined palette (reserve neons for actionable data).
  - Add `font-family` assignments for the three triads.
- [x] **Step 3: Verify font loading**
  - Inspect element to ensure `Inter` and the Serif font are active.
- [x] **Step 4: Commit**

---

### Task 2: Foundation & Connectivity Fixes

**Files:**
- Modify: `lib/net.ts`
- Modify: `components/ui/NetStatus.tsx`
- Modify: `.gitignore` (already done)

**Interfaces:**
- Consumes: `NEXT_PUBLIC_PARTYKIT_HOST` environment variable.
- Produces: Functional cross-device networking.

- [x] **Step 1: Clean up `NetStatus.tsx`**
  - Remove developer-facing deploy instructions (`npx partykit deploy`).
  - Convert it into a "System Status" panel.
- [x] **Step 2: Fix `lib/net.ts` host resolution**
  - Ensure `resolveHost()` correctly prioritizes `process.env.NEXT_PUBLIC_PARTYKIT_HOST` for production.
- [x] **Step 3: Test connection**
  - Start `next dev`, set a dummy `PARTY_HOST`, and verify local multi-tab connection.
- [x] **Step 4: Commit**

---

### Task 3: The "Drone Network" Reframe (SpaceMode)

**Files:**
- Modify: `components/modes/SpaceMode.tsx`
- Modify: `config/space.ts`

**Interfaces:**
- Modifies: All labels and HUD text in the Space mode.

- [x] **Step 1: Update `config/space.ts` terminology**
  - Rename `SHIPS` $\rightarrow$ `DRONES`.
  - Change `hull` $\rightarrow$ `chassis`.
  - Update descriptions to reflect "Drone Network Defense" instead of "Space War."
- [x] **Step 2: Update `SpaceMode.tsx` HUD**
  - Replace "Ship" / "Space" labels with "Drone" / "Network".
- [x] **Step 3: Remove dead code**
  - Delete the `ricochetUntil` render branch and logic.
- [x] **Step 4: Standardize UI components**
  - Replace raw `<button>` at the bottom with shared `<Btn tone="ghost">`.
  - Use the shared `Panel` component for the Boss bar and Skill bar.
- [x] **Step 5: Commit**

---

### Task 4: Mode Polish & Bug Squashing (Breach, Clash, Tower)

**Files:**
- Modify: `components/modes/BreachMode.tsx`
- Modify: `components/modes/ClashMode.tsx`
- Modify: `components/modes/TowerMode.tsx`

**Interfaces:**
- Produces: Bug-free game logic and visually consistent modes.

- [x] **Step 1: Fix TowerMode color bug**
  - Replace `` `${w.color}55` `` with a proper opacity handler (e.g., `rgba` values or a CSS variable with alpha).
- [x] **Step 2: Fix BreachMode gate logic**
  - Update the "GEÇİŞ" chip to change color based on the `gateOpen` state (Green when open, Rose/Amber when closed).
- [x] **Step 3: Align BreachMode Meter with config**
  - Update `over = load > 5` to match the "3 units" rule from `config/game.ts`.
- [x] **Step 4: Polish ClashMode visuals**
  - Replace the "two gradients" arena with a more structured "Intel Duel" layout (using `grid-bg` and panels).
  - Replace raw micro-buttons with the shared `Btn` component.
- [x] **Step 5: Commit**

---

### Task 5: The "End Game" (Victory & Defeat Screens)

**Files:**
- Modify: `components/modes/BreachMode.tsx`
- Modify: `components/modes/ClashMode.tsx`
- Modify: `components/modes/TowerMode.tsx`
- Modify: `components/modes/SpaceMode.tsx`
- Create: `components/ui/TerminalScreen.tsx` (Reusable end-game component)

**Interfaces:**
- Consumes: Game state (score, time, winner).
- Produces: Cohesive end-of-match experience.

- [x] **Step 1: Create `TerminalScreen.tsx`**
  - Design a professional "Case Closed" / "Connection Terminated" panel.
  - Include slots for: Result Title, Stats Table, and "Return to Hub" button.
- [x] **Step 2: Implement in BreachMode**
  - Replace inline "Operasyon tamamlandı" with `TerminalScreen`.
- [x] **Step 3: Implement in SpaceMode**
  - Add a victory screen for the Boss kill.
- [x] **Step 4: Implement in TowerMode**
  - Add a "Keep Fallen" defeat screen with a scoreboard.
- [x] **Step 5: Commit**

---

### Task 6: Final Polish & Asset Audit

**Files:**
- Modify: `components/ui/AttackLayer.tsx`
- Modify: `components/ui/Portraits.tsx`
- Modify: `components/ui/Battlefield.tsx`

**Interfaces:**
- Produces: Zero-emoji, high-fidelity final UI.

- [x] **Step 1: Emoji Purge**
  - Replace `⚠` in `AttackLayer.tsx` and `⚔` in `Battlefield.tsx` with appropriate `Icons.tsx` SVGs.
- [x] **Step 2: Fix Portrait ID collisions**
  - Change the `fade` gradient ID in `Portraits.tsx` to be unique per portrait.
- [x] **Step 3: SVG Tokenization**
  - Replace hardcoded hex values in `Battlefield.tsx` and `Portraits.tsx` with `var(--neon-*)` tokens.
- [x] **Step 4: Commit**
