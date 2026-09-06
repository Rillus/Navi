import { evaluateDepth } from './ukc'
import { rhumbDistanceNm, sampleRhumb } from './geo'
import { planningAirDraught, sailingDraught, ukcMetres, type YachtProfile } from './yacht'
import type { Hazard } from './hazards'
import type { Route } from './route'

export type WarningCode = 'shoal' | 'unknown-bridge' | 'air-draught' | 'unknown-depth'

export type RouteWarning = {
  code: WarningCode
  message: string
  hazardId?: string
}

export type ValidationReport = {
  readyToSail: boolean
  warnings: RouteWarning[]
}

export function validateRoute(
  route: Route,
  options: {
    yacht: YachtProfile
    tideAboveDatumM: number | null
    hazards: Hazard[]
  },
): ValidationReport {
  const warnings: RouteWarning[] = []
  const draughtM = sailingDraught(options.yacht)
  const ukcM = ukcMetres(options.yacht)
  const airM = planningAirDraught(options.yacht)
  const samples = sampleRoute(route)

  for (const hazard of options.hazards) {
    const radius = hazard.radiusNm ?? (hazard.type === 'bridge' ? 0.25 : 0.4)
    const near = samples.some((p) => rhumbDistanceNm(p, hazard) <= radius)
    if (!near) continue

    if (hazard.type === 'shoal' || hazard.type === 'wreck') {
      const depth = evaluateDepth({
        chartedDepthM: hazard.chartedDepthM ?? null,
        draughtM,
        ukcM,
        tideAboveDatumM: options.tideAboveDatumM,
        datum: 'lat',
      })
      if (!depth.safe || depth.status === 'unsafe') {
        warnings.push({
          code: 'shoal',
          hazardId: hazard.id,
          message: `${hazard.name} is shallower than this HR 342’s draught plus UKC.`,
        })
      }
    }

    if (hazard.type === 'bridge') {
      if (hazard.airClearanceM == null) {
        warnings.push({
          code: 'unknown-bridge',
          hazardId: hazard.id,
          message: `${hazard.name} has unknown air clearance — cannot mark ready to sail.`,
        })
      } else if (hazard.airClearanceM < airM) {
        warnings.push({
          code: 'air-draught',
          hazardId: hazard.id,
          message: `${hazard.name} (${hazard.airClearanceM} m) is below planning air draught ${airM} m.`,
        })
      }
    }
  }

  return { readyToSail: warnings.length === 0, warnings }
}

function sampleRoute(route: Route) {
  const points = [...route.waypoints]
  for (const leg of route.legs) {
    points.push(...sampleRhumb(leg.from, leg.to, 0.3))
  }
  return points
}
