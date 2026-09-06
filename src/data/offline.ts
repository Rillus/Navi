import { bboxForWaypoints, estimateCoursePack, tilesForRoute, type CoursePack } from '../domain/coursePack'
import type { Route } from '../domain/route'
import { naviDb } from './db'
import { fetchSeamarks } from './overpass'
import { OPENFREEMAP_DAY, OPENSEAMAP_TILES } from '../coverage'
import { fetchWind } from './weather'

const COURSE_CACHE = 'navi-course'

export type DownloadProgress = {
  done: number
  total: number
  label: string
}

function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
}

async function vectorTemplates(styleUrl: string): Promise<string[]> {
  const response = await fetch(styleUrl)
  if (!response.ok) return []
  const style = (await response.json()) as {
    sources?: Record<string, { tiles?: string[] }>
  }
  const templates: string[] = []
  for (const source of Object.values(style.sources ?? {})) {
    templates.push(...(source.tiles ?? []))
  }
  return templates
}

export async function downloadCoursePack(
  route: Route,
  onProgress: (progress: DownloadProgress) => void,
): Promise<CoursePack> {
  const tiles = tilesForRoute({
    waypoints: route.waypoints,
    minZoom: 8,
    maxZoom: 13,
    bufferNm: 1.5,
  })
  onProgress({ done: 0, total: tiles.length + 2, label: 'Fetching marks and wind' })

  const [marks, templates] = await Promise.all([
    fetchSeamarks(route.waypoints),
    vectorTemplates(OPENFREEMAP_DAY),
  ])
  await naviDb.saveMarks(marks)
  try {
    const mid = route.waypoints[Math.floor(route.waypoints.length / 2)] ?? route.waypoints[0]
    if (mid) await fetchWind(mid)
  } catch {
    /* wind is optional for the pack */
  }

  const cache = await caches.open(COURSE_CACHE)
  const urls: string[] = [OPENFREEMAP_DAY]
  for (const tile of tiles) {
    for (const template of templates) {
      urls.push(tileUrl(template, tile.z, tile.x, tile.y))
    }
    urls.push(tileUrl(OPENSEAMAP_TILES, tile.z, tile.x, tile.y))
  }

  const unique = [...new Set(urls)]
  let done = 0
  for (const url of unique) {
    try {
      const response = await fetch(url, { mode: 'cors' })
      if (response.ok) await cache.put(url, response.clone())
    } catch {
      /* skip a failed tile; pack still usable with holes */
    }
    done += 1
    if (done % 8 === 0 || done === unique.length) {
      onProgress({ done, total: unique.length, label: `Caching chart tiles ${done}/${unique.length}` })
    }
  }

  const estimate = estimateCoursePack({ tileCount: tiles.length, markCount: marks.length })
  const pack: CoursePack = {
    id: `pack-${route.id}`,
    routeId: route.id,
    createdAtUtc: new Date().toISOString(),
    bbox: bboxForWaypoints(route.waypoints),
    minZoom: 8,
    maxZoom: 13,
    tileCount: tiles.length,
    markCount: marks.length,
    weatherIssuedAtUtc: new Date().toISOString(),
    tideIssuedAtUtc: null,
    bytesEstimate: estimate.bytesEstimate,
  }
  await naviDb.saveCoursePack(pack)
  await naviDb.saveRoute(route)
  return pack
}

export async function deleteCoursePack(id: string) {
  await naviDb.deleteCoursePack(id)
}
