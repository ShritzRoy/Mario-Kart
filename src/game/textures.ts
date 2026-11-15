import * as THREE from 'three';

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  plazaAsphaltMap: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  kerbMap: THREE.CanvasTexture;
  plazaKerbMap: THREE.CanvasTexture;
  dividerStripeMap: THREE.CanvasTexture;
  grassMap: THREE.CanvasTexture;
  checkerMap: THREE.CanvasTexture;
  carbonBump: THREE.CanvasTexture;
  tireTreadMap: THREE.CanvasTexture;
  tireTreadBump: THREE.CanvasTexture;
  boostPadMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  itemBoxMap: THREE.CanvasTexture;
  shritizArchSignMap: THREE.CanvasTexture;
  plazaWallMap: THREE.CanvasTexture;
  nitroFlameMap: THREE.CanvasTexture;
  oilSlickMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const created: THREE.Texture[] = [];
  const register = (tex: THREE.CanvasTexture, isColor: boolean, repeatX = 1, repeatY = 1) => {
    if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    created.push(tex);
    return tex;
  };

  // 1. Dark Stadium / Highway Asphalt Road Texture (Clean edges — 3D curbs & barriers define borders, no stark white edge lines)
  const [asphC, asphCtx] = makeCanvas(512, 512);
  asphCtx.fillStyle = '#2d323e';
  asphCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 36 + Math.floor(Math.random() * 34);
    asphCtx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    asphCtx.fillRect(x, y, 2, 2);
  }
  const groove = asphCtx.createLinearGradient(0, 0, 512, 0);
  groove.addColorStop(0.0, 'rgba(0,0,0,0.28)');
  groove.addColorStop(0.14, 'rgba(0,0,0,0.0)');
  groove.addColorStop(0.38, 'rgba(10,12,18,0.24)');
  groove.addColorStop(0.5, 'rgba(0,0,0,0.02)');
  groove.addColorStop(0.62, 'rgba(10,12,18,0.24)');
  groove.addColorStop(0.86, 'rgba(0,0,0,0.0)');
  groove.addColorStop(1.0, 'rgba(0,0,0,0.28)');
  asphCtx.fillStyle = groove;
  asphCtx.fillRect(0, 0, 512, 512);
  // Subtle worn racing lane center dashes
  asphCtx.fillStyle = 'rgba(226, 232, 240, 0.22)';
  for (let y = 0; y < 512; y += 64) {
    asphCtx.fillRect(252, y + 10, 8, 30);
  }
  const asphaltMap = register(new THREE.CanvasTexture(asphC), true, 1, 38);

  // 1b. Nintendo Sunlit Plaza Road Texture (Warm slate asphalt + orange/cream checkered shoulders, NO white outer lines)
  const [pAsphC, pAsphCtx] = makeCanvas(512, 512);
  pAsphCtx.fillStyle = '#73716c';
  pAsphCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 13000; i++) {
    const v = 96 + Math.floor(Math.random() * 36);
    pAsphCtx.fillStyle = `rgb(${v},${v - 1},${v - 4})`;
    pAsphCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  const pGroove = pAsphCtx.createLinearGradient(0, 0, 512, 0);
  pGroove.addColorStop(0, 'rgba(40,25,10,0.22)');
  pGroove.addColorStop(0.15, 'rgba(0,0,0,0)');
  pGroove.addColorStop(0.85, 'rgba(0,0,0,0)');
  pGroove.addColorStop(1, 'rgba(40,25,10,0.22)');
  pAsphCtx.fillStyle = pGroove;
  pAsphCtx.fillRect(0, 0, 512, 512);

  // Orange-and-cream checkered racing shoulder stripes
  const chkSize = 16;
  for (let y = 0; y < 512; y += chkSize) {
    const even = (y / chkSize) % 2 === 0;
    pAsphCtx.fillStyle = even ? '#f97316' : '#fef3c7';
    pAsphCtx.fillRect(4, y, chkSize, chkSize);
    pAsphCtx.fillStyle = even ? '#fef3c7' : '#f97316';
    pAsphCtx.fillRect(4 + chkSize, y, chkSize, chkSize);

    pAsphCtx.fillStyle = even ? '#f97316' : '#fef3c7';
    pAsphCtx.fillRect(512 - 4 - chkSize * 2, y, chkSize, chkSize);
    pAsphCtx.fillStyle = even ? '#fef3c7' : '#f97316';
    pAsphCtx.fillRect(512 - 4 - chkSize, y, chkSize, chkSize);
  }
  // Subtle cream dashed lane markers
  pAsphCtx.fillStyle = 'rgba(255,250,235,0.42)';
  for (let y = 0; y < 512; y += 64) {
    pAsphCtx.fillRect(174, y + 10, 7, 30);
    pAsphCtx.fillRect(331, y + 10, 7, 30);
  }
  const plazaAsphaltMap = register(new THREE.CanvasTexture(pAsphC), true, 1, 38);

  // Asphalt Bump
  const [abC, abCtx] = makeCanvas(256, 256);
  abCtx.fillStyle = '#808080';
  abCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6000; i++) {
    const v = 90 + Math.floor(Math.random() * 75);
    abCtx.fillStyle = `rgb(${v},${v},${v})`;
    abCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  const asphaltBump = register(new THREE.CanvasTexture(abC), false, 1, 38);

  // 2. Sculpted Red/Slate Rumble Kerb
  const [kerbC, kerbCtx] = makeCanvas(128, 256);
  kerbCtx.fillStyle = '#dc2626';
  kerbCtx.fillRect(0, 0, 128, 128);
  kerbCtx.fillStyle = '#e2e8f0';
  kerbCtx.fillRect(0, 128, 128, 128);
  kerbCtx.fillStyle = 'rgba(15,23,42,0.28)';
  kerbCtx.fillRect(0, 0, 16, 256);
  kerbCtx.fillRect(114, 0, 14, 256);
  const kerbMap = register(new THREE.CanvasTexture(kerbC), true, 1, 74);

  // 2b. Warm Terracotta/Cream Resort Kerb
  const [pKerbC, pKerbCtx] = makeCanvas(128, 256);
  pKerbCtx.fillStyle = '#ea580c';
  pKerbCtx.fillRect(0, 0, 128, 128);
  pKerbCtx.fillStyle = '#fef3c7';
  pKerbCtx.fillRect(0, 128, 128, 128);
  pKerbCtx.fillStyle = 'rgba(124,45,18,0.24)';
  pKerbCtx.fillRect(0, 0, 16, 256);
  pKerbCtx.fillRect(114, 0, 14, 256);
  const plazaKerbMap = register(new THREE.CanvasTexture(pKerbC), true, 1, 74);

  // 2c. High-Detail Sculpted 3D Safety Barrier Panel Texture (Ribbed concrete + chevron safety rail, no plain white strip)
  const [divC, divCtx] = makeCanvas(256, 256);
  const barGrad = divCtx.createLinearGradient(0, 0, 256, 0);
  barGrad.addColorStop(0, '#334155');
  barGrad.addColorStop(0.35, '#475569');
  barGrad.addColorStop(0.65, '#64748b');
  barGrad.addColorStop(1, '#1e293b');
  divCtx.fillStyle = barGrad;
  divCtx.fillRect(0, 0, 256, 256);
  // Concrete panel seams
  divCtx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  for (let y = 0; y < 256; y += 64) {
    divCtx.fillRect(0, y, 256, 5);
  }
  // Angled warning chevron band along upper barrier face
  for (let y = 0; y < 256; y += 64) {
    divCtx.fillStyle = (y / 64) % 2 === 0 ? '#f59e0b' : '#0f172a';
    divCtx.fillRect(48, y + 6, 46, 54);
    divCtx.fillStyle = (y / 64) % 2 === 0 ? '#38bdf8' : '#1e293b';
    divCtx.fillRect(102, y + 6, 20, 54);
  }
  const dividerStripeMap = register(new THREE.CanvasTexture(divC), true, 1, 68);

  // 3. Turf Grass
  const [grassC, grassCtx] = makeCanvas(512, 512);
  grassCtx.fillStyle = '#2d8a3e';
  grassCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    grassCtx.fillStyle = (y / 64) % 2 === 0 ? '#369c49' : '#267835';
    grassCtx.fillRect(0, y, 512, 64);
  }
  for (let i = 0; i < 7000; i++) {
    grassCtx.fillStyle = Math.random() > 0.5 ? 'rgba(187,247,208,0.16)' : 'rgba(5,46,22,0.18)';
    grassCtx.fillRect(Math.random() * 512, Math.random() * 512, 2, 4);
  }
  const grassMap = register(new THREE.CanvasTexture(grassC), true, 32, 32);

  // 4. Checkered Start/Finish Line
  const [chkC, chkCtx] = makeCanvas(256, 128);
  const sq = 32;
  for (let y = 0; y < 128; y += sq) {
    for (let x = 0; x < 256; x += sq) {
      chkCtx.fillStyle = (x / sq + y / sq) % 2 === 0 ? '#ffffff' : '#0f172a';
      chkCtx.fillRect(x, y, sq, sq);
    }
  }
  const checkerMap = register(new THREE.CanvasTexture(chkC), true, 4, 1);

  // 5. Carbon Fiber Weave Bump
  const [carbC, carbCtx] = makeCanvas(64, 64);
  carbCtx.fillStyle = '#404040';
  carbCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) {
    for (let x = 0; x < 64; x += 8) {
      carbCtx.fillStyle = ((x + y) / 8) % 2 === 0 ? '#b0b0b0' : '#606060';
      carbCtx.fillRect(x, y, 7, 7);
    }
  }
  const carbonBump = register(new THREE.CanvasTexture(carbC), false, 8, 8);

  // 6. Rubber Tire Tread
  const [trC, trCtx] = makeCanvas(256, 256);
  trCtx.fillStyle = '#18181b';
  trCtx.fillRect(0, 0, 256, 256);
  trCtx.fillStyle = '#27272a';
  for (let y = 0; y < 256; y += 24) {
    trCtx.beginPath();
    trCtx.moveTo(0, y);
    trCtx.lineTo(128, y + 14);
    trCtx.lineTo(256, y);
    trCtx.lineTo(256, y + 9);
    trCtx.lineTo(128, y + 23);
    trCtx.lineTo(0, y + 9);
    trCtx.fill();
  }
  const tireTreadMap = register(new THREE.CanvasTexture(trC), true, 1, 3);

  const [trbC, trbCtx] = makeCanvas(256, 256);
  trbCtx.fillStyle = '#555555';
  trbCtx.fillRect(0, 0, 256, 256);
  trbCtx.fillStyle = '#ffffff';
  for (let y = 0; y < 256; y += 24) {
    trbCtx.beginPath();
    trbCtx.moveTo(0, y);
    trbCtx.lineTo(128, y + 14);
    trbCtx.lineTo(256, y);
    trbCtx.lineTo(256, y + 9);
    trbCtx.lineTo(128, y + 23);
    trbCtx.lineTo(0, y + 9);
    trbCtx.fill();
  }
  const tireTreadBump = register(new THREE.CanvasTexture(trbC), false, 1, 3);

  // 7. Animated Boost Pad Chevrons
  const [bpC, bpCtx] = makeCanvas(256, 256);
  const bgGrad = bpCtx.createLinearGradient(0, 0, 0, 256);
  bgGrad.addColorStop(0, '#0ea5e9');
  bgGrad.addColorStop(0.5, '#f97316');
  bgGrad.addColorStop(1, '#ec4899');
  bpCtx.fillStyle = '#090d16';
  bpCtx.fillRect(0, 0, 256, 256);
  bpCtx.strokeStyle = bgGrad;
  bpCtx.lineWidth = 24;
  bpCtx.lineCap = 'round';
  bpCtx.lineJoin = 'round';
  for (let y = 40; y <= 220; y += 72) {
    bpCtx.beginPath();
    bpCtx.moveTo(36, y + 36);
    bpCtx.lineTo(128, y - 16);
    bpCtx.lineTo(220, y + 36);
    bpCtx.stroke();
  }
  const boostPadMap = register(new THREE.CanvasTexture(bpC), true, 1, 1);

  // 8. Soft Radial Contact Shadow
  const [shC, shCtx] = makeCanvas(128, 128);
  const rad = shCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  rad.addColorStop(0, 'rgba(0,0,0,0.68)');
  rad.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = rad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shC);
  contactShadowMap.colorSpace = THREE.SRGBColorSpace;
  contactShadowMap.needsUpdate = true;
  created.push(contactShadowMap);

  // 9. Question Mark Item Box Face
  const [ibC, ibCtx] = makeCanvas(256, 256);
  const ibGrad = ibCtx.createLinearGradient(0, 0, 256, 256);
  ibGrad.addColorStop(0, '#38bdf8');
  ibGrad.addColorStop(0.5, '#a855f7');
  ibGrad.addColorStop(1, '#f43f5e');
  ibCtx.fillStyle = ibGrad;
  ibCtx.fillRect(0, 0, 256, 256);
  ibCtx.strokeStyle = '#ffffff';
  ibCtx.lineWidth = 18;
  ibCtx.strokeRect(12, 12, 232, 232);
  ibCtx.fillStyle = '#ffffff';
  ibCtx.font = '900 170px sans-serif';
  ibCtx.textAlign = 'center';
  ibCtx.textBaseline = 'middle';
  ibCtx.fillText('?', 128, 138);
  const itemBoxMap = register(new THREE.CanvasTexture(ibC), true, 1, 1);

  // 10. Carved Rock/Timber Archway Sign ("SHRITIZ" in bold Nintendo typography!)
  const [signC, signCtx] = makeCanvas(1024, 256);
  const woodGrad = signCtx.createLinearGradient(0, 0, 0, 256);
  woodGrad.addColorStop(0, '#a16207');
  woodGrad.addColorStop(0.5, '#854d0e');
  woodGrad.addColorStop(1, '#713f12');
  signCtx.fillStyle = woodGrad;
  signCtx.fillRect(0, 0, 1024, 256);
  signCtx.strokeStyle = '#422006';
  signCtx.lineWidth = 14;
  signCtx.strokeRect(10, 10, 1004, 236);
  signCtx.lineWidth = 4;
  for (let y = 64; y < 256; y += 64) {
    signCtx.beginPath();
    signCtx.moveTo(16, y);
    signCtx.lineTo(1008, y);
    signCtx.stroke();
  }
  signCtx.font = 'italic 900 148px sans-serif';
  signCtx.textAlign = 'center';
  signCtx.textBaseline = 'middle';
  signCtx.lineJoin = 'round';
  signCtx.lineWidth = 22;
  signCtx.strokeStyle = '#422006';
  signCtx.strokeText('SHRITIZ', 512, 136);
  signCtx.fillStyle = '#fde047';
  signCtx.fillText('SHRITIZ', 512, 132);
  const shritizArchSignMap = new THREE.CanvasTexture(signC);
  shritizArchSignMap.colorSpace = THREE.SRGBColorSpace;
  shritizArchSignMap.anisotropy = maxAnisotropy;
  shritizArchSignMap.needsUpdate = true;
  created.push(shritizArchSignMap);

  // 11. Warm Resort Plaza Facade Wall
  const [pwC, pwCtx] = makeCanvas(512, 256);
  pwCtx.fillStyle = '#fb923c';
  pwCtx.fillRect(0, 0, 512, 256);
  pwCtx.fillStyle = '#fed7aa';
  pwCtx.fillRect(0, 0, 512, 32);
  pwCtx.fillStyle = '#ea580c';
  pwCtx.fillRect(0, 218, 512, 38);
  for (let x = 28; x < 480; x += 120) {
    pwCtx.fillStyle = '#0c4a6e';
    pwCtx.fillRect(x, 54, 88, 140);
    pwCtx.fillStyle = '#38bdf8';
    pwCtx.fillRect(x + 8, 62, 72, 124);
    pwCtx.fillStyle = 'rgba(255,255,255,0.42)';
    pwCtx.beginPath();
    pwCtx.moveTo(x + 10, 64);
    pwCtx.lineTo(x + 48, 64);
    pwCtx.lineTo(x + 22, 184);
    pwCtx.lineTo(x + 10, 184);
    pwCtx.fill();
  }
  const plazaWallMap = register(new THREE.CanvasTexture(pwC), true, 2, 1);

  // 12. Sharp Jagged Electric-Blue Fiery Nitro Texture (Image 4 aesthetic, additive-ready)
  const [nfC, nfCtx] = makeCanvas(512, 128);
  nfCtx.clearRect(0, 0, 512, 128);
  // Multi-layered jagged flame wisps along U axis
  for (let pass = 0; pass < 3; pass++) {
    const grad = nfCtx.createLinearGradient(0, 0, 0, 128);
    if (pass === 0) {
      grad.addColorStop(0.0, 'rgba(37, 99, 235, 0)');
      grad.addColorStop(0.24, 'rgba(29, 78, 216, 0.55)');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.85)');
      grad.addColorStop(0.76, 'rgba(29, 78, 216, 0.55)');
      grad.addColorStop(1.0, 'rgba(37, 99, 235, 0)');
    } else if (pass === 1) {
      grad.addColorStop(0.0, 'rgba(56, 189, 248, 0)');
      grad.addColorStop(0.32, 'rgba(14, 165, 233, 0.85)');
      grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.98)');
      grad.addColorStop(0.68, 'rgba(14, 165, 233, 0.85)');
      grad.addColorStop(1.0, 'rgba(56, 189, 248, 0)');
    } else {
      grad.addColorStop(0.0, 'rgba(224, 242, 254, 0)');
      grad.addColorStop(0.43, 'rgba(125, 211, 252, 0.92)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.57, 'rgba(125, 211, 252, 0.92)');
      grad.addColorStop(1.0, 'rgba(224, 242, 254, 0)');
    }
    nfCtx.fillStyle = grad;
    const count = pass === 0 ? 44 : pass === 1 ? 68 : 80;
    for (let i = 0; i < count; i++) {
      const x = (i / count) * 512;
      const w = 16 + Math.random() * 28;
      const amp = pass === 0 ? 52 : pass === 1 ? 36 : 18;
      const jitter = (Math.random() - 0.5) * 14;
      nfCtx.beginPath();
      nfCtx.moveTo(x - w * 0.4, 64 + jitter);
      nfCtx.lineTo(x + w * 0.25, 64 - amp * (0.5 + Math.random() * 0.5));
      nfCtx.lineTo(x + w * 0.85, 64 + jitter * 0.4);
      nfCtx.lineTo(x + w * 0.25, 64 + amp * (0.5 + Math.random() * 0.5));
      nfCtx.closePath();
      nfCtx.fill();
    }
  }
  const nitroFlameMap = register(new THREE.CanvasTexture(nfC), true, 2, 1);

  // 13. Iridescent Dark Oil Slick Surface Swirl
  const [oilC, oilCtx] = makeCanvas(256, 256);
  oilCtx.fillStyle = '#090b10';
  oilCtx.fillRect(0, 0, 256, 256);
  const iridColors = [
    'rgba(168, 85, 247, 0.26)',
    'rgba(56, 189, 248, 0.24)',
    'rgba(34, 197, 94, 0.2)',
    'rgba(244, 63, 94, 0.22)',
  ];
  for (let i = 0; i < 6; i++) {
    const cx = 64 + Math.random() * 128;
    const cy = 64 + Math.random() * 128;
    const g = oilCtx.createRadialGradient(cx, cy, 4, cx, cy, 78);
    g.addColorStop(0, iridColors[i % iridColors.length]);
    g.addColorStop(0.55, iridColors[(i + 1) % iridColors.length]);
    g.addColorStop(1, 'rgba(9, 11, 16, 0)');
    oilCtx.fillStyle = g;
    oilCtx.fillRect(0, 0, 256, 256);
  }
  const oilSlickMap = register(new THREE.CanvasTexture(oilC), true, 1, 1);

  return {
    asphaltMap,
    plazaAsphaltMap,
    asphaltBump,
    kerbMap,
    plazaKerbMap,
    dividerStripeMap,
    grassMap,
    checkerMap,
    carbonBump,
    tireTreadMap,
    tireTreadBump,
    boostPadMap,
    contactShadowMap,
    itemBoxMap,
    shritizArchSignMap,
    plazaWallMap,
    nitroFlameMap,
    oilSlickMap,
    dispose: () => {
      created.forEach((t) => t.dispose());
    },
  };
}

