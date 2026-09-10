import unittest
import numpy as np
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import (
    clean_binary_mask,
    _geometry_parts,
    clean_roads_against_buildings_spatial,
)
from shapely.geometry import Polygon, LineString, mapping


class TestBuildingDetection(unittest.TestCase):
    def test_clean_binary_mask(self):
        """Verify morphological cleanup removes small noise and fills small holes."""
        mask = np.zeros((100, 100), dtype=bool)
        # Add a building block
        mask[20:60, 20:60] = True
        # Add a small hole inside building
        mask[30:32, 30:32] = False
        # Add tiny 2x2 noise
        mask[5:7, 5:7] = True

        cleaned = clean_binary_mask(mask, min_object_size=8, hole_fill_size=16)

        # Noise should be removed
        self.assertFalse(cleaned[5:7, 5:7].any())
        # Hole should be filled
        self.assertTrue(cleaned[30:32, 30:32].all())
        # Building should remain intact
        self.assertTrue(cleaned[25:55, 25:55].all())

    def test_geometry_parts_building(self):
        """Verify polygon extraction handles geometry types safely."""
        poly = Polygon([(0, 0), (10, 0), (10, 10), (0, 10)])
        parts = _geometry_parts(poly, "building")
        self.assertEqual(len(parts), 1)
        self.assertEqual(parts[0].geom_type, "Polygon")

    def test_road_building_interaction(self):
        """Verify road clipping against detected building footprint."""
        building_poly = Polygon([(2, 2), (6, 2), (6, 6), (2, 6)])
        road_line = LineString([(0, 4), (8, 4)])

        features = [
            {
                "type": "Feature",
                "geometry": mapping(building_poly),
                "properties": {"feature_type": "building", "id": "B-01"},
            },
            {
                "type": "Feature",
                "geometry": mapping(road_line),
                "properties": {"feature_type": "road", "id": "R-01"},
            },
        ]

        cleaned = clean_roads_against_buildings_spatial(features)
        self.assertTrue(len(cleaned) >= 2)
        building_feats = [f for f in cleaned if f["properties"]["feature_type"] == "building"]
        road_feats = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(building_feats), 1)
        self.assertEqual(len(road_feats), 2)  # Segment before and segment after the building


if __name__ == "__main__":
    unittest.main()
