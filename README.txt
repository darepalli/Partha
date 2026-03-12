# Path of the Inner Warrior — PWA Prototype

A Bhagavad‑Gītā–inspired single‑page game that runs **offline** as a **Progressive Web App** and can be installed on **Android** and **iOS** via the browser.

Current primary mode: **Dharma Survival (Chapter Journey)** where each chapter presents a thematic decision and escalating challenge.

## Quick Start (Local)

1. Serve the folder over HTTP (service workers require it). Examples:
   - Python 3: `python -m http.server 8080`
   - Node: `npx serve`
2. Visit `http://localhost:8080` on desktop or phone (same network).
3. You should see the game. Open DevTools > Application to confirm PWA installability.

## Install on Devices

- **Android (Chrome):** Open URL → menu ⋮ → *Install app* / *Add to Home screen*.
- **iOS (Safari):** Open URL → Share → *Add to Home Screen*. Ensure you visited over HTTPS and have the manifest + service worker active.

## Deploy to the Web

- Upload the contents to any static host (GitHub Pages, Azure Static Web Apps, Netlify, etc.). Ensure HTTPS.

## Wrap for App Stores (Optional)

- Use a wrapper like Capacitor or TWA (Android) to package the PWA. The web code here remains the same.

## Gameplay Notes

- 18 chapters; each round has a dilemma, action challenge, and meditation mini‑game.
- Additional mode: **Dharma Survival**
   - Move with `WASD` or arrow keys.
   - Eat nearby food with `E` to sustain hunger.
   - Drink nearby water with `R` to prevent dehydration.
   - Craft with `C` using gathered resources (grain, herb, meat).
   - Trade with merchants using `T` for nonviolent resource conversion.
   - Offer at shrines using `B` to gain dharma/health blessings.
   - Time scale: `1 second = 1 hour`.
   - Death rules: no food for `7 days` or no water for `3 days` causes death.
   - Avoid overeating; high fullness harms health and dharma.
   - Strike with `K`; unjust killing reduces dharma sharply.
   - Object labels and hint text are shown on screen for food, water, merchants, shrines, and nearby risks.
   - The world now contains `18 warriors` of each major trait archetype competing for food and water.
   - Non-human beings are now simulated: trees, animals, divine forces, and immobile forms.
   - Rebirth system: dead warriors reincarnate by karma into higher/lower states (`divine`, `human`, `animal`, `plant`, `immobile`).
   - Karma Ledger panel explains why karma changed and shows promotion/demotion trajectories before rebirth.
   - Warrior actions can now affect other warriors and other beings (healing, harming, nurturing, hunting, blessing).
   - Enemies now belong to factions (raider, beast, pilgrim) with different behaviors and dharma implications.
   - Defend only when enemies are hostile or a true threat.
   - Progress through 18 chapters; each chapter begins with a meaningful choice that changes the next segment's conditions.
   - Complexity scales by chapter (scarcity, enemy pressure, and moral risk).
- New systems:
   - **Focus meter** affects challenge pressure and can be depleted by restless choices.
   - **Karma Streak** rewards consistent selfless/skilled play with stronger gains.
   - **Journey Log** records recent important events.
   - **Boss variants** now have chapter-specific behavior (Anger, Restlessness, Attachment, Despair).
   - **Guidance blessings** now include tradeoffs, not just pure buffs.
   - **Dynamic endings** now reflect how you achieved victory.
   - **Branching consequences** track recurring decision patterns (virtues and burdens) and influence later action, boss, and meditation difficulty.
   - **Enhanced audio** adds adaptive ambient drone and subtle variation in sound playback for a more alive soundscape.
   - **Chapter eras** now shift visual palette and ambient tuning in three arcs: dawn (1-6), zenith (7-12), twilight (13-18).
   - **Refreshed art direction** introduces richer gradients and higher color contrast in core SVG visuals and UI surfaces.
   - Action shortcuts: `A` Selfless, `S` Skilled, `D` Reward.
- Win by achieving ≥60 in **Clarity**, **Purity**, **Devotion** and completing Final Surrender.
- Stats persist via `localStorage`.

---
This is a teaching prototype; expand content, art, and balancing as needed.
