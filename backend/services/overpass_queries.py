class OverpassQueries:
    """Overpass API query templates"""
    
    def get_roads_query(self, bbox: str) -> str:
        """Generate Overpass query for road network"""
        return f"""
        [out:json][timeout:25];
        (
          way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|pedestrian|track|path|footway|cycleway|bridleway|steps)$"]({bbox});
        );
        out geom;
        """
    
    def get_buildings_query(self, bbox: str) -> str:
        """Generate Overpass query for buildings"""
        return f"""
        [out:json][timeout:25];
        (
          way["building"]({bbox});
        );
        out geom;
        """
    
    def get_amenities_query(self, bbox: str) -> str:
        """Generate Overpass query for amenities and POIs"""
        return f"""
        [out:json][timeout:25];
        (
          node["amenity"]({bbox});
          node["shop"]({bbox});
          node["tourism"]({bbox});
          node["leisure"]({bbox});
          node["healthcare"]({bbox});
          node["office"]({bbox});
          node["government"]({bbox});
          way["amenity"]({bbox});
          way["shop"]({bbox});
          way["tourism"]({bbox});
          way["leisure"]({bbox});
          way["healthcare"]({bbox});
          way["office"]({bbox});
          way["government"]({bbox});
        );
        out geom;
        """
    
    def get_pois_query(self, bbox: str) -> str:
        """Generate Overpass query for POIs (same as amenities)"""
        return self.get_amenities_query(bbox)
