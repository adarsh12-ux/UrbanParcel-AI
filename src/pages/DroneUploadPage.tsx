import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileCheck, CheckCircle2, Image as ImageIcon, ArrowRight, Play, Cpu, AlertCircle } from 'lucide-react';
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Upload className="w-6 h-6 text-cyan-400" />
            <span>Upload Drone Imagery</span>
          </h1>
          <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-slate-300 font-mono">
            {project?.name || 'Project'}
          </span>
        </div>
        <p className="text-xs text-slate-400">Step 2 of 4: Ingest high-resolution aerial GeoTIFF / UAV imagery orthomosaics for AI segmentation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Drop Zone Left */}
        <div className="space-y-4">
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
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[300px] ${
              dragActive
                ? 'border-cyan-400 bg-cyan-950/40'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
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

            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 mb-4 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-base font-semibold text-slate-200">Drag & Drop Drone Imagery</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Supported raster formats: <strong className="text-slate-300">GeoTIFF (.tif)</strong>, TIFF, JPG, JPEG, PNG
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md cursor-pointer transition-colors"
              >
                Browse Files
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSampleFileClick();
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium text-xs border border-slate-700 cursor-pointer transition-colors"
              >
                Use Sample Drone Image
              </button>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recommended Flight Parameters</span>
            </div>
            <p className="text-[11px]">Forward Overlap: &ge; 75% | Side Overlap: &ge; 70% | GSD &le; 5.0 cm/px for high accuracy parcel boundaries.</p>
          </div>
        </div>

        {/* Selected Image Metadata Panel Right */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Imagery Metadata</h2>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                selectedFile
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {selectedFile ? 'Ready for Analysis' : 'Awaiting Image Upload'}
              </span>
            </div>

            {selectedFile ? (
              <div className="space-y-4">
                {/* Visual Thumbnail */}
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 h-40 group">
                  {/* Aerial simulation raster pattern */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-cyan-950/80 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:24px_24px] opacity-30"></div>
                    <div className="text-center z-10 space-y-1">
                      <ImageIcon className="w-8 h-8 text-cyan-400 mx-auto opacity-80" />
                      <p className="text-xs font-mono font-semibold text-slate-200">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-400">High-Resolution Drone Orthomosaic</p>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">File Size</p>
                    <p className="font-semibold text-slate-200 font-mono">{selectedFile.sizeMb} MB</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">Resolution</p>
                    <p className="font-semibold text-slate-200 font-mono">{selectedFile.dimensions}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">Ground Sampling Distance (GSD)</p>
                    <p className="font-semibold text-cyan-400 font-mono">{selectedFile.gsd}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">Total Coverage</p>
                    <p className="font-semibold text-slate-200 font-mono">{selectedFile.coverage}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">GPS / Exif Status</p>
                    <p className="font-semibold text-emerald-400">{selectedFile.gps}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <p className="text-slate-400 text-[10px]">CRS Alignment</p>
                    <p className="font-semibold text-slate-200 font-mono">{selectedFile.crs}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                <Upload className="w-8 h-8 mx-auto text-slate-600" />
                <p>No drone imagery selected yet.</p>
                <p className="text-[11px] text-slate-500">
                  Click <strong className="text-cyan-400 font-normal">Browse Files</strong> to select a GeoTIFF/image, or click <strong className="text-cyan-400 font-normal">Use Sample Drone Image</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium border border-slate-800 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={loading || !selectedFile}
          className={`inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all ${
            loading || !selectedFile
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white border border-cyan-400/30 shadow-cyan-950/50 cursor-pointer transform hover:-translate-y-0.5'
          }`}
        >
          <Cpu className="w-4 h-4 animate-spin-slow" />
          <span>{loading ? 'Initializing AI Pipeline...' : 'Start AI Analysis'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

