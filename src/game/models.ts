import * as THREE from 'three';
import type { ItemKind } from '../shared/protocol.ts';
import type { RacerSpec } from './roster.ts';
import { createEmblemTexture, type ProceduralTextureSet } from './textures.ts';
import { getVehicleById, type VehicleId, type VehicleSpec } from './vehicles.ts';

export interface KartVisualRig {
  root: THREE.Group;
  kartBodyGroup: THREE.Group;
  driverGroup: THREE.Group;
  headGroup: THREE.Group;
  steeringWheel: THREE.Object3D;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  exhaustTips: THREE.Vector3[];
  exhaustFlames: THREE.Mesh[];
  hoverRotors: THREE.Object3D[];
  starHologramGroup: THREE.Group;
  pBalloonGroup: THREE.Group;
  balloonMeshes: THREE.Mesh[];
  bellClawsGroup: THREE.Group;
  drillNoseMesh: THREE.Group;
  cannonBoxMesh: THREE.Group;
  cloudHalo: THREE.Group;
  cloneGhostGroup: THREE.Group;
  heldItemMount: THREE.Group;
  heldItemMeshes: Record<Exclude<ItemKind, 'none'>, THREE.Group>;
  underglowMat: THREE.MeshBasicMaterial;
  paintMat: THREE.MeshPhysicalMaterial;
  isTwoWheel: boolean;
  dispose: () => void;
}

interface SharedKartGeos {
  shadowGeo: THREE.PlaneGeometry;
  panGeo: THREE.BoxGeometry;
  glowGeo: THREE.BoxGeometry;
  noseGeo: THREE.BoxGeometry;
  grilleGeo: THREE.BoxGeometry;
  headRingGeo: THREE.TorusGeometry;
  headLensGeo: THREE.SphereGeometry;
  shieldGeo: THREE.CylinderGeometry;
  emblemGeo: THREE.CylinderGeometry;
  podGeo: THREE.CapsuleGeometry;
  engineGeo: THREE.BoxGeometry;
  wingGeo: THREE.BoxGeometry;
  strutGeo: THREE.BoxGeometry;
  exGeo: THREE.LatheGeometry;
  seatGeo: THREE.BoxGeometry;
  colGeo: THREE.CylinderGeometry;
  wheelRimGeo: THREE.TorusGeometry;
  hullStandard: THREE.ExtrudeGeometry;
  hullMach: THREE.ExtrudeGeometry;
  hullOffroad: THREE.ExtrudeGeometry;
  hullHover: THREE.ExtrudeGeometry;
}

let sharedGeos: SharedKartGeos | null = null;

function makeHullGeo(kind: 'standard' | 'mach' | 'offroad' | 'hover'): THREE.ExtrudeGeometry {
  const hullShape = new THREE.Shape();
  if (kind === 'mach') {
    hullShape.moveTo(-0.58, -1.32);
    hullShape.lineTo(0.58, -1.32);
    hullShape.lineTo(0.68, -0.25);
    hullShape.lineTo(0.52, 1.38);
    hullShape.lineTo(-0.52, 1.38);
    hullShape.lineTo(-0.68, -0.25);
  } else if (kind === 'offroad') {
    hullShape.moveTo(-0.74, -1.24);
    hullShape.lineTo(0.74, -1.24);
    hullShape.lineTo(0.78, 0.32);
    hullShape.lineTo(0.56, 1.26);
    hullShape.lineTo(-0.56, 1.26);
    hullShape.lineTo(-0.78, 0.32);
  } else if (kind === 'hover') {
    hullShape.moveTo(-0.52, -1.32);
    hullShape.lineTo(0.52, -1.32);
    hullShape.lineTo(0.74, -0.25);
    hullShape.lineTo(0.42, 1.36);
    hullShape.lineTo(0, 1.54);
    hullShape.lineTo(-0.42, 1.36);
    hullShape.lineTo(-0.74, -0.25);
  } else {
    hullShape.moveTo(-0.62, -1.24);
    hullShape.lineTo(0.62, -1.24);
    hullShape.lineTo(0.7, 0.12);
    hullShape.lineTo(0.46, 1.28);
    hullShape.lineTo(-0.46, 1.28);
    hullShape.lineTo(-0.7, 0.12);
  }
  hullShape.closePath();

  const geo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.07,
    bevelSegments: 4,
  });
  geo.rotateX(Math.PI / 2);
  return geo;
}

function getSharedGeos(): SharedKartGeos {
  if (sharedGeos) return sharedGeos;

  const shadowGeo = new THREE.PlaneGeometry(2.7, 3.6);
  shadowGeo.rotateX(-Math.PI / 2);

  const podGeo = new THREE.CapsuleGeometry(0.14, 1.05, 6, 12);
  podGeo.rotateX(Math.PI / 2);

  const exPts = [
    new THREE.Vector2(0.08, 0),
    new THREE.Vector2(0.115, 0.28),
    new THREE.Vector2(0.185, 0.6),
    new THREE.Vector2(0.148, 0.61),
    new THREE.Vector2(0.072, 0.28),
  ];
  const exGeo = new THREE.LatheGeometry(exPts, 18);
  exGeo.rotateX(-Math.PI / 2 - 0.34);

  const colGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.35, 10);
  colGeo.rotateX(Math.PI / 2);

  sharedGeos = {
    shadowGeo,
    panGeo: new THREE.BoxGeometry(1.28, 0.08, 2.42),
    glowGeo: new THREE.BoxGeometry(1.34, 0.04, 2.18),
    noseGeo: new THREE.BoxGeometry(0.96, 0.14, 0.42),
    grilleGeo: new THREE.BoxGeometry(0.48, 0.2, 0.08),
    headRingGeo: new THREE.TorusGeometry(0.105, 0.022, 8, 18),
    headLensGeo: new THREE.SphereGeometry(0.09, 12, 10),
    shieldGeo: new THREE.CylinderGeometry(0.48, 0.52, 0.28, 20, 1, true, -Math.PI * 0.36, Math.PI * 0.72),
    emblemGeo: new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24),
    podGeo,
    engineGeo: new THREE.BoxGeometry(0.76, 0.42, 0.58),
    wingGeo: new THREE.BoxGeometry(1.52, 0.07, 0.35),
    strutGeo: new THREE.BoxGeometry(0.08, 0.38, 0.16),
    exGeo,
    seatGeo: new THREE.BoxGeometry(0.7, 0.68, 0.22),
    colGeo,
    wheelRimGeo: new THREE.TorusGeometry(0.18, 0.032, 10, 24),
    hullStandard: makeHullGeo('standard'),
    hullMach: makeHullGeo('mach'),
    hullOffroad: makeHullGeo('offroad'),
    hullHover: makeHullGeo('hover'),
  };
  return sharedGeos;
}

export function buildMushroomItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.46, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    new THREE.MeshPhysicalMaterial({ color: '#ef4444', roughness: 0.22, clearcoat: 1.0 })
  );
  cap.position.y = 0.28;
  g.add(cap);

  const spotGeo = new THREE.SphereGeometry(0.13, 10, 10);
  const spotMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  [
    [0, 0.5, 0.28],
    [0, 0.5, -0.28],
    [0.3, 0.44, 0],
    [-0.3, 0.44, 0],
  ].forEach(([sx, sy, sz]) => {
    const sp = new THREE.Mesh(spotGeo, spotMat);
    sp.position.set(sx, sy, sz);
    g.add(sp);
  });

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.27, 0.36, 14),
    new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.45 })
  );
  stem.position.y = 0.16;
  g.add(stem);
  return g;
}

export function buildStarItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.54 : 0.24;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const geo = new THREE.ExtrudeGeometry(starShape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 2,
  });
  geo.center();
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#facc15',
    emissive: '#f59e0b',
    emissiveIntensity: 0.45,
    roughness: 0.16,
    metalness: 0.3,
    clearcoat: 1.0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.48;
  g.add(mesh);

  const eyeGeo = new THREE.CapsuleGeometry(0.032, 0.09, 4, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: '#0f172a' });
  [-0.1, 0.1].forEach((ex) => {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.position.set(ex, 0.52, 0.13);
    g.add(e);
  });
  return g;
}

