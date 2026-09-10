import React, { useEffect } from 'react';
import { MapContainer, TileLayer, ImageOverlay, Polygon, Polyline, Tooltip, useMap } from 'react-leaflet';
import { LocateFixed, Maximize, Minus, Plus } from 'lucide-react';
import { Parcel, Building, Road } from '../../types';
import { cleanRoadsAgainstBuildings, filterValidBuildingFeatures } from '../../utils/gisSpatial';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix standard Leaflet default marker icons for Vite module bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface GISMapViewProps {
  parcels: Parcel[];
  buildings: Building[];
  roads: Road[];
  selectedParcel: Parcel | null;
  onSelectParcel: (parcel: Parcel) => void;
  layersState: {
    droneImagery: boolean;
    parcels: boolean;
    buildings: boolean;
    roads: boolean;
  };
  basemap: 'satellite' | 'streets' | 'dark';
  center: [number, number];
  showImagery: boolean;
  imageryUrl?: string;
  imageryBounds?: [[number, number], [number, number]];
  surveyFootprint?: GeoJSON.Polygon;
}

const collectGeometryPoints = (value: unknown, points: [number, number][]) => {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && value.every(item => typeof item === 'number' && Number.isFinite(item))) {
    const [lng, lat] = value;
    if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) points.push([lat, lng]);
    return;
  }
  value.forEach(item => collectGeometryPoints(item, points));
};

// Controller component to invalidate map size and fit the actual persisted data.
const MapController: React.FC<{
  center: [number, number];
  selectedParcel: Parcel | null;
  parcels: Parcel[];
  buildings: Building[];
  roads: Road[];
  imageryBounds?: [[number, number], [number, number]];
  surveyFootprint?: GeoJSON.Polygon;
}> = ({ center, selectedParcel, parcels, buildings, roads, imageryBounds }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (selectedParcel?.center?.[0] && selectedParcel.center[1]) {
      map.flyTo(selectedParcel.center, 17, { duration: 1.2 });
      return () => clearTimeout(timer);
    }

    if (imageryBounds) {
      map.fitBounds(L.latLngBounds(imageryBounds), { padding: [36, 36], maxZoom: 18, animate: true });
    } else {
      const points: [number, number][] = [];
      [...parcels, ...buildings, ...roads].forEach(feature => collectGeometryPoints(feature.geometry?.coordinates, points));
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 18, animate: true });
      } else if (center && center[0] && center[1]) {
        map.flyTo(center, 16, { duration: 1.2 });
      }
    }

    return () => clearTimeout(timer);
  }, [center, selectedParcel, parcels, buildings, roads, imageryBounds, map]);

  return null;
};

const MapControls: React.FC<{
  parcels: Parcel[];
  buildings: Building[];
  roads: Road[];
  imageryBounds?: [[number, number], [number, number]];
}> = ({ parcels, buildings, roads, imageryBounds }) => {
  const map = useMap();

  const fitAllData = () => {
    if (imageryBounds) {
      map.fitBounds(L.latLngBounds(imageryBounds), { padding: [24, 24], maxZoom: 17 });
    } else {
      const points: [number, number][] = [];
      [...parcels, ...buildings, ...roads].forEach(feature => collectGeometryPoints(feature.geometry?.coordinates, points));
      if (points.length > 0) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17 });
    }
  };

  return (
    <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1 rounded bg-white p-1 shadow-md">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        title="Zoom in"
        aria-label="Zoom in"
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        title="Zoom out"
        aria-label="Zoom out"
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={fitAllData}
        title="Reset project view"
        aria-label="Reset project view"
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <LocateFixed className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={fitAllData}
        disabled={parcels.length === 0 && buildings.length === 0 && roads.length === 0 && !imageryBounds}
        title="Fit all project data"
        aria-label="Fit all project data"
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <Maximize className="h-4 w-4" />
      </button>
    </div>
  );
};

