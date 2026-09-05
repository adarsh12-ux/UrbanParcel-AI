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
        <div className="h-48 rounded-sm bg-white border border-line" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Back to GIS Map */}
      <button
        onClick={() => navigate(`/projects/${projectId}/map`)}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Interactive Map</span>
      </button>

      {/* Header */}
      <div className="bg-navy-900 border border-navy-800 rounded-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-serif font-bold font-mono text-white">{parcel.id}</h1>
            <StatusBadge status={parcel.status} />
          </div>
          <p className="text-xs text-navy-100 font-mono">
            Survey Number: <strong className="text-white font-bold">{parcel.surveyNo}</strong> | Registered to: {parcel.ownerName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold border border-navy-700 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-navy-100" />
            <span>View AI Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-forest-700 hover:bg-forest-600 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Parcel GeoJSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-sm border border-line space-y-1">
          <p className="text-xs text-muted uppercase font-semibold">Total Land Area</p>
          <p className="text-2xl font-bold font-mono text-ink">{parcel.areaSqM.toLocaleString()} m²</p>
          <p className="text-[10px] text-muted">{(parcel.areaSqM * 0.000247105).toFixed(3)} acres</p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-line space-y-1">
          <p className="text-xs text-muted uppercase font-semibold">Boundary Perimeter</p>
          <p className="text-2xl font-bold font-mono text-ink">{parcel.perimeterM} m</p>
          <p className="text-[10px] text-muted">Vector polygon perimeter</p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-line space-y-1">
          <p className="text-xs text-muted uppercase font-semibold">Building Structures</p>
          <p className="text-2xl font-bold font-mono text-amber-800">{parcel.buildingCount}</p>
          <p className="text-[10px] text-muted">Extracted footprints</p>
        </div>
        <div className="bg-white p-4 rounded-sm border border-line space-y-1">
          <p className="text-xs text-muted uppercase font-semibold">AI Confidence</p>
          <p className="text-2xl font-bold font-mono text-forest-800">{parcel.confidence}%</p>
          <p className="text-[10px] text-forest-800 font-medium">U-Net Segmentation</p>
        </div>
      </div>

      {/* Details Grid & Mini Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Card */}
        <div className="md:col-span-2 bg-white border border-line rounded-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider border-b border-line pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-navy-700" />
            <span>Cadastral Attribute Record</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-sm bg-canvas border border-line">
              <p className="text-muted text-[10px]">Land Use Zoning Category</p>
              <p className="font-bold text-navy-900 text-sm mt-0.5">{parcel.landUse}</p>
            </div>
            <div className="p-3 rounded-sm bg-canvas border border-line">
              <p className="text-muted text-[10px]">Road Access Status</p>
              <p className="font-bold text-forest-800 text-sm mt-0.5">{parcel.roadAccess}</p>
            </div>
            <div className="p-3 rounded-sm bg-canvas border border-line">
              <p className="text-muted text-[10px]">Land Ownership</p>
              <p className="font-bold text-ink text-sm mt-0.5">{parcel.ownerName}</p>
            </div>
            <div className="p-3 rounded-sm bg-canvas border border-line">
              <p className="text-muted text-[10px]">Cadastral Status</p>
              <p className="font-bold text-ink text-sm mt-0.5">{parcel.status}</p>
            </div>
            <div className="col-span-2 p-3 rounded-sm bg-canvas border border-line font-mono">
              <p className="text-muted text-[10px] font-sans">Geographic Center Coordinates</p>
              <p className="font-bold text-ink text-sm mt-0.5">
                Latitude: {parcel.center[0]}° N | Longitude: {parcel.center[1]}° E
              </p>
            </div>
          </div>

          {parcel.notes && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1 text-amber-900">
              <p className="font-semibold">Verification & Notes</p>
              <p className="text-amber-800">{parcel.notes}</p>
            </div>
          )}
        </div>

        {/* Mini Map Preview Panel Right */}
        <div className="bg-white border border-line rounded-sm p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-4 h-4 text-navy-700" />
              <span>Spatial Bounds</span>
            </span>
            <span className="text-[10px] font-mono text-navy-800 font-semibold">Zoom 18</span>
          </div>

          <div className="relative flex-1 min-h-[200px] bg-navy-50 rounded-sm overflow-hidden border border-line flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[linear-gradient(#d0d7de_1px,transparent_1px),linear-gradient(90deg,#d0d7de_1px,transparent_1px)] [background-size:20px_20px] opacity-70"></div>
            <div className="text-center z-10 space-y-2">
              <div className="w-10 h-10 rounded-full bg-white border border-line text-navy-700 flex items-center justify-center mx-auto">
                <MapPin className="w-5 h-5" />
              </div>
              <p className="font-mono text-xs font-bold text-ink">{parcel.id}</p>
              <p className="text-[11px] text-muted font-mono">{parcel.areaSqM} m² Boundary</p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/projects/${projectId}/map?search=${parcel.id}`)}
            className="w-full py-2 rounded-sm bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
          >
            Locate on Interactive Map
          </button>
        </div>
      </div>
    </div>
  );
};
