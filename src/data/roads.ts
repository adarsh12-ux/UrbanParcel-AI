import { Road } from '../types';

const baseLat = 16.5062;
const baseLng = 80.6480;
const d = 0.0015;

export const SAMPLE_ROADS: Road[] = [
  {
    id: 'RD-3001',
    name: 'NH-65 Arterial Bypass Road',
    widthM: 18.0,
    surfaceType: 'Asphalt',
    confidence: 98.4,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*2.5, baseLat - d*0.5],
        [baseLng + d*2.5, baseLat - d*0.5]
      ]
    }
  },
  {
    id: 'RD-3002',
    name: 'Zone A Main Collector Corridor',
    widthM: 12.0,
    surfaceType: 'Asphalt',
    confidence: 97.2,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*0.8, baseLat - d*1.5],
        [baseLng - d*0.8, baseLat + d*2.5]
      ]
    }
  },
  {
    id: 'RD-3003',
    name: 'Ward 18 Secondary Link Road',
    widthM: 9.0,
    surfaceType: 'Concrete',
    confidence: 96.1,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*0.1, baseLat - d*1.5],
        [baseLng - d*0.1, baseLat + d*2.5]
      ]
    }
  },
  {
    id: 'RD-3004',
    name: 'Municipal East Cross Lane',
    widthM: 7.5,
    surfaceType: 'Concrete',
    confidence: 95.0,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng + d*0.7, baseLat - d*1.5],
        [baseLng + d*0.7, baseLat + d*2.5]
      ]
    }
  },
  {
    id: 'RD-3005',
    name: 'Industrial Park Access Road',
    widthM: 15.0,
    surfaceType: 'Asphalt',
    confidence: 97.8,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng + d*1.3, baseLat - d*1.5],
        [baseLng + d*1.3, baseLat + d*2.5]
      ]
    }
  },
  {
    id: 'RD-3006',
    name: 'Zone A North Perimeter Road',
    widthM: 10.5,
    surfaceType: 'Asphalt',
    confidence: 96.7,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*2.5, baseLat + d*0.3],
        [baseLng + d*2.5, baseLat + d*0.3]
      ]
    }
  },
  {
    id: 'RD-3007',
    name: 'Residential Block South Alley',
    widthM: 6.0,
    surfaceType: 'Concrete',
    confidence: 93.5,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*2.5, baseLat + d*1.2],
        [baseLng + d*2.5, baseLat + d*1.2]
      ]
    }
  },
  {
    id: 'RD-3008',
    name: 'Agricultural Zone Access Path',
    widthM: 4.5,
    surfaceType: 'Unpaved',
    confidence: 91.2,
    geometry: {
      type: 'LineString',
      coordinates: [
        [baseLng - d*2.5, baseLat + d*2.0],
        [baseLng + d*2.5, baseLat + d*2.0]
      ]
    }
  }
];
