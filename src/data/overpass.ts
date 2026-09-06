import { parseSeamark, type ParsedSeamark, type RawSeamark } from '../domain/lights'
import { bboxForWaypoints } from '../domain/coursePack'
import type { LatLon } from '../domain/geo'
import solentMarks from '../fixtures/solent-marks.json'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export function bundledSolentMarks(): ParsedSeamark[] {
  return (solentMarks as unknown as RawSeamark[]).map(parseSeamark)
}

export async function fetchSeamarks(waypoints: LatLon[]): Promise<ParsedSeamark[]> {
  const bbox = bboxForWaypoints(waypoints, 0.08)
  const query = `
[out:json][timeout:25];
(
  nwr["seamark:type"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out center tags;
`
  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
    })
    if (!response.ok) throw new Error(`Overpass ${response.status}`)
    const data = (await response.json()) as {
      elements: Array<{
        id: number
        type: string
        lat?: number
        lon?: number
        center?: { lat: number; lon: number }
        tags?: Record<string, string>
      }>
    }
    const marks = data.elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat
        const lon = el.lon ?? el.center?.lon
        if (lat == null || lon == null || !el.tags) return null
        return parseSeamark({
          id: `${el.type}/${el.id}`,
          lat,
          lon,
          tags: el.tags,
        })
      })
      .filter((m): m is ParsedSeamark => m != null)
    return marks.length > 0 ? marks : bundledSolentMarks()
  } catch {
    return bundledSolentMarks()
  }
}
