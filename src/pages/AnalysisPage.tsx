import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { AnalysisMetrics, GroundTruthComparison } from '../types';
import { api } from '../services/api';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid
} from 'recharts';

export const AnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const projectId = id || 'proj-001';

  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<GroundTruthComparison | null>(null);

  useEffect(() => {
    async function loadAnalysis() {
      const data = await api.getAnalysis(projectId);
      setMetrics(data);
      if (data.groundTruthComparisons.length > 0) {
        setSelectedComparison(data.groundTruthComparisons[0]);
      }
    }
    loadAnalysis();
  }, [projectId]);

  if (!metrics) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <div className="h-64 rounded-sm bg-white border border-line" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Disclaimer Banner */}
      <div className="p-4 rounded-sm bg-navy-50 border border-navy-100 text-xs text-navy-900 space-y-1 font-medium">
        <div className="flex items-center gap-2 font-semibold text-navy-950">
          <Sparkles className="w-4 h-4 text-navy-700" />
          <span>Prototype / Sample Metrics Notice</span>
        </div>
        <p className="text-navy-800">
          These metrics are placeholders for prototype demonstration and must be replaced with measurements from the trained model.
        </p>
      </div>

      {/* Header */}
      <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-navy-700" />
            <span>AI Feature Extraction Analysis</span>
          </h1>
          <p className="text-xs text-muted mt-1">
            U-Net Deep Learning Segmentation performance, spatial accuracy, and Ground Truth validation metrics.
          </p>
        </div>

        <button
          onClick={() => navigate(`/projects/${projectId}/map`)}
          className="px-4 py-2.5 rounded-sm bg-navy-900 hover:bg-navy-800 text-white font-semibold text-xs shrink-0 cursor-pointer"
        >
          View GIS Map
        </button>
      </div>

      {/* Detected Feature Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-line p-4 rounded-sm space-y-1">
          <p className="text-xs text-muted font-semibold uppercase">Parcels Detected</p>
          <p className="text-2xl font-extrabold font-mono text-navy-900">{metrics.totalParcelsDetected}</p>
          <p className="text-[10px] text-muted">Vector polygons extracted</p>
        </div>
        <div className="bg-white border border-line p-4 rounded-sm space-y-1">
          <p className="text-xs text-muted font-semibold uppercase">Buildings Detected</p>
          <p className="text-2xl font-extrabold font-mono text-amber-800">{metrics.totalBuildingsDetected}</p>
          <p className="text-[10px] text-muted">Structural roof footprints</p>
        </div>
        <div className="bg-white border border-line p-4 rounded-sm space-y-1">
          <p className="text-xs text-muted font-semibold uppercase">Road Segments</p>
          <p className="text-2xl font-extrabold font-mono text-forest-800">{metrics.totalRoadSegments}</p>
          <p className="text-[10px] text-muted">Centerlines vectorized</p>
        </div>
        <div className="bg-white border border-line p-4 rounded-sm space-y-1">
          <p className="text-xs text-muted font-semibold uppercase">Water Bodies</p>
          <p className="text-2xl font-extrabold font-mono text-sky-800">{metrics.totalWaterBodies}</p>
          <p className="text-[10px] text-muted">Canals & open water</p>
        </div>
      </div>

      {/* Model Performance Score Cards (Precision, Recall, F1, IoU) */}
      <div className="bg-white border border-line rounded-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-forest-700" />
          <span>Model Accuracy Summary (ResNet-50 + U-Net)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-sm bg-canvas border border-line space-y-1">
            <p className="text-xs text-muted font-semibold uppercase">Precision</p>
            <p className="text-3xl font-extrabold font-mono text-forest-800">{metrics.precision}%</p>
            <p className="text-[10px] text-muted">True Positives / Extracted</p>
          </div>
          <div className="p-4 rounded-sm bg-canvas border border-line space-y-1">
            <p className="text-xs text-muted font-semibold uppercase">Recall</p>
            <p className="text-3xl font-extrabold font-mono text-navy-900">{metrics.recall}%</p>
            <p className="text-[10px] text-muted">True Positives / Ground Truth</p>
          </div>
          <div className="p-4 rounded-sm bg-canvas border border-line space-y-1">
            <p className="text-xs text-muted font-semibold uppercase">F1 Score</p>
            <p className="text-3xl font-extrabold font-mono text-navy-800">{metrics.f1Score}%</p>
            <p className="text-[10px] text-muted">Harmonic Mean Metric</p>
          </div>
          <div className="p-4 rounded-sm bg-canvas border border-line space-y-1">
            <p className="text-xs text-muted font-semibold uppercase">Mean IoU</p>
            <p className="text-3xl font-extrabold font-mono text-amber-800">{metrics.meanIoU}%</p>
            <p className="text-[10px] text-muted">Intersection over Union</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Land Use Pie Chart */}
        <div className="bg-white border border-line rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-navy-700" />
              <span>Land Use Classification Distribution</span>
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.landUseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {metrics.landUseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d0d7de', borderRadius: '2px', color: '#1a2332', fontSize: '12px', boxShadow: '0 4px 12px rgba(12, 35, 64, 0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {metrics.landUseBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted font-medium">{item.name}:</span>
                <span className="font-mono text-ink font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Distribution Bar Chart */}
        <div className="bg-white border border-line rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-forest-800" />
              <span>AI Parcel Confidence Spread</span>
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.confidenceDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d0d7de" />
                <XAxis dataKey="range" stroke="#5b6775" fontSize={10} />
                <YAxis stroke="#5b6775" fontSize={10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d0d7de', borderRadius: '2px', color: '#1a2332', fontSize: '12px', boxShadow: '0 4px 12px rgba(12, 35, 64, 0.08)' }}
                />
                <Bar dataKey="count" fill="#0c2340" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-muted text-center font-medium">
            88.2% of detected parcels exceed 90% boundary confidence score.
          </p>
        </div>
      </div>

      {/* Ground Truth vs AI Prediction Validation Table */}
      <div className="bg-white border border-line rounded-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Ground Truth vs AI Prediction Boundary Comparison
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Side-by-side area verification against municipal cadastral survey ground truth records.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-900 text-white uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="p-3">Parcel ID</th>
                <th className="p-3">Ground Truth Area</th>
                <th className="p-3">AI Predicted Area</th>
                <th className="p-3">IoU Score</th>
                <th className="p-3">Precision</th>
                <th className="p-3">Recall</th>
                <th className="p-3">Boundary Deviation</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink font-mono">
              {metrics.groundTruthComparisons.map((cmp) => (
                <tr key={cmp.parcelId} className="hover:bg-navy-50">
                  <td className="p-3 font-bold text-navy-900">{cmp.parcelId}</td>
                  <td className="p-3">{cmp.gtArea.toLocaleString()} m²</td>
                  <td className="p-3">{cmp.aiArea.toLocaleString()} m²</td>
                  <td className="p-3 font-bold text-forest-800">{cmp.iou}%</td>
                  <td className="p-3">{cmp.precision}%</td>
                  <td className="p-3">{cmp.recall}%</td>
                  <td className="p-3 text-muted">{cmp.deviationM} m</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-sans font-semibold border ${
                      cmp.iou > 90 ? 'bg-forest-50 text-forest-800 border-forest-100' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {cmp.iou > 90 ? 'High Agreement' : 'Boundary Flagged'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
