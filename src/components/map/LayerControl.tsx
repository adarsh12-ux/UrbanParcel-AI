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
  onClose?: () => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({
  layers,
  onToggleLayer,
  basemap,
  onSelectBasemap,
  onClose
}) => {
  const layerItems: { key: keyof MapLayersState; label: string; color: string; count?: string }[] = [
    { key: 'droneImagery', label: 'Drone Orthomosaic Imagery', color: 'bg-navy-700', count: 'GeoTIFF' },
    { key: 'parcels', label: 'Parcel Boundaries', color: 'bg-navy-600', count: '247' },
    { key: 'buildings', label: 'Building Footprints', color: 'bg-amber-700', count: '381' },
    { key: 'roads', label: 'Road Network Lines', color: 'bg-forest-700', count: '42' },
    { key: 'waterBodies', label: 'Water Bodies & Canals', color: 'bg-sky-800', count: '12' },
    { key: 'vegetation', label: 'Vegetation Cover', color: 'bg-forest-600', count: 'Vector' },
    { key: 'cadastralData', label: 'Existing Cadastral Survey', color: 'bg-slate-600', count: 'Reference' }
  ];

  return (
    <div className="bg-white border border-line rounded-sm p-3.5 sm:p-4 space-y-3 sm:space-y-4 shadow-md text-xs w-[280px] sm:w-64 max-w-[calc(100vw-2rem)] overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Basemap Selection */}
      <div className="space-y-2 border-b border-line pb-3">
        <div className="flex items-center justify-between font-semibold text-ink">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
            <Layers className="w-3.5 h-3.5 text-navy-700" />
            <span>GIS Basemap Tile</span>
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-muted hover:text-ink p-1 rounded-sm hover:bg-navy-50"
              aria-label="Close Layer Control"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1 bg-canvas p-1 rounded-sm border border-line">
          {(['satellite', 'streets', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onSelectBasemap(mode)}
              className={`py-1.5 rounded-sm text-[11px] font-medium capitalize cursor-pointer ${
                basemap === mode
                  ? 'bg-white text-navy-900 border border-navy-100 font-semibold'
                  : 'text-muted hover:text-ink'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Vector Layers Checklist */}
      <div className="space-y-2">
        <div className="flex items-center justify-between font-semibold text-ink">
          <span className="uppercase tracking-wider text-[10px]">Vector Layers & Features</span>
          <span className="text-[10px] text-muted font-mono">Active (4/7)</span>
        </div>

        <div className="space-y-1">
          {layerItems.map((item) => {
            const isChecked = layers[item.key];
            return (
              <button
                key={item.key}
                onClick={() => onToggleLayer(item.key)}
                className={`w-full flex items-center justify-between p-2 rounded-sm cursor-pointer ${
                  isChecked
                    ? 'bg-navy-50 border border-navy-100 text-ink font-medium'
                    : 'bg-white text-muted border border-transparent hover:bg-canvas'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-sm ${item.color} ${isChecked ? 'opacity-100' : 'opacity-30'}`} />
                  <span className="text-[11px] truncate max-w-[130px]">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.count && (
                    <span className="text-[9px] font-mono bg-canvas text-muted px-1.5 py-0.5 rounded-sm border border-line">
                      {item.count}
                    </span>
                  )}
                  {isChecked ? (
                    <Eye className="w-3.5 h-3.5 text-navy-700" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-muted" />
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
