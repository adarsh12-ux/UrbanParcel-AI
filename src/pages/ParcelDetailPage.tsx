import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Parcel } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  ArrowLeft,
  Building2,
  Navigation,
  Maximize2,
  ShieldCheck,
  MapPin,
  Download,
  BarChart3,
  User,
  FileText,
  Layers,
  Map
} from 'lucide-react';

export const ParcelDetailPage: React.FC = () => {
  const { id, parcelId } = useParams<{ id: string; parcelId: string }>();
  const navigate = useNavigate();

  const projectId = id || 'proj-001';
  const targetParcelId = parcelId || 'UP-1001';

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadParcel() {
      setLoading(true);
      const data = await api.getParcel(projectId, targetParcelId);
      setParcel(data);
      setLoading(false);
    }
    loadParcel();
  }, [projectId, targetParcelId]);

  if (loading || !parcel) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-48 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Back to GIS Map */}
      <button
        onClick={() => navigate(`/projects/${projectId}/map`)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Interactive Map</span>
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold font-mono text-slate-100">{parcel.id}</h1>
            <StatusBadge status={parcel.status} />
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Survey Number: <strong className="text-cyan-400">{parcel.surveyNo}</strong> | Registered to: {parcel.ownerName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>View AI Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export Parcel GeoJSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 uppercase font-semibold">Total Land Area</p>
          <p className="text-2xl font-bold font-mono text-slate-100">{parcel.areaSqM.toLocaleString()} m²</p>
          <p className="text-[10px] text-slate-500">{(parcel.areaSqM * 0.000247105).toFixed(3)} acres</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 uppercase font-semibold">Boundary Perimeter</p>
          <p className="text-2xl font-bold font-mono text-slate-100">{parcel.perimeterM} m</p>
          <p className="text-[10px] text-slate-500">Vector polygon perimeter</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 uppercase font-semibold">Building Structures</p>
          <p className="text-2xl font-bold font-mono text-amber-400">{parcel.buildingCount}</p>
          <p className="text-[10px] text-slate-500">Extracted footprints</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-xs text-slate-400 uppercase font-semibold">AI Confidence</p>
          <p className="text-2xl font-bold font-mono text-emerald-400">{parcel.confidence}%</p>
          <p className="text-[10px] text-emerald-600 font-medium">U-Net Segmentation</p>
        </div>
      </div>

      {/* Details Grid & Mini Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>Cadastral Attribute Record</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <p className="text-slate-400 text-[10px]">Land Use Zoning Category</p>
              <p className="font-semibold text-cyan-300 text-sm mt-0.5">{parcel.landUse}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <p className="text-slate-400 text-[10px]">Road Access Status</p>
              <p className="font-semibold text-emerald-400 text-sm mt-0.5">{parcel.roadAccess}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <p className="text-slate-400 text-[10px]">Land Ownership</p>
              <p className="font-semibold text-slate-200 text-sm mt-0.5">{parcel.ownerName}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
              <p className="text-slate-400 text-[10px]">Cadastral Status</p>
              <p className="font-semibold text-slate-200 text-sm mt-0.5">{parcel.status}</p>
            </div>
            <div className="col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono">
              <p className="text-slate-400 text-[10px] font-sans">Geographic Center Coordinates</p>
              <p className="font-semibold text-slate-200 text-sm mt-0.5">
                Latitude: {parcel.center[0]}° N | Longitude: {parcel.center[1]}° E
              </p>
            </div>
          </div>

          {parcel.notes && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400 text-[10px]">Verification & Notes</p>
              <p className="text-slate-300">{parcel.notes}</p>
            </div>
          )}
        </div>

        {/* Mini Map Preview Panel Right */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-4 h-4 text-cyan-400" />
              <span>Spatial Bounds</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Zoom 18</span>
          </div>

          <div className="relative flex-1 min-h-[200px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:20px_20px] opacity-25"></div>
            <div className="text-center z-10 space-y-2">
              <div className="w-10 h-10 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center mx-auto shadow-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="font-mono text-xs font-bold text-slate-200">{parcel.id}</p>
              <p className="text-[11px] text-slate-400 font-mono">{parcel.areaSqM} m² Boundary</p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${projectId}/map?search=${parcel.id}`)}
            className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            Locate on Interactive Map
          </button>
        </div>
      </div>
    </div>
  );
};
