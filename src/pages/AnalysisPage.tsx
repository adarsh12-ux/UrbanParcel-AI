import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  ShieldCheck,
  Compass,
  ArrowRight
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
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="h-48 rounded bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-7 max-w-6xl mx-auto w-full space-y-5">
      {/* Disclaimer Notice */}
      <div className="px-3.5 py-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0" />
          <p className="text-[11px] leading-tight">
            <strong>Prototype Benchmark Notice:</strong> Performance metrics reflect sample validation test runs on high-resolution orthomosaics for Smart India Hackathon.
          </p>
        </div>
        <span className="font-mono text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500 shrink-0 hidden sm:inline">
          ResNet-50 + U-Net
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <span>AI Cadastral Feature Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deep Learning segmentation metrics, topological accuracy, and municipal ground truth cross-validation.
          </p>
        </div>

        <button
          onClick={() => navigate(`/projects/${projectId}/map`)}
          className="px-3.5 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shrink-0 transition-colors cursor-pointer"
        >
          Return to GIS Workspace
        </button>
      </div>

      {/* Detected Feature Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-white border border-slate-200 p-3.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Parcels Delineated</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalParcelsDetected}</p>
          <p className="text-[10px] text-slate-400 font-sans">Vector polygons extracted</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Building Footprints</p>
          <p className="text-2xl font-bold text-amber-700">{metrics.totalBuildingsDetected}</p>
          <p className="text-[10px] text-slate-400 font-sans">Roofline boundaries</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Road Centerlines</p>
          <p className="text-2xl font-bold text-teal-700">{metrics.totalRoadSegments}</p>
          <p className="text-[10px] text-slate-400 font-sans">Polyline segments</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-0.5">
          <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Water Channels</p>
          <p className="text-2xl font-bold text-sky-700">{metrics.totalWaterBodies}</p>
          <p className="text-[10px] text-slate-400 font-sans">Drainage & open water</p>
        </div>
      </div>

      {/* Model Performance Accuracy Summary */}
      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Segmentation Accuracy Validation (U-Net Deep Learning Model)</span>
          </h2>
          <span className="font-mono text-[10px] text-slate-400">GSD: 3.2 cm/px</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
          <div className="p-3 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
            <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Precision</p>
            <p className="text-2xl font-bold text-emerald-700">{metrics.precision}%</p>
            <p className="text-[10px] text-slate-400 font-sans">True Positives / Extracted</p>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
            <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Recall</p>
            <p className="text-2xl font-bold text-slate-900">{metrics.recall}%</p>
            <p className="text-[10px] text-slate-400 font-sans">True Positives / Reference</p>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
            <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">F1 Score</p>
            <p className="text-2xl font-bold text-teal-800">{metrics.f1Score}%</p>
            <p className="text-[10px] text-slate-400 font-sans">Harmonic Mean Metric</p>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
            <p className="text-[10px] text-slate-500 font-sans font-medium uppercase">Mean IoU</p>
            <p className="text-2xl font-bold text-amber-700">{metrics.meanIoU}%</p>
            <p className="text-[10px] text-slate-400 font-sans">Intersection over Union</p>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Land Use Pie Chart */}
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <PieIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>Land Use Zoning Distribution</span>
            </h3>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.landUseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {metrics.landUseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '4px', color: '#0f172a', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {metrics.landUseBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: item.color }} />
                <span className="text-slate-500 text-[11px] font-medium">{item.name}:</span>
                <span className="font-mono text-slate-900 font-semibold text-[11px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence Distribution Bar Chart */}
        <div className="bg-white border border-slate-200 rounded p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
              <span>Boundary Confidence Spread</span>
            </h3>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.confidenceDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '4px', color: '#0f172a', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <Bar dataKey="count" fill="#0f766e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-slate-500 text-center font-medium">
            88.2% of delineated parcels exceed 90% boundary IoU threshold.
          </p>
        </div>
      </div>

      {/* Ground Truth Validation Table */}
      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Ground Truth vs AI Prediction Boundary Verification
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Comparison against municipal cadastral survey ground truth records.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[9px] font-semibold font-mono tracking-wider">
              <tr>
                <th className="p-2.5">Parcel ID</th>
                <th className="p-2.5">Ground Truth</th>
                <th className="p-2.5">AI Predicted</th>
                <th className="p-2.5">IoU Score</th>
                <th className="p-2.5">Precision</th>
                <th className="p-2.5">Recall</th>
                <th className="p-2.5">Deviation</th>
                <th className="p-2.5">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
              {metrics.groundTruthComparisons.map((cmp) => (
                <tr key={cmp.parcelId} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{cmp.parcelId}</td>
                  <td className="p-2.5">{cmp.gtArea.toLocaleString()} m²</td>
                  <td className="p-2.5">{cmp.aiArea.toLocaleString()} m²</td>
                  <td className="p-2.5 font-bold text-emerald-700">{cmp.iou}%</td>
                  <td className="p-2.5">{cmp.precision}%</td>
                  <td className="p-2.5">{cmp.recall}%</td>
                  <td className="p-2.5 text-slate-500">{cmp.deviationM} m</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                      cmp.iou > 90 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {cmp.iou > 90 ? 'Verified' : 'Flagged'}
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
