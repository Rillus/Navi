# Product Requirements Document

**Navi — coastal sailing navigation for a Hallberg-Rassy 342**

| Field | Value |
| --- | --- |
| Product | Navi |
| Version | 1.1 |
| Status | Draft |
| Date | 6 September 2026 |
| Audience | Skippers of a Hallberg-Rassy 342 cruising the south and south-east of England |
| Data policy | Open data and open-source providers only |
| Classification | Aid to navigation. Not a substitute for official charts, the COLREGS, or a competent skipper. |

---

## 1. Executive summary

Navi is a chartplotter-style application for a Hallberg-Rassy 342 (HR 342) sailing the English south coast, Solent, Dover Strait approaches and Thames Estuary. It shows **charts, wind, depth and IALA Region A navigation marks**, with **day and night identification** of those marks, **safe-sailing checks** against this yacht’s draught and air draught, and **route plotting**.

Every map, weather, bathymetry, tide, wreck, routeing and mark dataset must come from an **open-licence provider**. Official UKHO Admiralty ENC/raster charts, Navionics, C-MAP and paid weather services are out of scope.

Navi is a **Progressive Web App**: install it on a tablet or phone, download charts and course data over harbour Wi-Fi, then use it offshore with no signal. It deploys to **Vercel** as a static front end. There is **no required server database** in v1; routes, yacht settings and downloaded packs live in the browser (**IndexedDB**, **Cache Storage**, and a little **localStorage**).

The product is an **aid to passage planning and cockpit awareness**. It must never present itself as an Electronic Chart Display and Information System (ECDIS) or as a replacement for up-to-date official charts, a tidal almanac, or a lookout.

---

## 2. Problem and opportunity

A typical HR 342 skipper on this coast currently splits attention across:

- a plotter or phone chart with a commercial licence
- a separate GRIB or weather app for wind
- a paper almanac or harbour guide for lights, buoys and tidal gates
- mental arithmetic for under-keel clearance on a 1.82 m keel and for bridges under a ~16 m mast

South and south-east England is densely buoyed (IALA Region A), tidally aggressive (Solent, Needles, Thames bars), and mixed with commercial traffic, wind farms and Traffic Separation Schemes. Night entries into Chichester, the Solent or Ramsgate depend on reading **shape, colour and topmark by day** and **light colour, character and period by night**.

Open datasets already exist for most of this (OpenStreetMap / OpenSeaMap seamarks, EMODnet and GEBCO depth, Open-Meteo / national weather models, UKHO wrecks and ships’ routeing under the Open Government Licence, Environment Agency and Channel Coastal Observatory tides). They are not assembled into one yacht-specific cockpit tool.

---

## 3. Goals and non-goals

### 3.1 Goals

1. Show a nautical chart of the defined cruising box with land, sea, depth and IALA marks.
2. Overlay **wind speed and direction** at the vessel and along a planned route.
3. Show **charted depth**, **tide-adjusted water**, and **under-keel clearance** for this HR 342.
4. Let the skipper tap any mark and see **day shape / colour / topmark** and **night light characteristics**, plus fog and AIS-AtoN notes where the data exist.
5. Warn when a plotted route is unsafe for this yacht (shoal, bridge, TSS, wreck, restricted area, wind/sea limits).
6. Support creating, editing, reversing and following routes with bearing, distance and ETA.
7. Use **only open data and open-source software** for maps, wind, depth, tides, marks and hazards.
8. Work **offline** for charts, marks and last-fetched weather once the area has been cached.
9. Ship as an installable **PWA** that can be deployed to **Vercel** without a hosted database.

### 3.2 Non-goals (v1)

- Replacing official Admiralty charts or serving as ECDIS / type-approved navigation.
- Worldwide coverage, or west of Portland / north of the Thames Estuary in v1.
- Autopilot, NMEA instrument integration, engine telemetry or Signal K (phase 2).
- Live AIS of other vessels (phase 2; AIS is radio, but redistribution licences are messy).
- Racing tactics, polar optimisation contests, or IRC rating tools.
- Crowdsourced harbour reviews, booking marinas, or social features.
- Paid chart subscriptions, even as an optional overlay.
- A mandatory cloud account, hosted database, or multi-device sync in v1 (see §9.5).
- Native App Store / Play Store wrappers in v1 (PWA install is enough).

---

## 4. Users

| Persona | Need |
| --- | --- |
| Skipper / navigator | Plan a coastal hop (for example Poole → Cowes, or Brighton → Ramsgate) and follow it from the cockpit. |
| Night watch | Identify the next lit mark by colour, rhythm and period without opening a paper almanac. |
| Day skipper in the Solent | Stay off the banks, leave marks on the correct hand, and keep clear of the deep-water channel. |
| Thames / Medway visitor | Know whether the 15.92 m air draught (plus Windex and aerials) will clear a bridge at the planned tide. |

Single-yacht product: one vessel profile, one crew. Multi-boat fleets are out of scope.

---

## 5. Vessel profile — Hallberg-Rassy 342

Navi ships a **built-in HR 342 profile**. The skipper may override numbers (for example a shallow-draught keel or extra aerials) but the defaults must match the yard data sheet.