export function buildKartAndDriver(
  spec: RacerSpec,
  textures: ProceduralTextureSet,
  castShadow = true,
  vehicleId: VehicleId = 'standard_kart'
): KartVisualRig {
  const vSpec: VehicleSpec = getVehicleById(vehicleId);
  const isTwoWheel = vSpec.wheelLayout === 'two';

  const root = new THREE.Group();
  const geos = getSharedGeos();
  const localDisposables: { dispose: () => void }[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    localDisposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    localDisposables.push(m);
    return m;
  };

  // Contact shadow disc
  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  const shadowPlane = new THREE.Mesh(geos.shadowGeo, shadowMat);
  shadowPlane.position.y = 0.02;
  if (isTwoWheel) shadowPlane.scale.set(0.6, 1, 1);
  root.add(shadowPlane);

  const kartBodyGroup = new THREE.Group();
  // Larger, bolder kart silhouette matching Nintendo Mario Kart proportions
  kartBodyGroup.scale.setScalar(isTwoWheel ? 1.1 : 1.15);
  root.add(kartBodyGroup);

  // Vehicle Paint Palette: blend signature character paint with iconic vehicle style
  const bodyPrimaryHex =
    vSpec.id === 'standard_kart'
      ? spec.primaryColor
      : vSpec.id === 'gold_standard'
      ? '#eab308'
      : vSpec.bodyTintHex;
  const bodySecondaryHex = vSpec.id === 'standard_kart' ? spec.secondaryColor : vSpec.accentHex;

  const paintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: bodyPrimaryHex,
      metalness: vSpec.id === 'gold_standard' ? 0.85 : 0.54,
      roughness: vSpec.id === 'gold_standard' ? 0.14 : 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.38,
    })
  );

  const secondaryPaintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: bodySecondaryHex,
      metalness: 0.3,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.25,
    })
  );

  const creamMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#f8fafc',
      metalness: 0.15,
      roughness: 0.26,
      clearcoat: 0.8,
    })
  );

  const carbonMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#18181b',
      metalness: 0.38,
      roughness: 0.62,
      bumpMap: textures.carbonBump,
      bumpScale: 0.015,
    })
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      metalness: 0.96,
      roughness: 0.09,
      envMapIntensity: 1.5,
    })
  );

  const glassMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.45,
      clearcoat: 1.0,
      envMapIntensity: 1.4,
    })
  );

  const underglowMat = trackMat(new THREE.MeshBasicMaterial({ color: spec.neonColor }));
  const headlightMat = trackMat(new THREE.MeshBasicMaterial({ color: '#fef9c3' }));

  const emblemTex = createEmblemTexture(spec.emblem, spec.primaryColor, spec.accentColor);
  localDisposables.push(emblemTex);
  const emblemMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: emblemTex,
      roughness: 0.24,
      metalness: 0.12,
    })
  );

  // Wheel builder helper
  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.tireTreadMap,
      bumpMap: textures.tireTreadBump,
      bumpScale: 0.036,
      roughness: 0.78,
      metalness: 0.06,
    })
  );
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: vSpec.id === 'gold_standard' ? '#fef08a' : vSpec.accentHex,
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.4,
    })
  );

  const makeWheel = (radius: number, width: number) => {
    const wGroup = new THREE.Group();
    const tireGeo = trackGeo(new THREE.CylinderGeometry(radius, radius, width * 0.82, 28));
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = castShadow;
    wGroup.add(tire);

    const shoulderGeo = trackGeo(new THREE.TorusGeometry(radius * 0.84, radius * 0.16, 10, 28));
    shoulderGeo.rotateY(Math.PI / 2);
    [-width * 0.36, width * 0.36].forEach((sx) => {
      const sh = new THREE.Mesh(shoulderGeo, tireMat);
      sh.position.x = sx;
      wGroup.add(sh);
    });

    const rimGeo = trackGeo(new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.01, 20));
    rimGeo.rotateZ(Math.PI / 2);
    wGroup.add(new THREE.Mesh(rimGeo, rimMat));

    const hubGeo = trackGeo(new THREE.CylinderGeometry(radius * 0.23, radius * 0.23, width + 0.05, 14));
    hubGeo.rotateZ(Math.PI / 2);
    wGroup.add(new THREE.Mesh(hubGeo, chromeMat));

    const spokeGeo = trackGeo(new THREE.BoxGeometry(width + 0.03, radius * 1.05, radius * 0.12));
    for (let s = 0; s < 3; s++) {
      const sp = new THREE.Mesh(spokeGeo, chromeMat);
      sp.rotation.x = (s / 3) * Math.PI;
      wGroup.add(sp);
    }
    return wGroup;
  };

  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];
  const hoverRotors: THREE.Object3D[] = [];
  const exhaustTips: THREE.Vector3[] = [];
  const exhaustFlames: THREE.Mesh[] = [];
  const flameConeGeo = trackGeo(new THREE.ConeGeometry(0.24, 1.35, 14, 1, true));
  flameConeGeo.rotateX(-Math.PI / 2);
  flameConeGeo.translate(0, 0, -0.68);

  const flameCoreGeo = trackGeo(new THREE.ConeGeometry(0.12, 0.85, 10));
  flameCoreGeo.rotateX(-Math.PI / 2);
  flameCoreGeo.translate(0, 0, -0.44);

  const exhaustGunmetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.82,
      roughness: 0.24,
      envMapIntensity: 1.35,
    })
  );
  const exhaustGoldRimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      metalness: 0.78,
      roughness: 0.18,
      emissive: '#ca8a04',
      emissiveIntensity: 0.18,
    })
  );
  const exhaustRimGeo = trackGeo(new THREE.TorusGeometry(0.172, 0.036, 10, 20));
  const kartWorldScale = isTwoWheel ? 1.1 : 1.15;

  const addExhaustPair = (positions: [number, number, number][], scale = 1.18) => {
    positions.forEach(([x, y, z]) => {
      const pipeGroup = new THREE.Group();
      pipeGroup.position.set(x, y, z);
      pipeGroup.rotation.y = x < 0 ? 0.16 : -0.16;
      pipeGroup.scale.setScalar(scale);

      const pipe = new THREE.Mesh(geos.exGeo, exhaustGunmetalMat);
      pipe.castShadow = castShadow;
      pipeGroup.add(pipe);

      // Prominent bright yellow/gold flared collar tip matching Image 3
      const collar = new THREE.Mesh(exhaustRimGeo, exhaustGoldRimMat);
      collar.position.set(0, 0.19, -0.56);
      collar.rotation.x = -0.34;
      pipeGroup.add(collar);

      kartBodyGroup.add(pipeGroup);
      exhaustTips.push(
        new THREE.Vector3(
          x * kartWorldScale,
          (y + 0.19 * scale) * kartWorldScale,
          (z - 0.58 * scale) * kartWorldScale
        )
      );

      const fMat = trackMat(
        new THREE.MeshBasicMaterial({
          map: textures.nitroFlameMap,
          color: '#38bdf8',
          transparent: true,
          opacity: 0.94,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      const flame = new THREE.Mesh(flameConeGeo, fMat);
      flame.position.set(0, 0.19, -0.54);
      flame.rotation.x = 0.24;
      flame.visible = false;

      const coreMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: '#e0f2fe',
          transparent: true,
          opacity: 0.96,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      const innerCore = new THREE.Mesh(flameCoreGeo, coreMat);
      flame.add(innerCore);

      pipeGroup.add(flame);
      exhaustFlames.push(flame);
    });
  };

  let seatY = 0.67;
  let seatZ = -0.06;
  let steeringPivot = new THREE.Group();

  if (isTwoWheel) {
    // ================= 2-WHEEL MOTORCYCLES & SCOOTERS =================
    const isScooter = vSpec.id === 'bumble_scooter';
    const isChopper = vSpec.id === 'pipe_chopper';
    const isDirt = vSpec.id === 'rally_dirt_bike';
    const isSuper = vSpec.id === 'apex_superbike';

    seatY = isScooter ? 0.74 : 0.76;
    seatZ = -0.14;

    // Central Frame Spine & Underglow
    const spine = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.28, 1.55)), carbonMat);
    spine.position.set(0, 0.46, 0);
    spine.castShadow = castShadow;
    kartBodyGroup.add(spine);

    const bikeGlow = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.34, 0.04, 1.5)), underglowMat);
    bikeGlow.position.set(0, 0.22, 0);
    kartBodyGroup.add(bikeGlow);

    if (isScooter) {
      // Step-through scooter apron, floorboard, round headlight & rear luggage box
      const apron = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.62, 0.22)), paintMat);
      apron.position.set(0, 0.68, 0.68);
      apron.rotation.x = -0.22;
      kartBodyGroup.add(apron);

      const floorDeck = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.08, 0.85)), creamMat);
      floorDeck.position.set(0, 0.34, 0.22);
      kartBodyGroup.add(floorDeck);

      const rearBody = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 16, 12)), paintMat);
      rearBody.scale.set(0.75, 0.8, 1.4);
      rearBody.position.set(0, 0.58, -0.58);
      kartBodyGroup.add(rearBody);

      const trunk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.3, 0.36)), creamMat);
      trunk.position.set(0, 0.88, -0.92);
      kartBodyGroup.add(trunk);
    } else {
      // Sculpted fuel tank & engine block
      const engineBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.36, 0.5)), chromeMat);
      engineBlock.position.set(0, 0.48, 0.02);
      kartBodyGroup.add(engineBlock);

      const tank = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.28, 16, 14)), paintMat);
      tank.scale.set(0.88, 0.72, 1.45);
      tank.position.set(0, 0.84, 0.26);
      tank.castShadow = castShadow;
      kartBodyGroup.add(tank);

      const tail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.16, 0.75)), paintMat);
      tail.position.set(0, 0.78, -0.66);
      tail.rotation.x = 0.16;
      kartBodyGroup.add(tail);

      if (isSuper) {
        // Aerodynamic GP front fairing + tinted bubble windscreen
        const fairing = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 18, 14)), paintMat);
        fairing.scale.set(0.9, 0.95, 1.5);
        fairing.position.set(0, 0.78, 0.68);
        kartBodyGroup.add(fairing);

        const bubble = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.28, 14, 12)), glassMat);
        bubble.scale.set(0.88, 0.7, 1.2);
        bubble.position.set(0, 1.04, 0.65);
        kartBodyGroup.add(bubble);
      } else if (isDirt) {
        // High dirt-bike front beak fender + number plate
        const beak = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.08, 0.56)), secondaryPaintMat);
        beak.position.set(0, 0.78, 0.94);
        beak.rotation.x = 0.2;
        kartBodyGroup.add(beak);
      }
    }

    // Saddle Seat
    const saddle = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.18, 0.46, 6, 12)), carbonMat);
    saddle.rotation.x = Math.PI / 2;
    saddle.position.set(0, 0.76, -0.25);
    kartBodyGroup.add(saddle);

    // Front Steering Fork Pivot + Single Front Wheel + Handlebar
    const frontPivot = new THREE.Group();
    frontPivot.position.set(0, vSpec.tireRadiusFront, 0.92);
    const fw = makeWheel(vSpec.tireRadiusFront, 0.26);
    frontPivot.add(fw);

    const forkTubeGeo = trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.85, 8));
    [-0.17, 0.17].forEach((fx) => {
      const fork = new THREE.Mesh(forkTubeGeo, chromeMat);
      fork.position.set(fx, 0.36, -0.14);
      fork.rotation.x = isChopper ? -0.45 : -0.28;
      frontPivot.add(fork);
    });
    const bikeLamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 12, 10)), headlightMat);
    bikeLamp.position.set(0, 0.56, 0.02);
    frontPivot.add(bikeLamp);

    kartBodyGroup.add(frontPivot);
    frontSteerPivots.push(frontPivot);
    wheels.push(fw);

    // Single Rear Wheel + Swingarm
    const rw = makeWheel(vSpec.tireRadiusRear, 0.34);
    rw.position.set(0, vSpec.tireRadiusRear, -0.88);
    kartBodyGroup.add(rw);
    wheels.push(rw);

    // Handlebar Pivot
    steeringPivot = new THREE.Group();
    steeringPivot.position.set(0, 0.98, 0.54);
    const bar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.68, 10)), chromeMat);
    bar.rotation.z = Math.PI / 2;
    steeringPivot.add(bar);
    const gripGeo = trackGeo(new THREE.CylinderGeometry(0.038, 0.038, 0.16, 8));
    [-0.31, 0.31].forEach((gx) => {
      const grip = new THREE.Mesh(gripGeo, carbonMat);
      grip.rotation.z = Math.PI / 2;
      grip.position.x = gx;
      steeringPivot.add(grip);
    });
    kartBodyGroup.add(steeringPivot);

    addExhaustPair([[-0.22, 0.56, -0.86], [0.22, 0.56, -0.86]], 0.82);
  } else {
    // ================= 4-WHEEL KARTS, ROADSTERS, MONSTER 4x4, TRIKE & HOVER =================
    const isOffroad = vSpec.id === 'monster_truck';
    const isMach = vSpec.id === 'mach_convertible' || vSpec.id === 'arcade_racer';
    const isPipe = vSpec.id === 'pipe_frame';
    const isRally = vSpec.id === 'rally_coupe';
    const isBubble = vSpec.id === 'bubble_bug';
    const isHover = vSpec.wheelLayout === 'hover';
    const isTrike = vSpec.wheelLayout === 'trike';

    const liftY = isOffroad ? 0.24 : 0;
    seatY = 0.67 + liftY;

    // 1. Sculpted Hull
    const hullGeo = isHover
      ? geos.hullHover
      : isMach
      ? geos.hullMach
      : isOffroad
      ? geos.hullOffroad
      : geos.hullStandard;

    if (!isPipe) {
      const hullMesh = new THREE.Mesh(hullGeo, paintMat);
      hullMesh.position.y = 0.64 + liftY;
      hullMesh.castShadow = castShadow;
      hullMesh.receiveShadow = true;
      kartBodyGroup.add(hullMesh);
    } else {
      // Pipe Frame open tubular chassis rails
      const railGeo = trackGeo(new THREE.CapsuleGeometry(0.08, 1.9, 6, 10));
      railGeo.rotateX(Math.PI / 2);
      [-0.56, 0.56].forEach((rx) => {
        const rail = new THREE.Mesh(railGeo, paintMat);
        rail.position.set(rx, 0.45, 0);
        rail.castShadow = castShadow;
        kartBodyGroup.add(rail);
      });
      const frontLoop = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.46, 0.08, 8, 16, Math.PI)), paintMat);
      frontLoop.rotation.x = Math.PI / 2;
      frontLoop.position.set(0, 0.45, 1.0);
      kartBodyGroup.add(frontLoop);
    }

    // 2. Carbon Floor Pan + Underglow
    const panMesh = new THREE.Mesh(geos.panGeo, carbonMat);
    panMesh.position.set(0, 0.27 + liftY, 0);
    panMesh.castShadow = castShadow;
    kartBodyGroup.add(panMesh);

    const glowMesh = new THREE.Mesh(geos.glowGeo, underglowMat);
    glowMesh.position.set(0, 0.23 + liftY * 0.5, 0);
    kartBodyGroup.add(glowMesh);

    // 3. Vehicle-Specific Sculptural Differentiation Across All 16 Models
    if (vSpec.id === 'standard_kart') {
      // Iconic Mario Kart Standard Kart (Image 3): white ribbed floorwell trim, padded red armrests, sculpted bumper apron
      const apron = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.18, 0.18, 0.45)), creamMat);
      apron.position.set(0, 0.38, 1.15);
      kartBodyGroup.add(apron);

      const armGeo = trackGeo(new THREE.BoxGeometry(0.24, 0.18, 0.72));
      [-0.56, 0.56].forEach((ax) => {
        const arm = new THREE.Mesh(armGeo, paintMat);
        arm.position.set(ax, 0.74, -0.12);
        arm.castShadow = castShadow;
        kartBodyGroup.add(arm);
      });
    } else if (vSpec.id === 'gold_standard') {
      // Gold Standard: jeweled royal crown fin + twin gold side louvers
      const jewelNose = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 0)), secondaryPaintMat);
      jewelNose.position.set(0, 0.64, 1.38);
      kartBodyGroup.add(jewelNose);
      const wingCrown = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.26, 0.045, 8, 16, Math.PI)), chromeMat);
      wingCrown.position.set(0, 1.24, -1.16);
      kartBodyGroup.add(wingCrown);
    } else if (vSpec.id === 'pipe_frame') {
      // Exposed twin-cylinder chrome engine ribs & braided tubular rollover loop
      const cylGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.34, 12));
      [-0.22, 0.22].forEach((cx) => {
        const cyl = new THREE.Mesh(cylGeo, chromeMat);
        cyl.position.set(cx, 0.96, -0.88);
        cyl.rotation.z = cx > 0 ? -0.35 : 0.35;
        kartBodyGroup.add(cyl);
      });
    } else if (isBubble) {
      // Cloud Coupe: oversized bubbly rounded hood & retro spherical tail pods
      const hood = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.68, 20, 16)), paintMat);
      hood.scale.set(1.08, 0.74, 1.32);
      hood.position.set(0, 0.7, 0.62);
      kartBodyGroup.add(hood);
      const dome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.62, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.45)), glassMat);
      dome.position.set(0, 1.05, 0.1);
      kartBodyGroup.add(dome);
    } else if (isRally) {
      // Roof intake scoop & quad front fog lamps + tall GT rear spoiler
      const roof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.14, 0.72)), paintMat);
      roof.position.set(0, 1.48, -0.35);
      kartBodyGroup.add(roof);
      const scoop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.14, 0.34)), secondaryPaintMat);
      scoop.position.set(0, 1.58, -0.25);
      kartBodyGroup.add(scoop);

      [-0.42, -0.15, 0.15, 0.42].forEach((fx) => {
        const fog = new THREE.Mesh(geos.headLensGeo, headlightMat);
        fog.position.set(fx, 0.52, 1.38);
        kartBodyGroup.add(fog);
      });
    } else if (isOffroad) {
      // Monster 4x4 Front Bullbar + Tubular Rollbar w/ Offroad Spot Lights
      const bullbar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.48, 0.06, 8, 16, Math.PI)), chromeMat);
      bullbar.position.set(0, 0.68, 1.34);
      kartBodyGroup.add(bullbar);

      const rollBar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.56, 0.06, 8, 16, Math.PI)), chromeMat);
      rollBar.position.set(0, 1.22, -0.45);
      kartBodyGroup.add(rollBar);
      [-0.25, 0.25].forEach((lx) => {
        const spot = new THREE.Mesh(geos.headLensGeo, headlightMat);
        spot.position.set(lx, 1.76, -0.42);
        kartBodyGroup.add(spot);
      });
    } else if (vSpec.id === 'arcade_racer') {
      // Arcade GT: F1 multi-plane front aero splitter + stepped shark fin
      const fWing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.74, 0.08, 0.36)), secondaryPaintMat);
      fWing.position.set(0, 0.3, 1.44);
      kartBodyGroup.add(fWing);
      const shark = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.44, 0.72)), paintMat);
      shark.position.set(0, 1.05, -0.82);
      kartBodyGroup.add(shark);
    } else if (vSpec.id === 'star_cruiser') {
      // Star Cruiser: swept delta starfighter wings + violet plasma halo
      [-0.92, 0.92].forEach((wx) => {
        const w = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.08, 1.15)), paintMat);
        w.position.set(wx, 0.52, -0.18);
        w.rotation.y = wx > 0 ? -0.35 : 0.35;
        w.rotation.z = wx > 0 ? 0.16 : -0.16;
        kartBodyGroup.add(w);
      });
    } else if (isMach) {
      // Retro Convertible Wide Fin Trim + Cream Bumper
      const finGeo = trackGeo(new THREE.BoxGeometry(0.12, 0.42, 0.82));
      [-0.58, 0.58].forEach((fx) => {
        const fin = new THREE.Mesh(finGeo, paintMat);
        fin.position.set(fx, 0.85, -0.92);
        fin.rotation.x = -0.18;
        kartBodyGroup.add(fin);
      });
      const whiteBumper = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.36, 0.16, 0.2)), creamMat);
      whiteBumper.position.set(0, 0.38, 1.42);
      kartBodyGroup.add(whiteBumper);
    }

    // Standard Nose, Grille, Headlights, Windshield, Hood Emblem
    const noseMesh = new THREE.Mesh(geos.noseGeo, secondaryPaintMat);
    noseMesh.position.set(0, 0.43 + liftY, 1.26);
    noseMesh.rotation.x = 0.14;
    noseMesh.castShadow = castShadow;
    kartBodyGroup.add(noseMesh);

    const grilleFrame = new THREE.Mesh(geos.grilleGeo, chromeMat);
    grilleFrame.position.set(0, 0.47 + liftY, 1.38);
    kartBodyGroup.add(grilleFrame);

    [-0.38, 0.38].forEach((x) => {
      const ring = new THREE.Mesh(geos.headRingGeo, chromeMat);
      ring.position.set(x, 0.54 + liftY, 1.26);
      ring.rotation.y = x > 0 ? 0.2 : -0.2;
      kartBodyGroup.add(ring);
      const lens = new THREE.Mesh(geos.headLensGeo, headlightMat);
      lens.position.set(x, 0.54 + liftY, 1.24);
      lens.scale.set(1, 1, 0.55);
      kartBodyGroup.add(lens);
    });

    const shield = new THREE.Mesh(geos.shieldGeo, glassMat);
    shield.position.set(0, 0.78 + liftY, 0.44);
    shield.rotation.x = -0.35;
    kartBodyGroup.add(shield);

    const emblemMesh = new THREE.Mesh(geos.emblemGeo, emblemMat);
    emblemMesh.position.set(0, 0.72 + liftY, 0.88);
    emblemMesh.rotation.x = 0.14;
    kartBodyGroup.add(emblemMesh);

    // Side Pods (or Hydro Hover pontoons)
    [-0.74, 0.74].forEach((x) => {
      const pod = new THREE.Mesh(geos.podGeo, secondaryPaintMat);
      pod.position.set(x, 0.44 + liftY, 0.02);
      pod.scale.set(isHover ? 1.4 : 1, isHover ? 1.3 : 1, isHover ? 1.35 : 1);
      pod.castShadow = castShadow;
      kartBodyGroup.add(pod);
    });

    // Rear Engine & Spoiler Wing (or Twin Ducted Fan Turbines on Hydro Hovercraft)
    const engineMesh = new THREE.Mesh(geos.engineGeo, carbonMat);
    engineMesh.position.set(0, 0.76 + liftY, -0.94);
    engineMesh.castShadow = castShadow;
    kartBodyGroup.add(engineMesh);

    if (isHover) {
      const shroudGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.36, 18, 1, true));
      shroudGeo.rotateX(Math.PI / 2);
      const bladeGeo = trackGeo(new THREE.BoxGeometry(0.48, 0.06, 0.03));
      [-0.44, 0.44].forEach((fx) => {
        const shroud = new THREE.Mesh(shroudGeo, paintMat);
        shroud.position.set(fx, 1.08, -1.04);
        kartBodyGroup.add(shroud);

        const rotor = new THREE.Group();
        rotor.position.set(fx, 1.08, -1.04);
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(bladeGeo, chromeMat);
          blade.rotation.z = (b / 3) * Math.PI;
          rotor.add(blade);
        }
        kartBodyGroup.add(rotor);
        hoverRotors.push(rotor);
      });
      addExhaustPair([[-0.44, 0.94, -1.06], [0.44, 0.94, -1.06]], 1.15);
    } else {
      const wingMesh = new THREE.Mesh(geos.wingGeo, paintMat);
      wingMesh.position.set(0, (isRally ? 1.38 : 1.2) + liftY, -1.16);
      wingMesh.rotation.x = -0.18;
      wingMesh.castShadow = castShadow;
      kartBodyGroup.add(wingMesh);

      [-0.38, 0.38].forEach((x) => {
        const strut = new THREE.Mesh(geos.strutGeo, carbonMat);
        strut.position.set(x, (isRally ? 1.09 : 0.99) + liftY, -1.1);
        kartBodyGroup.add(strut);
      });
      addExhaustPair([[-0.34, 0.84 + liftY, -1.06], [0.34, 0.84 + liftY, -1.06]], 1.26);
    }

    // Seat & Steering Wheel
    const seatBack = new THREE.Mesh(geos.seatGeo, carbonMat);
    seatBack.position.set(0, 0.92 + liftY, -0.35);
    seatBack.rotation.x = -0.22;
    kartBodyGroup.add(seatBack);

    steeringPivot = new THREE.Group();
    steeringPivot.position.set(0, 0.89 + liftY, 0.43);
    steeringPivot.rotation.x = -0.52;
    kartBodyGroup.add(steeringPivot);

    const col = new THREE.Mesh(geos.colGeo, chromeMat);
    col.position.z = -0.14;
    steeringPivot.add(col);
    steeringPivot.add(new THREE.Mesh(geos.wheelRimGeo, carbonMat));

    // Wheels
    const wheelRFront = vSpec.tireRadiusFront;
    const wheelRRear = vSpec.tireRadiusRear;
    if (isTrike) {
      const pivot = new THREE.Group();
      pivot.position.set(0, wheelRFront, 0.92);
      const fw = makeWheel(wheelRFront, 0.32);
      pivot.add(fw);
      kartBodyGroup.add(pivot);
      frontSteerPivots.push(pivot);
      wheels.push(fw);
    } else {
      [-0.88, 0.88].forEach((x) => {
        const pivot = new THREE.Group();
        pivot.position.set(x, wheelRFront, 0.84);
        const w = makeWheel(wheelRFront, isOffroad ? 0.4 : 0.3);
        pivot.add(w);
        kartBodyGroup.add(pivot);
        frontSteerPivots.push(pivot);
        wheels.push(w);
      });
    }

    [-0.94, 0.94].forEach((x) => {
      const w = makeWheel(wheelRRear, isOffroad ? 0.46 : 0.38);
      w.position.set(x, wheelRRear, -0.84);
      kartBodyGroup.add(w);
      wheels.push(w);
    });
  }

  // ==================== RAINBOW HOLOGRAM SPHERE + ABILITY RIGS + TRAILING ITEM MOUNT ====================
  // 1) Superstar Rainbow Hologram Sphere around Kart + Driver
  const starHologramGroup = new THREE.Group();
  starHologramGroup.position.set(0, 1.08, 0);
  starHologramGroup.visible = false;

  const holoWireGeo = trackGeo(new THREE.IcosahedronGeometry(1.96, 2));
  const holoWireMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#facc15',
      wireframe: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  const holoWire = new THREE.Mesh(holoWireGeo, holoWireMat);
  starHologramGroup.add(holoWire);

  const holoShellGeo = trackGeo(new THREE.SphereGeometry(1.88, 24, 18));
  const holoShellMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const holoShell = new THREE.Mesh(holoShellGeo, holoShellMat);
  starHologramGroup.add(holoShell);

  const holoRingGeo = trackGeo(new THREE.TorusGeometry(2.08, 0.055, 8, 36));
  const holoRingMat1 = trackMat(
    new THREE.MeshBasicMaterial({ color: '#f472b6', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  const holoRingMat2 = trackMat(
    new THREE.MeshBasicMaterial({ color: '#4ade80', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  const hRing1 = new THREE.Mesh(holoRingGeo, holoRingMat1);
  hRing1.rotation.x = Math.PI / 3;
  const hRing2 = new THREE.Mesh(holoRingGeo, holoRingMat2);
  hRing2.rotation.y = Math.PI / 3;
  starHologramGroup.add(hRing1, hRing2);
  kartBodyGroup.add(starHologramGroup);

  // 2) P-Balloon Orbiting Shields (up to 3)
  const pBalloonGroup = new THREE.Group();
  pBalloonGroup.position.set(0, 1.55, -0.35);
  const balloonMeshes: THREE.Mesh[] = [];
  const balloonColors = ['#ef4444', '#38bdf8', '#facc15'];
  const balloonGeo = trackGeo(new THREE.SphereGeometry(0.28, 14, 12));
  balloonColors.forEach((bCol, bi) => {
    const bMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: bCol, roughness: 0.14, clearcoat: 1.0, emissive: bCol, emissiveIntensity: 0.18 })
    );
    const bm = new THREE.Mesh(balloonGeo, bMat);
    const ang = (bi / 3) * Math.PI * 2;
    bm.position.set(Math.cos(ang) * 0.9, 0.45, Math.sin(ang) * 0.9);
    bm.visible = false;
    pBalloonGroup.add(bm);
    balloonMeshes.push(bm);
  });
  kartBodyGroup.add(pBalloonGroup);

  // 3) Super Bell Cat Claws aura + ears
  const bellClawsGroup = new THREE.Group();
  bellClawsGroup.visible = false;
  const clawMat = trackMat(new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.85 }));
  const clawRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.45, 0.05, 8, 28)), clawMat);
  clawRing.rotation.x = Math.PI / 2;
  clawRing.position.y = 0.52;
  bellClawsGroup.add(clawRing);
  kartBodyGroup.add(bellClawsGroup);

  // 4) Drill Mushroom Nose Cone
  const drillNoseMesh = new THREE.Group();
  drillNoseMesh.position.set(0, 0.56, 1.55);
  drillNoseMesh.visible = false;
  const drillCone = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.32, 0.92, 12)),
    chromeMat
  );
  drillCone.rotation.x = Math.PI / 2;
  drillNoseMesh.add(drillCone);
  kartBodyGroup.add(drillNoseMesh);

  // 5) Cannon Box mounted on Hood
  const cannonBoxMesh = new THREE.Group();
  cannonBoxMesh.position.set(0, 1.05, 0.88);
  cannonBoxMesh.visible = false;
  const cBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.46, 0.42, 0.5)), carbonMat);
  const cBarrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.18, 0.52, 14)), chromeMat);
  cBarrel.rotation.x = Math.PI / 2;
  cBarrel.position.set(0, 0.04, 0.36);
  cannonBoxMesh.add(cBox, cBarrel);
  kartBodyGroup.add(cannonBoxMesh);

  // 6) Cloud Flower Halo
  const cloudHalo = new THREE.Group();
  cloudHalo.position.set(0, 0.35, 0);
  cloudHalo.visible = false;
  const puffGeo = trackGeo(new THREE.SphereGeometry(0.26, 10, 8));
  for (let cp = 0; cp < 6; cp++) {
    const a = (cp / 6) * Math.PI * 2;
    const puff = new THREE.Mesh(puffGeo, creamMat);
    puff.position.set(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15);
    cloudHalo.add(puff);
  }
  kartBodyGroup.add(cloudHalo);

  // 7) Double Cherry Hologram Decoy Kart
  const cloneGhostGroup = new THREE.Group();
  cloneGhostGroup.visible = false;
  const cloneMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#f472b6',
      transparent: true,
      opacity: 0.62,
      wireframe: true,
    })
  );
  const cloneCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.55, 1.35)), cloneMat);
  cloneCore.position.set(1.55, 0.55, -0.65);
  cloneGhostGroup.add(cloneCore);
  root.add(cloneGhostGroup);

  // 8) Trailing Held Ability Mount (between twin nitro exhausts)
  const heldItemMount = new THREE.Group();
  heldItemMount.position.set(0, isTwoWheel ? 0.8 : seatY + 0.18, -1.62);
  kartBodyGroup.add(heldItemMount);

  const mkHeld = (builder: () => THREE.Group, scale = 0.72): THREE.Group => {
    const m = builder();
    m.scale.setScalar(scale);
    m.visible = false;
    heldItemMount.add(m);
    return m;
  };

  const heldItemMeshes: Record<Exclude<ItemKind, 'none'>, THREE.Group> = {
    banana: mkHeld(buildBananaMesh, 0.76),
    shell: mkHeld(buildGreenShellMesh, 0.62),
    mushroom: mkHeld(buildMushroomItemMesh, 0.74),
    star: mkHeld(buildStarItemMesh, 0.74),
    golden_flower: mkHeld(buildGoldenFlowerItemMesh, 0.74),
    super_bell: mkHeld(buildSuperBellItemMesh, 0.74),
    p_balloon: mkHeld(buildPBalloonItemMesh, 0.74),
    mini_mushroom: mkHeld(buildMiniMushroomItemMesh, 0.72),
    double_cherry: mkHeld(buildDoubleCherryItemMesh, 0.74),
    bee_mushroom: mkHeld(buildBeeMushroomItemMesh, 0.74),
    blue_shell: mkHeld(buildBlueShellMesh, 0.64),
    elephant_fruit: mkHeld(buildElephantFruitItemMesh, 0.74),
    drill_mushroom: mkHeld(buildDrillMushroomItemMesh, 0.74),
    purple_shell: mkHeld(buildPurpleShellMesh, 0.64),
    cannon_box: mkHeld(buildCannonBoxItemMesh, 0.72),
    cloud_flower: mkHeld(buildCloudFlowerItemMesh, 0.74),
  };

  // ==================== REFINED HIGH-DETAIL COMPOSITE 3D CHARACTER MODEL (IMAGE 2 QUALITY) ====================
  const driverGroup = new THREE.Group();
  driverGroup.position.set(0, seatY, seatZ);
  kartBodyGroup.add(driverGroup);

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({ color: spec.skinColor, roughness: 0.42, metalness: 0.02 })
  );
  const outfitMat = trackMat(
    new THREE.MeshStandardMaterial({ color: spec.outfitColor, roughness: 0.48, metalness: 0.08 })
  );
  const shirtMat = trackMat(
    new THREE.MeshStandardMaterial({ color: spec.primaryColor, roughness: 0.48, metalness: 0.06 })
  );
  const gloveMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spec.species === 'pacman' ? '#ef4444' : '#ffffff',
      roughness: 0.32,
      metalness: 0.05,
    })
  );
  const darkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spec.id === 'luigi' || spec.id === 'mario' ? '#29170b' : '#111827',
      roughness: 0.34,
      metalness: 0.1,
    })
  );
  const eyeIrisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color:
        spec.species === 'koopa_king'
          ? '#ef4444'
          : spec.species === 'boo'
          ? '#a855f7'
          : spec.id === 'daisy'
          ? '#0d9488'
          : '#0284c7',
      roughness: 0.1,
    })
  );
  const goldMat = trackMat(new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.88, roughness: 0.14 }));
  const blushMat = trackMat(new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.62 }));
  const eyeWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.08 }));

  const scaleFactor =
    spec.weightClass === 'Heavyweight' ? 1.12 : spec.weightClass === 'Lightweight' ? 0.92 : 1.0;
  driverGroup.scale.setScalar(scaleFactor);

  // Sculpted Torso + Bib/Dress + Collar
  const torso = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.28, 0.34, 10, 18)), outfitMat);
  torso.position.set(0, 0.36, 0);
  torso.castShadow = castShadow;
  driverGroup.add(torso);

  const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.21, 0.045, 8, 18)), shirtMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.55, 0.01);
  driverGroup.add(collar);

  if (spec.species === 'human_cap') {
    // Denim overalls bib + straps + brass buttons
    const bib = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.24, 0.1)), outfitMat);
    bib.position.set(0, 0.34, 0.24);
    driverGroup.add(bib);

    const strapGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.27, 0.06));
    const btnGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.025, 14));
    btnGeo.rotateX(Math.PI / 2);
    [-0.115, 0.115].forEach((bx) => {
      const strap = new THREE.Mesh(strapGeo, outfitMat);
      strap.position.set(bx, 0.45, 0.22);
      strap.rotation.x = -0.18;
      driverGroup.add(strap);

      const b = new THREE.Mesh(btnGeo, goldMat);
      b.position.set(bx, 0.39, 0.28);
      driverGroup.add(b);
    });
  } else if (spec.species === 'princess') {
    // Princess chest jewel brooch + layered flared dress waist trim
    const jewelColor = spec.id === 'daisy' ? '#22c55e' : '#38bdf8';
    const brooch = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.078, 0.078, 0.04, 16)),
      goldMat
    );
    brooch.rotation.x = Math.PI / 2;
    brooch.position.set(0, 0.46, 0.27);
    driverGroup.add(brooch);

    const gem = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.052, 12, 10)),
      trackMat(new THREE.MeshPhysicalMaterial({ color: jewelColor, roughness: 0.08, clearcoat: 1 }))
    );
    gem.position.set(0, 0.46, 0.295);
    driverGroup.add(gem);

    const waistFrill = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.3, 0.42, 0.22, 20)),
      shirtMat
    );
    waistFrill.position.set(0, 0.18, 0);
    driverGroup.add(waistFrill);
  } else if (spec.species === 'dino') {
    // Yoshi smooth white belly patch
    const belly = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 16, 14)), gloveMat);
    belly.scale.set(0.95, 1.2, 0.55);
    belly.position.set(0, 0.34, 0.19);
    driverGroup.add(belly);
  }

  // Articulated Upper Arms, Puff Shoulders (for Princesses), Forearms & Glove Cuffs
  const upperArmGeo = trackGeo(new THREE.CapsuleGeometry(0.075, 0.22, 6, 12));
  const forearmGeo = trackGeo(new THREE.CapsuleGeometry(0.068, 0.22, 6, 12));
  const cuffGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.08, 0.075, 14));
  const handGeo = trackGeo(new THREE.SphereGeometry(0.105, 14, 12));
  const shoulderGeo = trackGeo(
    new THREE.SphereGeometry(spec.species === 'princess' ? 0.145 : 0.105, 14, 12)
  );
  const sleeveMat = spec.species === 'human_cap' || spec.species === 'princess' ? shirtMat : outfitMat;

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(shoulderGeo, sleeveMat);
    shoulder.position.set(side * 0.28, 0.5, 0.04);
    driverGroup.add(shoulder);

    const upperArm = new THREE.Mesh(upperArmGeo, spec.species === 'princess' ? gloveMat : sleeveMat);
    upperArm.position.set(side * 0.3, 0.39, 0.15);
    upperArm.rotation.x = 0.85;
    upperArm.rotation.z = side * 0.28;
    upperArm.castShadow = castShadow;
    driverGroup.add(upperArm);

    const forearm = new THREE.Mesh(forearmGeo, spec.species === 'princess' ? gloveMat : sleeveMat);
    forearm.position.set(side * 0.24, 0.3, 0.32);
    forearm.rotation.x = 1.25;
    forearm.rotation.z = -side * 0.35;
    driverGroup.add(forearm);

    const cuff = new THREE.Mesh(cuffGeo, gloveMat);
    cuff.position.set(side * 0.2, 0.28, 0.41);
    cuff.rotation.x = Math.PI / 2 - 0.25;
    cuff.rotation.y = -side * 0.25;
    driverGroup.add(cuff);

    const hand = new THREE.Mesh(handGeo, gloveMat);
    hand.position.set(side * 0.18, 0.26, 0.46);
    hand.scale.set(0.95, 0.9, 1.1);
    driverGroup.add(hand);
  });

  // Head Group with Expressive Sclera, Vivid Iris, Specular Catchlight, Eyelid Rim & Brows
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.85, 0.03);
  driverGroup.add(headGroup);

  const headSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.31, 28, 24)),
    spec.species === 'ghost' || spec.species === 'taiko' || spec.species === 'shyguy' ? outfitMat : skinMat
  );
  headSphere.castShadow = castShadow;
  headGroup.add(headSphere);

  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.072, 16, 14));
  const irisGeo = trackGeo(new THREE.SphereGeometry(0.046, 14, 14));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.025, 10, 10));
  const glintGeo = trackGeo(new THREE.SphereGeometry(0.013, 8, 8));
  const browGeo = trackGeo(new THREE.CapsuleGeometry(0.022, 0.092, 4, 8));

  const addEye = (x: number, y: number, z: number, scale = 1) => {
    const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eye.position.set(x, y, z);
    eye.scale.set(0.92 * scale, 1.28 * scale, 0.65 * scale);
    headGroup.add(eye);

    const iris = new THREE.Mesh(irisGeo, eyeIrisMat);
    iris.position.set(x, y, z + 0.03 * scale);
    iris.scale.set(0.92 * scale, 1.12 * scale, 0.72 * scale);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(pupilGeo, darkMat);
    pupil.position.set(x, y, z + 0.048 * scale);
    pupil.scale.setScalar(scale);
    headGroup.add(pupil);

    const glint = new THREE.Mesh(glintGeo, eyeWhiteMat);
    glint.position.set(x + 0.017 * scale, y + 0.022 * scale, z + 0.062 * scale);
    glint.scale.setScalar(scale);
    headGroup.add(glint);
  };

  if (spec.species !== 'shyguy' && spec.species !== 'dino') {
    [-0.1, 0.1].forEach((x) => {
      addEye(x, 0.05, 0.262);
      const brow = new THREE.Mesh(browGeo, darkMat);
      brow.position.set(x, 0.145, 0.278);
      if (spec.species !== 'koopa_king' && spec.species !== 'ghost') {
        brow.rotation.z = Math.PI / 2 + (x > 0 ? -0.15 : 0.15);
      } else {
        brow.rotation.z = Math.PI / 2 + (x > 0 ? 0.28 : -0.28);
      }
      headGroup.add(brow);
    });
  }

  if (spec.species === 'human_cap') {
    // Sculpted Ears + Big Round Nose + Contoured Handlebar Mustache + Visor Cap
    const earGeo = trackGeo(new THREE.SphereGeometry(0.082, 12, 10));
    [-0.3, 0.3].forEach((ex) => {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(ex, -0.01, 0.0);
      ear.scale.set(0.62, 1.05, 0.85);
      headGroup.add(ear);
    });

    const noseColorMat =
      spec.id === 'wario' || spec.id === 'waluigi'
        ? trackMat(new THREE.MeshStandardMaterial({ color: '#f472b6', roughness: 0.4 }))
        : skinMat;
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.098, 18, 16)), noseColorMat);
    nose.position.set(0, -0.02, 0.325);
    nose.scale.set(1.12, 0.94, 1.02);
    headGroup.add(nose);

    const stachePuffGeo = trackGeo(new THREE.SphereGeometry(0.052, 12, 10));
    [-0.11, -0.065, -0.022, 0.022, 0.065, 0.11].forEach((mx, idx) => {
      const puff = new THREE.Mesh(stachePuffGeo, darkMat);
      const outer = idx === 0 || idx === 5;
      puff.position.set(mx, outer ? -0.078 : -0.102, outer ? 0.258 : 0.295);
      puff.scale.set(1.15, 0.82, 0.88);
      headGroup.add(puff);
    });

    const sideHairGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.12, 0.11));
    [-0.265, 0.265].forEach((hx) => {
      const sh = new THREE.Mesh(sideHairGeo, darkMat);
      sh.position.set(hx, 0.03, 0.07);
      headGroup.add(sh);
    });

    const capDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.34, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      shirtMat
    );
    capDome.position.y = 0.065;
    headGroup.add(capDome);
    const capBrim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.31, 0.35, 0.048, 22, 1, false, -0.98, 1.96)),
      shirtMat
    );
    capBrim.position.set(0, 0.135, 0.16);
    capBrim.rotation.x = 0.25;
    headGroup.add(capBrim);
    const capBadge = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.112, 0.112, 0.03, 18)), emblemMat);
    capBadge.rotation.x = Math.PI / 2 - 0.25;
    capBadge.position.set(0, 0.255, 0.302);
    headGroup.add(capBadge);
  } else if (spec.species === 'princess') {
    const hairColor = spec.id === 'daisy' ? '#b45309' : spec.id === 'rosalina' ? '#bae6fd' : '#fde047';
    const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.32 }));
    const hair = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.345, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.82)),
      hairMat
    );
    hair.position.set(0, 0.03, -0.06);
    headGroup.add(hair);

    // Sculpted side swept bangs + long flared back locks
    const lockGeo = trackGeo(new THREE.CapsuleGeometry(0.088, 0.24, 6, 12));
    [-0.255, 0.255].forEach((lx) => {
      const lock = new THREE.Mesh(lockGeo, hairMat);
      lock.position.set(lx, -0.07, 0.08);
      lock.rotation.z = lx > 0 ? -0.18 : 0.18;
      headGroup.add(lock);
    });
    const ponytail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.26, 0.56, 16)), hairMat);
    ponytail.position.set(0, -0.16, -0.3);
    ponytail.rotation.x = 0.4;
    headGroup.add(ponytail);

    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.042, 8, 8));
    [-0.17, 0.17].forEach((cx) => {
      const ch = new THREE.Mesh(cheekGeo, blushMat);
      ch.position.set(cx, -0.05, 0.24);
      ch.scale.set(1.1, 0.7, 0.5);
      headGroup.add(ch);
    });
    const earGemGeo = trackGeo(new THREE.SphereGeometry(0.052, 10, 10));
    [-0.31, 0.31].forEach((ex) => {
      const eg = new THREE.Mesh(earGemGeo, eyeIrisMat);
      eg.position.set(ex, -0.04, 0.02);
      headGroup.add(eg);
    });

    // Multi-point Royal Crown
    const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.165, 0.11, 0.16, 6)), goldMat);
    crown.position.set(0, 0.365, 0.02);
    headGroup.add(crown);
    const tipGeo = trackGeo(new THREE.ConeGeometry(0.04, 0.1, 6));
    for (let t = 0; t < 4; t++) {
      const a = (t / 4) * Math.PI * 2;
      const tip = new THREE.Mesh(tipGeo, goldMat);
      tip.position.set(Math.cos(a) * 0.11, 0.46, 0.02 + Math.sin(a) * 0.11);
      headGroup.add(tip);
    }
    const jewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.05, 0)), shirtMat);
    jewel.position.set(0, 0.37, 0.14);
    headGroup.add(jewel);
  } else if (spec.species === 'dino') {
    // Yoshi (Image 2 style): Twin eye domes atop head, big snout with nostrils, white cheek bowls, red saddle & back spikes
    const saddle = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.24, 14, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.38 }))
    );
    saddle.position.set(0, 0.38, -0.22);
    driverGroup.add(saddle);

    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.25, 22, 18)), skinMat);
    snout.position.set(0, -0.04, 0.25);
    snout.scale.set(1.1, 0.88, 1.18);
    headGroup.add(snout);

    // Nostril dimples on Yoshi snout
    const nosGeo = trackGeo(new THREE.SphereGeometry(0.024, 8, 8));
    [-0.055, 0.055].forEach((nx) => {
      const nos = new THREE.Mesh(nosGeo, darkMat);
      nos.position.set(nx, 0.03, 0.515);
      headGroup.add(nos);
    });

    // Twin raised eye domes
    const eyeDomeGeo = trackGeo(new THREE.SphereGeometry(0.125, 16, 14));
    [-0.095, 0.095].forEach((ex) => {
      const dome = new THREE.Mesh(eyeDomeGeo, skinMat);
      dome.position.set(ex, 0.24, 0.07);
      dome.scale.set(0.92, 1.12, 0.95);
      headGroup.add(dome);
      addEye(ex, 0.25, 0.145, 0.92);
    });

    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.11, 12, 12));
    [-0.18, 0.18].forEach((cx) => {
      const ch = new THREE.Mesh(cheekGeo, gloveMat);
      ch.position.set(cx, -0.08, 0.17);
      headGroup.add(ch);
    });
    const crestGeo = trackGeo(new THREE.ConeGeometry(0.07, 0.18, 8));
    for (let i = 0; i < 3; i++) {
      const cr = new THREE.Mesh(
        crestGeo,
        trackMat(new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.4 }))
      );
      cr.position.set(0, 0.24 - i * 0.12, -0.22 - i * 0.08);
      cr.rotation.x = -0.85;
      headGroup.add(cr);
    }
  } else if (spec.species === 'toad') {
    const cap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.43, 26, 20)), gloveMat);
    cap.position.set(0, 0.22, -0.02);
    cap.scale.set(1.1, 0.85, 1.1);
    headGroup.add(cap);
    const spotGeo = trackGeo(new THREE.SphereGeometry(0.13, 14, 14));
    [
      [0, 0.36, 0.27],
      [-0.29, 0.23, 0.08],
      [0.29, 0.23, 0.08],
      [0, 0.3, -0.27],
    ].forEach(([sx, sy, sz]) => {
      const spot = new THREE.Mesh(spotGeo, shirtMat);
      spot.position.set(sx, sy, sz);
      headGroup.add(spot);
    });
    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.045, 8, 8));
    [-0.17, 0.17].forEach((cx) => {
      const ch = new THREE.Mesh(cheekGeo, blushMat);
      ch.position.set(cx, -0.05, 0.245);
      headGroup.add(ch);
    });
  } else if (spec.species === 'koopa_king') {
    const shell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.39, 20, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.4 }))
    );
    shell.position.set(0, 0.36, -0.22);
    driverGroup.add(shell);
    const shellRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.37, 0.055, 8, 22)), gloveMat);
    shellRim.position.set(0, 0.36, -0.14);
    driverGroup.add(shellRim);

    const spikeGeo = trackGeo(new THREE.ConeGeometry(0.075, 0.2, 8));
    [
      [0, 0.58, -0.45],
      [-0.21, 0.44, -0.43],
      [0.21, 0.44, -0.43],
      [0, 0.25, -0.47],
    ].forEach(([sx, sy, sz]) => {
      const sp = new THREE.Mesh(spikeGeo, gloveMat);
      sp.position.set(sx, sy, sz);
      sp.rotation.x = -Math.PI / 2.2;
      driverGroup.add(sp);
    });

    const neckCollar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.22, 0.05, 8, 16)), darkMat);
    neckCollar.rotation.x = Math.PI / 2;
    neckCollar.position.set(0, 0.57, 0.02);
    driverGroup.add(neckCollar);

    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 18, 14)), gloveMat);
    snout.position.set(0, -0.08, 0.22);
    snout.scale.set(1.22, 0.78, 1.02);
    headGroup.add(snout);
    const hairCrest = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.15, 0.28, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.46 }))
    );
    hairCrest.position.set(0, 0.33, 0.04);
    headGroup.add(hairCrest);
    const hornGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.24, 10));
    [-0.2, 0.2].forEach((x) => {
      const horn = new THREE.Mesh(hornGeo, gloveMat);
      horn.position.set(x, 0.25, 0.04);
      horn.rotation.z = x > 0 ? -0.48 : 0.48;
      headGroup.add(horn);
    });
  } else if (spec.species === 'koopa_troopa') {
    const shell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.35, 18, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.36 }))
    );
    shell.position.set(0, 0.35, -0.2);
    driverGroup.add(shell);
    const shellRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.33, 0.048, 8, 20)), gloveMat);
    shellRim.position.set(0, 0.35, -0.14);
    driverGroup.add(shellRim);
    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.19, 14, 12)), skinMat);
    snout.position.set(0, -0.06, 0.23);
    snout.scale.set(1.15, 0.85, 1.1);
    headGroup.add(snout);
  } else if (spec.species === 'shyguy') {
    const hood = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.345, 22, 18)), shirtMat);
    hood.position.set(0, 0.02, -0.04);
    headGroup.add(hood);
    const strap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.34, 0.028, 8, 24)), darkMat);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, 0.02, -0.02);
    headGroup.add(strap);
    const mask = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.285, 22, 18)), gloveMat);
    mask.position.set(0, 0, 0.14);
    mask.scale.set(0.95, 1.08, 0.72);
    headGroup.add(mask);
    const holeGeo = trackGeo(new THREE.SphereGeometry(0.056, 10, 10));
    [-0.1, 0.1].forEach((hx) => {
      const hole = new THREE.Mesh(holeGeo, darkMat);
      hole.position.set(hx, 0.04, 0.315);
      hole.scale.set(0.85, 1.35, 0.5);
      headGroup.add(hole);
    });
    const mouthHole = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 10, 10)), darkMat);
    mouthHole.position.set(0, -0.11, 0.322);
    headGroup.add(mouthHole);
  } else if (spec.species === 'boo') {
    const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.185, 0.12, 0.18, 6)), goldMat);
    crown.position.set(0, 0.36, 0);
    headGroup.add(crown);
    const ruby = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.055, 0)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.14 }))
    );
    ruby.position.set(0, 0.36, 0.15);
    headGroup.add(ruby);
    const tongue = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.06, 0.12, 6, 10)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.35 }))
    );
    tongue.position.set(0, -0.16, 0.28);
    tongue.rotation.x = 0.6;
    headGroup.add(tongue);
    const fangGeo = trackGeo(new THREE.ConeGeometry(0.025, 0.07, 6));
    [-0.08, 0.08].forEach((fx) => {
      const fang = new THREE.Mesh(fangGeo, eyeWhiteMat);
      fang.position.set(fx, -0.1, 0.29);
      fang.rotation.x = Math.PI;
      headGroup.add(fang);
    });
  } else if (spec.species === 'kong') {
    const furMat = trackMat(new THREE.MeshStandardMaterial({ color: '#5c2d0c', roughness: 0.8 }));
    const crest = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.16, 0.26, 12)), furMat);
    crest.position.set(0, 0.31, 0.02);
    headGroup.add(crest);
    const browRidge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.08, 0.16)), furMat);
    browRidge.position.set(0, 0.12, 0.23);
    headGroup.add(browRidge);
    const muzzle = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.23, 18, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#e6b89c', roughness: 0.56 }))
    );
    muzzle.position.set(0, -0.07, 0.185);
    muzzle.scale.set(1.12, 0.78, 0.92);
    headGroup.add(muzzle);
    const tie = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.15, 0.34, 0.065)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.48 }))
    );
    tie.position.set(0, 0.37, 0.27);
    driverGroup.add(tie);
  } else if (spec.species === 'pacman') {
    headSphere.scale.set(1.18, 1.18, 1.18);
    const smile = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.22, 0.032, 8, 18, Math.PI * 0.75)),
      darkMat
    );
    smile.position.set(0, -0.05, 0.24);
    smile.rotation.z = Math.PI * 1.12;
    headGroup.add(smile);
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.065, 12, 12)), skinMat);
    nose.position.set(0, -0.01, 0.36);
    headGroup.add(nose);
  } else if (spec.species === 'ghost') {
    headSphere.scale.set(1.1, 1.15, 1.1);
    const skirtGeo = trackGeo(new THREE.SphereGeometry(0.11, 10, 10));
    for (let s = 0; s < 6; s++) {
      const ang = (s / 6) * Math.PI * 2;
      const lobe = new THREE.Mesh(skirtGeo, outfitMat);
      lobe.position.set(Math.cos(ang) * 0.22, 0.16, Math.sin(ang) * 0.22);
      driverGroup.add(lobe);
    }
  } else if (spec.species === 'taiko') {
    const face = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.09, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.38 }))
    );
    face.rotation.x = Math.PI / 2;
    face.position.z = 0.22;
    headGroup.add(face);
    const rimRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.29, 0.035, 8, 24)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 }))
    );
    rimRing.position.z = 0.24;
    headGroup.add(rimRing);
    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.045, 8, 8));
    [-0.16, 0.16].forEach((cx) => {
      const ch = new THREE.Mesh(cheekGeo, blushMat);
      ch.position.set(cx, -0.06, 0.25);
      headGroup.add(ch);
    });
  }

  return {
    root,
    kartBodyGroup,
    driverGroup,
    headGroup,
    steeringWheel: steeringPivot,
    wheels,
    frontSteerPivots,
    exhaustTips,
    exhaustFlames,
    hoverRotors,
    starHologramGroup,
    pBalloonGroup,
    balloonMeshes,
    bellClawsGroup,
    drillNoseMesh,
    cannonBoxMesh,
    cloudHalo,
    cloneGhostGroup,
    heldItemMount,
    heldItemMeshes,
    underglowMat,
    paintMat,
    isTwoWheel,
    dispose: () => {
      localDisposables.forEach((d) => d.dispose());
    },
  };
}

