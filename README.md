# OSM Map Exporter

A web application for extracting and exporting OpenStreetMap data with interactive mapping capabilities. The application allows users to search for locations, extract map data (roads, buildings, amenities, POIs), and export the results in various formats.

## Features

- 🗺️ Interactive map with search functionality
- 📍 Accurate geocoding for locations worldwide
- 🛣️ Road network extraction with length calculations
- 🏢 Building data extraction with area calculations
- 🏪 Amenities and POI extraction with classification
- 📊 Real-time statistics and summaries
- 📄 Export to PDF and PowerPoint formats
- 🌐 Multi-language support (Armenian, English, Russian)

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **Overpass API** - OpenStreetMap data extraction
- **GeoPandas** - Geospatial data processing
- **Shapely** - Geometric operations
- **Pydantic** - Data validation

### Frontend
- **React** - User interface library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive maps
- **React-Leaflet** - React components for Leaflet

## Installation

### Prerequisites
- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python3 main.py
```

The backend will be available at `http://localhost:8000`

**Note**: If you encounter "ModuleNotFoundError", the updated startup script will automatically install dependencies.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000` (or 3001, 3002, etc. if 3000 is busy)

**Note**: The frontend will automatically try different ports if 3000 is occupied.

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Use the search bar to find locations (e.g., "Yerevan", "Paris", "New York")
3. Select the data layers you want to extract:
   - **Roads** - Road network with length calculations
   - **Buildings** - Building footprints with area calculations
   - **Amenities** - Points of interest and facilities
   - **POIs** - Classified points of interest
4. Click "Extract Data" to load the map data
5. View statistics and interact with the map
6. Export the data to PDF or PowerPoint format

## API Endpoints

### Health Check
```
GET /api/health
```

### Extract OSM Data
```
POST /api/extract
Content-Type: application/json

{
  "bbox": {
    "min_lon": 44.45,
    "min_lat": 40.15,
    "max_lon": 44.6,
    "max_lat": 40.25
  },
  "layers": ["roads", "buildings", "amenities", "pois"]
}
```

### Export to PDF
```
POST /api/export/pdf
Content-Type: application/json

{
  "data": { ... },
  "title": "Map Export",
  "format": "A4"
}
```

### Export to PowerPoint
```
POST /api/export/pptx
Content-Type: application/json

{
  "data": { ... },
  "title": "Map Export"
}
```

## Configuration

The application uses several configuration options:

- **Overpass API URL**: `https://overpass-api.de/api/interpreter`
- **Default timeout**: 25 seconds
- **Coordinate system**: EPSG:4326 (WGS84)
- **Projection for calculations**: EPSG:3857 (Web Mercator)

## Development

### Project Structure
```
osm-map-exporter/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── services/
│   │   ├── osm_extractor.py    # OSM data extraction
│   │   ├── poi_classifier.py   # POI classification
│   │   ├── export_service.py   # Export functionality
│   │   └── overpass_queries.py # Overpass API queries
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── App.tsx            # Main application
│   │   └── main.tsx           # Entry point
│   ├── package.json           # Node.js dependencies
│   └── vite.config.ts         # Vite configuration
└── README.md                  # This file
```

### Adding New Features

1. **New Map Layers**: Add queries in `overpass_queries.py` and extraction logic in `osm_extractor.py`
2. **New Export Formats**: Extend `export_service.py` with new export methods
3. **UI Components**: Add new React components in `frontend/src/components/`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/) for providing the map data
- [Overpass API](https://overpass-api.de/) for data extraction
- [Leaflet](https://leafletjs.com/) for interactive maps
- [React](https://reactjs.org/) for the user interface

## Troubleshooting

If you encounter issues, check the [Troubleshooting Guide](TROUBLESHOOTING.md) for common solutions.

### Quick Fix
```bash
# Stop all processes and restart
pkill -f "python3 main.py" && pkill -f "npm run dev"
./start.sh
```

### Common Issues
- **"Data loading error"**: Make sure both servers are running
- **"ModuleNotFoundError"**: Dependencies will be auto-installed by the startup script
- **Port conflicts**: Frontend will automatically try different ports (3001, 3002, etc.)

## Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.

---

**Note**: This application is designed for educational and research purposes. Please respect OpenStreetMap's usage policies and consider contributing back to the OSM community.