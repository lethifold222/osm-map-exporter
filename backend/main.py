from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json
import os
from datetime import datetime
import asyncio
from pathlib import Path

from services.osm_extractor import OSMExtractor
from services.poi_classifier import POIClassifier
from services.export_service import ExportService
from models.schemas import (
    ExtractRequest, ExtractResponse, 
    ExportPDFRequest, ExportPPTXRequest,
    ExportResponse
)

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

# Initialize services
osm_extractor = OSMExtractor()
poi_classifier = POIClassifier()
export_service = ExportService()

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True, "timestamp": datetime.now().isoformat()}

@app.post("/api/extract", response_model=ExtractResponse)
async def extract_osm_data(request: ExtractRequest):
    """Extract OSM data for specified area and layers"""
    try:
        # Convert Pydantic models to dictionaries
        bbox_dict = None
        if request.bbox:
            bbox_dict = {
                "min_lon": request.bbox.min_lon,
                "min_lat": request.bbox.min_lat,
                "max_lon": request.bbox.max_lon,
                "max_lat": request.bbox.max_lat
            }
        
        # Extract data using the OSM extractor
        result = await osm_extractor.extract_data(
            bbox=bbox_dict,
            polygon=request.polygon,
            layers=request.layers
        )
        
        
        # Classify POIs if requested
        if "pois" in request.layers and "pois" in result["layers"]:
            result["layers"]["pois"] = poi_classifier.classify_pois(
                result["layers"]["pois"]
            )
        
        return ExtractResponse(**result)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/pdf", response_model=ExportResponse)
async def export_pdf(request: ExportPDFRequest):
    """Export map data as PDF"""
    try:
        file_path = await export_service.export_pdf(request)
        return ExportResponse(url=f"/download/{os.path.basename(file_path)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/export/pptx", response_model=ExportResponse)
async def export_pptx(request: ExportPPTXRequest):
    """Export map data as PowerPoint presentation"""
    try:
        file_path = await export_service.export_pptx(request)
        return ExportResponse(url=f"/download/{os.path.basename(file_path)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download exported files"""
    file_path = Path("exports") / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, filename=filename)

@app.delete("/api/cache")
async def clear_cache(key: Optional[str] = Query(None)):
    """Clear cache (admin endpoint)"""
    # Implementation for cache clearing
    return {"message": "Cache cleared"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
