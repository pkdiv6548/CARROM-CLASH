# CARROM CLASH

Premium standalone HTML5 Carrom browser game.

## Features
- VS Computer, 2 Player, 4 Player modes
- Canvas physics, collisions, pockets, striker aiming
- Queen, scoring, timer, fouls, rematch
- Responsive mobile/tablet/desktop UI
- LocalStorage career stats
- No Node.js, npm, Python, backend or build step
- Works from `index.html` and is Vercel/GitHub Pages ready

## Run
Open `index.html` directly or use VS Code Live Server.

## Known limitations / deliberate scope
This is an offline arcade-style carrom implementation. It does not claim tournament-grade simulation, online networking, accounts, payments, or server-side matchmaking.

## QA checklist
- No external asset dependency
- No inline CSS
- Pointer/touch input supported
- Responsive breakpoint at 600px and 900px
- Game state reset and home navigation implemented
- LocalStorage failures are naturally non-fatal because the game can continue in memory
