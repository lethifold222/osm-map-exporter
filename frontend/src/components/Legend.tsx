import React from 'react'
import { LayerType, StylePreset } from '../lib/types'

interface LegendProps {
  selectedLayers: LayerType[]
  stylePreset: StylePreset
}

const Legend: React.FC<LegendProps> = ({ selectedLayers, stylePreset }) => {
  const getLayerStyle = (layerType: LayerType) => {
    const presets = {
      minimal: {
        roads: { color: '#666666', weight: 1 },
        buildings: { color: '#000000', fillColor: 'transparent' },
        amenities: { color: '#ff0000', radius: 4 },
        pois: { color: '#0000ff', radius: 3 }
      },
      studio: {
        roads: { color: '#999999', weight: 0.5 },
        buildings: { color: '#333333', fillColor: '#f0f0f0' },
        amenities: { color: '#cc0000', radius: 3 },
        pois: { color: '#0066cc', radius: 2 }
      },
      presentation: {
        roads: { color: '#ff0000', weight: 2 },
        buildings: { color: '#000000', fillColor: '#e0e0e0' },
        amenities: { color: '#00aa00', radius: 6 },
        pois: { color: '#0000ff', radius: 5 }
      }
    }
    
    return presets[stylePreset][layerType] || presets.presentation[layerType]
  }

  const layerLabels = {
    roads: 'Ճանապարհներ / Roads',
    buildings: 'Շենքեր / Buildings',
    amenities: 'Հարմարություններ / Amenities',
    pois: 'Հետաքրքրության կետեր / POIs'
  }

  const renderLegendItem = (layerType: LayerType) => {
    const style = getLayerStyle(layerType)
    const label = layerLabels[layerType]

    if (layerType === 'roads') {
      return (
        <div key={layerType} className="flex items-center space-x-2">
          <div 
            className="w-4 h-1 bg-gray-400"
            style={{ 
              backgroundColor: style.color,
              height: `${style.weight * 2}px`
            }}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      )
    } else if (layerType === 'buildings') {
      return (
        <div key={layerType} className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 border-2"
            style={{ 
              borderColor: style.color,
              backgroundColor: style.fillColor === 'transparent' ? 'transparent' : style.fillColor
            }}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      )
    } else {
      return (
        <div key={layerType} className="flex items-center space-x-2">
          <div 
            className="rounded-full"
            style={{ 
              backgroundColor: style.color,
              width: `${style.radius}px`,
              height: `${style.radius}px`
            }}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      )
    }
  }

  return (
    <div className="space-y-2">
      {selectedLayers.map(renderLegendItem)}
      
      {/* North Arrow */}
      <div className="flex items-center space-x-2 mt-4 pt-2 border-t border-gray-200">
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-0 h-0 border-l-2 border-r-2 border-b-4 border-l-transparent border-r-transparent border-b-gray-600"></div>
        </div>
        <span className="text-sm text-gray-700">Հյուսիս / North</span>
      </div>
      
      {/* Scale Bar */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          <div className="w-8 h-1 bg-gray-600"></div>
          <div className="w-1 h-1 bg-gray-600"></div>
          <div className="w-4 h-1 bg-gray-600"></div>
          <div className="w-1 h-1 bg-gray-600"></div>
          <div className="w-8 h-1 bg-gray-600"></div>
        </div>
        <span className="text-sm text-gray-700">1 կմ / km</span>
      </div>
    </div>
  )
}

export default Legend
