# Deployment Instructions

## Publishing to GitHub

### Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the repository details:
   - **Repository name**: `osm-map-exporter`
   - **Description**: `A web application for extracting and exporting OpenStreetMap data with interactive mapping capabilities`
   - **Visibility**: Public
   - **Initialize with**: Don't initialize (we already have files)
5. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

Run these commands in your terminal:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/osm-map-exporter.git

# Set the main branch
git branch -M main

# Push the code to GitHub
git push -u origin main
```

### Step 3: Enable GitHub Pages (Optional)

If you want to deploy the frontend to GitHub Pages:

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Click "Save"

## Local Development

### Quick Start

1. **Clone the repository**:
```bash
git clone https://github.com/YOUR_USERNAME/osm-map-exporter.git
cd osm-map-exporter
```

2. **Start Backend**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 main.py
```

3. **Start Frontend** (in a new terminal):
```bash
cd frontend
npm install
npm run dev
```

4. **Open the application**: http://localhost:3000

## Production Deployment

### Using Docker (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PYTHONPATH=/app
    volumes:
      - ./backend:/app
    command: python3 main.py

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
    depends_on:
      - backend
```

### Using Vercel (Frontend)

1. Install Vercel CLI: `npm i -g vercel`
2. In the frontend directory: `vercel`
3. Follow the prompts

### Using Railway (Full Stack)

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the project structure
3. Set environment variables if needed
4. Deploy!

## Environment Variables

Create a `.env` file in the backend directory:

```env
# Overpass API Configuration
OVERPASS_URL=https://overpass-api.de/api/interpreter
OVERPASS_TIMEOUT=25

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Export Configuration
MAX_EXPORT_SIZE=1000000
EXPORT_TIMEOUT=300
```

## Troubleshooting

### Common Issues

1. **Port already in use**: Kill existing processes or change ports
2. **Python dependencies**: Make sure you're using Python 3.12+
3. **Node.js issues**: Make sure you're using Node.js 18+
4. **CORS errors**: Check CORS configuration in backend

### Getting Help

- Check the [Issues](https://github.com/YOUR_USERNAME/osm-map-exporter/issues) page
- Create a new issue if you find a bug
- Check the [Wiki](https://github.com/YOUR_USERNAME/osm-map-exporter/wiki) for detailed documentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
