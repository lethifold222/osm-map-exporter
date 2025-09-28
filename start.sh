#!/bin/bash

# OSM Map Exporter - Quick Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting OSM Map Exporter..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.12+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Function to start backend
start_backend() {
    echo "🔧 Starting backend server..."
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Always install/update dependencies
    echo "📦 Installing Python dependencies..."
    pip install --upgrade pip
    pip install -r requirements.txt --force-reinstall
    
    # Check if FastAPI is installed
    if ! python3 -c "import fastapi" 2>/dev/null; then
        echo "❌ FastAPI installation failed. Trying alternative approach..."
        pip uninstall -y numpy shapely geopandas
        pip install numpy==1.26.4 shapely==1.8.5 geopandas==0.14.1
        pip install -r requirements.txt
    else
        echo "✅ FastAPI installed successfully"
    fi
    
    # Start backend server
    echo "🌐 Backend server starting on http://localhost:8000"
    echo "DEBUG: Python path: $(which python3)"
    echo "DEBUG: Pip path: $(which pip)"
    python3 main.py &
    BACKEND_PID=$!
    
    cd ..
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend server..."
    cd frontend
    
    # Always install/update dependencies
    echo "📦 Installing Node.js dependencies..."
    npm install
    
    # Start frontend server
    echo "🌐 Frontend server starting on http://localhost:3000"
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
}

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start servers
start_backend
sleep 3
start_frontend

echo ""
echo "✅ OSM Map Exporter is running!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait