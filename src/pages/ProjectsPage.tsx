import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, MapPin, PlusCircle, Search, ArrowRight, Filter, Compass, AlertCircle, FolderOpen, Trash2, X } from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navigationMessage = (location.state as { message?: string } | null)?.message;

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getProjects();
        setProjects(data);
      } catch (err: any) {
        console.error('Failed to load projects:', err);
        setError(err?.message || 'Failed to load projects from cadastral registry.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteProject(projectToDelete.id);
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err?.message || 'Failed to delete project from database.');
    } finally {
      setIsDeleting(false);
    }
  };

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

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="leading-tight">{error}</span>
        </div>
      )}

      {navigationMessage && !error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="leading-tight">{navigationMessage}</span>
        </div>
      )}

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
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">No Survey Projects Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search ? 'No projects matched your search criteria.' : 'Create your first drone cadastral survey project to begin.'}
            </p>
          </div>
          <div>
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium cursor-pointer shadow-xs transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Survey Project</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/map`)}
              className="group bg-white border border-slate-200 hover:border-teal-600 rounded p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-sm cursor-pointer flex flex-col justify-between transition-all relative"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-slate-900 group-hover:text-teal-800 text-sm leading-tight transition-colors truncate">
                      {project.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{project.location}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={project.status} size="sm" />
                    <button
                      type="button"
                      title="Delete Project"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(project);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                    <p className="font-semibold text-teal-800">{project.gsdCmPerPx || 3.2} cm/px</p>
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

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-4 h-4" />
                <h3 className="font-bold text-slate-900 text-sm">Confirm Project Deletion</h3>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>Are you sure you want to delete this cadastral survey project from Supabase?</p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-900 font-medium">
                <p className="font-semibold">{projectToDelete.name}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{projectToDelete.location} • ID: {projectToDelete.id}</p>
              </div>
              <p className="text-[11px] text-rose-600 font-medium">This action is permanent and will remove the record from the database.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
