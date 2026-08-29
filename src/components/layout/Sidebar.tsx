import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Download,
  Settings,
  User,
  PlusCircle,
  MapPin,
  X,
  Map
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeProjectId = 'proj-001' }) => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: Layers
    },
    {
      name: 'Interactive Map',
      path: `/projects/${activeProjectId}/map`,
      icon: Map
    },
    {
      name: 'AI Analysis',
      path: `/projects/${activeProjectId}/analysis`,
      icon: BarChart3
    },
    {
      name: 'Export & Reports',
      path: `/projects/${activeProjectId}/export`,
      icon: Download
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-950 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-950/50">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-100 tracking-tight text-base">UrbanParcel</span>
                <span className="bg-cyan-500/20 text-cyan-400 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-cyan-500/30">AI</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide">Cadastral GIS Engine</p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <NavLink
            to="/projects/new"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-all shadow-md shadow-cyan-950/40 border border-cyan-400/20 group"
          >
            <PlusCircle className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>New Mapping Project</span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Main Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path ||
              (item.path.includes('/map') && location.pathname.includes('/map')) ||
              (item.path.includes('/analysis') && location.pathname.includes('/analysis')) ||
              (item.path.includes('/export') && location.pathname.includes('/export'));

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-slate-800/90 text-cyan-400 border border-cyan-500/30 shadow-xs shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* SIH Hackathon & Prototype Badge */}
        <div className="px-4 py-3 mx-3 my-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Smart India Hackathon</span>
            <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] border border-emerald-800/50">SIH 2024</span>
          </div>
          <p className="text-[11px] leading-tight text-slate-400">Drone Imagery AI Cadastral Mapping Prototype</p>
        </div>

        {/* User & Settings Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-1">
          <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition-colors">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>GIS Settings</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">EPSG:4326</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400 font-semibold text-xs">
              AS
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">Adarsh Sharma</p>
              <p className="text-[10px] text-slate-400 truncate">GIS Specialist & SIH Lead</p>
            </div>
            <User className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};