export const GISMapView: React.FC<GISMapViewProps> = ({
  parcels,
  buildings,
  roads,
  selectedParcel,
  onSelectParcel,
  layersState,
  basemap,
  center,
  showImagery,
  imageryUrl,
  imageryBounds,
  surveyFootprint
}) => {
  // Tile URL Map with OpenStreetMap as primary reliable provider
  const tileUrls = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };

  const tileAttributions = {
    streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
    dark: '&copy; <a href="https://carto.com/attributions">CARTO</a>'
  };

  // Convert GeoJSON coordinates to Leaflet lat/lng positions
  const toLeafletPolygon = (coords: any): [number, number][] => {
    if (!coords || !Array.isArray(coords) || !coords[0] || !Array.isArray(coords[0])) return [];
    return coords[0].map(([lng, lat]: [number, number]) => [lat, lng]);
  };

  const toLeafletLine = (coords: any): [number, number][] => {
    if (!coords || !Array.isArray(coords)) return [];
    return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
  };

  const surveyPositions = surveyFootprint?.coordinates?.[0]?.map(([lng, lat]) => [lat, lng] as [number, number]);

  // Dynamic style for Land Use types
  const getLandUseColor = (landUse: string, isSelected: boolean) => {
    if (isSelected) return '#0f766e';

    switch (landUse) {
      case 'Residential': return '#2563eb';
      case 'Commercial': return '#0d9488';
      case 'Mixed': return '#7c3aed';
      case 'Government': return '#d97706';
      case 'Industrial': return '#dc2626';
      default: return '#334155';
    }
  };

  const safeCenter: [number, number] = center;

  // Building Feature Validation & False-Positive Filtering:
  // Rejects large open-area polygons and calculates truthful geodesic areas & attributes.
  const validBuildings = React.useMemo(() => {
    return filterValidBuildingFeatures(buildings, true);
  }, [buildings]);

  // Spatial Validation & Conflict Resolution:
  // Dynamically clip and remove road segments that intersect building footprint interiors.
  const spatiallyCleanedRoads = React.useMemo(() => {
    return cleanRoadsAgainstBuildings(roads, validBuildings, true);
  }, [roads, validBuildings]);

  return (
    <div className="w-full h-full min-h-[400px] relative z-0">
      <MapContainer
        center={safeCenter}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[400px] overflow-hidden z-0"
        zoomControl={true}
      >
        {/* Layer 1: Basemap */}
        {showImagery && (
          <TileLayer
            key={basemap}
            url={tileUrls[basemap] || tileUrls.streets}
            attribution={tileAttributions[basemap] || tileAttributions.streets}
            maxZoom={19}
          />
        )}

        {/* Layer 2: Drone Orthomosaic Imagery */}
        {showImagery && imageryUrl && imageryBounds && (
          <ImageOverlay url={imageryUrl} bounds={imageryBounds} opacity={0.65} zIndex={1} />
        )}

        {/* Layer 2b: Survey Footprint (derived strictly from uploaded GeoTIFF) */}
        {(surveyPositions || imageryBounds) && (
          <Polygon
            positions={surveyPositions || imageryBounds!}
            interactive={false}
            pathOptions={{ color: '#0f766e', weight: 2, dashArray: '6 4', fillColor: '#14b8a6', fillOpacity: 0.05 }}
          />
        )}

        <MapController
          center={safeCenter}
          selectedParcel={selectedParcel}
          parcels={parcels}
          buildings={validBuildings}
          roads={spatiallyCleanedRoads}
          imageryBounds={imageryBounds}
        />
        <MapControls parcels={parcels} buildings={validBuildings} roads={spatiallyCleanedRoads} imageryBounds={imageryBounds} />

        {/* Layer 3: Real Cadastral Parcel Boundaries (User-Imported) */}
        {layersState.parcels && parcels.map((parcel) => {
          const isMulti = parcel.geometry?.type === 'MultiPolygon';
          const polygonCoordinates = isMulti
            ? (parcel.geometry.coordinates as number[][][][])
            : [parcel.geometry?.coordinates as number[][][]];
          const isSelected = selectedParcel?.id === parcel.id;
          const strokeColor = isSelected ? '#0f766e' : getLandUseColor(parcel.landUse, false);

          return polygonCoordinates.map((polygon, polygonIndex) => {
            const positions = toLeafletPolygon(polygon);
            if (positions.length < 3) return null;
            return (
              <Polygon
                key={`${parcel.id}-${polygonIndex}`}
                positions={positions}
                pathOptions={{
                  color: strokeColor,
                  weight: isSelected ? 3.5 : 2,
                  fillColor: strokeColor,
                  fillOpacity: isSelected ? 0.4 : 0.18,
                  dashArray: parcel.status === 'Flagged' ? '6, 6' : undefined
                }}
                eventHandlers={{ click: () => onSelectParcel(parcel) }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip font-sans text-xs">
                  <div className="p-1 font-sans space-y-0.5">
                    <div className="flex items-center gap-1 font-bold text-slate-900">
                      <span>{parcel.id}</span>
                      <span className="text-[10px] text-teal-800 font-mono">({parcel.surveyNo})</span>
                    </div>
                    <p className="text-[11px] text-slate-700">Area: <strong>{parcel.areaSqM.toLocaleString()} m²</strong> | Land Use: {parcel.landUse}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Source: {parcel.source || 'User Imported Cadastral Data'}</p>
                  </div>
                </Tooltip>
              </Polygon>
            );
          });
        })}

        {/* Layer 4: AI Detected Buildings (SegFormer) - validated footprints only */}
        {layersState.buildings && validBuildings.map((bld) => {
          const isMulti = bld.geometry?.type === 'MultiPolygon';
          const polygons = isMulti
            ? (bld.geometry.coordinates as number[][][][])
            : [bld.geometry?.coordinates as number[][][]];

          return polygons.map((poly, polyIdx) => {
            const positions = toLeafletPolygon(poly);
            if (!positions || positions.length < 3) return null;

            return (
              <Polygon
                key={`${bld.id}-${polyIdx}`}
                positions={positions}
                pathOptions={{
                  color: '#d97706',
                  weight: 1.5,
                  fillColor: '#f59e0b',
                  fillOpacity: 0.65
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip font-sans text-xs">
                  <div className="p-1.5 font-sans space-y-0.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-0.5">
                      <p className="font-bold text-slate-900">{bld.id.startsWith('B-') ? bld.id : `Building ${bld.id.slice(0, 8)}`}</p>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                        {bld.confidence ? `${Math.round(bld.confidence * 100)}%` : 'AI'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      Footprint Area: <strong>{bld.areaSqM.toLocaleString()} m²</strong>
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Floors: <span className="font-medium text-slate-800">{bld.floors && bld.floors !== 'Unknown' ? bld.floors : 'Unknown'}</span>
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                      <span>Source: {bld.source === 'ai_extracted' ? 'AI Extracted' : bld.source || 'AI Detection'}</span>
                      <span>•</span>
                      <span className="capitalize">{bld.reviewStatus || 'Pending'}</span>
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          });
        })}

        {/* Layer 5: AI Detected Roads (SegFormer) - spatially validated & clipped */}
        {layersState.roads && spatiallyCleanedRoads.map((road) => {
          const isMulti = road.geometry?.type === 'MultiLineString';
          const lines = isMulti
            ? (road.geometry.coordinates as number[][][])
            : [road.geometry?.coordinates as number[][]];

          return lines.map((lineCoords, lineIdx) => {
            const positions = toLeafletLine(lineCoords);
            if (!positions || positions.length < 2) return null;

            return (
              <Polyline
                key={`${road.id}-${lineIdx}`}
                positions={positions}
                pathOptions={{
                  color: '#166534',
                  weight: 4,
                  opacity: 0.85
                }}
              >
                <Tooltip sticky direction="top">
                  <div className="p-1 text-xs space-y-0.5">
                    <p className="font-bold text-slate-900">{road.name || 'Road'}</p>
                    <p className="text-[10px] text-slate-700">Width: {road.widthM}m | {road.surfaceType}</p>
                    <p className="text-[10px] text-emerald-800 font-medium">Source: {road.source || 'AI Detection (SegFormer)'}</p>
                  </div>
                </Tooltip>
              </Polyline>
            );
          });
        })}
      </MapContainer>
    </div>
  );
};

