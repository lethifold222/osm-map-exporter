import React, { useState } from 'react'
import { MapData, LayerType, StylePreset } from '../lib/types'
import { osmApi } from '../lib/api'
import StatChips from './StatChips'
import Legend from './Legend'

interface SidebarProps {
  mapData: MapData | null
  selectedLayers: LayerType[]
  onLayersChange: (layers: LayerType[]) => void
  stylePreset: StylePreset
  onStylePresetChange: (preset: StylePreset) => void
  isLoading: boolean
  error: string | null
  onError: (error: string) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  mapData,
  selectedLayers,
  onLayersChange,
  stylePreset,
  onStylePresetChange,
  isLoading,
  error,
  onError
}) => {
  const [isExporting, setIsExporting] = useState(false)
  const [exportTitle, setExportTitle] = useState('')
  const [exportSubtitle, setExportSubtitle] = useState('')

  const layerLabels = {
    roads: 'Ճանապարհներ / Roads',
    buildings: 'Շենքեր / Buildings',
    amenities: 'Հարմարություններ / Amenities',
    pois: 'Հետաքրքրության կետեր / POIs'
  }

  const presetLabels = {
    minimal: 'Մինիմալ / Minimal',
    studio: 'Ստուդիա / Studio',
    presentation: 'Ներկայացում / Presentation'
  }

  const handleLayerToggle = (layer: LayerType) => {
    if (selectedLayers.includes(layer)) {
      onLayersChange(selectedLayers.filter(l => l !== layer))
    } else {
      onLayersChange([...selectedLayers, layer])
    }
  }

  const handleExportPDF = async () => {
    if (!mapData) {
      onError('Նախ բեռնեք տվյալներ / Please load data first')
      return
    }

    try {
      setIsExporting(true)
      const response = await osmApi.exportPDF({
        bbox: mapData.bbox,
        title: exportTitle || 'OSM Map Export',
        subtitle: exportSubtitle,
        layers: selectedLayers,
        style_preset: stylePreset,
        legend: {
          show: true,
          north: true,
          scale: true
        }
      })
      
      // Download the file
      const link = document.createElement('a')
      link.href = response.url
      link.download = `context_maps_${exportTitle || 'export'}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      onError('PDF արտահանման սխալ / PDF export error: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPPTX = async () => {
    if (!mapData) {
      onError('Նախ բեռնեք տվյալներ / Please load data first')
      return
    }

    try {
      setIsExporting(true)
      const response = await osmApi.exportPPTX({
        bbox: mapData.bbox,
        title: exportTitle || 'OSM Map Export',
        subtitle: exportSubtitle,
        layers: selectedLayers,
        style_preset: stylePreset,
        legend: {
          show: true,
          north: true,
          scale: true
        }
      })
      
      // Download the file
      const link = document.createElement('a')
      link.href = response.url
      link.download = `context_maps_${exportTitle || 'export'}_${new Date().toISOString().split('T')[0]}.pptx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      onError('PowerPoint արտահանման սխալ / PowerPoint export error: ' + (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="w-80 bg-white shadow-lg sidebar">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold text-gray-800">
          OSM Map Exporter
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Քարտեզների արտահանիչ
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Layer Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Շերտեր / Layers
          </h3>
          <div className="space-y-2">
            {Object.entries(layerLabels).map(([key, label]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedLayers.includes(key as LayerType)}
                  onChange={() => handleLayerToggle(key as LayerType)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Style Presets */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Ոճի նախապատրաստումներ / Style Presets
          </h3>
          <div className="space-y-2">
            {Object.entries(presetLabels).map(([key, label]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="stylePreset"
                  value={key}
                  checked={stylePreset === key}
                  onChange={(e) => onStylePresetChange(e.target.value as StylePreset)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Statistics */}
        {mapData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Վիճակագրություն / Statistics
            </h3>
            <StatChips data={mapData} />
          </div>
        )}

        {/* Legend */}
        {mapData && (
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              Բացատրություն / Legend
            </h3>
            <Legend 
              selectedLayers={selectedLayers}
              stylePreset={stylePreset}
            />
          </div>
        )}

        {/* Export Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-700 mb-3">
            Արտահանում / Export
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Վերնագիր / Title
              </label>
              <input
                type="text"
                value={exportTitle}
                onChange={(e) => setExportTitle(e.target.value)}
                placeholder="Քարտեզի վերնագիր / Map title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ենթավերնագիր / Subtitle
              </label>
              <input
                type="text"
                value={exportSubtitle}
                onChange={(e) => setExportSubtitle(e.target.value)}
                placeholder="Ենթավերնագիր / Subtitle"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleExportPDF}
                disabled={isExporting || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'PDF...' : 'PDF'}
              </button>
              <button
                onClick={handleExportPPTX}
                disabled={isExporting || isLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? 'PPTX...' : 'PPTX'}
              </button>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="spinner"></div>
            <span className="text-sm">Բեռնվում է... / Loading...</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Sidebar
