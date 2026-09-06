import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Project } from '../../types';
import { api } from '../../services/api';
import { Toast, ToastMessage } from '../common/Toast';

interface MainLayoutProps {
  children: React.ReactNode;
  activeProject?: Project | null;
  onProjectChange?: (project: Project) => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, activeProject: propActiveProject, onProjectChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(propActiveProject || null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await api.getProjects();
        setProjects(data);
        setProjectLoadError(null);
      } catch (err: any) {
        console.error('Failed to load projects for navigation:', err);
        setProjectLoadError(err?.message || 'Unable to load survey projects.');
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const routeProjectId = location.pathname.match(
      /^\/projects\/([^/]+)\/(?:map|analysis|export|upload|processing|parcel)(?:\/|$)/
    )?.[1];

    async function syncActiveProject() {
      if (routeProjectId) {
        const listedProject = projects.find(project => project.id === routeProjectId);
        const routeProject = listedProject || await api.getProject(routeProjectId);

        if (cancelled) return;
        setActiveProject(routeProject);
        if (routeProject && routeProject.id !== propActiveProject?.id) {
          onProjectChange?.(routeProject);
        }
        return;
      }

      const defaultProject = propActiveProject || projects[0] || null;
      if (cancelled) return;
      setActiveProject(defaultProject);
      if (defaultProject && defaultProject.id !== propActiveProject?.id) {
        onProjectChange?.(defaultProject);
      }
    }

    syncActiveProject().catch((err: any) => {
      if (cancelled) return;
      console.error('Failed to synchronize active project:', err);
      setActiveProject(null);
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, projects, propActiveProject, onProjectChange]);

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    if (onProjectChange) onProjectChange(project);
    setToast({
      id: Date.now().toString(),
      type: 'info',
      title: 'Active Project Changed',
      description: `Loaded project ${project.name} (${project.location})`
    });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeProjectId={activeProject?.id}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
        />

        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
      {projectLoadError && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 shadow-lg">
          {projectLoadError}
        </div>
      )}
    </div>
  );
};
