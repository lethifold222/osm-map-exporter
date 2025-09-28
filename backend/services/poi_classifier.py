import json
from typing import Dict, List, Any
from typing import Dict, List, Any

class POIClassifier:
    """Classify POIs into predefined categories"""
    
    def __init__(self):
        self.classification_rules = self._load_classification_rules()
    
    def _load_classification_rules(self) -> Dict[str, List[str]]:
        """Load POI classification rules from config"""
        return {
            "Retail/Trade": [
                "shop=*", "amenity=marketplace", "amenity=mall"
            ],
            "Government": [
                "amenity=townhall", "amenity=courthouse", "amenity=embassy",
                "office=government", "government=*"
            ],
            "Education": [
                "amenity=school", "amenity=college", "amenity=university",
                "amenity=kindergarten", "amenity=library"
            ],
            "Health": [
                "amenity=hospital", "amenity=clinic", "amenity=doctors",
                "amenity=dentist", "amenity=pharmacy", "healthcare=*"
            ],
            "Transport": [
                "amenity=bus_station", "amenity=ferry_terminal", "amenity=bicycle_parking",
                "public_transport=*", "railway=*", "aeroway=terminal"
            ],
            "Culture/Leisure": [
                "amenity=theatre", "amenity=cinema", "amenity=arts_centre",
                "tourism=museum", "tourism=attraction", "leisure=*"
            ],
            "Hospitality": [
                "tourism=hotel", "tourism=guest_house", "tourism=motel", "tourism=hostel",
                "amenity=restaurant", "amenity=cafe", "amenity=fast_food",
                "amenity=bar", "amenity=pub"
            ],
            "Finance": [
                "amenity=bank", "amenity=atm", "amenity=bureau_de_change"
            ],
            "Services": [
                "amenity=post_office", "amenity=police", "amenity=fire_station",
                "amenity=car_rental", "amenity=car_wash", "office=*"
            ],
            "Religious": [
                "amenity=place_of_worship", "religion=*"
            ]
        }
    
    def classify_pois(self, pois: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Classify POIs into categories and return organized FeatureCollections"""
        classified_pois = {}
        count_by_class = {}
        
        # Initialize empty FeatureCollections for each category
        for category in self.classification_rules.keys():
            classified_pois[category] = {
                "type": "FeatureCollection",
                "features": []
            }
            count_by_class[category] = 0
        
        # Add "Other" category for unmatched POIs
        classified_pois["Other"] = {
            "type": "FeatureCollection",
            "features": []
        }
        count_by_class["Other"] = 0
        
        # Classify each POI
        for feature in pois.get("features", []):
            poi_class = self._classify_single_poi(feature)
            
            # Add to appropriate category
            if poi_class in classified_pois:
                classified_pois[poi_class]["features"].append(feature)
                count_by_class[poi_class] += 1
            else:
                classified_pois["Other"]["features"].append(feature)
                count_by_class["Other"] += 1
        
        return classified_pois
    
    def _classify_single_poi(self, feature: Dict[str, Any]) -> str:
        """Classify a single POI based on its properties"""
        props = feature.get("properties", {})
        
        # Check each category's rules
        for category, rules in self.classification_rules.items():
            if self._matches_rules(props, rules):
                return category
        
        return "Other"
    
    def _matches_rules(self, properties: Dict[str, Any], rules: List[str]) -> bool:
        """Check if POI properties match any of the classification rules"""
        for rule in rules:
            if self._matches_rule(properties, rule):
                return True
        return False
    
    def _matches_rule(self, properties: Dict[str, Any], rule: str) -> bool:
        """Check if POI properties match a specific rule"""
        if "=" in rule:
            key, value = rule.split("=", 1)
            
            if value == "*":
                # Any value for this key
                return key in properties and properties[key]
            else:
                # Specific value
                return properties.get(key) == value
        
        return False
    
    def get_classification_summary(self, classified_pois: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
        """Get summary of POI counts by class"""
        return {
            category: len(fc.get("features", [])) 
            for category, fc in classified_pois.items()
        }
