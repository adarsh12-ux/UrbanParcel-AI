import { Project, Parcel, Building, Road, ProcessingState, AnalysisMetrics } from '../types';
import { SAMPLE_PROJECTS } from '../data/projects';
import { SAMPLE_PARCELS } from '../data/parcels';
import { SAMPLE_BUILDINGS } from '../data/buildings';
import { SAMPLE_ROADS } from '../data/roads';
import { SAMPLE_ANALYSIS } from '../data/analysis';

// In-memory / persistent mock store
const PROJECTS_KEY = 'urbanparcel_projects';

function getStoredProjects(): Project[] {
  const saved = localStorage.getItem(PROJECTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Fallback
    }
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(SAMPLE_PROJECTS));
  return SAMPLE_PROJECTS;
}

function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// Processing states map
const processingStates = new Map<string, ProcessingState>();

const DEFAULT_PIPELINE_STEPS = [
  { id: 1, name: 'Image Preprocessing', description: 'Radiometric calibration & cloud masking', status: 'pending' as const },
  { id: 2, name: 'Orthomosaic Preparation', description: 'GSD calculation & GeoTIFF alignment', status: 'pending' as const },
  { id: 3, name: 'Image Segmentation', description: 'U-Net feature extraction neural network', status: 'pending' as const },
  { id: 4, name: 'Parcel Boundary Detection', description: 'Polygon edge vectorization & topological validation', status: 'pending' as const },
  { id: 5, name: 'Building Footprint Extraction', description: 'Roofline segmentation & structural classifier', status: 'pending' as const },
  { id: 6, name: 'Road Network Extraction', description: 'Centerline tracing & width estimation', status: 'pending' as const },
  { id: 7, name: 'Cadastral Feature Generation', description: 'Survey number mapping & land use tagging', status: 'pending' as const },
  { id: 8, name: 'GIS Layer Generation', description: 'Exporting GeoJSON vector layers & index', status: 'pending' as const }
];

export const api = {
  // Get all projects
  async getProjects(): Promise<Project[]> {
    await new Promise(r => setTimeout(r, 200));
    return getStoredProjects();
  },

  // Get project by ID
  async getProject(id: string): Promise<Project | null> {
    await new Promise(r => setTimeout(r, 150));
    const projects = getStoredProjects();
    return projects.find(p => p.id === id) || projects[0] || null;
  },

  // Create new project
  async createProject(input: { name: string; location: string; surveyAreaSqKm: number; crs: string; centerCoordinates?: [number, number] }): Promise<Project> {
    await new Promise(r => setTimeout(r, 300));
    const projects = getStoredProjects();
    const newProject: Project = {
      id: `proj-${Date.now().toString().slice(-4)}`,
      name: input.name,
      location: input.location,
      surveyAreaSqKm: input.surveyAreaSqKm,
      crs: input.crs || 'WGS 84 / EPSG:4326',
      status: 'Draft',
      parcelCount: 0,
      buildingCount: 0,
      roadSegmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      centerCoordinates: input.centerCoordinates || [16.5062, 80.6480]
    };
    projects.unshift(newProject);
    saveProjects(projects);
    return newProject;
  },

  // Upload drone imagery metadata
  async uploadImagery(projectId: string, fileName: string, fileSizeMb: number): Promise<Project> {
    await new Promise(r => setTimeout(r, 400));
    const projects = getStoredProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        imageryFileName: fileName,
        imageryFileSizeMb: fileSizeMb,
        gsdCmPerPx: 3.2,
        updatedAt: new Date().toISOString()
      };
      saveProjects(projects);
      return projects[idx];
    }
    throw new Error('Project not found');
  },

  // Start processing simulation
  startProcessing(projectId: string): ProcessingState {
    const initialState: ProcessingState = {
      projectId,
      currentStep: 1,
      progress: 5,
      status: 'running',
      steps: DEFAULT_PIPELINE_STEPS.map((step, idx) => ({
        ...step,
        status: idx === 0 ? 'processing' : 'pending'
      })),
      logs: [
        `[${new Date().toLocaleTimeString()}] Initializing PyTorch AI Pipeline engine...`,
        `[${new Date().toLocaleTimeString()}] Loaded GeoTIFF orthomosaic image`,
        `[${new Date().toLocaleTimeString()}] CRS Verified: EPSG:4326 WGS 84`
      ],
      startTime: new Date().toISOString(),
      estimatedTimeRemaining: '45 seconds'
    };
    processingStates.set(projectId, initialState);
    return initialState;
  },

  // Get current processing status
  getProcessingStatus(projectId: string): ProcessingState {
    let state = processingStates.get(projectId);
    if (!state) {
      state = this.startProcessing(projectId);
    }
    return state;
  },

  // Complete processing simulation update
  completeProcessing(projectId: string): void {
    const projects = getStoredProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        status: 'Completed',
        parcelCount: 247,
        buildingCount: 381,
        roadSegmentCount: 42,
        updatedAt: new Date().toISOString()
      };
      saveProjects(projects);
    }
  },

  // Get Parcels for GIS map
  async getParcels(_projectId: string): Promise<Parcel[]> {
    await new Promise(r => setTimeout(r, 100));
    return SAMPLE_PARCELS;
  },

  // Get single Parcel by ID
  async getParcel(_projectId: string, parcelId: string): Promise<Parcel | null> {
    await new Promise(r => setTimeout(r, 100));
    return SAMPLE_PARCELS.find(p => p.id === parcelId) || SAMPLE_PARCELS[0];
  },

  // Get Buildings
  async getBuildings(_projectId: string): Promise<Building[]> {
    await new Promise(r => setTimeout(r, 100));
    return SAMPLE_BUILDINGS;
  },

  // Get Roads
  async getRoads(_projectId: string): Promise<Road[]> {
    await new Promise(r => setTimeout(r, 100));
    return SAMPLE_ROADS;
  },

  // Get Analysis Metrics
  async getAnalysis(_projectId: string): Promise<AnalysisMetrics> {
    await new Promise(r => setTimeout(r, 200));
    return SAMPLE_ANALYSIS;
  }
};
