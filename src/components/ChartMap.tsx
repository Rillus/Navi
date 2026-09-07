import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { OPENFREEMAP_DAY, OPENFREEMAP_NIGHT, OPENSEAMAP_TILES, CRUISING_BOX, SOLENT_CENTER } from '../coverage'
import type { ParsedSeamark } from '../domain/lights'
import type { Route } from '../domain/route'
import type { LatLon } from '../domain/geo'
import { routesToGeoJson } from '../domain/plots'

type Props = {
  night: boolean
  plotting: boolean
  routes: Route[]
  activeRouteId: string | null
  marks: ParsedSeamark[]
  onMapClick: (point: LatLon) => void
  onSelectMark: (mark: ParsedSeamark) => void
  onSelectRoute: (id: string) => void
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

function addOverlays(
  map: maplibregl.Map,
  night: boolean,
  marks: ParsedSeamark[],
  routes: Route[],
  activeRouteId: string | null,
) {
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
    map.addSource('marks', { type: 'geojson', data: marksToGeoJson(marks) })
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
    map.addSource('route', {
      type: 'geojson',
      data: routesToGeoJson(routes, activeRouteId) as FeatureCollection,
    })
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      filter: ['==', ['get', 'kind'], 'line'],
      paint: {
        'line-color': ['case', ['get', 'active'], '#3cb4c5', '#8aa3ad'],
        'line-width': ['case', ['get', 'active'], 4, 2],
        'line-opacity': ['case', ['get', 'active'], 1, 0.55],
      },
    })
    map.addLayer({
      id: 'route-points',
      type: 'circle',
      source: 'route',
      filter: ['==', ['get', 'kind'], 'point'],
      paint: { 'circle-radius': 6, 'circle-color': '#e8c468', 'circle-stroke-width': 1, 'circle-stroke-color': '#042026' },
    })
  }
}

export function ChartMap({
  night,
  plotting,
  routes,
  activeRouteId,
  marks,
  onMapClick,
  onSelectMark,
  onSelectRoute,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const marksRef = useRef(marks)
  const routesRef = useRef(routes)
  const activeRef = useRef(activeRouteId)
  const plottingRef = useRef(plotting)
  const onMapClickRef = useRef(onMapClick)
  const onSelectMarkRef = useRef(onSelectMark)
  const onSelectRouteRef = useRef(onSelectRoute)
  marksRef.current = marks
  routesRef.current = routes
  activeRef.current = activeRouteId
  plottingRef.current = plotting
  onMapClickRef.current = onMapClick
  onSelectMarkRef.current = onSelectMark
  onSelectRouteRef.current = onSelectRoute

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
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      'bottom-right',
    )

    map.on('load', () => {
      addOverlays(map, night, marksRef.current, routesRef.current, activeRef.current)
      map.resize()
    })

    map.on('click', (event) => {
      const point = { lat: event.lngLat.lat, lon: event.lngLat.lng }
      if (plottingRef.current) {
        onMapClickRef.current(point)
        return
      }
      const routeHit = map.queryRenderedFeatures(event.point, { layers: ['route-line'] })
      const routeId = routeHit[0]?.properties?.routeId
      if (typeof routeId === 'string') {
        onSelectRouteRef.current(routeId)
        return
      }
      const markHit = map.queryRenderedFeatures(event.point, { layers: ['marks-circle'] })
      const markId = markHit[0]?.properties?.id
      if (markId) {
        const mark = marksRef.current.find((item) => item.id === markId)
        if (mark) {
          onSelectMarkRef.current(mark)
          return
        }
      }
      onMapClickRef.current(point)
    })

    const onResize = () => map.resize()
    window.addEventListener('resize', onResize)

    mapRef.current = map
    return () => {
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
    // Map is created once; night style is swapped in a later effect.
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(night ? OPENFREEMAP_NIGHT : OPENFREEMAP_DAY)
    map.once('style.load', () => {
      addOverlays(map, night, marksRef.current, routesRef.current, activeRef.current)
    })
  }, [night])

  useEffect(() => {
    const source = mapRef.current?.getSource('marks') as GeoJSONSource | undefined
    source?.setData(marksToGeoJson(marks))
  }, [marks])

  useEffect(() => {
    const source = mapRef.current?.getSource('route') as GeoJSONSource | undefined
    source?.setData(routesToGeoJson(routes, activeRouteId) as FeatureCollection)
  }, [routes, activeRouteId])

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas()
    if (canvas) canvas.style.cursor = plotting ? 'crosshair' : ''
  }, [plotting])

  return <div className="map-canvas" ref={containerRef} />
}
