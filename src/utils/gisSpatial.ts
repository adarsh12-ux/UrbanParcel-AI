import * as turf from '@turf/turf';
import { Road, Building } from '../types';

/**
 * Merges contiguous LineString segments that share identical endpoints.
 */
function mergeContiguousSegments(segments: GeoJSON.Feature<GeoJSON.LineString>[]): GeoJSON.Feature<GeoJSON.LineString>[] {
  if (segments.length <= 1) return segments;

  const result: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  let currentCoords: [number, number][] = [...segments[0].geometry.coordinates] as [number, number][];

  for (let i = 1; i < segments.length; i++) {
    const nextCoords = segments[i].geometry.coordinates as [number, number][];
    const lastPoint = currentCoords[currentCoords.length - 1];
    const firstPoint = nextCoords[0];

    // If endpoints match within floating point precision, concatenate
    if (
      Math.abs(lastPoint[0] - firstPoint[0]) < 1e-9 &&
      Math.abs(lastPoint[1] - firstPoint[1]) < 1e-9
    ) {
      currentCoords.push(...nextCoords.slice(1));
    } else {
      result.push(turf.lineString(currentCoords));
      currentCoords = [...nextCoords];
    }
  }
  result.push(turf.lineString(currentCoords));
  return result;
}

/**
 * Validates a building candidate polygon using multi-criteria geometric and spatial rules.
 */
