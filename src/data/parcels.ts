import { Parcel } from '../types';

// Base coordinates around Vijayawada center: Lat 16.5062, Lng 80.6480
const baseLat = 16.5062;
const baseLng = 80.6480;
const d = 0.0015; // Grid offset (~150m)

export const SAMPLE_PARCELS: Parcel[] = [
  {
    id: 'UP-1001',
    surveyNo: 'Sy.No. 101/1',
    areaSqM: 1420.5,
    perimeterM: 154.2,
    buildingCount: 2,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 96.4,
    center: [baseLat, baseLng],
    ownerName: 'K. Rama Rao',
    status: 'Verified',
    notes: 'Clear boundary demarcations with roadside setback.',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.8, baseLat - d*0.5],
        [baseLng - d*0.1, baseLat - d*0.5],
        [baseLng - d*0.1, baseLat + d*0.3],
        [baseLng - d*0.8, baseLat + d*0.3],
        [baseLng - d*0.8, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1002',
    surveyNo: 'Sy.No. 101/2',
    areaSqM: 1850.0,
    perimeterM: 178.6,
    buildingCount: 3,
    landUse: 'Commercial',
    roadAccess: 'Direct',
    confidence: 95.1,
    center: [baseLat + d*0.8, baseLng],
    ownerName: 'Sri Balaji Trade Corp',
    status: 'Verified',
    notes: 'Multi-story commercial complex detected.',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.1, baseLat - d*0.5],
        [baseLng + d*0.7, baseLat - d*0.5],
        [baseLng + d*0.7, baseLat + d*0.3],
        [baseLng - d*0.1, baseLat + d*0.3],
        [baseLng - d*0.1, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1003',
    surveyNo: 'Sy.No. 102/1A',
    areaSqM: 980.2,
    perimeterM: 126.8,
    buildingCount: 1,
    landUse: 'Residential',
    roadAccess: 'Secondary',
    confidence: 93.8,
    center: [baseLat + d*1.5, baseLng],
    ownerName: 'V. Lakshmi Devi',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.7, baseLat - d*0.5],
        [baseLng + d*1.3, baseLat - d*0.5],
        [baseLng + d*1.3, baseLat + d*0.3],
        [baseLng + d*0.7, baseLat + d*0.3],
        [baseLng + d*0.7, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1004',
    surveyNo: 'Sy.No. 102/1B',
    areaSqM: 2150.8,
    perimeterM: 195.4,
    buildingCount: 4,
    landUse: 'Mixed',
    roadAccess: 'Direct',
    confidence: 97.2,
    center: [baseLat - d*1.2, baseLng],
    ownerName: 'AP Urban Infra Developers',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.5, baseLat - d*0.5],
        [baseLng - d*0.8, baseLat - d*0.5],
        [baseLng - d*0.8, baseLat + d*0.3],
        [baseLng - d*1.5, baseLat + d*0.3],
        [baseLng - d*1.5, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1005',
    surveyNo: 'Sy.No. 103/4',
    areaSqM: 3200.0,
    perimeterM: 230.5,
    buildingCount: 0,
    landUse: 'Vacant',
    roadAccess: 'Direct',
    confidence: 98.0,
    center: [baseLat, baseLng + d*1.2],
    ownerName: 'Municipal Corporation',
    status: 'Verified',
    notes: 'Open plot proposed for public park.',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.8, baseLat + d*0.3],
        [baseLng - d*0.1, baseLat + d*0.3],
        [baseLng - d*0.1, baseLat + d*1.2],
        [baseLng - d*0.8, baseLat + d*1.2],
        [baseLng - d*0.8, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1006',
    surveyNo: 'Sy.No. 104/1',
    areaSqM: 1640.4,
    perimeterM: 162.0,
    buildingCount: 2,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 92.5,
    center: [baseLat + d*0.8, baseLng + d*1.2],
    ownerName: 'M. Subrahmanyam',
    status: 'Pending Review',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.1, baseLat + d*0.3],
        [baseLng + d*0.7, baseLat + d*0.3],
        [baseLng + d*0.7, baseLat + d*1.2],
        [baseLng - d*0.1, baseLat + d*1.2],
        [baseLng - d*0.1, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1007',
    surveyNo: 'Sy.No. 104/2',
    areaSqM: 1110.6,
    perimeterM: 138.4,
    buildingCount: 1,
    landUse: 'Commercial',
    roadAccess: 'Direct',
    confidence: 94.9,
    center: [baseLat + d*1.5, baseLng + d*1.2],
    ownerName: 'Narayana Health Services',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.7, baseLat + d*0.3],
        [baseLng + d*1.3, baseLat + d*0.3],
        [baseLng + d*1.3, baseLat + d*1.2],
        [baseLng + d*0.7, baseLat + d*1.2],
        [baseLng + d*0.7, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1008',
    surveyNo: 'Sy.No. 105/3',
    areaSqM: 2890.2,
    perimeterM: 218.0,
    buildingCount: 5,
    landUse: 'Mixed',
    roadAccess: 'Direct',
    confidence: 91.8,
    center: [baseLat - d*1.2, baseLng + d*1.2],
    ownerName: 'Venkateswara Educational Society',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.5, baseLat + d*0.3],
        [baseLng - d*0.8, baseLat + d*0.3],
        [baseLng - d*0.8, baseLat + d*1.2],
        [baseLng - d*1.5, baseLat + d*1.2],
        [baseLng - d*1.5, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1009',
    surveyNo: 'Sy.No. 106/1',
    areaSqM: 1750.3,
    perimeterM: 168.5,
    buildingCount: 2,
    landUse: 'Government',
    roadAccess: 'Direct',
    confidence: 96.8,
    center: [baseLat, baseLng - d*1.2],
    ownerName: 'AP Revenue Department Sub-Office',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.8, baseLat - d*1.3],
        [baseLng - d*0.1, baseLat - d*1.3],
        [baseLng - d*0.1, baseLat - d*0.5],
        [baseLng - d*0.8, baseLat - d*0.5],
        [baseLng - d*0.8, baseLat - d*1.3]
      ]]
    }
  },
  {
    id: 'UP-1010',
    surveyNo: 'Sy.No. 106/2',
    areaSqM: 1340.0,
    perimeterM: 148.0,
    buildingCount: 1,
    landUse: 'Residential',
    roadAccess: 'Secondary',
    confidence: 94.2,
    center: [baseLat + d*0.8, baseLng - d*1.2],
    ownerName: 'P. Anjaneyulu',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.1, baseLat - d*1.3],
        [baseLng + d*0.7, baseLat - d*1.3],
        [baseLng + d*0.7, baseLat - d*0.5],
        [baseLng - d*0.1, baseLat - d*0.5],
        [baseLng - d*0.1, baseLat - d*1.3]
      ]]
    }
  },
  {
    id: 'UP-1011',
    surveyNo: 'Sy.No. 107/1',
    areaSqM: 4500.8,
    perimeterM: 280.0,
    buildingCount: 1,
    landUse: 'Industrial',
    roadAccess: 'Direct',
    confidence: 97.9,
    center: [baseLat + d*2.2, baseLng],
    ownerName: 'Krishna Valley Cold Storage',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*1.3, baseLat - d*0.5],
        [baseLng + d*2.1, baseLat - d*0.5],
        [baseLng + d*2.1, baseLat + d*0.3],
        [baseLng + d*1.3, baseLat + d*0.3],
        [baseLng + d*1.3, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1012',
    surveyNo: 'Sy.No. 107/2',
    areaSqM: 3800.5,
    perimeterM: 254.2,
    buildingCount: 0,
    landUse: 'Agricultural',
    roadAccess: 'Secondary',
    confidence: 98.5,
    center: [baseLat + d*2.2, baseLng + d*1.2],
    ownerName: 'G. Sambasiva Rao',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*1.3, baseLat + d*0.3],
        [baseLng + d*2.1, baseLat + d*0.3],
        [baseLng + d*2.1, baseLat + d*1.2],
        [baseLng + d*1.3, baseLat + d*1.2],
        [baseLng + d*1.3, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1013',
    surveyNo: 'Sy.No. 108/1',
    areaSqM: 1250.6,
    perimeterM: 144.0,
    buildingCount: 2,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 93.1,
    center: [baseLat - d*2.0, baseLng],
    ownerName: 'B. Tirupathamma',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*2.2, baseLat - d*0.5],
        [baseLng - d*1.5, baseLat - d*0.5],
        [baseLng - d*1.5, baseLat + d*0.3],
        [baseLng - d*2.2, baseLat + d*0.3],
        [baseLng - d*2.2, baseLat - d*0.5]
      ]]
    }
  },
  {
    id: 'UP-1014',
    surveyNo: 'Sy.No. 108/2',
    areaSqM: 1560.4,
    perimeterM: 160.2,
    buildingCount: 3,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 95.7,
    center: [baseLat - d*2.0, baseLng + d*1.2],
    ownerName: 'Ch. Satyanarayana',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*2.2, baseLat + d*0.3],
        [baseLng - d*1.5, baseLat + d*0.3],
        [baseLng - d*1.5, baseLat + d*1.2],
        [baseLng - d*2.2, baseLat + d*1.2],
        [baseLng - d*2.2, baseLat + d*0.3]
      ]]
    }
  },
  {
    id: 'UP-1015',
    surveyNo: 'Sy.No. 109/1',
    areaSqM: 920.0,
    perimeterM: 122.4,
    buildingCount: 1,
    landUse: 'Commercial',
    roadAccess: 'Direct',
    confidence: 89.4,
    center: [baseLat + d*1.5, baseLng - d*1.2],
    ownerName: 'SVR Logistics Hub',
    status: 'Flagged',
    notes: 'Boundary overlap detected with adjacent road buffer.',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.7, baseLat - d*1.3],
        [baseLng + d*1.3, baseLat - d*1.3],
        [baseLng + d*1.3, baseLat - d*0.5],
        [baseLng + d*0.7, baseLat - d*0.5],
        [baseLng + d*0.7, baseLat - d*1.3]
      ]]
    }
  },
  {
    id: 'UP-1016',
    surveyNo: 'Sy.No. 109/2',
    areaSqM: 2600.0,
    perimeterM: 204.0,
    buildingCount: 2,
    landUse: 'Mixed',
    roadAccess: 'Direct',
    confidence: 96.0,
    center: [baseLat - d*1.2, baseLng - d*1.2],
    ownerName: 'Amaravati Housing Society',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.5, baseLat - d*1.3],
        [baseLng - d*0.8, baseLat - d*1.3],
        [baseLng - d*0.8, baseLat - d*0.5],
        [baseLng - d*1.5, baseLat - d*0.5],
        [baseLng - d*1.5, baseLat - d*1.3]
      ]]
    }
  },
  {
    id: 'UP-1017',
    surveyNo: 'Sy.No. 110/1',
    areaSqM: 1390.2,
    perimeterM: 151.0,
    buildingCount: 2,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 94.6,
    center: [baseLat, baseLng + d*2.0],
    ownerName: 'D. Srinivas',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.8, baseLat + d*1.2],
        [baseLng - d*0.1, baseLat + d*1.2],
        [baseLng - d*0.1, baseLat + d*2.0],
        [baseLng - d*0.8, baseLat + d*2.0],
        [baseLng - d*0.8, baseLat + d*1.2]
      ]]
    }
  },
  {
    id: 'UP-1018',
    surveyNo: 'Sy.No. 110/2',
    areaSqM: 1720.0,
    perimeterM: 166.8,
    buildingCount: 3,
    landUse: 'Commercial',
    roadAccess: 'Direct',
    confidence: 95.8,
    center: [baseLat + d*0.8, baseLng + d*2.0],
    ownerName: 'Kanaka Durga Textiles',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.1, baseLat + d*1.2],
        [baseLng + d*0.7, baseLat + d*1.2],
        [baseLng + d*0.7, baseLat + d*2.0],
        [baseLng - d*0.1, baseLat + d*2.0],
        [baseLng - d*0.1, baseLat + d*1.2]
      ]]
    }
  },
  {
    id: 'UP-1019',
    surveyNo: 'Sy.No. 111/1',
    areaSqM: 2040.5,
    perimeterM: 184.0,
    buildingCount: 1,
    landUse: 'Government',
    roadAccess: 'Direct',
    confidence: 97.4,
    center: [baseLat + d*1.5, baseLng + d*2.0],
    ownerName: 'Vijayawada Municipal Ward Center',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.7, baseLat + d*1.2],
        [baseLng + d*1.3, baseLat + d*1.2],
        [baseLng + d*1.3, baseLat + d*2.0],
        [baseLng + d*0.7, baseLat + d*2.0],
        [baseLng + d*0.7, baseLat + d*1.2]
      ]]
    }
  },
  {
    id: 'UP-1020',
    surveyNo: 'Sy.No. 111/2',
    areaSqM: 3100.0,
    perimeterM: 226.4,
    buildingCount: 4,
    landUse: 'Residential',
    roadAccess: 'Direct',
    confidence: 93.9,
    center: [baseLat - d*1.2, baseLng + d*2.0],
    ownerName: 'G. Nageswara Rao & Sons',
    status: 'Verified',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.5, baseLat + d*1.2],
        [baseLng - d*0.8, baseLat + d*1.2],
        [baseLng - d*0.8, baseLat + d*2.0],
        [baseLng - d*1.5, baseLat + d*2.0],
        [baseLng - d*1.5, baseLat + d*1.2]
      ]]
    }
  }
];
