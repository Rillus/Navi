export type HazardType = 'shoal' | 'bridge' | 'wreck' | 'tss'

export type Hazard = {
  id: string
  type: HazardType
  name: string
  lat: number
  lon: number
  chartedDepthM?: number | null
  airClearanceM?: number | null
  radiusNm?: number
}

/** Approximate drying patch east of Ryde, Isle of Wight — sample LAT sounding for tests, not a chart. */
export const RYDE_SANDS: Hazard = {
  id: 'ryde-sands',
  type: 'shoal',
  name: 'Ryde Sands',
  lat: 50.738,
  lon: -1.14,
  chartedDepthM: 0.5,
  radiusNm: 0.8,
}

export const SAMPLE_HAZARDS: Hazard[] = [
  RYDE_SANDS,
  {
    id: 'shingles',
    type: 'shoal',
    name: 'The Shingles',
    lat: 50.69,
    lon: -1.59,
    chartedDepthM: 0.4,
    radiusNm: 0.6,
  },
]
