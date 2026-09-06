import { describe, expect, it } from 'vitest'
import { HR342_STANDARD, planningAirDraught, sailingDraught } from '../domain/yacht'

describe('HR 342 yacht profile', () => {
  it('uses yard standard draught of 1.82 m', () => {
    expect(HR342_STANDARD.draughtStandardM).toBe(1.82)
  })

  it('offers the 25 cm shoal keel as 1.57 m', () => {
    expect(HR342_STANDARD.draughtShoalM).toBe(1.57)
    expect(sailingDraught({ ...HR342_STANDARD, keel: 'shoal' })).toBe(1.57)
  })

  it('uses standard keel draught by default', () => {
    expect(sailingDraught(HR342_STANDARD)).toBe(1.82)
  })

  it('plans air draught with Windex, aerials and a safety margin', () => {
    expect(HR342_STANDARD.airDraughtMastExWindexM).toBe(15.92)
    expect(planningAirDraught(HR342_STANDARD)).toBe(17.5)
  })

  it('keeps hull length, beam and tankage from the yard data sheet', () => {
    expect(HR342_STANDARD.hullLengthM).toBe(10.32)
    expect(HR342_STANDARD.beamM).toBe(3.42)
    expect(HR342_STANDARD.fuelL).toBe(165)
  })
})
