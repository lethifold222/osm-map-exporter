#!/usr/bin/env python3
"""
Working HTTP server for OSM Map Exporter
Returns realistic mock data for testing
"""

import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from datetime import datetime
import random

class OSMRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "ok": True,
                "timestamp": datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            # Handle root path
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>OSM Map Exporter API</title>
            </head>
            <body>
                <h1>🗺️ OSM Map Exporter API</h1>
                <p>API Server is running!</p>
                <p>Endpoints:</p>
                <ul>
                    <li>GET /api/health - Health check</li>
                    <li>POST /api/extract - Extract OSM data</li>
                    <li>POST /api/export/pdf - Export PDF</li>
                    <li>POST /api/export/pptx - Export PPTX</li>
                </ul>
            </body>
            </html>
            """
            self.wfile.write(html.encode())

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        
        # Read request body
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            request_data = json.loads(post_data.decode('utf-8'))
        except:
            request_data = {}
        
        if parsed_path.path == '/api/extract':
            print(f"🔍 Extract request received: {request_data}")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            try:
                # Get bbox and layers
                bbox = request_data.get('bbox', {
                    "min_lon": 44.5,
                    "min_lat": 40.1,
                    "max_lon": 44.6,
                    "max_lat": 40.2
                })
                layers = request_data.get('layers', ['roads', 'buildings', 'amenities', 'pois'])
                
                print(f"📍 Bbox: {bbox}")
                print(f"📊 Layers: {layers}")
                
                # Generate realistic mock data based on bbox size
                bbox_area = (bbox['max_lon'] - bbox['min_lon']) * (bbox['max_lat'] - bbox['min_lat'])
                area_factor = bbox_area * 1000  # Scale factor
                
                # Generate data
                roads_km = max(5, int(area_factor * 2))
                buildings_n = max(50, int(area_factor * 10))
                amenities_n = max(10, int(area_factor * 2))
                
                # Generate POI classification
                poi_classes = {
                    "Retail/Trade": max(2, int(amenities_n * 0.3)),
                    "Government": max(1, int(amenities_n * 0.1)),
                    "Education": max(1, int(amenities_n * 0.15)),
                    "Health": max(1, int(amenities_n * 0.1)),
                    "Transport": max(1, int(amenities_n * 0.1)),
                    "Culture/Leisure": max(1, int(amenities_n * 0.1)),
                    "Hospitality": max(1, int(amenities_n * 0.1)),
                    "Finance": max(1, int(amenities_n * 0.05)),
                    "Services": max(1, int(amenities_n * 0.05)),
                    "Religious": max(1, int(amenities_n * 0.05))
                }
                
                # Build response
                response = {
                    "bbox": bbox,
                    "crs": "EPSG:4326",
                    "summary": {
                        "roads_km": roads_km,
                        "buildings_n": buildings_n,
                        "amenities_n": amenities_n,
                        "poi_n_by_class": poi_classes
                    },
                    "layers": {}
                }
                
                # Add layers based on request
                if "roads" in layers:
                    response["layers"]["roads"] = {
                        "type": "FeatureCollection",
                        "features": self._generate_road_features(bbox, roads_km)
                    }
                
                if "buildings" in layers:
                    response["layers"]["buildings"] = {
                        "type": "FeatureCollection",
                        "features": self._generate_building_features(bbox, buildings_n)
                    }
                
                if "amenities" in layers:
                    response["layers"]["amenities"] = {
                        "type": "FeatureCollection",
                        "features": self._generate_amenity_features(bbox, amenities_n)
                    }
                
                if "pois" in layers:
                    response["layers"]["pois"] = {}
                    for poi_class, count in poi_classes.items():
                        response["layers"]["pois"][poi_class] = {
                            "type": "FeatureCollection",
                            "features": self._generate_poi_features(bbox, poi_class, count)
                        }
                
                print(f"✅ Generated mock data: {roads_km}km roads, {buildings_n} buildings, {amenities_n} amenities")
                
            except Exception as e:
                print(f"❌ Error generating data: {str(e)}")
                response = {
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
                    },
                    "error": f"Data generation failed: {str(e)}"
                }
            
            self.wfile.write(json.dumps(response).encode())
            
        elif parsed_path.path == '/api/export/pdf':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "url": "/download/test.pdf",
                "message": "PDF export not yet implemented"
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif parsed_path.path == '/api/export/pptx':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {
                "url": "/download/test.pptx",
                "message": "PPTX export not yet implemented"
            }
            self.wfile.write(json.dumps(response).encode())
            
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = {"error": "Not found"}
            self.wfile.write(json.dumps(response).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.end_headers()

    def _generate_road_features(self, bbox, count):
        """Generate mock road features"""
        features = []
        for i in range(min(count, 20)):  # Limit to 20 features for performance
            # Generate random line within bbox
            start_lon = bbox['min_lon'] + random.random() * (bbox['max_lon'] - bbox['min_lon'])
            start_lat = bbox['min_lat'] + random.random() * (bbox['max_lat'] - bbox['min_lat'])
            end_lon = bbox['min_lon'] + random.random() * (bbox['max_lon'] - bbox['min_lon'])
            end_lat = bbox['min_lat'] + random.random() * (bbox['max_lat'] - bbox['min_lat'])
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[start_lon, start_lat], [end_lon, end_lat]]
                },
                "properties": {
                    "id": f"road_{i}",
                    "highway": random.choice(["primary", "secondary", "residential", "service"]),
                    "name": f"Road {i+1}",
                    "oneway": "no"
                }
            })
        return features

    def _generate_building_features(self, bbox, count):
        """Generate mock building features"""
        features = []
        for i in range(min(count, 50)):  # Limit to 50 features for performance
            # Generate random polygon within bbox
            center_lon = bbox['min_lon'] + random.random() * (bbox['max_lon'] - bbox['min_lon'])
            center_lat = bbox['min_lat'] + random.random() * (bbox['max_lat'] - bbox['min_lat'])
            size = 0.001  # Small building size
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [center_lon - size, center_lat - size],
                        [center_lon + size, center_lat - size],
                        [center_lon + size, center_lat + size],
                        [center_lon - size, center_lat + size],
                        [center_lon - size, center_lat - size]
                    ]]
                },
                "properties": {
                    "id": f"building_{i}",
                    "building": "yes",
                    "name": f"Building {i+1}"
                }
            })
        return features

    def _generate_amenity_features(self, bbox, count):
        """Generate mock amenity features"""
        features = []
        amenity_types = ["restaurant", "cafe", "shop", "bank", "pharmacy", "hospital", "school", "church"]
        
        for i in range(min(count, 30)):  # Limit to 30 features for performance
            lon = bbox['min_lon'] + random.random() * (bbox['max_lon'] - bbox['min_lon'])
            lat = bbox['min_lat'] + random.random() * (bbox['max_lat'] - bbox['min_lat'])
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "id": f"amenity_{i}",
                    "name": f"Amenity {i+1}",
                    "amenity": random.choice(amenity_types)
                }
            })
        return features

    def _generate_poi_features(self, bbox, poi_class, count):
        """Generate mock POI features"""
        features = []
        for i in range(min(count, 10)):  # Limit to 10 features per class for performance
            lon = bbox['min_lon'] + random.random() * (bbox['max_lon'] - bbox['min_lon'])
            lat = bbox['min_lat'] + random.random() * (bbox['max_lat'] - bbox['min_lat'])
            
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "id": f"poi_{poi_class}_{i}",
                    "name": f"{poi_class} {i+1}",
                    "class": poi_class
                }
            })
        return features

def run_server():
    """Run the HTTP server"""
    server_address = ('0.0.0.0', 8000)
    httpd = HTTPServer(server_address, OSMRequestHandler)
    print("🚀 OSM Map Exporter API Server running on http://localhost:8000")
    print("📚 API endpoints:")
    print("  GET  /api/health")
    print("  POST /api/extract")
    print("  POST /api/export/pdf")
    print("  POST /api/export/pptx")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
