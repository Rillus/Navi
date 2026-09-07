import { beforeEach, describe, expect, it } from 'vitest'
import { naviDb } from '../data/db'
import { HR342_STANDARD } from './yacht'
import { buildRoute } from './route'

describe('local-first persistence', () => {
  beforeEach(async () => {
    await naviDb.clearAll()
  })

  it('stores the yacht profile in IndexedDB, not a remote database', () => {
    expect(naviDb.backend).toBe('indexeddb')
  })

  it('round-trips a route without a server', async () => {
    const route = buildRoute({
      name: 'Cowes hop',
      waypoints: [
        { lat: 50.766, lon: -1.298, name: 'Cowes' },
        { lat: 50.706, lon: -1.499, name: 'Yarmouth' },
      ],
      speedKn: 5.5,
    })
    await naviDb.saveRoute(route)
    const loaded = await naviDb.getRoute(route.id)
    expect(loaded?.name).toBe('Cowes hop')
    expect(loaded?.waypoints).toHaveLength(2)
  })

  it('persists yacht keel choice', async () => {
    await naviDb.saveYacht({ ...HR342_STANDARD, keel: 'shoal' })
    const yacht = await naviDb.getYacht()
    expect(yacht?.keel).toBe('shoal')
  })

  it('keeps several plots and can delete one', async () => {
    const cowes = buildRoute({
      name: 'Cowes hop',
      waypoints: [
        { lat: 50.766, lon: -1.298, name: 'Cowes' },
        { lat: 50.706, lon: -1.499, name: 'Yarmouth' },
      ],
      speedKn: 5.5,
    })
    const needles = buildRoute({
      name: 'Needles run',
      waypoints: [
        { lat: 50.7075, lon: -1.5508, name: 'Hurst' },
        { lat: 50.6622, lon: -1.5908, name: 'Needles' },
      ],
      speedKn: 5.5,
    })
    await naviDb.saveRoute(cowes)
    await naviDb.saveRoute(needles)
    expect(await naviDb.listRoutes()).toHaveLength(2)
    await naviDb.deleteRoute(cowes.id)
    const remaining = await naviDb.listRoutes()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.name).toBe('Needles run')
  })

  it('records a course pack metadata row', async () => {
    await naviDb.saveCoursePack({
      id: 'pack-1',
      routeId: 'route-1',
      createdAtUtc: '2026-09-06T10:00:00Z',
      bbox: { west: -1.7, south: 50.6, east: -1.2, north: 50.8 },
      minZoom: 8,
      maxZoom: 14,
      tileCount: 120,
      markCount: 18,
      weatherIssuedAtUtc: '2026-09-06T09:00:00Z',
      tideIssuedAtUtc: null,
      bytesEstimate: 2_400_000,
    })
    const packs = await naviDb.listCoursePacks()
    expect(packs).toHaveLength(1)
    expect(packs[0]?.tileCount).toBe(120)
  })
})
