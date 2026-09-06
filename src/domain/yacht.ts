export type Keel = 'standard' | 'shoal'

export type UkcPolicy = 'fair' | 'moderate' | 'severe'

export type YachtProfile = {
  name: string
  designer: string
  hullLengthM: number
  waterlineM: number
  beamM: number
  draughtStandardM: number
  draughtShoalM: number
  keel: Keel
  sailingDraughtOverrideM: number | null
  airDraughtMastExWindexM: number
  planningAirDraughtM: number
  displacementLightT: number
  fuelL: number
  hullSpeedKn: number
  defaultPassageSpeedKn: number
  defaultMotorSpeedKn: number
  ukcFairM: number
  ukcModerateM: number
  ukcSevereM: number
  ukcPolicy: UkcPolicy
  windAdvisorySustainedKn: number
  waveAdvisoryHsM: number
}

export const HR342_STANDARD: YachtProfile = {
  name: 'Hallberg-Rassy 342',
  designer: 'Germán Frers',
  hullLengthM: 10.32,
  waterlineM: 9.09,
  beamM: 3.42,
  draughtStandardM: 1.82,
  draughtShoalM: 1.57,
  keel: 'standard',
  sailingDraughtOverrideM: null,
  airDraughtMastExWindexM: 15.92,
  planningAirDraughtM: 17.5,
  displacementLightT: 5.3,
  fuelL: 165,
  hullSpeedKn: 7.3,
  defaultPassageSpeedKn: 5.5,
  defaultMotorSpeedKn: 6.0,
  ukcFairM: 0.5,
  ukcModerateM: 1.0,
  ukcSevereM: 1.5,
  ukcPolicy: 'fair',
  windAdvisorySustainedKn: 25,
  waveAdvisoryHsM: 2.0,
}

export function sailingDraught(yacht: YachtProfile): number {
  if (yacht.sailingDraughtOverrideM != null) return yacht.sailingDraughtOverrideM
  return yacht.keel === 'shoal' ? yacht.draughtShoalM : yacht.draughtStandardM
}

export function planningAirDraught(yacht: YachtProfile): number {
  return yacht.planningAirDraughtM
}

export function ukcMetres(yacht: YachtProfile): number {
  switch (yacht.ukcPolicy) {
    case 'moderate':
      return yacht.ukcModerateM
    case 'severe':
      return yacht.ukcSevereM
    default:
      return yacht.ukcFairM
  }
}
