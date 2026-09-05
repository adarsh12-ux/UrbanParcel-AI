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
    <header className="h-16 bg-white border-b border-line px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_0_rgba(12,35,64,0.04)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-muted hover:text-ink p-2 rounded-sm hover:bg-navy-50"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white border border-line hover:border-navy-600 text-xs font-medium text-ink"
          >
            <Layers className="w-3.5 h-3.5 text-navy-700" />
            <span className="max-w-[150px] sm:max-w-[220px] truncate">{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-line rounded-sm shadow-lg z-50 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-line text-[10px] font-semibold text-muted uppercase tracking-wider bg-navy-50">
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
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs ${
                      activeProject?.id === proj.id
                        ? 'bg-navy-50 text-navy-900 font-semibold'
                        : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    <div>
                      <p className="truncate font-medium">{proj.name}</p>
                      <p className="text-[10px] text-muted">{proj.location}</p>
                    </div>
                    {activeProject?.id === proj.id && <Check className="w-3.5 h-3.5 text-navy-700 shrink-0" />}
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
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Parcel ID (e.g. UP-1042) or Project..."
            className="w-full bg-white border border-line rounded-sm pl-9 pr-4 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600 font-mono"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Prototype Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-navy-50 border border-navy-100 text-[11px] text-navy-800 font-medium">
          <span className="w-2 h-2 rounded-full bg-forest-700"></span>
          Prototype Demo Mode
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 rounded-sm text-muted hover:text-ink hover:bg-navy-50 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-forest-700"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-line rounded-sm shadow-lg z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="text-xs font-semibold text-ink">System Notifications</span>
                <span className="text-[10px] bg-navy-50 text-navy-800 px-1.5 py-0.5 rounded-sm font-medium border border-navy-100">2 New</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded-sm bg-canvas border border-line space-y-1">
                  <div className="flex items-center gap-1.5 text-navy-900 font-semibold">
                    <Check className="w-3.5 h-3.5 text-forest-700" />
                    <span>AI Segmentation Complete</span>
                  </div>
                  <p className="text-[11px] text-muted">247 parcel boundaries extracted for Urban Zone A.</p>
                </div>
                <div className="p-2 rounded-sm bg-canvas border border-line space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Boundary Dispute Flag</span>
                  </div>
                  <p className="text-[11px] text-muted">Parcel UP-1015 flagged for potential setback overlap.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
