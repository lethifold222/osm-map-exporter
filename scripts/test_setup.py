#!/usr/bin/env python3
"""
Test script to verify OSM Map Exporter setup
"""

import sys
import subprocess
import importlib
import os
from pathlib import Path

def test_python_imports():
    """Test if required Python packages can be imported"""
    print("🐍 Testing Python imports...")
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'geopandas',
        'shapely',
        'pyproj',
        'httpx',
        'osmnx',
        'pptx',
        'playwright',
        'PIL',
        'folium',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'pptx':
                importlib.import_module('pptx')
            elif package == 'PIL':
                importlib.import_module('PIL')
            else:
                importlib.import_module(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package}")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Run: pip install -r backend/requirements.txt")
        return False
    
    print("✅ All Python packages available")
    return True

def test_node_modules():
    """Test if Node.js dependencies are installed"""
    print("\n📦 Testing Node.js dependencies...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    node_modules = frontend_path / "node_modules"
    if not node_modules.exists():
        print("❌ node_modules not found")
        print("Run: cd frontend && npm install")
        return False
    
    print("✅ Node.js dependencies installed")
    return True

def test_file_structure():
    """Test if required files exist"""
    print("\n📁 Testing file structure...")
    
    required_files = [
        "backend/main.py",
        "backend/requirements.txt",
        "frontend/package.json",
        "frontend/src/App.tsx",
        "configs/poi_rules.json",
        "configs/style_presets.json"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if Path(file_path).exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path}")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ Missing files: {', '.join(missing_files)}")
        return False
    
    print("✅ All required files present")
    return True

def test_backend_imports():
    """Test if backend modules can be imported"""
    print("\n🔧 Testing backend imports...")
    
    # Add backend to Python path
    backend_path = Path("backend").absolute()
    sys.path.insert(0, str(backend_path))
    
    try:
        from models.schemas import ExtractRequest, ExtractResponse
        print("  ✅ models.schemas")
    except ImportError as e:
        print(f"  ❌ models.schemas: {e}")
        return False
    
    try:
        from services.osm_extractor import OSMExtractor
        print("  ✅ services.osm_extractor")
    except ImportError as e:
        print(f"  ❌ services.osm_extractor: {e}")
        return False
    
    try:
        from services.poi_classifier import POIClassifier
        print("  ✅ services.poi_classifier")
    except ImportError as e:
        print(f"  ❌ services.poi_classifier: {e}")
        return False
    
    try:
        from services.export_service import ExportService
        print("  ✅ services.export_service")
    except ImportError as e:
        print(f"  ❌ services.export_service: {e}")
        return False
    
    print("✅ All backend modules importable")
    return True

def main():
    """Run all tests"""
    print("🧪 OSM Map Exporter Setup Test")
    print("=" * 40)
    
    tests = [
        test_file_structure,
        test_python_imports,
        test_node_modules,
        test_backend_imports
    ]
    
    all_passed = True
    
    for test in tests:
        if not test():
            all_passed = False
    
    print("\n" + "=" * 40)
    if all_passed:
        print("🎉 All tests passed! Setup is complete.")
        print("\nTo start the application:")
        print("  ./start.sh")
        print("\nOr manually:")
        print("  Backend: cd backend && source .venv/bin/activate && python main.py")
        print("  Frontend: cd frontend && npm run dev")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
