from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import asyncio
from datetime import datetime

app = FastAPI(
    title="OSM Map Exporter API",
    description="Extract OSM data and export styled maps as PDF/PPTX",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

class ExtractRequest(BaseModel):
    bbox: Optional[BoundingBox] = None
    polygon: Optional[str] = None
    layers: List[str] = ["roads", "buildings", "amenities", "pois"]

class LayerSummary(BaseModel):
    roads_km: Optional[float] = None
    buildings_n: Optional[int] = None
    amenities_n: Optional[int] = None
    poi_n_by_class: Optional[Dict[str, int]] = None

class ExtractResponse(BaseModel):
    bbox: BoundingBox
    crs: str = "EPSG:4326"
    summary: LayerSummary
    layers: Dict[str, Any]

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "timestamp": datetime.now().isoformat()}

@app.post("/api/extract", response_model=ExtractResponse)
async def extract_osm_data(request: ExtractRequest):
    """Extract OSM data for specified area and layers"""
    try:
        # Mock data for testing
        mock_data = {
            "bbox": request.bbox or BoundingBox(
                min_lon=44.5, min_lat=40.1, max_lon=44.6, max_lat=40.2
            ),
            "crs": "EPSG:4326",
            "summary": LayerSummary(
                roads_km=15.5,
                buildings_n=250,
                amenities_n=45,
                poi_n_by_class={
                    "Retail/Trade": 12,
                    "Government": 3,
                    "Education": 8,
                    "Health": 5,
                    "Transport": 7,
                    "Culture/Leisure": 4,
                    "Hospitality": 6
                }
            ),
            "layers": {
                "roads": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "LineString",
                                "coordinates": [[44.5, 40.1], [44.6, 40.2]]
                            },
                            "properties": {
                                "highway": "primary",
                                "name": "Test Road"
                            }
                        }
                    ]
                },
                "buildings": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "Polygon",
                                "coordinates": [[[44.51, 40.11], [44.52, 40.11], [44.52, 40.12], [44.51, 40.12], [44.51, 40.11]]]
                            },
                            "properties": {
                                "building": "yes",
                                "name": "Test Building"
                            }
                        }
                    ]
                },
                "amenities": {
                    "type": "FeatureCollection",
                    "features": [
                        {
                            "type": "Feature",
                            "geometry": {
                                "type": "Point",
                                "coordinates": [44.515, 40.115]
                            },
                            "properties": {
                                "amenity": "restaurant",
                                "name": "Test Restaurant"
                            }
                        }
                    ]
                },
                "pois": {
                    "Retail/Trade": {
                        "type": "FeatureCollection",
                        "features": []
                    },
                    "Government": {
                        "type": "FeatureCollection",
                        "features": []
                    }
                }
            }
        }
        
        return ExtractResponse(**mock_data)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/pdf")
async def export_pdf(request: Dict[str, Any]):
    """Export map data as PDF (mock)"""
    return {"url": "/download/test.pdf", "message": "PDF export not yet implemented"}

@app.post("/api/export/pptx")
async def export_pptx(request: Dict[str, Any]):
    """Export map data as PowerPoint (mock)"""
    return {"url": "/download/test.pptx", "message": "PPTX export not yet implemented"}

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download exported files (mock)"""
    return {"message": f"File {filename} not found - export not yet implemented"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
