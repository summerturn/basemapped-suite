import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Issue } from '../../types'

interface IssueMapProps {
  issues: Issue[]
  height?: string
}

export default function IssueMap({ issues, height = '400px' }: IssueMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 22,
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Remove existing markers
    const markers = document.querySelectorAll('.maplibregl-marker')
    markers.forEach((m) => m.remove())

    const bounds = new maplibregl.LngLatBounds()
    let hasMarkers = false

    issues.forEach((issue) => {
      const coords = issue.coordinates
      if (!coords || coords.length < 2) return
      const [lon, lat] = coords
      const color =
        issue.severity === 'critical' || issue.severity === 'high'
          ? '#EF4444'
          : issue.severity === 'medium'
          ? '#F59E0B'
          : '#10B981'

      const el = document.createElement('div')
      el.className = 'h-4 w-4 rounded-full border-2 border-white shadow-md'
      el.style.backgroundColor = color

      new maplibregl.Marker(el)
        .setLngLat([lon, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<div class="text-sm"><strong>${issue.issue_type}</strong><br/>${issue.message}</div>`
          )
        )
        .addTo(map)

      bounds.extend([lon, lat])
      hasMarkers = true
    })

    if (hasMarkers) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 14 })
    }
  }, [issues])

  return <div ref={mapContainer} style={{ width: '100%', height }} className="rounded-xl" />
}
