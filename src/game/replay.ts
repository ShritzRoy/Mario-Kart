export type ReplayEventKind = 'drift_boost' | 'hit' | 'overtake' | 'air_boost' | 'finish';

export interface ReplayEvent {
  timeMs: number;
  kind: ReplayEventKind;
  kartId: string;
  label: string;
}

export interface ReplayKartPose {
  id: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  wheelAngle: number;
  steerVisual: number;
  driftDir: number;
  driftLevel: number;
  boostActive: boolean;
  starActive: boolean;
  hopY: number;
  spinTimer: number;
}

export interface ReplayFrame {
  timeMs: number;
  karts: ReplayKartPose[];
}

export interface ReplaySampledFrame {
  timeMs: number;
  karts: ReplayKartPose[];
  cameraMode: 'chase' | 'heli' | 'curb' | 'front';
  focusKartId: string;
  activeEventLabel: string | null;
}

export class RaceReplayRecorder {
  private frames: ReplayFrame[] = [];
  private events: ReplayEvent[] = [];
  private sampleAccum = 0;
  private maxFrames = 3600; // ~4 minutes at 15Hz

  public reset(): void {
    this.frames = [];
    this.events = [];
    this.sampleAccum = 0;
  }

  public recordEvent(timeMs: number, kind: ReplayEventKind, kartId: string, label: string): void {
    // Avoid spamming duplicate events within 600ms
    const last = this.events[this.events.length - 1];
    if (last && last.kind === kind && last.kartId === kartId && timeMs - last.timeMs < 600) {
      return;
    }
    this.events.push({ timeMs, kind, kartId, label });
  }

  public maybeSample(dt: number, timeMs: number, karts: ReplayKartPose[]): void {
    this.sampleAccum += dt;
    if (this.sampleAccum < 0.065) return; // ~15Hz sampling
    this.sampleAccum = 0;
    if (this.frames.length >= this.maxFrames) {
      this.frames.shift();
    }
    this.frames.push({
      timeMs,
      karts: karts.map((k) => ({ ...k })),
    });
  }

  public getDurationMs(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].timeMs;
  }

  public getEvents(): ReplayEvent[] {
    return this.events;
  }

  public hasData(): boolean {
    return this.frames.length >= 2;
  }

  public sampleAt(timeMs: number, playerKartId: string): ReplaySampledFrame | null {
    if (this.frames.length === 0) return null;
    if (this.frames.length === 1) {
      return {
        timeMs: this.frames[0].timeMs,
        karts: this.frames[0].karts,
        cameraMode: 'heli',
        focusKartId: playerKartId,
        activeEventLabel: null,
      };
    }

    // Binary search frame bracket
    let lo = 0;
    let hi = this.frames.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (this.frames[mid].timeMs <= timeMs) lo = mid;
      else hi = mid;
    }

    const fA = this.frames[lo];
    const fB = this.frames[hi];
    const span = Math.max(1, fB.timeMs - fA.timeMs);
    const alpha = Math.max(0, Math.min(1, (timeMs - fA.timeMs) / span));

    const interpolated: ReplayKartPose[] = fA.karts.map((ka, idx) => {
      const kb = fB.karts[idx] ?? ka;
      let dh = kb.heading - ka.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;

      return {
        ...ka,
        x: ka.x + (kb.x - ka.x) * alpha,
        y: ka.y + (kb.y - ka.y) * alpha,
        z: ka.z + (kb.z - ka.z) * alpha,
        heading: ka.heading + dh * alpha,
        wheelAngle: ka.wheelAngle + (kb.wheelAngle - ka.wheelAngle) * alpha,
        hopY: ka.hopY + (kb.hopY - ka.hopY) * alpha,
        steerVisual: ka.steerVisual + (kb.steerVisual - ka.steerVisual) * alpha,
      };
    });

    // Pick cinematic camera angle based on nearby key event or 3.5s cadence
    const nearbyEvent = this.events.find(
      (ev) => timeMs >= ev.timeMs - 900 && timeMs <= ev.timeMs + 1800
    );

    let cameraMode: 'chase' | 'heli' | 'curb' | 'front' = 'heli';
    let focusKartId = playerKartId;
    let activeEventLabel: string | null = null;

    if (nearbyEvent) {
      focusKartId = nearbyEvent.kartId;
      activeEventLabel = nearbyEvent.label;
      if (nearbyEvent.kind === 'overtake') cameraMode = 'curb';
      else if (nearbyEvent.kind === 'hit') cameraMode = 'front';
      else if (nearbyEvent.kind === 'air_boost') cameraMode = 'heli';
      else cameraMode = 'curb';
    } else {
      const cycle = Math.floor(timeMs / 3600) % 4;
      cameraMode = cycle === 0 ? 'heli' : cycle === 1 ? 'curb' : cycle === 2 ? 'chase' : 'front';
    }

    return {
      timeMs,
      karts: interpolated,
      cameraMode,
      focusKartId,
      activeEventLabel,
    };
  }
}
