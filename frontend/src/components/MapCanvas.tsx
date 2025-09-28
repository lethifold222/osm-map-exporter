import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { MapData, LayerType, StylePreset } from '../lib/types'
import { osmApi } from '../lib/api'

// Import Leaflet Draw
import 'leaflet-draw'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface MapCanvasProps {
  mapData: MapData | null
  selectedLayers: LayerType[]
  stylePreset: StylePreset
  onDataExtracted: (data: MapData) => void
  onLoadingChange: (loading: boolean) => void
  onError: (error: string) => void
}

const MapCanvas: React.FC<MapCanvasProps> = ({
  mapData,
  selectedLayers,
  stylePreset,
  onDataExtracted,
  onLoadingChange,
  onError
}) => {
  const [map, setMap] = useState<L.Map | null>(null)
  const [drawnArea, setDrawnArea] = useState<L.Rectangle | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleMapCreated = (mapInstance: L.Map) => {
    setMap(mapInstance)
    
    // Add draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1
          }
        },
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        polyline: false
      },
      edit: {
        featureGroup: new L.FeatureGroup(),
        remove: true
      }
    })
    
    mapInstance.addControl(drawControl)
    
    // Handle draw events
    mapInstance.on(L.Draw.Event.CREATED, (event: any) => {
      const { layer, layerType } = event
      
      if (layerType === 'rectangle') {
        setDrawnArea(layer)
        const bounds = layer.getBounds()
        const bbox = {
          min_lon: bounds.getWest(),
          min_lat: bounds.getSouth(),
          max_lon: bounds.getEast(),
          max_lat: bounds.getNorth()
        }
        
        extractDataForArea(bbox)
      }
    })
  }

  const extractDataForArea = async (bbox: any) => {
    try {
      onLoadingChange(true)
      const data = await osmApi.extractData({
        bbox,
        layers: selectedLayers
      })
      onDataExtracted(data)
    } catch (error) {
      onError('Տվյալների բեռնման սխալ / Error loading data: ' + (error as Error).message)
    } finally {
      onLoadingChange(false)
    }
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    
    try {
      onLoadingChange(true)
      // Use Nominatim for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
      )
      const results = await response.json()
      
      if (results.length > 0) {
        const result = results[0]
        const bbox = {
          min_lon: parseFloat(result.boundingbox[2]),
          min_lat: parseFloat(result.boundingbox[0]),
          max_lon: parseFloat(result.boundingbox[3]),
          max_lat: parseFloat(result.boundingbox[1])
        }
        
        // Center map on result
        if (map) {
          map.setView([parseFloat(result.lat), parseFloat(result.lon)], 13)
        }
        
        await extractDataForArea(bbox)
      } else {
        onError('Տեղանք չի գտնվել / Location not found')
      }
    } catch (error) {
      onError('Որոնման սխալ / Search error: ' + (error as Error).message)
    } finally {
      onLoadingChange(false)
    }
  }

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

  return (
    <div className="relative h-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000]">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            placeholder="Որոնել տեղանք / Search location..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Որոնել / Search
          </button>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[40.1776, 44.5126]} // Yerevan, Armenia
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        whenCreated={handleMapCreated}
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

export default MapCanvas
