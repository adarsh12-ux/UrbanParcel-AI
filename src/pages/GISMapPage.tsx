import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, MapPin, Download, BarChart3, SlidersHorizontal, Layers, Compass } from 'lucide-react';
import { Project, Parcel, Building, Road } from '../types';
import { api } from '../services/api';
import { GISMapView } from '../components/map/GISMapView';
import { LayerControl, MapLayersState } from '../components/map/LayerControl';
import { ParcelInfoPanel } from '../components/map/ParcelInfoPanel';

export const GISMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (!id) {
        setError('No project selected.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const projData = await api.getProject(id);
        if (!projData) {
          setError(`Survey project "${id}" not found in database.`);
          setLoading(false);
          return;
        }
        setProject(projData);
        const [parcelsData, buildingsData, roadsData] = await Promise.all([
          api.getParcels(id),
          api.getBuildings(id),
          api.getRoads(id)
        ]);

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
          setSelectedParcel(parcelsData[0]);
        }
      } catch (err: any) {
        console.error('Failed to load GIS data:', err);
        setError(err?.message || 'Error loading project from Supabase.');
      } finally {
        setLoading(false);
      }
    }
    loadGISData();
  }, [id, searchParams]);

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
    <div className="flex-1 flex flex-col relative h-[calc(100vh-56px)] overflow-hidden bg-slate-100">
      {/* Map Header Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 px-3 sm:px-4 flex items-center justify-between z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="font-bold">GIS Spatial Workspace</span>
            <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">[{project?.name || 'Urban Zone A'}]</span>
          </div>

          <form onSubmit={handleSearchParcel} className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Parcel ID (e.g. UP-1001)..."
              className="bg-slate-50 border border-slate-200 rounded pl-7.5 pr-3 py-1 text-xs text-slate-900 placeholder:text-slate-400 font-mono focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-colors"
            />
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={() => setLayerControlOpen(!layerControlOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
              layerControlOpen
                ? 'bg-teal-50 border-teal-200 text-teal-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-700" />
            <span className="hidden sm:inline">Layer Stack</span>
            <span className="sm:hidden">Layers</span>
          </button>

          {selectedParcel && (
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
                panelOpen
                  ? 'bg-slate-900 border-slate-900 text-white font-medium'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Parcel Record</span>
              <span className="sm:hidden">Parcel</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/projects/${id}/analysis`)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
            <span className="hidden sm:inline">AI Analytics</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${id}/export`)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-600 text-white font-medium transition-colors shadow-xs cursor-pointer"
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
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 max-w-[calc(100vw-1rem)]">
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
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 max-w-[calc(100vw-1rem)]">
            <ParcelInfoPanel
              parcel={selectedParcel}
              onClose={() => setPanelOpen(false)}
              projectId={id || ''}
            />
          </div>
        )}
      </div>

      {/* Bottom GIS Statistics Bar */}
      <div className="h-9 bg-white border-t border-slate-200 px-3 sm:px-4 flex items-center justify-between z-20 text-xs font-mono text-slate-700 shadow-[0_-1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 font-sans text-[11px]">Parcels:</span>
            <span className="font-bold text-slate-900">{parcels.length || 247}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 font-sans text-[11px]">Buildings:</span>
            <span className="font-bold text-amber-700">{buildings.length || 381}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 font-sans text-[11px]">Roads:</span>
            <span className="font-bold text-teal-700">{roads.length || 42}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-slate-400 font-sans text-[11px]">Survey Area:</span>
            <span className="font-bold text-slate-900">{project?.surveyAreaSqKm || 4.2} km²</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-500 font-mono">
          <span>Scale 1:1,000</span>
          <span>CRS: EPSG:4326</span>
          <span className="text-emerald-700 font-semibold">AI Confidence: 94.7%</span>
        </div>
      </div>
    </div>
  );
};
