import { buildRoute, type Route, type Waypoint } from './route'
import type { LatLon } from './geo'

export function nextPlotName(existing: string[]): string {
  const used = new Set(existing)
  let n = 1
  while (used.has(`Plot ${n}`)) n += 1
  return `Plot ${n}`
}

export function beginPlotting(
  existing: Route[],
  speedKn: number,
): { routes: Route[]; activeId: string; plotting: true } {
  const route = buildRoute({
    name: nextPlotName(existing.map((item) => item.name)),
    waypoints: [],
    speedKn,
  })
  return { routes: [...existing, route], activeId: route.id, plotting: true }
}

export function appendWaypoint(route: Route, point: LatLon, speedKn: number): Route {
  const waypoint: Waypoint = {
    lat: point.lat,
    lon: point.lon,
    name: `WP ${route.waypoints.length + 1}`,
  }
  return buildRoute({
    id: route.id,
    name: route.name,
    speedKn,
    etdUtc: route.etdUtc,
    waypoints: [...route.waypoints, waypoint],
  })
}

export function finishPlotting(): { plotting: false } {
  return { plotting: false }
}

export function renamePlot(route: Route, name: string): Route {
  const trimmed = name.trim()
  return buildRoute({
    id: route.id,
    name: trimmed.length > 0 ? trimmed : route.name,
    speedKn: route.speedKn,
    etdUtc: route.etdUtc,
    waypoints: route.waypoints,
  })
}

export function replaceActive(routes: Route[], next: Route): Route[] {
  const index = routes.findIndex((item) => item.id === next.id)
  if (index === -1) return [...routes, next]
  const copy = [...routes]
  copy[index] = next
  return copy
}

export function routesToGeoJson(
  routes: Route[],
  activeId: string | null,
): {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: { routeId: string; active: boolean; kind: 'line' | 'point'; name?: string }
    geometry:
      | { type: 'LineString'; coordinates: [number, number][] }
      | { type: 'Point'; coordinates: [number, number] }
  }>
} {
  const features: Array<{
    type: 'Feature'
    properties: { routeId: string; active: boolean; kind: 'line' | 'point'; name?: string }
    geometry:
      | { type: 'LineString'; coordinates: [number, number][] }
      | { type: 'Point'; coordinates: [number, number] }
  }> = []

  for (const route of routes) {
    if (route.waypoints.length === 0) continue
    const active = route.id === activeId
    if (route.waypoints.length >= 2) {
      features.push({
        type: 'Feature',
        properties: { routeId: route.id, active, kind: 'line' },
        geometry: {
          type: 'LineString',
          coordinates: route.waypoints.map((wp) => [wp.lon, wp.lat]),
        },
      })
    }
    if (active) {
      for (const [index, wp] of route.waypoints.entries()) {
        features.push({
          type: 'Feature',
          properties: {
            routeId: route.id,
            active,
            kind: 'point',
            name: wp.name ?? `WP ${index + 1}`,
          },
          geometry: { type: 'Point', coordinates: [wp.lon, wp.lat] },
        })
      }
    }
  }

  return { type: 'FeatureCollection', features }
}
