import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-draw'
import { MapData, LayerType, StylePreset } from '../lib/types'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapViewProps {
  mapData: MapData | null
  selectedLayers: LayerType[]
  stylePreset: StylePreset
}

const MapView: React.FC<MapViewProps> = ({ mapData, selectedLayers, stylePreset }) => {
  const [map, setMap] = useState<L.Map | null>(null)

  const getLayerStyle = (layerType: LayerType) => {
    const presets = {
      minimal: {
        roads: { color: '#666666', weight: 1, opacity: 0.8 },
        buildings: { color: '#000000', weight: 1, fillColor: 'transparent', opacity: 0.8 },
        amenities: { color: '#ff0000', radius: 4, opacity: 0.8 },
        pois: { color: '#0000ff', radius: 3, opacity: 0.8 }
      },
      studio: {
        roads: { color: '#999999', weight: 0.5, opacity: 0.6 },
        buildings: { color: '#333333', weight: 0.5, fillColor: '#f0f0f0', opacity: 0.6 },
        amenities: { color: '#cc0000', radius: 3, opacity: 0.7 },
        pois: { color: '#0066cc', radius: 2, opacity: 0.7 }
      },
      presentation: {
        roads: { color: '#ff0000', weight: 2, opacity: 1.0 },
        buildings: { color: '#000000', weight: 1, fillColor: '#e0e0e0', opacity: 0.9 },
        amenities: { color: '#00aa00', radius: 6, opacity: 1.0 },
        pois: { color: '#0000ff', radius: 5, opacity: 1.0 }
      }
    }
    
    return presets[stylePreset][layerType] || presets.presentation[layerType]
  }

  const renderGeoJSONLayer = (layerData: any, layerType: LayerType) => {
    if (!layerData || !layerData.features) return null

    const style = getLayerStyle(layerType)
    
    const onEachFeature = (feature: any, layer: L.Layer) => {
      if (feature.properties && feature.properties.name) {
        layer.bindPopup(feature.properties.name)
      }
    }

    return (
      <GeoJSON
        key={layerType}
        data={layerData}
        style={style}
        onEachFeature={onEachFeature}
      />
    )
  }

  // Calculate map center and bounds from bbox
  const getMapCenter = () => {
    if (mapData && mapData.bbox) {
      const centerLat = (mapData.bbox.min_lat + mapData.bbox.max_lat) / 2
      const centerLon = (mapData.bbox.min_lon + mapData.bbox.max_lon) / 2
      return [centerLat, centerLon] as [number, number]
    }
    return [40.1872, 44.5152] as [number, number] // Default to Yerevan
  }

  const getMapBounds = () => {
    if (mapData && mapData.bbox) {
      return [
        [mapData.bbox.min_lat, mapData.bbox.min_lon],
        [mapData.bbox.max_lat, mapData.bbox.max_lon]
      ] as [[number, number], [number, number]]
    }
    return null
  }

  // Update map view when data changes
  useEffect(() => {
    if (map && mapData && mapData.bbox) {
      const bounds = getMapBounds()
      if (bounds) {
        map.fitBounds(bounds, { padding: [20, 20] })
      }
    }
  }, [map, mapData])

  return (
    <div className="h-full w-full">
      <MapContainer
        center={getMapCenter()}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        whenCreated={setMap}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render selected layers */}
        {mapData && selectedLayers.map(layerType => {
          const layerData = mapData.layers[layerType]
          return renderGeoJSONLayer(layerData, layerType)
        })}
      </MapContainer>
    </div>
  )
}

export default MapView