| Parameter | Default | Source / note |
| --- | --- | --- |
| Designer | Germán Frers | Yard |
| Built | 2005–2018, 329 hulls | Yard |
| CE category | A (ocean) | Yard |
| Hull length | 10.32 m | Yard |
| Waterline (at rest) | 9.09 m | Yard |
| Beam | 3.42 m | Yard |
| Draught, standard, light ship | **1.82 m** | Yard; user may select shallow keel **1.57 m** (25 cm less) |
| Displacement, light ship | 5.3 t | Yard; loaded draught will be deeper — user can set “sailing draught” |
| Lead keel | 1.95 t | Informational |
| Air draught, mast over water, excluding Windex | **15.92 m** | Yard |
| Planning air draught | **17.5 m** | 15.92 m + ~0.4 m Windex + aerials + **1.0 m safety margin**; user-editable |
| Sail area (genoajib) | 59.5 m² | Yard |
| Engine | Volvo Penta D1-30, 21 kW / 29 hp | Motoring ETAs |
| Diesel | 165 L | Range estimate only, not a fuel computer |
| Fresh water | 265 L | Informational |
| Hull speed (rule of thumb) | ~7.3 kn | \(1.34 \times \sqrt{LWL_{ft}}\) |
| Typical motoring speed | 6.0 kn | User-editable |
| Typical sailing speed (passage) | 5.5 kn | Used when no polar is applied |

### 5.1 Safe-sailing defaults for this yacht

| Check | Default policy | User may change |
| --- | --- | --- |
| Under-keel clearance (UKC), fair weather | 0.5 m | Yes |
| UKC, moderate sea / harbour bar | 1.0 m | Yes |
| UKC, swell or unknown survey quality | 1.5 m or 20 % of draught, whichever is greater | Yes |
| Minimum charted depth for a route cell | `sailing_draught + UKC − predicted_tide_above_chart_datum` | Derived |
| Air draught vs bridge | Planning air draught + 0.5 m extra if tide is rising and datum is uncertain | Yes |
| Wind limit (advisory) | Sustained 25 kn / F6; gusts 32 kn | Yes |
| Significant wave height (advisory) | 2.0 m | Yes |
| Night / restricted visibility | Extra UKC +0.3 m; prefer lit marks as waypoints | Toggle |

These are **advisory**. The app must state that survey age, heave, squat, and uncharted silt can invalidate them.

---

## 6. Geographic coverage

### 6.1 v1 cruising box (south / south-east England)

Inclusive bounding box, WGS84:

| Limit | Value | Rationale |
| --- | --- | --- |
| West | **2.60° W** | Portland Bill, Weymouth and approaches |
| East | **1.50° E** | North Foreland, Ramsgate, outer Thames approaches |
| South | **50.00° N** | English Channel south of the Isle of Wight (Needles, Nab, mid-Channel buffer) |
| North | **51.90° N** | Thames Estuary, Medway, Southend, approaches to London |

**In-scope cruising grounds**

- Portland, Weymouth, Lulworth (day marks), Poole Harbour approaches
- Solent (Needles Channel, North Channel, Hurst, Cowes, Southampton Water, Portsmouth, Eastern Solent, Nab)
- Langstone and Chichester harbours (bars)
- Sussex: Littlehampton, Shoreham, Brighton, Newhaven, Eastbourne, Rye
- Kent: Folkestone, Dover, Deal, Ramsgate, Sandwich
- Thames Estuary and Medway as far as air draught allows
- Cross-Channel **planning buffer** inside the box (for example towards Cherbourg / Calais) so a Channel hop can be drafted, even if French harbour detail is thinner

**Out of scope for v1:** west of Portland (Lyme Bay, West Country), East Anglia north of the box, inland non-tidal canals, and the French coast as a primary product.

### 6.2 Chart datums

- Positions: WGS84.
- Depths: metres, **Chart Datum / LAT** where the source provides it; otherwise labelled as the source datum (EMODnet/GEBCO are typically mean sea level-related and **must be labelled as such**).
- Heights of bridges and lights: metres above the source’s vertical datum; never mix LAT and OD Newlyn without conversion.
- Tides: show both **local chart datum** (when known) and **OD Newlyn (mAOD)** from Environment Agency gauges.

---

## 7. Safety, legal and product principles

1. **Aid to navigation, not official charts.** Persistent banner: *Not for navigation. Use official up-to-date charts and a proper lookout.*
2. **Open data only.** If a dataset is not openly licensed, it is not used. No “just this one paid layer”.
3. **Show data age and source** on every layer (for example “OpenSeaMap seamarks, extracted 2026-09-01”).
4. **Fail safe.** Missing depth, stale wind, or unknown bridge height is a **block or prominent warning**, not a silent green route.
5. **IALA Region A** is the only buoyage system in this product.
6. **Skipper remains responsible** for COLREGS, TSS crossing at right angles, and harbour byelaws.
7. **Cockpit first.** High contrast, large tap targets, readable in sunlight and in a dark night mode that preserves night vision (red/dim, no full-white flash).
8. **British English** in the UI (draught, harbour, metre, colour).
9. **Metric primary**, with a knots / nautical miles overlay for speed and distance (standard for UK yachts).

---

## 8. Functional requirements

Requirements are numbered for tracing. Priority: **P0** must ship in MVP, **P1** soon after, **P2** later.

### 8.1 Charts and map display

