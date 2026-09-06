import { useEffect, useMemo, useState } from 'react'
import { ChartMap } from './components/ChartMap'
import { naviDb } from './data/db'
import { bundledSolentMarks, fetchSeamarks } from './data/overpass'
import { downloadCoursePack } from './data/offline'
import { fetchWind, loadCachedWind, windIsStale, type WindSample } from './data/weather'
import { SAMPLE_HAZARDS } from './domain/hazards'
import type { ParsedSeamark } from './domain/lights'
import { buildRoute, exportGpx, reverseRoute, type Route, type Waypoint } from './domain/route'
import { validateRoute, type ValidationReport } from './domain/validation'
import { HR342_STANDARD, planningAirDraught, sailingDraught, type Keel, type YachtProfile } from './domain/yacht'
import type { CoursePack } from './domain/coursePack'
import { estimateCoursePack, tilesForRoute } from './domain/coursePack'
import { SOLENT_CENTER } from './coverage'
import './styles.css'

type Panel = 'route' | 'mark' | 'yacht' | 'download' | 'licences'

const EXAMPLE_WAYPOINTS: Waypoint[] = [
  { lat: 50.766, lon: -1.298, name: 'Cowes' },
  { lat: 50.7075, lon: -1.5508, name: 'Hurst' },
  { lat: 50.6622, lon: -1.5908, name: 'Needles' },
]

function loadNightPref(): boolean {
  return localStorage.getItem('navi-night') === '1'
}

