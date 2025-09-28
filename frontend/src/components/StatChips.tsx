import React from 'react'
import { MapData } from '../lib/types'

interface StatChipsProps {
  data: MapData
}

const StatChips: React.FC<StatChipsProps> = ({ data }) => {
  const { summary } = data

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '0'
    return new Intl.NumberFormat('hy-AM').format(num)
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {summary.roads_km !== undefined && (
        <div className="bg-blue-100 px-3 py-2 rounded-md">
          <div className="text-sm font-medium text-blue-800">
            Ճանապարհների երկարություն / Road Length
          </div>
          <div className="text-lg font-bold text-blue-900">
            {formatNumber(summary.roads_km)} կմ / km
          </div>
        </div>
      )}
      
      {summary.buildings_n !== undefined && (
        <div className="bg-green-100 px-3 py-2 rounded-md">
          <div className="text-sm font-medium text-green-800">
            Շենքերի քանակ / Buildings
          </div>
          <div className="text-lg font-bold text-green-900">
            {formatNumber(summary.buildings_n)}
          </div>
        </div>
      )}
      
      {summary.amenities_n !== undefined && (
        <div className="bg-yellow-100 px-3 py-2 rounded-md">
          <div className="text-sm font-medium text-yellow-800">
            Հարմարություններ / Amenities
          </div>
          <div className="text-lg font-bold text-yellow-900">
            {formatNumber(summary.amenities_n)}
          </div>
        </div>
      )}
      
      {summary.poi_n_by_class && (
        <div className="bg-purple-100 px-3 py-2 rounded-md">
          <div className="text-sm font-medium text-purple-800 mb-2">
            POI-ների դասակարգում / POI Classification
          </div>
          <div className="space-y-1">
            {Object.entries(summary.poi_n_by_class).map(([category, count]) => (
              <div key={category} className="flex justify-between text-xs">
                <span className="text-purple-700">{category}</span>
                <span className="font-bold text-purple-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StatChips
