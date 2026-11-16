import * as THREE from 'three';

export type MapId =
  | 'plaza'
  | 'meadow'
  | 'stadium'
  | 'skyline'
  | 'slanted_canyon'
  | 'rainbow_road'
  | 'volcano_ridge'
  | 'shritiz_circuit';

export type WeatherChoice = 'sunny' | 'sunset' | 'rainy' | 'night' | 'dynamic';

export const WEATHER_OPTIONS: {
  id: WeatherChoice;
  label: string;
  accent: string;
}[] = [
  { id: 'sunny', label: 'Sunny', accent: '#facc15' },
  { id: 'sunset', label: 'Sunset', accent: '#fb923c' },
  { id: 'rainy', label: 'Rainy', accent: '#38bdf8' },
  { id: 'night', label: 'Night', accent: '#a855f7' },
  { id: 'dynamic', label: 'Dynamic', accent: '#4ade80' },
];

export interface HazardZoneSpec {
  t: number;
  lateralAmp: number;
  speed: number;
  kind: 'bumper' | 'oil';
}

export interface LoopSegmentSpec {
  tStart: number;
  tEnd: number;
  radius: number;
  lateralShift: number;
}

export interface BankedSegmentSpec {
  tStart: number;
  tEnd: number;
  maxAngleRad: number; // 45 degrees = Math.PI / 4
  direction: 'left' | 'right';
}

export interface MapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  theme: 'plaza' | 'sunlit' | 'stadium' | 'skyline' | 'canyon' | 'rainbow' | 'volcano' | 'circuit';
  skyTop: string;
  skyMid: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  groundTint: string;
  asphaltTint: string;
  usePlazaRoad: boolean;
  dividerColor: string;
  timeTrialLimitSec: number;
  lengthKm: number;
  controlPoints: THREE.Vector3[];
  rampTCenters: number[];
  loopSegment?: LoopSegmentSpec;
  bankedSegment?: BankedSegmentSpec;
  boostPads: { tCenter: number; lateralOffset: number; width: number; tHalfSpan: number }[];
  itemRowTs: number[];
  hazards: HazardZoneSpec[];
}

