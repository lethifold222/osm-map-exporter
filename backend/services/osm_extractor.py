import httpx
import json
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from typing import Dict, List, Any
import geopandas as gpd
from shapely.geometry import Point, LineString, Polygon
from shapely.ops import transform
import pyproj
from functools import partial
import osmnx as ox
from .overpass_queries import OverpassQueries

class OSMExtractor:
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        self.queries = OverpassQueries()
        
    async def extract_data(
        self, 
        bbox: Optional[Dict] = None, 
        polygon: Optional[str] = None,
        layers: List[str] = None
    ) -> Dict[str, Any]:
        """Extract OSM data for specified area and layers"""
        if layers is None:
            layers = ["roads", "buildings", "amenities", "pois"]
            
        # Determine bounding box
        if polygon:
            # Parse GeoJSON polygon and get bbox
            poly_data = json.loads(polygon)
            coords = poly_data["coordinates"][0]
            lons = [coord[0] for coord in coords]
            lats = [coord[1] for coord in coords]
            bbox = {
                "min_lon": min(lons),
                "min_lat": min(lats),
                "max_lon": max(lons),
                "max_lat": max(lats)
            }
        
        if not bbox:
            raise ValueError("Either bbox or polygon must be provided")
            
        # Convert bbox to overpass format
        # Handle both dict and Pydantic model
        if hasattr(bbox, 'min_lat'):
            # Pydantic model
            overpass_bbox = f"{bbox.min_lat},{bbox.min_lon},{bbox.max_lat},{bbox.max_lon}"
        else:
            # Dictionary
            overpass_bbox = f"{bbox['min_lat']},{bbox['min_lon']},{bbox['max_lat']},{bbox['max_lon']}"
        
        # Extract data for each layer
        results = {}
        summary = {}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = []
            
            if "roads" in layers:
                tasks.append(self._extract_roads(client, overpass_bbox))
            if "buildings" in layers:
                tasks.append(self._extract_buildings(client, overpass_bbox))
            if "amenities" in layers:
                tasks.append(self._extract_amenities(client, overpass_bbox))
            if "pois" in layers:
                tasks.append(self._extract_pois(client, overpass_bbox))
                
            # Execute all queries in parallel
            layer_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for i, result in enumerate(layer_results):
                if isinstance(result, Exception):
                    print(f"Error extracting layer {i}: {result}")
                    continue
                    
                if isinstance(result, tuple) and len(result) == 3:
                    layer_name, features, stats = result
                else:
                    print(f"Unexpected result format: {result}")
                    continue
                results[layer_name] = {
                    "type": "FeatureCollection",
                    "features": features
                }
                
                if layer_name == "roads":
                    summary["roads_km"] = stats.get("total_length_km", 0)
                elif layer_name == "buildings":
                    summary["buildings_n"] = stats.get("count", 0)
                elif layer_name == "amenities":
                    summary["amenities_n"] = stats.get("count", 0)
                elif layer_name == "pois":
                    summary["poi_n_by_class"] = stats.get("count_by_class", {})
        
        return {
            "bbox": bbox,
            "crs": "EPSG:4326",
            "summary": summary,
            "layers": results
        }
    
    async def _extract_roads(self, client: httpx.AsyncClient, bbox: str) -> Tuple[str, List[Dict], Dict]:
        """Extract road network data"""
        query = self.queries.get_roads_query(bbox)
        response = await client.post(self.overpass_url, data=query)
        response.raise_for_status()
        
        data = response.json()
        features = []
        total_length = 0
        
        for element in data.get("elements", []):
            if element["type"] == "way" and "geometry" in element:
                # Convert geometry from [{'lat': x, 'lon': y}] to [[lon, lat]]
                geometry_data = element["geometry"]
                if isinstance(geometry_data, list):
                    coords = [[point["lon"], point["lat"]] for point in geometry_data]
                else:
                    coords = geometry_data.get("coordinates", [])
                
                if len(coords) >= 2:
                    # Create LineString geometry
                    geometry = LineString(coords)
                    
                    # Calculate length in meters
                    length_m = self._calculate_length(geometry)
                    total_length += length_m
                    
                    # Create feature
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": coords
                        },
                        "properties": {
                            "id": element["id"],
                            "highway": element.get("tags", {}).get("highway", "unknown"),
                            "name": element.get("tags", {}).get("name", ""),
                            "length_m": length_m,
                            "oneway": element.get("tags", {}).get("oneway", "no")
                        }
                    }
                    features.append(feature)
        
        return "roads", features, {"total_length_km": total_length / 1000}
    
    async def _extract_buildings(self, client: httpx.AsyncClient, bbox: str) -> Tuple[str, List[Dict], Dict]:
        """Extract building data"""
        query = self.queries.get_buildings_query(bbox)
        response = await client.post(self.overpass_url, data=query)
        response.raise_for_status()
        
        data = response.json()
        features = []
        
        for element in data.get("elements", []):
            if element["type"] == "way" and "geometry" in element:
                # Convert geometry from [{'lat': x, 'lon': y}] to [[lon, lat]]
                geometry_data = element["geometry"]
                if isinstance(geometry_data, list):
                    coords = [[point["lon"], point["lat"]] for point in geometry_data]
                else:
                    coords = geometry_data.get("coordinates", [])
                
                if len(coords) >= 3:  # At least 3 points for a polygon
                    # Close the polygon if not already closed
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    
                    geometry = Polygon(coords)
                    
                    # Calculate area
                    area_m2 = self._calculate_area(geometry)
                    
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [coords]
                        },
                        "properties": {
                            "id": element["id"],
                            "building": element.get("tags", {}).get("building", "yes"),
                            "name": element.get("tags", {}).get("name", ""),
                            "area_m2": area_m2,
                            "levels": element.get("tags", {}).get("building:levels", "")
                        }
                    }
                    features.append(feature)
        
        return "buildings", features, {"count": len(features)}
    
    async def _extract_amenities(self, client: httpx.AsyncClient, bbox: str) -> Tuple[str, List[Dict], Dict]:
        """Extract amenity data"""
        query = self.queries.get_amenities_query(bbox)
        response = await client.post(self.overpass_url, data=query)
        response.raise_for_status()
        
        data = response.json()
        features = []
        
        for element in data.get("elements", []):
            if element["type"] in ["node", "way"] and "geometry" in element:
                # Convert geometry from [{'lat': x, 'lon': y}] to [[lon, lat]]
                geometry_data = element["geometry"]
                if isinstance(geometry_data, list):
                    coords = [[point["lon"], point["lat"]] for point in geometry_data]
                else:
                    coords = geometry_data.get("coordinates", [])
                
                # For points, use the first coordinate; for ways, use centroid
                if element["type"] == "node" and coords:
                    geometry = Point(coords[0])
                elif element["type"] == "way" and coords:
                    # For ways, create a polygon and get centroid
                    if len(coords) >= 3:
                        polygon = Polygon(coords)
                        geometry = Point(polygon.centroid.x, polygon.centroid.y)
                    else:
                        continue
                else:
                    continue
                
                feature = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": coords
                    },
                    "properties": {
                        "id": element["id"],
                        "amenity": element.get("tags", {}).get("amenity", ""),
                        "name": element.get("tags", {}).get("name", ""),
                        "shop": element.get("tags", {}).get("shop", ""),
                        "tourism": element.get("tags", {}).get("tourism", ""),
                        "leisure": element.get("tags", {}).get("leisure", ""),
                        "healthcare": element.get("tags", {}).get("healthcare", ""),
                        "office": element.get("tags", {}).get("office", ""),
                        "government": element.get("tags", {}).get("government", "")
                    }
                }
                features.append(feature)
        
        return "amenities", features, {"count": len(features)}
    
    async def _extract_pois(self, client: httpx.AsyncClient, bbox: str) -> Tuple[str, List[Dict], Dict]:
        """Extract POI data (same as amenities for now)"""
        return await self._extract_amenities(client, bbox)
    
    def _calculate_length(self, geometry: LineString) -> float:
        """Calculate length of LineString in meters"""
        # Use Web Mercator projection for accurate distance calculation
        wgs84 = pyproj.CRS('EPSG:4326')
        web_mercator = pyproj.CRS('EPSG:3857')
        project = pyproj.Transformer.from_crs(wgs84, web_mercator, always_xy=True).transform
        projected_geom = transform(project, geometry)
        return projected_geom.length
    
    def _calculate_area(self, geometry: Polygon) -> float:
        """Calculate area of Polygon in square meters"""
        # Use Web Mercator projection for accurate area calculation
        wgs84 = pyproj.CRS('EPSG:4326')
        web_mercator = pyproj.CRS('EPSG:3857')
        project = pyproj.Transformer.from_crs(wgs84, web_mercator, always_xy=True).transform
        projected_geom = transform(project, geometry)
        return projected_geom.area
