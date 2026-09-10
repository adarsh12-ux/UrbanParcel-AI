import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as turf from '@turf/turf';
import { Project, Parcel, Building, Road, ProcessingJob, AnalysisMetrics, GroundTruthComparison, ProjectStatus } from '../types';

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
    imageryChecksum: row.imagery_checksum || undefined,
    rasterCrs: row.raster_crs || undefined,
    rasterBounds: row.raster_bounds || undefined,
    surveyFootprint: row.survey_footprint || undefined,
    geographicMismatch: row.geographic_mismatch || false,
    geographicDiagnostic: row.geographic_diagnostic || undefined
  };
}

export function parseHexWkb(cleanHex: string): any {
  if (typeof cleanHex !== 'string' || cleanHex.length < 10) return null;
  const rawHex = cleanHex.trim().replace(/^\\x/i, '');
  const matches = rawHex.match(/.{1,2}/g);
  if (!matches) return null;
  const bytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  function readGeometry(): any {
    if (offset >= bytes.length) return null;
    const isLittleEndian = view.getUint8(offset) === 1;
    offset += 1;
    let type = view.getUint32(offset, isLittleEndian);
    offset += 4;
    const hasSrid = (type & 0x20000000) !== 0;
    type = type & 0x1FFFFFFF;
    if (hasSrid) {
      offset += 4; // skip 4-byte SRID
    }

    if (type === 1) { // Point
      const x = view.getFloat64(offset, isLittleEndian); offset += 8;
      const y = view.getFloat64(offset, isLittleEndian); offset += 8;
      return { type: 'Point', coordinates: [x, y] };
    } else if (type === 2) { // LineString
      const numPoints = view.getUint32(offset, isLittleEndian); offset += 4;
      const coords: [number, number][] = [];
      for (let i = 0; i < numPoints; i++) {
        const x = view.getFloat64(offset, isLittleEndian); offset += 8;
        const y = view.getFloat64(offset, isLittleEndian); offset += 8;
        coords.push([x, y]);
      }
      return { type: 'LineString', coordinates: coords };
    } else if (type === 3) { // Polygon
      const numRings = view.getUint32(offset, isLittleEndian); offset += 4;
      const rings: [number, number][][] = [];
      for (let r = 0; r < numRings; r++) {
        const numPoints = view.getUint32(offset, isLittleEndian); offset += 4;
        const ring: [number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat64(offset, isLittleEndian); offset += 8;
          const y = view.getFloat64(offset, isLittleEndian); offset += 8;
          ring.push([x, y]);
        }
        rings.push(ring);
      }
      return { type: 'Polygon', coordinates: rings };
    } else if (type === 4) { // MultiPoint
      const numGeoms = view.getUint32(offset, isLittleEndian); offset += 4;
      const coords: [number, number][] = [];
      for (let g = 0; g < numGeoms; g++) {
        const sub = readGeometry();
        if (sub && sub.coordinates) coords.push(sub.coordinates);
      }
      return { type: 'MultiPoint', coordinates: coords };
    } else if (type === 5) { // MultiLineString
      const numGeoms = view.getUint32(offset, isLittleEndian); offset += 4;
      const coords: [number, number][][] = [];
      for (let g = 0; g < numGeoms; g++) {
        const sub = readGeometry();
        if (sub && sub.coordinates) coords.push(sub.coordinates);
      }
      return { type: 'MultiLineString', coordinates: coords };
    } else if (type === 6) { // MultiPolygon
      const numGeoms = view.getUint32(offset, isLittleEndian); offset += 4;
      const coords: [number, number][][][] = [];
      for (let g = 0; g < numGeoms; g++) {
        const sub = readGeometry();
        if (sub && sub.coordinates) coords.push(sub.coordinates);
      }
      return { type: 'MultiPolygon', coordinates: coords };
    } else if (type === 7) { // GeometryCollection
      const numGeoms = view.getUint32(offset, isLittleEndian); offset += 4;
      const geoms = [];
      for (let g = 0; g < numGeoms; g++) {
        const sub = readGeometry();
        if (sub) geoms.push(sub);
      }
      return { type: 'GeometryCollection', geometries: geoms };
    }
    return null;
  }

  try {
    return readGeometry();
  } catch (err) {
    console.warn('WKB parse error:', err);
    return null;
  }
}

