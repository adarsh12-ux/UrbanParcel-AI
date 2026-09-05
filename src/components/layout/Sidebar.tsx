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
          className="fixed inset-0 bg-navy-950/50 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-navy-900 text-navy-50 border-r border-navy-800 flex flex-col transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="h-16 px-5 border-b border-navy-800 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-sm bg-forest-700 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-white tracking-tight text-[17px]">UrbanParcel</span>
                <span className="bg-forest-800 text-forest-100 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm border border-forest-700">AI</span>
              </div>
              <p className="text-[10px] text-navy-100 font-medium tracking-wide">Cadastral GIS Engine</p>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="lg:hidden text-navy-100 hover:text-white p-1 rounded-sm hover:bg-navy-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <NavLink
            to="/projects/new"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-600 text-white font-semibold px-4 py-2.5 rounded-sm text-sm group"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Mapping Project</span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy-100">
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
                className={`flex items-center gap-3 px-3 py-2.5 text-sm ${
                  isActive
                    ? 'bg-navy-800 text-white font-semibold border-l-4 border-forest-600 rounded-r-sm rounded-l-none pl-2'
                    : 'text-navy-100 hover:text-white hover:bg-navy-800/70 font-medium rounded-sm'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-forest-100' : 'text-navy-100'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* SIH Hackathon & Prototype Badge */}
        <div className="px-4 py-3 mx-3 my-2 rounded-sm bg-navy-800 border border-navy-700 text-xs text-navy-100 space-y-1">
          <div className="flex items-center justify-between font-semibold text-white">
            <span>Smart India Hackathon</span>
            <span className="bg-forest-800 text-forest-100 px-1.5 py-0.5 rounded-sm text-[10px] border border-forest-700">SIH 2024</span>
          </div>
          <p className="text-[11px] leading-tight text-navy-100">Drone Imagery AI Cadastral Mapping Prototype</p>
        </div>

        {/* User & Settings Footer */}
        <div className="p-3 border-t border-navy-800 bg-navy-950 space-y-1">
          <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-navy-100 hover:text-white hover:bg-navy-800 rounded-sm">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-navy-100" />
              <span>GIS Settings</span>
            </span>
            <span className="text-[10px] text-navy-100 font-mono">EPSG:4326</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 rounded-sm bg-navy-800 border border-navy-700">
            <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center text-white font-semibold text-xs">
              AS
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Adarsh Sharma</p>
              <p className="text-[10px] text-navy-100 truncate">GIS Specialist & SIH Lead</p>
            </div>
            <User className="w-4 h-4 text-navy-100 shrink-0" />
          </div>
        </div>
      </aside>
    </>
  );
};
