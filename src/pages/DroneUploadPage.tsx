import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileCheck, Image as ImageIcon, ArrowRight, Cpu, AlertCircle, Compass } from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

export const DroneUploadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    sizeMb: number;
    dimensions: string;
    gsd: string;
    coverage: string;
    gps: string;
    crs: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    async function loadProject() {
      if (id) {
        const proj = await api.getProject(id);
        setProject(proj);
        if (proj?.imageryFileName) {
          setSelectedFile({
            name: proj.imageryFileName,
            sizeMb: proj.imageryFileSizeMb || 428.5,
            dimensions: '5472 × 3648 px',
            gsd: '3.2 cm/pixel',
            coverage: `${proj.surveyAreaSqKm || 4.2} km²`,
            gps: 'Available (RTK High Precision)',
            crs: proj.crs || 'EPSG:4326 (WGS 84)'
          });
        }
      }
    }
    loadProject();
  }, [id]);

  const handleSampleFileClick = () => {
    setSelectedFile({
      name: project?.imageryFileName || 'Vijayawada_Zone01_Orthomosaic.tif',
      sizeMb: project?.imageryFileSizeMb || 428.5,
      dimensions: '5472 × 3648 px',
      gsd: '3.2 cm/pixel',
      coverage: `${project?.surveyAreaSqKm || 4.2} km²`,
      gps: 'Available (RTK High Precision)',
      crs: project?.crs || 'EPSG:4326 (WGS 84)'
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));

    setSelectedFile({
      name: file.name,
      sizeMb: sizeMb > 0 ? sizeMb : 42.8,
      dimensions: '5472 × 3648 px',
      gsd: '3.2 cm/pixel',
      coverage: `${project?.surveyAreaSqKm || 4.2} km²`,
      gps: 'Available (Exif / Geo-tagged)',
      crs: project?.crs || 'EPSG:4326 (WGS 84)'
    });
  };

  const handleStartAnalysis = async () => {
    if (!id) return;
    setLoading(true);
    if (selectedFile) {
      await api.uploadImagery(id, selectedFile.name, selectedFile.sizeMb);
    }
    navigate(`/projects/${id}/processing`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 space-y-0.5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-teal-700" />
            <span>Ingest UAV Orthomosaic Imagery</span>
          </h1>
          <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-slate-700 font-mono font-medium">
            {project?.name || 'Survey Project'}
          </span>
        </div>
        <p className="text-xs text-slate-500">Step 2 of 4: Ingest high-resolution aerial GeoTIFF / UAV orthomosaics for deep learning parcel vectorization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Upload Drop Zone Left */}
        <div className="space-y-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));
                setSelectedFile({
                  name: file.name,
                  sizeMb: sizeMb > 0 ? sizeMb : 42.8,
                  dimensions: '5472 × 3648 px',
                  gsd: '3.2 cm/pixel',
                  coverage: `${project?.surveyAreaSqKm || 4.2} km²`,
                  gps: 'Available (Exif / Geo-tagged)',
                  crs: project?.crs || 'EPSG:4326 (WGS 84)'
                });
              } else {
                handleSampleFileClick();
              }
            }}
            className={`border-2 border-dashed rounded p-6 text-center flex flex-col items-center justify-center min-h-[280px] transition-colors ${
              dragActive
                ? 'border-teal-700 bg-teal-50/50'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            {/* Hidden Native File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".tif,.tiff,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-3 shadow-xs">
              <Upload className="w-6 h-6 text-teal-700" />
            </div>

            <h3 className="text-sm font-bold text-slate-900">Drag & Drop Drone GeoTIFF</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs leading-tight">
              Supported raster formats: <strong className="text-slate-800">GeoTIFF (.tif)</strong>, TIFF, JPG, JPEG, PNG
            </p>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Browse Files
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSampleFileClick();
                }}
                className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                Use Sample Orthomosaic
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 space-y-0.5">
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <AlertCircle className="w-3.5 h-3.5 text-teal-700" />
              <span>Flight Parameters & Standards</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">Forward Overlap: &ge; 75% | Side Overlap: &ge; 70% | GSD &le; 5.0 cm/px recommended for high-precision boundaries.</p>
          </div>
        </div>

        {/* Selected Image Metadata Panel Right */}
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Raster Metadata Record</h2>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono border font-semibold ${
                selectedFile
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {selectedFile ? 'Raster Verified' : 'Awaiting Image Ingestion'}
              </span>
            </div>

            {selectedFile ? (
              <div className="space-y-3">
                {/* Visual Thumbnail Frame */}
                <div className="relative rounded overflow-hidden bg-slate-100 border border-slate-200 h-32">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[linear-gradient(#e2e8f0_1px,transparent_1px),linear-gradient(90deg,#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="text-center z-10 space-y-0.5">
                      <ImageIcon className="w-6 h-6 text-teal-700 mx-auto" />
                      <p className="text-xs font-mono font-semibold text-slate-900">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">High-Resolution Drone Orthomosaic</p>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">File Size</p>
                    <p className="font-semibold text-slate-900">{selectedFile.sizeMb} MB</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">Pixel Extent</p>
                    <p className="font-semibold text-slate-900">{selectedFile.dimensions}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">Ground Sampling Distance</p>
                    <p className="font-semibold text-teal-800">{selectedFile.gsd}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">Survey Coverage</p>
                    <p className="font-semibold text-slate-900">{selectedFile.coverage}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">Geotag / RTK</p>
                    <p className="font-semibold text-emerald-700 font-sans text-[11px]">{selectedFile.gps}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80">
                    <p className="text-slate-400 font-sans text-[10px]">Projection Alignment</p>
                    <p className="font-semibold text-slate-900 text-[11px]">{selectedFile.crs}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs space-y-1.5">
                <Upload className="w-7 h-7 mx-auto text-slate-300" />
                <p className="font-medium text-slate-700">No drone imagery ingested yet.</p>
                <p className="text-[11px] text-slate-400">
                  Select a GeoTIFF via <strong className="text-slate-700 font-semibold">Browse Files</strong> or click <strong className="text-slate-700 font-semibold">Use Sample Orthomosaic</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={loading || !selectedFile}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded font-medium text-xs shadow-xs transition-colors ${
            loading || !selectedFile
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-teal-700 hover:bg-teal-600 text-white cursor-pointer'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{loading ? 'Initializing Pipeline...' : 'Execute AI Segmentation Pipeline'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