export function parseGeometry(value: unknown): any {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed); } catch { return null; }
    }
    const cleanHex = trimmed.replace(/^\\x/i, '');
    if (/^[0-9a-fA-F]+$/.test(cleanHex) && cleanHex.length >= 10) {
      return parseHexWkb(cleanHex);
    }
  }
  return null;
}

export function computeCentroid(geometry: any): [number, number] {
  if (!geometry) return [0, 0];
  const points: [number, number][] = [];
  function extractPoints(val: unknown) {
    if (!Array.isArray(val)) return;
    if (val.length >= 2 && typeof val[0] === 'number' && typeof val[1] === 'number') {
      const [lng, lat] = val;
      if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        points.push([lat, lng]);
      }
      return;
    }
    val.forEach(extractPoints);
  }
  extractPoints(geometry.coordinates);
  if (points.length === 0) return [0, 0];
  const sumLat = points.reduce((acc, p) => acc + p[0], 0);
  const sumLng = points.reduce((acc, p) => acc + p[1], 0);
  return [sumLat / points.length, sumLng / points.length];
}

function mapParcel(row: any): Parcel {
  const attributes = row.attributes || {};
  const geometry = parseGeometry(row.geometry);
  const storedCenter = attributes.center || row.center;
  const center = (Array.isArray(storedCenter) && storedCenter.length === 2 && (storedCenter[0] !== 0 || storedCenter[1] !== 0))
    ? [Number(storedCenter[0]), Number(storedCenter[1])] as [number, number]
    : computeCentroid(geometry);

  return {
    id: row.parcel_identifier || attributes.parcel_identifier || String(row.id),
    projectId: row.project_id,
    surveyNo: row.survey_number || attributes.survey_number || attributes.survey_no || 'Not available',
    subdivisionNo: row.subdivision_number || attributes.subdivision_number || attributes.subdivision_no || undefined,
    sourceFile: row.source_file || attributes.source_file || undefined,
    areaSqM: Number(row.area_sqm || attributes.area_sqm || 0),
    perimeterM: Number(row.perimeter_m || attributes.perimeter_m || 0),
    buildingCount: Number(attributes.building_count || 0),
    landUse: row.land_use || attributes.land_use || attributes.landuse || 'Vacant',
    roadAccess: attributes.road_access || 'None',
    confidence: Number(row.confidence || attributes.confidence || 0),
    center,
    geometry,
    ownerName: attributes.owner_name || attributes.owner || 'Not available',
    status: row.review_status === 'verified' ? 'Verified' : row.review_status === 'rejected' ? 'Flagged' : 'Pending Review',
    source: row.source || 'user_imported_cadastral',
    reviewStatus: row.review_status || 'needs_review',
    notes: attributes.notes,
    attributes
  };
}

function mapBuilding(row: any): Building {
  const attributes = row.attributes || {};
  const geometry = parseGeometry(row.geometry);

  let areaSqM = Number(attributes.area_sqm || row.area_sqm || 0);
  if ((!areaSqM || areaSqM <= 0 || areaSqM > 75000) && geometry && geometry.coordinates) {
    try {
      if (geometry.type === 'Polygon') {
        areaSqM = Math.round(turf.area(turf.polygon(geometry.coordinates as any)) * 10) / 10;
      } else if (geometry.type === 'MultiPolygon') {
        areaSqM = Math.round(turf.area(turf.multiPolygon(geometry.coordinates as any)) * 10) / 10;
      }
    } catch {
      areaSqM = 0;
    }
  }

  const confidence = Number(attributes.confidence ?? row.confidence ?? 0);
  const floors = (attributes.floors !== undefined && attributes.floors !== null && attributes.floors !== 'Unknown' && !isNaN(Number(attributes.floors)))
    ? Number(attributes.floors)
    : 'Unknown';

  const reviewStatus = attributes.review_status || row.review_status || (confidence >= 0.5 ? 'Pending' : 'Needs Review');
  const buildingId = attributes.id || attributes.building_id || (String(row.id).length > 8 ? `B-${String(row.id).slice(0, 8)}` : String(row.id));

  return {
    id: buildingId,
    parcelId: row.parcel_id || '',
    type: attributes.type || attributes.feature_type || 'Building',
    areaSqM,
    floors,
    confidence,
    source: row.source || attributes.source || 'ai_extracted',
    reviewStatus,
    geometry,
    attributes
  };
}