| ID | Priority | Requirement |
| --- | --- | --- |
| MAP-01 | P0 | Display a slippy map of the v1 box with land, coastline, names, roads at harbour scale, and sea area. |
| MAP-02 | P0 | Nautical overlay: depth contours / shaded bathymetry, drying heights where available, and seamarks. |
| MAP-03 | P0 | Own-ship position from the device GNSS, with heading/COG and SOG when available. |
| MAP-04 | P0 | North-up and course-up. Scale bar in nautical miles and metres. |
| MAP-05 | P0 | Day chart palette and night palette (dim, limited blue/red). |
| MAP-06 | P0 | Layer toggles: base map, bathymetry, marks, wind, wrecks, TSS, wind farms, MPAs, tides. |
| MAP-07 | P1 | Satellite / true-colour overlay from **Copernicus Sentinel-2** (open), not Bing/ESRI, for harbour orientation. |
| MAP-08 | P0 | Offline pack for the v1 box: vector tiles + seamarks + bathymetry; downloadable over Wi-Fi before sailing. |
| MAP-09 | P0 | Attribution panel listing every active layer’s licence (ODbL, OGL, CC BY, etc.). |

**Acceptance (MAP):** Skipper can zoom from Portland to Ramsgate, then into Cowes harbour, and see land + depth shading + buoys without a network connection after one download.

### 8.2 Wind speed and direction

| ID | Priority | Requirement |
| --- | --- | --- |
| WND-01 | P0 | Show wind **speed (kn)** and **direction (from)** at own-ship and at a tapped point. |
| WND-02 | P0 | Show Beaufort equivalent and gusts when the model provides them. |
| WND-03 | P0 | Time slider: now → at least **48 h**, preferably **7 days**. |
| WND-04 | P0 | Map overlay: barbs or particles, sampled so the Solent is readable, not a single Channel-wide arrow. |
| WND-05 | P0 | Route wind: for each leg, forecast wind at ETA (using the planned speed). |
| WND-06 | P1 | Compare two open models (for example UK Met Office via Open-Meteo, and ECMWF IFS or Météo-France AROME for the Channel). |
| WND-07 | P0 | Stale-data warning if the forecast is older than 6 hours. |
| WND-08 | P1 | Wave height, period and direction from an open marine model on the same time slider. |

**Acceptance (WND):** On a Poole → Yarmouth (IoW) route, the skipper sees wind at departure and at Needles ETA, in knots, with source and issue time.

### 8.3 Depth, tide and under-keel clearance

| ID | Priority | Requirement |
| --- | --- | --- |
| DPT-01 | P0 | Colour-band bathymetry and contours. Bands must include **shallower than this yacht’s keel + UKC**. |
| DPT-02 | P0 | Tap-to-inspect: source depth, datum, and “unsafe / marginal / OK” against the HR 342 profile. |
| DPT-03 | P0 | **Tide-aware depth**: predicted or observed water level applied where the source is chart datum. If the bathymetry is MSL-based, do **not** pretend it is LAT; show a datum warning. |
| DPT-04 | P0 | Nearest tide station: height, rising/falling, next HW/LW. |
| DPT-05 | P0 | Observed tide from Environment Agency gauges (15-minute), shown distinctly from predictions. |
| DPT-06 | P1 | Harbour-bar helper: Chichester, Langstone, Rye, and similar — time window when `depth + tide − draught − UKC > 0`. |
| DPT-07 | P0 | Route checker flags any segment where modelled UKC is below the selected policy. |
| DPT-08 | P1 | Crowd depth overlay from OpenSeaMap depth project, visually secondary to EMODnet/GEBCO. |

**Acceptance (DPT):** Plotting a track across Ryde Sands at LW springs must produce a hard warning for a 1.82 m keel. The same track at a user-set HW may clear if the tide model supports it — and must say which tide source was used.

### 8.4 Navigation marks (day and night identification)

This is a headline feature. “Markers” means **aids to navigation (AtoN)**: buoys, beacons, light structures, lighthouses, leading lights, and major daymarks.

#### 8.4.1 What must appear on the chart

| ID | Priority | Requirement |
| --- | --- | --- |
| MRK-01 | P0 | Render IALA Region A marks from OpenSeaMap / OSM `seamark:*` tags in the v1 box. |
| MRK-02 | P0 | Types: lateral (port/starboard, preferred channel), cardinal (N/E/S/W), isolated danger, safe water, special, emergency wreck, lighthouses, beacons, leading/sector lights. |
| MRK-03 | P0 | Chart symbols must be distinguishable at harbour zoom; clustering only at very small scale, with a count badge. |
| MRK-04 | P1 | Optional “light sectors” overlay for major lights (Needles, Nab, Dover, etc.) when sector data exist in OSM. |
| MRK-05 | P1 | Leading-line transits as a line, not only two points. |

#### 8.4.2 Mark detail sheet (identify in daylight)

Tapping a mark opens a **day card** and a **night card**. The day card must show:

| Field | Example |
| --- | --- |
| Name / number | North Sturbridge, or “No. 2” |
| Category | Starboard lateral, IALA A |
| Body colour and pattern | Green; or red/white vertical (safe water) |
| Shape | Conical / can / spherical / pillar / spar / barrel |
| Topmark | Single cone point up (starboard); two cones point up (north cardinal); etc. |
| Purpose / leave-to | “Leave to starboard when entering with the buoyage direction” |
| Position | Lat/long, and range/bearing from own ship |
| Structure | Buoy / beacon / light on pile / lighthouse |
| Fog signal | Bell, horn, etc., if tagged |
| Data completeness | “Topmark missing in OSM — treat with caution” |

#### 8.4.3 Mark detail sheet (identify at night)

The night card must show:

