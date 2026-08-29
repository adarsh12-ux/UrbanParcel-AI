import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, MapPin, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </button>

      {/* Header */}
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Layers className="w-6 h-6 text-cyan-400" />
          <span>Create New Mapping Project</span>
        </h1>
        <p className="text-xs text-slate-400">Step 1 of 4: Define project survey scope, location, and coordinate reference system.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Form Fields Left */}
          <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
              Project Metadata
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Project Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Urban Zone 01"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Location (City / District) *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Vijayawada, Andhra Pradesh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Survey Area (km²)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={surveyAreaSqKm}
                  onChange={(e) => setSurveyAreaSqKm(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Coordinate Reference System</label>
                <select
                  value={crs}
                  onChange={(e) => setCrs(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="WGS 84 / EPSG:4326">WGS 84 (EPSG:4326)</option>
                  <option value="UTM Zone 44N / EPSG:32644">UTM Zone 44N (EPSG:32644)</option>
                  <option value="Web Mercator / EPSG:3857">Web Mercator (EPSG:3857)</option>
                </select>
              </div>
            </div>

            {/* Target Location Quick Select */}
            <div className="pt-2">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Select Urban Survey Zone
              </label>
              <div className="flex flex-wrap gap-2">
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
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Map Preview Right */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>Survey Extent Preview</span>
                </h2>
                <span className="text-[10px] font-mono text-cyan-400">{coordinates[0].toFixed(4)}° N, {coordinates[1].toFixed(4)}° E</span>
              </div>
            </div>

            {/* Static/Interactive Map Mock Frame */}
            <div className="relative flex-1 min-h-[220px] rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              <div className="relative text-center p-4 space-y-2">
                <div className="w-12 h-12 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <MapPin className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-slate-200">{location}</p>
                <p className="text-[11px] text-slate-400 font-mono">Boundaries: 4.2 km² Bounding Box Defined</p>
                <span className="inline-block px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] border border-emerald-800">
                  Ready for GeoTIFF Ingestion
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * The bounding box coordinates will automatically calibrate drone orthomosaic ingestion in the next step.
            </p>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold shadow-md shadow-cyan-950/50 transition-all"
          >
            <span>{loading ? 'Creating Project...' : 'Continue → Upload Imagery'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
