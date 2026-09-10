import React, { useState } from 'react';
import { ArrowLeft, FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export const CadastralImportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    if (!id || !file) {
      setError('Select an official cadastral GeoJSON or Shapefile ZIP first.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.importOfficialCadastral(id, file);
      setMessage(`Imported ${result.inserted} official parcel boundaries. They remain pending review.`);
    } catch (importError: any) {
      setError(importError?.message || 'Official cadastral import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl mx-auto w-full space-y-5">
      <div className="border-b border-slate-200 pb-3.5">
        <button type="button" onClick={() => navigate(`/projects/${id}/map`)} className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to GIS workspace
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileUp className="h-5 w-5 text-teal-700" /> Import Official Cadastral Boundaries
        </h1>
        <p className="text-xs text-slate-500 mt-1">Import a validated parcel GeoJSON or a Shapefile ZIP. Imported features are stored as official cadastral data and remain pending review.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <label className="block text-xs font-semibold text-slate-800" htmlFor="cadastral-file">Cadastral dataset</label>
        <input id="cadastral-file" type="file" accept=".geojson,.json,.zip" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full text-xs text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white" />
        <div className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" />
          <span>The backend validates CRS, polygon geometry, parcel identifiers, and project extent before persistence. No AI or basemap geometry is used.</span>
        </div>
        {error && <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}
        {message && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => navigate(`/projects/${id}/map`)} className="rounded border border-slate-300 bg-white px-4 py-2.5 text-xs font-medium text-slate-700">Cancel</button>
          <button type="button" onClick={handleImport} disabled={loading || !file} className="inline-flex items-center gap-2 rounded bg-teal-700 px-4 py-2.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Import boundaries
          </button>
        </div>
      </div>
    </div>
  );
};