| Field | Example |
| --- | --- |
| Light colour | Red / green / white / yellow / mixed sectors |
| Character | Fl, Q, VQ, UQ, Oc, Iso, LFl, Mo(A), Al, F, etc. |
| Period | e.g. 5 s |
| Group | e.g. Fl(2), Q(9) |
| Nominal range | NM, if tagged |
| Height of light | metres, if tagged |
| Sectors | Bearings and colours, drawn on the map |
| Sequence helper | Animated flash pattern at true period (or a slowed “learn” speed) so the watch can match what they see |
| Unlit | Explicit “no light in dataset” — do not invent a light |
| RACON / AIS AtoN | Morse / MMSI if tagged |

| ID | Priority | Requirement |
| --- | --- | --- |
| MRK-10 | P0 | Day card with colour, shape, topmark, name, leave-to hint for IALA A. |
| MRK-11 | P0 | Night card with colour, character, period, group; animated flash. |
| MRK-12 | P0 | Night mode of the whole app: dim chart, lights drawn in their colour, unlit marks de-emphasised. |
| MRK-13 | P0 | Search marks by name (“Needles”, “Nab Tower”, “Chichester Bar Beacon”). |
| MRK-14 | P0 | “Next mark on route” panel: name, type, light string (e.g. **Fl.G.5s**), range and bearing. |
| MRK-15 | P1 | Printable / shareable one-page “lights along this route” list for the night watch. |
| MRK-16 | P0 | If OSM attributes are incomplete, show **unknown** rather than a guessed IALA default. |

**Acceptance (MRK):** For a named Solent lateral buoy with full OSM tags, the skipper can state body colour, topmark and the light string without leaving the app. For a mark with only `seamark:type`, the UI says data are incomplete. At night, the flash animation matches the tagged period.

### 8.5 Safe sailing

| ID | Priority | Requirement |
| --- | --- | --- |
| SAF-01 | P0 | Apply HR 342 draught, UKC policy and air draught to every route and to own-ship “here”. |
| SAF-02 | P0 | Hazard layers: wrecks and obstructions (UKHO OGL), IMO/MCA ships’ routeing / TSS (UKHO OGL), offshore wind farms and cables where openly licensed. |
| SAF-03 | P0 | TSS: warn if a route **follows** a traffic lane; if it **crosses**, remind to cross as nearly as practicable at right angles (COLREGS Rule 10). |
| SAF-04 | P0 | Bridges and overhead cables from OSM: compare clearance to planning air draught; **unknown clearance = do not auto-approve**. Thames bridges are a known risk for this mast. |
| SAF-05 | P1 | Marine Protected Areas / MCZs (JNCC / Natural England OGL) as an information layer, not a navigation ban unless byelaws are in the open dataset. |
| SAF-06 | P0 | Weather gate: advisory alert if forecast wind or waves along the route exceed the yacht limits. |
| SAF-07 | P1 | Tidal-gate notes for Needles (wind over ebb), Hurst, harbour bars, and Dover Strait set. These may be curated **open-text** notes in-repo, not scraped from copyright pilots. |
| SAF-08 | P0 | Guard zone around own ship: beep/visual if projected track enters a cell below UKC in the next N minutes (N default 10). |
| SAF-09 | P0 | No silent interpolation across no-data holes in bathymetry; treat as unknown. |
| SAF-10 | P2 | Man overboard waypoint (MOB) — one tap, range/bearing, does not alter the stored passage plan. |

**Acceptance (SAF):** A route from Cowes under a low unnamed bridge with no OSM height must be **rejected or warned**, not drawn green. A route that threads the Dover TSS along a lane must warn. A route over a UKHO wreck shallower than `draught + UKC` must warn.

### 8.6 Route plotting

| ID | Priority | Requirement |
| --- | --- | --- |
| RTE-01 | P0 | Create a route by tapping the chart; insert, drag, and delete waypoints. |
| RTE-02 | P0 | Snap waypoint to a mark (optional), with leave-to port/starboard annotation. |
| RTE-03 | P0 | Each leg: rhumb-line course (°T and °M using World Magnetic Model), distance (NM), planned speed, ETD/ETA. |
| RTE-04 | P0 | Whole-route table: total distance, estimated time, fuel-at-motoring-speed (crude, from 165 L tank and a user L/h). |
| RTE-05 | P0 | **Validate** against SAF-* and DPT-* before the route can be marked “ready to sail”. |
| RTE-06 | P0 | Follow mode: next waypoint, XTE, range/bearing, VMG, auto-advance when within a user radius (default 0.1 NM). |
| RTE-07 | P0 | Reverse route; duplicate; archive. |
| RTE-08 | P0 | Import/export **GPX** and **GeoJSON**. |
| RTE-09 | P1 | Constraint-aware auto-route: A* on a marine grid that avoids land, cells below UKC (tide-aware if enabled), and user-selected no-go layers (TSS lanes as no-follow, wrecks, wind-farm exclusion). |
| RTE-10 | P2 | Weather/polar routing using a simple HR 342 polar (derived from the yard speed-prediction table, not a proprietary VPP). |
| RTE-11 | P0 | Great-circle is unnecessary at these ranges; rhumb line is the default. State that in the UI. |
| RTE-12 | P1 | Tidal stream along the route when an open current model is available (Copernicus / Open-Meteo ocean current, with coastal-accuracy warning). |

**Acceptance (RTE):** Skipper plots Needles → Hurst → Cowes by tapping, sees courses/distances, runs validate, and gets a shoal warning if a waypoint is dragged onto the Shingles. Export GPX and re-import round-trips.

### 8.7 Own ship, units and instruments (v1, device-only)

