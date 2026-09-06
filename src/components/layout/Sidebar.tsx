import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Download,
  PlusCircle,
  X,
  Map,
  Compass,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeProjectId }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      section: 'OVERVIEW',
      requiresProject: false
    },
    {
      name: 'Survey Projects',
      path: '/projects',
      icon: Layers,
      section: 'OVERVIEW',
      requiresProject: false
    },
    {
      name: 'Interactive GIS Map',
      path: activeProjectId
        ? `/projects/${activeProjectId}/map`
        : '/projects',
      icon: Map,
      section: 'SPATIAL WORKSPACE',
      requiresProject: true
    },
    {
      name: 'AI Feature Analytics',
      path: activeProjectId ? `/projects/${activeProjectId}/analysis` : '/projects',
      icon: BarChart3,
      section: 'SPATIAL WORKSPACE',
      requiresProject: true
    },
    {
      name: 'Cadastral Export & Reports',
      path: activeProjectId ? `/projects/${activeProjectId}/export` : '/projects',
      icon: Download,
      section: 'OUTPUT',
      requiresProject: true
    }
  ];

  const handleNavigation = (event: React.MouseEvent<HTMLAnchorElement>, item: typeof navItems[number]) => {
    if (item.requiresProject && !activeProjectId) {
      event.preventDefault();
      const message = item.name === 'Interactive GIS Map'
        ? 'Please select a survey project to open the GIS map.'
        : `Please select a survey project to open the ${item.name.toLowerCase()}.`;
      navigate('/projects', {
        state: { message }
      });
    }
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="h-14 px-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-teal-700 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold text-white tracking-tight text-[15px]">UrbanParcel</span>
                <span className="bg-slate-800 text-teal-300 text-[9px] font-mono font-semibold px-1 py-0.2 rounded border border-slate-700">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-normal leading-none">Cadastral Land Information</p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3 pb-2">
          <NavLink
            to="/projects/new"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-600 text-white font-medium px-3 py-2 rounded text-xs transition-colors shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Survey Project</span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Cadastral Operations
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.name === 'Dashboard'
              ? location.pathname === '/dashboard'
              : item.name === 'Survey Projects'
                ? location.pathname === '/projects' || location.pathname === '/projects/new'
                : item.name === 'Interactive GIS Map'
                  ? location.pathname.includes('/map')
                  : item.name === 'AI Feature Analytics'
                    ? location.pathname.includes('/analysis')
                    : location.pathname.includes('/export');

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={(event) => handleNavigation(event, item)}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors rounded ${
                  isActive
                    ? 'bg-slate-800/90 text-white font-semibold border-l-2 border-teal-500 rounded-l-none pl-2'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50 font-normal'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* SIH Hackathon & Prototype Notice */}
        <div className="px-3 py-2 mx-2.5 mb-2 rounded bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-0.5">
          <div className="flex items-center justify-between font-medium text-slate-200 text-[11px]">
            <span>Smart India Hackathon</span>
            <span className="bg-teal-950 text-teal-300 px-1 py-0.2 rounded text-[9px] font-mono border border-teal-800/50">SIH-2026</span>
          </div>
          <p className="text-[10px] leading-tight text-slate-400">Drone AI Cadastral Mapping System</p>
        </div>

        {/* Authenticated Government Employee Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 space-y-1.5">
          <div className="flex items-center justify-between px-2 py-0.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px]">AUTH SESSION</span>
            </span>
            <span className="font-mono text-[9px] text-teal-400">{user?.id || 'AUTHENTICATED'}</span>
          </div>

          <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded bg-teal-900 border border-teal-700 flex items-center justify-center text-teal-200 font-semibold text-[10px] shrink-0">
                {user?.avatarInitials || 'GO'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-medium text-slate-200 truncate">{user?.name || 'Cadastral Officer'}</p>
                <p className="text-[9px] text-slate-400 truncate">{user?.designation || 'Survey Specialist'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out / End Session"
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