export function buildGoldenFlowerItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const petalMat = new THREE.MeshPhysicalMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.4, clearcoat: 1 });
  const centerMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.14, 16), centerMat);
  center.rotation.x = Math.PI / 2;
  center.position.y = 0.48;
  g.add(center);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.11, 10, 18), petalMat);
  ring.position.y = 0.48;
  g.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.32, 8), new THREE.MeshStandardMaterial({ color: '#22c55e' }));
  stem.position.y = 0.18;
  g.add(stem);
  return g;
}

export function buildSuperBellItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#facc15', metalness: 0.65, roughness: 0.18, clearcoat: 1 });
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 0.56, 16), mat);
  dome.position.y = 0.42;
  g.add(dome);
  const earGeo = new THREE.ConeGeometry(0.12, 0.22, 6);
  [-0.16, 0.16].forEach((ex) => {
    const ear = new THREE.Mesh(earGeo, mat);
    ear.position.set(ex, 0.72, 0);
    g.add(ear);
  });
  return g;
}

export function buildPBalloonItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#38bdf8', roughness: 0.14, clearcoat: 1 });
  const sph = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 14), mat);
  sph.position.y = 0.48;
  g.add(sph);
  return g;
}

export function buildMiniMushroomItemMesh(): THREE.Group {
  const g = buildMushroomItemMesh();
  const cap = g.children[0] as THREE.Mesh;
  cap.material = new THREE.MeshPhysicalMaterial({ color: '#38bdf8', roughness: 0.2, clearcoat: 1 });
  g.scale.setScalar(0.75);
  return g;
}

