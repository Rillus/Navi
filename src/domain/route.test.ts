import { describe, expect, it } from 'vitest'
import { buildRoute, exportGpx, parseGpx, reverseRoute, routeTotals } from './route'
import { HR342_STANDARD } from './yacht'

describe('route plotting', () => {
  const needles = { lat: 50.6622, lon: -1.5908, name: 'Needles' }
  const hurst = { lat: 50.7075, lon: -1.5508, name: 'Hurst' }
  const cowes = { lat: 50.766, lon: -1.298, name: 'Cowes' }

  it('builds rhumb legs with course, distance and ETA', () => {
    const route = buildRoute({
      name: 'Needles to Cowes',
      waypoints: [needles, hurst, cowes],
      speedKn: HR342_STANDARD.defaultPassageSpeedKn,
      etdUtc: '2026-09-06T08:00:00Z',
    })
    expect(route.legs).toHaveLength(2)
    expect(route.legs[0]?.from.name).toBe('Needles')
    expect(route.legs[0]?.distanceNm).toBeGreaterThan(2)
    expect(route.legs[0]?.courseDegT).toBeGreaterThan(20)
    expect(route.legs[1]?.to.name).toBe('Cowes')
    expect(route.totals.distanceNm).toBeGreaterThan(10)
    expect(route.totals.etaUtc).toMatch(/2026-09-06T/)
  })

  it('reverses waypoints and recalculates legs', () => {
    const route = buildRoute({
      name: 'Eastbound',
      waypoints: [needles, hurst, cowes],
      speedKn: 5.5,
    })
    const back = reverseRoute(route)
    expect(back.waypoints[0]?.name).toBe('Cowes')
    expect(back.waypoints.at(-1)?.name).toBe('Needles')
    expect(back.legs[0]?.from.name).toBe('Cowes')
  })

  it('round-trips through GPX', () => {
    const route = buildRoute({
      name: 'Needles to Hurst',
      waypoints: [needles, hurst],
      speedKn: 5.5,
    })
    const xml = exportGpx(route)
    expect(xml).toContain('<gpx')
    expect(xml).toContain('Needles')
    const imported = parseGpx(xml)
    expect(imported.waypoints).toHaveLength(2)
    expect(imported.waypoints[0]?.lat).toBeCloseTo(needles.lat, 4)
  })

  it('estimates motoring hours from total distance', () => {
    const route = buildRoute({
      name: 'Short',
      waypoints: [needles, hurst],
      speedKn: 6,
    })
    const totals = routeTotals(route)
    expect(totals.distanceNm / 6).toBeCloseTo(totals.durationH, 5)
  })
})
