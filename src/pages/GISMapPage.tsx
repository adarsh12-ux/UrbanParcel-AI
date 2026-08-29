import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Layers, Search, MapPin, Download, BarChart3, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
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
    <div className="flex-1 flex flex-col relative h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
      {/* Map Header Toolbar */}
      <div className="h-12 bg-slate-950/90 border-b border-slate-800/80 px-4 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Interactive GIS Workspace</span>
            <span className="text-slate-500 font-mono">[{project?.name || 'Urban Zone A'}]</span>
          </div>

          <form onSubmit={handleSearchParcel} className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Parcel ID (e.g. UP-1001)..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-400 font-mono focus:outline-none focus:border-cyan-500"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setLayerControlOpen(!layerControlOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Layers Control</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-cyan-300 font-medium transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">AI Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GIS</span>
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
          <div className="absolute top-4 left-4 z-10 animate-fade-in">
            <LayerControl
              layers={layersState}
              onToggleLayer={handleToggleLayer}
              basemap={basemap}
              onSelectBasemap={setBasemap}
            />
          </div>
        )}

        {/* Selected Parcel Details Panel Right */}
        {panelOpen && selectedParcel && (
          <div className="absolute top-4 right-4 z-10 animate-fade-in">
            <ParcelInfoPanel
              parcel={selectedParcel}
              onClose={() => setPanelOpen(false)}
              projectId={projectId}
            />
          </div>
        )}
      </div>

      {/* Bottom GIS Statistics Bar */}
      <div className="h-10 bg-slate-950/95 border-t border-slate-800/80 px-4 flex items-center justify-between z-20 backdrop-blur-md text-xs font-mono text-slate-300">
        <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Parcels:</span>
            <span className="font-bold text-cyan-400">247</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Buildings:</span>
            <span className="font-bold text-amber-400">381</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Road Segments:</span>
            <span className="font-bold text-emerald-400">42</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-slate-500">Mapped Area:</span>
            <span className="font-bold text-slate-200">4.2 km²</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[11px] text-slate-400">
          <span>Scale: 1:1,000</span>
          <span>CRS: EPSG:4326</span>
          <span className="text-emerald-400 font-semibold">AI Confidence: 94.7%</span>
        </div>
      </div>
    </div>
  );
};