export function buildDoubleCherryItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#ec4899', roughness: 0.18, clearcoat: 1 });
  [-0.22, 0.22].forEach((cx) => {
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), mat);
    ch.position.set(cx, 0.28, 0);
    g.add(ch);
  });
  return g;
}

export function buildBeeMushroomItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.44, 16, 14),
    new THREE.MeshPhysicalMaterial({ color: '#facc15', roughness: 0.22, clearcoat: 1 })
  );
  cap.position.y = 0.36;
  g.add(cap);
  const stripe = new THREE.Mesh(
    new THREE.TorusGeometry(0.41, 0.06, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#1e293b' })
  );
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.36;
  g.add(stripe);
  return g;
}

export function buildElephantFruitItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 16, 12),
    new THREE.MeshPhysicalMaterial({ color: '#fb7185', roughness: 0.25, clearcoat: 0.85 })
  );
  body.position.y = 0.42;
  g.add(body);
  return g;
}

export function buildDrillMushroomItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const drill = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 0.74, 12),
    new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.82, roughness: 0.2 })
  );
  drill.position.y = 0.46;
  g.add(drill);
  return g;
}

export function buildCannonBoxItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.5, 0.56),
    new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.55, roughness: 0.35 })
  );
  box.position.y = 0.38;
  g.add(box);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.48, 12), new THREE.MeshStandardMaterial({ color: '#64748b' }));
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.42, 0.36);
  g.add(barrel);
  return g;
}

