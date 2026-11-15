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
    subtitle: 'Stone Archways · Palm Promenade · Resort Mall',
    theme: 'plaza',
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#e0f2fe',
    fogColor: '#bae6fd',
    fogDensity: 0.0012,
    groundTint: '#e7c68b',
    asphaltTint: '#ffffff',
    usePlazaRoad: true,
    dividerColor: '#f97316',
    controlPoints: [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, 95),
      new THREE.Vector3(52, 4.0, 170),
      new THREE.Vector3(142, 7.5, 175),
      new THREE.Vector3(205, 5.0, 102),
      new THREE.Vector3(188, 1.5, 10),
      new THREE.Vector3(148, 0.8, -68),
      new THREE.Vector3(178, 3.0, -148),
      new THREE.Vector3(96, 5.2, -196),
      new THREE.Vector3(12, 2.0, -172),
      new THREE.Vector3(-72, 0.8, -182),
      new THREE.Vector3(-152, 4.5, -132),
      new THREE.Vector3(-168, 7.2, -38),
      new THREE.Vector3(-114, 3.0, 36),
      new THREE.Vector3(-56, 1.0, -24),
      new THREE.Vector3(-24, 0.5, -82),
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
    subtitle: 'Suspension Bridges · Terracotta Pipes · Clear Sky',
    theme: 'sunlit',
    skyTop: '#0284c7',
    skyMid: '#38bdf8',
    skyHorizon: '#e0f2fe',
    fogColor: '#bae6fd',
    fogDensity: 0.0014,
    groundTint: '#4ade80',
    asphaltTint: '#d1d5db',
    usePlazaRoad: false,
    dividerColor: '#eab308',
    controlPoints: [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, 90),
      new THREE.Vector3(48, 4.5, 165),
      new THREE.Vector3(135, 9.5, 175),
      new THREE.Vector3(198, 7.0, 108),
      new THREE.Vector3(186, 2.0, 15),
      new THREE.Vector3(145, 0.8, -65),
      new THREE.Vector3(175, 3.5, -145),
      new THREE.Vector3(98, 6.0, -195),
      new THREE.Vector3(15, 2.5, -172),
      new THREE.Vector3(-68, 1.0, -182),
      new THREE.Vector3(-148, 4.8, -135),
      new THREE.Vector3(-165, 8.5, -42),
      new THREE.Vector3(-112, 3.5, 35),
      new THREE.Vector3(-58, 1.2, -25),
      new THREE.Vector3(-25, 0.5, -80),
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
    subtitle: 'Floodlit Arena · Banked Hairpins · Jumbotrons',
    theme: 'stadium',
    skyTop: '#0b1026',
    skyMid: '#1e295e',
    skyHorizon: '#f97316',
    fogColor: '#31234d',
    fogDensity: 0.0017,
    groundTint: '#23883f',
    asphaltTint: '#cbd5e1',
    usePlazaRoad: false,
    dividerColor: '#ef4444',
    controlPoints: [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 0.5, 86),
      new THREE.Vector3(40, 2.2, 152),
      new THREE.Vector3(118, 4.5, 168),
      new THREE.Vector3(184, 5.2, 118),
      new THREE.Vector3(176, 3.0, 40),
      new THREE.Vector3(136, 7.0, -25),
      new THREE.Vector3(165, 2.2, -108),
      new THREE.Vector3(112, 1.0, -172),
      new THREE.Vector3(32, 0.6, -158),
      new THREE.Vector3(-48, 0.5, -176),
      new THREE.Vector3(-128, 2.8, -138),
      new THREE.Vector3(-148, 5.6, -55),
      new THREE.Vector3(-108, 3.2, 22),
      new THREE.Vector3(-55, 1.4, -30),
      new THREE.Vector3(-24, 0.5, -76),
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
    subtitle: 'Multi-Tier Viaducts · Air Jumps · Nitro Chicanes',
    theme: 'skyline',
    skyTop: '#0369a1',
    skyMid: '#0ea5e9',
    skyHorizon: '#fde68a',
    fogColor: '#7dd3fc',
    fogDensity: 0.0013,
    groundTint: '#166534',
    asphaltTint: '#e2e8f0',
    usePlazaRoad: false,
    dividerColor: '#38bdf8',
    controlPoints: [
      new THREE.Vector3(0, 6.0, 0),
      new THREE.Vector3(0, 6.0, 95),
      new THREE.Vector3(65, 11.5, 168),
      new THREE.Vector3(160, 14.0, 140),
      new THREE.Vector3(195, 8.5, 45),
      new THREE.Vector3(145, 2.0, -40),
      new THREE.Vector3(175, 2.0, -135),
      new THREE.Vector3(90, 5.5, -195),
      new THREE.Vector3(-15, 11.0, -155),
      new THREE.Vector3(-115, 13.5, -175),
      new THREE.Vector3(-185, 8.0, -100),
      new THREE.Vector3(-165, 3.0, 5),
      new THREE.Vector3(-95, 5.5, 55),
      new THREE.Vector3(-55, 8.5, -20),
      new THREE.Vector3(-28, 6.5, -82),
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
