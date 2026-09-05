import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileJson, FileSpreadsheet, FileCode, Archive, Image, FileText } from 'lucide-react';
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

  // Client-side file download helper
  const handleDownload = () => {
    const projName = project?.name.replace(/\s+/g, '_') || 'Urban_Zone_01';

    if (selectedFormat === 'geojson') {
      // Construct valid GeoJSON feature collection
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
        title: 'GeoJSON Download Started',
        description: `Exported ${parcels.length} parcel vector polygons as GeoJSON.`
      });
    } else if (selectedFormat === 'csv') {
      // CSV Download
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
        title: 'CSV Attribute Registry Downloaded',
        description: `Exported attribute registry table for ${parcels.length} parcels.`
      });
    } else {
      // Simulated export format notification
      setToast({
        id: Date.now().toString(),
        type: 'info',
        title: `${selectedFormat.toUpperCase()} Export Prepared`,
        description: `Simulated download package generated for ${selectedFormat.toUpperCase()} format.`
      });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="border-b border-line pb-4 space-y-1">
        <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
          <Download className="w-6 h-6 text-navy-700" />
          <span>Export Cadastral GIS Data & Reports</span>
        </h1>
        <p className="text-xs text-muted">Step 4 of 4: Download GIS vector layers, attribute tables, and PDF survey reports.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Layer Checkboxes */}
        <div className="bg-white border border-line rounded-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider border-b border-line pb-2">
            1. Select Vector Layers
          </h2>

          <div className="space-y-3 text-xs">
            {[
              { key: 'parcels', label: 'Parcel Boundaries', desc: '247 closed polygon vectors with IDs' },
              { key: 'buildings', label: 'Building Footprints', desc: '381 roofline polygons & heights' },
              { key: 'roads', label: 'Road Network', desc: '42 centerline vector polylines' },
              { key: 'attributes', label: 'Attribute Tables', desc: 'Survey Nos, Land Use & Ownership' }
            ].map((item) => {
              const k = item.key as keyof typeof layersToExport;
              return (
                <label
                  key={item.key}
                  className="flex items-start gap-3 p-2.5 rounded-sm bg-canvas border border-line cursor-pointer hover:border-navy-600"
                >
                  <input
                    type="checkbox"
                    checked={layersToExport[k]}
                    onChange={(e) => setLayersToExport(prev => ({ ...prev, [k]: e.target.checked }))}
                    className="mt-0.5 rounded-sm text-navy-800 focus:ring-navy-700 bg-white border-line"
                  />
                  <div>
                    <p className="font-semibold text-ink">{item.label}</p>
                    <p className="text-[11px] text-muted">{item.desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div className="md:col-span-2 bg-white border border-line rounded-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink uppercase tracking-wider border-b border-line pb-2">
            2. Select Export Format & Generate
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {[
              { id: 'geojson', name: 'GeoJSON', ext: '.geojson', icon: FileJson, desc: 'Standard Web GIS vector format' },
              { id: 'csv', name: 'CSV Attributes', ext: '.csv', icon: FileSpreadsheet, desc: 'Excel / Tabular parcel registry' },
              { id: 'kml', name: 'Google Earth KML', ext: '.kml', icon: FileCode, desc: 'Keyhole Markup Language for Earth' },
              { id: 'shapefile', name: 'ESRI Shapefile', ext: '.zip', icon: Archive, desc: 'ArcGIS / QGIS shapefile archive' },
              { id: 'geotiff', name: 'GeoTIFF Ortho', ext: '.tif', icon: Image, desc: 'Georeferenced raster orthomosaic' }
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSel = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id as any)}
                  className={`p-3.5 rounded-sm border text-left flex flex-col justify-between space-y-2 cursor-pointer ${
                    isSel
                      ? 'bg-navy-50 border-navy-100 text-navy-950 font-semibold'
                      : 'bg-canvas border-line text-muted hover:text-ink hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`w-5 h-5 ${isSel ? 'text-navy-700' : 'text-muted'}`} />
                    <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded-sm text-ink border border-line font-medium">
                      {fmt.ext}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-xs">{fmt.name}</p>
                    <p className="text-[10px] text-muted mt-0.5 leading-tight">{fmt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Download Action Buttons */}
          <div className="pt-4 border-t border-line flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-sm bg-forest-700 hover:bg-forest-600 text-white font-bold text-sm cursor-pointer"
            >
              <Download className="w-5 h-5" />
              <span>Export {selectedFormat.toUpperCase()} Data</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-sm bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm border border-navy-900 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-navy-100" />
              <span>Generate PDF Summary Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Report Preview Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-navy-950/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-sm max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-navy-700" />
                <h3 className="font-bold text-ink text-base">Cadastral Survey Executive Report</h3>
              </div>
              <span className="text-xs font-mono bg-navy-50 text-navy-800 font-semibold px-2 py-0.5 rounded-sm border border-navy-100">
                Generated Preview
              </span>
            </div>

            <div className="bg-canvas border border-line rounded-sm p-5 space-y-4 text-xs text-ink">
              <div className="flex items-center justify-between border-b border-line pb-2 font-mono">
                <div>
                  <p className="font-bold text-ink text-sm">{project?.name || 'Urban Zone A'}</p>
                  <p className="text-muted">{project?.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted">Date: {new Date().toLocaleDateString()}</p>
                  <p className="text-forest-800 font-semibold">Status: AI Verified</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 bg-white border border-line rounded-sm">
                  <p className="text-[10px] text-muted uppercase font-semibold">Survey Area</p>
                  <p className="font-bold text-ink mt-0.5">{project?.surveyAreaSqKm || 4.2} km²</p>
                </div>
                <div className="p-2.5 bg-white border border-line rounded-sm">
                  <p className="text-[10px] text-muted uppercase font-semibold">Parcels Mapped</p>
                  <p className="font-bold text-navy-900 mt-0.5">247</p>
                </div>
                <div className="p-2.5 bg-white border border-line rounded-sm">
                  <p className="text-[10px] text-muted uppercase font-semibold">Buildings Extracted</p>
                  <p className="font-bold text-amber-800 mt-0.5">381</p>
                </div>
              </div>

              <div className="space-y-1 text-ink leading-relaxed">
                <p className="font-semibold text-ink">Executive Summary:</p>
                <p className="text-[11px] text-muted">
                  Automated high-resolution drone orthomosaic processing completed with ResNet-50 + U-Net AI feature extraction pipeline. Mean boundary IoU achieved 88.4% with 94.7% confidence score across 247 urban parcel units in Vijayawada municipal zone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReportModalOpen(false)}
                className="px-4 py-2 rounded-sm bg-white border border-line text-ink text-xs font-medium hover:bg-navy-50 cursor-pointer"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  window.print();
                  setReportModalOpen(false);
                }}
                className="px-5 py-2 rounded-sm bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
              >
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};