export function buildCloudFlowerItemMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color: '#f8fafc', roughness: 0.2, clearcoat: 0.9 });
  [
    [0, 0.48, 0],
    [-0.25, 0.42, 0],
    [0.25, 0.42, 0],
  ].forEach(([x, y, z]) => {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat);
    p.position.set(x, y, z);
    g.add(p);
  });
  return g;
}

export function buildGoldenFireballMesh(): THREE.Group {
  const g = new THREE.Group();
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 14, 12),
    new THREE.MeshBasicMaterial({ color: '#fde047' })
  );
  orb.position.y = 0.55;
  g.add(orb);
  const aura = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 12, 10),
    new THREE.MeshBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
  );
  aura.position.y = 0.55;
  g.add(aura);
  return g;
}

export function buildBlueShellMesh(): THREE.Group {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    new THREE.MeshPhysicalMaterial({ color: '#0284c7', roughness: 0.18, clearcoat: 1 })
  );
  dome.position.y = 0.2;
  g.add(dome);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.11, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.22;
  g.add(rim);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 8), new THREE.MeshStandardMaterial({ color: '#f8fafc' }));
  spike.position.y = 0.88;
  g.add(spike);
  return g;
}

export function buildPurpleShellMesh(): THREE.Group {
  const g = new THREE.Group();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.64, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    new THREE.MeshPhysicalMaterial({ color: '#9333ea', emissive: '#7e22ce', emissiveIntensity: 0.35, roughness: 0.2, clearcoat: 1 })
  );
  dome.position.y = 0.2;
  g.add(dome);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.11, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#a3e635', roughness: 0.35 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.22;
  g.add(rim);
  return g;
}

