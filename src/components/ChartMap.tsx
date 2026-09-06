import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { OPENFREEMAP_DAY, OPENFREEMAP_NIGHT, OPENSEAMAP_TILES, CRUISING_BOX, SOLENT_CENTER } from '../coverage'
import type { ParsedSeamark } from '../domain/lights'
import type { Route } from '../domain/route'
import type { LatLon } from '../domain/geo'

type Props = {
  night: boolean
  plotting: boolean
  route: Route | null
  marks: ParsedSeamark[]
  onMapClick: (point: LatLon) => void
  onSelectMark: (mark: ParsedSeamark) => void
}

function marksToGeoJson(marks: ParsedSeamark[]): FeatureCollection {

  return {
    type: 'FeatureCollection',
    features: marks.map((mark) => ({
      type: 'Feature',
      properties: {
        id: mark.id,
        name: mark.day.name,
        colour: mark.day.colour,
      },
      geometry: { type: 'Point', coordinates: [mark.lon, mark.lat] },
    })),
  }
}

function routeToGeoJson(route: Route | null): FeatureCollection {
  if (!route || route.waypoints.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route.waypoints.map((wp) => [wp.lon, wp.lat]),
        },
      },
      ...route.waypoints.map((wp, i) => ({
        type: 'Feature' as const,
        properties: { name: wp.name ?? `WP ${i + 1}` },
        geometry: { type: 'Point' as const, coordinates: [wp.lon, wp.lat] },
      })),
    ],
  }
}

export function ChartMap({ night, plotting, route, marks, onMapClick, onSelectMark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const marksRef = useRef(marks)
  const onMapClickRef = useRef(onMapClick)
  const onSelectMarkRef = useRef(onSelectMark)
  marksRef.current = marks
  onMapClickRef.current = onMapClick
  onSelectMarkRef.current = onSelectMark

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: night ? OPENFREEMAP_NIGHT : OPENFREEMAP_DAY,
      center: [SOLENT_CENTER.lon, SOLENT_CENTER.lat],
      zoom: 10,
      maxBounds: [
        [CRUISING_BOX.west - 0.4, CRUISING_BOX.south - 0.3],
        [CRUISING_BOX.east + 0.4, CRUISING_BOX.north + 0.3],
      ],
      attributionControl: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left',
    )
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right',
    )

    map.on('load', () => {
      map.addSource('openseamap', {
        type: 'raster',
        tiles: [OPENSEAMAP_TILES],
        tileSize: 256,
        attribution: '© OpenSeaMap',
      })
      map.addLayer({
        id: 'openseamap',
        type: 'raster',
        source: 'openseamap',
        paint: { 'raster-opacity': 0.9 },
      })
      map.addSource('marks', { type: 'geojson', data: marksToGeoJson(marksRef.current) })
      map.addLayer({
        id: 'marks-circle',
        type: 'circle',
        source: 'marks',
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'match',
            ['get', 'colour'],
            'green',
            '#2f9e6b',
            'red',
            '#d64545',
            'yellow',
            '#e8c468',
            '#cfe8ef',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#042026',
        },
      })
      map.addSource('route', { type: 'geojson', data: routeToGeoJson(null) })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        filter: ['==', '$type', 'LineString'],
        paint: { 'line-color': '#3cb4c5', 'line-width': 3 },
      })
      map.addLayer({
        id: 'route-points',
        type: 'circle',
        source: 'route',
        filter: ['==', '$type', 'Point'],
        paint: { 'circle-radius': 5, 'circle-color': '#e8c468' },
      })
    })

    map.on('click', (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ['marks-circle'] })
      const id = features[0]?.properties?.id
      if (id) {
        const mark = marksRef.current.find((item) => item.id === id)
        if (mark) {
          onSelectMarkRef.current(mark)
          return
        }
      }
      onMapClickRef.current({ lat: event.lngLat.lat, lon: event.lngLat.lng })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // Map is created once; night style is swapped in a later effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const style = night ? OPENFREEMAP_NIGHT : OPENFREEMAP_DAY
    map.setStyle(style)
    map.once('style.load', () => {
      if (!map.getSource('openseamap')) {
        map.addSource('openseamap', {
          type: 'raster',
          tiles: [OPENSEAMAP_TILES],
          tileSize: 256,
          attribution: '© OpenSeaMap',
        })
        map.addLayer({
          id: 'openseamap',
          type: 'raster',
          source: 'openseamap',
          paint: { 'raster-opacity': night ? 0.7 : 0.9 },
        })
      }
      if (!map.getSource('marks')) {
        map.addSource('marks', { type: 'geojson', data: marksToGeoJson(marksRef.current) })
        map.addLayer({
          id: 'marks-circle',
          type: 'circle',
          source: 'marks',
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'match',
              ['get', 'colour'],
              'green',
              '#2f9e6b',
              'red',
              '#d64545',
              'yellow',
              '#e8c468',
              '#cfe8ef',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#042026',
          },
        })
      }
      if (!map.getSource('route')) {
        map.addSource('route', { type: 'geojson', data: routeToGeoJson(null) })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          filter: ['==', '$type', 'LineString'],
          paint: { 'line-color': '#3cb4c5', 'line-width': 3 },
        })
        map.addLayer({
          id: 'route-points',
          type: 'circle',
          source: 'route',
          filter: ['==', '$type', 'Point'],
          paint: { 'circle-radius': 5, 'circle-color': '#e8c468' },
        })
      }
    })
  }, [night])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('marks') as GeoJSONSource | undefined
    source?.setData(marksToGeoJson(marks))
  }, [marks])

  useEffect(() => {
    const map = mapRef.current
    const source = map?.getSource('route') as GeoJSONSource | undefined
    source?.setData(routeToGeoJson(route))
  }, [route])

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = plotting ? 'crosshair' : ''
  }, [plotting])

  return <div className="map-canvas" ref={containerRef} />
}
