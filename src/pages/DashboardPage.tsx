import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  FileCheck2,
  PlusCircle,
  ArrowRight,
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
      <div className="relative overflow-hidden rounded-sm bg-navy-900 border border-navy-800 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-navy-800 border border-navy-700 text-xs font-semibold text-navy-50">
              <Sparkles className="w-3.5 h-3.5 text-forest-100" />
              Smart India Hackathon Prototype
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-tight">
              UrbanParcel <span className="text-forest-100">AI</span>
            </h1>
            <p className="text-navy-100 text-sm sm:text-base max-w-2xl">
              AI-Powered Automated Urban Parcel Mapping & Cadastral Feature Extraction System using High-Resolution Drone Imagery.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-sm bg-forest-700 hover:bg-forest-600 text-white font-semibold text-sm border border-forest-700 cursor-pointer"
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
            <h2 className="text-xl font-serif font-bold text-ink tracking-tight">Recent Projects</h2>
            <p className="text-xs text-muted">Select a project to inspect its GIS layers and AI analysis.</p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-semibold text-navy-700 hover:text-navy-900 flex items-center gap-1"
          >
            <span>View All Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-sm bg-white border border-line" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/map`)}
                className="group relative bg-white border border-line rounded-sm p-5 hover:border-navy-600 cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-ink group-hover:text-navy-800 text-base">
                      {project.name}
                    </h3>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="truncate">{project.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-xs">
                    <div>
                      <p className="text-muted text-[11px]">Area</p>
                      <p className="font-semibold text-ink font-mono">{project.surveyAreaSqKm} km²</p>
                    </div>
                    <div>
                      <p className="text-muted text-[11px]">Parcels</p>
                      <p className="font-semibold text-ink font-mono">{project.parcelCount}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="text-navy-700 font-semibold inline-flex items-center gap-1 text-xs">
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
      <div className="bg-white border border-line rounded-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-navy-700" />
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">SIH Prototype Workflow Guide</h3>
          </div>
          <span className="text-xs text-muted">Step 1 of 8</span>
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
              className={`p-2.5 rounded-sm border ${
                item.active
                  ? 'bg-navy-50 border-navy-100 text-navy-950 font-semibold'
                  : 'bg-canvas border-line text-muted'
              }`}
            >
              <div className={`w-5 h-5 rounded-full mx-auto mb-1 flex items-center justify-center font-mono text-[10px] ${
                item.active ? 'bg-navy-900 text-white font-bold' : 'bg-white text-muted border border-line'
              }`}>
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
