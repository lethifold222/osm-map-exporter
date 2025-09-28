# Troubleshooting Guide

## Common Issues and Solutions

### 1. "Data loading error: Load failed"

**Problem**: Frontend cannot connect to backend API.

**Solution**:
1. Make sure both servers are running:
   ```bash
   ./start.sh
   ```
2. Check that backend is running on port 8000:
   ```bash
   curl http://localhost:8000/api/health
   ```
3. Check that frontend is running (usually on port 3001 or 3002):
   ```bash
   curl http://localhost:3001
   ```

### 2. "ModuleNotFoundError: No module named 'fastapi'"

**Problem**: Python dependencies are not installed.

**Solution**:
1. The updated `start.sh` script now automatically installs dependencies
2. If still having issues, manually install:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python3 main.py
   ```

### 3. "Port 8000 is already in use"

**Problem**: Another process is using port 8000.

**Solution**:
```bash
# Kill processes using port 8000
lsof -ti:8000 | xargs kill -9

# Or kill all Python processes
pkill -f "python3 main.py"
```

### 4. "Port 3000 is in use"

**Problem**: Another process is using port 3000.

**Solution**:
- The frontend will automatically try ports 3001, 3002, etc.
- Check the terminal output to see which port is being used
- Usually it will be `http://localhost:3001` or `http://localhost:3002`

### 5. Frontend shows "This site can't be reached"

**Problem**: Frontend server is not running or on different port.

**Solution**:
1. Check the terminal output for the correct port
2. Look for lines like:
   ```
   ➜  Local:   http://localhost:3001/
   ```
3. Use the correct port shown in the output

### 6. "Error extracting layer" in backend logs

**Problem**: Overpass API issues or geometry processing errors.

**Solution**:
- This is usually temporary and resolves itself
- Check your internet connection
- The app will still work with partial data

## Quick Fix Commands

```bash
# Stop all processes
pkill -f "python3 main.py" && pkill -f "npm run dev"

# Clean start
./start.sh

# Check if servers are running
curl http://localhost:8000/api/health  # Backend
curl http://localhost:3001             # Frontend (check port in terminal)

# Test API
curl -X POST http://localhost:8000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"bbox": {"min_lon": 44.45, "min_lat": 40.15, "max_lon": 44.6, "max_lat": 40.25}, "layers": ["roads"]}'
```

## Expected Behavior

When everything works correctly:
1. Backend starts on `http://localhost:8000`
2. Frontend starts on `http://localhost:3001` (or 3002, 3003, etc.)
3. API health check returns: `{"ok":true,"timestamp":"..."}`
4. Frontend loads the map interface
5. Searching for "Yerevan" shows the correct location
6. Data extraction returns ~27,089 roads

## Getting Help

If you're still having issues:
1. Check the terminal output for error messages
2. Make sure you have Python 3.12+ and Node.js 18+
3. Try running the commands manually:
   ```bash
   # Backend
   cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python3 main.py
   
   # Frontend (in another terminal)
   cd frontend && npm install && npm run dev
   ```
4. Open an issue on GitHub: https://github.com/lethifold222/osm-map-exporter/issues
