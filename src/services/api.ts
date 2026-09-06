import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, Parcel, Building, Road, ProcessingJob, AnalysisMetrics, ProjectStatus } from '../types';

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
    imageryFileSizeMb: row.imagery_file_size_mb !== null && row.imagery_file_size_mb !== undefined ? Number(row.imagery_file_size_mb) : undefined,
    imageryPath: row.imagery_path || undefined,
    imageryMimeType: row.imagery_mime_type || undefined,
    imageryChecksum: row.imagery_checksum || undefined
  };
}

function parseGeometry(value: unknown): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return null;
}

function mapParcel(row: any): Parcel {
  const attributes = row.attributes || {};
  const geometry = parseGeometry(row.geometry);
  return {
    id: row.parcel_identifier || String(row.id),
    projectId: row.project_id,
    surveyNo: row.survey_number || attributes.survey_number || '',
    areaSqM: Number(row.area_sqm || attributes.area_sqm || 0),
    perimeterM: Number(row.perimeter_m || attributes.perimeter_m || 0),
    buildingCount: Number(attributes.building_count || 0),
    landUse: attributes.land_use || row.land_use || 'Vacant',
    roadAccess: attributes.road_access || 'None',
    confidence: Number(row.confidence || 0),
    center: attributes.center || [0, 0],
    geometry,
    ownerName: attributes.owner_name || '',
    status: row.review_status === 'verified' ? 'Verified' : row.review_status === 'rejected' ? 'Flagged' : 'Pending Review',
    source: row.source,
    reviewStatus: row.review_status,
    notes: attributes.notes
  };
}

function mapBuilding(row: any): Building {
  const attributes = row.attributes || {};
  return {
    id: String(row.id),
    parcelId: row.parcel_id || '',
    type: attributes.type || 'Building',
    areaSqM: Number(attributes.area_sqm || 0),
    floors: Number(attributes.floors || 0),
    confidence: Number(attributes.confidence || 0),
    geometry: parseGeometry(row.geometry)
  };
}

function mapRoad(row: any): Road {
  const attributes = row.attributes || {};
  return {
    id: String(row.id),
    name: attributes.name || 'Unnamed road',
    widthM: Number(attributes.width_m || 0),
    surfaceType: attributes.surface_type || 'Unpaved',
    confidence: Number(attributes.confidence || 0),
    geometry: parseGeometry(row.geometry)
  };
}

function mapProcessingJob(row: any): ProcessingJob {
  return {
    id: row.id,
    projectId: row.project_id,
    imageryId: row.imagery_id,
    status: row.status,
    progress: Number(row.progress || 0),
    currentStep: row.current_step || undefined,
    steps: row.steps || [],
    logs: row.logs || [],
    errorMessage: row.error_message || undefined,
    workerJobId: row.worker_job_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at || undefined
  };
}

function mapAnalysis(row: any): AnalysisMetrics {
  return {
    precision: Number(row.precision),
    recall: Number(row.recall),
    f1Score: Number(row.f1_score),
    meanIoU: Number(row.mean_iou),
    totalParcelsDetected: Number(row.total_parcels_detected),
    totalBuildingsDetected: Number(row.total_buildings_detected),
    totalRoadSegments: Number(row.total_road_segments),
    totalWaterBodies: Number(row.total_water_bodies),
    landUseBreakdown: row.land_use_breakdown || [],
    confidenceDistribution: row.confidence_distribution || [],
    precisionRecallCurve: row.precision_recall_curve || [],
    groundTruthComparisons: row.ground_truth_comparisons || []
  };
}

