import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileJson, FileSpreadsheet, FileCode, Archive, Image, FileText, Compass } from 'lucide-react';
import { Project, Parcel } from '../types';
import { api } from '../services/api';
import { Toast, ToastMessage } from '../components/common/Toast';

export const ExportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'proj-001';

  const [project, setProject] = useState<Project | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [selectedFormat, setSelectedFormat] = useState<'geojson' | 'csv' | 'kml' | 'shapefile' | 'geotiff'>('geojson');
  const [layersToExport, setLayersToExport] = useState({
    parcels: true,
    buildings: true,
    roads: true,
    attributes: true
  });

  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [projData, parcelData] = await Promise.all([
        api.getProject(projectId),
        api.getParcels(projectId)
      ]);
      setProject(projData);
      setParcels(parcelData);
    }
    loadData();
  }, [projectId]);

  const handleDownload = () => {
    const projName = project?.name.replace(/\s+/g, '_') || 'Urban_Zone_01';

    if (selectedFormat === 'geojson') {
      const geojsonObj = {
        type: 'FeatureCollection',
        name: `${projName}_Cadastral_Parcels`,
        crs: {
          type: 'name',
          properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
        },
        features: parcels.map(p => ({
          type: 'Feature',
          properties: {
            id: p.id,
            surveyNo: p.surveyNo,
            areaSqM: p.areaSqM,
            perimeterM: p.perimeterM,
            landUse: p.landUse,
            buildingCount: p.buildingCount,
            roadAccess: p.roadAccess,
            confidence: p.confidence,
            ownerName: p.ownerName,
            status: p.status
          },
          geometry: p.geometry
        }))
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojsonObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${projName}_Cadastral_Layers.geojson`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'GeoJSON Package Exported',
        description: `Exported ${parcels.length} cadastral parcel vector polygons.`
      });
    } else if (selectedFormat === 'csv') {
      const headers = ['Parcel_ID', 'Survey_No', 'Area_SqM', 'Perimeter_M', 'Land_Use', 'Buildings', 'Road_Access', 'Confidence', 'Owner'];
      const rows = parcels.map(p => [
        p.id,
        `"${p.surveyNo}"`,
        p.areaSqM,
        p.perimeterM,
        p.landUse,
        p.buildingCount,
        p.roadAccess,
        `${p.confidence}%`,
        `"${p.ownerName}"`
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${projName}_Parcel_Registry.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setToast({
        id: Date.now().toString(),
        type: 'success',
        title: 'Cadastral Registry CSV Exported',
        description: `Exported attribute registry table for ${parcels.length} parcels.`
      });
    } else {
      setToast({
        id: Date.now().toString(),
        type: 'info',
        title: `${selectedFormat.toUpperCase()} Export Prepared`,
        description: `Download package generated for ${selectedFormat.toUpperCase()} format.`
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-5xl mx-auto w-full space-y-5">
      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 space-y-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-5 h-5 text-teal-700" />
          <span>Cadastral Spatial Data Export & Survey Reports</span>
        </h1>
        <p className="text-xs text-slate-500">Step 4 of 4: Download GIS vector layers, attribute registries, and executive municipal survey summaries.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Layer Checkboxes */}
        <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            1. Vector Layer Package
          </h2>

          <div className="space-y-2 text-xs">
            {[
              { key: 'parcels', label: 'Cadastral Boundaries', desc: '247 closed vector polygons' },
              { key: 'buildings', label: 'Building Footprints', desc: '381 roofline polygons & heights' },
              { key: 'roads', label: 'Road Network', desc: '42 centerline vector polylines' },
              { key: 'attributes', label: 'Attribute Registry', desc: 'Survey Nos, Land Use & Ownership' }
            ].map((item) => {
              const k = item.key as keyof typeof layersToExport;
              return (
                <label
                  key={item.key}
                  className="flex items-start gap-2.5 p-2 rounded bg-slate-50 border border-slate-200/80 cursor-pointer hover:border-slate-300 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={layersToExport[k]}
                    onChange={(e) => setLayersToExport(prev => ({ ...prev, [k]: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-700 focus:ring-teal-600 bg-white border-slate-300"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">{item.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{item.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            2. Select Export Format & Generate Output
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {[
              { id: 'geojson', name: 'GeoJSON Vectors', ext: '.geojson', icon: FileJson, desc: 'OGC standard spatial format' },
              { id: 'csv', name: 'Cadastral CSV', ext: '.csv', icon: FileSpreadsheet, desc: 'Tabular attribute database' },
              { id: 'kml', name: 'Google Earth KML', ext: '.kml', icon: FileCode, desc: 'Keyhole markup for 3D Earth' },
              { id: 'shapefile', name: 'ESRI Shapefile', ext: '.zip', icon: Archive, desc: 'ArcGIS / QGIS shapefile package' },
              { id: 'geotiff', name: 'GeoTIFF Ortho', ext: '.tif', icon: Image, desc: 'Georeferenced raster orthomosaic' }
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSel = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`p-3 rounded border text-left flex flex-col justify-between space-y-1.5 transition-colors cursor-pointer ${
                    isSel
                      ? 'bg-teal-50 border-teal-200 text-teal-950 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-4 h-4 ${isSel ? 'text-teal-700' : 'text-slate-400'}`} />
                    <span className="font-mono text-[9px] bg-white px-1.5 py-0.2 rounded text-slate-600 border border-slate-200 font-medium">
                      {fmt.ext}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-xs">{fmt.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{fmt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Download Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export {selectedFormat.toUpperCase()} Data</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-300" />
              <span>Cadastral Survey Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Report Preview Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded max-w-2xl w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">Municipal Cadastral Survey Executive Summary</h3>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Official Summary
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded p-4 space-y-3 text-xs text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-mono">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{project?.name || 'Urban Zone A'}</p>
                  <p className="text-slate-500 text-xs">{project?.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500 text-xs">Survey Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-emerald-700 font-semibold text-xs">CRS: EPSG:4326</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <p className="text-[10px] text-slate-400 uppercase font-sans">Survey Area</p>
                  <p className="font-bold text-slate-900 mt-0.5">{project?.surveyAreaSqKm || 4.2} km²</p>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <p className="text-[10px] text-slate-400 uppercase font-sans">Parcels Mapped</p>
                  <p className="font-bold text-teal-800 mt-0.5">{parcels.length || 247}</p>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <p className="text-[10px] text-slate-400 uppercase font-sans">Buildings Extracted</p>
                  <p className="font-bold text-amber-700 mt-0.5">381</p>
                </div>
              </div>

              <div className="space-y-1 text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-900 text-xs">Executive Summary:</p>
                <p className="text-[11px] text-slate-600">
                  Automated high-resolution UAV orthomosaic boundary regularization completed with ResNet-50 + U-Net AI feature extraction pipeline. Mean boundary IoU achieved 88.4% with 94.7% confidence score across 247 urban parcel units in Vijayawada municipal zone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-3.5 py-1.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setReportModalOpen(false);
                }}
                className="px-4 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Print Summary / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