export function createEmblemTexture(
  emblem: string,
  bgHex: string,
  accentHex: string
): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bgHex;
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = bgHex;
  ctx.font = emblem.length > 2 ? '900 34px sans-serif' : '900 58px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emblem, 64, 68);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(64, 64, 52, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createJumbotronTexture(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
} {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = '#090d1a';
  ctx.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { canvas, ctx, texture };
}

export function updateJumbotronCanvas(
  ctx: CanvasRenderingContext2D,
  texture: THREE.CanvasTexture,
  standings: { name: string; color: string; rank: number; lap: number }[],
  phaseText: string
): void {
  ctx.fillStyle = '#070b14';
  ctx.fillRect(0, 0, 512, 256);

  const hdr = ctx.createLinearGradient(0, 0, 512, 0);
  hdr.addColorStop(0, '#ef4444');
  hdr.addColorStop(0.5, '#f59e0b');
  hdr.addColorStop(1, '#3b82f6');
  ctx.fillStyle = hdr;
  ctx.fillRect(0, 0, 512, 46);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SHRITIZ GRAND PRIX', 18, 31);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fef08a';
  ctx.fillText(phaseText, 494, 31);

  const rows = standings.slice(0, 4);
  rows.forEach((row, idx) => {
    const y = 62 + idx * 46;
    ctx.fillStyle = idx === 0 ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(16, y, 480, 38);
    ctx.fillStyle = row.color;
    ctx.fillRect(16, y, 10, 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 21px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`#${row.rank}  ${row.name.toUpperCase()}`, 38, y + 26);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#93c5fd';
    ctx.fillText(`LAP ${Math.min(row.lap, 3)}/3`, 480, y + 26);
  });

  texture.needsUpdate = true;
}
