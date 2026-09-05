import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, Download, BarChart3, SlidersHorizontal } from 'lucide-react';
import { Project, Parcel, Building, Road } from '../types';
import { api } from '../services/api';
import { GISMapView } from '../components/map/GISMapView';
import { LayerControl, MapLayersState } from '../components/map/LayerControl';
import { ParcelInfoPanel } from '../components/map/ParcelInfoPanel';

export const GISMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const projectId = id || 'proj-001';

  const [project, setProject] = useState<Project | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roads, setRoads] = useState<Road[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [basemap, setBasemap] = useState<'satellite' | 'streets' | 'dark'>('streets');

  const [layersState, setLayersState] = useState<MapLayersState>({
    droneImagery: true,
    parcels: true,
    buildings: true,
    roads: true,
    waterBodies: false,
    vegetation: false,
    cadastralData: false
  });

  const [layerControlOpen, setLayerControlOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    async function loadGISData() {
      const [projData, parcelsData, buildingsData, roadsData] = await Promise.all([
        api.getProject(projectId),
        api.getParcels(projectId),
        api.getBuildings(projectId),
        api.getRoads(projectId)
      ]);

      setProject(projData);
      setParcels(parcelsData);
      setBuildings(buildingsData);
      setRoads(roadsData);

      // Check URL query for parcel ID search
      const parcelSearch = searchParams.get('search');
      if (parcelSearch) {
        const found = parcelsData.find(p => p.id.toLowerCase() === parcelSearch.toLowerCase());
        if (found) {
          setSelectedParcel(found);
          setSearchQuery(parcelSearch);
        }
      } else if (parcelsData.length > 0) {
        // Select UP-1001 by default
        setSelectedParcel(parcelsData[0]);
      }
    }
    loadGISData();
  }, [projectId, searchParams]);

  const handleToggleLayer = (key: keyof MapLayersState) => {
    setLayersState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearchParcel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    const match = parcels.find(p => p.id.toLowerCase().includes(q) || p.surveyNo.toLowerCase().includes(q));
    if (match) {
      setSelectedParcel(match);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative h-[calc(100vh-64px)] overflow-hidden bg-canvas">
      {/* Map Header Toolbar */}
      <div className="h-12 bg-white border-b border-line px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-700"></span>
            <span className="font-bold">Interactive GIS Workspace</span>
            <span className="text-muted font-mono">[{project?.name || 'Urban Zone A'}]</span>
          </div>

          <form onSubmit={handleSearchParcel} className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Parcel ID (e.g. UP-1001)..."
              className="bg-white border border-line rounded-sm pl-8 pr-3 py-1 text-xs text-ink placeholder:text-muted font-mono focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
            />
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={() => setLayerControlOpen(!layerControlOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-sm border text-xs font-medium cursor-pointer ${
              layerControlOpen
                ? 'bg-navy-50 border-navy-100 text-navy-900 font-semibold'
                : 'bg-white border-line text-ink hover:bg-navy-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-navy-700" />
            <span className="hidden sm:inline">Layers Control</span>
            <span className="sm:hidden">Layers</span>
          </button>

          {selectedParcel && (
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-sm border text-xs font-medium cursor-pointer ${
                panelOpen
                  ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                  : 'bg-white border-line text-ink hover:bg-navy-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">Parcel Info</span>
              <span className="sm:hidden">Info</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-sm bg-white border border-line hover:bg-navy-50 text-ink font-medium cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-navy-700" />
            <span className="hidden sm:inline">AI Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-sm bg-forest-700 hover:bg-forest-600 text-white font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export GIS</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Main Map Container */}
      <div className="flex-1 relative w-full h-full">
        {/* Leaflet Map */}
        <GISMapView
          parcels={parcels}
          buildings={buildings}
          roads={roads}
          selectedParcel={selectedParcel}
          onSelectParcel={(p) => {
            setSelectedParcel(p);
            setPanelOpen(true);
          }}
          layersState={layersState}
          basemap={basemap}
          center={project?.centerCoordinates || [16.5062, 80.6480]}
        />

        {/* Floating Layer Control Panel Left */}
        {layerControlOpen && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 max-w-[calc(100vw-1rem)]">
            <LayerControl
              layers={layersState}
              onToggleLayer={handleToggleLayer}
              basemap={basemap}
              onSelectBasemap={setBasemap}
              onClose={() => setLayerControlOpen(false)}
            />
          </div>
        )}

        {/* Selected Parcel Details Panel Right */}
        {panelOpen && selectedParcel && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 max-w-[calc(100vw-1rem)]">
            <ParcelInfoPanel
              parcel={selectedParcel}
              onClose={() => setPanelOpen(false)}
              projectId={projectId}
            />
          </div>
        )}
      </div>

      {/* Bottom GIS Statistics Bar */}
      <div className="h-10 bg-white border-t border-line px-4 flex items-center justify-between z-20 text-xs font-mono text-ink">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted font-sans">Parcels:</span>
            <span className="font-bold text-navy-900">247</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted font-sans">Buildings:</span>
            <span className="font-bold text-amber-800">381</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted font-sans">Road Segments:</span>
            <span className="font-bold text-forest-800">42</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-muted font-sans">Mapped Area:</span>
            <span className="font-bold text-ink">4.2 km²</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[11px] text-muted">
          <span>Scale: 1:1,000</span>
          <span>CRS: EPSG:4326</span>
          <span className="text-forest-800 font-semibold">AI Confidence: 94.7%</span>
        </div>
      </div>
    </div>
  );
};