| ID | Priority | Requirement |
| --- | --- | --- |
| NAV-01 | P0 | Lat/long, COG, SOG, magnetic and true heading if the device provides it. |
| NAV-02 | P0 | Units: kn, NM, metres, °T/°M, UTC and Europe/London. |
| NAV-03 | P1 | Logbook: track recorded at a sensible interval, export GPX. |
| NAV-04 | P2 | NMEA 0183 / 2000 / Signal K depth and wind from the yacht’s instruments (true wind vs app forecast). |

### 8.8 Progressive Web App, install, and “download for this course”

| ID | Priority | Requirement |
| --- | --- | --- |
| PWA-01 | P0 | Ship as a **responsive web app** with a Web App Manifest and service worker. Installable on iPad/iOS Safari and Android Chrome (“Add to Home Screen”). |
| PWA-02 | P0 | App shell (UI, yacht profile, last route) loads **offline** after the first visit. |
| PWA-03 | P0 | **Download for this course:** given the active route, prefetch and store map tiles (plus a corridor buffer), seamarks, last wind forecast, and tide snapshot so that follow-mode works with the radio modem off. |
| PWA-04 | P0 | Download UI shows pack size estimate, progress, last successful time, and what will *not* be fresh (wind older than 6 h). |
| PWA-05 | P0 | Skipper can delete a course pack to reclaim storage. |
| PWA-06 | P0 | HTTPS required (satisfied by Vercel). Service worker must not cache the disclaimer away; safety banner remains. |
| PWA-07 | P1 | Optional download of the **whole v1 cruising box** at moderate zoom (harbour zoom still via course pack). |

**Acceptance (PWA):** On harbour Wi-Fi, skipper plots Cowes → Yarmouth, taps **Download for this course**, enables aeroplane mode, reloads the app, and still sees the chart corridor, marks, stored route, and last wind.

---

## 9. Data architecture — open providers only

**Rule:** if it is not openly licensed, it does not ship. Prefer sources that can be **cached for offshore use**.

### 9.1 Provider map

| Need | Primary provider | Licence | Role | Must not use |
| --- | --- | --- | --- | --- |
| Base map (land, names, harbours) | **OpenStreetMap** via **OpenMapTiles** / **Shortbread** rendered with **MapLibre GL** | ODbL | Vector tiles, self-hosted or extract | Google, Apple, Mapbox proprietary styles as a data source |
| Nautical marks, lights, harbour objects | **OpenSeaMap** (OSM `seamark:*`, S-57-inspired schema) | ODbL | Marks, lights, marinas, lock tags | UKHO ENC, Navionics |
| Coastal bathymetry | **EMODnet Bathymetry DTM** | EMODnet open use / CC BY (cite) | Best open European coastal grid for the Channel | Admiralty ENC depths as the base layer |
| Deep / fallback bathymetry | **GEBCO** | Public / GEBCO terms (free with attribution) | Mid-Channel, low zoom | — |
| Extra UK surveys | **UKHO ADMIRALTY Marine Data Portal** bathymetry where released as **OGL** | OGL v3 | Improve harbour approaches when files are OGL | UKHO products that require a commercial or “not for navigation” paid licence *used as if they were charts* |
| Crowd depths | **OpenSeaMap depth** | Project terms / ODbL-adjacent | Secondary overlay | — |
| Wind (atmosphere) | **Open-Meteo** (open-source API, CC BY 4.0 data), models: **UK Met Office**, **ECMWF IFS**, **DWD ICON-EU**, **Météo-France AROME** | CC BY 4.0 + upstream | Wind speed, gusts, direction; self-host (AGPLv3) if we outgrow the public instance | PredictWind, Windy PRO, paid Meteomatics |
| Wind fallback | **NOAA GFS** / **MET Norway Locationforecast** | NOAA public domain; MET Norway CC BY | Direct model access | — |
| Waves | **Open-Meteo Marine** (DWD EWAM ~5 km Europe, ECMWF WAM, Météo-France MFWAM) | CC BY 4.0 | Hs, period, direction | — |
| Ocean currents | Copernicus Marine **CMEMS** and/or Open-Meteo SMOC | Copernicus licence (free with attribution) | Weak tidal-stream hint offshore | — |
| Observed tide | **Environment Agency Tide Gauge API** (UK National Tide Gauge Network) | OGL v3 | 15-min observed height, m and mAOD | — |
| Predicted tide (coastal) | **Channel Coastal Observatory / Regional Coastal Monitoring** tide predictions | OGL | Harbour predictions where available | Admiralty Tide Tables as a copied dataset |
| Predicted tide (offshore / gap fill) | **FES2014 / FES2022** via open **pyTMD** (AVISO registration) | AVISO research licence — **only if terms remain open for this use**; otherwise omit | Not for drying harbours | Open-Meteo `sea_level_height_msl` **must not** be used as a harbour tide (provider says coastal accuracy is poor and datum is MSL not LAT) |
| Wrecks / obstructions | **UKHO wrecks and obstructions** | OGL v3 | Point hazards | Copyright wreck databases |
| TSS / routeing | **UKHO ships’ routeing** | OGL | Dover Strait and other IMO measures | — |
| Limits / EEZ | **UKHO maritime limits** | OGL | Context | — |
| Wind farms, cables | **EMODnet Human Activities** and OSM; Crown Estate open data if OGL | Various open | Exclusion / caution | Paid offshore GIS |
| MPAs / MCZs | **JNCC** and **Natural England** open spatial data | OGL | Information | — |
| Magnetic variation | **NOAA World Magnetic Model (WMM)** | Public | °T ↔ °M | — |
| Satellite imagery | **Copernicus Sentinel-2** | Copernicus open | Optional harbour photo layer | Bing, Google, ESRI World Imagery |
| Low-zoom land | **Natural Earth** | Public domain | Small-scale | — |

