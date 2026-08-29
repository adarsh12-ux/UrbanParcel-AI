import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Parcel } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { X, Building2, Navigation, Maximize2, ShieldCheck, MapPin, Download, BarChart3, ArrowRight, User } from 'lucide-react';

interface ParcelInfoPanelProps {
  parcel: Parcel | null;
  onClose: () => void;
  projectId: string;
}

export const ParcelInfoPanel: React.FC<ParcelInfoPanelProps> = ({
  parcel,
  onClose,
  projectId
}) => {
  const navigate = useNavigate();

  if (!parcel) {
    return (
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-xs shadow-2xl backdrop-blur-md w-80 space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400">
          <MapPin className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-slate-200 text-sm">No Parcel Selected</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Click on any parcel boundary polygon on the interactive GIS map or search for a Parcel ID (e.g. UP-1001).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl backdrop-blur-md w-80 max-h-[calc(100vh-140px)] overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-slate-100 text-lg">{parcel.id}</span>
            <StatusBadge status={parcel.status} size="sm" />
          </div>
          <p className="text-[11px] font-mono text-cyan-400">{parcel.surveyNo}</p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Area</p>
          <p className="font-mono font-bold text-slate-100 text-sm mt-0.5">{parcel.areaSqM.toLocaleString()} m²</p>
        </div>
        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Perimeter</p>
          <p className="font-mono font-bold text-slate-100 text-sm mt-0.5">{parcel.perimeterM} m</p>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs pt-1">
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Buildings Extracted</span>
          </span>
          <span className="font-mono font-semibold text-slate-200">{parcel.buildingCount} Structures</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>Road Access</span>
          </span>
          <span className="font-semibold text-emerald-400">{parcel.roadAccess}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Land Use Category</span>
          </span>
          <span className="font-semibold text-cyan-300">{parcel.landUse}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Confidence Score</span>
          </span>
          <span className="font-mono font-bold text-emerald-400">{parcel.confidence}%</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Registered Owner</span>
          </span>
          <span className="font-medium text-slate-200 truncate max-w-[120px]">{parcel.ownerName}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-[11px]">
          <span className="text-slate-400 font-sans">Lat / Long Coordinates</span>
          <span className="text-slate-200">{parcel.center[0].toFixed(4)}° N, {parcel.center[1].toFixed(4)}° E</span>
        </div>
      </div>

      {parcel.notes && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-[11px] text-amber-300 space-y-1">
          <p className="font-semibold">Cadastral Verification Note:</p>
          <p className="text-amber-200/80">{parcel.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => navigate(`/projects/${projectId}/parcel/${parcel.id}`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-md"
        >
          <span>Open Full Parcel Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium"
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
