import { describe, expect, it } from 'vitest'
import { formatLightString, parseSeamark } from './lights'

describe('IALA light strings', () => {
  it('formats a simple green flash as Fl.G.5s', () => {
    expect(
      formatLightString({
        character: 'Fl',
        colour: 'green',
        periodS: 5,
      }),
    ).toBe('Fl.G.5s')
  })

  it('formats a grouped west-cardinal style light as Q(9)15s', () => {
    expect(
      formatLightString({
        character: 'Q',
        colour: 'white',
        group: 9,
        periodS: 15,
      }),
    ).toBe('Q(9)15s')
  })

  it('formats Morse A as Mo(A).W.8s', () => {
    expect(
      formatLightString({
        character: 'Mo',
        colour: 'white',
        morse: 'A',
        periodS: 8,
      }),
    ).toBe('Mo(A).W.8s')
  })

  it('does not invent a light when OSM tags have none', () => {
    const mark = parseSeamark({
      id: '1',
      lat: 50.66,
      lon: -1.59,
      tags: {
        'seamark:type': 'buoy_lateral',
        'seamark:buoy_lateral:category': 'starboard',
        'seamark:buoy_lateral:colour': 'green',
        'seamark:name': 'Example',
      },
    })
    expect(mark.night.lit).toBe(false)
    expect(mark.night.lightString).toBe('unlit in dataset')
    expect(mark.day.colour).toBe('green')
    expect(mark.day.category).toBe('starboard')
  })

  it('builds day and night cards from Needles-style lighthouse tags', () => {
    const mark = parseSeamark({
      id: 'needles',
      lat: 50.6622,
      lon: -1.5908,
      tags: {
        'seamark:type': 'light_major',
        'seamark:name': 'Needles',
        'seamark:light:character': 'Fl',
        'seamark:light:colour': 'white',
        'seamark:light:period': '20',
        'seamark:light:range': '17',
      },
    })
    expect(mark.day.name).toBe('Needles')
    expect(mark.night.lit).toBe(true)
    expect(mark.night.lightString).toBe('Fl.W.20s')
    expect(mark.night.rangeNm).toBe(17)
  })

  it('marks incomplete OSM objects as incomplete rather than guessing IALA defaults', () => {
    const mark = parseSeamark({
      id: '2',
      lat: 50.7,
      lon: -1.5,
      tags: { 'seamark:type': 'buoy_cardinal' },
    })
    expect(mark.day.complete).toBe(false)
    expect(mark.day.colour).toBe('unknown')
  })
})
