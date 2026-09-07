import { describe, expect, it } from 'vitest'
import { buildRoute } from './route'
import { appendWaypoint, beginPlotting, finishPlotting, nextPlotName, renamePlot, routesToGeoJson } from './plots'

describe('multiple plots', () => {
  it('names new plots Plot 1, Plot 2, skipping names already used', () => {
    expect(nextPlotName([])).toBe('Plot 1')
    expect(nextPlotName(['Plot 1', 'Cowes to Needles'])).toBe('Plot 2')
    expect(nextPlotName(['Plot 1', 'Plot 2', 'Plot 4'])).toBe('Plot 3')
  })

  it('starts a fresh plot without replacing existing ones', () => {
    const existing = buildRoute({
      name: 'Cowes to Needles',
      waypoints: [
        { lat: 50.766, lon: -1.298, name: 'Cowes' },
        { lat: 50.6622, lon: -1.5908, name: 'Needles' },
      ],
      speedKn: 5.5,
    })
    const session = beginPlotting([existing], 5.5)
    expect(session.plotting).toBe(true)
    expect(session.routes).toHaveLength(2)
    expect(session.routes[1]?.name).toBe('Plot 1')
    expect(session.routes[1]?.waypoints).toHaveLength(0)
    expect(session.activeId).toBe(session.routes[1]?.id)
    expect(session.routes[0]?.id).toBe(existing.id)
  })

  it('appends waypoints only while a plot is being edited', () => {
    const empty = buildRoute({ name: 'Plot 1', waypoints: [], speedKn: 5.5 })
    const withOne = appendWaypoint(empty, { lat: 50.7, lon: -1.5 }, 5.5)
    const withTwo = appendWaypoint(withOne, { lat: 50.71, lon: -1.4 }, 5.5)
    expect(withOne.waypoints).toHaveLength(1)
    expect(withTwo.waypoints).toHaveLength(2)
    expect(withTwo.legs).toHaveLength(1)
    expect(withTwo.id).toBe(empty.id)
  })

  it('Done locks the plot so further taps are not implied', () => {
    expect(finishPlotting()).toEqual({ plotting: false })
  })

  it('renames a plot in place', () => {
    const route = buildRoute({
      name: 'Plot 1',
      waypoints: [
        { lat: 50.766, lon: -1.298 },
        { lat: 50.7, lon: -1.5 },
      ],
      speedKn: 5.5,
    })
    expect(renamePlot(route, '  Poole to Cowes  ').name).toBe('Poole to Cowes')
  })

  it('draws every plot as a line and only the active plot’s waypoints', () => {
    const a = buildRoute({
      name: 'A',
      waypoints: [
        { lat: 50.7, lon: -1.6 },
        { lat: 50.71, lon: -1.5 },
      ],
      speedKn: 5.5,
    })
    const b = buildRoute({
      name: 'B',
      waypoints: [
        { lat: 50.75, lon: -1.3 },
        { lat: 50.76, lon: -1.2 },
        { lat: 50.77, lon: -1.1 },
      ],
      speedKn: 5.5,
    })
    const geo = routesToGeoJson([a, b], b.id)
    expect(geo.features.filter((f) => f.properties.kind === 'line')).toHaveLength(2)
    const points = geo.features.filter((f) => f.properties.kind === 'point')
    expect(points).toHaveLength(3)
    expect(points.every((f) => f.properties.routeId === b.id)).toBe(true)
  })
})
