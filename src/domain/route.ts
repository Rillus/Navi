import { formatCourse3, rhumbBearingDegT, rhumbDistanceNm, type LatLon } from './geo'

export type Waypoint = LatLon & { name?: string; id?: string }

export type RouteLeg = {
  from: Waypoint
  to: Waypoint
  distanceNm: number
  courseDegT: number
  courseLabel: string
  etaUtc?: string
}

export type Route = {
  id: string
  name: string
  waypoints: Waypoint[]
  speedKn: number
  etdUtc?: string
  legs: RouteLeg[]
  totals: RouteTotals
}

export type RouteTotals = {
  distanceNm: number
  durationH: number
  etaUtc?: string
}

export function buildRoute(input: {
  id?: string
  name: string
  waypoints: Waypoint[]
  speedKn: number
  etdUtc?: string
}): Route {
  const id = input.id ?? createId()
  const legs = buildLegs(input.waypoints, input.speedKn, input.etdUtc)
  const totals = totalsFromLegs(legs, input.speedKn, input.etdUtc)
  return {
    id,
    name: input.name,
    waypoints: input.waypoints,
    speedKn: input.speedKn,
    etdUtc: input.etdUtc,
    legs,
    totals,
  }
}

export function reverseRoute(route: Route): Route {
  return buildRoute({
    name: `${route.name} (return)`,
    waypoints: [...route.waypoints].reverse(),
    speedKn: route.speedKn,
    etdUtc: route.etdUtc,
  })
}

export function routeTotals(route: Route): RouteTotals {
  return route.totals
}

export function exportGpx(route: Route): string {
  const pts = route.waypoints
    .map((wp) => {
      const name = escapeXml(wp.name ?? 'Waypoint')
      return `    <rtept lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}"><name>${name}</name></rtept>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Navi" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>${escapeXml(route.name)}</name>
${pts}
  </rte>
</gpx>
`
}

export function parseGpx(xml: string): Route {
  const nameMatch = xml.match(/<name>([^<]*)<\/name>/)
  const name = nameMatch?.[1] ?? 'Imported route'
  const waypoints: Waypoint[] = []
  const re = /<(?:rtept|wpt)[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/(?:rtept|wpt)>/g
  let match: RegExpExecArray | null
  while ((match = re.exec(xml))) {
    const inner = match[3] ?? ''
    const wpName = inner.match(/<name>([^<]*)<\/name>/)?.[1]
    waypoints.push({
      lat: Number.parseFloat(match[1] ?? '0'),
      lon: Number.parseFloat(match[2] ?? '0'),
      name: wpName,
    })
  }
  return buildRoute({ name, waypoints, speedKn: 5.5 })
}

function buildLegs(waypoints: Waypoint[], speedKn: number, etdUtc?: string): RouteLeg[] {
  const legs: RouteLeg[] = []
  let elapsedH = 0
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const from = waypoints[i]
    const to = waypoints[i + 1]
    if (!from || !to) continue
    const distanceNm = rhumbDistanceNm(from, to)
    const courseDegT = rhumbBearingDegT(from, to)
    elapsedH += speedKn > 0 ? distanceNm / speedKn : 0
    legs.push({
      from,
      to,
      distanceNm,
      courseDegT,
      courseLabel: `${formatCourse3(courseDegT)}°T`,
      etaUtc: etdUtc ? addHours(etdUtc, elapsedH) : undefined,
    })
  }
  return legs
}

function totalsFromLegs(legs: RouteLeg[], speedKn: number, etdUtc?: string): RouteTotals {
  const distanceNm = legs.reduce((sum, leg) => sum + leg.distanceNm, 0)
  const durationH = speedKn > 0 ? distanceNm / speedKn : 0
  return {
    distanceNm,
    durationH,
    etaUtc: etdUtc ? addHours(etdUtc, durationH) : legs.at(-1)?.etaUtc,
  }
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3600_000).toISOString()
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `rte-${Date.now()}`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
