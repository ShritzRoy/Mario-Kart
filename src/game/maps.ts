import * as THREE from 'three';

export type MapId = 'plaza' | 'meadow' | 'stadium' | 'skyline';

export interface HazardZoneSpec {
  t: number;
  lateralAmp: number;
  speed: number;
  kind: 'bumper' | 'oil';
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
    timeTrialLimitSec: 120,
    // Broad, flowing, non-sharp sweeping curves with smooth elevation flow
    controlPoints: [
      new THREE.Vector3(0, 0.5, -20),
      new THREE.Vector3(0, 0.5, 78),
      new THREE.Vector3(58, 3.8, 165),
      new THREE.Vector3(165, 7.2, 162),
      new THREE.Vector3(224, 4.5, 66),
      new THREE.Vector3(186, 1.4, -36),
      new THREE.Vector3(198, 3.2, -138),
      new THREE.Vector3(114, 5.4, -202),
      new THREE.Vector3(8, 2.4, -184),
      new THREE.Vector3(-96, 1.2, -196),
      new THREE.Vector3(-186, 4.8, -126),
      new THREE.Vector3(-196, 7.2, -14),
      new THREE.Vector3(-130, 3.4, 62),
      new THREE.Vector3(-62, 1.2, 14),
      new THREE.Vector3(-24, 0.5, -96),
    ],
    rampTCenters: [0.22, 0.74],
    boostPads: [
      { tCenter: 0.12, lateralOffset: -3.4, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.21, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.48, lateralOffset: 3.6, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.73, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.6, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.09, 0.31, 0.54, 0.82],
    hazards: [
      { t: 0.38, lateralAmp: 7.5, speed: 1.8, kind: 'bumper' },
      { t: 0.62, lateralAmp: 6.5, speed: 2.1, kind: 'bumper' },
      { t: 0.86, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },
  {
    id: 'meadow',
    name: 'Sunlit Meadow Highway',
    subtitle: 'Flowing Ridge Curves · Canyon Rocks · Air Bridges',
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
    timeTrialLimitSec: 120,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -18),
      new THREE.Vector3(0, 0.5, 82),
      new THREE.Vector3(62, 4.8, 168),
      new THREE.Vector3(168, 9.2, 162),
      new THREE.Vector3(222, 6.2, 64),
      new THREE.Vector3(178, 1.8, -42),
      new THREE.Vector3(188, 3.6, -144),
      new THREE.Vector3(105, 6.2, -206),
      new THREE.Vector3(2, 2.4, -182),
      new THREE.Vector3(-98, 1.2, -194),
      new THREE.Vector3(-184, 5.2, -124),
      new THREE.Vector3(-192, 8.2, -12),
      new THREE.Vector3(-128, 3.8, 60),
      new THREE.Vector3(-60, 1.4, 8),
      new THREE.Vector3(-22, 0.5, -94),
    ],
    rampTCenters: [0.22, 0.74],
    boostPads: [
      { tCenter: 0.12, lateralOffset: -3.2, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.21, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.48, lateralOffset: 3.8, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.73, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.5, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.31, 0.55, 0.82],
    hazards: [
      { t: 0.38, lateralAmp: 7.5, speed: 1.8, kind: 'bumper' },
      { t: 0.62, lateralAmp: 6.5, speed: 2.2, kind: 'bumper' },
      { t: 0.86, lateralAmp: 0, speed: 0, kind: 'oil' },
    ],
  },
  {
    id: 'stadium',
    name: 'Coliseum Grand Prix',
    subtitle: 'Floodlit Bowl · Banked Arcs · Jumbotrons',
    theme: 'stadium',
    skyTop: '#0b1026',
    skyMid: '#1e295e',
    skyHorizon: '#f97316',
    fogColor: '#31234d',
    fogDensity: 0.0015,
    groundTint: '#23883f',
    asphaltTint: '#cbd5e1',
    usePlazaRoad: false,
    dividerColor: '#ef4444',
    timeTrialLimitSec: 115,
    controlPoints: [
      new THREE.Vector3(0, 0.5, -16),
      new THREE.Vector3(0, 0.5, 76),
      new THREE.Vector3(52, 2.8, 152),
      new THREE.Vector3(145, 5.2, 160),
      new THREE.Vector3(204, 4.8, 86),
      new THREE.Vector3(172, 6.2, -16),
      new THREE.Vector3(184, 2.8, -114),
      new THREE.Vector3(110, 1.2, -184),
      new THREE.Vector3(16, 0.8, -168),
      new THREE.Vector3(-82, 1.0, -182),
      new THREE.Vector3(-164, 3.4, -122),
      new THREE.Vector3(-174, 5.8, -22),
      new THREE.Vector3(-118, 3.2, 46),
      new THREE.Vector3(-56, 1.2, 2),
      new THREE.Vector3(-22, 0.5, -86),
    ],
    rampTCenters: [0.36, 0.74],
    boostPads: [
      { tCenter: 0.14, lateralOffset: -3.5, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.34, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.56, lateralOffset: 4.2, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.72, lateralOffset: 0, width: 5.5, tHalfSpan: 0.014 },
      { tCenter: 0.91, lateralOffset: -2.8, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.09, 0.28, 0.5, 0.68, 0.86],
    hazards: [
      { t: 0.22, lateralAmp: 7.5, speed: 2.0, kind: 'bumper' },
      { t: 0.64, lateralAmp: 8.0, speed: 2.4, kind: 'bumper' },
      { t: 0.44, lateralAmp: -3.5, speed: 0, kind: 'oil' },
    ],
  },
  {
    id: 'skyline',
    name: 'Skyline Overpass',
    subtitle: 'Elevated Viaducts · Air Jumps · Sweeping Loops',
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
    timeTrialLimitSec: 125,
    controlPoints: [
      new THREE.Vector3(0, 6.0, -18),
      new THREE.Vector3(0, 6.0, 84),
      new THREE.Vector3(68, 11.2, 166),
      new THREE.Vector3(172, 14.0, 134),
      new THREE.Vector3(212, 8.2, 28),
      new THREE.Vector3(156, 2.4, -56),
      new THREE.Vector3(180, 3.2, -148),
      new THREE.Vector3(88, 6.2, -204),
      new THREE.Vector3(-22, 11.2, -162),
      new THREE.Vector3(-126, 13.5, -172),
      new THREE.Vector3(-198, 8.2, -88),
      new THREE.Vector3(-174, 3.5, 18),
      new THREE.Vector3(-102, 5.8, 62),
      new THREE.Vector3(-54, 7.6, -10),
      new THREE.Vector3(-24, 6.2, -96),
    ],
    rampTCenters: [0.18, 0.52, 0.81],
    boostPads: [
      { tCenter: 0.16, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.36, lateralOffset: -3.5, width: 4.8, tHalfSpan: 0.013 },
      { tCenter: 0.51, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.79, lateralOffset: 0, width: 5.5, tHalfSpan: 0.015 },
      { tCenter: 0.93, lateralOffset: 3.0, width: 4.8, tHalfSpan: 0.013 },
    ],
    itemRowTs: [0.08, 0.29, 0.47, 0.69, 0.88],
    hazards: [
      { t: 0.27, lateralAmp: 8.0, speed: 2.3, kind: 'bumper' },
      { t: 0.61, lateralAmp: 7.0, speed: 2.1, kind: 'bumper' },
      { t: 0.74, lateralAmp: 3.0, speed: 0, kind: 'oil' },
    ],
  },
];

export function getMapById(id: MapId): MapDefinition {
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}
