# Modern Detective Overhaul Design Spec

**Date:** 2026-10-18
**Project:** Neon Breach
**Identity:** Professional Digital Investigator / OSINT Console

## 1. Conceptual Reframe: "The Investigator's Desk"

The app is no longer a "Neon Game" but a professional investigation tool. The atmosphere is "High-Stakes Intelligence."

### Mode Reframing
- **THE BREACH $\rightarrow$ SYSTEM INFILTRATION:** Remains asymmetric co-op. Now framed as a coordinated breach of a secure government server.
- **CEREBRAL CLASH $\rightarrow$ INTEL DUEL:** Competitive quiz. Framed as a battle of wits between two intelligence analysts.
- **TOWER TYPING $\rightarrow$ SIGNAL INTERCEPT:** Typing hybrid. Now framed as intercepting and decoding fragmented data packets to build a digital map.
- **VOID LANCE $\rightarrow$ DRONE NETWORK DEFENSE:** The "Space" mode is reframed. Instead of ships in space, you control a swarm of tactical drones defending a central data hub from a systemic virus. Mechanics (skills, boss, hull types) remain, but the visual labels change to "Drone Class," "Frequency," and "Hub Integrity."

---

## 2. Visual Identity & Tokens

### Typography (The Triad)
- **Headings (Editorial Serif):** *Fraunces* or *Playfair Display*. Used for "Case Files," "Operation Names," and "Victory/Defeat" screens. Creates a "dossier" feel.
- **Interface (Modern Sans):** *Inter*. Used for all buttons, labels, and general UI. Professional, clean, high legibility.
- **Data (Strict Mono):** *JetBrains Mono*. Used for IDs, coordinates, logs, and `stat` values.

### Color Palette (Disciplined Neon)
We move from "Neon Soup" to "Focused Intelligence."
- **Background:** `#04060c` (Void Black) $\rightarrow$ `#080d18` (Deep Navy).
- **Structural Neutrals:** Slate/Zinc ramp for panels and borders. No more raw white lines.
- **Neon Accents (Actionable Only):**
    - `Cyan`: Active connection / Positive flow.
    - `Rose`: Critical alert / Enemy attack.
    - `Amber`: Warning / Pending state.
    - `Green`: Success / Validated data.
    - `Violet`: High-level encryption / Special ability.
- **Depth:** subtle noise texture on backgrounds, high-fidelity glassmorphism (`backdrop-blur(20px)`), and a refined vignette.

---

## 3. Game Loop & UX Improvements

### Terminal States (Win/Loss)
Every mode must have a dedicated end-screen:
- **Victory:** "OPERATION SUCCESSFUL" $\rightarrow$ detailed stats (time, accuracy, rank) $\rightarrow$ return to Hub.
- **Defeat:** "CONNECTION TERMINATED" $\rightarrow$ reason for failure $\rightarrow$ retry/return to Hub.

### Professional Polish
- **Iconography:** Remove all emojis (`⚠`, `⚔`, `✓`). Use exclusively the `Icons.tsx` SVG set.
- **UI Cleaning:** `NetStatus` is converted from a "dev panel" to a "system status" panel. Deploy instructions are moved to a hidden "About" or "Help" section.
- **Transitions:** Implement smooth screen-to-screen fades and "boot-up" sequences for each mode.

---

## 4. Technical Foundation

### Infrastructure Fixes
- **Font Implementation:** Use `next/font/google` to properly load Inter and the Serif font.
- **Connectivity:** Ensure `NEXT_PUBLIC_PARTYKIT_HOST` is a first-class citizen in the config, allowing Vercel $\rightarrow$ Cloudflare communication.
- **Bug Fixes:** 
    - Fix `TowerMode` color concatenation: `var(--neon-cyan)55` $\rightarrow$ use RGBA tokens or opacity modifiers.
    - Fix `BreachMode` gate color logic.
    - Fix `SpaceMode` dead code and redundant render branches.
    - Fix `Portraits.tsx` gradient ID collision.

## 5. Success Criteria
- [ ] App feels like a professional tool, not a toy.
- [ ] No system-default fonts visible.
- [ ] Cross-device play works via Cloudflare relay.
- [ ] Every mode has a clear beginning and end.
- [ ] Zero emojis in the final UI.
