import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, MapPin, PlusCircle, Search, ArrowRight, Filter, Compass } from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
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

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.location.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-7 space-y-5 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-700" />
            <span>Cadastral Survey Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Municipal land information repository, UAV orthomosaic datasets, and AI parcel extraction packages.
          </p>
        </div>

        <button
          onClick={() => navigate('/projects/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-medium text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Survey Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter survey packages by zone name or district..."
            className="w-full bg-white border border-slate-200 rounded pl-8.5 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Status:</span>
          </span>
          {['ALL', 'Completed', 'Processing', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded text-xs transition-colors shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-medium shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-normal'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
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

                <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-slate-100 bg-slate-50/70 -mx-4.5 px-4.5 text-xs font-mono">
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">Area</p>
                    <p className="font-semibold text-slate-800">{project.surveyAreaSqKm} km²</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">Parcels</p>
                    <p className="font-semibold text-slate-800">{project.parcelCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">GSD</p>
                    <p className="font-semibold text-teal-800">{project.gsdCmPerPx} cm/px</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[10px] font-mono">{project.crs}</span>
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
  );
};
