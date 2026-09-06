import { describe, expect, it } from 'vitest'
import { bundledSolentMarks } from '../data/overpass'

describe('bundled Solent marks', () => {
  it('includes Needles with a night light string from OSM tags', () => {
    const needles = bundledSolentMarks().find((mark) => mark.day.name === 'Needles')
    expect(needles?.night.lightString).toBe('Fl.W.20s')
    expect(needles?.night.lit).toBe(true)
  })

  it('includes a starboard-hand buoy with green day colour', () => {
    const buoy = bundledSolentMarks().find((mark) => mark.day.name === 'North Sturbridge')
    expect(buoy?.day.colour).toBe('green')
    expect(buoy?.day.category).toBe('starboard')
    expect(buoy?.night.lightString).toBe('Fl.G.5s')
  })
})
