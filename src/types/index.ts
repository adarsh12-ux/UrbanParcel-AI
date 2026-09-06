export * from './auth';

export type ProjectStatus = 'Draft' | 'Uploaded' | 'Validating' | 'Processing' | 'Extracting Features' | 'Generating GIS Layers' | 'Completed' | 'Failed';

export interface Project {
  id: string;
  name: string;
  location: string;
  surveyAreaSqKm: number;
  crs: string;
  status: ProjectStatus;
  parcelCount: number;
  buildingCount: number;
  roadSegmentCount: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
  centerCoordinates: [number, number]; // [lat, lng]
  gsdCmPerPx?: number;
  imageryFileName?: string;
  imageryFileSizeMb?: number;
  imageryPath?: string;
  imageryMimeType?: string;
  imageryChecksum?: string;
}

export type LandUseType = 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural' | 'Mixed' | 'Government' | 'Vacant';

export interface Parcel {
  id: string; // e.g. "UP-1001"
  projectId?: string;
  surveyNo: string;
  areaSqM: number;
  perimeterM: number;
  buildingCount: number;
  landUse: LandUseType;
  roadAccess: 'Direct' | 'Secondary' | 'None';
  confidence: number; // e.g. 94.7
  center: [number, number]; // [lat, lng]
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON format [lng, lat]
  };
  ownerName: string;
  status: 'Verified' | 'Flagged' | 'Pending Review';
  source?: 'ai_extracted' | 'official_cadastral' | 'manual_edit' | 'verified';
  reviewStatus?: 'needs_review' | 'verified' | 'rejected';
  notes?: string;
}

export interface Building {
  id: string;
  parcelId: string;
  type: string;
  areaSqM: number;
  floors: number;
  confidence: number;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface Road {
  id: string;
  name: string;
  widthM: number;
  surfaceType: 'Asphalt' | 'Concrete' | 'Unpaved';
  confidence: number;
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
}

export interface WaterBody {
  id: string;
  type: 'Pond' | 'Canal' | 'Drainage';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface PipelineStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed';
  durationSeconds?: number;
}

export interface ProcessingState {
  projectId: string;
  currentStep: number;
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  steps: PipelineStep[];
  logs: string[];
  startTime?: string;
  estimatedTimeRemaining?: string;
}

export type ProcessingJobStatus = 'uploaded' | 'validating' | 'processing' | 'extracting features' | 'generating GIS layers' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  projectId: string;
  imageryId: string;
  status: ProcessingJobStatus;
  progress: number;
  currentStep?: string;
  steps: PipelineStep[];
  logs: string[];
  errorMessage?: string;
  workerJobId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface GroundTruthComparison {
  parcelId: string;
  gtArea: number;
  aiArea: number;
  iou: number;
  precision: number;
  recall: number;
  deviationM: number;
  coordinates: [number, number];
}

export interface AnalysisMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  meanIoU: number;
  totalParcelsDetected: number;
  totalBuildingsDetected: number;
  totalRoadSegments: number;
  totalWaterBodies: number;
  landUseBreakdown: { name: string; value: number; color: string }[];
  confidenceDistribution: { range: string; count: number }[];
  precisionRecallCurve: { recall: number; precision: number }[];
  groundTruthComparisons: GroundTruthComparison[];
}
