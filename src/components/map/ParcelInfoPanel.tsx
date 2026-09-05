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
      <div className="bg-white border border-line rounded-sm p-4 sm:p-6 text-center text-muted text-xs shadow-md w-[280px] sm:w-80 max-w-[calc(100vw-2rem)] space-y-3">
        <div className="w-12 h-12 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center mx-auto text-navy-700">
          <MapPin className="w-6 h-6" />
        </div>
        <div>
          <p className="font-bold text-ink text-sm">No Parcel Selected</p>
          <p className="text-[11px] text-muted mt-1">
            Click on any parcel boundary polygon on the interactive GIS map or search for a Parcel ID (e.g. UP-1001).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-line rounded-sm p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-md text-xs w-[280px] sm:w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] overflow-y-auto">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-ink text-lg">{parcel.id}</span>
            <StatusBadge status={parcel.status} size="sm" />
          </div>
          <p className="text-[11px] font-mono text-navy-700 font-semibold">{parcel.surveyNo}</p>
        </div>

        <button
          onClick={onClose}
          className="text-muted hover:text-ink p-1.5 rounded-sm hover:bg-navy-50 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-canvas p-2.5 rounded-sm border border-line">
          <p className="text-[10px] text-muted uppercase font-semibold">Total Area</p>
          <p className="font-mono font-bold text-ink text-sm mt-0.5">{parcel.areaSqM.toLocaleString()} m²</p>
        </div>
        <div className="bg-canvas p-2.5 rounded-sm border border-line">
          <p className="text-[10px] text-muted uppercase font-semibold">Perimeter</p>
          <p className="font-mono font-bold text-ink text-sm mt-0.5">{parcel.perimeterM} m</p>
        </div>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs pt-1">
        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line">
          <span className="text-muted flex items-center gap-1.5 font-medium">
            <Building2 className="w-3.5 h-3.5 text-amber-700" />
            <span>Buildings Extracted</span>
          </span>
          <span className="font-mono font-bold text-ink">{parcel.buildingCount} Structures</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line">
          <span className="text-muted flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5 text-forest-700" />
            <span>Road Access</span>
          </span>
          <span className="font-bold text-forest-800">{parcel.roadAccess}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line">
          <span className="text-muted flex items-center gap-1.5 font-medium">
            <Maximize2 className="w-3.5 h-3.5 text-navy-700" />
            <span>Land Use Category</span>
          </span>
          <span className="font-bold text-navy-900">{parcel.landUse}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line">
          <span className="text-muted flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-navy-700" />
            <span>AI Confidence Score</span>
          </span>
          <span className="font-mono font-bold text-forest-800">{parcel.confidence}%</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line">
          <span className="text-muted flex items-center gap-1.5 font-medium">
            <User className="w-3.5 h-3.5 text-navy-700" />
            <span>Registered Owner</span>
          </span>
          <span className="font-semibold text-ink truncate max-w-[120px]">{parcel.ownerName}</span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-sm bg-canvas border border-line font-mono text-[11px]">
          <span className="text-muted font-sans">Lat / Long Coordinates</span>
          <span className="text-ink font-medium">{parcel.center[0].toFixed(4)}° N, {parcel.center[1].toFixed(4)}° E</span>
        </div>
      </div>

      {parcel.notes && (
        <div className="p-2.5 rounded-sm bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
          <p className="font-semibold">Cadastral Verification Note:</p>
          <p className="text-amber-800">{parcel.notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-line">
        <button
          onClick={() => navigate(`/projects/${projectId}/parcel/${parcel.id}`)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-sm bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs cursor-pointer"
        >
          <span>Open Full Parcel Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate(`/projects/${projectId}/analysis`)}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-white hover:bg-navy-50 text-ink border border-line text-xs font-medium cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-navy-700" />
            <span>View Analysis</span>
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/export`)}
            className="flex items-center justify-center gap-1.5 py-1.5 rounded-sm bg-white hover:bg-navy-50 text-ink border border-line text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-forest-800" />
            <span>Export GeoJSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
