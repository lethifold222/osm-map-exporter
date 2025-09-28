import React, { useState } from 'react'
import { MapData, LayerType, StylePreset } from './lib/types'
import SimpleMap from './components/SimpleMap'

function App() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [selectedLayers, setSelectedLayers] = useState<LayerType[]>(['roads', 'buildings', 'amenities', 'pois'])
  const [stylePreset, setStylePreset] = useState<StylePreset>('presentation')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPOICategories, setSelectedPOICategories] = useState<string[]>([])
  const [availablePOICategories, setAvailablePOICategories] = useState<{[key: string]: number}>({})

  const handleDataExtracted = (data: MapData) => {
    console.log('🎯 handleDataExtracted called with:', data)
    console.log('🎯 Setting mapData state...')
    setMapData(data)
    setError(null)
    console.log('🎯 mapData state should be updated now')
    
    // Extract available POI categories from the data
    const categories: {[key: string]: number} = {}
    
    // Count amenities by type
    if (data.layers.amenities?.features) {
      data.layers.amenities.features.forEach(feature => {
        const amenityType = feature.properties?.amenity
        if (amenityType) {
          categories[amenityType] = (categories[amenityType] || 0) + 1
        }
      })
    }
    
    // Count POIs by classification
    if (data.layers.pois?.features) {
      data.layers.pois.features.forEach(feature => {
        const poiClass = feature.properties?.poi_class
        if (poiClass) {
          categories[poiClass] = (categories[poiClass] || 0) + 1
        }
      })
    }
    
    // Filter categories with more than 5 items
    const filteredCategories = Object.fromEntries(
      Object.entries(categories).filter(([_, count]) => count > 5)
    )
    
    console.log('📊 Available POI categories:', filteredCategories)
    setAvailablePOICategories(filteredCategories)
    
    // Auto-select some popular categories
    const popularCategories = Object.keys(filteredCategories).filter(cat => 
      ['restaurant', 'cafe', 'school', 'hospital', 'pharmacy', 'bank', 'fuel', 'Retail/Trade', 'Education', 'Health'].includes(cat)
    )
    setSelectedPOICategories(popularCategories)
    
    // Center map on the found area
    if (data.bbox) {
      const centerLat = (data.bbox.min_lat + data.bbox.max_lat) / 2
      const centerLon = (data.bbox.min_lon + data.bbox.max_lon) / 2
      console.log('🎯 Centering map on:', centerLat, centerLon)
      
      // Force map to center on the new location
      setTimeout(() => {
        const mapComponent = document.querySelector('canvas')
        if (mapComponent) {
          // Trigger a custom event to center the map
          const event = new CustomEvent('centerMap', { 
            detail: { lat: centerLat, lon: centerLon } 
          })
          mapComponent.dispatchEvent(event)
        }
      }, 100)
    }
  }

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
  }

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setError('Խնդրում ենք մուտքագրել տեղանքի անունը / Please enter a location name')
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      setMapData(null) // Clear previous data
      
      console.log('🔍 Searching for:', query)
      
      // Predefined locations for direct OSM search
      const predefinedLocations: {[key: string]: {lat: number, lon: number, bbox: {min_lat: number, min_lon: number, max_lat: number, max_lon: number}}} = {
        'yerevan': { lat: 40.1872, lon: 44.5152, bbox: { min_lat: 40.15, min_lon: 44.45, max_lat: 40.25, max_lon: 44.6 }},
        'moscow': { lat: 55.7558, lon: 37.6176, bbox: { min_lat: 55.5, min_lon: 37.3, max_lat: 56.0, max_lon: 37.9 }},
        'paris': { lat: 48.8566, lon: 2.3522, bbox: { min_lat: 48.8, min_lon: 2.2, max_lat: 48.9, max_lon: 2.5 }},
        'london': { lat: 51.5074, lon: -0.1278, bbox: { min_lat: 51.4, min_lon: -0.3, max_lat: 51.6, max_lon: 0.1 }},
        'berlin': { lat: 52.5200, lon: 13.4050, bbox: { min_lat: 52.4, min_lon: 13.2, max_lat: 52.6, max_lon: 13.6 }},
        'new york': { lat: 40.7128, lon: -74.0060, bbox: { min_lat: 40.6, min_lon: -74.1, max_lat: 40.8, max_lon: -73.9 }},
        'tokyo': { lat: 35.6762, lon: 139.6503, bbox: { min_lat: 35.5, min_lon: 139.4, max_lat: 35.8, max_lon: 139.9 }}
      }
      
      const normalizedQuery = query.toLowerCase().trim()
      let location = predefinedLocations[normalizedQuery]
      
      if (!location) {
        // Try to find partial match
        for (const [key, loc] of Object.entries(predefinedLocations)) {
          if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
            location = loc
            break
          }
        }
      }
      
      if (location) {
        console.log('✅ Found predefined location:', location)
        await extractDataForArea(location.bbox)
      } else {
        // Fallback to Nominatim for unknown locations
        console.log('🔍 Using Nominatim for unknown location')
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1&countrycodes=`
        )
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const results = await response.json()
        console.log('📍 Geocoding results:', results)
        
        if (results.length > 0) {
          const result = results[0]
          console.log('✅ Found location:', result.display_name)
          
          const bbox = {
            min_lon: parseFloat(result.boundingbox[2]),
            min_lat: parseFloat(result.boundingbox[0]),
            max_lon: parseFloat(result.boundingbox[3]),
            max_lat: parseFloat(result.boundingbox[1])
          }
          
          console.log('📦 Bounding box:', bbox)
          await extractDataForArea(bbox)
        } else {
          setError(`Տեղանք "${query}" չի գտնվել / Location "${query}" not found`)
        }
      }
    } catch (error) {
      console.error('❌ Search error:', error)
      setError('Որոնման սխալ / Search error: ' + (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const extractDataForArea = async (bbox: any) => {
    try {
      console.log('🔍 Sending request to backend:', { bbox, layers: selectedLayers })
      
      const response = await fetch('http://localhost:8000/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bbox,
          layers: selectedLayers
        })
      })
      
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📊 Received data:', data)
      console.log('📊 Summary:', data.summary)
      console.log('📊 Layers keys:', Object.keys(data.layers))
      handleDataExtracted(data)
    } catch (error) {
      console.error('❌ Error:', error)
      setError('Տվյալների բեռնման սխալ / Data loading error: ' + (error as Error).message)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Simple Sidebar */}
      <div className="w-80 bg-white shadow-lg p-4">
        <h1 className="text-xl font-bold text-gray-800 mb-4">
          OSM Map Exporter
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Քարտեզների արտահանիչ
        </p>
        
                    {/* Search */}
                    <div className="mb-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Որոնել տեղանք / Search location..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={isLoading}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isLoading) {
                              handleSearch((e.target as HTMLInputElement).value)
                            }
                          }}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          {isLoading ? (
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          ) : (
                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          const input = document.querySelector('input[type="text"]') as HTMLInputElement
                          handleSearch(input.value)
                        }}
                        disabled={isLoading}
                        className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isLoading ? 'Որոնվում է... / Searching...' : 'Որոնել / Search'}
                      </button>
                      
                      {/* Quick search examples */}
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-2">Быстрый поиск / Quick search:</div>
                        <div className="flex flex-wrap gap-1">
                          {['Yerevan', 'Moscow', 'Paris', 'London', 'Berlin', 'New York', 'Tokyo'].map((city) => (
                            <button
                              key={city}
                              onClick={() => {
                                const input = document.querySelector('input[type="text"]') as HTMLInputElement
                                input.value = city
                                handleSearch(city)
                              }}
                              disabled={isLoading}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Layers */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">Շերտեր / Layers</h3>
                      <div className="space-y-2">
                        {[
                          { key: 'roads', label: 'Ճանապարհներ / Roads', color: 'bg-red-500' },
                          { key: 'buildings', label: 'Շենքեր / Buildings', color: 'bg-gray-500' },
                          { key: 'amenities', label: 'Հարմարություններ / Amenities', color: 'bg-teal-500' },
                          { key: 'pois', label: 'POI / Points of Interest', color: 'bg-pink-500' }
                        ].map((layer) => (
                          <label key={layer.key} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedLayers.includes(layer.key as LayerType)}
                              onChange={() => {
                                if (selectedLayers.includes(layer.key as LayerType)) {
                                  setSelectedLayers(selectedLayers.filter(l => l !== layer.key))
                                } else {
                                  setSelectedLayers([...selectedLayers, layer.key as LayerType])
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className={`w-3 h-3 rounded-full ${layer.color}`}></div>
                            <span className="text-sm text-gray-700">{layer.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* POI Categories */}
                    {Object.keys(availablePOICategories).length > 0 && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-700">POI Категории / POI Categories</h3>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setSelectedPOICategories([])}
                              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                              title="Show all POI"
                            >
                              All
                            </button>
                            <button
                              onClick={() => setSelectedPOICategories(Object.keys(availablePOICategories))}
                              className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              title="Select all POI"
                            >
                              None
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {Object.entries(availablePOICategories)
                            .sort(([,a], [,b]) => b - a) // Sort by count descending
                            .map(([category, count]) => {
                              const isSelected = selectedPOICategories.includes(category)
                              const getCategoryInfo = (cat: string) => {
                                const categoryMap: {[key: string]: {label: string, color: string, icon: string}} = {
                                  'restaurant': { label: 'Рестораны / Restaurants', color: 'bg-red-500', icon: '🍽️' },
                                  'cafe': { label: 'Кафе / Cafes', color: 'bg-orange-500', icon: '☕' },
                                  'school': { label: 'Школы / Schools', color: 'bg-blue-500', icon: '🏫' },
                                  'university': { label: 'Университеты / Universities', color: 'bg-indigo-500', icon: '🎓' },
                                  'hospital': { label: 'Больницы / Hospitals', color: 'bg-pink-500', icon: '🏥' },
                                  'pharmacy': { label: 'Аптеки / Pharmacies', color: 'bg-green-500', icon: '💊' },
                                  'bank': { label: 'Банки / Banks', color: 'bg-yellow-500', icon: '🏦' },
                                  'fuel': { label: 'Заправки / Fuel Stations', color: 'bg-gray-500', icon: '⛽' },
                                  'Retail/Trade': { label: 'Торговля / Retail', color: 'bg-purple-500', icon: '🛍️' },
                                  'Education': { label: 'Образование / Education', color: 'bg-blue-600', icon: '📚' },
                                  'Health': { label: 'Здоровье / Health', color: 'bg-pink-600', icon: '🏥' },
                                  'Finance': { label: 'Финансы / Finance', color: 'bg-yellow-600', icon: '💰' },
                                  'Hospitality': { label: 'Гостеприимство / Hospitality', color: 'bg-red-600', icon: '🏨' },
                                  'Government': { label: 'Правительство / Government', color: 'bg-gray-600', icon: '🏛️' },
                                  'Culture/Leisure': { label: 'Культура/Досуг / Culture/Leisure', color: 'bg-purple-600', icon: '🎭' },
                                  'Religious': { label: 'Религиозные / Religious', color: 'bg-indigo-600', icon: '⛪' },
                                  'Transport': { label: 'Транспорт / Transport', color: 'bg-cyan-500', icon: '🚌' },
                                  'Services': { label: 'Услуги / Services', color: 'bg-teal-500', icon: '🔧' }
                                }
                                return categoryMap[cat] || { label: cat, color: 'bg-gray-400', icon: '📍' }
                              }
                              
                              const categoryInfo = getCategoryInfo(category)
                              
                              return (
                                <label key={category} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      if (isSelected) {
                                        setSelectedPOICategories(prev => prev.filter(cat => cat !== category))
                                      } else {
                                        setSelectedPOICategories(prev => [...prev, category])
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <div className={`w-3 h-3 rounded-full ${categoryInfo.color}`}></div>
                                  <span className="text-sm text-gray-700 flex-1">
                                    {categoryInfo.icon} {categoryInfo.label}
                                  </span>
                                  <span className="text-xs text-gray-500">({count})</span>
                                </label>
                              )
                            })}
                        </div>
                      </div>
                    )}

        {/* Error Status */}
        {error && (
          <div className="text-red-600 text-sm bg-red-100 p-2 rounded mb-4">
            {error}
          </div>
        )}

                    {/* Export Buttons */}
                    {mapData && (
                      <div className="mb-4 space-y-2">
                        <button 
                          onClick={() => {
                            // Export as PNG
                            const canvas = document.querySelector('canvas')
                            if (canvas) {
                              const link = document.createElement('a')
                              link.download = `osm-map-${Date.now()}.png`
                              link.href = canvas.toDataURL()
                              link.click()
                            }
                          }}
                          className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                        >
                          📄 Export PNG / Արտահանել PNG
                        </button>
                        <button 
                          onClick={() => {
                            // Export as PDF (placeholder)
                            alert('PDF export will be implemented with backend!')
                          }}
                          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                          📄 Export PDF / Արտահանել PDF
                        </button>
                        <button 
                          onClick={() => {
                            // Export as PPTX (placeholder)
                            alert('PPTX export will be implemented with backend!')
                          }}
                          className="w-full px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                        >
                          📄 Export PPTX / Արտահանել PPTX
                        </button>
                      </div>
                    )}

                    {/* Data Summary */}
                    {mapData && (
                      <div className="mt-4 p-3 bg-gray-100 rounded">
                        <h4 className="font-semibold mb-2">Վիճակագրություն / Statistics</h4>
                        <div className="text-sm">
                          <div>Ճանապարհներ / Roads: {mapData.summary.roads_km || 0} կմ</div>
                          <div>Շենքեր / Buildings: {mapData.summary.buildings_n || 0}</div>
                          <div>Հարմարություններ / Amenities: {mapData.summary.amenities_n || 0}</div>
                          <div className="mt-2">
                            <div className="font-medium">Selected POI Categories: {selectedPOICategories.length}</div>
                            <div className="text-xs text-gray-600">
                              {selectedPOICategories.length === 0 ? 'Showing all POI' : selectedPOICategories.join(', ')}
                            </div>
                          </div>
                          {mapData.summary.poi_n_by_class && Object.keys(mapData.summary.poi_n_by_class).length > 0 && (
                            <div className="mt-2">
                              <div className="font-medium">POI Classification:</div>
                              {Object.entries(mapData.summary.poi_n_by_class).map(([category, count]) => (
                                <div key={category} className="text-xs">
                                  {category}: {count}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {mapData ? (
          <div className="h-full bg-gray-100 p-4">
            <div className="bg-white rounded-lg shadow-lg h-full p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">🗺️ Interactive Map</h3>
              
              {/* Map Canvas */}
              <div className="mb-4">
                <SimpleMap 
                  mapData={mapData}
                  selectedLayers={selectedLayers}
                  stylePreset={stylePreset}
                  selectedPOICategories={selectedPOICategories}
                  onMapCenterChange={(center) => {
                    console.log('🗺️ Map center changed to:', center)
                  }}
                />
              </div>
              
              {/* Data Summary */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-100 p-3 rounded">
                  <div className="text-sm font-medium text-blue-800">Area Coordinates</div>
                  <div className="text-xs text-blue-600">
                    SW: {mapData.bbox.min_lat.toFixed(4)}, {mapData.bbox.min_lon.toFixed(4)}<br/>
                    NE: {mapData.bbox.max_lat.toFixed(4)}, {mapData.bbox.max_lon.toFixed(4)}<br/>
                    Center: {((mapData.bbox.min_lat + mapData.bbox.max_lat) / 2).toFixed(4)}, {((mapData.bbox.min_lon + mapData.bbox.max_lon) / 2).toFixed(4)}
                  </div>
                </div>
                <div className="bg-green-100 p-3 rounded">
                  <div className="text-sm font-medium text-green-800">Data Summary</div>
                  <div className="text-xs text-green-600">
                    {mapData.summary.amenities_n} amenities<br/>
                    {Object.keys(mapData.summary.poi_n_by_class || {}).length} POI categories
                  </div>
                </div>
              </div>
              
              {/* POI Classification */}
              {mapData.summary.poi_n_by_class && Object.keys(mapData.summary.poi_n_by_class).length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">POI Classification:</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(mapData.summary.poi_n_by_class).map(([category, count]) => (
                      <div key={category} className="flex justify-between py-1 border-b border-gray-200">
                        <span className="text-gray-600">{category}</span>
                        <span className="font-medium text-blue-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-600 mb-4">
                🗺️ Map Area
              </h2>
              <p className="text-gray-500 mb-4">
                Введите название места для поиска / Enter location name to search
              </p>
              <div className="text-sm text-gray-400">
                Примеры / Examples:<br/>
                Երևան, Armenia<br/>
                Moscow, Russia<br/>
                Paris, France
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
