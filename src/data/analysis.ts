import { AnalysisMetrics } from '../types';

export const SAMPLE_ANALYSIS: AnalysisMetrics = {
  precision: 95.2,
  recall: 93.8,
  f1Score: 94.5,
  meanIoU: 88.4,
  totalParcelsDetected: 247,
  totalBuildingsDetected: 381,
  totalRoadSegments: 42,
  totalWaterBodies: 12,

  landUseBreakdown: [
    { name: 'Residential', value: 112, color: '#2c5aa0' },
    { name: 'Commercial', value: 58, color: '#1b6b4a' },
    { name: 'Mixed Use', value: 34, color: '#5b4d8a' },
    { name: 'Government', value: 18, color: '#b45309' },
    { name: 'Industrial', value: 13, color: '#9b2c2c' },
    { name: 'Vacant / Other', value: 12, color: '#5b6775' }
  ],

  confidenceDistribution: [
    { range: '95% - 100%', count: 142 },
    { range: '90% - 94%', count: 76 },
    { range: '85% - 89%', count: 21 },
    { range: '80% - 84%', count: 6 },
    { range: '< 80%', count: 2 }
  ],

  precisionRecallCurve: [
    { recall: 0.1, precision: 0.99 },
    { recall: 0.3, precision: 0.98 },
    { recall: 0.5, precision: 0.97 },
    { recall: 0.7, precision: 0.96 },
    { recall: 0.85, precision: 0.95 },
    { recall: 0.938, precision: 0.952 },
    { recall: 0.98, precision: 0.86 },
    { recall: 1.0, precision: 0.72 }
  ],

  groundTruthComparisons: [
    {
      parcelId: 'UP-1001',
      gtArea: 1425.0,
      aiArea: 1420.5,
      iou: 94.2,
      precision: 96.8,
      recall: 95.1,
      deviationM: 0.82,
      coordinates: [16.5062, 80.6480]
    },
    {
      parcelId: 'UP-1002',
      gtArea: 1842.0,
      aiArea: 1850.0,
      iou: 92.8,
      precision: 95.4,
      recall: 94.0,
      deviationM: 1.15,
      coordinates: [16.5074, 80.6480]
    },
    {
      parcelId: 'UP-1004',
      gtArea: 2160.0,
      aiArea: 2150.8,
      iou: 95.6,
      precision: 97.9,
      recall: 96.8,
      deviationM: 0.65,
      coordinates: [16.5044, 80.6480]
    },
    {
      parcelId: 'UP-1005',
      gtArea: 3190.0,
      aiArea: 3200.0,
      iou: 96.4,
      precision: 98.2,
      recall: 97.5,
      deviationM: 0.48,
      coordinates: [16.5062, 80.6498]
    },
    {
      parcelId: 'UP-1009',
      gtArea: 1745.0,
      aiArea: 1750.3,
      iou: 93.5,
      precision: 96.1,
      recall: 95.0,
      deviationM: 0.94,
      coordinates: [16.5062, 80.6462]
    },
    {
      parcelId: 'UP-1015',
      gtArea: 950.0,
      aiArea: 920.0,
      iou: 82.1,
      precision: 88.5,
      recall: 86.2,
      deviationM: 2.45,
      coordinates: [16.5085, 80.6462]
    }
  ]
};