export const MAPS: MapDefinition[] = [
  // 1. Shritiz Coconut Plaza
  {
    id: 'plaza',
    name: 'Shritiz Coconut Plaza',
    subtitle: 'Sweeping Palms · Stone Arches · Resort Promenade',
    theme: 'plaza',
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#e0f2fe',
    fogColor: '#bae6fd',
    fogDensity: 0.0011,
    groundTint: '#e7c68b',
    asphaltTint: '#ffffff',
    usePlazaRoad: true,
    dividerColor: '#f97316',
    timeTrialLimitSec: 135,
    lengthKm: 4.8,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -45),
      new THREE.Vector3(0, 0.5, 95),
      new THREE.Vector3(56, 3.2, 195),
      new THREE.Vector3(160, 6.4, 210),
      new THREE.Vector3(245, 4.6, 135),
      new THREE.Vector3(238, 2.0, 25),
      new THREE.Vector3(196, 2.4, -62),
      new THREE.Vector3(226, 4.0, -160),
      new THREE.Vector3(156, 5.8, -235),
      new THREE.Vector3(48, 3.2, -248),
      new THREE.Vector3(-42, 1.6, -200),
      new THREE.Vector3(-30, 0.6, -120),
    ],
    rampTCenters: [0.24, 0.72],
    boostPads: [
      { tCenter: 0.11, lateralOffset: -3.2, width: 5.2, tHalfSpan: 0.013 },
      { tCenter: 0.23, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.47, lateralOffset: 3.4, width: 5.2, tHalfSpan: 0.013 },
      { tCenter: 0.71, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.4, width: 5.2, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.32, 0.55, 0.82],
    hazards: [
      { t: 0.39, lateralAmp: 7.0, speed: 1.7, kind: 'bumper' },
      { t: 0.63, lateralAmp: 6.2, speed: 2.0, kind: 'bumper' },
      { t: 0.86, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },

  // 2. Sunlit Meadow Highway
  {
    id: 'meadow',
    name: 'Sunlit Meadow Highway',
    subtitle: 'Flowing Ridge Curves · Forest Groves · Air Bridges',
    theme: 'sunlit',
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#e0f2fe',
    fogColor: '#bae6fd',
    fogDensity: 0.0012,
    groundTint: '#4ade80',
    asphaltTint: '#d1d5db',
    usePlazaRoad: false,
    dividerColor: '#eab308',
    timeTrialLimitSec: 135,
    lengthKm: 4.9,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -40),
      new THREE.Vector3(0, 0.5, 102),
      new THREE.Vector3(64, 4.8, 202),
      new THREE.Vector3(172, 9.2, 208),
      new THREE.Vector3(252, 5.8, 118),
      new THREE.Vector3(222, 2.0, -14),
      new THREE.Vector3(232, 4.2, -142),
      new THREE.Vector3(148, 6.8, -235),
      new THREE.Vector3(30, 3.0, -238),
      new THREE.Vector3(-54, 1.8, -188),
      new THREE.Vector3(-32, 0.7, -114),
    ],
    rampTCenters: [0.25, 0.72],
    boostPads: [
      { tCenter: 0.12, lateralOffset: -3.2, width: 5.2, tHalfSpan: 0.013 },
      { tCenter: 0.24, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.49, lateralOffset: 3.6, width: 5.2, tHalfSpan: 0.013 },
      { tCenter: 0.71, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.5, width: 5.2, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.33, 0.56, 0.83],
    hazards: [
      { t: 0.38, lateralAmp: 7.2, speed: 1.8, kind: 'bumper' },
      { t: 0.62, lateralAmp: 6.4, speed: 2.1, kind: 'bumper' },
      { t: 0.87, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },

  // 3. Coliseum Grand Prix
  {
    id: 'stadium',
    name: 'Coliseum Grand Prix',
    subtitle: 'Floodlit Bowl · 360° Anti-Gravity Loop · Jumbotrons',
    theme: 'stadium',
    skyTop: '#0b1026',
    skyMid: '#1e295e',
    skyHorizon: '#f97316',
    fogColor: '#31234d',
    fogDensity: 0.0014,
    groundTint: '#23883f',
    asphaltTint: '#cbd5e1',
    usePlazaRoad: false,
    dividerColor: '#ef4444',
    timeTrialLimitSec: 130,
    lengthKm: 5.1,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -35),
      new THREE.Vector3(0, 0.5, 96),
      new THREE.Vector3(62, 3.2, 185),
      new THREE.Vector3(164, 5.8, 188),
      new THREE.Vector3(226, 4.6, 98),
      new THREE.Vector3(216, 4.6, -20),
      new THREE.Vector3(206, 3.0, -132),
      new THREE.Vector3(134, 1.6, -212),
      new THREE.Vector3(25, 1.1, -216),
      new THREE.Vector3(-48, 1.3, -164),
      new THREE.Vector3(-25, 0.6, -98),
    ],
    rampTCenters: [0.34, 0.74],
    loopSegment: {
      tStart: 0.44,
      tEnd: 0.52,
      radius: 22,
      lateralShift: 46,
    },
    boostPads: [
      { tCenter: 0.13, lateralOffset: -3.5, width: 5.2, tHalfSpan: 0.013 },
      { tCenter: 0.33, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.425, lateralOffset: 0, width: 6.4, tHalfSpan: 0.014 },
      { tCenter: 0.73, lateralOffset: 0, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.8, width: 5.2, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.09, 0.29, 0.59, 0.85],
    hazards: [
      { t: 0.22, lateralAmp: 7.2, speed: 1.9, kind: 'bumper' },
      { t: 0.66, lateralAmp: 7.5, speed: 2.2, kind: 'bumper' },
      { t: 0.81, lateralAmp: -3.0, speed: 0, kind: 'oil' },
    ],
  },

  // 4. Skyline Overpass
  {
    id: 'skyline',
    name: 'Skyline Overpass',
    subtitle: 'Elevated Viaducts · 360° Sky Loop · Air Jumps',
    theme: 'skyline',
    skyTop: '#0369a1',
    skyMid: '#0ea5e9',
    skyHorizon: '#fde68a',
    fogColor: '#7dd3fc',
    fogDensity: 0.0012,
    groundTint: '#166534',
    asphaltTint: '#e2e8f0',
    usePlazaRoad: false,
    dividerColor: '#38bdf8',
    timeTrialLimitSec: 140,
    lengthKm: 5.3,
    controlPoints: [
      new THREE.Vector3(0, 6.0, -38),
      new THREE.Vector3(0, 6.0, 102),
      new THREE.Vector3(72, 11.2, 192),
      new THREE.Vector3(184, 14.2, 164),
      new THREE.Vector3(234, 10.2, 48),
      new THREE.Vector3(218, 5.6, -58),
      new THREE.Vector3(214, 4.5, -164),
      new THREE.Vector3(126, 8.2, -234),
      new THREE.Vector3(8, 12.0, -216),
      new THREE.Vector3(-54, 9.0, -158),
      new THREE.Vector3(-28, 6.5, -96),
    ],
    rampTCenters: [0.18, 0.56, 0.81],
    loopSegment: {
      tStart: 0.35,
      tEnd: 0.43,
      radius: 22,
      lateralShift: 46,
    },
    boostPads: [
      { tCenter: 0.16, lateralOffset: 0, width: 5.8, tHalfSpan: 0.015 },
      { tCenter: 0.335, lateralOffset: 0, width: 6.4, tHalfSpan: 0.014 },
      { tCenter: 0.55, lateralOffset: 0, width: 5.8, tHalfSpan: 0.015 },
      { tCenter: 0.79, lateralOffset: 0, width: 5.8, tHalfSpan: 0.015 },
      { tCenter: 0.93, lateralOffset: 3.0, width: 5.2, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.27, 0.51, 0.71, 0.88],
    hazards: [
      { t: 0.23, lateralAmp: 7.5, speed: 2.1, kind: 'bumper' },
      { t: 0.63, lateralAmp: 6.8, speed: 2.0, kind: 'bumper' },
      { t: 0.74, lateralAmp: 3.0, speed: 0, kind: 'oil' },
    ],
  },

  // 5. Red Rock Slanted Canyon (USER REQUEST: 45-degree slanted track!)
  {
    id: 'slanted_canyon',
    name: 'Red Rock Slanted Canyon',
    subtitle: '45° Wall-Ride Bank · Red Rock Canyons · Dust Devils',
    theme: 'canyon',
    skyTop: '#c2410c',
    skyMid: '#ea580c',
    skyHorizon: '#fed7aa',
    fogColor: '#fdba74',
    fogDensity: 0.0013,
    groundTint: '#9a3412',
    asphaltTint: '#f59e0b',
    usePlazaRoad: false,
    dividerColor: '#fbbf24',
    timeTrialLimitSec: 145,
    lengthKm: 5.5,
    controlPoints: [
      new THREE.Vector3(0, 1.0, -42),
      new THREE.Vector3(0, 1.0, 110),
      new THREE.Vector3(76, 5.2, 210),
      new THREE.Vector3(190, 8.4, 215),
      new THREE.Vector3(270, 7.2, 120),
      new THREE.Vector3(250, 4.5, -10),
      new THREE.Vector3(240, 5.8, -145),
      new THREE.Vector3(160, 7.5, -245),
      new THREE.Vector3(35, 4.0, -250),
      new THREE.Vector3(-58, 2.5, -195),
      new THREE.Vector3(-34, 1.2, -120),
    ],
    rampTCenters: [0.22, 0.68],
    // Authentic 45-degree banked canyon turn (Math.PI / 4 rad)
    bankedSegment: {
      tStart: 0.36,
      tEnd: 0.58,
      maxAngleRad: Math.PI / 4, // Exact 45 degrees!
      direction: 'right',
    },
    boostPads: [
      { tCenter: 0.14, lateralOffset: -3.2, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.21, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.355, lateralOffset: 2.5, width: 6.4, tHalfSpan: 0.015 }, // Bank entry boost
      { tCenter: 0.46, lateralOffset: 0, width: 6.8, tHalfSpan: 0.016 }, // Apex 45° boost
      { tCenter: 0.67, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.88, lateralOffset: -3.0, width: 5.5, tHalfSpan: 0.014 },
    ],
    itemRowTs: [0.09, 0.28, 0.45, 0.64, 0.84],
    hazards: [
      { t: 0.19, lateralAmp: 7.2, speed: 2.0, kind: 'bumper' },
      { t: 0.62, lateralAmp: 7.0, speed: 2.2, kind: 'bumper' },
      { t: 0.81, lateralAmp: 3.5, speed: 0, kind: 'oil' },
    ],
  },

  // 6. Rainbow Galaxy Road
  {
    id: 'rainbow_road',
    name: 'Rainbow Galaxy Road',
    subtitle: 'Cosmic Rainbow Highway · Starlight Jumps · Warp Nebulas',
    theme: 'rainbow',
    skyTop: '#050518',
    skyMid: '#1e1035',
    skyHorizon: '#3b0764',
    fogColor: '#4c1d95',
    fogDensity: 0.0008,
    groundTint: '#111827',
    asphaltTint: '#ffffff',
    usePlazaRoad: false,
    dividerColor: '#f43f5e',
    timeTrialLimitSec: 150,
    lengthKm: 5.8,
    controlPoints: [
      new THREE.Vector3(0, 12.0, -45),
      new THREE.Vector3(0, 12.0, 120),
      new THREE.Vector3(85, 18.5, 220),
      new THREE.Vector3(205, 24.0, 210),
      new THREE.Vector3(285, 19.5, 110),
      new THREE.Vector3(260, 14.0, -25),
      new THREE.Vector3(250, 16.5, -165),
      new THREE.Vector3(165, 21.0, -260),
      new THREE.Vector3(30, 18.0, -265),
      new THREE.Vector3(-65, 14.5, -205),
      new THREE.Vector3(-38, 12.5, -125),
    ],
    rampTCenters: [0.22, 0.54, 0.78],
    loopSegment: {
      tStart: 0.38,
      tEnd: 0.46,
      radius: 24,
      lateralShift: 50,
    },
    boostPads: [
      { tCenter: 0.12, lateralOffset: 0, width: 6.2, tHalfSpan: 0.015 },
      { tCenter: 0.21, lateralOffset: 0, width: 6.5, tHalfSpan: 0.015 },
      { tCenter: 0.365, lateralOffset: 0, width: 6.8, tHalfSpan: 0.015 },
      { tCenter: 0.53, lateralOffset: 0, width: 6.5, tHalfSpan: 0.015 },
      { tCenter: 0.77, lateralOffset: 0, width: 6.5, tHalfSpan: 0.015 },
      { tCenter: 0.92, lateralOffset: 0, width: 6.2, tHalfSpan: 0.015 },
    ],
    itemRowTs: [0.08, 0.26, 0.48, 0.68, 0.88],
    hazards: [
      { t: 0.18, lateralAmp: 7.5, speed: 2.3, kind: 'bumper' },
      { t: 0.64, lateralAmp: 7.2, speed: 2.4, kind: 'bumper' },
      { t: 0.83, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },

  // 7. Bowser's Molten Ridge
  {
    id: 'volcano_ridge',
    name: "Bowser's Molten Ridge",
    subtitle: 'Lava Falls · Boiling Magma · Downhill S-Curves',
    theme: 'volcano',
    skyTop: '#180705',
    skyMid: '#450a0a',
    skyHorizon: '#ea580c',
    fogColor: '#7f1d1d',
    fogDensity: 0.0016,
    groundTint: '#1c1917',
    asphaltTint: '#44403c',
    usePlazaRoad: false,
    dividerColor: '#ef4444',
    timeTrialLimitSec: 145,
    lengthKm: 5.4,
    controlPoints: [
      new THREE.Vector3(0, 2.0, -40),
      new THREE.Vector3(0, 2.0, 115),
      new THREE.Vector3(80, 8.4, 205),
      new THREE.Vector3(195, 12.0, 195),
      new THREE.Vector3(265, 8.5, 95),
      new THREE.Vector3(245, 5.0, -35),
      new THREE.Vector3(235, 6.8, -155),
      new THREE.Vector3(155, 9.2, -245),
      new THREE.Vector3(30, 6.0, -248),
      new THREE.Vector3(-60, 4.0, -195),
      new THREE.Vector3(-36, 2.4, -120),
    ],
    rampTCenters: [0.26, 0.72],
    bankedSegment: {
      tStart: 0.42,
      tEnd: 0.62,
      maxAngleRad: 0.65, // ~37° banking along volcano caldera rim
      direction: 'left',
    },
    boostPads: [
      { tCenter: 0.13, lateralOffset: -3.0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.25, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.48, lateralOffset: 2.8, width: 6.2, tHalfSpan: 0.015 },
      { tCenter: 0.71, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.90, lateralOffset: -2.8, width: 5.5, tHalfSpan: 0.014 },
    ],
    itemRowTs: [0.08, 0.30, 0.52, 0.74, 0.89],
    hazards: [
      { t: 0.21, lateralAmp: 7.8, speed: 2.2, kind: 'bumper' },
      { t: 0.65, lateralAmp: 7.4, speed: 2.4, kind: 'bumper' },
      { t: 0.82, lateralAmp: -3.2, speed: 0, kind: 'oil' },
    ],
  },

  // 8. Royal Shritiz GP Circuit
  {
    id: 'shritiz_circuit',
    name: 'Royal Shritiz GP Circuit',
    subtitle: 'Championship Grand Prix · Carved Shritiz Monument · High-Speed Straight',
    theme: 'circuit',
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#fde68a',
    fogColor: '#bae6fd',
    fogDensity: 0.0011,
    groundTint: '#15803d',
    asphaltTint: '#f8fafc',
    usePlazaRoad: false,
    dividerColor: '#3b82f6',
    timeTrialLimitSec: 140,
    lengthKm: 5.6,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -50),
      new THREE.Vector3(0, 0.5, 125),
      new THREE.Vector3(82, 4.0, 225),
      new THREE.Vector3(195, 7.5, 220),
      new THREE.Vector3(275, 5.5, 125),
      new THREE.Vector3(255, 2.5, 15),
      new THREE.Vector3(245, 3.8, -115),
      new THREE.Vector3(170, 6.2, -225),
      new THREE.Vector3(40, 3.5, -255),
      new THREE.Vector3(-55, 2.0, -210),
      new THREE.Vector3(-35, 0.8, -130),
    ],
    rampTCenters: [0.24, 0.73],
    boostPads: [
      { tCenter: 0.10, lateralOffset: 0, width: 6.2, tHalfSpan: 0.014 },
      { tCenter: 0.23, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.46, lateralOffset: 3.2, width: 5.8, tHalfSpan: 0.014 },
      { tCenter: 0.72, lateralOffset: 0, width: 6.0, tHalfSpan: 0.015 },
      { tCenter: 0.92, lateralOffset: -3.2, width: 5.8, tHalfSpan: 0.014 },
    ],
    itemRowTs: [0.08, 0.29, 0.52, 0.74, 0.89],
    hazards: [
      { t: 0.22, lateralAmp: 7.2, speed: 1.9, kind: 'bumper' },
      { t: 0.64, lateralAmp: 7.0, speed: 2.1, kind: 'bumper' },
      { t: 0.85, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },
];

export function getMapById(id: MapId): MapDefinition {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