function mapRoad(row: any): Road {
  const attributes = row.attributes || {};
  const geometry = parseGeometry(row.geometry);
  return {
    id: String(row.id),
    name: attributes.name || 'Unnamed road',
    widthM: Number(attributes.width_m || attributes.width || 0),
    surfaceType: attributes.surface_type || 'Unpaved',
    confidence: Number(attributes.confidence || row.confidence || 0),
    source: row.source || attributes.source || 'ai_extracted',
    geometry,
    attributes
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
    completedAt: row.completed_at || undefined,
    resultGeojson: row.result_geojson || undefined,
    modelName: row.model_name || undefined,
    resultCrs: row.result_crs || undefined,
    rasterCrs: row.raster_crs || undefined,
    rasterBounds: row.raster_bounds || undefined,
    surveyFootprint: row.survey_footprint || undefined,
    geographicMismatch: row.geographic_mismatch || false,
    geographicDiagnostic: row.geographic_diagnostic || undefined
  };
}

function mapAnalysis(row: any): AnalysisMetrics {
  return {
    precision: row.precision !== null && row.precision !== undefined ? Number(row.precision) : null,
    recall: row.recall !== null && row.recall !== undefined ? Number(row.recall) : null,
    f1Score: row.f1_score !== null && row.f1_score !== undefined ? Number(row.f1_score) : null,
    meanIoU: row.mean_iou !== null && row.mean_iou !== undefined ? Number(row.mean_iou) : null,
    hasGroundTruth: row.has_ground_truth ?? (row.precision !== null && row.precision !== undefined && Number(row.precision) > 0),
    totalParcelsDetected: Number(row.total_parcels_detected || 0),
    totalBuildingsDetected: Number(row.total_buildings_detected || 0),
    totalRoadSegments: Number(row.total_road_segments || 0),
    totalWaterBodies: Number(row.total_water_bodies || 0),
    totalBuildingAreaSqM: row.total_building_area_sqm !== undefined ? Number(row.total_building_area_sqm) : undefined,
    avgBuildingAreaSqM: row.avg_building_area_sqm !== undefined ? Number(row.avg_building_area_sqm) : undefined,
    totalRoadLengthM: row.total_road_length_m !== undefined ? Number(row.total_road_length_m) : undefined,
    avgRoadLengthM: row.avg_road_length_m !== undefined ? Number(row.avg_road_length_m) : undefined,
    verifiedBuildingsCount: row.verified_buildings_count !== undefined ? Number(row.verified_buildings_count) : undefined,
    pendingBuildingsCount: row.pending_buildings_count !== undefined ? Number(row.pending_buildings_count) : undefined,
    rejectedBuildingsCount: row.rejected_buildings_count !== undefined ? Number(row.rejected_buildings_count) : undefined,
    landUseBreakdown: Array.isArray(row.land_use_breakdown) ? row.land_use_breakdown : [],
    confidenceDistribution: Array.isArray(row.confidence_distribution) ? row.confidence_distribution : [],
    precisionRecallCurve: Array.isArray(row.precision_recall_curve) ? row.precision_recall_curve : [],
    groundTruthComparisons: Array.isArray(row.ground_truth_comparisons) ? row.ground_truth_comparisons : []
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
    return this.processGeoTiff(job);
  },

  async processGeoTiff(job: ProcessingJob, file?: File): Promise<{ available: boolean; jobId: string; status: string }> {
    const serviceUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim();
    try {
      const baseUrl = serviceUrl.replace(/\/$/, '');
      const healthResponse = await fetch(`${baseUrl}/health`);
      const healthBody = await healthResponse.json().catch(() => null);
      if (!healthResponse.ok || healthBody?.status !== 'ok') {
        throw new Error(healthBody?.detail || 'AI processing service is unavailable. Start the Python backend and retry.');
      }
      const response = await fetch(`${baseUrl}/v1/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          project_id: job.projectId,
          imagery_id: job.imageryId,
          output_srid: 4326
        })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail || `Processing service returned HTTP ${response.status}.`);
      return { available: true, jobId: body?.job_id || job.id, status: body?.status || 'accepted' };
    } catch (error: any) {
      const message = error?.message?.includes('AI model is not configured yet')
        ? 'AI model is not configured yet.'
        : error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')
          ? 'AI processing service is unavailable. Start the Python backend and retry.'
          : error?.message || 'AI processing service is unavailable. Start the Python backend and retry.';
      await supabase?.from('processing_jobs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', job.id);
      throw new Error(message);
    }
  },

  async previewCadastral(projectId: string, file: File): Promise<{
    preview_id: string;
    source_crs: string;
    target_crs: string;
    parcel_count: number;
    inside_survey_count: number;
    partially_overlapping_count: number;
    outside_survey_count: number;
    warnings: string[];
    validation_errors: string[];
    geographic_mismatch?: boolean;
    preview?: any;
  }> {
    const serviceUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
    const formData = new FormData();
    formData.append('project_id', projectId);
    formData.append('file', file, file.name);
    const response = await fetch(`${serviceUrl}/v1/cadastral-import/preview`, { method: 'POST', body: formData });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const errDetail = body?.detail;
      const errorMsg = typeof errDetail === 'string'
        ? errDetail
        : errDetail?.validation_errors?.join(', ') || errDetail?.message || `Cadastral validation returned HTTP ${response.status}.`;
      throw new Error(errorMsg);
    }
    return body;
  },

  async confirmCadastral(projectId: string, previewId: string): Promise<{ inserted: number; parcels: number; source: string }> {
    const serviceUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
    const response = await fetch(`${serviceUrl}/v1/cadastral-import/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, preview_id: previewId })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : `Cadastral import returned HTTP ${response.status}.`);
    return body;
  },

  async importOfficialCadastral(projectId: string, file: File): Promise<{ inserted: number; parcels: number; source: string }> {
    const preview = await this.previewCadastral(projectId, file);
    return this.confirmCadastral(projectId, preview.preview_id);
  },

  async deleteCadastral(projectId: string): Promise<{ deleted: number; remaining_parcels: number }> {
    const serviceUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
    const response = await fetch(`${serviceUrl}/v1/cadastral-import/${encodeURIComponent(projectId)}`, {
      method: 'DELETE'
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : `Failed to delete cadastral parcels: HTTP ${response.status}.`);
    return body;
  },

  async getProcessingJob(projectId: string): Promise<ProcessingJob | null> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('processing_jobs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(`Could not load processing status: ${error.message}`);
    return data ? mapProcessingJob(data) : null;
  },

  async retryProcessing(jobId: string): Promise<ProcessingJob> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.from('processing_jobs').update({ status: 'uploaded', progress: 0, current_step: 'Queued for Python AI service', error_message: null, updated_at: new Date().toISOString() }).eq('id', jobId).select().single();
    if (error || !data) throw new Error(`Could not retry processing: ${error?.message || 'No job returned.'}`);
    const job = mapProcessingJob(data);
    await this.processGeoTiff(job);
    return job;
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

  async getImagery(projectId: string): Promise<{ url: string; bounds?: [[number, number], [number, number]]; survey_footprint?: GeoJSON.Polygon } | null> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured.');
    const serviceUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim().replace(/\/$/, '');
    const imageryResponse = await fetch(`${serviceUrl}/v1/imagery/${encodeURIComponent(projectId)}`);
    const imageryBody = await imageryResponse.json().catch(() => null);
    if (!imageryResponse.ok) throw new Error(imageryBody?.detail || `Could not load project imagery (HTTP ${imageryResponse.status}).`);
    if (imageryBody?.url) return imageryBody;

    // Keep the existing Supabase fallback for projects without a backend imagery record.
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
    return { url: data.signedUrl, bounds, survey_footprint: imagery.metadata?.survey_footprint };
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

    // Fetch live GIS features for the specific project
    const [parcels, buildings, roads, waterRes, cadastralRefsRes] = await Promise.all([
      this.getParcels(projectId),
      this.getBuildings(projectId),
      this.getRoads(projectId),
      supabase.from('water_bodies').select('*').eq('project_id', projectId),
      supabase.from('cadastral_references').select('*').eq('project_id', projectId),
    ]);

    const waterBodies = waterRes.data || [];
    const cadastralRefs = cadastralRefsRes.data || [];

    console.log('[ANALYTICS] Project ID:', projectId);
    console.log('[ANALYTICS] Buildings fetched:', buildings.length);
    console.log('[ANALYTICS] Roads fetched:', roads.length);
    console.log('[ANALYTICS] Parcels fetched:', parcels.length);
    console.log('[ANALYTICS] Water fetched:', waterBodies.length);

    // 1. Feature counts
    const totalParcelsDetected = parcels.length;
    const totalBuildingsDetected = buildings.length;
    const totalRoadSegments = roads.length;
    const totalWaterBodies = waterBodies.length;

    // 2. Building statistics & Review Status
    let totalBuildingAreaSqM = 0;
    let verifiedBuildingsCount = 0;
    let pendingBuildingsCount = 0;
    let rejectedBuildingsCount = 0;

    for (const b of buildings) {
      totalBuildingAreaSqM += b.areaSqM || 0;
      const status = (b.reviewStatus || '').toLowerCase();
      if (status === 'verified') {
        verifiedBuildingsCount++;
      } else if (status === 'rejected' || status === 'flagged') {
        rejectedBuildingsCount++;
      } else {
        pendingBuildingsCount++;
      }
    }
    const avgBuildingAreaSqM = buildings.length > 0 ? Math.round(totalBuildingAreaSqM / buildings.length) : 0;
    totalBuildingAreaSqM = Math.round(totalBuildingAreaSqM);

    // 3. Road Lengths (geospatial length in meters)
    let totalRoadLengthM = 0;
    for (const r of roads) {
      if (r.geometry && r.geometry.coordinates) {
        try {
          const line = r.geometry.type === 'LineString'
            ? turf.lineString(r.geometry.coordinates as any)
            : turf.multiLineString(r.geometry.coordinates as any);
          totalRoadLengthM += turf.length(line, { units: 'meters' });
        } catch {
          // ignore geometry parsing edge cases
        }
      }
    }
    const avgRoadLengthM = roads.length > 0 ? Math.round(totalRoadLengthM / roads.length) : 0;
    totalRoadLengthM = Math.round(totalRoadLengthM);

    // 4. Land Use Zoning Breakdown
    const landUseColors: Record<string, string> = {
      'Residential': '#0f766e',
      'Commercial': '#0284c7',
      'Industrial': '#64748b',
      'Agricultural': '#16a34a',
      'Mixed': '#8b5cf6',
      'Government': '#d97706',
      'Vacant': '#94a3b8',
      'Open': '#94a3b8',
      'Other': '#cbd5e1',
    };

    const landUseCounts: Record<string, number> = {};
    if (parcels.length > 0) {
      for (const p of parcels) {
        const lu = p.landUse || 'Vacant';
        landUseCounts[lu] = (landUseCounts[lu] || 0) + 1;
      }
    }

    const landUseBreakdown: { name: string; value: number; color: string }[] = Object.entries(landUseCounts).map(
      ([name, value]) => ({
        name,
        value,
        color: landUseColors[name] || '#64748b'
      })
    );

    // 5. Boundary Confidence Spread
    const confValues: number[] = [];
    for (const b of buildings) {
      if (typeof b.confidence === 'number' && b.confidence > 0) {
        confValues.push(b.confidence <= 1.0 ? b.confidence * 100 : b.confidence);
      }
    }
    for (const r of roads) {
      if (typeof r.confidence === 'number' && r.confidence > 0) {
        confValues.push(r.confidence <= 1.0 ? r.confidence * 100 : r.confidence);
      }
    }
    for (const p of parcels) {
      if (typeof p.confidence === 'number' && p.confidence > 0) {
        confValues.push(p.confidence <= 1.0 ? p.confidence * 100 : p.confidence);
      }
    }

    let confidenceDistribution: { range: string; count: number }[] = [];
    if (confValues.length > 0) {
      const bins = [
        { range: '0–20%', min: 0, max: 20, count: 0 },
        { range: '20–40%', min: 20, max: 40, count: 0 },
        { range: '40–60%', min: 40, max: 60, count: 0 },
        { range: '60–80%', min: 60, max: 80, count: 0 },
        { range: '80–100%', min: 80, max: 100.01, count: 0 }
      ];
      for (const c of confValues) {
        for (const b of bins) {
          if (c >= b.min && c < b.max) {
            b.count++;
            break;
          }
        }
      }
      confidenceDistribution = bins.map(b => ({ range: b.range, count: b.count }));
    }

    // 6. Ground Truth Validation & Cross-Comparison
    const groundTruthComparisons: GroundTruthComparison[] = [];
    let precision: number | null = null;
    let recall: number | null = null;
    let f1Score: number | null = null;
    let meanIoU: number | null = null;
    let hasGroundTruth = false;

    // Check if cadastral references or verified official parcel references exist
    const referenceFeatures = cadastralRefs.length > 0
      ? cadastralRefs.map((r: any) => ({
          id: String(r.id),
          geometry: parseGeometry(r.geometry),
          attributes: r.attributes || {}
        }))
      : parcels.filter(p => p.source === 'official_cadastral' || p.source === 'verified');

    if (referenceFeatures.length > 0 && buildings.length > 0) {
      hasGroundTruth = true;
      let totalIou = 0;
      let matchedCount = 0;
      let tpCount = 0;

      for (const ref of referenceFeatures) {
        if (!ref.geometry || !ref.geometry.coordinates) continue;
        try {
          const refPoly = ref.geometry.type === 'Polygon'
            ? turf.polygon(ref.geometry.coordinates as any)
            : turf.multiPolygon(ref.geometry.coordinates as any);
          const refArea = turf.area(refPoly);

          let bestIou = 0;
          let bestAiArea = 0;
          let bestDev = 0;

          for (const ai of buildings) {
            if (!ai.geometry || !ai.geometry.coordinates) continue;
            try {
              const aiPoly = ai.geometry.type === 'Polygon'
                ? turf.polygon(ai.geometry.coordinates as any)
                : turf.multiPolygon(ai.geometry.coordinates as any);

              if (turf.booleanIntersects(refPoly, aiPoly)) {
                const intersection = turf.intersect(turf.featureCollection([refPoly as any, aiPoly as any]) as any);
                if (intersection) {
                  const interArea = turf.area(intersection);
                  const aiArea = turf.area(aiPoly);
                  const unionArea = refArea + aiArea - interArea;
                  const iou = unionArea > 0 ? (interArea / unionArea) * 100 : 0;
                  if (iou > bestIou) {
                    bestIou = iou;
                    bestAiArea = aiArea;
                    const centerRef = turf.center(refPoly);
                    const centerAi = turf.center(aiPoly);
                    bestDev = turf.distance(centerRef, centerAi, { units: 'meters' });
                  }
                }
              }
            } catch {
              // skip invalid shape
            }
          }

          if (bestIou > 0) {
            matchedCount++;
            totalIou += bestIou;
            if (bestIou >= 50) {
              tpCount++;
            }
            const centerPoint = turf.center(refPoly);
            groundTruthComparisons.push({
              parcelId: ref.attributes?.parcel_identifier || ref.attributes?.survey_number || ref.id,
              gtArea: Math.round(refArea),
              aiArea: Math.round(bestAiArea),
              iou: Math.round(bestIou * 10) / 10,
              precision: Math.round(Math.min(100, (bestAiArea > 0 ? (Math.min(refArea, bestAiArea) / bestAiArea) * 100 : 0)) * 10) / 10,
              recall: Math.round(Math.min(100, (bestAiArea > 0 ? (Math.min(refArea, bestAiArea) / refArea) * 100 : 0)) * 10) / 10,
              deviationM: Math.round(bestDev * 100) / 100,
              coordinates: [centerPoint.geometry.coordinates[1], centerPoint.geometry.coordinates[0]]
            });
          }
        } catch {
          // skip invalid shape
        }
      }

      if (matchedCount > 0) {
        meanIoU = Math.round((totalIou / matchedCount) * 10) / 10;
        const fp = Math.max(0, buildings.length - tpCount);
        const fn = Math.max(0, referenceFeatures.length - tpCount);
        precision = Math.round((tpCount / Math.max(1, tpCount + fp)) * 1000) / 10;
        recall = Math.round((tpCount / Math.max(1, tpCount + fn)) * 1000) / 10;
        f1Score = (precision + recall > 0)
          ? Math.round((2 * precision * recall / (precision + recall)) * 10) / 10
          : 0;
      }
    }

    console.log('[ANALYTICS] Ground truth available:', hasGroundTruth);
    console.log('[ANALYTICS] Precision:', precision, 'Recall:', recall, 'F1:', f1Score, 'Mean IoU:', meanIoU);

    return {
      precision,
      recall,
      f1Score,
      meanIoU,
      hasGroundTruth,
      totalParcelsDetected,
      totalBuildingsDetected,
      totalRoadSegments,
      totalWaterBodies,
      totalBuildingAreaSqM,
      avgBuildingAreaSqM,
      totalRoadLengthM,
      avgRoadLengthM,
      verifiedBuildingsCount,
      pendingBuildingsCount,
      rejectedBuildingsCount,
      landUseBreakdown,
      confidenceDistribution,
      precisionRecallCurve: [],
      groundTruthComparisons
    };
  }
};
