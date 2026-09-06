export type LatLon = { lat: number; lon: number }

export type TileCoord = { z: number; x: number; y: number }

const NM_IN_M = 1852
const EARTH_RADIUS_M = 6_371_000

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

/** Rhumb-line distance in nautical miles (Movable Type formula). */
export function rhumbDistanceNm(from: LatLon, to: LatLon): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLat = lat2 - lat1
  let dLon = toRad(to.lon - from.lon)
  if (Math.abs(dLon) > Math.PI) {
    dLon = dLon > 0 ? -(2 * Math.PI - dLon) : 2 * Math.PI + dLon
  }
  const dPhi = Math.log(Math.tan(Math.PI / 4 + lat2 / 2) / Math.tan(Math.PI / 4 + lat1 / 2))
  const q = Math.abs(dPhi) > 1e-12 ? dLat / dPhi : Math.cos(lat1)
  const distM = Math.sqrt(dLat * dLat + q * q * dLon * dLon) * EARTH_RADIUS_M
  return distM / NM_IN_M
}

/** Rhumb-line true bearing, 0–360. */
export function rhumbBearingDegT(from: LatLon, to: LatLon): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  let dLon = toRad(to.lon - from.lon)
  if (Math.abs(dLon) > Math.PI) {
    dLon = dLon > 0 ? -(2 * Math.PI - dLon) : 2 * Math.PI + dLon
  }
  const dPhi = Math.log(Math.tan(Math.PI / 4 + lat2 / 2) / Math.tan(Math.PI / 4 + lat1 / 2))
  const bearing = (toDeg(Math.atan2(dLon, dPhi)) + 360) % 360
  return bearing
}

export function destinationPoint(from: LatLon, distanceNm: number, bearingDegT: number): LatLon {
  const δ = (distanceNm * NM_IN_M) / EARTH_RADIUS_M
  const θ = toRad(bearingDegT)
  const φ1 = toRad(from.lat)
  const λ1 = toRad(from.lon)
  const Δφ = δ * Math.cos(θ)
  let φ2 = φ1 + Δφ
  if (Math.abs(φ2) > Math.PI / 2) {
    φ2 = φ2 > 0 ? Math.PI - φ2 : -Math.PI - φ2
  }
  const Δψ = Math.log(Math.tan(Math.PI / 4 + φ2 / 2) / Math.tan(Math.PI / 4 + φ1 / 2))
  const q = Math.abs(Δψ) > 1e-12 ? Δφ / Δψ : Math.cos(φ1)
  const Δλ = (δ * Math.sin(θ)) / q
  const λ2 = λ1 + Δλ
  return { lat: toDeg(φ2), lon: ((toDeg(λ2) + 540) % 360) - 180 }
}

export function formatCourse3(deg: number): string {
  const n = ((Math.round(deg) % 360) + 360) % 360
  return n.toString().padStart(3, '0')
}

export function tilesForLngLat(point: LatLon, z: number): TileCoord {
  const n = 2 ** z
  const x = Math.floor(((point.lon + 180) / 360) * n)
  const latRad = toRad(point.lat)
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  )
  return { z, x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

export function sampleRhumb(from: LatLon, to: LatLon, stepNm: number): LatLon[] {
  const distance = rhumbDistanceNm(from, to)
  const bearing = rhumbBearingDegT(from, to)
  const points: LatLon[] = [from]
  if (distance === 0) return points
  const steps = Math.max(1, Math.ceil(distance / stepNm))
  for (let i = 1; i < steps; i += 1) {
    points.push(destinationPoint(from, i * (distance / steps), bearing))
  }
  points.push(to)
  return points
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
