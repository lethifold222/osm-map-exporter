import React, { useEffect, useRef, useState } from 'react'
import { MapData, LayerType } from '../lib/types'

interface SimpleMapProps {
  mapData: MapData | null
  selectedLayers: LayerType[]
  stylePreset: string
  selectedPOICategories: string[]
  onMapCenterChange?: (center: { lat: number; lon: number }) => void
}

const SimpleMap: React.FC<SimpleMapProps> = ({ mapData, selectedLayers, selectedPOICategories, onMapCenterChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mapCenter, setMapCenter] = useState({ lat: 40.1872, lon: 44.5152 }) // Yerevan center
  const [zoom, setZoom] = useState(12)
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  console.log('🗺️ SimpleMap render - mapData:', mapData)
  console.log('🗺️ SimpleMap render - selectedLayers:', selectedLayers)

  // Convert lat/lon to pixel coordinates
  const latLonToPixel = (lat: number, lon: number, canvasWidth: number, canvasHeight: number) => {
    const x = ((lon - mapCenter.lon) * Math.cos(mapCenter.lat * Math.PI / 180) * 111320 * zoom + canvasWidth / 2)
    const y = ((mapCenter.lat - lat) * 111320 * zoom + canvasHeight / 2)
    return { x, y }
  }

  // Convert lat/lon to tile coordinates
  const deg2num = (lat: number, lon: number, zoom: number) => {
    const lat_rad = lat * Math.PI / 180
    const n = Math.pow(2, zoom)
    const x = Math.floor((lon + 180) / 360 * n)
    const y = Math.floor((1 - Math.asinh(Math.tan(lat_rad)) / Math.PI) / 2 * n)
    return { x, y }
  }

  // Convert tile coordinates to pixel coordinates
  const tileToPixel = (tileX: number, tileY: number, tileSize: number) => {
    return {
      x: tileX * tileSize,
      y: tileY * tileSize
    }
  }

  // Load and draw OSM tiles
  const drawOSMTiles = async (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const tileSize = 256
    const tileZoom = Math.max(8, Math.min(18, Math.floor(zoom))) // Clamp zoom level
    
    // Calculate visible tile bounds
    const centerTile = deg2num(mapCenter.lat, mapCenter.lon, tileZoom)
    const tilesX = Math.ceil(width / tileSize) + 2
    const tilesY = Math.ceil(height / tileSize) + 2
    
    const startX = centerTile.x - Math.floor(tilesX / 2)
    const startY = centerTile.y - Math.floor(tilesY / 2)
    
    console.log('🗺️ Loading OSM tiles for zoom:', tileZoom, 'center:', centerTile)
    
    // Draw tiles
    for (let x = 0; x < tilesX; x++) {
      for (let y = 0; y < tilesY; y++) {
        const tileX = startX + x
        const tileY = startY + y
        
        // Calculate pixel position
        const pixelPos = tileToPixel(x, y, tileSize)
        
        try {
          // Load OSM tile
          const tileUrl = `https://tile.openstreetmap.org/${tileZoom}/${tileX}/${tileY}.png`
          console.log('🖼️ Loading tile:', tileUrl)
          
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
                      await new Promise((resolve) => {
            img.onload = () => {
              try {
                ctx.drawImage(img, pixelPos.x, pixelPos.y, tileSize, tileSize)
                resolve(true)
              } catch (error) {
                console.log('❌ Error drawing tile:', error)
                // Fallback: draw placeholder
                drawTilePlaceholder(ctx, pixelPos.x, pixelPos.y, tileSize, tileX, tileY)
                resolve(true)
              }
            }
            img.onerror = () => {
              console.log('❌ Failed to load tile:', tileUrl)
              // Draw placeholder
              drawTilePlaceholder(ctx, pixelPos.x, pixelPos.y, tileSize, tileX, tileY)
              resolve(true)
            }
            img.src = tileUrl
          })
        } catch (error) {
          console.log('❌ Error loading tile:', error)
          // Draw placeholder
          drawTilePlaceholder(ctx, pixelPos.x, pixelPos.y, tileSize, tileX, tileY)
        }
      }
    }
  }

  // Draw tile placeholder when OSM tile fails to load
  const drawTilePlaceholder = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tileX: number, tileY: number) => {
    // Draw tile background
    ctx.fillStyle = '#f2efe9'
    ctx.fillRect(x, y, size, size)
    
    // Draw tile border
    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 1
    ctx.strokeRect(x, y, size, size)
    
    // Draw tile coordinates
    ctx.fillStyle = '#666'
    ctx.font = '10px Arial'
    ctx.fillText(`${tileX},${tileY}`, x + 5, y + 15)
    
    // Draw OSM text
    ctx.fillStyle = '#999'
    ctx.font = '12px Arial'
    ctx.fillText('OSM', x + size/2 - 15, y + size/2)
  }

  // Draw the map
  const drawMap = async () => {
    console.log('🎨 Drawing map...')
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('❌ No canvas element')
      return
    }
    if (!mapData) {
      console.log('❌ No mapData')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.log('❌ No canvas context')
      return
    }

    const { width, height } = canvas
    console.log('📐 Canvas size:', width, 'x', height)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw OSM tiles
    await drawOSMTiles(ctx, width, height)

    // Draw roads
    if (selectedLayers.includes('roads') && mapData.layers.roads?.features) {
      console.log('🛣️ Drawing roads:', mapData.layers.roads.features.length)
      let drawnCount = 0
      
      // Draw all roads, not just those in viewport
      mapData.layers.roads.features.forEach((feature: any) => {
        if (feature.geometry?.type === 'LineString' && feature.geometry.coordinates) {
          // Determine road style based on highway type
          const highwayType = feature.properties?.highway || 'unknown'
          let strokeStyle = '#ff6b6b'
          let lineWidth = 2
          
          switch (highwayType) {
            case 'motorway':
            case 'trunk':
              strokeStyle = '#8B0000' // Dark red for major highways
              lineWidth = 4
              break
            case 'primary':
              strokeStyle = '#FF4500' // Orange red for primary roads
              lineWidth = 3
              break
            case 'secondary':
              strokeStyle = '#FF6347' // Tomato for secondary roads
              lineWidth = 2.5
              break
            case 'tertiary':
              strokeStyle = '#FF7F50' // Coral for tertiary roads
              lineWidth = 2
              break
            case 'residential':
            case 'unclassified':
              strokeStyle = '#FFA07A' // Light salmon for residential
              lineWidth = 1.5
              break
            default:
              strokeStyle = '#ff6b6b' // Default red
              lineWidth = 1
          }
          
          ctx.strokeStyle = strokeStyle
          ctx.lineWidth = lineWidth
          ctx.setLineDash([])
          
          ctx.beginPath()
          let firstPoint = true
          feature.geometry.coordinates.forEach((coord: number[]) => {
            const [lon, lat] = coord
            const pos = latLonToPixel(lat, lon, width, height)
            
            // Draw all road segments, even if outside viewport
            if (firstPoint) {
              ctx.moveTo(pos.x, pos.y)
              firstPoint = false
            } else {
              ctx.lineTo(pos.x, pos.y)
            }
          })
          ctx.stroke()
          drawnCount++
        }
      })
      console.log('✅ Drew', drawnCount, 'roads (all segments)')
    }

    // Draw buildings
    if (selectedLayers.includes('buildings') && mapData.layers.buildings?.features) {
      console.log('🏢 Drawing buildings:', mapData.layers.buildings.features.length)
      let drawnCount = 0
      mapData.layers.buildings.features.slice(0, 200).forEach((feature: any) => {
        if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates) {
          const coords = feature.geometry.coordinates[0] // First ring
          if (coords && coords.length > 0) {
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)'
            ctx.strokeStyle = '#666'
            ctx.lineWidth = 1
            
            ctx.beginPath()
            coords.forEach((coord: number[], i: number) => {
              const [lon, lat] = coord
              const pos = latLonToPixel(lat, lon, width, height)
              
              if (i === 0) {
                ctx.moveTo(pos.x, pos.y)
              } else {
                ctx.lineTo(pos.x, pos.y)
              }
            })
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
            drawnCount++
          }
        }
      })
      console.log('✅ Drew', drawnCount, 'buildings')
    }

    // Bounding box removed as requested

    // Draw amenities
    if (selectedLayers.includes('amenities') && mapData.layers.amenities?.features) {
      console.log('🏪 Drawing amenities:', mapData.layers.amenities.features.length)
      console.log('🏪 Selected POI categories for amenities:', selectedPOICategories)
      
      // Debug: collect all amenity types
      const amenityTypes = new Set()
      mapData.layers.amenities.features.slice(0, 200).forEach((feature: any) => {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          const amenityType = feature.properties?.amenity
          if (amenityType) {
            amenityTypes.add(amenityType)
          }
        }
      })
      console.log('🏪 Available amenity types:', Array.from(amenityTypes).slice(0, 20))
      
      let drawnCount = 0
      let totalAmenities = 0
      
      mapData.layers.amenities.features.slice(0, 200).forEach((feature: any) => {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          const amenityType = feature.properties?.amenity || 'other'
          totalAmenities++
          
          // Only draw if this amenity type is selected (or if no categories selected, show all)
          if (selectedPOICategories.length === 0 || selectedPOICategories.includes(amenityType)) {
            console.log('🏪 Drawing amenity:', amenityType)
            const [lon, lat] = feature.geometry.coordinates
            const pos = latLonToPixel(lat, lon, width, height)
            
            if (pos.x >= -10 && pos.x <= width + 10 && pos.y >= -10 && pos.y <= height + 10) {
              // Color based on amenity type
              let color = '#4ecdc4' // Default teal
              
              switch (amenityType) {
                case 'restaurant':
                case 'cafe':
                case 'bar':
                  color = '#ff6b6b' // Red
                  break
                case 'school':
                case 'university':
                case 'college':
                  color = '#4ecdc4' // Teal
                  break
                case 'hospital':
                case 'clinic':
                case 'pharmacy':
                  color = '#ff9ff3' // Pink
                  break
                case 'bank':
                case 'atm':
                  color = '#feca57' // Yellow
                  break
                case 'fuel':
                case 'parking':
                  color = '#ff9ff3' // Pink
                  break
                default:
                  color = '#4ecdc4' // Teal
              }
              
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI)
              ctx.fill()
              
              // Add white border
              ctx.strokeStyle = '#ffffff'
              ctx.lineWidth = 1
              ctx.stroke()
              
              drawnCount++
            }
          }
        }
      })
      console.log('✅ Drew', drawnCount, 'amenities (filtered by categories) out of', totalAmenities, 'total')
    }

    // Draw POIs
    if (selectedLayers.includes('pois') && mapData.layers.pois?.features) {
      console.log('📍 Drawing POIs:', mapData.layers.pois.features.length)
      console.log('📍 Selected POI categories for POIs:', selectedPOICategories)
      
      // Debug: collect all POI classes
      const poiClasses = new Set()
      mapData.layers.pois.features.slice(0, 100).forEach((feature: any) => {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          const poiClass = feature.properties?.poi_class
          if (poiClass) {
            poiClasses.add(poiClass)
          }
        }
      })
      console.log('📍 Available POI classes:', Array.from(poiClasses))
      
      let drawnCount = 0
      mapData.layers.pois.features.slice(0, 100).forEach((feature: any) => {
        if (feature.geometry?.type === 'Point' && feature.geometry.coordinates) {
          const poiClass = feature.properties?.poi_class || 'other'
          
          // Only draw if this POI class is selected (or if no categories selected, show all)
          if (selectedPOICategories.length === 0 || selectedPOICategories.includes(poiClass)) {
            const [lon, lat] = feature.geometry.coordinates
            const pos = latLonToPixel(lat, lon, width, height)
            
            if (pos.x >= -10 && pos.x <= width + 10 && pos.y >= -10 && pos.y <= height + 10) {
              // Color based on POI classification
              let color = '#ff9ff3' // Default pink
              
              switch (poiClass) {
                case 'Retail/Trade':
                  color = '#feca57' // Yellow
                  break
                case 'Hospitality':
                  color = '#ff6b6b' // Red
                  break
                case 'Education':
                  color = '#4ecdc4' // Teal
                  break
                case 'Health':
                  color = '#ff9ff3' // Pink
                  break
                case 'Finance':
                  color = '#feca57' // Yellow
                  break
                case 'Government':
                  color = '#666' // Gray
                  break
                case 'Culture/Leisure':
                  color = '#ff9ff3' // Pink
                  break
                case 'Religious':
                  color = '#8e44ad' // Purple
                  break
                case 'Transport':
                  color = '#3498db' // Blue
                  break
                case 'Services':
                  color = '#95a5a6' // Light gray
                  break
                default:
                  color = '#ff9ff3' // Pink
              }
              
              ctx.fillStyle = color
              ctx.beginPath()
              ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI)
              ctx.fill()
              
              // Add white border
              ctx.strokeStyle = '#ffffff'
              ctx.lineWidth = 1
              ctx.stroke()
              
              drawnCount++
            }
          }
        }
      })
      console.log('✅ Drew', drawnCount, 'POIs (filtered by categories)')
    }

    // Draw center marker
    const centerPos = latLonToPixel(mapCenter.lat, mapCenter.lon, width, height)
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.arc(centerPos.x, centerPos.y, 5, 0, 2 * Math.PI)
    ctx.fill()
    
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerPos.x, centerPos.y, 5, 0, 2 * Math.PI)
    ctx.stroke()
    
    console.log('🎯 Drew center marker at:', centerPos)
  }

  // Set canvas size and draw
  useEffect(() => {
    console.log('🔧 Setting up canvas...')
    const canvas = canvasRef.current
    if (!canvas) {
      console.log('❌ No canvas ref')
      return
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      console.log('📏 Canvas rect:', rect)
      
      canvas.width = rect.width
      canvas.height = rect.height
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      
      console.log('📐 Set canvas size to:', rect.width, 'x', rect.height)
      drawMap()
    }

    // Listen for custom centerMap events
    const handleCenterMap = (event: CustomEvent) => {
      console.log('🎯 Received centerMap event:', event.detail)
      const { lat, lon } = event.detail
      setMapCenter({ lat, lon })
      setZoom(12) // Reset zoom to default
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('centerMap', handleCenterMap as EventListener)
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('centerMap', handleCenterMap as EventListener)
    }
  }, [])

  // Handle mouse events - simplified approach
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🖱️ Mouse down at:', e.clientX, e.clientY)
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    e.preventDefault()
    e.stopPropagation()
    console.log('🖱️ Mouse move at:', e.clientX, e.clientY)

    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y

    console.log('🖱️ Delta movement:', deltaX, deltaY)

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      // Convert pixel movement to lat/lon movement
      const deltaLon = -deltaX / (Math.cos(mapCenter.lat * Math.PI / 180) * 111320 * zoom)
      const deltaLat = deltaY / (111320 * zoom)

      console.log('🖱️ Lat/Lon delta:', deltaLat, deltaLon)

      setMapCenter(prev => {
        const newCenter = {
          lat: Math.max(-90, Math.min(90, prev.lat + deltaLat)),
          lon: Math.max(-180, Math.min(180, prev.lon + deltaLon))
        }
        console.log('🖱️ New center:', newCenter)
        return newCenter
      })

      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🖱️ Mouse up')
    setIsDragging(false)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🖱️ Mouse leave')
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05 // Более плавный зум
    setZoom(prev => Math.max(1, Math.min(20, prev * delta)))
  }

  // Auto-center map when new data is loaded
  useEffect(() => {
    if (mapData && mapData.bbox) {
      const centerLat = (mapData.bbox.min_lat + mapData.bbox.max_lat) / 2
      const centerLon = (mapData.bbox.min_lon + mapData.bbox.max_lon) / 2
      
      console.log('🎯 Auto-centering map on:', centerLat, centerLon)
      setMapCenter({ lat: centerLat, lon: centerLon })
      setZoom(12) // Reset zoom to default
      
      if (onMapCenterChange) {
        onMapCenterChange({ lat: centerLat, lon: centerLon })
      }
    }
  }, [mapData, onMapCenterChange])

  // Simple dragging without document listeners

  // Redraw when data or settings change
  useEffect(() => {
    console.log('🔄 Data/settings changed, redrawing...')
    console.log('🔄 Selected POI categories:', selectedPOICategories)
    
    // Force immediate redraw for POI category changes
    if (mapData) {
      drawMap()
    }
  }, [mapData, selectedLayers, mapCenter, zoom, selectedPOICategories])

  if (!mapData) {
    console.log('❌ No mapData, showing placeholder')
    return (
      <div className="h-full bg-gray-200 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">🗺️ Map Area</h2>
          <p className="text-gray-500">Карта будет отображаться здесь</p>
        </div>
      </div>
    )
  }

  console.log('✅ Rendering map with data')
  return (
    <div className="h-full relative bg-gray-100">
      <canvas
        ref={canvasRef}
        className={`w-full h-full border border-gray-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none`}
        style={{ 
          minHeight: '400px',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click context menu
        onDragStart={(e) => e.preventDefault()} // Prevent drag start
      />
      
      {/* Map controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-xs text-gray-600 mb-2">
          Center: {mapCenter.lat.toFixed(4)}, {mapCenter.lon.toFixed(4)}
        </div>
        <div className="text-xs text-gray-600 mb-2">
          Zoom: {zoom.toFixed(1)}x
        </div>
        {isDragging && (
          <div className="text-xs text-blue-600 mb-2 font-medium">
            🖱️ Dragging...
          </div>
        )}
        <div className="space-y-2">
          <div className="flex gap-1">
            <button
              onClick={() => setZoom(prev => Math.max(1, prev * 0.9))}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              title="Zoom Out"
            >
              −
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
              title="Reset to 1x"
            >
              1×
            </button>
            <button
              onClick={() => setZoom(prev => Math.min(20, prev * 1.1))}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
              title="Zoom In"
            >
              +
            </button>
          </div>
          
          {/* Debug and test buttons */}
          <div className="space-y-1">
            <button
              onClick={() => {
                console.log('🔄 Force redraw')
                drawMap()
              }}
              className="w-full px-2 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
              title="Force redraw"
            >
              🔄 Redraw
            </button>
            
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() => {
                  console.log('🧪 Moving North')
                  setMapCenter(prev => ({ ...prev, lat: prev.lat + 0.01 }))
                }}
                className="px-1 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                title="Move North"
              >
                ↑
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Moving South')
                  setMapCenter(prev => ({ ...prev, lat: prev.lat - 0.01 }))
                }}
                className="px-1 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                title="Move South"
              >
                ↓
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Moving West')
                  setMapCenter(prev => ({ ...prev, lon: prev.lon - 0.01 }))
                }}
                className="px-1 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                title="Move West"
              >
                ←
              </button>
              <button
                onClick={() => {
                  console.log('🧪 Moving East')
                  setMapCenter(prev => ({ ...prev, lon: prev.lon + 0.01 }))
                }}
                className="px-1 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                title="Move East"
              >
                →
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Drag to pan • Wheel to zoom
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto">
        <div className="text-sm font-medium mb-2">Legend / Լեգենդ</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Roads / Ճանապարհներ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Buildings / Շենքեր</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-teal-400 rounded-full"></div>
            <span>Amenities / Հարմարություններ</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
            <span>POIs / Հետաքրքրության կետեր</span>
          </div>
          
          {/* Selected POI categories */}
          {selectedPOICategories.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-1">Selected Categories:</div>
              {selectedPOICategories.slice(0, 5).map(category => {
                const getCategoryInfo = (cat: string) => {
                  const categoryMap: {[key: string]: {color: string, icon: string}} = {
                    'restaurant': { color: 'bg-red-500', icon: '🍽️' },
                    'cafe': { color: 'bg-orange-500', icon: '☕' },
                    'school': { color: 'bg-blue-500', icon: '🏫' },
                    'hospital': { color: 'bg-pink-500', icon: '🏥' },
                    'pharmacy': { color: 'bg-green-500', icon: '💊' },
                    'bank': { color: 'bg-yellow-500', icon: '🏦' },
                    'Retail/Trade': { color: 'bg-purple-500', icon: '🛍️' },
                    'Education': { color: 'bg-blue-600', icon: '📚' },
                    'Health': { color: 'bg-pink-600', icon: '🏥' },
                    'Finance': { color: 'bg-yellow-600', icon: '💰' }
                  }
                  return categoryMap[cat] || { color: 'bg-gray-400', icon: '📍' }
                }
                
                const categoryInfo = getCategoryInfo(category)
                
                return (
                  <div key={category} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${categoryInfo.color}`}></div>
                    <span>{categoryInfo.icon} {category}</span>
                  </div>
                )
              })}
              {selectedPOICategories.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{selectedPOICategories.length - 5} more...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SimpleMap
