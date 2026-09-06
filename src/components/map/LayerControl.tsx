import React from 'react';
import { Layers, Eye, EyeOff, X } from 'lucide-react';

export interface MapLayersState {
  droneImagery: boolean;
  parcels: boolean;
  buildings: boolean;
  roads: boolean;
  waterBodies: boolean;
  vegetation: boolean;
  cadastralData: boolean;
}

interface LayerControlProps {
  layers: MapLayersState;
  onToggleLayer: (layerKey: keyof MapLayersState) => void;
  basemap: 'satellite' | 'streets' | 'dark';
  onSelectBasemap: (basemap: 'satellite' | 'streets' | 'dark') => void;
  counts: Partial<Record<keyof MapLayersState, number>>;
  onClose?: () => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onToggleLayer,
  basemap,
  onSelectBasemap,
  counts,
  onClose
}) => {
  const layerItems: { key: keyof MapLayersState; label: string; color: string }[] = [
    { key: 'droneImagery', label: 'UAV Orthomosaic Imagery', color: 'bg-teal-700' },
    { key: 'parcels', label: 'Cadastral Boundaries', color: 'bg-slate-700' },
    { key: 'buildings', label: 'Building Footprints', color: 'bg-amber-600' },
    { key: 'roads', label: 'Road Centerlines', color: 'bg-emerald-600' },
    { key: 'waterBodies', label: 'Water Channels', color: 'bg-sky-600' },
    { key: 'vegetation', label: 'Green Canopy / Cover', color: 'bg-green-600' },
    { key: 'cadastralData', label: 'Reference Survey Grid', color: 'bg-slate-400' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded p-3 sm:p-3.5 space-y-3 shadow-md text-xs w-[280px] sm:w-64 max-w-[calc(100vw-2rem)] overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Basemap Selection */}
      <div className="space-y-1.5 border-b border-slate-100 pb-2.5">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-slate-500 font-mono">
            <Layers className="w-3.5 h-3.5 text-teal-700" />
            <span>GIS Basemap</span>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
              aria-label="Close Layer Control"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
          {(['satellite', 'streets', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSelectBasemap(mode)}
              className={`py-1 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                basemap === mode
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Layers Checklist */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between font-semibold text-slate-800">
          <span className="uppercase tracking-wider text-[10px] text-slate-500 font-mono">Vector Layers</span>
          <span className="text-[10px] text-slate-400 font-mono">{Object.values(layers).filter(Boolean).length} Active</span>
        </div>

        <div className="space-y-0.5">
          {layerItems.map((item) => {
            const isChecked = layers[item.key];
            return (
              <button
                key={item.key}
                onClick={() => onToggleLayer(item.key)}
                className={`w-full flex items-center justify-between p-1.5 rounded transition-colors cursor-pointer ${
                  isChecked
                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-900 font-medium'
                    : 'bg-white text-slate-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-xs ${item.color} ${isChecked ? 'opacity-100' : 'opacity-25'}`} />
                  <span className="text-[11px] truncate max-w-[130px]">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {counts[item.key] !== undefined && (
                    <span className="text-[9px] font-mono bg-white text-slate-500 px-1 py-0.2 rounded border border-slate-200">
                      {counts[item.key]}
                    </span>
                  )}
                  {isChecked ? (
                    <Eye className="w-3.5 h-3.5 text-teal-700" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
