import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileCheck, Image as ImageIcon, ArrowRight, Cpu, AlertCircle } from 'lucide-react';
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
      <div className="border-b border-line pb-4 space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
            <Upload className="w-6 h-6 text-navy-700" />
            <span>Upload Drone Imagery</span>
          </h1>
          <span className="text-xs bg-navy-50 border border-navy-100 px-3 py-1 rounded-sm text-navy-800 font-mono font-medium">
            {project?.name || 'Project'}
          </span>
        </div>
        <p className="text-xs text-muted">Step 2 of 4: Ingest high-resolution aerial GeoTIFF / UAV imagery orthomosaics for AI segmentation.</p>
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
            className={`border-2 border-dashed rounded-sm p-8 text-center flex flex-col items-center justify-center min-h-[300px] ${
              dragActive
                ? 'border-navy-700 bg-navy-50'
                : 'border-line hover:border-navy-600 bg-white'
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

            <div className="w-14 h-14 rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-700 mb-4">
              <Upload className="w-7 h-7 text-navy-700" />
            </div>

            <h3 className="text-base font-bold text-ink">Drag & Drop Drone Imagery</h3>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Supported raster formats: <strong className="text-ink">GeoTIFF (.tif)</strong>, TIFF, JPG, JPEG, PNG
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-sm bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs cursor-pointer"
              >
                Browse Files
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSampleFileClick();
                }}
                className="px-3 py-2 rounded-sm bg-white hover:bg-navy-50 text-ink font-semibold text-xs border border-line cursor-pointer"
              >
                Use Sample Drone Image
              </button>
            </div>
          </div>

          <div className="p-3 bg-navy-50 border border-navy-100 rounded-sm text-xs text-ink space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-ink">
              <AlertCircle className="w-3.5 h-3.5 text-navy-700" />
              <span>Recommended Flight Parameters</span>
            </div>
            <p className="text-[11px] text-muted">Forward Overlap: &ge; 75% | Side Overlap: &ge; 70% | GSD &le; 5.0 cm/px for high accuracy parcel boundaries.</p>
          </div>
        </div>

        {/* Selected Image Metadata Panel Right */}
        <div className="space-y-4">
          <div className="bg-white border border-line rounded-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-forest-700" />
                <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">Imagery Metadata</h2>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-sm font-mono border font-semibold ${
                selectedFile
                  ? 'bg-forest-50 text-forest-800 border-forest-100'
                  : 'bg-canvas text-muted border-line'
              }`}>
                {selectedFile ? 'Ready for Analysis' : 'Awaiting Image Upload'}
              </span>
            </div>

            {selectedFile ? (
              <div className="space-y-4">
                {/* Visual Thumbnail */}
                <div className="relative rounded-sm overflow-hidden bg-navy-50 border border-navy-100 h-40">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[linear-gradient(#d0d7de_1px,transparent_1px),linear-gradient(90deg,#d0d7de_1px,transparent_1px)] [background-size:24px_24px] opacity-80"></div>
                    <div className="text-center z-10 space-y-1">
                      <ImageIcon className="w-8 h-8 text-navy-700 mx-auto" />
                      <p className="text-xs font-mono font-semibold text-ink">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted">High-Resolution Drone Orthomosaic</p>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">File Size</p>
                    <p className="font-semibold text-ink font-mono">{selectedFile.sizeMb} MB</p>
                  </div>
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">Resolution</p>
                    <p className="font-semibold text-ink font-mono">{selectedFile.dimensions}</p>
                  </div>
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">Ground Sampling Distance (GSD)</p>
                    <p className="font-semibold text-navy-800 font-mono">{selectedFile.gsd}</p>
                  </div>
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">Total Coverage</p>
                    <p className="font-semibold text-ink font-mono">{selectedFile.coverage}</p>
                  </div>
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">GPS / Exif Status</p>
                    <p className="font-semibold text-forest-800">{selectedFile.gps}</p>
                  </div>
                  <div className="bg-canvas p-2.5 rounded-sm border border-line">
                    <p className="text-muted text-[10px]">CRS Alignment</p>
                    <p className="font-semibold text-ink font-mono">{selectedFile.crs}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted text-xs space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted" />
                <p className="font-medium text-ink">No drone imagery selected yet.</p>
                <p className="text-[11px] text-muted">
                  Click <strong className="text-ink font-semibold">Browse Files</strong> to select a GeoTIFF/image, or click <strong className="text-ink font-semibold">Use Sample Drone Image</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-line">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2.5 rounded-sm bg-white hover:bg-navy-50 text-ink text-sm font-medium border border-line cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={loading || !selectedFile}
          className={`inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-sm font-semibold text-sm ${
            loading || !selectedFile
              ? 'bg-canvas text-muted border border-line cursor-not-allowed'
              : 'bg-navy-900 hover:bg-navy-800 text-white border border-navy-900 cursor-pointer'
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