export default function App() {
  const [yacht, setYacht] = useState<YachtProfile>(HR342_STANDARD)
  const [route, setRoute] = useState<Route | null>(null)
  const [plotting, setPlotting] = useState(false)
  const [night, setNight] = useState(loadNightPref)
  const [panel, setPanel] = useState<Panel>('route')
  const [marks, setMarks] = useState<ParsedSeamark[]>(bundledSolentMarks)
  const [selected, setSelected] = useState<ParsedSeamark | null>(null)
  const [card, setCard] = useState<'day' | 'night'>('day')
  const [wind, setWind] = useState<WindSample | null>(loadCachedWind)
  const [report, setReport] = useState<ValidationReport | null>(null)
  const [packs, setPacks] = useState<CoursePack[]>([])
  const [downloadLabel, setDownloadLabel] = useState<string | null>(null)
  const [downloadPct, setDownloadPct] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const storedYacht = await naviDb.getYacht()
      if (storedYacht) setYacht(storedYacht)
      const routes = await naviDb.listRoutes()
      if (routes[0]) setRoute(routes[0])
      const storedMarks = await naviDb.listMarks()
      if (storedMarks.length > 0) setMarks(storedMarks)
      setPacks(await naviDb.listCoursePacks())
    })()
  }, [])

  useEffect(() => {
    localStorage.setItem('navi-night', night ? '1' : '0')
  }, [night])

  const statusLine = useMemo(() => {
    if (!route || route.legs.length === 0) return 'Tap Plot, then the chart, to add waypoints.'
    const next = route.legs[0]
    return `Next ${next?.to.name ?? 'waypoint'}  ${next?.courseLabel}  ${next?.distanceNm.toFixed(1)} NM`
  }, [route])

  function replaceRoute(waypoints: Waypoint[], name = route?.name ?? 'Passage') {
    if (waypoints.length === 0) {
      setRoute(null)
      setReport(null)
      return
    }
    const next = buildRoute({
      id: route?.id,
      name,
      waypoints,
      speedKn: yacht.defaultPassageSpeedKn,
    })
    setRoute(next)
    setReport(null)
    void naviDb.saveRoute(next)
  }

  function onMapClick(point: { lat: number; lon: number }) {
    if (!plotting) return
    const nextWp: Waypoint = {
      lat: point.lat,
      lon: point.lon,
      name: `WP ${(route?.waypoints.length ?? 0) + 1}`,
    }
    replaceRoute([...(route?.waypoints ?? []), nextWp])
  }

  async function loadExample() {
    replaceRoute(EXAMPLE_WAYPOINTS, 'Cowes to Needles')
    const live = await fetchSeamarks(EXAMPLE_WAYPOINTS)
    setMarks(live)
    await naviDb.saveMarks(live)
  }

  function runValidate() {
    if (!route) return
    setReport(
      validateRoute(route, {
        yacht,
        tideAboveDatumM: 0,
        hazards: SAMPLE_HAZARDS,
      }),
    )
  }

  async function refreshWind() {
    const point = route?.waypoints[0] ?? SOLENT_CENTER
    try {
      setWind(await fetchWind(point))
    } catch {
      setWind(loadCachedWind())
    }
  }

  async function download() {
    if (!route || route.waypoints.length < 2) return
    setBusy(true)
    try {
      const pack = await downloadCoursePack(route, (progress) => {
        setDownloadLabel(progress.label)
        setDownloadPct(progress.total ? Math.round((progress.done / progress.total) * 100) : 0)
      })
      setPacks(await naviDb.listCoursePacks())
      setDownloadLabel(`Saved ${pack.tileCount} tiles and ${pack.markCount} marks on this device.`)
      const live = await naviDb.listMarks()
      if (live.length > 0) setMarks(live)
    } finally {
      setBusy(false)
    }
  }

  function updateYacht(patch: Partial<YachtProfile>) {
    const next = { ...yacht, ...patch }
    setYacht(next)
    void naviDb.saveYacht(next)
  }

  const packPreview = route
    ? estimateCoursePack({
        tileCount: tilesForRoute({
          waypoints: route.waypoints,
          minZoom: 8,
          maxZoom: 13,
          bufferNm: 1.5,
        }).length,
        markCount: marks.length,
      })
    : null

  return (
    <div className="app">
      <div className="banner">
        Not for navigation. Open-data aid only — use official charts, a tidal almanac, and a lookout.
      </div>
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <h1>Navi</h1>
            <p>Hallberg-Rassy 342 · south / south-east England</p>
          </div>
          <div className="tabs">
            {(['route', 'mark', 'yacht', 'download', 'licences'] as Panel[]).map((id) => (
              <button key={id} className={panel === id ? 'active' : ''} onClick={() => setPanel(id)}>
                {id === 'mark' ? 'Marks' : id[0]?.toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          <div className="panel">
            {panel === 'route' && (
              <>
                <h2>Route</h2>
                <p>Rhumb-line legs. Plot on the chart or load the Cowes → Needles example.</p>
                <div className="tabs">
                  <button className={plotting ? 'active' : ''} onClick={() => setPlotting((v) => !v)}>
                    {plotting ? 'Plotting on' : 'Plot'}
                  </button>
                  <button onClick={() => void loadExample()}>Example</button>
                  <button
                    onClick={() => {
                      if (route) replaceRoute([])
                    }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => {
                      if (route) setRoute(reverseRoute(route))
                    }}
                    disabled={!route}
                  >
                    Reverse
                  </button>
                </div>
                {route && (
                  <>
                    <p>
                      {route.name} · {route.totals.distanceNm.toFixed(1)} NM ·{' '}
                      {route.totals.durationH.toFixed(1)} h at {route.speedKn} kn
                    </p>
                    <ol className="legs">
                      {route.legs.map((leg, i) => (
                        <li key={`${leg.from.lat}-${i}`}>
                          <span>
                            {leg.from.name} → {leg.to.name}
                          </span>
                          <span>
                            {leg.courseLabel} · {leg.distanceNm.toFixed(1)} NM
                          </span>
                        </li>
                      ))}
                    </ol>
                    <div className="tabs">
                      <button className="primary" onClick={runValidate}>
                        Validate for this yacht
                      </button>
                      <button
                        onClick={() => {
                          const blob = new Blob([exportGpx(route)], { type: 'application/gpx+xml' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${route.name}.gpx`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        Export GPX
                      </button>
                    </div>
                    {report &&
                      (report.readyToSail ? (
                        <div className="ok">Ready to sail against the sample hazard set (still not a chart).</div>
                      ) : (
                        report.warnings.map((warning) => (
                          <div className="warning" key={warning.code + warning.message}>
                            {warning.message}
                          </div>
                        ))
                      ))}
                  </>
                )}
              </>
            )}

            {panel === 'mark' && (
              <>
                <h2>Marks · IALA A</h2>
                <p>Tap a buoy or light on the chart. Day shape and night flash come from OpenSeaMap tags only — we do not invent missing lights.</p>
                <div className="tabs">
                  <button className={card === 'day' ? 'active' : ''} onClick={() => setCard('day')}>
                    Day
                  </button>
                  <button className={card === 'night' ? 'active' : ''} onClick={() => setCard('night')}>
                    Night
                  </button>
                </div>
                {selected ? (
                  <div className="mark-card">
                    <strong>{selected.day.name}</strong>
                    {card === 'day' ? (
                      <ul>
                        <li>Type: {selected.day.type.replaceAll('_', ' ')}</li>
                        <li>Category: {selected.day.category}</li>
                        <li>Colour: {selected.day.colour}</li>
                        <li>Shape: {selected.day.shape}</li>
                        <li>Topmark: {selected.day.topmark}</li>
                        {!selected.day.complete && <li>Incomplete OSM tags — treat with caution.</li>}
                      </ul>
                    ) : (
                      <p>
                        <span
                          className={`flash ${selected.night.colour ?? 'white'}`}
                          style={{ animationDuration: `${selected.night.periodS ?? 5}s` }}
                        />
                        {selected.night.lightString}
                        {selected.night.rangeNm ? ` · ${selected.night.rangeNm} NM` : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <p>No mark selected.</p>
                )}
              </>
            )}

            {panel === 'yacht' && (
              <>
                <h2>Yacht</h2>
                <p>Yard numbers for the HR 342. Change keel if you have the shallow version.</p>
                <div className="field">
                  <label htmlFor="keel">Keel</label>
                  <select
                    id="keel"
                    value={yacht.keel}
                    onChange={(event) => updateYacht({ keel: event.target.value as Keel })}
                  >
                    <option value="standard">Standard 1.82 m</option>
                    <option value="shoal">Shoal 1.57 m</option>
                  </select>
                </div>
                <p>
                  Sailing draught {sailingDraught(yacht).toFixed(2)} m · planning air draught{' '}
                  {planningAirDraught(yacht).toFixed(1)} m
                </p>
                <p>
                  UKC fair {yacht.ukcFairM} m · fuel {yacht.fuelL} L · hull speed {yacht.hullSpeedKn} kn
                </p>
              </>
            )}

            {panel === 'download' && (
              <>
                <h2>Download for this course</h2>
                <p>
                  Stores chart tiles, seamarks and the last wind forecast in this browser (IndexedDB + Cache Storage).
                  No hosted database. Clear site data and the pack is gone — export GPX first.
                </p>
                {route && packPreview && (
                  <p>
                    Corridor estimate about {packPreview.label} for {route.name}.
                  </p>
                )}
                <button className="primary" disabled={!route || busy} onClick={() => void download()}>
                  {busy ? 'Downloading…' : 'Download for this course'}
                </button>
                {downloadLabel && (
                  <>
                    <div className="progress" style={{ marginTop: '0.75rem' }}>
                      <span style={{ width: `${downloadPct}%` }} />
                    </div>
                    <p>{downloadLabel}</p>
                  </>
                )}
                {packs.map((pack) => (
                  <p key={pack.id}>
                    Pack {new Date(pack.createdAtUtc).toUTCString()} · {pack.tileCount} tiles · {pack.markCount} marks
                  </p>
                ))}
              </>
            )}

            {panel === 'licences' && (
              <>
                <h2>Data &amp; licences</h2>
                <p className="credits">
                  © OpenStreetMap contributors (ODbL) · OpenSeaMap · OpenFreeMap · Open-Meteo (CC BY) · EMODnet / GEBCO
                  planned for full DTM · sample Solent marks bundled for offline demo. Install this PWA from the
                  browser menu. Deployable to Vercel as a static app with no database.
                </p>
              </>
            )}
          </div>
        </aside>
        <div className="map-wrap">
          <div className="toolbar">
            <button className={night ? 'active' : ''} onClick={() => setNight((v) => !v)}>
              {night ? 'Night' : 'Day'}
            </button>
            <button onClick={() => void refreshWind()}>Wind</button>
          </div>
          <ChartMap
            night={night}
            plotting={plotting}
            route={route}
            marks={marks}
            onMapClick={onMapClick}
            onSelectMark={(mark) => {
              setSelected(mark)
              setPanel('mark')
            }}
          />
        </div>
      </div>
      <footer className="status">
        <div>{statusLine}</div>
        <div>
          {wind ? (
            <>
              Wind {wind.speedKn.toFixed(0)} kn from {wind.directionDeg.toFixed(0)}°
              {wind.gustKn ? ` gust ${wind.gustKn.toFixed(0)}` : ''} · {wind.source}
              {windIsStale(wind) ? ' · stale' : ''}
            </>
          ) : (
            'Wind: fetch while online'
          )}
        </div>
        <div>Draught {sailingDraught(yacht).toFixed(2)} m</div>
      </footer>
    </div>
  )
}