function withTimeout<T>(promise: PromiseLike<T>, message: string, timeoutMs = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export const DEFAULT_PIPELINE_STEPS = [
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
      console.warn('Supabase not configured; returning empty project list.');
      return [];
    }

    const { data, error } = await withTimeout(
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      'Timed out loading survey projects. Please try again.'
    );

    if (error) {
      console.error('Failed to query projects from Supabase:', error);
      throw new Error(`Database error querying survey projects: ${error.message}`);
    }

    return (data || []).map(mapDbProject);
  },

  // Get project by ID from real Supabase database
  async getProject(id: string): Promise<Project | null> {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('Supabase not configured; getProject returning null.');
      return null;
    }

    const { data, error } = await withTimeout(
      supabase.from('projects').select('*').eq('id', id).maybeSingle(),
      'Timed out loading the survey project. Please try again.'
    );

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

    const baseInsertPayload = {
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

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('You must be authenticated to create a survey project.');
    }

    const insertWithOwner = { ...baseInsertPayload, created_by: authData.user.id };
    let { data, error } = await supabase
      .from('projects')
      .insert([insertWithOwner])
      .select()
      .single();

    // Older deployed schemas do not have created_by yet. Retry only for that
    // specific schema-cache error, using the exact legacy projects columns.
    if (error && /created_by.*schema cache|column.*created_by.*does not exist/i.test(error.message)) {
      console.warn('The deployed projects table has no created_by column. Apply the project ownership migration to persist ownership.');
      ({ data, error } = await supabase
        .from('projects')
        .insert([baseInsertPayload])
        .select()
        .single());
    }

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

  // Upload the original raster to private Supabase Storage and persist its metadata.
  async uploadImagery(projectId: string, file: File, metadata: {
    crs: string;
    width: number;
    height: number;
    bounds?: unknown;
    checksum?: string;
  }): Promise<{ project: Project; imageryId: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const path = `projects/${projectId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from('orthomosaics')
      .upload(path, file, { contentType: file.type || 'image/tiff', upsert: false });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: imagery, error: imageryError } = await supabase
      .from('project_imagery')
      .insert({
        project_id: projectId,
        storage_path: path,
        original_file_name: file.name,
        mime_type: file.type || 'image/tiff',
        size_bytes: file.size,
        checksum: metadata.checksum,
        crs: metadata.crs,
        width: metadata.width,
        height: metadata.height,
        metadata: { bounds: metadata.bounds },
        validation_status: 'valid',
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select('id')
      .single();

    if (imageryError || !imagery) {
      await supabase.storage.from('orthomosaics').remove([path]);
      throw new Error(`Database error saving imagery metadata: ${imageryError?.message || 'No imagery record returned.'}`);
    }

    const { data, error } = await supabase
      .from('projects')
      .update({
        imagery_file_name: file.name,
        imagery_file_size_mb: Number((file.size / (1024 * 1024)).toFixed(2)),
        imagery_path: path,
        imagery_mime_type: file.type || 'image/tiff',
        imagery_checksum: metadata.checksum,
        status: 'Uploaded',
        imagery_status: 'valid',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error(`Failed to update imagery metadata for project ${projectId}:`, error);
      throw new Error(`Database error updating project imagery: ${error.message}`);
    }

    return { project: mapDbProject(data), imageryId: imagery.id };
  },

  async createProcessingJob(projectId: string, imageryId: string): Promise<ProcessingJob> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('processing_jobs').insert({
      project_id: projectId,
      imagery_id: imageryId,
      status: 'uploaded',
      steps: DEFAULT_PIPELINE_STEPS,
      logs: [],
      created_by: (await supabase.auth.getUser()).data.user?.id
    }).select().single();
    if (error || !data) throw new Error(`Could not create processing job: ${error?.message || 'No job returned.'}`);
    return mapProcessingJob(data);
  },

  async triggerProcessing(job: ProcessingJob): Promise<{ available: boolean }> {
    const serviceUrl = import.meta.env.VITE_PROCESSING_SERVICE_URL;
    if (!serviceUrl) return { available: false };
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: job.id, project_id: job.projectId, imagery_id: job.imageryId, output_srid: 4326 })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = body?.error?.message || `Processing service returned HTTP ${response.status}.`;
      await supabase?.from('processing_jobs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', job.id);
      throw new Error(message);
    }
    return { available: true };
  },

  async getProcessingJob(projectId: string): Promise<ProcessingJob | null> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('processing_jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Could not load processing status: ${error.message}`);
    return data ? mapProcessingJob(data) : null;
  },

  async retryProcessing(jobId: string): Promise<ProcessingJob> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('processing_jobs').update({ status: 'uploaded', progress: 0, error_message: null, updated_at: new Date().toISOString() }).eq('id', jobId).select().single();
    if (error || !data) throw new Error(`Could not retry processing: ${error?.message || 'No job returned.'}`);
    return mapProcessingJob(data);
  },

  async getImageryUrl(projectId: string): Promise<string | null> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data: project, error } = await supabase.from('projects').select('imagery_path').eq('id', projectId).single();
    if (error) throw new Error(`Could not load imagery metadata: ${error.message}`);
    if (!project?.imagery_path) return null;
    const { data, error: urlError } = await supabase.storage.from('orthomosaics').createSignedUrl(project.imagery_path, 3600);
    if (urlError) throw new Error(`Could not create imagery URL: ${urlError.message}`);
    return data.signedUrl;
  },

  async getImagery(projectId: string): Promise<{ url: string; bounds?: [[number, number], [number, number]] } | null> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data: imagery, error } = await supabase
      .from('project_imagery')
      .select('storage_path, metadata, crs')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Could not load imagery metadata: ${error.message}`);
    if (!imagery?.storage_path) return null;
    const { data, error: urlError } = await supabase.storage.from('orthomosaics').createSignedUrl(imagery.storage_path, 3600);
    if (urlError) throw new Error(`Could not create imagery URL: ${urlError.message}`);
    const rawBounds = imagery.metadata?.bounds;
    const bounds = Array.isArray(rawBounds) && rawBounds.length === 4
      ? [[Number(rawBounds[1]), Number(rawBounds[0])], [Number(rawBounds[3]), Number(rawBounds[2])]] as [[number, number], [number, number]]
      : undefined;
    return { url: data.signedUrl, bounds };
  },

  async getParcels(projectId: string): Promise<Parcel[]> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('parcels').select('*').eq('project_id', projectId).order('parcel_identifier');
    if (error) throw new Error(`Could not load project parcels: ${error.message}`);
    return (data || []).map(mapParcel).filter(parcel => parcel.geometry);
  },

  async getParcel(projectId: string, parcelId: string): Promise<Parcel | null> {
    const parcels = await this.getParcels(projectId);
    return parcels.find(parcel => parcel.id === parcelId) || null;
  },

  async getBuildings(projectId: string): Promise<Building[]> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('buildings').select('*').eq('project_id', projectId);
    if (error) throw new Error(`Could not load project buildings: ${error.message}`);
    return (data || []).map(mapBuilding).filter(building => building.geometry);
  },

  async getRoads(projectId: string): Promise<Road[]> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('roads').select('*').eq('project_id', projectId);
    if (error) throw new Error(`Could not load project roads: ${error.message}`);
    return (data || []).map(mapRoad).filter(road => road.geometry);
  },

  async saveParcelGeometry(parcelId: string, geometry: unknown, action: 'edit_vertices' | 'draw' | 'split' | 'merge' | 'delete' | 'restore' = 'edit_vertices'): Promise<Parcel> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.rpc('save_parcel_geometry', {
      p_parcel_id: parcelId,
      p_geometry: geometry,
      p_action: action
    });
    if (error || !data) throw new Error(`Could not save parcel geometry: ${error?.message || 'No parcel returned.'}`);
    return mapParcel(data);
  },

  async updateParcelReviewStatus(parcelId: string, reviewStatus: 'needs_review' | 'verified' | 'rejected'): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('parcels').update({ review_status: reviewStatus, source: reviewStatus === 'verified' ? 'verified' : 'manual_edit', updated_at: new Date().toISOString() }).eq('id', parcelId);
    if (error) throw new Error(`Could not update parcel review status: ${error.message}`);
  },

  async getParcelEditHistory(parcelId: string): Promise<Array<{ id: string; geometry: unknown; action: string; createdAt: string }>> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('parcel_edit_history').select('id, previous_geometry, action, created_at').eq('parcel_id', parcelId).order('created_at', { ascending: false });
    if (error) throw new Error(`Could not load parcel edit history: ${error.message}`);
    return (data || []).map(row => ({ id: row.id, geometry: parseGeometry(row.previous_geometry), action: row.action, createdAt: row.created_at }));
  },

  async getAnalysis(projectId: string): Promise<AnalysisMetrics> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) throw new Error(`Could not load analysis results: ${error.message}`);
    if (!data) throw new Error('Analysis results are not available until the processing worker writes them.');
    return mapAnalysis(data);
  }
};
