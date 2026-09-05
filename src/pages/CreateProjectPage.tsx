import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, MapPin, ArrowRight, ArrowLeft, Globe, Compass } from 'lucide-react';
import { api } from '../services/api';

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('Urban Zone 01');
  const [location, setLocation] = useState('Vijayawada, Andhra Pradesh');
  const [surveyAreaSqKm, setSurveyAreaSqKm] = useState<number>(4.2);
  const [crs, setCrs] = useState('WGS 84 / EPSG:4326');
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number]>([16.5062, 80.6480]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return;

    setLoading(true);
    try {
      const project = await api.createProject({
        name,
        location,
        surveyAreaSqKm: Number(surveyAreaSqKm),
        crs,
        centerCoordinates: coordinates
      });
      navigate(`/projects/${project.id}/upload`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-4xl mx-auto w-full space-y-5">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Dashboard</span>
      </button>

      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-700" />
          <span>Initiate Cadastral Survey Project</span>
        </h1>
        <p className="text-xs text-slate-500">Step 1 of 4: Define administrative survey jurisdiction, target bounding coordinates, and projection CRS.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Form Fields Left */}
          <div className="space-y-3.5 bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              Cadastral Survey Parameters
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Project / Survey Zone Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ward 18 Municipal Cadastre"
                className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-medium transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">Administrative Jurisdiction (City / District) *</label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Vijayawada, Andhra Pradesh"
                  className="w-full bg-slate-50 border border-slate-200 rounded pl-8.5 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Survey Extent (km²)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={surveyAreaSqKm}
                  onChange={(e) => setSurveyAreaSqKm(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Spatial CRS</label>
                <select
                  value={crs}
                  onChange={(e) => setCrs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
                >
                  <option value="WGS 84 / EPSG:4326">WGS 84 (EPSG:4326)</option>
                  <option value="UTM Zone 44N / EPSG:32644">UTM Zone 44N (EPSG:32644)</option>
                  <option value="Web Mercator / EPSG:3857">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            {/* Quick Location Select */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5 font-mono">
                Municipal Benchmark Zones
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Vijayawada Zone A', loc: 'Vijayawada, Andhra Pradesh', coords: [16.5062, 80.6480] as [number, number] },
                  { label: 'Guntur Ward 18', loc: 'Guntur, Andhra Pradesh', coords: [16.3067, 80.4365] as [number, number] },
                  { label: 'Hyderabad Zone B', loc: 'Hyderabad, Telangana', coords: [17.3850, 78.4867] as [number, number] }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setLocation(item.loc);
                      setCoordinates(item.coords);
                    }}
                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] text-slate-700 cursor-pointer font-medium transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Spatial Preview Right */}
          <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-teal-700" />
                  <span>Cadastral Extent Bounds</span>
                </h2>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">{coordinates[0].toFixed(4)}° N, {coordinates[1].toFixed(4)}° E</span>
              </div>
            </div>

            <div className="relative flex-1 min-h-[190px] rounded overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <div className="absolute inset-0 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="relative text-center p-3 space-y-1">
                <div className="w-10 h-10 rounded bg-white border border-slate-300 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-900">{location}</p>
                <p className="text-[10px] text-slate-500 font-mono">{surveyAreaSqKm} km² Bounding Grid Calibrated</p>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-mono border border-emerald-200 font-semibold">
                  EPSG:4326 Aligned
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              * The coordinate bounds will initialize the UAV orthomosaic ingestion and tile alignment pipeline.
            </p>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            <span>{loading ? 'Creating Project...' : 'Proceed to Imagery Ingestion'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