export function buildCannonballMesh(): THREE.Group {
  const g = new THREE.Group();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.54, 16, 14),
    new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.8, roughness: 0.22 })
  );
  ball.position.y = 0.56;
  g.add(ball);
  return g;
}

export function buildHoneyPuddleMesh(): THREE.Group {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 1.45 + Math.sin(a * 3) * 0.32 + Math.cos(a * 2) * 0.22;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const puddle = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: '#a855f7',
      emissive: '#6b21a8',
      emissiveIntensity: 0.3,
      roughness: 0.12,
      clearcoat: 1,
    })
  );
  puddle.position.y = 0.08;
  g.add(puddle);
  return g;
}

export function buildItemBoxMesh(textures: ProceduralTextureSet): THREE.Group {
  const g = new THREE.Group();
  const outerGeo = new THREE.BoxGeometry(1.48, 1.48, 1.48);
  const outerMat = new THREE.MeshPhysicalMaterial({
    map: textures.itemBoxMap,
    transparent: true,
    opacity: 0.9,
    roughness: 0.1,
    metalness: 0.18,
    clearcoat: 1.0,
    emissive: '#38bdf8',
    emissiveIntensity: 0.42,
  });
  const cube = new THREE.Mesh(outerGeo, outerMat);
  cube.rotation.set(0.55, 0.78, 0.35);
  g.add(cube);

  const coreGeo = new THREE.OctahedronGeometry(0.46, 0);
  const coreMat = new THREE.MeshBasicMaterial({ color: '#fde047', wireframe: true });
  const core = new THREE.Mesh(coreGeo, coreMat);
  g.add(core);
  return g;
}

