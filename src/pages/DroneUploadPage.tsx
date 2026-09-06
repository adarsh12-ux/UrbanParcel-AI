import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, FileCheck, Image as ImageIcon, ArrowRight, Cpu, AlertCircle, X, Loader2 } from 'lucide-react';
import { fromBlob } from 'geotiff';
import { Project } from '../types';
import { api } from '../services/api';

interface FileMetadata {
  name: string;
  sizeMb: number;
  dimensions: string;
  gsd: string;
  coverage: string;
  gps: string;
  crs: string;
  fileType?: string;
  file?: File;
  width?: number;
  height?: number;
  bounds?: [number, number, number, number];
}

export const DroneUploadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Track blob URLs to properly revoke on unmount or file replacement
  const currentBlobUrlRef = useRef<string | null>(null);
  const selectedUploadRef = useRef<File | null>(null);

  const clearBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current && currentBlobUrlRef.current.startsWith('blob:')) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearBlobUrl();
    };
  }, [clearBlobUrl]);

  useEffect(() => {
    async function loadProject() {
      if (!id) {
        setUploadError('No survey project was selected.');
        return;
      }
      try {
        const proj = await api.getProject(id);
        if (!proj) {
          setUploadError('Survey project was not found.');
          return;
        }
        setProject(proj);
        if (proj.imageryFileName) {
          setSelectedFile({
            name: proj.imageryFileName,
            sizeMb: proj.imageryFileSizeMb || 0,
            dimensions: 'Stored raster metadata',
            gsd: proj.gsdCmPerPx ? `${proj.gsdCmPerPx} cm/pixel` : 'Not provided',
            coverage: `${proj.surveyAreaSqKm} km²`,
            gps: 'Stored upload metadata',
            crs: proj.crs || 'GeoTIFF CRS',
            fileType: 'GeoTIFF'
          });
        }
      } catch (err: any) {
        setUploadError(err?.message || 'Unable to load the survey project.');
      }
    }
    loadProject();
  }, [id]);

  const processFile = useCallback(async (file: File) => {
    clearBlobUrl();
    setPreviewError(null);
    setUploadError(null);
    setPreviewLoading(true);
    selectedUploadRef.current = null;

    const lowerCaseFileName = file.name.toLowerCase();
    const isTiff = lowerCaseFileName.endsWith('.tif')
      || lowerCaseFileName.endsWith('.tiff')
      || lowerCaseFileName.endsWith('.geotiff');
    const sizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(1));

    if (!isTiff) {
      setUploadError('This file is not a valid GIS raster. Select a georeferenced GeoTIFF (.tif, .tiff, or .geotiff) orthomosaic.');
      setPreviewLoading(false);
      return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024 * 1024) {
      setUploadError('The GeoTIFF must be larger than 0 bytes and no larger than 5 GB.');
      setPreviewLoading(false);
      return;
    }

    if (isTiff) {
      try {
        const tiff = await fromBlob(file);
        const image = await tiff.getImage();
        const rawWidth = image.getWidth();
        const rawHeight = image.getHeight();
        if (!rawWidth || !rawHeight) throw new Error('The raster has invalid dimensions.');

        const geoKeys = image.getGeoKeys?.();
        if (!geoKeys?.ProjectedCSTypeGeoKey && !geoKeys?.GeographicTypeGeoKey) {
          throw new Error('The GeoTIFF does not contain a CRS GeoKey.');
        }
        const rawBounds = image.getBoundingBox?.();
        const bounds = rawBounds && rawBounds.length === 4 && rawBounds.every(Number.isFinite)
          ? rawBounds as [number, number, number, number]
          : undefined;

        // Calculate thumbnail bounding dimensions (max 800px)
        const maxDim = 800;
        let targetWidth = rawWidth;
        let targetHeight = rawHeight;
        if (rawWidth > maxDim || rawHeight > maxDim) {
          if (rawWidth >= rawHeight) {
            targetWidth = maxDim;
            targetHeight = Math.max(1, Math.round((rawHeight / rawWidth) * maxDim));
          } else {
            targetHeight = maxDim;
            targetWidth = Math.max(1, Math.round((rawWidth / rawHeight) * maxDim));
          }
        }

        // Decode GeoTIFF rasters
        let rgbData: any;
        try {
          rgbData = await image.readRGB({
            interleave: true,
            width: targetWidth,
            height: targetHeight,
          });
        } catch {
          // Fallback to readRasters
          const rasters = await image.readRasters({
            width: targetWidth,
            height: targetHeight,
            interleave: false,
          });
          const r = rasters[0];
          const g = rasters[1] || rasters[0];
          const b = rasters[2] || rasters[0];
          const len = targetWidth * targetHeight;
          rgbData = new Uint8ClampedArray(len * 3);
          for (let i = 0; i < len; i++) {
            rgbData[i * 3] = r[i];
            rgbData[i * 3 + 1] = g[i];
            rgbData[i * 3 + 2] = b[i];
          }
        }

        // Render to canvas to generate preview image
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imgData = ctx.createImageData(targetWidth, targetHeight);
          const data = imgData.data;
          if (rgbData.length === targetWidth * targetHeight * 4) {
            for (let i = 0; i < rgbData.length; i++) {
              data[i] = rgbData[i];
            }
          } else {
            for (let i = 0, j = 0; i < rgbData.length; i += 3, j += 4) {
              data[j] = rgbData[i];
              data[j + 1] = rgbData[i + 1];
              data[j + 2] = rgbData[i + 2];
              data[j + 3] = 255;
            }
          }
          ctx.putImageData(imgData, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setPreviewUrl(dataUrl);
        }

        // Inspect GeoKeys for CRS if available
        let crs = project?.crs || 'GeoTIFF CRS';
        try {
          if (geoKeys?.ProjectedCSTypeGeoKey) {
            crs = `EPSG:${geoKeys.ProjectedCSTypeGeoKey} (UTM/State Grid)`;
          } else if (geoKeys?.GeographicTypeGeoKey) {
            crs = `EPSG:${geoKeys.GeographicTypeGeoKey} (Geographic)`;
          }
        } catch {
          // Ignore GeoKey extraction issues
        }

        let gsdStr = 'Not provided';
        try {
          const res = image.getResolution();
          if (res && res[0]) {
            const gsdCm = (Math.abs(res[0]) * 100).toFixed(1);
            if (Number(gsdCm) > 0 && Number(gsdCm) < 100) {
              gsdStr = `${gsdCm} cm/pixel`;
            }
          }
        } catch {
          // Resolution tag standard fallback
        }

        setSelectedFile({
          name: file.name,
          sizeMb,
          dimensions: `${rawWidth} × ${rawHeight} px`,
          gsd: gsdStr,
          coverage: `${project?.surveyAreaSqKm || 0} km² project area`,
          gps: 'GeoTIFF Embedded Metadata (RTK)',
          crs: crs,
          fileType: 'GeoTIFF Raster',
          file,
          width: rawWidth,
          height: rawHeight,
          bounds
        });
        selectedUploadRef.current = file;
      } catch (err) {
        console.error('Failed to parse GeoTIFF preview:', err);
        setUploadError(err instanceof Error ? err.message : 'The GeoTIFF could not be validated.');
        setSelectedFile(null);
      } finally {
        setPreviewLoading(false);
      }
    }
  }, [clearBlobUrl, project]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleClearSelection = () => {
    clearBlobUrl();
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setUploadError(null);
    selectedUploadRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartAnalysis = async () => {
    if (!id || !selectedFile?.file || !selectedFile.width || !selectedFile.height) {
      setUploadError('Select and validate a GeoTIFF before starting processing.');
      return;
    }
    setLoading(true);
    setUploadError(null);
    try {
      const { imageryId } = await api.uploadImagery(id, selectedFile.file, {
        crs: selectedFile.crs,
        width: selectedFile.width,
        height: selectedFile.height,
        bounds: selectedFile.bounds
      });
      const job = await api.createProcessingJob(id, imageryId);
      await api.triggerProcessing(job);
      navigate(`/projects/${id}/processing?job=${job.id}`);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed. No processing job was created.');
    } finally {
      setLoading(false);
    }
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
                processFile(e.dataTransfer.files[0]);
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
              accept="image/*,.tif,.tiff,.geotiff,.jpg,.jpeg,.png,.webp"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-3 shadow-xs">
              <Upload className="w-6 h-6 text-teal-700" />
            </div>

            <h3 className="text-sm font-bold text-slate-900">Drag & Drop Georeferenced Drone GeoTIFF</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xs leading-tight">
              Supported formats: <strong className="text-slate-800">GeoTIFF, TIFF, JPG, JPEG, PNG, and WebP</strong>
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

            </div>
          </div>

          {uploadError && <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">{uploadError}</div>}

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
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border font-semibold ${
                  selectedFile
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {selectedFile ? 'Raster Verified' : 'Awaiting Image Ingestion'}
                </span>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    title="Remove selected file"
                    className="text-slate-400 hover:text-rose-600 p-0.5 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {selectedFile ? (
              <div className="space-y-3">
                {/* Visual Thumbnail / Real Preview Frame */}
                <div className="relative rounded overflow-hidden bg-slate-900 border border-slate-200 min-h-[160px] max-h-[220px] flex items-center justify-center group">
                  {previewLoading ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-6 text-slate-400 text-xs font-mono">
                      <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
                      <span>Decoding raster bands & geospatial tags...</span>
                    </div>
                  ) : previewUrl ? (
                    <>
                      <img
                        src={previewUrl}
                        alt={selectedFile.name}
                        className="w-full h-full max-h-[220px] object-cover object-center"
                      />
                      {/* Top Overlay Badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-1 rounded border border-slate-700/60 shadow-xs">
                        <ImageIcon className="w-3 h-3 text-teal-400" />
                        <span className="truncate max-w-[180px] sm:max-w-[220px]">{selectedFile.name}</span>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded border border-slate-700/60">
                        {selectedFile.fileType || 'RASTER'} • {selectedFile.dimensions}
                      </div>
                    </>
                  ) : (
                    <div className="text-center z-10 space-y-0.5 p-4">
                      <ImageIcon className="w-6 h-6 text-teal-700 mx-auto" />
                      <p className="text-xs font-mono font-semibold text-slate-900">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">High-Resolution Drone Orthomosaic</p>
                    </div>
                  )}
                </div>

                {previewError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded">
                    {previewError}
                  </p>
                )}

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
                  Select a georeferenced GeoTIFF via <strong className="text-slate-700 font-semibold">Browse Files</strong>.
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

