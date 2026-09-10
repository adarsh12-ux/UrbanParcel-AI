import React, { useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileUp, Loader2, ShieldCheck, MapPin, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

export const CadastralImportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<{
    preview_id: string;
    source_crs: string;
    target_crs: string;
    parcel_count: number;
    inside_survey_count: number;
    partially_overlapping_count: number;
    outside_survey_count: number;
    warnings: string[];
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!id || !file) {
      setError('Select a cadastral GeoJSON, Shapefile ZIP, or GeoPackage first.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api.previewCadastral(id, file);
      setPreview(data);
      setMessage('Validation completed. Review the preview metrics before confirming import.');
    } catch (importError: any) {
      setError(importError?.message || 'Cadastral dataset validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id || !preview) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.confirmCadastral(id, preview.preview_id);
      setMessage(`Successfully imported ${result.inserted} cadastral parcel boundaries (${result.parcels} total parcels). Source geometry is securely persisted in PostGIS.`);
      setPreview(null);
      setFile(null);
    } catch (importError: any) {
      setError(importError?.message || 'Cadastral import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExisting = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to remove all imported cadastral parcel boundaries for this project?')) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.deleteCadastral(id);
      setMessage(`Removed ${result.deleted} imported cadastral parcel records.`);
      setPreview(null);
    } catch (delError: any) {
      setError(delError?.message || 'Failed to remove cadastral parcels.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-3xl mx-auto w-full space-y-5">
      <div className="border-b border-slate-200 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}/map`)}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to GIS workspace
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileUp className="h-5 w-5 text-teal-700" /> Import Cadastral Parcel Boundaries
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Import real cadastral boundary datasets (GeoJSON, Shapefile ZIP, or GeoPackage). Boundaries are validated and stored in PostGIS.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDeleteExisting}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 border border-rose-200 rounded hover:bg-rose-50 transition-colors self-start sm:self-auto disabled:opacity-50"
          title="Clear previously imported cadastral parcels"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear Cadastral Data</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1" htmlFor="cadastral-file">
            Select Cadastral Dataset File
          </label>
          <input
            id="cadastral-file"
            type="file"
            accept=".geojson,.json,.zip,.gpkg"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setPreview(null);
              setMessage(null);
              setError(null);
            }}
            className="block w-full text-xs text-slate-700 file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800 cursor-pointer"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Supported formats: GeoJSON (<code className="font-mono">.geojson</code>, <code className="font-mono">.json</code>), ESRI Shapefile (<code className="font-mono">.zip</code> with <code className="font-mono">.prj</code>), or GeoPackage (<code className="font-mono">.gpkg</code>).
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-slate-800">Geospatial Validation Standards</p>
            <p>
              The backend validates CRS, polygon topology, coordinates, and spatial overlap against the actual uploaded GeoTIFF survey footprint. No AI inference or synthetic geometries are applied to parcel boundaries.
            </p>
          </div>
        </div>

        {preview && (
          <div className="rounded border border-teal-200 bg-teal-50/50 p-4 space-y-3 text-xs text-slate-700 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-teal-700" />
              <span>Cadastral Import Preview</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 bg-white/80 p-3 rounded border border-teal-100">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">File</div>
                <div className="truncate font-medium text-slate-900 mt-0.5">{file?.name}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Source CRS</div>
                <div className="font-mono font-medium text-slate-900 mt-0.5">{preview.source_crs}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Target CRS</div>
                <div className="font-mono font-medium text-teal-800 mt-0.5">{preview.target_crs}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Parcel Polygons</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{preview.parcel_count}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-teal-100 pt-2 font-mono text-xs">
              <div className="bg-white/80 p-2 rounded border border-teal-100">
                <span className="text-slate-500 block text-[10px] font-sans">Inside Survey Footprint:</span>
                <span className="font-bold text-emerald-700 text-sm">{preview.inside_survey_count}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-teal-100">
                <span className="text-slate-500 block text-[10px] font-sans">Partially Overlapping:</span>
                <span className="font-bold text-amber-700 text-sm">{preview.partially_overlapping_count}</span>
              </div>
              <div className="bg-white/80 p-2 rounded border border-teal-100">
                <span className="text-slate-500 block text-[10px] font-sans">Outside Survey Footprint:</span>
                <span className="font-bold text-rose-700 text-sm">{preview.outside_survey_count}</span>
              </div>
            </div>

            {preview.warnings.length > 0 && (
              <div className="border-t border-teal-100 pt-2 text-amber-900 bg-amber-50/70 p-2.5 rounded border border-amber-200">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                  <span>Validation Warnings</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {preview.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-semibold">Validation Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {message && (
          <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Import Status</p>
                <p className="mt-0.5">{message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/projects/${id}/map`)}
              className="shrink-0 inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-800 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" /> View on Map
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => navigate(`/projects/${id}/map`)}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {message ? 'Done' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={preview ? handleConfirm : handleValidate}
            disabled={loading || !file}
            className="inline-flex items-center gap-2 rounded bg-teal-700 px-4 py-2 text-xs font-medium text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {preview ? 'Confirm Import' : 'Validate Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
};
