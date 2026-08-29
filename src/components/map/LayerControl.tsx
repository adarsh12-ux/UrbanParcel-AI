import React from 'react';
import { Layers, Eye, EyeOff, CheckSquare, Square, RefreshCw } from 'lucide-react';

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
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onToggleLayer,
  basemap,
  onSelectBasemap
}) => {
  const layerItems: { key: keyof MapLayersState; label: string; color: string; count?: string }[] = [
    { key: 'droneImagery', label: 'Drone Orthomosaic Imagery', color: 'bg-cyan-500', count: 'GeoTIFF' },
    { key: 'parcels', label: 'Parcel Boundaries', color: 'bg-cyan-400', count: '247' },
    { key: 'buildings', label: 'Building Footprints', color: 'bg-amber-400', count: '381' },
    { key: 'roads', label: 'Road Network Lines', color: 'bg-emerald-400', count: '42' },
    { key: 'waterBodies', label: 'Water Bodies & Canals', color: 'bg-blue-500', count: '12' },
    { key: 'vegetation', label: 'Vegetation Cover', color: 'bg-lime-500', count: 'Vector' },
    { key: 'cadastralData', label: 'Existing Cadastral Survey', color: 'bg-purple-500', count: 'Reference' }
  ];

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4 shadow-2xl backdrop-blur-md text-xs w-64">
      {/* Basemap Selection */}
      <div className="space-y-2 border-b border-slate-800 pb-3">
        <div className="flex items-center justify-between font-semibold text-slate-300">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>GIS Basemap Tile</span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['satellite', 'streets', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSelectBasemap(mode)}
              className={`py-1.5 rounded text-[11px] font-medium capitalize transition-all ${
                basemap === mode
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Layers Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-semibold text-slate-300">
          <span className="uppercase tracking-wider text-[10px]">Vector Layers & Features</span>
          <span className="text-[10px] text-slate-500">Active (4/7)</span>
        </div>

        <div className="space-y-1">
          {layerItems.map((item) => {
            const isChecked = layers[item.key];
            return (
              <button
                key={item.key}
                onClick={() => onToggleLayer(item.key)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                  isChecked
                    ? 'bg-slate-900 border border-slate-800 text-slate-200'
                    : 'bg-slate-950/40 text-slate-500 border border-transparent hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} ${isChecked ? 'opacity-100' : 'opacity-30'}`} />
                  <span className="font-medium text-[11px] truncate max-w-[130px]">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.count && (
                    <span className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {item.count}
                    </span>
                  )}
                  {isChecked ? (
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
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
