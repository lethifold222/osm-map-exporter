#!/usr/bin/env python3
"""
Minimal HTTP server for OSM Map Exporter
Works without FastAPI dependencies
"""

import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from datetime import datetime

try:
    from simple_osm_extractor import SimpleOSMExtractor as RealOSMExtractor
except ImportError:
    print("⚠️ SimpleOSMExtractor not available, using mock data")
    class RealOSMExtractor:
        async def extract_data(self, bbox, layers):
            return {
                "bbox": bbox,
                "crs": "EPSG:4326",
                "summary": {
                    "roads_km": 15.5,
                    "buildings_n": 250,
                    "amenities_n": 45,
                    "poi_n_by_class": {
                        "Retail/Trade": 12,
                        "Government": 3,
                        "Education": 8,
                        "Health": 5,
                        "Transport": 7,
                        "Culture/Leisure": 4,
                        "Hospitality": 6
                    }
                },
                "layers": {
                    "roads": {"type": "FeatureCollection", "features": []},
                    "buildings": {"type": "FeatureCollection", "features": []},
                    "amenities": {"type": "FeatureCollection", "features": []},
                    "pois": {}
                }
            }

class OSMRequestHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def _get_osm_extractor(self):
        if not hasattr(self, 'osm_extractor'):
            self.osm_extractor = RealOSMExtractor()
        return self.osm_extractor

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
                # Extract real OSM data
                bbox = request_data.get('bbox', {
                    "min_lon": 44.5,
                    "min_lat": 40.1,
                    "max_lon": 44.6,
                    "max_lat": 40.2
                })
                layers = request_data.get('layers', ['roads', 'buildings', 'amenities', 'pois'])
                
                print(f"📍 Bbox: {bbox}")
                print(f"📊 Layers: {layers}")
                
                # Use asyncio to run the async function
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                osm_extractor = self._get_osm_extractor()
                response = loop.run_until_complete(osm_extractor.extract_data(bbox, layers))
                loop.close()
                
                print(f"✅ OSM data extracted: {response['summary']}")
                
            except Exception as e:
                print(f"❌ OSM extraction failed: {str(e)}")
                # Fallback to mock data if real extraction fails
                response = {
                    "bbox": request_data.get('bbox', {
                        "min_lon": 44.5,
                        "min_lat": 40.1,
                        "max_lon": 44.6,
                        "max_lat": 40.2
                    }),
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
                    "error": f"Real extraction failed: {str(e)}"
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
