import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  MapPin,
  FileCheck2,
  PlusCircle,
  ArrowRight,
  Clock,
  Box,
  Compass,
  ChevronRight,
  Activity,
  Upload,
  FileCheck,
  Database,
  BrainCircuit,
  Map,
  ClipboardCheck,
  Server,
  FileOutput
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState('01');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (err: any) {
        console.error('Failed to load dashboard projects:', err);
        setError(err?.message || 'Unable to load dashboard project data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalArea = projects.reduce((acc, p) => acc + (p.surveyAreaSqKm || 0), 0);
  const totalParcels = projects.reduce((acc, p) => acc + (p.parcelCount || 0), 0);
  const totalFeatures = projects.reduce((acc, p) => acc + (p.buildingCount || 0) + (p.roadSegmentCount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
      {/* Compact Institutional Page Header */}
      <div className="bg-white border border-slate-200 rounded p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Municipal Land Administration Portal • Smart India Hackathon
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>UrbanParcel AI</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-normal border border-slate-200">
              v2.4 Cadastral GIS Engine
            </span>
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Automated urban parcel mapping, boundary regularization, and cadastral feature extraction from high-resolution UAV drone orthomosaics.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => navigate('/projects/new')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-medium text-xs transition-colors shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Survey Project</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Cadastral Land System KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cadastral Projects"
          value={String(projects.length)}
          subtitle="Municipal survey zones"
          icon={Layers}
          color="indigo"
          trend={`${projects.filter(p => p.status === 'Processing').length} in processing`}
        />
        <StatCard
          title="Orthomosaic Area"
          value={`${totalArea > 0 ? totalArea.toFixed(1) : '0.0'} km²`}
          subtitle="UAV drone coverage"
          icon={MapPin}
          color="cyan"
          trend="3.2 cm/px target GSD"
        />
        <StatCard
          title="Delineated Parcels"
          value={totalParcels.toLocaleString()}
          subtitle="Cadastral boundaries extracted"
          icon={FileCheck2}
          color="emerald"
          trend="Vector regularized"
        />
        <StatCard
          title="Extracted Features"
          value={totalFeatures.toLocaleString()}
          subtitle="Building footprints & roads"
          icon={Box}
          color="amber"
          trend="Topological layers"
        />
      </div>

      {/* Cadastral Projects Workspace */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Active Survey Packages</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                {projects.length} Records
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">Select a municipal project to launch the interactive GIS workspace and parcel review.</p>
          </div>
          <Link
            to="/projects"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 transition-colors"
          >
            <span>View All Survey Packages</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded bg-white border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded p-8 text-center space-y-3">
            <p className="text-xs text-slate-500">No cadastral survey projects created yet in the database.</p>
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Initiate First Survey Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/map`)}
                className="group bg-white border border-slate-200 hover:border-teal-600 rounded p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm cursor-pointer flex flex-col justify-between transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-teal-800 text-sm leading-tight transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{project.location}</span>
                      </p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  {/* Cadastral Specs Row */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 bg-slate-50/70 -mx-4.5 px-4.5 text-xs font-mono">
                    <div>
                      <p className="text-slate-400 text-[10px] font-sans">Survey Area</p>
                      <p className="font-semibold text-slate-800">{project.surveyAreaSqKm} km²</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-sans">Parcels</p>
                      <p className="font-semibold text-slate-800">{project.parcelCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] font-sans">GSD</p>
                      <p className="font-semibold text-teal-800">{project.gsdCmPerPx} cm/px</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="text-teal-700 group-hover:text-teal-800 font-semibold inline-flex items-center gap-1 text-xs">
                    <span>Open GIS Map</span>
                    <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cadastral Pipeline Operations Sequence Guide */}
      <div className="bg-white border border-slate-200 rounded p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cadastral Feature Extraction Pipeline Workflow
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">8 Automated Operational Steps</span>
        </div>

        <p className="text-[11px] text-slate-500 -mt-1">
          Standard sequence for converting validated UAV imagery into reviewable cadastral records and reports.
        </p>

        <div className="flex flex-wrap gap-2 xl:flex-nowrap xl:gap-0" aria-label="Cadastral feature extraction workflow">
          {[
            { step: '01', title: 'Upload Drone Imagery', description: 'Submit orthomosaic source', icon: Upload },
            { step: '02', title: 'Validate GeoTIFF', description: 'Check format and projection', icon: FileCheck },
            { step: '03', title: 'Extract Spatial Metadata', description: 'Read CRS and coverage', icon: Database },
            { step: '04', title: 'AI Feature Extraction', description: 'Identify mapped features', icon: BrainCircuit },
            { step: '05', title: 'Generate Parcel Boundaries', description: 'Build cadastral polygons', icon: Map },
            { step: '06', title: 'Review and Verify Data', description: 'Confirm geometry and attributes', icon: ClipboardCheck },
            { step: '07', title: 'Store in PostGIS', description: 'Persist authoritative layers', icon: Server },
            { step: '08', title: 'Export Cadastral Reports', description: 'Prepare official outputs', icon: FileOutput }
          ].map((item, index, items) => {
            const Icon = item.icon;
            const isActive = item.step === activeStep;
            return (
              <div key={item.step} className="flex min-w-[calc(50%-0.25rem)] items-stretch sm:min-w-[calc(25%-0.375rem)] xl:min-w-0 xl:flex-1">
                <button
                  type="button"
                  onClick={() => setActiveStep(item.step)}
                  aria-pressed={isActive}
                  className={`flex min-h-[112px] w-full cursor-pointer flex-col rounded border p-2.5 text-left ${
                  isActive
                    ? 'border-teal-200 bg-teal-50/80 text-teal-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[9px] font-bold ${
                      isActive ? 'bg-teal-700 text-white' : 'border border-slate-200 bg-white text-slate-500'
                    }`}>
                      {item.step}
                    </span>
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-teal-700' : 'text-slate-500'}`} aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-[11px] font-semibold leading-tight">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-tight text-slate-500">{item.description}</p>
                </button>
                {index < items.length - 1 && (
                  <ArrowRight className="mx-1 hidden w-3 shrink-0 self-center text-slate-300 xl:block" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
