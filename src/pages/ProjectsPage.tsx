import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, MapPin, PlusCircle, Search, ArrowRight, Filter } from 'lucide-react';
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
            <Layers className="w-6 h-6 text-navy-700" />
            <span>Cadastral Mapping Projects</span>
          </h1>
          <p className="text-xs text-muted mt-1">Manage municipal drone surveys, boundary detection runs, and GIS exports.</p>
        </div>

        <button
          onClick={() => navigate('/projects/new')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-forest-700 hover:bg-forest-600 text-white font-semibold text-sm shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter projects by name or location..."
            className="w-full bg-white border border-line rounded-sm pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-muted shrink-0" />
          {['ALL', 'Completed', 'Processing', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium shrink-0 ${
                statusFilter === st
                  ? 'bg-navy-900 text-white border border-navy-900 font-semibold'
                  : 'bg-white text-ink border border-line hover:bg-navy-50'
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
            <div key={i} className="h-44 rounded-sm bg-white border border-line" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/map`)}
              className="bg-white border border-line rounded-sm p-5 hover:border-navy-600 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-ink hover:text-navy-800">
                    {project.name}
                  </h3>
                  <StatusBadge status={project.status} size="sm" />
                </div>

                <p className="text-xs text-muted flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span>{project.location}</span>
                </p>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line text-xs font-mono">
                  <div>
                    <p className="text-[10px] text-muted font-sans">Area</p>
                    <p className="font-semibold text-ink">{project.surveyAreaSqKm} km²</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted font-sans">Parcels</p>
                    <p className="font-semibold text-ink">{project.parcelCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted font-sans">Features</p>
                    <p className="font-semibold text-ink">{project.buildingCount + project.roadSegmentCount}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs">
                <span className="text-muted text-[11px] font-mono">{project.crs}</span>
                <span className="text-navy-700 font-semibold inline-flex items-center gap-1">
                  <span>Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
