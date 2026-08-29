import React, { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, Check, Layers, AlertCircle } from 'lucide-react';
import { Project } from '../../types';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  onToggleSidebar: () => void;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  projects,
  activeProject,
  onSelectProject
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // If query starts with UP- or parcel number, search parcel
    const query = searchQuery.trim().toUpperCase();
    if (query.startsWith('UP-') || query.startsWith('P-') || query.startsWith('SY')) {
      if (activeProject) {
        navigate(`/projects/${activeProject.id}/map?search=${encodeURIComponent(query)}`);
      } else {
        navigate(`/projects/proj-001/map?search=${encodeURIComponent(query)}`);
      }
    } else {
      // Search project by name/location
      const match = projects.find(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.location.toLowerCase().includes(query.toLowerCase()));
      if (match) {
        onSelectProject(match);
        navigate(`/projects/${match.id}/map`);
      }
    }
  };

  return (
    <header className="h-16 bg-slate-950/90 border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-900 transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[150px] sm:max-w-[220px] truncate">{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Select Active GIS Mapping Project
              </div>
              <div className="max-h-60 overflow-y-auto">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                      activeProject?.id === proj.id
                        ? 'bg-cyan-950/60 text-cyan-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <p className="truncate font-medium">{proj.name}</p>
                      <p className="text-[10px] text-slate-400">{proj.location}</p>
                    </div>
                    {activeProject?.id === proj.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Parcel ID (e.g. UP-1042) or Project..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition-all font-mono"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Prototype Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-[11px] text-cyan-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          Prototype Demo Mode
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-slate-200">System Notifications</span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">2 New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-slate-800/50 border border-slate-700/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>AI Segmentation Complete</span>
                  </div>
                  <p className="text-[11px] text-slate-400">247 parcel boundaries extracted for Urban Zone A.</p>
                </div>
                <div className="p-2 rounded bg-slate-800/50 border border-slate-700/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Boundary Dispute Flag</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Parcel UP-1015 flagged for potential setback overlap.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
