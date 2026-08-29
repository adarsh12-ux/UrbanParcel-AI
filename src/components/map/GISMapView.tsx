import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, useMap } from 'react-leaflet';
import { Parcel, Building, Road } from '../../types';
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
}

// Controller component to invalidate map size & fly to selected parcel
const MapController: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 16 }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }

    return () => clearTimeout(timer);
  }, [center, zoom, map]);

  return null;
};

export const GISMapView: React.FC<GISMapViewProps> = ({
  parcels,
  buildings,
  roads,
  selectedParcel,
  onSelectParcel,
  layersState,
  basemap,
  center
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

  // Convert GeoJSON coordinates [[[lng, lat], ...]] -> Leaflet [[lat, lng], ...]
  const toLeafletPolygon = (coords: number[][][]): [number, number][] => {
    if (!coords || !Array.isArray(coords) || !coords[0] || !Array.isArray(coords[0])) return [];
    return coords[0].map(([lng, lat]) => [lat, lng]);
  };

  const toLeafletLine = (coords: number[][]): [number, number][] => {
    if (!coords || !Array.isArray(coords)) return [];
    return coords.map(([lng, lat]) => [lat, lng]);
  };

  // Dynamic style for Land Use types
  const getLandUseColor = (landUse: string, isSelected: boolean) => {
    if (isSelected) return '#06b6d4'; // Cyan 500 for selected

    switch (landUse) {
      case 'Residential': return '#3b82f6'; // Blue
      case 'Commercial': return '#10b981'; // Emerald
      case 'Mixed': return '#8b5cf6'; // Purple
      case 'Government': return '#f59e0b'; // Amber
      case 'Industrial': return '#ef4444'; // Red
      default: return '#0284c7'; // Cyan
    }
  };

  const safeCenter: [number, number] = center && center[0] && center[1] ? center : [16.5062, 80.6480];

  return (
    <div className="w-full h-full min-h-[400px] relative z-0">
      <MapContainer
        center={safeCenter}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden z-0"
        zoomControl={true}
      >
        <TileLayer
          key={basemap}
          url={tileUrls[basemap] || tileUrls.streets}
          attribution={tileAttributions[basemap] || tileAttributions.streets}
          maxZoom={19}
        />

        <MapController center={selectedParcel ? selectedParcel.center : safeCenter} />

        {/* Parcels Layer */}
        {layersState.parcels && parcels.map((parcel) => {
          const positions = toLeafletPolygon(parcel.geometry?.coordinates);
          if (!positions || positions.length < 3) return null;

          const isSelected = selectedParcel?.id === parcel.id;
          const strokeColor = isSelected ? '#22d3ee' : getLandUseColor(parcel.landUse, false);

          return (
            <Polygon
              key={parcel.id}
              positions={positions}
              pathOptions={{
                color: strokeColor,
                weight: isSelected ? 4 : 2.5,
                fillColor: strokeColor,
                fillOpacity: isSelected ? 0.45 : 0.25,
                dashArray: parcel.status === 'Flagged' ? '6, 6' : undefined
              }}
              eventHandlers={{
                click: () => onSelectParcel(parcel)
              }}
            >
              <Tooltip sticky direction="top" className="custom-leaflet-tooltip font-sans text-xs">
                <div className="p-1 font-sans space-y-0.5">
                  <div className="flex items-center gap-1 font-bold text-slate-900">
                    <span>{parcel.id}</span>
                    <span className="text-[10px] text-cyan-600 font-mono">({parcel.surveyNo})</span>
                  </div>
                  <p className="text-[11px] text-slate-700">Area: <strong>{parcel.areaSqM} m²</strong> | Land Use: {parcel.landUse}</p>
                  <p className="text-[10px] text-emerald-700 font-medium">AI Confidence: {parcel.confidence}%</p>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Buildings Layer */}
        {layersState.buildings && buildings.map((bld) => {
          const positions = toLeafletPolygon(bld.geometry?.coordinates);
          if (!positions || positions.length < 3) return null;

          return (
            <Polygon
              key={bld.id}
              positions={positions}
              pathOptions={{
                color: '#d97706',
                weight: 1.5,
                fillColor: '#f59e0b',
                fillOpacity: 0.7
              }}
            >
              <Tooltip sticky direction="top">
                <div className="p-1 text-xs">
                  <p className="font-bold text-slate-900">{bld.type}</p>
                  <p className="text-[10px] text-slate-700">Area: {bld.areaSqM} m² | Floors: {bld.floors}</p>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Roads Layer */}
        {layersState.roads && roads.map((road) => {
          const positions = toLeafletLine(road.geometry?.coordinates);
          if (!positions || positions.length < 2) return null;

          return (
            <Polyline
              key={road.id}
              positions={positions}
              pathOptions={{
                color: '#10b981',
                weight: 5,
                opacity: 0.85
              }}
            >
              <Tooltip sticky direction="top">
                <div className="p-1 text-xs">
                  <p className="font-bold text-slate-900">{road.name}</p>
                  <p className="text-[10px] text-slate-700">Width: {road.widthM}m | {road.surfaceType}</p>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}
      </MapContainer>
    </div>
  );
};

