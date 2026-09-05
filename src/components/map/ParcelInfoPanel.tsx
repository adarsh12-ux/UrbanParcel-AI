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
      <div className="bg-white border border-slate-200 rounded p-4 text-center text-slate-500 text-xs shadow-md w-[280px] sm:w-80 max-w-[calc(100vw-2rem)] space-y-2">
        <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-xs">No Parcel Selected</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click on any boundary polygon on the GIS map or search for a Parcel ID (e.g. UP-1001).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded p-3.5 sm:p-4 space-y-3 shadow-md text-xs w-[280px] sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-900 text-base">{parcel.id}</span>
            <StatusBadge status={parcel.status} size="sm" />
          </div>
          <p className="text-[11px] font-mono text-teal-800 font-semibold">{parcel.surveyNo}</p>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Cadastral Area</p>
          <p className="font-bold text-slate-900 text-sm mt-0.5">{parcel.areaSqM.toLocaleString()} m²</p>
        </div>
        <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
          <p className="text-[10px] text-slate-500 font-sans uppercase font-medium">Perimeter</p>
          <p className="font-bold text-slate-900 text-sm mt-0.5">{parcel.perimeterM} m</p>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Buildings</span>
          </span>
          <span className="font-mono font-semibold text-slate-800">{parcel.buildingCount} Structures</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Road Access</span>
          </span>
          <span className="font-medium text-emerald-800">{parcel.roadAccess}</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Land Use</span>
          </span>
          <span className="font-medium text-slate-900">{parcel.landUse}</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            <span>AI Confidence</span>
          </span>
          <span className="font-mono font-semibold text-emerald-700">{parcel.confidence}%</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-slate-500" />
            <span>Owner</span>
          </span>
          <span className="font-medium text-slate-800 truncate max-w-[120px]">{parcel.ownerName}</span>
        </div>

        <div className="flex items-center justify-between p-1.5 rounded bg-slate-50/70 border border-slate-100 font-mono text-[10px]">
          <span className="text-slate-400 font-sans">Coordinates</span>
          <span className="text-slate-700">{parcel.center[0].toFixed(4)}° N, {parcel.center[1].toFixed(4)}° E</span>
        </div>
      </div>

      {parcel.notes && (
        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
          <p className="font-semibold">Survey Note:</p>
          <p className="text-amber-800">{parcel.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <button
          onClick={() => navigate(`/projects/${projectId}/parcel/${parcel.id}`)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
        >
          <span>Full Parcel Record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="flex items-center justify-center gap-1 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3 h-3 text-teal-700" />
            <span>AI Analytics</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="flex items-center justify-center gap-1 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3 text-emerald-700" />
            <span>GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
