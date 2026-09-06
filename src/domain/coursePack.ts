import { destinationPoint, rhumbBearingDegT, sampleRhumb, tilesForLngLat, type LatLon, type TileCoord } from './geo'

export type CourseTileOptions = {
  waypoints: LatLon[]
  minZoom: number
  maxZoom: number
  bufferNm: number
}

export type CoursePackEstimate = {
  bytesEstimate: number
  label: string
}

export type CoursePack = {
  id: string
  routeId: string
  createdAtUtc: string
  bbox: { west: number; south: number; east: number; north: number }
  minZoom: number
  maxZoom: number
  tileCount: number
  markCount: number
  weatherIssuedAtUtc: string | null
  tideIssuedAtUtc: string | null
  bytesEstimate: number
}

export function tilesForRoute(options: CourseTileOptions): TileCoord[] {
  const keys = new Set<string>()
  const tiles: TileCoord[] = []
  const points = corridorPoints(options.waypoints, options.bufferNm)
  for (const point of points) {
    for (let z = options.minZoom; z <= options.maxZoom; z += 1) {
      const tile = tilesForLngLat(point, z)
      const key = `${tile.z}/${tile.x}/${tile.y}`
      if (!keys.has(key)) {
        keys.add(key)
        tiles.push(tile)
      }
    }
  }
  return tiles
}

export function estimateCoursePack(input: {
  tileCount: number
  markCount: number
  bytesPerTile?: number
}): CoursePackEstimate {
  const bytesPerTile = input.bytesPerTile ?? 18_000
  const bytesEstimate = input.tileCount * bytesPerTile + input.markCount * 2_000
  const mb = bytesEstimate / 1_000_000
  return {
    bytesEstimate,
    label: `${mb.toFixed(1)} MB`,
  }
}

export function bboxForWaypoints(waypoints: LatLon[], bufferDeg = 0.05) {
  const lats = waypoints.map((p) => p.lat)
  const lons = waypoints.map((p) => p.lon)
  return {
    south: Math.min(...lats) - bufferDeg,
    north: Math.max(...lats) + bufferDeg,
    west: Math.min(...lons) - bufferDeg,
    east: Math.max(...lons) + bufferDeg,
  }
}

function corridorPoints(waypoints: LatLon[], bufferNm: number): LatLon[] {
  const points: LatLon[] = []
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    if (!from || !to) continue
    const bearing = rhumbBearingDegT(from, to)
    for (const sample of sampleRhumb(from, to, 0.25)) {
      points.push(sample)
      if (bufferNm > 0) {
        points.push(destinationPoint(sample, bufferNm, (bearing + 90) % 360))
        points.push(destinationPoint(sample, bufferNm, (bearing + 270) % 360))
      }
    }
  }
  if (waypoints[0]) points.push(waypoints[0])
  const last = waypoints.at(-1)
  if (last) points.push(last)
  return points
}
