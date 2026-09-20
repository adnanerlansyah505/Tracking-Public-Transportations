import type { RouteStop } from '../schema';

/**
 * Real Bandung angkot trayek, researched on the ground (trayek-bandung.json,
 * region "Bandung Raya", updated 2026-09-20). Terminals and waypoints
 * are kept as [lng, lat] pairs, the order Mapbox expects.
 */
export interface SeedRoute {
  code: string;
  name: string;
  origin: string;
  destination: string;
  city: string;
  fare: string;
  operatingHours: string;
  color: string;
  maxCapacity: number;
  stops: RouteStop[];
  path: [number, number][];
}

export const BANDUNG_ROUTES: SeedRoute[] = [
  {
    code: '02',
    name: 'Abdul Muis - Dago',
    origin: 'Terminal Kebon Kelapa',
    destination: 'Terminal Dago',
    city: 'Bandung',
    fare: 'Rp 3.000 - 7.000',
    operatingHours: '05:00 - 21:00',
    color: '#059669',
    maxCapacity: 12,
    stops: [
      { id: 's-02-1', name: 'Terminal Kebon Kelapa', coordinates: [107.608352, -6.926715], zone: 'West' },
      { id: 's-02-2', name: 'Simpang Lima', coordinates: [107.61642, -6.92135], zone: 'Central' },
      { id: 's-02-3', name: 'Jl. Riau (RE Martadinata)', coordinates: [107.61214, -6.907952], zone: 'North' },
      { id: 's-02-4', name: 'Simpang Dago', coordinates: [107.61389, -6.88561], zone: 'North' },
      { id: 's-02-5', name: 'Terminal Dago', coordinates: [107.616687, -6.866952], zone: 'North' },
    ],
    path: [
      [107.608352, -6.926715],
      [107.61642, -6.92135],
      [107.61214, -6.907952],
      [107.61389, -6.88561],
      [107.616687, -6.866952],
    ],
  },
  {
    code: '05',
    name: 'Cicaheum - Ledeng',
    origin: 'Terminal Cicaheum',
    destination: 'Terminal Ledeng',
    city: 'Bandung',
    fare: 'Rp 4.000 - 8.000',
    operatingHours: '05:00 - 22:00',
    color: '#2563eb',
    maxCapacity: 12,
    stops: [
      { id: 's-05-1', name: 'Terminal Cicaheum', coordinates: [107.653603, -6.904838], zone: 'East' },
      { id: 's-05-2', name: 'Supratman', coordinates: [107.63211, -6.90382], zone: 'North' },
      { id: 's-05-3', name: 'Gedung Sate', coordinates: [107.618751, -6.902481], zone: 'North' },
      { id: 's-05-4', name: 'Cihampelas', coordinates: [107.604581, -6.892601], zone: 'North' },
      { id: 's-05-5', name: 'Terminal Ledeng', coordinates: [107.598587, -6.858712], zone: 'North' },
    ],
    path: [
      [107.653603, -6.904838],
      [107.63211, -6.90382],
      [107.618751, -6.902481],
      [107.604581, -6.892601],
      [107.598587, -6.858712],
    ],
  },
  {
    code: '08',
    name: 'Cicaheum - Cibaduyut',
    origin: 'Terminal Cicaheum',
    destination: 'Terminal Cibaduyut',
    city: 'Bandung',
    fare: 'Rp 4.000 - 8.000',
    operatingHours: '05:00 - 21:00',
    color: '#d97706',
    maxCapacity: 12,
    stops: [
      { id: 's-08-1', name: 'Terminal Cicaheum', coordinates: [107.653603, -6.904838], zone: 'East' },
      { id: 's-08-2', name: 'Kiaracondong', coordinates: [107.64752, -6.91891], zone: 'East' },
      { id: 's-08-3', name: 'Carrefour Soekarno-Hatta', coordinates: [107.63641, -6.93812], zone: 'South' },
      { id: 's-08-4', name: 'Leuwipanjang', coordinates: [107.59821, -6.94589], zone: 'South' },
      { id: 's-08-5', name: 'Terminal Cibaduyut', coordinates: [107.59211, -6.95318], zone: 'South' },
    ],
    path: [
      [107.653603, -6.904838],
      [107.64752, -6.91891],
      [107.63641, -6.93812],
      [107.59821, -6.94589],
      [107.59211, -6.95318],
    ],
  },
  {
    code: '09',
    name: 'Stasiun Hall - Ciumbuleuit via Cihampelas',
    origin: 'Terminal Stasiun Hall',
    destination: 'Ciumbuleuit (Unpar)',
    city: 'Bandung',
    fare: 'Rp 3.000 - 7.000',
    operatingHours: '05:00 - 21:30',
    color: '#8b5cf6',
    maxCapacity: 12,
    stops: [
      { id: 's-09-1', name: 'Terminal Stasiun Hall', coordinates: [107.60251, -6.915901], zone: 'West' },
      { id: 's-09-2', name: 'Pasar Kaliki', coordinates: [107.60119, -6.91022], zone: 'West' },
      { id: 's-09-3', name: 'Ciwalk', coordinates: [107.60492, -6.89311], zone: 'North' },
      { id: 's-09-4', name: 'Gandok', coordinates: [107.6053, -6.8821], zone: 'North' },
      { id: 's-09-5', name: 'Ciumbuleuit (Unpar)', coordinates: [107.60742, -6.87238], zone: 'North' },
    ],
    path: [
      [107.60251, -6.915901],
      [107.60119, -6.91022],
      [107.60492, -6.89311],
      [107.6053, -6.8821],
      [107.60742, -6.87238],
    ],
  },
  {
    code: '10',
    name: 'Stasiun Hall - Sadang Serang',
    origin: 'Terminal Stasiun Hall',
    destination: 'Terminal Sadang Serang',
    city: 'Bandung',
    fare: 'Rp 3.000 - 6.000',
    operatingHours: '05:30 - 20:30',
    color: '#dc2626',
    maxCapacity: 12,
    stops: [
      { id: 's-10-1', name: 'Terminal Stasiun Hall', coordinates: [107.60251, -6.915901], zone: 'West' },
      { id: 's-10-2', name: 'Viaduct', coordinates: [107.60731, -6.91682], zone: 'West' },
      { id: 's-10-3', name: 'BIP (Bandung Indah Plaza)', coordinates: [107.60982, -6.90881], zone: 'West' },
      { id: 's-10-4', name: 'Monumen Perjuangan', coordinates: [107.6189, -6.89341], zone: 'North' },
      { id: 's-10-5', name: 'Terminal Sadang Serang', coordinates: [107.62512, -6.88398], zone: 'North' },
    ],
    path: [
      [107.60251, -6.915901],
      [107.60731, -6.91682],
      [107.60982, -6.90881],
      [107.6189, -6.89341],
      [107.62512, -6.88398],
    ],
  },
  {
    code: '18',
    name: 'Panghegar - Dipatiukur',
    origin: 'Terminal Panghegar',
    destination: 'Terminal Dipatiukur',
    city: 'Bandung',
    fare: 'Rp 4.000 - 8.000',
    operatingHours: '05:00 - 20:00',
    color: '#0891b2',
    maxCapacity: 12,
    stops: [
      { id: 's-18-1', name: 'Terminal Panghegar', coordinates: [107.68921, -6.92981], zone: 'East' },
      { id: 's-18-2', name: 'Ubertos', coordinates: [107.68741, -6.91382], zone: 'East' },
      { id: 's-18-3', name: 'Cicaheum', coordinates: [107.653603, -6.904838], zone: 'East' },
      { id: 's-18-4', name: 'ITB Dipatiukur', coordinates: [107.6171, -6.8911], zone: 'North' },
      { id: 's-18-5', name: 'Terminal Dipatiukur', coordinates: [107.61782, -6.88931], zone: 'North' },
    ],
    path: [
      [107.68921, -6.92981],
      [107.68741, -6.91382],
      [107.653603, -6.904838],
      [107.6171, -6.8911],
      [107.61782, -6.88931],
    ],
  },
  {
    code: '26',
    name: 'Cisitu - Tegalega',
    origin: 'Cisitu',
    destination: 'Terminal Tegalega',
    city: 'Bandung',
    fare: 'Rp 3.000 - 7.000',
    operatingHours: '05:00 - 21:00',
    color: '#16a34a',
    maxCapacity: 12,
    stops: [
      { id: 's-26-1', name: 'Cisitu', coordinates: [107.6112, -6.87891], zone: 'North' },
      { id: 's-26-2', name: 'Simpang Dago', coordinates: [107.61389, -6.88561], zone: 'North' },
      { id: 's-26-3', name: 'Gramedia Merdeka', coordinates: [107.61011, -6.90712], zone: 'North' },
      { id: 's-26-4', name: 'ITC Kebon Kalapa', coordinates: [107.60621, -6.92711], zone: 'West' },
      { id: 's-26-5', name: 'Terminal Tegalega', coordinates: [107.60341, -6.93291], zone: 'West' },
    ],
    path: [
      [107.6112, -6.87891],
      [107.61389, -6.88561],
      [107.61011, -6.90712],
      [107.60621, -6.92711],
      [107.60341, -6.93291],
    ],
  },
  {
    code: '31',
    name: 'Antapani - Ciroyom',
    origin: 'Terminal Antapani',
    destination: 'Terminal Ciroyom',
    city: 'Bandung',
    fare: 'Rp 3.000 - 7.000',
    operatingHours: '05:00 - 21:00',
    color: '#ea580c',
    maxCapacity: 12,
    stops: [
      { id: 's-31-1', name: 'Terminal Antapani', coordinates: [107.65982, -6.91421], zone: 'East' },
      { id: 's-31-2', name: 'Flyover Antapani', coordinates: [107.6391, -6.91289], zone: 'East' },
      { id: 's-31-3', name: 'Stasiun Bandung (Utara)', coordinates: [107.60211, -6.91341], zone: 'West' },
      { id: 's-31-4', name: 'Pasar Ciroyom', coordinates: [107.5834, -6.9129], zone: 'West' },
      { id: 's-31-5', name: 'Terminal Ciroyom', coordinates: [107.58129, -6.91238], zone: 'West' },
    ],
    path: [
      [107.65982, -6.91421],
      [107.6391, -6.91289],
      [107.60211, -6.91341],
      [107.5834, -6.9129],
      [107.58129, -6.91238],
    ],
  },
  // {
  //   code: 'CIM-KDL',
  //   name: 'Cimahi - Cepadang - Cicaheum',
  //   origin: 'Terminal Pasar Antri Cimahi',
  //   destination: 'Terminal Cicaheum',
  //   city: 'Bandung',
  //   fare: 'Rp 5.000 - 12.000',
  //   operatingHours: '04:30 - 21:00',
  //   color: '#7c3aed',
  //   maxCapacity: 12,
  //   stops: [
  //     { id: 's-cim-kdl-1', name: 'Terminal Pasar Antri Cimahi', coordinates: [107.54281, -6.87621], zone: 'West' },
  //     { id: 's-cim-kdl-2', name: 'Cimindi', coordinates: [107.56191, -6.89211], zone: 'West' },
  //     { id: 's-cim-kdl-3', name: 'Bandara Husein Sastranegara', coordinates: [107.57812, -6.90112], zone: 'West' },
  //     { id: 's-cim-kdl-4', name: 'RS Hasan Sadikin', coordinates: [107.59891, -6.89511], zone: 'North' },
  //     { id: 's-cim-kdl-5', name: 'Terminal Cicaheum', coordinates: [107.653603, -6.904838], zone: 'East' },
  //   ],
  //   path: [
  //     [107.54281, -6.87621],
  //     [107.56191, -6.89211],
  //     [107.57812, -6.90112],
  //     [107.59891, -6.89511],
  //     [107.653603, -6.904838],
  //   ],
  // },
  // {
  //   code: 'MJL-SDR',
  //   name: 'Majalaya - Soreang',
  //   origin: 'Terminal Majalaya',
  //   destination: 'Terminal Soreang',
  //   city: 'Bandung',
  //   fare: 'Rp 5.000 - 12.000',
  //   operatingHours: '05:00 - 19:00',
  //   color: '#0f766e',
  //   maxCapacity: 12,
  //   stops: [
  //     { id: 's-mjl-sdr-1', name: 'Terminal Majalaya', coordinates: [107.75621, -7.05191], zone: 'East' },
  //     { id: 's-mjl-sdr-2', name: 'Banjaran', coordinates: [107.58891, -7.04612], zone: 'South' },
  //     { id: 's-mjl-sdr-3', name: 'Pemkab Bandung', coordinates: [107.53012, -7.02511], zone: 'South' },
  //     { id: 's-mjl-sdr-4', name: 'Terminal Soreang', coordinates: [107.52891, -7.03129], zone: 'South' },
  //   ],
  //   path: [
  //     [107.75621, -7.05191],
  //     [107.58891, -7.04612],
  //     [107.53012, -7.02511],
  //     [107.52891, -7.03129],
  //   ],
  // },
];

/** Codes this seed used to ship; dropped so the trayek match the research. */
export const RETIRED_ROUTE_CODES = ['01A', '32'];
