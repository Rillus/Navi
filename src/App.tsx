import { useEffect, useMemo, useState } from 'react'
import { ChartMap } from './components/ChartMap'
import { naviDb } from './data/db'
import { bundledSolentMarks, fetchSeamarks } from './data/overpass'
import { downloadCoursePack } from './data/offline'
import { fetchWind, loadCachedWind, windIsStale, type WindSample } from './data/weather'
import { SAMPLE_HAZARDS } from './domain/hazards'
import type { ParsedSeamark } from './domain/lights'
import { buildRoute, exportGpx, reverseRoute, type Route } from './domain/route'
import { validateRoute, type ValidationReport } from './domain/validation'
import { HR342_STANDARD, planningAirDraught, sailingDraught, type Keel, type YachtProfile } from './domain/yacht'
import type { CoursePack } from './domain/coursePack'
import { estimateCoursePack, tilesForRoute } from './domain/coursePack'
import {
  appendWaypoint,
  beginPlotting,
  finishPlotting,
  renamePlot,
  replaceActive,
} from './domain/plots'
import { SOLENT_CENTER } from './coverage'
import './styles.css'

type Panel = 'route' | 'mark' | 'yacht' | 'download' | 'licences'

const EXAMPLE_WAYPOINTS = [
  { lat: 50.766, lon: -1.298, name: 'Cowes' },
  { lat: 50.7075, lon: -1.5508, name: 'Hurst' },
  { lat: 50.6622, lon: -1.5908, name: 'Needles' },
]

const ACTIVE_KEY = 'navi-active-route'

function loadNightPref(): boolean {
  return localStorage.getItem('navi-night') === '1'
}

