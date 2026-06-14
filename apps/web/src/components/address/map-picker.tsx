'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

type Props = {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}

// Türkiye merkezi (Ankara) — başlangıç konumu yoksa
const DEFAULT_CENTER: [number, number] = [39.925, 32.8366]

/**
 * Leaflet + OpenStreetMap (API key gerekmez) sürüklenebilir iğne haritası.
 * SSR-safe: leaflet yalnızca tarayıcıda dinamik import edilir.
 */
export function MapPicker({ lat, lng, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !containerRef.current || mapRef.current) return

      const start: [number, number] =
        lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER

      const map = L.map(containerRef.current).setView(start, lat != null ? 16 : 6)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      // Görsel asset gerektirmeyen divIcon (CSP/asset sorunlarını önler)
      const pinIcon = L.divIcon({
        className: '',
        html: '<div style="font-size:30px;line-height:1;transform:translate(-50%,-100%)">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [0, 0],
      })

      const marker = L.marker(start, { draggable: true, icon: pinIcon }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const p = marker.getLatLng()
        onPickRef.current(p.lat, p.lng)
      })
      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng)
        onPickRef.current(e.latlng.lat, e.latlng.lng)
      })

      // Container ölçüsü geç oturduğunda haritayı düzelt
      setTimeout(() => map.invalidateSize(), 200)
    })()

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dışarıdan (konumumu kullan) lat/lng değişince haritayı/iğneyi taşı
  useEffect(() => {
    if (mapRef.current && markerRef.current && lat != null && lng != null) {
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.setView([lat, lng], 16)
    }
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      className="w-full h-64 rounded-md border z-0"
      style={{ minHeight: '256px' }}
      aria-label="Konum seçim haritası"
    />
  )
}
