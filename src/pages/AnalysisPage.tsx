import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Layers,
  PieChart as PieIcon,
  TrendingUp,
  Sliders,
  Sparkles,
  Info,
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
  LineChart,
  Line,
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
        <div className="h-64 rounded-xl bg-slate-900 border border-slate-800 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-xs text-cyan-300 space-y-1 shadow-lg">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Prototype / Sample Metrics Notice</span>
        </div>
        <p className="text-slate-300">
          These metrics are placeholders for prototype demonstration and must be replaced with measurements from the trained model.
        </p>
      </div>

      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>AI Feature Extraction Analysis</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            U-Net Deep Learning Segmentation performance, spatial accuracy, and Ground Truth validation metrics.
          </p>
        </div>

        <button
          onClick={() => navigate(`/projects/${projectId}/map`)}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-all shadow-md shrink-0"
        >
          View GIS Map
        </button>
      </div>

      {/* Detected Feature Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Parcels Detected</p>
          <p className="text-2xl font-extrabold font-mono text-cyan-400">{metrics.totalParcelsDetected}</p>
          <p className="text-[10px] text-slate-500">Vector polygons extracted</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Buildings Detected</p>
          <p className="text-2xl font-extrabold font-mono text-amber-400">{metrics.totalBuildingsDetected}</p>
          <p className="text-[10px] text-slate-500">Structural roof footprints</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Road Segments</p>
          <p className="text-2xl font-extrabold font-mono text-emerald-400">{metrics.totalRoadSegments}</p>
          <p className="text-[10px] text-slate-500">Centerlines vectorized</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <p className="text-xs text-slate-400 font-medium">Water Bodies</p>
          <p className="text-2xl font-extrabold font-mono text-blue-400">{metrics.totalWaterBodies}</p>
          <p className="text-[10px] text-slate-500">Canals & open water</p>
        </div>
      </div>

      {/* Model Performance Score Cards (Precision, Recall, F1, IoU) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Model Accuracy Summary (ResNet-50 + U-Net)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400">Precision</p>
            <p className="text-3xl font-extrabold font-mono text-emerald-400">{metrics.precision}%</p>
            <p className="text-[10px] text-slate-500">True Positives / Extracted</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400">Recall</p>
            <p className="text-3xl font-extrabold font-mono text-cyan-400">{metrics.recall}%</p>
            <p className="text-[10px] text-slate-500">True Positives / Ground Truth</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400">F1 Score</p>
            <p className="text-3xl font-extrabold font-mono text-indigo-400">{metrics.f1Score}%</p>
            <p className="text-[10px] text-slate-500">Harmonic Mean Metric</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <p className="text-xs text-slate-400">Mean IoU</p>
            <p className="text-3xl font-extrabold font-mono text-amber-400">{metrics.meanIoU}%</p>
            <p className="text-[10px] text-slate-500">Intersection over Union</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Land Use Pie Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-cyan-400" />
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
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {metrics.landUseBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}:</span>
                <span className="font-mono text-slate-400">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Distribution Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>AI Parcel Confidence Spread</span>
            </h3>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.confidenceDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            88.2% of detected parcels exceed 90% boundary confidence score.
          </p>
        </div>
      </div>

      {/* Ground Truth vs AI Prediction Validation Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
              Ground Truth vs AI Prediction Boundary Comparison
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side area verification against municipal cadastral survey ground truth records.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
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
            <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
              {metrics.groundTruthComparisons.map((cmp) => (
                <tr key={cmp.parcelId} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-bold text-cyan-400">{cmp.parcelId}</td>
                  <td className="p-3">{cmp.gtArea.toLocaleString()} m²</td>
                  <td className="p-3">{cmp.aiArea.toLocaleString()} m²</td>
                  <td className="p-3 font-bold text-emerald-400">{cmp.iou}%</td>
                  <td className="p-3">{cmp.precision}%</td>
                  <td className="p-3">{cmp.recall}%</td>
                  <td className="p-3 text-slate-300">{cmp.deviationM} m</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                      cmp.iou > 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
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
