import { describe, expect, it } from 'vitest'
import { evaluateDepth, requiredChartedDepthM } from './ukc'

describe('under-keel clearance', () => {
  it('requires draught plus UKC when tide above chart datum is zero', () => {
    expect(
      requiredChartedDepthM({
        draughtM: 1.82,
        ukcM: 0.5,
        tideAboveDatumM: 0,
      }),
    ).toBe(2.32)
  })

  it('reduces required charted depth as the tide rises', () => {
    expect(
      requiredChartedDepthM({
        draughtM: 1.82,
        ukcM: 0.5,
        tideAboveDatumM: 1.2,
      }),
    ).toBeCloseTo(1.12)
  })

  it('treats missing tide as unknown, not safe', () => {
    const result = evaluateDepth({
      chartedDepthM: 3,
      draughtM: 1.82,
      ukcM: 0.5,
      tideAboveDatumM: null,
      datum: 'lat',
    })
    expect(result.status).toBe('unknown')
    expect(result.safe).toBe(false)
  })

  it('refuses to treat a mean-sea-level grid as LAT charted depth', () => {
    const result = evaluateDepth({
      chartedDepthM: 5,
      draughtM: 1.82,
      ukcM: 0.5,
      tideAboveDatumM: 0,
      datum: 'msl',
    })
    expect(result.status).toBe('unknown')
    expect(result.reason).toMatch(/datum/i)
  })

  it('flags Ryde Sands at low water as unsafe for the standard keel', () => {
    const result = evaluateDepth({
      chartedDepthM: 0.5,
      draughtM: 1.82,
      ukcM: 0.5,
      tideAboveDatumM: 0,
      datum: 'lat',
    })
    expect(result.status).toBe('unsafe')
    expect(result.safe).toBe(false)
  })

  it('clears a 3 m LAT cell in fair weather for the standard keel', () => {
    const result = evaluateDepth({
      chartedDepthM: 3,
      draughtM: 1.82,
      ukcM: 0.5,
      tideAboveDatumM: 0,
      datum: 'lat',
    })
    expect(result.status).toBe('ok')
    expect(result.safe).toBe(true)
  })

  it('treats missing charted depth as unknown', () => {
    const result = evaluateDepth({
      chartedDepthM: null,
      draughtM: 1.82,
      ukcM: 0.5,
      tideAboveDatumM: 0,
      datum: 'lat',
    })
    expect(result.status).toBe('unknown')
  })
})
