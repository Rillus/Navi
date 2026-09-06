import { describe, expect, it } from 'vitest'
import { destinationPoint, formatCourse3, rhumbBearingDegT, rhumbDistanceNm, tilesForLngLat } from './geo'

describe('rhumb-line geometry', () => {
  it('measures Needles to Hurst at about 2.8 nautical miles', () => {
    const needles = { lat: 50.6622, lon: -1.5908 }
    const hurst = { lat: 50.7075, lon: -1.5508 }
    expect(rhumbDistanceNm(needles, hurst)).toBeGreaterThan(2.5)
    expect(rhumbDistanceNm(needles, hurst)).toBeLessThan(3.5)
  })

  it('gives a north-easterly true bearing from Needles to Hurst', () => {
    const bearing = rhumbBearingDegT(
      { lat: 50.6622, lon: -1.5908 },
      { lat: 50.7075, lon: -1.5508 },
    )
    expect(bearing).toBeGreaterThan(20)
    expect(bearing).toBeLessThan(50)
  })

  it('formats a three-digit course', () => {
    expect(formatCourse3(rhumbBearingDegT({ lat: 50, lon: -1 }, { lat: 51, lon: -1 }))).toBe('000')
  })

  it('round-trips a destination point along a rhumb line', () => {
    const start = { lat: 50.7, lon: -1.5 }
    const dest = destinationPoint(start, 10, 90)
    expect(rhumbDistanceNm(start, dest)).toBeCloseTo(10, 1)
    expect(rhumbBearingDegT(start, dest)).toBeCloseTo(90, 0)
  })
})

describe('web-map tiles', () => {
  it('returns the OSM tile that contains Cowes at z=12', () => {
    const tile = tilesForLngLat({ lat: 50.766, lon: -1.298 }, 12)
    expect(tile.z).toBe(12)
    expect(tile.x).toBeGreaterThan(0)
    expect(tile.y).toBeGreaterThan(0)
  })
})
