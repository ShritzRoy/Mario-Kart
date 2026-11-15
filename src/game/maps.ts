import * as THREE from 'three';

export type MapId = 'plaza' | 'meadow' | 'stadium' | 'skyline';

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

export interface MapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  theme: 'plaza' | 'sunlit' | 'stadium' | 'skyline';
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
  controlPoints: THREE.Vector3[];
  rampTCenters: number[];
  loopSegment?: LoopSegmentSpec;
  boostPads: { tCenter: number; lateralOffset: number; width: number; tHalfSpan: number }[];
  itemRowTs: number[];
  hazards: HazardZoneSpec[];
}

export const MAPS: MapDefinition[] = [
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
    timeTrialLimitSec: 125,
    // Wide-radius, smooth flowing GP loop (zero hairpins, >130u track separation everywhere)
    controlPoints: [
      new THREE.Vector3(0, 0.5, -35),
      new THREE.Vector3(0, 0.5, 85),
      new THREE.Vector3(48, 3.2, 175),
      new THREE.Vector3(145, 6.2, 190),
      new THREE.Vector3(224, 4.4, 122),
      new THREE.Vector3(218, 1.8, 22),
      new THREE.Vector3(180, 2.2, -56),
      new THREE.Vector3(208, 3.8, -146),
      new THREE.Vector3(144, 5.4, -214),
      new THREE.Vector3(44, 3.0, -226),
      new THREE.Vector3(-36, 1.4, -184),
      new THREE.Vector3(-26, 0.6, -110),
    ],
    rampTCenters: [0.24, 0.72],
    boostPads: [
      { tCenter: 0.11, lateralOffset: -3.2, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.23, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.47, lateralOffset: 3.4, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.71, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.4, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.09, 0.34, 0.57, 0.82],
    hazards: [
      { t: 0.39, lateralAmp: 7.0, speed: 1.7, kind: 'bumper' },
      { t: 0.63, lateralAmp: 6.2, speed: 2.0, kind: 'bumper' },
      { t: 0.86, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },
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
    timeTrialLimitSec: 125,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -30),
      new THREE.Vector3(0, 0.5, 92),
      new THREE.Vector3(56, 4.4, 182),
      new THREE.Vector3(156, 8.6, 188),
      new THREE.Vector3(232, 5.4, 108),
      new THREE.Vector3(204, 1.8, -12),
      new THREE.Vector3(212, 3.8, -128),
      new THREE.Vector3(136, 6.2, -214),
      new THREE.Vector3(26, 2.8, -218),
      new THREE.Vector3(-48, 1.6, -172),
      new THREE.Vector3(-28, 0.7, -104),
    ],
    rampTCenters: [0.25, 0.72],
    boostPads: [
      { tCenter: 0.12, lateralOffset: -3.2, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.24, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.49, lateralOffset: 3.6, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.71, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.5, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.34, 0.56, 0.83],
    hazards: [
      { t: 0.38, lateralAmp: 7.2, speed: 1.8, kind: 'bumper' },
      { t: 0.62, lateralAmp: 6.4, speed: 2.1, kind: 'bumper' },
      { t: 0.87, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },
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
    timeTrialLimitSec: 120,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -28),
      new THREE.Vector3(0, 0.5, 86),
      new THREE.Vector3(54, 3.0, 166),
      new THREE.Vector3(148, 5.4, 168),
      new THREE.Vector3(204, 4.4, 88),
      new THREE.Vector3(196, 4.4, -18),
      new THREE.Vector3(188, 2.8, -118),
      new THREE.Vector3(122, 1.4, -192),
      new THREE.Vector3(22, 1.0, -196),
      new THREE.Vector3(-42, 1.2, -148),
      new THREE.Vector3(-22, 0.6, -88),
    ],
    rampTCenters: [0.34, 0.74],
    loopSegment: {
      tStart: 0.44,
      tEnd: 0.52,
      radius: 21,
      lateralShift: 44,
    },
    boostPads: [
      { tCenter: 0.13, lateralOffset: -3.5, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.33, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.425, lateralOffset: 0, width: 6.2, tHalfSpan: 0.014 },
      { tCenter: 0.73, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.8, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.09, 0.29, 0.59, 0.85],
    hazards: [
      { t: 0.22, lateralAmp: 7.2, speed: 1.9, kind: 'bumper' },
      { t: 0.66, lateralAmp: 7.5, speed: 2.2, kind: 'bumper' },
      { t: 0.81, lateralAmp: -3.0, speed: 0, kind: 'oil' },
    ],
  },
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
    timeTrialLimitSec: 130,
    controlPoints: [
      new THREE.Vector3(0, 6.0, -30),
      new THREE.Vector3(0, 6.0, 92),
      new THREE.Vector3(64, 10.6, 174),
      new THREE.Vector3(166, 13.4, 148),
      new THREE.Vector3(212, 9.5, 44),
      new THREE.Vector3(198, 5.2, -52),
      new THREE.Vector3(194, 4.2, -148),
      new THREE.Vector3(114, 7.6, -212),
      new THREE.Vector3(6, 11.2, -196),
      new THREE.Vector3(-48, 8.4, -144),
      new THREE.Vector3(-24, 6.2, -88),
    ],
    rampTCenters: [0.18, 0.56, 0.81],
    loopSegment: {
      tStart: 0.35,
      tEnd: 0.43,
      radius: 21,
      lateralShift: 44,
    },
    boostPads: [
      { tCenter: 0.16, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.335, lateralOffset: 0, width: 6.2, tHalfSpan: 0.014 },
      { tCenter: 0.55, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.79, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.93, lateralOffset: 3.0, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.27, 0.51, 0.71, 0.88],
    hazards: [
      { t: 0.23, lateralAmp: 7.5, speed: 2.1, kind: 'bumper' },
      { t: 0.63, lateralAmp: 6.8, speed: 2.0, kind: 'bumper' },
      { t: 0.74, lateralAmp: 3.0, speed: 0, kind: 'oil' },
    ],
  },
];

export function getMapById(id: MapId): MapDefinition {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
