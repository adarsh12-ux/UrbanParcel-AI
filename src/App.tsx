import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { DroneUploadPage } from './pages/DroneUploadPage';
import { AIProcessingPage } from './pages/AIProcessingPage';
import { GISMapPage } from './pages/GISMapPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ExportPage } from './pages/ExportPage';
import { Project } from './types';

export const App: React.FC = () => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  return (
    <BrowserRouter>
      <MainLayout activeProject={activeProject} onProjectChange={setActiveProject}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:id/upload" element={<DroneUploadPage />} />
          <Route path="/projects/:id/processing" element={<AIProcessingPage />} />
          <Route path="/projects/:id/map" element={<GISMapPage />} />
          <Route path="/projects/:id/parcel/:parcelId" element={<ParcelDetailPage />} />
          <Route path="/projects/:id/analysis" element={<AnalysisPage />} />
          <Route path="/projects/:id/export" element={<ExportPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
