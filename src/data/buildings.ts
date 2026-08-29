import { Building } from '../types';

const baseLat = 16.5062;
const baseLng = 80.6480;
const d = 0.0015;

export const SAMPLE_BUILDINGS: Building[] = [
  // UP-1001 (2 buildings)
  {
    id: 'BLD-2001',
    parcelId: 'UP-1001',
    type: 'Residential Duplex',
    areaSqM: 210.5,
    floors: 2,
    confidence: 97.5,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.7, baseLat - d*0.4],
        [baseLng - d*0.4, baseLat - d*0.4],
        [baseLng - d*0.4, baseLat - d*0.2],
        [baseLng - d*0.7, baseLat - d*0.2],
        [baseLng - d*0.7, baseLat - d*0.4]
      ]]
    }
  },
  {
    id: 'BLD-2002',
    parcelId: 'UP-1001',
    type: 'Garage / Outbuilding',
    areaSqM: 45.0,
    floors: 1,
    confidence: 94.1,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.3, baseLat - d*0.1],
        [baseLng - d*0.2, baseLat - d*0.1],
        [baseLng - d*0.2, baseLat + d*0.1],
        [baseLng - d*0.3, baseLat + d*0.1],
        [baseLng - d*0.3, baseLat - d*0.1]
      ]]
    }
  },

  // UP-1002 (3 buildings)
  {
    id: 'BLD-2003',
    parcelId: 'UP-1002',
    type: 'Commercial Complex',
    areaSqM: 480.0,
    floors: 4,
    confidence: 98.2,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.1, baseLat - d*0.4],
        [baseLng + d*0.5, baseLat - d*0.4],
        [baseLng + d*0.5, baseLat - d*0.1],
        [baseLng + d*0.1, baseLat - d*0.1],
        [baseLng + d*0.1, baseLat - d*0.4]
      ]]
    }
  },
  {
    id: 'BLD-2004',
    parcelId: 'UP-1002',
    type: 'Retail Annex',
    areaSqM: 160.0,
    floors: 2,
    confidence: 96.0,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.1, baseLat + d*0.05],
        [baseLng + d*0.3, baseLat + d*0.05],
        [baseLng + d*0.3, baseLat + d*0.25],
        [baseLng + d*0.1, baseLat + d*0.25],
        [baseLng + d*0.1, baseLat + d*0.05]
      ]]
    }
  },
  {
    id: 'BLD-2005',
    parcelId: 'UP-1002',
    type: 'Storage Shed',
    areaSqM: 75.0,
    floors: 1,
    confidence: 92.4,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.4, baseLat + d*0.05],
        [baseLng + d*0.6, baseLat + d*0.05],
        [baseLng + d*0.6, baseLat + d*0.2],
        [baseLng + d*0.4, baseLat + d*0.2],
        [baseLng + d*0.4, baseLat + d*0.05]
      ]]
    }
  },

  // UP-1003 (1 building)
  {
    id: 'BLD-2006',
    parcelId: 'UP-1003',
    type: 'Single Family Villa',
    areaSqM: 280.0,
    floors: 2,
    confidence: 95.8,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.85, baseLat - d*0.35],
        [baseLng + d*1.15, baseLat - d*0.35],
        [baseLng + d*1.15, baseLat + d*0.1],
        [baseLng + d*0.85, baseLat + d*0.1],
        [baseLng + d*0.85, baseLat - d*0.35]
      ]]
    }
  },

  // UP-1004 (4 buildings)
  {
    id: 'BLD-2007',
    parcelId: 'UP-1004',
    type: 'Apartment Block A',
    areaSqM: 380.0,
    floors: 5,
    confidence: 96.9,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.4, baseLat - d*0.4],
        [baseLng - d*1.0, baseLat - d*0.4],
        [baseLng - d*1.0, baseLat - d*0.1],
        [baseLng - d*1.4, baseLat - d*0.1],
        [baseLng - d*1.4, baseLat - d*0.4]
      ]]
    }
  },
  {
    id: 'BLD-2008',
    parcelId: 'UP-1004',
    type: 'Apartment Block B',
    areaSqM: 350.0,
    floors: 5,
    confidence: 97.1,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.4, baseLat + d*0.0],
        [baseLng - d*1.0, baseLat + d*0.0],
        [baseLng - d*1.0, baseLat + d*0.25],
        [baseLng - d*1.4, baseLat + d*0.25],
        [baseLng - d*1.4, baseLat + d*0.0]
      ]]
    }
  },

  // UP-1006 (2 buildings)
  {
    id: 'BLD-2009',
    parcelId: 'UP-1006',
    type: 'Independent House',
    areaSqM: 220.0,
    floors: 2,
    confidence: 94.6,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.1, baseLat + d*0.45],
        [baseLng + d*0.4, baseLat + d*0.45],
        [baseLng + d*0.4, baseLat + d*0.75],
        [baseLng + d*0.1, baseLat + d*0.75],
        [baseLng + d*0.1, baseLat + d*0.45]
      ]]
    }
  },

  // UP-1007 (1 building)
  {
    id: 'BLD-2010',
    parcelId: 'UP-1007',
    type: 'Medical Clinic Building',
    areaSqM: 520.0,
    floors: 3,
    confidence: 96.5,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.8, baseLat + d*0.4],
        [baseLng + d*1.2, baseLat + d*0.4],
        [baseLng + d*1.2, baseLat + d*0.9],
        [baseLng + d*0.8, baseLat + d*0.9],
        [baseLng + d*0.8, baseLat + d*0.4]
      ]]
    }
  },

  // UP-1008 (5 buildings - educational complex)
  {
    id: 'BLD-2011',
    parcelId: 'UP-1008',
    type: 'School Main Block',
    areaSqM: 620.0,
    floors: 3,
    confidence: 98.1,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*1.4, baseLat + d*0.4],
        [baseLng - d*0.9, baseLat + d*0.4],
        [baseLng - d*0.9, baseLat + d*0.7],
        [baseLng - d*1.4, baseLat + d*0.7],
        [baseLng - d*1.4, baseLat + d*0.4]
      ]]
    }
  },

  // UP-1009 (2 government buildings)
  {
    id: 'BLD-2012',
    parcelId: 'UP-1009',
    type: 'Sub-Registrar Office',
    areaSqM: 410.0,
    floors: 2,
    confidence: 97.8,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng - d*0.7, baseLat - d*1.1],
        [baseLng - d*0.3, baseLat - d*1.1],
        [baseLng - d*0.3, baseLat - d*0.7],
        [baseLng - d*0.7, baseLat - d*0.7],
        [baseLng - d*0.7, baseLat - d*1.1]
      ]]
    }
  },

  // UP-1011 (Industrial cold storage)
  {
    id: 'BLD-2013',
    parcelId: 'UP-1011',
    type: 'Industrial Cold Storage Facility',
    areaSqM: 1850.0,
    floors: 1,
    confidence: 98.9,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*1.4, baseLat - d*0.4],
        [baseLng + d*2.0, baseLat - d*0.4],
        [baseLng + d*2.0, baseLat + d*0.2],
        [baseLng + d*1.4, baseLat + d*0.2],
        [baseLng + d*1.4, baseLat - d*0.4]
      ]]
    }
  },

  // UP-1018 (Textile Mill)
  {
    id: 'BLD-2014',
    parcelId: 'UP-1018',
    type: 'Commercial Showroom',
    areaSqM: 540.0,
    floors: 3,
    confidence: 96.2,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.0, baseLat + d*1.3],
        [baseLng + d*0.5, baseLat + d*1.3],
        [baseLng + d*0.5, baseLat + d*1.8],
        [baseLng + d*0.0, baseLat + d*1.8],
        [baseLng + d*0.0, baseLat + d*1.3]
      ]]
    }
  },

  // UP-1019 (Ward Center)
  {
    id: 'BLD-2015',
    parcelId: 'UP-1019',
    type: 'Municipal Ward Administration Center',
    areaSqM: 680.0,
    floors: 2,
    confidence: 97.9,
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [baseLng + d*0.8, baseLat + d*1.3],
        [baseLng + d*1.2, baseLat + d*1.3],
        [baseLng + d*1.2, baseLat + d*1.8],
        [baseLng + d*0.8, baseLat + d*1.8],
        [baseLng + d*0.8, baseLat + d*1.3]
      ]]
    }
  }
];
