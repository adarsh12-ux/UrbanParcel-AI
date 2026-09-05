import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    async function loadProjects() {
      const data = await api.getProjects();
      setProjects(data);
      if (!activeProject && data.length > 0) {
        const defaultProj = data[0];
        setActiveProject(defaultProj);
        if (onProjectChange) onProjectChange(defaultProj);
      }
    }
    loadProjects();
  }, []);

  useEffect(() => {
    if (propActiveProject) {
      setActiveProject(propActiveProject);
    }
  }, [propActiveProject]);

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
    </div>
  );
};