export function validateBuildingGeometry(
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  id: string = 'candidate',
  confidence: number = 0.5
): { isValid: boolean; areaSqM: number; reason?: string; metrics?: Record<string, number> } {
  try {
    const polyFeature = geom.type === 'Polygon'
      ? turf.polygon(geom.coordinates as GeoJSON.Position[][])
      : turf.multiPolygon(geom.coordinates as GeoJSON.Position[][][]);

    const area = turf.area(polyFeature as any);
    const boundary = turf.polygonToLine(polyFeature as any);
    const perimeter = turf.length(boundary as any, { units: 'meters' });

    if (area <= 0 || perimeter <= 0) {
      return { isValid: false, areaSqM: 0, reason: 'Zero area or perimeter' };
    }

    // Physical scale thresholds for realistic buildings
    const MIN_BUILDING_AREA_M2 = 12.0;
    const MAX_BUILDING_AREA_M2 = 60000.0;

    if (area < MIN_BUILDING_AREA_M2) {
      return { isValid: false, areaSqM: Math.round(area * 10) / 10, reason: `Area too small for building (${area.toFixed(1)} m² < ${MIN_BUILDING_AREA_M2} m²)` };
    }

    if (area > MAX_BUILDING_AREA_M2) {
      return { isValid: false, areaSqM: Math.round(area * 10) / 10, reason: `Area exceeds realistic building scale (${area.toFixed(1)} m² > ${MAX_BUILDING_AREA_M2} m²; open area/field false positive)` };
    }

    // Compactness (Polsby-Popper): 4 * PI * Area / Perimeter^2
    const compactness = (4.0 * Math.PI * area) / (perimeter * perimeter);

    // Convex Hull Solidity
    let solidity = 1.0;
    try {
      const hull = turf.convex(polyFeature);
      if (hull) {
        const hullArea = turf.area(hull);
        if (hullArea > 0) solidity = Math.min(1.0, area / hullArea);
      }
    } catch {
      solidity = 1.0;
    }

    // Aspect Ratio of bounding box
    const bbox = turf.bbox(polyFeature);
    const widthDeg = Math.abs(bbox[2] - bbox[0]);
    const heightDeg = Math.abs(bbox[3] - bbox[1]);
    const aspectRatio = Math.max(widthDeg, heightDeg) / Math.max(Math.min(widthDeg, heightDeg), 1e-9);

    const metrics = {
      areaSqM: Math.round(area * 10) / 10,
      perimeterM: Math.round(perimeter * 10) / 10,
      compactness: Math.round(compactness * 1000) / 1000,
      solidity: Math.round(solidity * 1000) / 1000,
      aspectRatio: Math.round(aspectRatio * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
    };

    if (confidence > 0 && confidence < 0.35) {
      return { isValid: false, areaSqM: metrics.areaSqM, reason: `Confidence too low (${confidence.toFixed(2)} < 0.35)`, metrics };
    }

    // Multi-criteria false-positive rejection rules:
    // Rule 1: Sprawling open area / agricultural field
    if (compactness < 0.035 && solidity < 0.50) {
      return { isValid: false, areaSqM: metrics.areaSqM, reason: `Sprawling open area (compactness=${compactness.toFixed(3)}, solidity=${solidity.toFixed(3)})`, metrics };
    }

    // Rule 2: Highly amorphous jagged boundary
    if (compactness < 0.02) {
      return { isValid: false, areaSqM: metrics.areaSqM, reason: `Highly amorphous boundary (compactness=${compactness.toFixed(4)})`, metrics };
    }

    // Rule 3: Thin linear sliver or road line segment mistakenly classified as building
    if (aspectRatio > 14.0 && compactness < 0.15) {
      return { isValid: false, areaSqM: metrics.areaSqM, reason: `Linear sliver/path artifact (aspect_ratio=${aspectRatio.toFixed(1)})`, metrics };
    }

    // Rule 4: Hollow ring / sprawling enclosure
    if (solidity < 0.30) {
      return { isValid: false, areaSqM: metrics.areaSqM, reason: `Non-solid irregular region (solidity=${solidity.toFixed(3)})`, metrics };
    }

    return { isValid: true, areaSqM: metrics.areaSqM, metrics };
  } catch (err: any) {
    return { isValid: false, areaSqM: 0, reason: `Geometry validation exception: ${err?.message}` };
  }
}

/**
 * Filters a list of buildings, rejecting open-area false positives and calculating truthful attributes.
 */
export function filterValidBuildingFeatures(
  buildings: Building[],
  enableLogging: boolean = true
): Building[] {
  if (!buildings || buildings.length === 0) return [];

  const validBuildings: Building[] = [];
  let rejectedCount = 0;

  for (const bld of buildings) {
    if (!bld.geometry || !bld.geometry.coordinates) {
      rejectedCount++;
      continue;
    }

    const conf = typeof bld.confidence === 'number' ? bld.confidence : 0.5;
    const result = validateBuildingGeometry(bld.geometry as any, bld.id, conf);

    if (result.isValid) {
      const stableId = bld.id.startsWith('B-') ? bld.id : (bld.id.length > 8 ? `B-${bld.id.slice(0, 8)}` : bld.id);
      validBuildings.push({
        ...bld,
        id: stableId,
        areaSqM: result.areaSqM,
        floors: bld.floors && bld.floors !== 'Unknown' && !isNaN(Number(bld.floors)) ? Number(bld.floors) : 'Unknown',
        confidence: conf,
        reviewStatus: bld.reviewStatus || (conf >= 0.5 ? 'Pending' : 'Needs Review')
      });
      if (enableLogging) {
        console.log(`[BUILDING AI] Accepted Building ${stableId}: Area=${result.areaSqM} m², Confidence=${conf.toFixed(2)}, Geometry valid=true, Review status=${bld.reviewStatus || 'Pending'}`);
      }
    } else {
      rejectedCount++;
      if (enableLogging) {
        console.log(`[BUILDING AI] Rejected Candidate ${bld.id}: Reason=${result.reason}, Area=${result.areaSqM} m², Confidence=${conf.toFixed(2)}`);
      }
    }
  }

  if (enableLogging) {
    console.log(`[BUILDING AI]\nCandidates detected: ${buildings.length}\nCandidates rejected: ${rejectedCount}\nValid buildings: ${validBuildings.length}`);
  }

  return validBuildings;
}

/**
 * Validates and repairs a building polygon/multipolygon geometry.
 */
function toValidTurfPolygon(building: Building): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null {
  const geom = building.geometry;
  if (!geom || !geom.coordinates || geom.coordinates.length === 0) return null;

  try {
    if (geom.type === 'Polygon') {
      const poly = turf.polygon(geom.coordinates as GeoJSON.Position[][], { id: building.id });
      // Unkink any self-intersecting polygon
      const unkinked = turf.unkinkPolygon(poly);
      if (unkinked.features.length === 1) {
        return poly;
      } else if (unkinked.features.length > 1) {
        const coords = unkinked.features.map(f => f.geometry.coordinates);
        return turf.multiPolygon(coords as GeoJSON.Position[][][], { id: building.id });
      }
      return poly;
    } else if (geom.type === 'MultiPolygon') {
      return turf.multiPolygon(geom.coordinates as GeoJSON.Position[][][], { id: building.id });
    }
  } catch (err) {
    console.warn(`[GIS VALIDATION] Failed to parse building ${building.id} geometry:`, err);
  }
  return null;
}

/**
 * Performs road-building spatial intersection analysis and removes road segments
 * that pass through building footprint interiors while preserving legitimate outside and edge segments.
 *
 * @param roads List of Road features
 * @param buildings List of Building features
 * @param enableLogging Whether to output [GIS VALIDATION] debug messages
 * @returns Corrected list of Road features with invalid interior segments removed
 */
export function cleanRoadsAgainstBuildings(
  roads: Road[],
  buildings: Building[],
  enableLogging: boolean = true
): Road[] {
  if (!roads || roads.length === 0) return [];
  if (!buildings || buildings.length === 0) return roads;

  // Ensure road clipping only uses validated physical building footprints
  const validatedBuildings = filterValidBuildingFeatures(buildings, false);
  if (validatedBuildings.length === 0) return roads;

  // Prepare valid building polygons
  const validBuildings: {
    id: string;
    feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
    boundaryLines: any;
  }[] = [];

  for (const bld of validatedBuildings) {
    const polyFeature = toValidTurfPolygon(bld);
    if (!polyFeature) continue;
    try {
      const boundary = turf.polygonToLine(polyFeature);
      validBuildings.push({
        id: bld.id,
        feature: polyFeature,
        boundaryLines: boundary
      });
    } catch {
      validBuildings.push({
        id: bld.id,
        feature: polyFeature,
        boundaryLines: polyFeature
      });
    }
  }

  if (validBuildings.length === 0) return roads;

  const correctedRoads: Road[] = [];

  for (const road of roads) {
    const roadGeom = road.geometry;
    if (!roadGeom || !roadGeom.coordinates || roadGeom.coordinates.length === 0) continue;

    // Decompose road into LineString segments
    let lineSegments: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    if (roadGeom.type === 'LineString') {
      const coords = roadGeom.coordinates as [number, number][];
      if (coords.length >= 2) lineSegments.push(turf.lineString(coords));
    } else if (roadGeom.type === 'MultiLineString') {
      const multiCoords = roadGeom.coordinates as [number, number][][];
      for (const coords of multiCoords) {
        if (coords.length >= 2) lineSegments.push(turf.lineString(coords));
      }
    } else {
      // Pass-through unexpected geometry type
      correctedRoads.push(road);
      continue;
    }

    if (lineSegments.length === 0) continue;

    let totalRemovedMeters = 0;
    const intersectingBuildingIds: string[] = [];

    // Check each building against all line segments
    for (const { id: bldId, feature: bldFeature, boundaryLines } of validBuildings) {
      const nextSegments: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      let buildingIntersectedThisRoad = false;

      for (const segment of lineSegments) {
        // Quick bounding box / boolean intersection check
        let hasIntersection = false;
        try {
          hasIntersection = turf.booleanIntersects(segment, bldFeature);
        } catch {
          hasIntersection = false;
        }

        if (!hasIntersection) {
          nextSegments.push(segment);
          continue;
        }

        buildingIntersectedThisRoad = true;

        // Split the road segment at building boundary intersection points
        let splitResult: GeoJSON.FeatureCollection<GeoJSON.LineString> | null = null;
        try {
          splitResult = turf.lineSplit(segment, boundaryLines as any);
        } catch {
          splitResult = null;
        }

        if (!splitResult || splitResult.features.length === 0) {
          // If lineSplit did not produce multiple parts:
          // Check if the entire segment is inside or outside the building
          const segLen = turf.length(segment, { units: 'meters' });
          const midPoint = turf.along(segment, segLen > 0 ? segLen / 2000 : 0, { units: 'kilometers' });
          const isInside = turf.booleanPointInPolygon(midPoint, bldFeature, { ignoreBoundary: true });

          if (isInside) {
            totalRemovedMeters += segLen;
          } else {
            nextSegments.push(segment);
          }
          continue;
        }

        // Evaluate each sub-segment created by splitting
        for (const subSeg of splitResult.features) {
          const subLen = turf.length(subSeg, { units: 'meters' });
          if (subLen <= 0.001) continue; // Skip zero-length artifacts

          // Sample midpoint of the subsegment
          const midPoint = turf.along(subSeg, subLen / 2000, { units: 'kilometers' });

          // Test if midpoint lies strictly inside the building interior (ignoring boundaries)
          const isInterior = turf.booleanPointInPolygon(midPoint, bldFeature, { ignoreBoundary: true });

          if (isInterior) {
            // Invalid road portion running through building interior -> REMOVE
            totalRemovedMeters += subLen;
          } else {
            // Valid road portion outside or touching edge -> KEEP
            nextSegments.push(subSeg);
          }
        }
      }

      if (buildingIntersectedThisRoad && !intersectingBuildingIds.includes(bldId)) {
        intersectingBuildingIds.push(bldId);
      }

      lineSegments = nextSegments;
    }

    // Merge contiguous segments back together for clean geometries
    lineSegments = mergeContiguousSegments(lineSegments);

    if (intersectingBuildingIds.length > 0 && totalRemovedMeters > 0 && enableLogging) {
      console.log(
        `[GIS VALIDATION]\nRoad ${road.id} intersects Building ${intersectingBuildingIds.join(', ')}\nRemoved segment inside building: ${totalRemovedMeters.toFixed(1)} m\nRemaining road geometry: ${lineSegments.length} segment(s)`
      );
    }

    if (lineSegments.length === 0) {
      // Entire road was inside building footprint
      continue;
    }

    if (lineSegments.length === 1) {
      correctedRoads.push({
        ...road,
        geometry: {
          type: 'LineString',
          coordinates: lineSegments[0].geometry.coordinates as [number, number][]
        }
      });
    } else {
      correctedRoads.push({
        ...road,
        geometry: {
          type: 'MultiLineString',
          coordinates: lineSegments.map(s => s.geometry.coordinates as [number, number][])
        }
      });
    }
  }

  return correctedRoads;
}