**Explicitly forbidden as data sources**

- UKHO Admiralty ENC (S-57/S-101), ARCS, and other Crown products that are not on the OGL portal
- Navionics, C-MAP, Imray raster (copyright)
- Google Maps / Places
- Paid AIS aggregators with non-open ToS as a required dependency
- Scraping Reeds, Admiralty Sailing Directions, or harbour websites

### 9.2 How data are combined (logical)

```text
┌─────────────────────────────────────────────────────────────┐
│                     Navi client (cockpit)                    │
│  MapLibre  │  mark cards  │  route engine  │  safety engine │
└────────────┴──────────────┴────────────────┴────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
  vector tiles    seamark store   GRIB/JSON     hazard tiles
  (OSM extract)   (Overpass or    wind/wave     (UKHO OGL +
                  OSM planet      (Open-Meteo   EMODnet +
                  clip of box)    / MET / GFS)  OSM bridges)
        │
        ▼
  bathymetry COG/GeoTIFF → quantized map + UKC shader
  tides: EA observations + CCO predictions → height(t)
```

### 9.3 Refresh and offline

| Dataset | Refresh | Offline |
| --- | --- | --- |
| OSM / seamarks | Weekly extract of the bounding box | Full box in the download pack |
| EMODnet / GEBCO | On new DTM release | Full box |
| UKHO OGL wrecks / TSS | Quarterly (UKHO cadence) | Full box |
| Wind / waves | Every model cycle (1–6 h) while online | Last forecast cached (48 h minimum) |
| EA tide gauges | 15 min while online | Last reading + CCO prediction tables |
| Sentinel-2 | Optional, on demand over Wi-Fi | Selected harbour tiles only |

### 9.4 Attribution (must appear in-app)

A single **Data & licences** screen, plus a compact map credit, must name OSM/OpenSeaMap, EMODnet, GEBCO, Open-Meteo and upstream models (UKMO, ECMWF, DWD, Météo-France, NOAA), Environment Agency, Channel Coastal Observatory, UKHO (OGL), Copernicus, JNCC/Natural England, and WMM as used.

### 9.5 Local-first storage — no hosted database in v1

v1 is a **single yacht, single device** tool. A server database is not required and must not block deploy.

| Store | Technology | What lives there | Why not the other options |
| --- | --- | --- | --- |
| Tiny preferences | **localStorage** | Night mode, last map centre/zoom, active route id, layer toggles | Synchronous, < 5 KB, fine if lost |
| Structured app data | **IndexedDB** (via a small wrapper) | Yacht profile, routes, waypoints, seamark snapshots, weather JSON, tide snapshots, course-pack metadata | localStorage is too small (~5 MB) and string-only |
| Map tiles and HTTP APIs | **Cache Storage** (service worker / Workbox) | OpenFreeMap / OSM tiles, OpenSeaMap overlay tiles, opaque forecast responses | Natural fit for `Request`/`Response`; the browser already quotas this for PWAs |

**Decision:** do **not** run Postgres, SQLite-on-the-server, Vercel KV, or Firebase for v1. IndexedDB on a tablet is typically hundreds of MB to several GB — enough for a Channel-coast course pack.

**What we accept by staying local**

- Uninstalling the PWA, or clearing site data, **wipes routes and packs**. Export GPX before that.
- Two devices do not sync. Copy a GPX (or later a pack file) by hand.
- No login, no position uploaded (NFR-05).

**When a database *would* be justified (not v1)**

- Multi-device sync for the same skipper
- Shared crew route library
- Hosted tile extracts too large for Vercel’s static CDN
- Audit log of passage plans

If that day comes, add an optional authenticated API and keep IndexedDB as the offline cache (local-first, not cloud-first). Until then, Vercel hosts **only static assets** (HTML, JS, CSS, icons, a few GeoJSON fixtures).

**Course pack record (IndexedDB)**

```text
CoursePack {
  id, routeId, createdAtUtc,
  bbox, minZoom, maxZoom,
  tileCount, markCount,
  weatherIssuedAtUtc,
  tideIssuedAtUtc,
  bytesEstimate
}
```

Tiles themselves sit in Cache Storage, keyed by URL. Marks and weather sit in IndexedDB so they can be queried without parsing tile images.

### 9.6 Hosting on Vercel

**Yes — v1 is designed to deploy to Vercel.**

| Concern | How it fits Vercel |
| --- | --- |
| App type | Static SPA / Vite build (`dist/`). Framework preset: Vite. |
| Serverless functions | **Not required** for MVP. Open-Meteo, Overpass and the Environment Agency API are called **from the browser** (they send CORS headers). |
| Tile proxy | Optional later (`/tiles/...` rewrite) if a tile host lacks CORS. Prefer CORS-friendly open hosts first (**OpenFreeMap** vector tiles). |
| Service worker | Supported. Set `Cache-Control: no-cache` on `sw.js` / `manifest.webmanifest` so skippers receive worker updates. |
| SPA routing | `rewrites`: all paths → `/index.html`. |
| Environment secrets | None for v1. No API keys for Open-Meteo or OSM. |
| Limits | Stay inside Vercel’s static bandwidth; do not proxy the entire EMODnet DTM through serverless. Large DTMs belong in client cache from the provider, or a future object store. |
| Preview deploys | Every PR gets a HTTPS URL — required for PWA install testing. |
| Custom domain | Optional; PWA install works on `*.vercel.app`. |

