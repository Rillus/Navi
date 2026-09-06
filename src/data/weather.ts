import type { LatLon } from '../domain/geo'

export type WindSample = {
  speedKn: number
  gustKn: number | null
  directionDeg: number
  issuedAtUtc: string
  source: string
}

const WEATHER_KEY = 'navi-weather'

export async function fetchWind(point: LatLon): Promise<WindSample> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(point.lat))
  url.searchParams.set('longitude', String(point.lon))
  url.searchParams.set('current', 'wind_speed_10m,wind_direction_10m,wind_gusts_10m')
  url.searchParams.set('wind_speed_unit', 'kn')
  url.searchParams.set('timezone', 'UTC')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Open-Meteo ${response.status}`)
  const data = (await response.json()) as {
    current?: {
      time?: string
      wind_speed_10m?: number
      wind_direction_10m?: number
      wind_gusts_10m?: number
    }
  }
  const current = data.current
  if (!current || current.wind_speed_10m == null || current.wind_direction_10m == null) {
    throw new Error('Open-Meteo returned no wind')
  }
  const sample: WindSample = {
    speedKn: current.wind_speed_10m,
    gustKn: current.wind_gusts_10m ?? null,
    directionDeg: current.wind_direction_10m,
    issuedAtUtc: current.time ? `${current.time}:00.000Z` : new Date().toISOString(),
    source: 'Open-Meteo',
  }
  localStorage.setItem(WEATHER_KEY, JSON.stringify(sample))
  return sample
}

export function loadCachedWind(): WindSample | null {
  const raw = localStorage.getItem(WEATHER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WindSample
  } catch {
    return null
  }
}

export function windIsStale(sample: WindSample, nowMs = Date.now()): boolean {
  return nowMs - Date.parse(sample.issuedAtUtc) > 6 * 3600_000
}
