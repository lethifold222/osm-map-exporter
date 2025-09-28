#!/usr/bin/env python3
"""
Real OSM data extractor using Overpass API
"""

import httpx
import json
import asyncio
from typing import Dict, List, Any, Tuple
from datetime import datetime

class RealOSMExtractor:
    def __init__(self):
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        
    async def extract_data(self, bbox: Dict[str, float], layers: List[str]) -> Dict[str, Any]:
        """Extract real OSM data using Overpass API"""
        try:
            # Convert bbox to overpass format
            overpass_bbox = f"{bbox['min_lat']},{bbox['min_lon']},{bbox['max_lat']},{bbox['max_lon']}"
            
            # Build query based on requested layers
            query_parts = []
            
            if "roads" in layers:
                query_parts.append(f'way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|pedestrian|track|path|footway|cycleway|bridleway|steps)$"]({overpass_bbox});')
            
            if "buildings" in layers:
                query_parts.append(f'way["building"]({overpass_bbox});')
                
            if "amenities" in layers or "pois" in layers:
                query_parts.append(f'node["amenity"]({overpass_bbox});')
                query_parts.append(f'node["shop"]({overpass_bbox});')
                query_parts.append(f'node["tourism"]({overpass_bbox});')
                query_parts.append(f'node["leisure"]({overpass_bbox});')
                query_parts.append(f'node["healthcare"]({overpass_bbox});')
                query_parts.append(f'node["office"]({overpass_bbox});')
                query_parts.append(f'node["government"]({overpass_bbox});')
                query_parts.append(f'way["amenity"]({overpass_bbox});')
                query_parts.append(f'way["shop"]({overpass_bbox});')
                query_parts.append(f'way["tourism"]({overpass_bbox});')
                query_parts.append(f'way["leisure"]({overpass_bbox});')
                query_parts.append(f'way["healthcare"]({overpass_bbox});')
                query_parts.append(f'way["office"]({overpass_bbox});')
                query_parts.append(f'way["government"]({overpass_bbox});')
            
            if not query_parts:
                return self._create_empty_response(bbox)
            
            # Build complete query
            query = f"""
            [out:json][timeout:25];
            (
              {' '.join(query_parts)}
            );
            out geom;
            """
            
            # Make request to Overpass API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.overpass_url, data=query)
                response.raise_for_status()
                data = response.json()
            
            # Process the data
            return self._process_osm_data(data, bbox, layers)
            
        except Exception as e:
            print(f"Error extracting OSM data: {e}")
            return self._create_empty_response(bbox)
    
    def _process_osm_data(self, data: Dict, bbox: Dict[str, float], layers: List[str]) -> Dict[str, Any]:
        """Process raw OSM data into GeoJSON format"""
        elements = data.get("elements", [])
        
        result = {
            "bbox": bbox,
            "crs": "EPSG:4326",
            "summary": {
                "roads_km": 0,
                "buildings_n": 0,
                "amenities_n": 0,
                "poi_n_by_class": {}
            },
            "layers": {}
        }
        
        # Process elements by type
        roads = []
        buildings = []
        amenities = []
        pois = {}
        
        for element in elements:
            if element["type"] == "way":
                if "geometry" in element and element["geometry"]:
                    coords = element["geometry"]["coordinates"]
                    tags = element.get("tags", {})
                    
                    if "highway" in tags and "roads" in layers:
                        # Road
                        if len(coords) >= 2:
                            road_feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "LineString",
                                    "coordinates": coords
                                },
                                "properties": {
                                    "id": element["id"],
                                    "highway": tags.get("highway", "unknown"),
                                    "name": tags.get("name", ""),
                                    "oneway": tags.get("oneway", "no")
                                }
                            }
                            roads.append(road_feature)
                    
                    elif "building" in tags and "buildings" in layers:
                        # Building
                        if len(coords) >= 3:
                            # Close polygon if not already closed
                            if coords[0] != coords[-1]:
                                coords.append(coords[0])
                            
                            building_feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Polygon",
                                    "coordinates": [coords]
                                },
                                "properties": {
                                    "id": element["id"],
                                    "building": tags.get("building", "yes"),
                                    "name": tags.get("name", "")
                                }
                            }
                            buildings.append(building_feature)
                    
                    elif any(tag in tags for tag in ["amenity", "shop", "tourism", "leisure", "healthcare", "office", "government"]) and ("amenities" in layers or "pois" in layers):
                        # POI/Amenity
                        poi_class = self._classify_poi(tags)
                        if poi_class not in pois:
                            pois[poi_class] = []
                        
                        # Convert way to point (centroid)
                        if len(coords) >= 3:
                            # Calculate centroid
                            lats = [coord[1] for coord in coords]
                            lons = [coord[0] for coord in coords]
                            center_lat = sum(lats) / len(lats)
                            center_lon = sum(lons) / len(lons)
                            
                            poi_feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [center_lon, center_lat]
                                },
                                "properties": {
                                    "id": element["id"],
                                    "name": tags.get("name", ""),
                                    "amenity": tags.get("amenity", ""),
                                    "shop": tags.get("shop", ""),
                                    "tourism": tags.get("tourism", ""),
                                    "leisure": tags.get("leisure", ""),
                                    "healthcare": tags.get("healthcare", ""),
                                    "office": tags.get("office", ""),
                                    "government": tags.get("government", ""),
                                    "class": poi_class
                                }
                            }
                            pois[poi_class].append(poi_feature)
            
            elif element["type"] == "node" and ("amenities" in layers or "pois" in layers):
                # Node POI
                if "lat" in element and "lon" in element:
                    coords = [element["lon"], element["lat"]]
                    tags = element.get("tags", {})
                
                if any(tag in tags for tag in ["amenity", "shop", "tourism", "leisure", "healthcare", "office", "government"]):
                    poi_class = self._classify_poi(tags)
                    if poi_class not in pois:
                        pois[poi_class] = []
                    
                    poi_feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": coords
                        },
                        "properties": {
                            "id": element["id"],
                            "name": tags.get("name", ""),
                            "amenity": tags.get("amenity", ""),
                            "shop": tags.get("shop", ""),
                            "tourism": tags.get("tourism", ""),
                            "leisure": tags.get("leisure", ""),
                            "healthcare": tags.get("healthcare", ""),
                            "office": tags.get("office", ""),
                            "government": tags.get("government", ""),
                            "class": poi_class
                        }
                    }
                    pois[poi_class].append(poi_feature)
        
        # Build response
        if "roads" in layers:
            result["layers"]["roads"] = {
                "type": "FeatureCollection",
                "features": roads
            }
            result["summary"]["roads_km"] = len(roads) * 0.1  # Rough estimate
        
        if "buildings" in layers:
            result["layers"]["buildings"] = {
                "type": "FeatureCollection",
                "features": buildings
            }
            result["summary"]["buildings_n"] = len(buildings)
        
        if "amenities" in layers:
            all_amenities = []
            for poi_list in pois.values():
                all_amenities.extend(poi_list)
            result["layers"]["amenities"] = {
                "type": "FeatureCollection",
                "features": all_amenities
            }
            result["summary"]["amenities_n"] = len(all_amenities)
        
        if "pois" in layers:
            result["layers"]["pois"] = {}
            for poi_class, poi_list in pois.items():
                result["layers"]["pois"][poi_class] = {
                    "type": "FeatureCollection",
                    "features": poi_list
                }
            result["summary"]["poi_n_by_class"] = {k: len(v) for k, v in pois.items()}
        
        return result
    
    def _classify_poi(self, tags: Dict[str, str]) -> str:
        """Classify POI into categories"""
        classification_rules = {
            "Retail/Trade": ["shop", "amenity=marketplace", "amenity=mall"],
            "Government": ["amenity=townhall", "amenity=courthouse", "amenity=embassy", "office=government", "government"],
            "Education": ["amenity=school", "amenity=college", "amenity=university", "amenity=kindergarten", "amenity=library"],
            "Health": ["amenity=hospital", "amenity=clinic", "amenity=doctors", "amenity=dentist", "amenity=pharmacy", "healthcare"],
            "Transport": ["amenity=bus_station", "amenity=ferry_terminal", "amenity=bicycle_parking", "public_transport", "railway", "aeroway=terminal"],
            "Culture/Leisure": ["amenity=theatre", "amenity=cinema", "amenity=arts_centre", "tourism=museum", "tourism=attraction", "leisure"],
            "Hospitality": ["tourism=hotel", "tourism=guest_house", "tourism=motel", "tourism=hostel", "amenity=restaurant", "amenity=cafe", "amenity=fast_food", "amenity=bar", "amenity=pub"],
            "Finance": ["amenity=bank", "amenity=atm", "amenity=bureau_de_change"],
            "Services": ["amenity=post_office", "amenity=police", "amenity=fire_station", "amenity=car_rental", "amenity=car_wash", "office"],
            "Religious": ["amenity=place_of_worship", "religion"]
        }
        
        for category, rules in classification_rules.items():
            for rule in rules:
                if "=" in rule:
                    key, value = rule.split("=", 1)
                    if tags.get(key) == value:
                        return category
                elif rule in tags:
                    return category
        
        return "Other"
    
    def _create_empty_response(self, bbox: Dict[str, float]) -> Dict[str, Any]:
        """Create empty response when no data is found"""
        return {
            "bbox": bbox,
            "crs": "EPSG:4326",
            "summary": {
                "roads_km": 0,
                "buildings_n": 0,
                "amenities_n": 0,
                "poi_n_by_class": {}
            },
            "layers": {
                "roads": {"type": "FeatureCollection", "features": []},
                "buildings": {"type": "FeatureCollection", "features": []},
                "amenities": {"type": "FeatureCollection", "features": []},
                "pois": {}
            }
        }

# Test function
async def test_extractor():
    extractor = RealOSMExtractor()
    
    # Test with Yerevan area
    bbox = {
        "min_lon": 44.4,
        "min_lat": 40.1,
        "max_lon": 44.6,
        "max_lat": 40.2
    }
    
    result = await extractor.extract_data(bbox, ["roads", "buildings", "amenities"])
    print(f"Found {len(result['layers']['roads']['features'])} roads")
    print(f"Found {len(result['layers']['buildings']['features'])} buildings")
    print(f"Found {len(result['layers']['amenities']['features'])} amenities")

if __name__ == "__main__":
    asyncio.run(test_extractor())
