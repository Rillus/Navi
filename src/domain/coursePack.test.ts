import { describe, expect, it } from 'vitest'
import { estimateCoursePack, tilesForRoute } from './coursePack'

describe('download for this course', () => {
  it('covers the route corridor with unique tiles', () => {
    const tiles = tilesForRoute({
      waypoints: [
        { lat: 50.6622, lon: -1.5908 },
        { lat: 50.7075, lon: -1.5508 },
      ],
      minZoom: 10,
      maxZoom: 12,
      bufferNm: 1,
    })
    expect(tiles.length).toBeGreaterThan(4)
    const keys = new Set(tiles.map((t) => `${t.z}/${t.x}/${t.y}`))
    expect(keys.size).toBe(tiles.length)
    expect(tiles.every((t) => t.z >= 10 && t.z <= 12)).toBe(true)
  })

  it('estimates pack size so the skipper can see the download cost', () => {
    const estimate = estimateCoursePack({
      tileCount: 100,
      markCount: 40,
      bytesPerTile: 20_000,
    })
    expect(estimate.bytesEstimate).toBeGreaterThan(2_000_000)
    expect(estimate.label).toMatch(/MB/)
  })

  it('uses a wider corridor than the rhumb line so the chart is usable when set down', () => {
    const tight = tilesForRoute({
      waypoints: [
        { lat: 50.7, lon: -1.55 },
        { lat: 50.7, lon: -1.45 },
      ],
      minZoom: 12,
      maxZoom: 12,
      bufferNm: 0.1,
    })
    const wide = tilesForRoute({
      waypoints: [
        { lat: 50.7, lon: -1.55 },
        { lat: 50.7, lon: -1.45 },
      ],
      minZoom: 12,
      maxZoom: 12,
      bufferNm: 2,
    })
    expect(wide.length).toBeGreaterThan(tight.length)
  })
})
