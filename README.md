# Sip & Create — 3D café model

Interactive 3D model of a two-floor café and creative workshop (12 × 7 m per floor), with a drive-thru lane and a parking lot. Built with three.js r147.

## Run it
Open `index.html` in Chrome, Edge, Safari or Firefox.
- The 3D library is included in `js/vendor/`, so the model works offline.
- Fonts load from Google Fonts; without internet the page falls back to system fonts.
- If your browser blocks local files, run a small server in this folder, e.g. `python3 -m http.server` and open http://localhost:8000

## Files
| Path | What it is |
|---|---|
| `index.html` | Page markup: top bar, side panel, info card, walk controls |
| `css/style.css` | All UI styling and colour tokens |
| `js/app.js` | The whole scene: textures, walls, furniture, both floors, outside, cars, zones, camera modes |
| `js/vendor/` | three.js, OrbitControls, RoomEnvironment (MIT licence) |
| `assets/cars/` | Your car photos shown in the info cards |

## Where to edit in `js/app.js`
- `P = {...}` — colour palette
- `makeTextures()` — floor tiles, menus, signs
- `build()` — ground floor, upper floor, roof and skylight
- `buildOutside()` — drive-thru, parking lot, car positions and colours
- `CARS = {...}` / `car()` — car body shapes and details
- `ZONES` — area names, sizes, descriptions and camera views
