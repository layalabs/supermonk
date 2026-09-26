# The illustrated map (`/matches`, "Map" view)

`components/IllustratedMap.tsx` draws Chiang Mai as a hand-drawn campus-style map: an inline SVG
scene (parchment, Doi Suthep, the Ping River, the old-city moat, roads, the airport) with HTML
overlays for the temple symbols, name badges, area badges and the popover. The tile map
(`components/TempleMap.tsx`, MapLibre + OpenFreeMap) stays behind the "Streets" option.

Everything geographic goes through `lib/map/projection.ts`, so every temple lands where it really
is and the painted background described below can be aligned exactly.

## Projection and bounds

Equirectangular, north up, with a cosine-corrected x scale (1° of longitude is drawn
`cos(18.78°) ≈ 0.947` times as wide as 1° of latitude).

| Constant | Value |
|---|---|
| Scene viewBox | `0 0 1600 1000` (`VIEW`) |
| Latitude range | 18.72 → 18.84 (bottom → top) |
| Longitude centre | 98.97 at x = 800 |
| `PX_PER_DEG` | 8333.33 viewBox units per degree of latitude |
| `PX_PER_KM` | 74.94 viewBox units per km |
| `MAP_BOUNDS` (exact) | `latMin 18.72, latMax 18.84, lngMin 98.86860, lngMax 99.07140` |

`project(lat, lng)` returns viewBox coordinates. Reference points (unit-tested in
`tests/illustrated-map.test.ts`):

| Place | lat / lng | x, y |
|---|---|---|
| Wat Chedi Luang (old-city square) | 18.7870 / 98.9866 | 930.97, 441.67 |
| Wat Ket Karam (east bank) | 18.7920 / 99.0033 | 1062.72, 400.00 |

The pixel distance between the two (138.2 units) equals the haversine distance (1.84 km) to
within 1 %.

The component never shows the full 1600 × 1000 scene. `fitViewBox(w, h)` picks the largest
scale at which `CORE_VIEWBOX` (`370 190 770 500`: Doi Suthep to the east bank, Wat Jed Yod to the
airport) still fits the container, then widens the viewBox to the container's aspect ratio so
the scene never letterboxes. Below 640 px the map becomes a 680 px scene in a horizontal
scroller cropped to `COMPACT_VIEWBOX` (`330 150 940 720`), starting centred on the old city.

## Symbols

`components/illustrated/templeSymbols.tsx` holds one bespoke symbol per temple id in
`data/temples.json` (a test checks the ids match exactly). Each is 3-8 SVG shapes in a 64 × 64
box with the ground at y = 58, one line weight (`#4a3222`, 1.5) and one palette. Overlapping
symbols (the four Tha Phae temples sit within 100 m) are pushed apart by `layoutSymbols` and
tethered to a saffron dot at the true position; name badges are placed by `layoutLabels` in
screen pixels (right, left, below, above, then the diagonals on three rings), matched temples
first.

## Painted background hook

The vector scene is the fallback. If a painting exists the map uses it as the base layer and
draws only the water, roads, moat and symbols on top at reduced opacity:

| File | Purpose |
|---|---|
| `public/map/chiangmai-painted.jpg` | The painting. When present it is rendered as `<image>` under the vector features and the vector terrain is skipped. |
| `public/map/chiangmai-painted.json` | Optional calibration: `{ "lngMin", "lngMax", "latMin", "latMax" }`. When absent the painting is assumed to cover `MAP_BOUNDS` exactly. Invalid JSON or non-numeric fields fall back to `MAP_BOUNDS` with a console warning. |

Detection happens once per request on the server (`lib/mapPainting.ts`, called from
`app/matches/layout.tsx`) and is passed down through `MapPaintingContext`, so the client never
probes for a file that is usually absent. Drop the files in, restart `next start`, and the map
switches over; no code change.

### Requirements for the painting

- **Bounds**: exactly `lngMin 98.86860, lngMax 99.07140, latMin 18.72, latMax 18.84`
  (or supply the calibration JSON with the bounds actually used). The centre of the old-city
  square (18.7887, 98.9858) must land at 57.8 % of the width and 42.8 % of the height.
- **Aspect ratio**: 16:10 (1600 × 1000 or any multiple; 3200 × 2000 recommended). Equirectangular
  with the cosine correction above: the moat is a square 1.6 km on a side and must appear as a
  square, not a rectangle.
- **View**: top-down, slightly oblique (buildings and hills may show a little side, but the ground
  plane is not foreshortened), north up.
- **Content**: the Ping River from the top edge to the bottom edge, passing just east of the old
  city; the square moat with its four corner bastions; Doi Suthep and Doi Pui rising in the west
  third; rice fields on the plain to the east and south; the airport runway south-west of the
  old city; Nimman, Santitham, Chang Khlan and Wat Ket as denser built-up textures.
- **Style**: hand-painted, warm cream/parchment ground, soft rice greens, mist-blue water,
  saffron and orange accents, teak-brown outlines. Match `app/globals.css` tokens: cream
  `#fbf6ec`, saffron `#f0a030`, orange `#e8792b`, rice `#8fb27a`, mist `#bfd6e4`, ink `#2b1d12`.
- **No labels, no text, no temple symbols, no pins** — the component draws all of those.
- Keep it under ~600 kB as a progressive JPEG; it is fetched on every visit to the Map view.

A suggested prompt: "Hand-painted illustrated map of central Chiang Mai, Thailand, top-down and
slightly oblique, north up, warm cream parchment ground, the Ping River flowing north to south as
a soft blue ribbon just east of the square moated old city, Doi Suthep mountain in green layered
hills on the west, rice fields to the east and south, a small airport runway in the south-west,
gouache texture, soft edges, no text, no labels, no icons, 16:10."

## Interaction

- Matched temples: saffron ground halo (breathing; static under `prefers-reduced-motion`),
  1.12× symbol, popover on click with the monk rows and Invite links (`components/TemplePopover.tsx`,
  shared with the Streets map). Escape closes the popover and returns focus to the symbol.
- Other temples: muted, name tooltip on hover/focus, `aria-label` with the Thai name.
- Symbols are `<button>`s with the shared ember focus ring.
- `selected` / `onSelect` make the selection controlled; `app/matches/page.tsx` uses that to keep
  the temple list and the map in step (card click → popover; symbol click → the list scrolls to
  `#temple-<id>`).
- `fill` makes the map fill its parent's height (the sticky desktop column) instead of a 5:3 box.
