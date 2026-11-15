import * as THREE from 'three';
import type { RacerSpec } from './roster.ts';
import { createEmblemTexture, type ProceduralTextureSet } from './textures.ts';

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
  underglowMat: THREE.MeshBasicMaterial;
  paintMat: THREE.MeshPhysicalMaterial;
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
}

let sharedGeos: SharedKartGeos | null = null;

function makeHullGeo(style: RacerSpec['chassis']): THREE.ExtrudeGeometry {
  const hullShape = new THREE.Shape();
  if (style === 'mach') {
    hullShape.moveTo(-0.54, -1.25);
    hullShape.lineTo(0.54, -1.25);
    hullShape.lineTo(0.64, -0.25);
    hullShape.lineTo(0.38, 1.34);
    hullShape.lineTo(-0.38, 1.34);
    hullShape.lineTo(-0.64, -0.25);
  } else if (style === 'offroad') {
    hullShape.moveTo(-0.74, -1.24);
    hullShape.lineTo(0.74, -1.24);
    hullShape.lineTo(0.78, 0.32);
    hullShape.lineTo(0.56, 1.26);
    hullShape.lineTo(-0.56, 1.26);
    hullShape.lineTo(-0.78, 0.32);
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
    depth: 0.35,
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
    new THREE.Vector2(0.06, 0),
    new THREE.Vector2(0.075, 0.26),
    new THREE.Vector2(0.12, 0.48),
    new THREE.Vector2(0.092, 0.49),
    new THREE.Vector2(0.05, 0.26),
  ];
  const exGeo = new THREE.LatheGeometry(exPts, 16);
  exGeo.rotateX(-Math.PI / 2 - 0.32);

  const colGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.35, 10);
  colGeo.rotateX(Math.PI / 2);

  sharedGeos = {
    shadowGeo,
    panGeo: new THREE.BoxGeometry(1.28, 0.08, 2.42),
    glowGeo: new THREE.BoxGeometry(1.34, 0.04, 2.18),
    noseGeo: new THREE.BoxGeometry(0.96, 0.14, 0.42),
    grilleGeo: new THREE.BoxGeometry(0.44, 0.2, 0.08),
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
  };
  return sharedGeos;
}

