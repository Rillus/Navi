export type OsmTags = Record<string, string>

export type RawSeamark = {
  id: string
  lat: number
  lon: number
  tags: OsmTags
}

export type LightAttrs = {
  character?: string
  colour?: string
  periodS?: number
  group?: number | string
  morse?: string
}

export type DayCard = {
  name: string
  type: string
  category: string
  colour: string
  shape: string
  topmark: string
  complete: boolean
}

export type NightCard = {
  lit: boolean
  lightString: string
  character?: string
  colour?: string
  periodS?: number
  rangeNm?: number
}

export type ParsedSeamark = {
  id: string
  lat: number
  lon: number
  day: DayCard
  night: NightCard
  tags: OsmTags
}

const COLOUR_ABBR: Record<string, string> = {
  white: 'W',
  red: 'R',
  green: 'G',
  yellow: 'Y',
  blue: 'Bu',
  amber: 'Am',
}

const Q_FAMILY = new Set(['Q', 'VQ', 'UQ'])

export function formatLightString(light: LightAttrs): string {
  const character = light.character?.trim() || 'Fl'
  const group =
    light.group != null && String(light.group).length > 0 ? `(${light.group})` : ''
  const morse = light.morse ? `(${light.morse})` : ''
  const colourAbbr = light.colour ? COLOUR_ABBR[light.colour.toLowerCase()] : undefined
  const omitWhiteQ = Boolean(colourAbbr === 'W' && Q_FAMILY.has(character) && light.group)
  const colourPart = colourAbbr && !omitWhiteQ ? `.${colourAbbr}` : ''
  const periodPart = light.periodS != null ? `${light.periodS}s` : ''
  return `${character}${group}${morse}${colourPart}${periodPart ? (colourPart ? `.${periodPart}` : periodPart) : ''}`
    .replace('..', '.')
}

export function parseSeamark(raw: RawSeamark): ParsedSeamark {
  const tags = raw.tags
  const type = tags['seamark:type'] ?? 'unknown'
  const name = tags['seamark:name'] ?? tags.name ?? type
  const objectKey = objectKeyFor(type)
  const colour =
    tags[`seamark:${objectKey}:colour`] ??
    tags['seamark:buoy_lateral:colour'] ??
    tags['seamark:buoy_cardinal:colour'] ??
    tags['seamark:light:colour'] ??
    'unknown'
  const category =
    tags[`seamark:${objectKey}:category`] ??
    tags['seamark:buoy_lateral:category'] ??
    tags['seamark:buoy_cardinal:category'] ??
    'unknown'
  const shape =
    tags[`seamark:${objectKey}:shape`] ??
    tags['seamark:buoy_lateral:shape'] ??
    tags['seamark:topmark:shape'] ??
    'unknown'
  const topmark = tags['seamark:topmark:shape'] ?? 'none'
  const complete = colour !== 'unknown' || Boolean(tags['seamark:light:character'])

  const character = tags['seamark:light:character']
  const lightColour = tags['seamark:light:colour']
  const period = parseNumber(tags['seamark:light:period'])
  const rangeNm = parseNumber(tags['seamark:light:range'])
  const group = tags['seamark:light:group']
  const morse = tags['seamark:light:morse']
  const lit = Boolean(character || lightColour || period)

  return {
    id: raw.id,
    lat: raw.lat,
    lon: raw.lon,
    tags,
    day: {
      name,
      type,
      category,
      colour,
      shape,
      topmark,
      complete,
    },
    night: lit
      ? {
          lit: true,
          lightString: formatLightString({
            character,
            colour: lightColour,
            periodS: period,
            group,
            morse,
          }),
          character,
          colour: lightColour,
          periodS: period,
          rangeNm,
        }
      : {
          lit: false,
          lightString: 'unlit in dataset',
        },
  }
}

function objectKeyFor(type: string): string {
  if (type.startsWith('buoy_')) return type
  if (type.startsWith('light_')) return 'light'
  return type
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value) return undefined
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : undefined
}