`vercel.json` (normative for v1):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npx vite build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }]
    }
  ]
}
```

Vercel serves existing files in `dist` first (so `/assets/*`, `/sw.js` and the homepage `index.html` are not eaten by the rewrite). Do **not** use JavaScript-style negative lookaheads in `source`; Vercel’s router does not parse them.

Production must deploy a git branch that actually contains this app. The empty `main` README-only commit has no `index.html`, which Vercel reports as **404 NOT_FOUND**.

**Not a good fit for Vercel (avoid):** generating worldwide vector tiles at request time, storing skipper tracks on the server, or WebSocket AIS fans. Those would need a different host or a later API.

---

## 10. User experience

### 10.1 Main views

1. **Chart** — full-screen map, own ship, layers, route.
2. **Mark** — day / night cards, flash trainer.
3. **Route** — waypoint list, validation, ETAs.
4. **Weather** — wind/wave along route, model time.
5. **Yacht** — HR 342 numbers, UKC policy, keel variant.
6. **Download** — offline pack status; **Download for this course** is the primary action (harbour Wi-Fi), with pack size, progress and delete.

### 10.2 Cockpit constraints

- Primary use: 10–13″ tablet in a wet pouch, or a phone as backup.
- Tap targets ≥ 44 px; mark symbols exaggerated at harbour zoom.
- One-handed follow mode: next mark and XTE always visible.
- Night mode must not emit a white splash screen.
- No video autoplay, no marketing interstitials.

### 10.3 Language and notation

- Light strings in standard UK notation, e.g. **Fl.G.5s**, **Q(9)15s**, **Iso.R.4s**, **Mo(A).W.8s**.
- Courses in three digits, e.g. 045°T.
- Depths to 0.1 m in harbours, 1 m offshore.

---

## 11. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-01 | First chart render of a cached harbour ≤ 2 s on a mid-range tablet. |
| NFR-02 | GNSS position update ≥ 1 Hz in follow mode. |
| NFR-03 | Works with no WAN after offline pack + last weather cache. |
| NFR-04 | Accessibility: WCAG 2.2 AA on setup screens; cockpit mode prioritises contrast over AA greys. |
| NFR-05 | Privacy: no account required for v1; position is not uploaded. |
| NFR-06 | Security: TLS for all fetches; signed offline packs. |
| NFR-07 | Licence compliance automated in CI (attribution list, no forbidden SDKs). |
| NFR-08 | Test coverage for UKC maths, IALA light parsing, and route validation (TDD). |
| NFR-09 | Time: all forecasts stored in UTC; display Europe/London with BST. |
| NFR-10 | Installable PWA (manifest `display: standalone`, icons 192 and 512, `theme-color` compatible with night mode). |
| NFR-11 | Deployable to Vercel with zero required environment variables. |
| NFR-12 | No hosted database. Persistence must work with IndexedDB + Cache Storage + localStorage only. |
| NFR-13 | Course-pack download is resumable enough that a dropped Wi-Fi hop can be retried without starting the route again. |

---

## 12. Release plan

### MVP (P0)

PWA on Vercel (static), IndexedDB + Cache Storage (no database), OSM/OpenSeaMap marks with day and night cards, depth awareness with HR 342 UKC shading (EMODnet/GEBCO as data land; fail-safe unknown cells until the DTM is cached), Open-Meteo wind, EA tide observations, manual route plot + validate (shoal, wrecks, TSS, unknown bridges), **download for this course**, GPX export, night palette, licence screen.

### v1.1 (P1)

Auto-route around no-go cells, wave overlay, dual wind models, light sectors, Sentinel-2 harbours, CCO tide predictions, harbour-bar windows, lights-along-route list, track log.

### v1.2 (P2)

Simple polar weather routing, MOB, Signal K / NMEA, optional community AIS if an open feed is viable, modest expansion west to Start Point or east to Harwich **only** if data quality holds.

---

## 13. Success metrics

Qualitative (this is a single-yacht tool):

- Skipper can identify the next buoy by day shape and by night flash without a paper list.
- A Solent or Thames route that is unsafe for 1.82 m / 17.5 m air draught is flagged before departure.
- A weekend passage can be planned and followed with the radio modem off.
- Every on-screen number can be traced to a named open source and timestamp.

Technical:

- 100 % of production data connectors covered by licence tests.
- UKC and light-character parsers have unit tests against fixtures (Needles, a Solent lateral, a Thames wreck, a low bridge).

---

## 14. Risks

| Risk | Mitigation |
| --- | --- |
| OSM seamarks incomplete or wrong | Completeness flags; never invent lights; encourage OSM edits **off the water** |
| EMODnet/GEBCO not on LAT | Datum labelling; UKC engine refuses to “make it look like a chart” |
| Open-Meteo public rate limits | Self-host AGPL instance; or fetch NOAA/MET Norway directly |
| Skipper treats app as official chart | Persistent disclaimer; no IMO ECDIS symbology claim |
| Thames air draught | Conservative default 17.5 m; unknown bridges block auto-approve |
| FES/AVISO licence too tight | Drop offshore tide model; keep EA + CCO only |
| Crowd depth misleading | Visual hierarchy under official-open DTM |
| IndexedDB evicted by the OS | Warn on `storage` estimate; prompt GPX export; `persist()` where the browser allows |
| Vercel stale service worker | No-cache headers on `sw.js`; Workbox skipWaiting + a “Reload to update” toast |

---

## 15. Open questions

1. ~~Target platform for v1?~~ **Decided:** installable **PWA** (Vite + MapLibre + Workbox), not a native app. See §8.8 and §9.6.
2. Is the shallow-draught HR 342 (1.57 m) in use, or only the standard 1.82 m keel? Ship both; default 1.82 m.
3. Should French SHOM open data be added for Cherbourg/Calais harbour marks, or remain OSM-only across the Channel?
4. ~~Own tile extract vs community CDN?~~ **Decided for v1:** **OpenFreeMap** (OSM-based vector, no API key, CORS) + Cache Storage along the course. Revisit a self-hosted extract if the CDN is too coarse for harbour work or goes away.
5. ~~Database or local storage?~~ **Decided:** **no hosted database**. IndexedDB + Cache Storage + localStorage. See §9.5.
6. ~~Can it deploy to Vercel?~~ **Decided: yes** — static Vite app, no serverless required for MVP. See §9.6.

---

## 16. Glossary

| Term | Meaning |
| --- | --- |
| AtoN | Aid to navigation (buoy, beacon, light) |
| IALA A | Buoyage region for Europe: red to port when returning from sea |
| LAT | Lowest Astronomical Tide — usual UK chart datum |
| UKC | Under-keel clearance |
| TSS | Traffic Separation Scheme |
| OGL | UK Open Government Licence |
| ODbL | Open Data Commons Open Database Licence (OSM) |
| ENC | Electronic Navigational Chart (IHO S-57/S-101) — **not used here** |

---

## 17. Appendix A — IALA Region A cheat sheet (for UI copy)

Use this only as in-app help, aligned with Trinity House / IALA public descriptions:

| Mark | Day | Night (typical) |
| --- | --- | --- |
| Port lateral | Red, can, cylinder topmark | Red light, any rhythm except 2+1 |
| Starboard lateral | Green, cone, conical topmark | Green light, any rhythm except 2+1 |
| Preferred channel | Red/green combination, 2+1 | Light 2+1 in the relevant colour |
| North cardinal | Black over yellow, two cones up | VQ or Q white |
| East cardinal | Black-yellow-black, cones base to base | VQ(3) or Q(3) 5s/10s white |
| South cardinal | Yellow over black, two cones down | VQ(6)+LFl or Q(6)+LFl white |
| West cardinal | Yellow-black-yellow, cones point to point | VQ(9) or Q(9) white |
| Isolated danger | Black-red-black, two spheres | Fl(2) white |
| Safe water | Red/white vertical, red sphere | Iso, Oc, LFl 10s, or Mo(A) white |
| Special | Yellow, X topmark | Yellow light, any rhythm not used above |

The app must still prefer **OSM tags for the actual mark** over this table.

---

## 18. Appendix B — HR 342 numbers used by the safety engine

```text
loa_m: 10.32
lwl_m: 9.09
beam_m: 3.42
draught_standard_m: 1.82
draught_shoal_m: 1.57
air_draught_mast_ex_windex_m: 15.92
air_draught_planning_default_m: 17.5
displacement_light_t: 5.3
fuel_l: 165
hull_speed_kn: 7.3
default_passage_speed_kn: 5.5
default_motor_speed_kn: 6.0
ukc_fair_m: 0.5
ukc_moderate_m: 1.0
ukc_severe_m: 1.5
wind_advisory_sustained_kn: 25
wave_advisory_hs_m: 2.0
```

These values are configuration, not hardcoded magic, and must be unit-tested together with the UKC formula:

```text
required_charted_depth ≈ sailing_draught + ukc_policy − tide_height_above_chart_datum
if tide or datum unknown → treat cell as unknown, not safe
```

---

## 19. Appendix C — example user journeys

**Day passage (P0):** Skipper in Poole downloads the offline pack, plots Poole Bar → Needles → Hurst → Yarmouth, validates UKC over the Shingles, checks Open-Meteo wind at Needles ETA, and sails follow-mode with next-mark cards (colour and shape).

**Night entry (P0):** Approaching Chichester or Ramsgate after dark, night palette on, next mark shows **Fl.R.5s** (or whatever OSM records), flash trainer running, unlit piles listed as unlit.

**Thames caution (P0):** Route towards central London hits a bridge with OSM height below 17.5 m or with unknown height → cannot be marked ready-to-sail.

---

---

## 20. Delivery stack (v1)

| Layer | Choice | Notes |
| --- | --- | --- |
| Language | TypeScript | TDD with Vitest for UKC, lights, routes, course tiles |
| UI | React | Cockpit-sized tap targets |
| Map | MapLibre GL JS | Open-source; vector + GeoJSON marks |
| Base tiles | OpenFreeMap | OSM, no key |
| Marks | Overpass → GeoJSON, cached in IndexedDB | OpenSeaMap `seamark:*` |
| Wind | Open-Meteo Forecast API | Browser fetch, cache JSON |
| Offline | vite-plugin-pwa / Workbox | App shell + runtime tile cache + explicit course prefetch |
| Persistence | IndexedDB + localStorage | No Vercel KV / Postgres |
| Hosting | Vercel static | `vercel.json` headers for the service worker |

*End of PRD v1.1*
