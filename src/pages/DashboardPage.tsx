import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  FileCheck2,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
  Box
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-xs font-semibold text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              Smart India Hackathon Prototype
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              UrbanParcel <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
              AI-Powered Automated Urban Parcel Mapping & Cadastral Feature Extraction System using High-Resolution Drone Imagery.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-950/50 border border-cyan-300/30 transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-5 h-5" />
              <span>+ New Mapping Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Projects"
          value="12"
          subtitle="Across AP & Telangana municipal zones"
          icon={Layers}
          color="cyan"
          trend="+2 created this week"
        />
        <StatCard
          title="Mapped Area"
          value="24.8 km²"
          subtitle="High-res orthomosaic coverage"
          icon={MapPin}
          color="emerald"
          trend="3.2 cm/pixel avg GSD"
        />
        <StatCard
          title="Detected Parcels"
          value="4,821"
          subtitle="Cadastral boundaries extracted"
          icon={FileCheck2}
          color="indigo"
          trend="94.7% mean AI confidence"
        />
        <StatCard
          title="Extracted Features"
          value="8,643"
          subtitle="Buildings & road segments"
          icon={Box}
          color="amber"
          trend="Automated vectorization"
        />
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Recent Projects</h2>
            <p className="text-xs text-slate-400">Select a project to inspect its GIS layers and AI analysis.</p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/map`)}
                className="group relative bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-cyan-500/50 hover:shadow-xl hover:shadow-slate-950/60 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors text-base">
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <p className="text-slate-400">Area</p>
                      <p className="font-semibold text-slate-200 font-mono">{project.surveyAreaSqKm} km²</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Parcels</p>
                      <p className="font-semibold text-slate-200 font-mono">{project.parcelCount}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="text-cyan-400 font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    <span>Open GIS Map</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Workflow Guide */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">SIH Prototype Workflow Guide</h3>
          </div>
          <span className="text-xs text-slate-400">Step 1 of 8</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center text-xs">
          {[
            { step: '1', title: 'Dashboard', active: true },
            { step: '2', title: 'Create Project', active: false },
            { step: '3', title: 'Upload Drone', active: false },
            { step: '4', title: 'AI Pipeline', active: false },
            { step: '5', title: 'GIS Map', active: false },
            { step: '6', title: 'Parcel Details', active: false },
            { step: '7', title: 'AI Analysis', active: false },
            { step: '8', title: 'Export Data', active: false }
          ].map((item) => (
            <div
              key={item.step}
              className={`p-2.5 rounded-lg border transition-all ${
                item.active
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-slate-900/40 border-slate-800/60 text-slate-400'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 mx-auto mb-1 flex items-center justify-center font-mono text-[10px]">
                {item.step}
              </div>
              <p className="truncate text-[11px]">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