export function buildGreenShellMesh(): THREE.Group {
  const g = new THREE.Group();
  const shellGeo = new THREE.SphereGeometry(0.62, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: '#16a34a',
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 1.0,
  });
  const dome = new THREE.Mesh(shellGeo, shellMat);
  dome.position.y = 0.18;
  g.add(dome);

  const rimGeo = new THREE.TorusGeometry(0.58, 0.11, 10, 20);
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 }));
  rim.position.y = 0.22;
  g.add(rim);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.5, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: '#fde047', roughness: 0.55 })
  );
  base.position.y = 0.11;
  g.add(base);
  return g;
}

export function buildBananaMesh(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.38, metalness: 0.05 });
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const peel = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 8), mat);
    peel.position.set(Math.cos(angle) * 0.26, 0.18, Math.sin(angle) * 0.26);
    peel.rotation.z = -Math.cos(angle) * 1.1;
    peel.rotation.x = Math.sin(angle) * 1.1;
    g.add(peel);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 0.52, 10), mat);
  stem.position.y = 0.42;
  g.add(stem);
  return g;
}

export function buildTrackBumperMesh(): THREE.Group {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#ef4444',
    metalness: 0.45,
    roughness: 0.25,
    clearcoat: 1.0,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 1.4, 20), bodyMat);
  body.position.y = 0.75;
  body.castShadow = true;
  g.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.2, 10, 24),
    new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.3, metalness: 0.5 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.85;
  g.add(ring);
  return g;
}
