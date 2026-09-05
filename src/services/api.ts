import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, Parcel, Building, Road, ProcessingState, AnalysisMetrics, ProjectStatus } from '../types';
import { SAMPLE_PARCELS } from '../data/parcels';
import { SAMPLE_BUILDINGS } from '../data/buildings';
import { SAMPLE_ROADS } from '../data/roads';
import { SAMPLE_ANALYSIS } from '../data/analysis';

/**
 * Maps Supabase DB row (snake_case) to TypeScript Project interface (camelCase)
 */
function mapDbProject(row: any): Project {
  return {
    id: String(row.id),
    name: row.name || 'Untitled Survey Project',
    location: row.location || 'Unknown Location',
    surveyAreaSqKm: row.survey_area_sq_km !== null && row.survey_area_sq_km !== undefined ? Number(row.survey_area_sq_km) : 1.0,
    crs: row.crs || 'WGS 84 / EPSG:4326',
    status: (row.status || 'Draft') as ProjectStatus,
    parcelCount: Number(row.parcel_count) || 0,
    buildingCount: Number(row.building_count) || 0,
    roadSegmentCount: Number(row.road_segment_count) || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    thumbnail: row.thumbnail || undefined,
    centerCoordinates: [
      row.center_lat !== null && row.center_lat !== undefined ? Number(row.center_lat) : 16.5062,
      row.center_lng !== null && row.center_lng !== undefined ? Number(row.center_lng) : 80.6480
    ],
    gsdCmPerPx: row.gsd_cm_per_px !== null && row.gsd_cm_per_px !== undefined ? Number(row.gsd_cm_per_px) : undefined,
    imageryFileName: row.imagery_file_name || undefined,
    imageryFileSizeMb: row.imagery_file_size_mb !== null && row.imagery_file_size_mb !== undefined ? Number(row.imagery_file_size_mb) : undefined
  };
}

// Processing states map for active sessions
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
  // Get all projects from real Supabase database
  async getProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query projects from Supabase:', error);
      throw new Error(`Database error querying survey projects: ${error.message}`);
    }

    return (data || []).map(mapDbProject);
  },

  // Get project by ID from real Supabase database
  async getProject(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Failed to query project ${id} from Supabase:`, error);
      throw new Error(`Database error querying project: ${error.message}`);
    }

    if (!data) return null;
    return mapDbProject(data);
  },

  // Create new project in real Supabase database
  async createProject(input: {
    name: string;
    location: string;
    surveyAreaSqKm: number;
    crs: string;
    centerCoordinates?: [number, number];
  }): Promise<Project> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const centerLat = input.centerCoordinates ? input.centerCoordinates[0] : 16.5062;
    const centerLng = input.centerCoordinates ? input.centerCoordinates[1] : 80.6480;

    const insertPayload = {
      name: input.name.trim(),
      location: input.location.trim(),
      survey_area_sq_km: input.surveyAreaSqKm || 1.0,
      crs: input.crs || 'WGS 84 / EPSG:4326',
      status: 'Draft',
      parcel_count: 0,
      building_count: 0,
      road_segment_count: 0,
      center_lat: centerLat,
      center_lng: centerLng,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('Failed to create project in Supabase:', error);
      throw new Error(`Database error creating project: ${error.message}`);
    }

    return mapDbProject(data);
  },

  // Delete project from real Supabase database
  async deleteProject(id: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Failed to delete project ${id} from Supabase:`, error);
      throw new Error(`Database error deleting project: ${error.message}`);
    }
  },

  // Upload drone imagery metadata to real Supabase database
  async uploadImagery(projectId: string, fileName: string, fileSizeMb: number): Promise<Project> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        imagery_file_name: fileName,
        imagery_file_size_mb: fileSizeMb,
        gsd_cm_per_px: 3.2,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update imagery metadata for project ${projectId}:`, error);
      throw new Error(`Database error updating project imagery: ${error.message}`);
    }

    return mapDbProject(data);
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
  async completeProcessing(projectId: string): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('projects')
          .update({
            status: 'Completed',
            parcel_count: 247,
            building_count: 381,
            road_segment_count: 42,
            updated_at: new Date().toISOString()
          })
          .eq('id', projectId);

        if (error) {
          console.error(`Failed to update project status in Supabase:`, error);
        }
      } catch (err) {
        console.error(`Failed to update project status in database:`, err);
      }
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
