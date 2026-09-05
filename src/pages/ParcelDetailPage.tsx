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
  Map,
  Compass
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
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="h-40 rounded bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl mx-auto w-full space-y-5">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(`/projects/${projectId}/map`)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Interactive GIS Map</span>
      </button>

      {/* Refined Institutional Cadastral Header */}
      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Cadastral Parcel Unit Record
            </span>
            <StatusBadge status={parcel.status} size="sm" />
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 tracking-tight">{parcel.id}</h1>
            <span className="text-sm font-mono text-teal-800 font-semibold">{parcel.surveyNo}</span>
          </div>
          <p className="text-xs text-slate-500">
            Registered Property Owner: <strong className="text-slate-800 font-medium">{parcel.ownerName}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
            <span>AI Analytics</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GeoJSON</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Cadastral Area</p>
          <p className="text-xl font-bold text-slate-900">{parcel.areaSqM.toLocaleString()} m²</p>
          <p className="text-[10px] text-slate-400 font-sans">{(parcel.areaSqM * 0.000247105).toFixed(3)} acres</p>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Boundary Perimeter</p>
          <p className="text-xl font-bold text-slate-900">{parcel.perimeterM} m</p>
          <p className="text-[10px] text-slate-400 font-sans">Vector perimeter</p>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Building Footprints</p>
          <p className="text-xl font-bold text-amber-700">{parcel.buildingCount}</p>
          <p className="text-[10px] text-slate-400 font-sans">Structural units</p>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">AI Confidence</p>
          <p className="text-xl font-bold text-emerald-700">{parcel.confidence}%</p>
          <p className="text-[10px] text-emerald-700 font-sans font-medium">U-Net Segmentation</p>
        </div>
      </div>

      {/* Details Grid & Mini Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Details Card */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-teal-700" />
            <span>Cadastral Attribute Registry Record</span>
          </h2>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
              <p className="text-slate-400 text-[10px]">Land Use Zoning</p>
              <p className="font-semibold text-slate-900 text-xs mt-0.5">{parcel.landUse}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
              <p className="text-slate-400 text-[10px]">Road Access Verification</p>
              <p className="font-semibold text-emerald-800 text-xs mt-0.5">{parcel.roadAccess}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
              <p className="text-slate-400 text-[10px]">Title Ownership</p>
              <p className="font-semibold text-slate-900 text-xs mt-0.5">{parcel.ownerName}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80">
              <p className="text-slate-400 text-[10px]">Verification Status</p>
              <p className="font-semibold text-slate-900 text-xs mt-0.5">{parcel.status}</p>
            </div>
            <div className="col-span-2 p-2.5 rounded bg-slate-50 border border-slate-200/80 font-mono">
              <p className="text-slate-400 text-[10px] font-sans">Geographic Centroid (WGS 84)</p>
              <p className="font-semibold text-slate-900 text-xs mt-0.5">
                Latitude: {parcel.center[0]}° N | Longitude: {parcel.center[1]}° E
              </p>
            </div>
          </div>

          {parcel.notes && (
            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs space-y-0.5 text-amber-900">
              <p className="font-semibold">Survey Inspection Note:</p>
              <p className="text-amber-800 text-[11px]">{parcel.notes}</p>
            </div>
          )}
        </div>

        {/* Spatial Bounds Preview */}
        <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-teal-700" />
              <span>Spatial Bounds</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">Scale 1:500</span>
          </div>

          <div className="relative flex-1 min-h-[170px] bg-slate-100 rounded overflow-hidden border border-slate-200 flex items-center justify-center p-3">
            <div className="absolute inset-0 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
            <div className="text-center z-10 space-y-1">
              <div className="w-8 h-8 rounded bg-white border border-slate-300 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="font-mono text-xs font-bold text-slate-900">{parcel.id}</p>
              <p className="text-[10px] text-slate-500 font-mono">{parcel.areaSqM} m² Vector Extent</p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${projectId}/map?search=${parcel.id}`)}
            className="w-full py-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Locate in Spatial Workspace
          </button>
        </div>
      </div>
    </div>
  );
};
