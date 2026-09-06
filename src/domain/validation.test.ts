import { describe, expect, it } from 'vitest'
import { validateRoute } from './validation'
import { buildRoute } from './route'
import { HR342_STANDARD } from './yacht'
import { RYDE_SANDS } from './hazards'

describe('route safety validation', () => {
  it('warns when a waypoint sits on Ryde Sands at low water', () => {
    const route = buildRoute({
      name: 'Across the Sands',
      waypoints: [
        { lat: 50.766, lon: -1.298, name: 'Cowes' },
        { lat: RYDE_SANDS.lat, lon: RYDE_SANDS.lon, name: 'Ryde Sands' },
      ],
      speedKn: 5.5,
    })
    const report = validateRoute(route, {
      yacht: HR342_STANDARD,
      tideAboveDatumM: 0,
      hazards: [RYDE_SANDS],
    })
    expect(report.readyToSail).toBe(false)
    expect(report.warnings.some((w) => w.code === 'shoal')).toBe(true)
  })

  it('blocks ready-to-sail when a bridge clearance is unknown', () => {
    const route = buildRoute({
      name: 'Up river',
      waypoints: [
        { lat: 51.45, lon: 0.0, name: 'Gravesend' },
        { lat: 51.508, lon: -0.088, name: 'London Bridge' },
      ],
      speedKn: 5.5,
    })
    const report = validateRoute(route, {
      yacht: HR342_STANDARD,
      tideAboveDatumM: 0,
      hazards: [
        {
          id: 'london-bridge',
          type: 'bridge',
          name: 'London Bridge',
          lat: 51.508,
          lon: -0.088,
          airClearanceM: null,
        },
      ],
    })
    expect(report.readyToSail).toBe(false)
    expect(report.warnings.some((w) => w.code === 'unknown-bridge')).toBe(true)
  })

  it('warns when a known bridge is below planning air draught', () => {
    const route = buildRoute({
      name: 'Low bridge',
      waypoints: [
        { lat: 51.49, lon: -0.12, name: 'Start' },
        { lat: 51.491, lon: -0.13, name: 'Hammersmith' },
      ],
      speedKn: 5.5,
    })
    const report = validateRoute(route, {
      yacht: HR342_STANDARD,
      tideAboveDatumM: 0,
      hazards: [
        {
          id: 'hammersmith',
          type: 'bridge',
          name: 'Hammersmith Bridge',
          lat: 51.491,
          lon: -0.13,
          airClearanceM: 12,
        },
      ],
    })
    expect(report.warnings.some((w) => w.code === 'air-draught')).toBe(true)
    expect(report.readyToSail).toBe(false)
  })

  it('allows a clear Solent hop when hazards are off-track', () => {
    const route = buildRoute({
      name: 'Needles to Hurst',
      waypoints: [
        { lat: 50.6622, lon: -1.5908, name: 'Needles' },
        { lat: 50.7075, lon: -1.5508, name: 'Hurst' },
      ],
      speedKn: 5.5,
    })
    const report = validateRoute(route, {
      yacht: HR342_STANDARD,
      tideAboveDatumM: 0,
      hazards: [RYDE_SANDS],
    })
    expect(report.readyToSail).toBe(true)
  })
})
