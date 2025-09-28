from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
# Removed geojson_pydantic dependency
from enum import Enum

class LayerType(str, Enum):
    ROADS = "roads"
    BUILDINGS = "buildings"
    AMENITIES = "amenities"
    POIS = "pois"

class BoundingBox(BaseModel):
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

class ExtractRequest(BaseModel):
    bbox: Optional[BoundingBox] = None
    polygon: Optional[str] = None  # GeoJSON Polygon as string
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
    layers: Dict[str, Union[Dict[str, Any], Dict[str, Dict[str, Any]]]]

class StylePreset(str, Enum):
    MINIMAL = "minimal"
    STUDIO = "studio"
    PRESENTATION = "presentation"

class LegendConfig(BaseModel):
    show: bool = True
    north: bool = True
    scale: bool = True

class ExportPDFRequest(BaseModel):
    bbox: Optional[BoundingBox] = None
    polygon: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    layers: List[LayerType]
    style_preset: StylePreset = StylePreset.PRESENTATION
    legend: LegendConfig = LegendConfig()

class ExportPPTXRequest(BaseModel):
    bbox: Optional[BoundingBox] = None
    polygon: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    layers: List[LayerType]
    style_preset: StylePreset = StylePreset.PRESENTATION
    legend: LegendConfig = LegendConfig()

class ExportResponse(BaseModel):
    url: str
    filename: Optional[str] = None
    file_size: Optional[int] = None
