import json
import os
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Point, Polygon, box, mapping

# Import backend functions under test
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import (
    _read_cadastral_dataset,
    _validate_cadastral_dataset,
    _geometry_parts,
    clean_roads_against_buildings_spatial,
)
from fastapi import HTTPException


class TestCadastralImportAndValidation(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp(prefix="cadastral_test_"))
        # Mock survey footprint: box from [4.88, 52.36] to [4.90, 52.38] (WGS84)
        self.survey_footprint = box(4.88, 52.36, 4.90, 52.38)
        self.diagnostics = {
            "raster_crs": "EPSG:32631",
            "epsg4326_bounds": list(self.survey_footprint.bounds),
            "survey_footprint": mapping(self.survey_footprint),
        }

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_01_valid_geojson(self):
        """Test 1: Valid GeoJSON parcel file inside survey extent."""
        geojson_data = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [[4.882, 52.362], [4.888, 52.362], [4.888, 52.368], [4.882, 52.368], [4.882, 52.362]]
                        ]
                    },
                    "properties": {
                        "parcel_identifier": "UP-TEST-001",
                        "survey_number": "SY-101",
                        "land_use": "Residential"
                    }
                }
            ]
        }
        file_path = self.temp_dir / "valid_parcels.geojson"
        file_path.write_text(json.dumps(geojson_data))

        dataset, crs = _read_cadastral_dataset(file_path, "valid_parcels.geojson", self.temp_dir)
        self.assertEqual(crs, "EPSG:4326")
        self.assertEqual(len(dataset), 1)

        collection, diag = _validate_cadastral_dataset(dataset, "valid_parcels.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["parcel_count"], 1)
        self.assertEqual(diag["inside_survey_count"], 1)
        self.assertEqual(diag["outside_survey_count"], 0)
        self.assertEqual(collection["features"][0]["properties"]["parcel_identifier"], "UP-TEST-001")
        self.assertEqual(collection["features"][0]["properties"]["survey_number"], "SY-101")
        self.assertEqual(collection["features"][0]["properties"]["land_use"], "Residential")

    def test_02_invalid_geojson_corrupt(self):
        """Test 2: Invalid/corrupt GeoJSON input."""
        corrupt_path = self.temp_dir / "corrupt.geojson"
        corrupt_path.write_text("{ this is not valid json")

        with self.assertRaises(HTTPException) as context:
            _read_cadastral_dataset(corrupt_path, "corrupt.geojson", self.temp_dir)
        self.assertEqual(context.exception.status_code, 400)

    def test_03_polygon_feature(self):
        """Test 3: Polygon geometry support."""
        poly = Polygon([[4.881, 52.361], [4.889, 52.361], [4.889, 52.369], [4.881, 52.369], [4.881, 52.361]])
        gdf = gpd.GeoDataFrame([{"parcel_id": "P-1", "geometry": poly}], crs="EPSG:4326")
        collection, diag = _validate_cadastral_dataset(gdf, "polygon.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["parcel_count"], 1)
        self.assertEqual(collection["features"][0]["geometry"]["type"], "Polygon")

    def test_04_multipolygon_feature(self):
        """Test 4: MultiPolygon geometry support."""
        p1 = Polygon([[4.881, 52.361], [4.884, 52.361], [4.884, 52.364], [4.881, 52.364], [4.881, 52.361]])
        p2 = Polygon([[4.885, 52.365], [4.888, 52.365], [4.888, 52.368], [4.885, 52.368], [4.885, 52.365]])
        mp = MultiPolygon([p1, p2])
        gdf = gpd.GeoDataFrame([{"parcel_id": "MP-1", "geometry": mp}], crs="EPSG:4326")
        collection, diag = _validate_cadastral_dataset(gdf, "multi.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["parcel_count"], 1)
        self.assertEqual(collection["features"][0]["geometry"]["type"], "MultiPolygon")

    def test_05_reject_non_polygon_geometries(self):
        """Test 5: Rejection of Point and Line geometries for parcels."""
        point = Point(4.885, 52.365)
        line = LineString([[4.881, 52.361], [4.889, 52.369]])
        gdf = gpd.GeoDataFrame([
            {"parcel_id": "PT-1", "geometry": point},
            {"parcel_id": "LN-1", "geometry": line},
        ], crs="EPSG:4326")
        with self.assertRaises(HTTPException) as context:
            _validate_cadastral_dataset(gdf, "invalid_types.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("only Polygon and MultiPolygon are allowed", str(context.exception.detail))

    def test_06_shapefile_missing_prj_rejected(self):
        """Test 6: Shapefile ZIP without .prj file must be rejected (never guess CRS)."""
        shp_dir = self.temp_dir / "temp_shp"
        shp_dir.mkdir(parents=True, exist_ok=True)
        poly = Polygon([[4.881, 52.361], [4.889, 52.361], [4.889, 52.369], [4.881, 52.369], [4.881, 52.361]])
        gdf = gpd.GeoDataFrame([{"parcel_id": "SHP-1", "geometry": poly}])
        shp_file = shp_dir / "parcels.shp"
        gdf.to_file(shp_file)

        # Delete the .prj file intentionally
        prj_file = shp_dir / "parcels.prj"
        if prj_file.exists():
            prj_file.unlink()

        # Create zip without .prj
        zip_path = self.temp_dir / "no_prj.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            for item in shp_dir.glob("*"):
                archive.write(item, arcname=item.name)

        with self.assertRaises(HTTPException) as context:
            _read_cadastral_dataset(zip_path, "no_prj.zip", self.temp_dir)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn(".prj", str(context.exception.detail))

    def test_07_crs_transformation_utm_to_wgs84(self):
        """Test 7: CRS transformation from projected UTM (e.g. EPSG:32631) to EPSG:4326."""
        # Netherlands coordinates in UTM Zone 31N: (X: ~628000, Y: ~5803000)
        transformer = Transformer.from_crs("EPSG:4326", "EPSG:32631", always_xy=True)
        x1, y1 = transformer.transform(4.882, 52.362)
        x2, y2 = transformer.transform(4.888, 52.368)
        utm_poly = Polygon([[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]])

        shp_dir = self.temp_dir / "utm_shp"
        shp_dir.mkdir(parents=True, exist_ok=True)
        gdf = gpd.GeoDataFrame([{"parcel_id": "UTM-1", "geometry": utm_poly}], crs="EPSG:32631")
        shp_file = shp_dir / "parcels.shp"
        gdf.to_file(shp_file)

        zip_path = self.temp_dir / "utm_parcels.zip"
        with zipfile.ZipFile(zip_path, "w") as archive:
            for item in shp_dir.glob("*"):
                archive.write(item, arcname=item.name)

        dataset, source_crs = _read_cadastral_dataset(zip_path, "utm_parcels.zip", self.temp_dir)
        self.assertIn("32631", source_crs)
        self.assertEqual(str(dataset.crs), "EPSG:4326")

        # Validate that transformed coordinates are within WGS84 range
        min_x, min_y, max_x, max_y = dataset.total_bounds
        self.assertTrue(-180 <= min_x <= 180 and -90 <= min_y <= 90)

    def test_08_parcel_completely_outside_survey(self):
        """Test 8: Parcel completely outside survey footprint generates a warning."""
        outside_poly = Polygon([[10.0, 60.0], [10.1, 60.0], [10.1, 60.1], [10.0, 60.1], [10.0, 60.0]])
        gdf = gpd.GeoDataFrame([{"parcel_id": "OUT-1", "geometry": outside_poly}], crs="EPSG:4326")
        collection, diag = _validate_cadastral_dataset(gdf, "outside.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["outside_survey_count"], 1)
        self.assertEqual(diag["inside_survey_count"], 0)
        self.assertTrue(any("outside the actual survey footprint" in w for w in diag["warnings"]))

    def test_09_parcel_overlapping_survey(self):
        """Test 9: Parcel partially overlapping survey footprint."""
        # Footprint is [4.88, 52.36] to [4.90, 52.38]
        # Overlapping polygon straddles the western boundary [4.87 to 4.89]
        partial_poly = Polygon([[4.87, 52.365], [4.89, 52.365], [4.89, 52.375], [4.87, 52.375], [4.87, 52.365]])
        gdf = gpd.GeoDataFrame([{"parcel_id": "PARTIAL-1", "geometry": partial_poly}], crs="EPSG:4326")
        collection, diag = _validate_cadastral_dataset(gdf, "partial.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["partially_overlapping_count"], 1)
        self.assertEqual(diag["inside_survey_count"], 0)
        self.assertEqual(diag["outside_survey_count"], 0)

    def test_10_ai_clipping_outside_footprint(self):
        """Test 10: AI building/road spatial clipping against survey footprint."""
        # Building completely inside
        b_inside = Polygon([[4.882, 52.362], [4.885, 52.362], [4.885, 52.365], [4.882, 52.365], [4.882, 52.362]])
        # Building completely outside
        b_outside = Polygon([[5.00, 52.362], [5.05, 52.362], [5.05, 52.365], [5.00, 52.365], [5.00, 52.362]])
        # Road intersecting survey footprint boundary
        r_crossing = LineString([[4.87, 52.37], [4.91, 52.37]])

        parts_inside = _geometry_parts(b_inside.intersection(self.survey_footprint), "building")
        parts_outside = _geometry_parts(b_outside.intersection(self.survey_footprint), "building")
        road_clipped = _geometry_parts(r_crossing.intersection(self.survey_footprint), "road")

        self.assertEqual(len(parts_inside), 1)
        self.assertEqual(len(parts_outside), 0)
        self.assertEqual(len(road_clipped), 1)
        # Verify clipped road stays strictly inside survey footprint bounds
        min_x, min_y, max_x, max_y = road_clipped[0].bounds
        self.assertTrue(min_x >= 4.88 - 1e-6 and max_x <= 4.90 + 1e-6)

    def test_11_duplicate_parcel_ids_rejected(self):
        """Test 11: Duplicate parcel IDs in dataset are rejected."""
        p1 = Polygon([[4.881, 52.361], [4.884, 52.361], [4.884, 52.364], [4.881, 52.364], [4.881, 52.361]])
        p2 = Polygon([[4.885, 52.365], [4.888, 52.365], [4.888, 52.368], [4.885, 52.368], [4.885, 52.365]])
        gdf = gpd.GeoDataFrame([
            {"parcel_identifier": "DUP-01", "geometry": p1},
            {"parcel_identifier": "DUP-01", "geometry": p2},
        ], crs="EPSG:4326")
        with self.assertRaises(HTTPException) as context:
            _validate_cadastral_dataset(gdf, "duplicate.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("duplicate", str(context.exception.detail).lower())

    def test_12_safe_topology_repair(self):
        """Test 12: Self-intersecting polygon is safely repaired using make_valid."""
        # Bowtie / self-intersecting polygon: [0,0]->[2,2]->[2,0]->[0,2]->[0,0]
        # Shifted to survey area:
        bowtie = Polygon([[4.882, 52.362], [4.888, 52.368], [4.888, 52.362], [4.882, 52.368], [4.882, 52.362]])
        self.assertFalse(bowtie.is_valid)

        gdf = gpd.GeoDataFrame([{"parcel_id": "BOWTIE-1", "geometry": bowtie}], crs="EPSG:4326")
        collection, diag = _validate_cadastral_dataset(gdf, "bowtie.geojson", self.survey_footprint, self.diagnostics)
        self.assertEqual(diag["parcel_count"], 1)
        self.assertTrue(any("safely repaired" in w for w in diag["warnings"]))

    def test_13_road_outside_building_unchanged(self):
        """Test 13 (TEST 1): Road completely outside building -> road unchanged."""
        building = {"type": "Feature", "geometry": mapping(Polygon([[4.883, 52.363], [4.887, 52.363], [4.887, 52.367], [4.883, 52.367], [4.883, 52.363]])), "properties": {"feature_type": "building"}}
        road = {"type": "Feature", "geometry": mapping(LineString([[4.880, 52.370], [4.890, 52.370]])), "properties": {"feature_type": "road", "id": "R-101"}}
        cleaned = clean_roads_against_buildings_spatial([building, road])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(roads), 1)
        coords = [list(c) for c in roads[0]["geometry"]["coordinates"]]
        self.assertEqual(coords, [[4.880, 52.370], [4.890, 52.370]])

    def test_14_road_through_middle_of_building_split(self):
        """Test 14 (TEST 2): Road passes through middle of building -> interior removed, 2 outside segments remain."""
        building = {"type": "Feature", "geometry": mapping(Polygon([[3.0, -1.0], [7.0, -1.0], [7.0, 1.0], [3.0, 1.0], [3.0, -1.0]])), "properties": {"feature_type": "building"}}
        road = {"type": "Feature", "geometry": mapping(LineString([[0.0, 0.0], [10.0, 0.0]])), "properties": {"feature_type": "road", "id": "R-102"}}
        cleaned = clean_roads_against_buildings_spatial([building, road])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(roads), 2)
        # Segment 1: [0, 0] to [3, 0]
        self.assertEqual([list(c) for c in roads[0]["geometry"]["coordinates"]], [[0.0, 0.0], [3.0, 0.0]])
        # Segment 2: [7, 0] to [10, 0]
        self.assertEqual([list(c) for c in roads[1]["geometry"]["coordinates"]], [[7.0, 0.0], [10.0, 0.0]])

    def test_15_road_touches_building_boundary_preserved(self):
        """Test 15 (TEST 3): Road touches building boundary -> road remains intact."""
        building = {"type": "Feature", "geometry": mapping(Polygon([[3.0, -1.0], [7.0, -1.0], [7.0, 1.0], [3.0, 1.0], [3.0, -1.0]])), "properties": {"feature_type": "building"}}
        # Road touches the upper edge [y=1.0]
        road = {"type": "Feature", "geometry": mapping(LineString([[0.0, 1.0], [10.0, 1.0]])), "properties": {"feature_type": "road", "id": "R-103"}}
        cleaned = clean_roads_against_buildings_spatial([building, road])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(roads), 1)
        self.assertEqual([list(c) for c in roads[0]["geometry"]["coordinates"]], [[0.0, 1.0], [10.0, 1.0]])

    def test_16_road_partially_overlaps_building_clipped(self):
        """Test 16 (TEST 4): Road starts inside and exits building -> only overlapping portion removed."""
        building = {"type": "Feature", "geometry": mapping(Polygon([[3.0, -1.0], [7.0, -1.0], [7.0, 1.0], [3.0, 1.0], [3.0, -1.0]])), "properties": {"feature_type": "building"}}
        # Road starts at [5, 0] (inside) and ends at [10, 0] (outside)
        road = {"type": "Feature", "geometry": mapping(LineString([[5.0, 0.0], [10.0, 0.0]])), "properties": {"feature_type": "road", "id": "R-104"}}
        cleaned = clean_roads_against_buildings_spatial([building, road])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(roads), 1)
        self.assertEqual([list(c) for c in roads[0]["geometry"]["coordinates"]], [[7.0, 0.0], [10.0, 0.0]])

    def test_17_multiple_buildings_intersect_one_road(self):
        """Test 17 (TEST 5): Multiple buildings intersect one road -> road split into valid outside segments."""
        b1 = {"type": "Feature", "geometry": mapping(Polygon([[2.0, -1.0], [4.0, -1.0], [4.0, 1.0], [2.0, 1.0], [2.0, -1.0]])), "properties": {"feature_type": "building"}}
        b2 = {"type": "Feature", "geometry": mapping(Polygon([[6.0, -1.0], [8.0, -1.0], [8.0, 1.0], [6.0, 1.0], [6.0, -1.0]])), "properties": {"feature_type": "building"}}
        road = {"type": "Feature", "geometry": mapping(LineString([[0.0, 0.0], [10.0, 0.0]])), "properties": {"feature_type": "road", "id": "R-105"}}
        cleaned = clean_roads_against_buildings_spatial([b1, b2, road])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        self.assertEqual(len(roads), 3)
        self.assertEqual([list(c) for c in roads[0]["geometry"]["coordinates"]], [[0.0, 0.0], [2.0, 0.0]])
        self.assertEqual([list(c) for c in roads[1]["geometry"]["coordinates"]], [[4.0, 0.0], [6.0, 0.0]])
        self.assertEqual([list(c) for c in roads[2]["geometry"]["coordinates"]], [[8.0, 0.0], [10.0, 0.0]])

    def test_18_multiline_road_and_multipolygon_building(self):
        """Test 18 (TEST 6): MultiPolygon buildings and MultiLineString roads -> all handled correctly."""
        p1 = Polygon([[2.0, -1.0], [4.0, -1.0], [4.0, 1.0], [2.0, 1.0], [2.0, -1.0]])
        p2 = Polygon([[6.0, -1.0], [8.0, -1.0], [8.0, 1.0], [6.0, 1.0], [6.0, -1.0]])
        b_multi = {"type": "Feature", "geometry": mapping(MultiPolygon([p1, p2])), "properties": {"feature_type": "building"}}
        r_multi = {
            "type": "Feature",
            "geometry": mapping(MultiLineString([
                LineString([[0.0, 0.0], [10.0, 0.0]]),
                LineString([[0.0, 5.0], [10.0, 5.0]])
            ])),
            "properties": {"feature_type": "road", "id": "R-106"}
        }
        cleaned = clean_roads_against_buildings_spatial([b_multi, r_multi])
        roads = [f for f in cleaned if f["properties"]["feature_type"] == "road"]
        # 3 segments from line 1 + 1 segment from line 2 = 4 segments total
        self.assertEqual(len(roads), 4)


if __name__ == "__main__":
    unittest.main()
