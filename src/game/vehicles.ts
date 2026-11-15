export type VehicleId =
  | 'standard_kart'
  | 'mach_convertible'
  | 'pipe_frame'
  | 'rally_coupe'
  | 'bubble_bug'
  | 'monster_truck'
  | 'flame_bike'
  | 'bumble_scooter'
  | 'pipe_chopper'
  | 'rally_dirt_bike'
  | 'apex_superbike'
  | 'aero_hover'
  | 'gold_standard'
  | 'turbo_trike'
  | 'star_cruiser'
  | 'arcade_racer';

export type VehicleCategory = 'Kart' | 'Roadster' | 'Offroad' | 'Bike' | 'Scooter' | 'Hover';

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  category: VehicleCategory;
  wheelLayout: 'four' | 'two' | 'trike' | 'hover';
  statBars: {
    speed: number; // 1..10
    acceleration: number; // 1..10
    weight: number; // 1..10
    handling: number; // 1..10
  };
  deltas: {
    topSpeed: number;
    acceleration: number;
    weight: number;
    handling: number;
  };
  tireRadiusFront: number;
  tireRadiusRear: number;
  accentHex: string;
  bodyTintHex: string;
  page: 0 | 1;
}

export const VEHICLES: VehicleSpec[] = [
  // PAGE 1 (12 Vehicles matching Reference Showcase Grid)
  {
    id: 'standard_kart',
    name: 'Standard Kart',
    category: 'Kart',
    wheelLayout: 'four',
    statBars: { speed: 6, acceleration: 6, weight: 5, handling: 6 },
    deltas: { topSpeed: 0, acceleration: 0, weight: 0, handling: 0 },
    tireRadiusFront: 0.32,
    tireRadiusRear: 0.37,
    accentHex: '#facc15',
    bodyTintHex: '#ef4444',
    page: 0,
  },
  {
    id: 'mach_convertible',
    name: 'Cadillac Dasher',
    category: 'Roadster',
    wheelLayout: 'four',
    statBars: { speed: 8, acceleration: 5, weight: 7, handling: 5 },
    deltas: { topSpeed: 7, acceleration: -4, weight: 8, handling: -4 },
    tireRadiusFront: 0.33,
    tireRadiusRear: 0.36,
    accentHex: '#f472b6',
    bodyTintHex: '#f472b6',
    page: 0,
  },
  {
    id: 'pipe_frame',
    name: 'Pipe Frame',
    category: 'Kart',
    wheelLayout: 'four',
    statBars: { speed: 5, acceleration: 8, weight: 4, handling: 8 },
    deltas: { topSpeed: -3, acceleration: 8, weight: -6, handling: 8 },
    tireRadiusFront: 0.33,
    tireRadiusRear: 0.39,
    accentHex: '#facc15',
    bodyTintHex: '#eab308',
    page: 0,
  },
  {
    id: 'rally_coupe',
    name: 'Turbo Rally',
    category: 'Roadster',
    wheelLayout: 'four',
    statBars: { speed: 7, acceleration: 7, weight: 6, handling: 6 },
    deltas: { topSpeed: 4, acceleration: 3, weight: 4, handling: 1 },
    tireRadiusFront: 0.34,
    tireRadiusRear: 0.38,
    accentHex: '#2dd4bf',
    bodyTintHex: '#0d9488',
    page: 0,
  },
  {
    id: 'bubble_bug',
    name: 'Cloud Coupe',
    category: 'Roadster',
    wheelLayout: 'four',
    statBars: { speed: 5, acceleration: 8, weight: 4, handling: 9 },
    deltas: { topSpeed: -2, acceleration: 7, weight: -5, handling: 10 },
    tireRadiusFront: 0.31,
    tireRadiusRear: 0.35,
    accentHex: '#e2e8f0',
    bodyTintHex: '#cbd5e1',
    page: 0,
  },
  {
    id: 'monster_truck',
    name: 'Monster 4x4',
    category: 'Offroad',
    wheelLayout: 'four',
    statBars: { speed: 8, acceleration: 4, weight: 10, handling: 4 },
    deltas: { topSpeed: 6, acceleration: -7, weight: 16, handling: -7 },
    tireRadiusFront: 0.45,
    tireRadiusRear: 0.49,
    accentHex: '#f97316',
    bodyTintHex: '#f97316',
    page: 0,
  },
  {
    id: 'flame_bike',
    name: 'Flame Bike',
    category: 'Bike',
    wheelLayout: 'two',
    statBars: { speed: 7, acceleration: 7, weight: 4, handling: 8 },
    deltas: { topSpeed: 3, acceleration: 4, weight: -6, handling: 7 },
    tireRadiusFront: 0.37,
    tireRadiusRear: 0.4,
    accentHex: '#ef4444',
    bodyTintHex: '#dc2626',
    page: 0,
  },
  {
    id: 'bumble_scooter',
    name: 'City Scooter',
    category: 'Scooter',
    wheelLayout: 'two',
    statBars: { speed: 4, acceleration: 10, weight: 3, handling: 10 },
    deltas: { topSpeed: -5, acceleration: 12, weight: -10, handling: 12 },
    tireRadiusFront: 0.27,
    tireRadiusRear: 0.29,
    accentHex: '#fde047',
    bodyTintHex: '#eab308',
    page: 0,
  },
  {
    id: 'pipe_chopper',
    name: 'Pipe Chopper',
    category: 'Bike',
    wheelLayout: 'two',
    statBars: { speed: 7, acceleration: 6, weight: 6, handling: 7 },
    deltas: { topSpeed: 4, acceleration: 0, weight: 2, handling: 4 },
    tireRadiusFront: 0.38,
    tireRadiusRear: 0.4,
    accentHex: '#22c55e',
    bodyTintHex: '#16a34a',
    page: 0,
  },
  {
    id: 'rally_dirt_bike',
    name: 'Enduro Trail',
    category: 'Bike',
    wheelLayout: 'two',
    statBars: { speed: 6, acceleration: 8, weight: 4, handling: 9 },
    deltas: { topSpeed: 1, acceleration: 7, weight: -6, handling: 9 },
    tireRadiusFront: 0.39,
    tireRadiusRear: 0.41,
    accentHex: '#16a34a',
    bodyTintHex: '#f8fafc',
    page: 0,
  },
  {
    id: 'apex_superbike',
    name: 'Apex Superbike',
    category: 'Bike',
    wheelLayout: 'two',
    statBars: { speed: 9, acceleration: 6, weight: 5, handling: 7 },
    deltas: { topSpeed: 9, acceleration: -1, weight: -3, handling: 4 },
    tireRadiusFront: 0.37,
    tireRadiusRear: 0.41,
    accentHex: '#facc15',
    bodyTintHex: '#b91c1c',
    page: 0,
  },
  {
    id: 'aero_hover',
    name: 'Hydro Jet',
    category: 'Hover',
    wheelLayout: 'hover',
    statBars: { speed: 8, acceleration: 7, weight: 6, handling: 7 },
    deltas: { topSpeed: 6, acceleration: 3, weight: 1, handling: 5 },
    tireRadiusFront: 0.24,
    tireRadiusRear: 0.33,
    accentHex: '#facc15',
    bodyTintHex: '#2563eb',
    page: 0,
  },

  // PAGE 2 BONUS VEHICLES
  {
    id: 'gold_standard',
    name: 'Gold Standard',
    category: 'Kart',
    wheelLayout: 'four',
    statBars: { speed: 9, acceleration: 7, weight: 7, handling: 6 },
    deltas: { topSpeed: 8, acceleration: 2, weight: 6, handling: 2 },
    tireRadiusFront: 0.33,
    tireRadiusRear: 0.38,
    accentHex: '#fef08a',
    bodyTintHex: '#eab308',
    page: 1,
  },
  {
    id: 'turbo_trike',
    name: 'Turbo Trike',
    category: 'Bike',
    wheelLayout: 'trike',
    statBars: { speed: 7, acceleration: 8, weight: 6, handling: 7 },
    deltas: { topSpeed: 4, acceleration: 5, weight: 2, handling: 5 },
    tireRadiusFront: 0.36,
    tireRadiusRear: 0.39,
    accentHex: '#38bdf8',
    bodyTintHex: '#0284c7',
    page: 1,
  },
  {
    id: 'star_cruiser',
    name: 'Star Cruiser',
    category: 'Hover',
    wheelLayout: 'hover',
    statBars: { speed: 8, acceleration: 8, weight: 5, handling: 8 },
    deltas: { topSpeed: 6, acceleration: 6, weight: -2, handling: 7 },
    tireRadiusFront: 0.26,
    tireRadiusRear: 0.32,
    accentHex: '#c084fc',
    bodyTintHex: '#7e22ce',
    page: 1,
  },
  {
    id: 'arcade_racer',
    name: 'Arcade GT',
    category: 'Roadster',
    wheelLayout: 'four',
    statBars: { speed: 8, acceleration: 7, weight: 6, handling: 8 },
    deltas: { topSpeed: 5, acceleration: 4, weight: 0, handling: 6 },
    tireRadiusFront: 0.33,
    tireRadiusRear: 0.38,
    accentHex: '#fb7185',
    bodyTintHex: '#e11d48',
    page: 1,
  },
];

export function getVehicleById(id?: string): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) ?? VEHICLES[0];
}
