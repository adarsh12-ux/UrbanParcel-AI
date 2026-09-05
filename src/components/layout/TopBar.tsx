import React, { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, Check, Layers, AlertCircle, User, LogOut, ShieldCheck } from 'lucide-react';
import { Project } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toUpperCase();
    if (query.startsWith('UP-') || query.startsWith('P-') || query.startsWith('SY')) {
      if (activeProject) {
        navigate(`/projects/${activeProject.id}/map?search=${encodeURIComponent(query)}`);
      } else {
        navigate(`/projects/proj-001/map?search=${encodeURIComponent(query)}`);
      }
    } else {
      const match = projects.find(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.location.toLowerCase().includes(query.toLowerCase()));
      if (match) {
        onSelectProject(match);
        navigate(`/projects/${match.id}/map`);
      }
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden text-slate-500 hover:text-slate-900 p-1.5 rounded hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Active Project Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-teal-700" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeProject?.name || 'Select Project'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded shadow-md z-50 py-1 overflow-hidden">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                Active Cadastral Survey Project
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
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <p className="truncate font-medium">{proj.name}</p>
                      <p className="text-[10px] text-slate-400">{proj.location}</p>
                    </div>
                    {activeProject?.id === proj.id && <Check className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Parcel ID (e.g. UP-1001), Survey No, or Project..."
            className="w-full bg-slate-50 border border-slate-200 rounded pl-8.5 pr-4 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 font-mono transition-colors"
          />
        </div>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Spatial CRS Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>EPSG:4326</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserMenuOpen(false);
            }}
            className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-600 ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-slate-200 rounded shadow-lg z-50 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold text-slate-900">Cadastral System Alerts</span>
                <span className="text-[10px] bg-teal-50 text-teal-800 px-1.5 py-0.5 rounded font-mono font-medium border border-teal-100">2 Active</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>AI Parcel Extraction Complete</span>
                  </div>
                  <p className="text-[11px] text-slate-500">247 parcel boundaries vectorized for Urban Zone A.</p>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Setback Review Required</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Parcel UP-1015 flagged for road setback verification.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Session Profile Menu */}
        <div className="relative border-l border-slate-200 pl-2 sm:pl-3">
          <button
            onClick={() => {
              setUserMenuOpen(!userMenuOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1 rounded hover:bg-slate-100 text-left transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded bg-teal-800 text-teal-100 font-bold text-xs flex items-center justify-center border border-teal-900 shadow-xs">
              {user?.avatarInitials || 'GO'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[120px]">{user?.name || 'Cadastral Officer'}</p>
              <p className="text-[10px] font-mono text-slate-500 leading-none mt-0.5">{user?.id || 'AUTHENTICATED'}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 w-72 bg-white border border-slate-200 rounded shadow-lg z-50 py-2 space-y-2 text-xs">
              <div className="px-3 pb-2 border-b border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">{user?.name || 'Cadastral Officer'}</span>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded">
                    ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{user?.designation || 'Survey Specialist'}</p>
                <p className="text-[10px] text-slate-500">{user?.department || 'Department of Land Records & Survey'}</p>
                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                  <ShieldCheck className="w-3 h-3 text-teal-700" />
                  <span>ID: {user?.id || 'AUTHORIZED'}</span>
                </div>
              </div>

              <div className="px-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-700 hover:bg-rose-50 rounded font-medium text-xs transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sign Out / End Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
