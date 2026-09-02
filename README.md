# Carrom Clash

Mobile-first standalone HTML5/Canvas carrom game.

## Run
Open `index.html` directly or deploy the **contents of this folder** to GitHub Pages/Vercel. No Node, npm, Python or build step is required.

## Controls
Touch/mouse: press the striker, drag away to aim/power, release to shoot.

## Modes
- VS Computer
- 2 Player Duel
- 4 Player Clash

## QA fixes
- Fixed shot lifecycle and animation loop.
- Fixed striker/coin pocket handling and foul detection.
- Fixed turn progression after pieces stop.
- Fixed timer interaction during an active shot.
- Fixed pointer cancel handling for mobile.
- Fixed stale animation state between matches.
- Fixed end-game detection.
- Added safe initialization when opening the page directly.
- No external assets or dependencies.

## GitHub Pages
Important: `index.html`, `css/`, and `js/` must be at the deployed site root. The ZIP itself should not be uploaded as the website root.