export function buildKartAndDriver(
  spec: RacerSpec,
  textures: ProceduralTextureSet,
  castShadow = true
): KartVisualRig {
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
  root.add(shadowPlane);

  const kartBodyGroup = new THREE.Group();
  root.add(kartBodyGroup);

  // High-gloss PBR materials with rich IBL reflections
  const paintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: spec.primaryColor,
      metalness: 0.58,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.35,
    })
  );

  const secondaryPaintMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: spec.secondaryColor,
      metalness: 0.28,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.25,
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

  // 1. Sculpted Hull
  const hullGeo =
    spec.chassis === 'mach'
      ? geos.hullMach
      : spec.chassis === 'offroad'
      ? geos.hullOffroad
      : geos.hullStandard;
  const hullMesh = new THREE.Mesh(hullGeo, paintMat);
  hullMesh.position.y = 0.64;
  hullMesh.castShadow = castShadow;
  hullMesh.receiveShadow = true;
  kartBodyGroup.add(hullMesh);

  // 2. Carbon Floor Pan + Underglow
  const panMesh = new THREE.Mesh(geos.panGeo, carbonMat);
  panMesh.position.set(0, 0.27, 0);
  panMesh.castShadow = castShadow;
  kartBodyGroup.add(panMesh);

  const glowMesh = new THREE.Mesh(geos.glowGeo, underglowMat);
  glowMesh.position.set(0, 0.23, 0);
  kartBodyGroup.add(glowMesh);

  // 3. Nose, Grille, Headlights, Windshield, Hood Emblem
  const noseMesh = new THREE.Mesh(geos.noseGeo, secondaryPaintMat);
  noseMesh.position.set(0, 0.43, 1.26);
  noseMesh.rotation.x = 0.14;
  noseMesh.castShadow = castShadow;
  kartBodyGroup.add(noseMesh);

  const grilleFrame = new THREE.Mesh(geos.grilleGeo, chromeMat);
  grilleFrame.position.set(0, 0.47, 1.38);
  kartBodyGroup.add(grilleFrame);

  [-0.38, 0.38].forEach((x) => {
    const ring = new THREE.Mesh(geos.headRingGeo, chromeMat);
    ring.position.set(x, 0.54, 1.26);
    ring.rotation.y = x > 0 ? 0.2 : -0.2;
    kartBodyGroup.add(ring);
    const lens = new THREE.Mesh(geos.headLensGeo, headlightMat);
    lens.position.set(x, 0.54, 1.24);
    lens.scale.set(1, 1, 0.55);
    kartBodyGroup.add(lens);
  });

  const shield = new THREE.Mesh(geos.shieldGeo, glassMat);
  shield.position.set(0, 0.78, 0.44);
  shield.rotation.x = -0.35;
  kartBodyGroup.add(shield);

  const emblemTex = createEmblemTexture(spec.emblem, spec.primaryColor, spec.accentColor);
  localDisposables.push(emblemTex);
  const emblemMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: emblemTex,
      roughness: 0.24,
      metalness: 0.12,
    })
  );
  const emblemMesh = new THREE.Mesh(geos.emblemGeo, emblemMat);
  emblemMesh.position.set(0, 0.72, 0.88);
  emblemMesh.rotation.x = 0.14;
  kartBodyGroup.add(emblemMesh);

  // 4. Side Pods
  [-0.74, 0.74].forEach((x) => {
    const pod = new THREE.Mesh(geos.podGeo, secondaryPaintMat);
    pod.position.set(x, 0.44, 0.02);
    pod.castShadow = castShadow;
    kartBodyGroup.add(pod);
  });

  // 5. Rear Engine & Spoiler Wing
  const engineMesh = new THREE.Mesh(geos.engineGeo, carbonMat);
  engineMesh.position.set(0, 0.76, -0.94);
  engineMesh.castShadow = castShadow;
  kartBodyGroup.add(engineMesh);

  const wingMesh = new THREE.Mesh(geos.wingGeo, paintMat);
  wingMesh.position.set(0, 1.2, -1.16);
  wingMesh.rotation.x = -0.18;
  wingMesh.castShadow = castShadow;
  kartBodyGroup.add(wingMesh);

  [-0.38, 0.38].forEach((x) => {
    const strut = new THREE.Mesh(geos.strutGeo, carbonMat);
    strut.position.set(x, 0.99, -1.1);
    kartBodyGroup.add(strut);
  });

  // 6. Twin Chrome Exhausts + Dynamic Glow Flame Cones
  const exhaustTips: THREE.Vector3[] = [];
  const exhaustFlames: THREE.Mesh[] = [];
  const flameConeGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.72, 12));
  flameConeGeo.rotateX(-Math.PI / 2);
  flameConeGeo.translate(0, 0, -0.36);

  [-0.25, 0.25].forEach((x) => {
    const pipe = new THREE.Mesh(geos.exGeo, chromeMat);
    pipe.position.set(x, 0.84, -1.08);
    pipe.castShadow = castShadow;
    kartBodyGroup.add(pipe);
    exhaustTips.push(new THREE.Vector3(x, 0.99, -1.52));

    const fMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: '#fb923c',
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const flame = new THREE.Mesh(flameConeGeo, fMat);
    flame.position.set(x, 0.98, -1.48);
    flame.rotation.x = 0.22;
    flame.visible = false;
    kartBodyGroup.add(flame);
    exhaustFlames.push(flame);
  });

  // 7. Bucket Seat & Steering Wheel
  const seatBack = new THREE.Mesh(geos.seatGeo, carbonMat);
  seatBack.position.set(0, 0.92, -0.35);
  seatBack.rotation.x = -0.22;
  kartBodyGroup.add(seatBack);

  const steeringPivot = new THREE.Group();
  steeringPivot.position.set(0, 0.89, 0.43);
  steeringPivot.rotation.x = -0.52;
  kartBodyGroup.add(steeringPivot);

  const col = new THREE.Mesh(geos.colGeo, chromeMat);
  col.position.z = -0.14;
  steeringPivot.add(col);
  steeringPivot.add(new THREE.Mesh(geos.wheelRimGeo, carbonMat));

  // 8. Cleaner Rounded Racing Wheels with Beveled Shoulders & Multi-Spoke Rims
  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.tireTreadMap,
      bumpMap: textures.tireTreadBump,
      bumpScale: 0.032,
      roughness: 0.78,
      metalness: 0.06,
    })
  );
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spec.accentColor,
      metalness: 0.9,
      roughness: 0.16,
      envMapIntensity: 1.4,
    })
  );

  const wheelRadiusFront = spec.chassis === 'offroad' ? 0.37 : 0.32;
  const wheelRadiusRear = spec.chassis === 'offroad' ? 0.43 : 0.37;
  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];

  const makeWheel = (radius: number, width: number) => {
    const wGroup = new THREE.Group();
    const tireGeo = trackGeo(new THREE.CylinderGeometry(radius, radius, width * 0.82, 28));
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = castShadow;
    wGroup.add(tire);

    // Rounded Tire Shoulder Rings (eliminates sharp cylinder edges)
    const shoulderGeo = trackGeo(new THREE.TorusGeometry(radius * 0.84, radius * 0.16, 10, 28));
    shoulderGeo.rotateY(Math.PI / 2);
    [-width * 0.36, width * 0.36].forEach((sx) => {
      const sh = new THREE.Mesh(shoulderGeo, tireMat);
      sh.position.x = sx;
      wGroup.add(sh);
    });

    // Metallic Rim Barrel & Spoke Star
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

  [-0.88, 0.88].forEach((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, wheelRadiusFront, 0.84);
    const w = makeWheel(wheelRadiusFront, 0.3);
    pivot.add(w);
    kartBodyGroup.add(pivot);
    frontSteerPivots.push(pivot);
    wheels.push(w);
  });

  [-0.94, 0.94].forEach((x) => {
    const w = makeWheel(wheelRadiusRear, 0.38);
    w.position.set(x, wheelRadiusRear, -0.84);
    kartBodyGroup.add(w);
    wheels.push(w);
  });

  // 9. Refined Composite 3D Character Model
  const driverGroup = new THREE.Group();
  driverGroup.position.set(0, 0.67, -0.05);
  kartBodyGroup.add(driverGroup);

  const skinMat = trackMat(new THREE.MeshStandardMaterial({ color: spec.skinColor, roughness: 0.52, metalness: 0.02 }));
  const outfitMat = trackMat(new THREE.MeshStandardMaterial({ color: spec.outfitColor, roughness: 0.56, metalness: 0.08 }));
  const shirtMat = trackMat(new THREE.MeshStandardMaterial({ color: spec.primaryColor, roughness: 0.55, metalness: 0.06 }));
  const gloveMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.38, metalness: 0.04 }));
  const darkMat = trackMat(new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.32, metalness: 0.1 }));
  const eyeIrisMat = trackMat(new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.16 }));
  const goldMat = trackMat(new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.86, roughness: 0.16 }));

  const scaleFactor =
    spec.weightClass === 'Heavyweight' ? 1.15 : spec.weightClass === 'Lightweight' ? 0.92 : 1.02;
  driverGroup.scale.setScalar(scaleFactor);

  const torso = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.28, 0.32, 8, 16)), outfitMat);
  torso.position.set(0, 0.35, 0);
  torso.castShadow = castShadow;
  driverGroup.add(torso);

  if (spec.species === 'human_cap') {
    const btnGeo = trackGeo(new THREE.SphereGeometry(0.042, 10, 10));
    [-0.1, 0.1].forEach((bx) => {
      const b = new THREE.Mesh(btnGeo, goldMat);
      b.position.set(bx, 0.38, 0.25);
      driverGroup.add(b);
    });
  }

  const armGeo = trackGeo(new THREE.CapsuleGeometry(0.085, 0.3, 6, 10));
  const handGeo = trackGeo(new THREE.SphereGeometry(0.11, 12, 12));
  [-0.29, 0.29].forEach((x) => {
    const arm = new THREE.Mesh(armGeo, spec.species === 'human_cap' ? shirtMat : outfitMat);
    arm.position.set(x, 0.39, 0.18);
    arm.rotation.x = Math.PI / 3;
    arm.rotation.z = x > 0 ? 0.28 : -0.28;
    driverGroup.add(arm);

    const hand = new THREE.Mesh(handGeo, gloveMat);
    hand.position.set(x * 0.65, 0.29, 0.39);
    driverGroup.add(hand);
  });

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.82, 0.02);
  driverGroup.add(headGroup);

  const headSphere = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.3, 24, 20)),
    spec.species === 'ghost' || spec.species === 'taiko' || spec.species === 'shyguy' ? outfitMat : skinMat
  );
  headSphere.castShadow = castShadow;
  headGroup.add(headSphere);

  const eyeWhiteMat = trackMat(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.12 }));
  const eyeGeo = trackGeo(new THREE.SphereGeometry(0.064, 12, 12));
  const irisGeo = trackGeo(new THREE.SphereGeometry(0.038, 10, 10));
  const pupilGeo = trackGeo(new THREE.SphereGeometry(0.023, 8, 8));

  if (spec.species !== 'shyguy') {
    [-0.1, 0.1].forEach((x) => {
      const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      eye.position.set(x, 0.04, 0.255);
      eye.scale.set(0.9, 1.2, 0.65);
      headGroup.add(eye);
      const iris = new THREE.Mesh(irisGeo, eyeIrisMat);
      iris.position.set(x, 0.04, 0.285);
      headGroup.add(iris);
      const pupil = new THREE.Mesh(pupilGeo, darkMat);
      pupil.position.set(x, 0.04, 0.305);
      headGroup.add(pupil);
    });
  }

  if (spec.species === 'human_cap') {
    const earGeo = trackGeo(new THREE.SphereGeometry(0.075, 10, 10));
    [-0.29, 0.29].forEach((ex) => {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(ex, 0.0, 0);
      ear.scale.set(0.65, 1, 0.85);
      headGroup.add(ear);
    });
    const nose = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.09, 14, 14)), skinMat);
    nose.position.set(0, -0.02, 0.31);
    headGroup.add(nose);
    const stache = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.042, 0.18, 6, 10)), darkMat);
    stache.rotation.z = Math.PI / 2;
    stache.position.set(0, -0.095, 0.275);
    headGroup.add(stache);
    const capDome = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.328, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      paintMat
    );
    capDome.position.y = 0.06;
    headGroup.add(capDome);
    const capBrim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.3, 0.33, 0.045, 20, 1, false, -0.95, 1.9)),
      paintMat
    );
    capBrim.position.set(0, 0.13, 0.15);
    capBrim.rotation.x = 0.24;
    headGroup.add(capBrim);
    const capBadge = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.105, 0.105, 0.03, 16)), emblemMat);
    capBadge.rotation.x = Math.PI / 2 - 0.25;
    capBadge.position.set(0, 0.24, 0.29);
    headGroup.add(capBadge);
  } else if (spec.species === 'princess') {
    const hairColor = spec.id === 'daisy' ? '#b45309' : spec.id === 'rosalina' ? '#bae6fd' : '#fde047';
    const hairMat = trackMat(new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.38 }));
    const hair = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.33, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.78)),
      hairMat
    );
    hair.position.set(0, 0.02, -0.06);
    headGroup.add(hair);
    const ponytail = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.22, 0.48, 14)), hairMat);
    ponytail.position.set(0, -0.14, -0.28);
    ponytail.rotation.x = 0.4;
    headGroup.add(ponytail);
    const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.15, 0.1, 0.15, 6)), goldMat);
    crown.position.set(0, 0.36, 0.02);
    headGroup.add(crown);
    const jewel = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.045, 0)), paintMat);
    jewel.position.set(0, 0.37, 0.13);
    headGroup.add(jewel);
  } else if (spec.species === 'koopa_king') {
    const shell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.38, 18, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.42 }))
    );
    shell.position.set(0, 0.36, -0.22);
    driverGroup.add(shell);
    const spikeGeo = trackGeo(new THREE.ConeGeometry(0.07, 0.18, 8));
    [
      [0, 0.58, -0.44],
      [-0.2, 0.44, -0.42],
      [0.2, 0.44, -0.42],
      [0, 0.25, -0.46],
    ].forEach(([sx, sy, sz]) => {
      const sp = new THREE.Mesh(spikeGeo, gloveMat);
      sp.position.set(sx, sy, sz);
      sp.rotation.x = -Math.PI / 2.2;
      driverGroup.add(sp);
    });
    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.2, 16, 14)), gloveMat);
    snout.position.set(0, -0.08, 0.22);
    snout.scale.set(1.2, 0.78, 1);
    headGroup.add(snout);
    const hairCrest = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.26, 10)), trackMat(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 })));
    hairCrest.position.set(0, 0.32, 0.04);
    headGroup.add(hairCrest);
    const hornGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.22, 10));
    [-0.2, 0.2].forEach((x) => {
      const horn = new THREE.Mesh(hornGeo, gloveMat);
      horn.position.set(x, 0.25, 0.04);
      horn.rotation.z = x > 0 ? -0.48 : 0.48;
      headGroup.add(horn);
    });
  } else if (spec.species === 'koopa_troopa') {
    const shell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.34, 18, 14)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.38 }))
    );
    shell.position.set(0, 0.35, -0.2);
    driverGroup.add(shell);
    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 14, 12)), skinMat);
    snout.position.set(0, -0.06, 0.22);
    snout.scale.set(1.15, 0.85, 1.1);
    headGroup.add(snout);
  } else if (spec.species === 'shyguy') {
    const hood = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.34, 20, 16)), paintMat);
    hood.position.set(0, 0.02, -0.04);
    headGroup.add(hood);
    const mask = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.28, 20, 16)), gloveMat);
    mask.position.set(0, 0, 0.14);
    mask.scale.set(0.95, 1.08, 0.72);
    headGroup.add(mask);
    const holeGeo = trackGeo(new THREE.SphereGeometry(0.055, 10, 10));
    [-0.1, 0.1].forEach((hx) => {
      const hole = new THREE.Mesh(holeGeo, darkMat);
      hole.position.set(hx, 0.04, 0.31);
      hole.scale.set(0.85, 1.35, 0.5);
      headGroup.add(hole);
    });
    const mouthHole = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.04, 10, 10)), darkMat);
    mouthHole.position.set(0, -0.11, 0.32);
    headGroup.add(mouthHole);
  } else if (spec.species === 'boo') {
    const crown = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.12, 0.18, 6)), goldMat);
    crown.position.set(0, 0.36, 0);
    headGroup.add(crown);
    const ruby = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.05, 0)), trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.15 })));
    ruby.position.set(0, 0.36, 0.15);
    headGroup.add(ruby);
    const tongue = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(0.06, 0.12, 6, 10)), trackMat(new THREE.MeshStandardMaterial({ color: '#fb7185', roughness: 0.35 })));
    tongue.position.set(0, -0.16, 0.28);
    tongue.rotation.x = 0.6;
    headGroup.add(tongue);
  } else if (spec.species === 'toad') {
    const cap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.4, 22, 16)), gloveMat);
    cap.position.set(0, 0.2, -0.02);
    cap.scale.set(1.08, 0.84, 1.08);
    headGroup.add(cap);
    const spotGeo = trackGeo(new THREE.SphereGeometry(0.115, 12, 12));
    [
      [0, 0.34, 0.26],
      [-0.26, 0.22, 0.08],
      [0.26, 0.22, 0.08],
      [0, 0.28, -0.26],
    ].forEach(([sx, sy, sz]) => {
      const spot = new THREE.Mesh(spotGeo, paintMat);
      spot.position.set(sx, sy, sz);
      headGroup.add(spot);
    });
  } else if (spec.species === 'dino') {
    const snout = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.21, 16, 14)), skinMat);
    snout.position.set(0, -0.04, 0.26);
    snout.scale.set(1.1, 0.85, 1.15);
    headGroup.add(snout);
    const crestGeo = trackGeo(new THREE.ConeGeometry(0.065, 0.16, 8));
    for (let i = 0; i < 3; i++) {
      const cr = new THREE.Mesh(crestGeo, trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4 })));
      cr.position.set(0, 0.24 - i * 0.11, -0.2 - i * 0.08);
      cr.rotation.x = -0.8;
      headGroup.add(cr);
    }
  } else if (spec.species === 'kong') {
    const furMat = trackMat(new THREE.MeshStandardMaterial({ color: '#5c2d0c', roughness: 0.82 }));
    const crest = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.15, 0.24, 10)), furMat);
    crest.position.set(0, 0.3, 0.02);
    headGroup.add(crest);
    const muzzle = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.22, 16, 14)), trackMat(new THREE.MeshStandardMaterial({ color: '#e6b89c', roughness: 0.6 })));
    muzzle.position.set(0, -0.07, 0.18);
    muzzle.scale.set(1.1, 0.78, 0.9);
    headGroup.add(muzzle);
    const tie = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.32, 0.06)), trackMat(new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 })));
    tie.position.set(0, 0.36, 0.26);
    driverGroup.add(tie);
  } else if (spec.species === 'taiko') {
    const face = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 24)), trackMat(new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 })));
    face.rotation.x = Math.PI / 2;
    face.position.z = 0.22;
    headGroup.add(face);
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
    underglowMat,
    paintMat,
    dispose: () => {
      localDisposables.forEach((d) => d.dispose());
    },
  };
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