export default function App() {
  const [yacht, setYacht] = useState<YachtProfile>(HR342_STANDARD)
  const [routes, setRoutes] = useState<Route[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [plotting, setPlotting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
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

  const route = routes.find((item) => item.id === activeId) ?? null

  useEffect(() => {
    void (async () => {
      const storedYacht = await naviDb.getYacht()
      if (storedYacht) setYacht(storedYacht)
      const stored = await naviDb.listRoutes()
      setRoutes(stored)
      const savedId = localStorage.getItem(ACTIVE_KEY)
      setActiveId(stored.find((item) => item.id === savedId)?.id ?? stored[0]?.id ?? null)
      const storedMarks = await naviDb.listMarks()
      if (storedMarks.length > 0) setMarks(storedMarks)
      setPacks(await naviDb.listCoursePacks())
    })()
  }, [])

  useEffect(() => {
    localStorage.setItem('navi-night', night ? '1' : '0')
  }, [night])

  useEffect(() => {
    if (activeId) localStorage.setItem(ACTIVE_KEY, activeId)
  }, [activeId])

  const statusLine = useMemo(() => {
    if (plotting) {
      return `Plotting ${route?.name ?? 'new plot'} — tap the chart, then Done to lock.`
    }
    if (!route || route.legs.length === 0) {
      return 'New plot to start, or open Plots to pick a saved one.'
    }
    const next = route.legs[0]
    return `${route.name} · next ${next?.to.name ?? 'waypoint'}  ${next?.courseLabel}  ${next?.distanceNm.toFixed(1)} NM`
  }, [plotting, route])

  function persist(next: Route) {
    void naviDb.saveRoute(next)
    setRoutes((prev) => replaceActive(prev, next))
    setActiveId(next.id)
    setReport(null)
  }

  function startNewPlot() {
    const session = beginPlotting(routes, yacht.defaultPassageSpeedKn)
    setRoutes(session.routes)
    setActiveId(session.activeId)
    setPlotting(session.plotting)
    setReport(null)
    const created = session.routes.find((item) => item.id === session.activeId)
    if (created) void naviDb.saveRoute(created)
    setPanel('route')
  }

  function resumePlotting() {
    if (!route) {
      startNewPlot()
      return
    }
    setPlotting(true)
    setPanel('route')
  }

  function lockPlot() {
    setPlotting(finishPlotting().plotting)
  }

  function onMapClick(point: { lat: number; lon: number }) {
    setRoutes((prev) => {
      const current = prev.find((item) => item.id === activeId)
      if (!current) return prev
      const next = appendWaypoint(current, point, yacht.defaultPassageSpeedKn)
      void naviDb.saveRoute(next)
      return replaceActive(prev, next)
    })
    setReport(null)
  }

  function selectPlot(id: string) {
    setActiveId(id)
    setPlotting(false)
    setReport(null)
    setPanel('route')
    setMenuOpen(true)
  }

  async function deletePlot(id: string) {
    await naviDb.deleteRoute(id)
    const remaining = routes.filter((item) => item.id !== id)
    setRoutes(remaining)
    setActiveId(remaining[0]?.id ?? null)
    setReport(null)
    setPlotting(false)
  }

  async function loadExample() {
    const example = buildRoute({
      name: 'Cowes to Needles',
      waypoints: EXAMPLE_WAYPOINTS,
      speedKn: yacht.defaultPassageSpeedKn,
    })
    setRoutes((prev) => [...prev, example])
    setActiveId(example.id)
    setPlotting(false)
    setReport(null)
    await naviDb.saveRoute(example)
    const live = await fetchSeamarks(EXAMPLE_WAYPOINTS)
    setMarks(live)
    await naviDb.saveMarks(live)
    setPanel('route')
    setMenuOpen(true)
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

  function openPanel(id: Panel) {
    setPanel(id)
    setMenuOpen(true)
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
        <div className="map-wrap">
          <div className="plot-bar">
            <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
              Plots
            </button>
            <button type="button" onClick={startNewPlot}>
              New plot
            </button>
            {plotting ? (
              <button type="button" className="active" onClick={lockPlot} data-testid="plot-done">
                Done
              </button>
            ) : (
              <button type="button" onClick={resumePlotting} data-testid="plot-start">
                Plot
              </button>
            )}
          </div>
          {plotting && (
            <div className="plot-hint">Tap waypoints on the chart, then Done to lock this plot.</div>
          )}
          <div className="toolbar">
            <button className={night ? 'active' : ''} onClick={() => setNight((v) => !v)}>
              {night ? 'Night' : 'Day'}
            </button>
            <button onClick={() => void refreshWind()}>Wind</button>
          </div>
          <ChartMap
            night={night}
            plotting={plotting}
            routes={routes}
            activeRouteId={activeId}
            marks={marks}
            onMapClick={onMapClick}
            onSelectRoute={selectPlot}
            onSelectMark={(mark) => {
              setSelected(mark)
              openPanel('mark')
            }}
          />
        </div>
        {menuOpen && (
          <button type="button" className="drawer-scrim" aria-label="Close plots panel" onClick={() => setMenuOpen(false)} />
        )}
        <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
          <div className="brand">
            <div>
              <h1>Navi</h1>
              <p>Hallberg-Rassy 342 · south / south-east England</p>
            </div>
            <button type="button" className="ghost" onClick={() => setMenuOpen(false)}>
              Close
            </button>
          </div>
          <div className="tabs">
            {(['route', 'mark', 'yacht', 'download', 'licences'] as Panel[]).map((id) => (
              <button key={id} className={panel === id ? 'active' : ''} onClick={() => setPanel(id)}>
                {id === 'mark' ? 'Marks' : id === 'route' ? 'Plots' : id[0]?.toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
          <div className="panel">
            {panel === 'route' && (
              <>
                <h2>Plots</h2>
                <p>Several passages can live on this device. Plot on the chart, then Done to lock. New plot starts another.</p>
                <ul className="plot-list">
                  {routes.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={item.id === activeId ? 'active' : ''}
                        onClick={() => selectPlot(item.id)}
                      >
                        {item.name}
                        <span>
                          {item.waypoints.length} wpt
                          {item.totals.distanceNm > 0 ? ` · ${item.totals.distanceNm.toFixed(1)} NM` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {routes.length === 0 && <p>No plots yet.</p>}
                <div className="tabs">
                  <button type="button" onClick={startNewPlot}>
                    New plot
                  </button>
                  <button type="button" onClick={() => void loadExample()}>
                    Example
                  </button>
                </div>
                {route && (
                  <>
                    <div className="field">
                      <label htmlFor="plot-name">Active plot</label>
                      <input
                        id="plot-name"
                        value={route.name}
                        onChange={(event) => {
                          const next = renamePlot(route, event.target.value)
                          void persist(next)
                        }}
                      />
                    </div>
                    <p>
                      {route.totals.distanceNm.toFixed(1)} NM · {route.totals.durationH.toFixed(1)} h at {route.speedKn}{' '}
                      kn · {plotting ? 'editing' : 'locked'}
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
                      {plotting ? (
                        <button type="button" className="primary" onClick={lockPlot}>
                          Done
                        </button>
                      ) : (
                        <button type="button" onClick={resumePlotting}>
                          Edit plot
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          void persist(
                            buildRoute({
                              id: route.id,
                              name: route.name,
                              waypoints: [],
                              speedKn: route.speedKn,
                            }),
                          )
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void persist(reverseRoute(route))}
                        disabled={route.waypoints.length < 2}
                      >
                        Reverse
                      </button>
                      <button type="button" onClick={() => void deletePlot(route.id)}>
                        Delete
                      </button>
                    </div>
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
