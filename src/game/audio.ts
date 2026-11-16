export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private turboOsc: OscillatorNode | null = null;
  private turboGain: GainNode | null = null;

  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicTempoMs = 152;
  private isPlayingMusic = false;
  private engineInitialized = false;

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.44;
    this.masterGain.connect(this.ctx.destination);

    this.setupEngineSynth();
  }

  private setupEngineSynth(): void {
    if (!this.ctx || !this.masterGain || this.engineInitialized) return;
    this.engineInitialized = true;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    // Warm soft-clipping waveshaper for punchy arcade kart growl
    const shaper = this.ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + 10) * x * 20 * (Math.PI / 180)) / (Math.PI + 10 * Math.abs(x));
    }
    shaper.curve = curve;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 340;
    this.engineFilter.Q.value = 2.6;

    // 3-harmonic kart engine voice (sawtooth fundamental + octave pulse + deep sub)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 54;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 108;

    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 27;

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.28;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.55;

    this.engineOsc1.connect(shaper);
    this.engineOsc2.connect(osc2Gain);
    osc2Gain.connect(shaper);
    this.engineSubOsc.connect(subGain);
    subGain.connect(this.engineFilter);

    shaper.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    // Supercharger / Turbo whine layer for Nitro boosts
    this.turboGain = this.ctx.createGain();
    this.turboGain.gain.value = 0;
    this.turboOsc = this.ctx.createOscillator();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.value = 420;
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();
    this.turboOsc.start();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.44, this.ctx.currentTime, 0.03);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(
    speedRatio: number,
    isBoosting: boolean,
    isRacing: boolean,
    throttleActive = false,
    isCountdown = false
  ): void {
    if (
      !this.ctx ||
      !this.engineGain ||
      !this.engineOsc1 ||
      !this.engineOsc2 ||
      !this.engineSubOsc ||
      !this.engineFilter ||
      !this.turboGain ||
      !this.turboOsc
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!isRacing && !isCountdown) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.turboGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }

    // Smooth 3-gear simulated RPM curve for realistic revving feel
    const clampedSpd = Math.max(0, Math.min(1.4, speedRatio));
    let rpmRatio = clampedSpd;
    if (clampedSpd > 0.38 && clampedSpd < 0.72) {
      rpmRatio = 0.28 + ((clampedSpd - 0.38) / 0.34) * 0.56;
    } else if (clampedSpd >= 0.72) {
      rpmRatio = 0.44 + ((clampedSpd - 0.72) / 0.68) * 0.85;
    }

    const idleRev = isCountdown ? (throttleActive ? 0.58 : 0.08) : throttleActive && clampedSpd < 0.15 ? 0.32 : 0;
    const effRpm = Math.max(rpmRatio, idleRev);
    const flutter = Math.sin(now * 48) * (throttleActive ? 2.2 : 0.8);

    const baseFreq = 48 + effRpm * 104 + (isBoosting ? 32 : 0) + flutter;
    this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.04);
    this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);

    const cutoff = 260 + effRpm * 820 + (throttleActive ? 260 : 0) + (isBoosting ? 640 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

    const vol = (isCountdown ? 0.055 : 0.075) + effRpm * 0.068 + (isBoosting ? 0.04 : 0);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.05);

    // Supercharger whine when nitro/boost active
    this.turboOsc.frequency.setTargetAtTime(520 + effRpm * 420, now, 0.06);
    this.turboGain.gain.setTargetAtTime(isBoosting ? 0.045 : 0, now, 0.05);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainVal = 0.16,
    freqEnd?: number,
    delay = 0
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoiseBurst(duration: number, filterFreq: number, gainVal: number, delay = 0): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const len = Math.max(128, Math.floor(this.ctx.sampleRate * duration));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime + delay;
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  public playSelect(): void {
    this.init();
    this.playTone(587.33, 0.075, 'triangle', 0.14, 783.99);
    this.playTone(987.77, 0.11, 'sine', 0.12, undefined, 0.045);
  }

  public playHop(): void {
    // Classic MK kart hop boing
    this.playTone(196, 0.09, 'sine', 0.16, 460);
    this.playTone(392, 0.08, 'triangle', 0.09, 620, 0.015);
  }

  public playDriftLevel(level: number): void {
    // Classic ascending mini-turbo spark chime
    const base = level === 1 ? 587.33 : level === 2 ? 783.99 : 1046.5;
    this.playTone(base, 0.11, 'square', 0.09, base * 1.18);
    this.playTone(base * 1.5, 0.14, 'triangle', 0.12, undefined, 0.025);
  }

  public playBoost(power = 1): void {
    // Whoosh noise + rising turbo power chord
    this.playNoiseBurst(0.32, 950 * power, 0.18);
    this.playTone(196 * power, 0.26, 'sawtooth', 0.16, 680 * power);
    this.playTone(392 * power, 0.3, 'triangle', 0.13, 987 * power, 0.025);
  }

  public playCountdown(go: boolean): void {
    this.init();
    if (go) {
      // Iconic bright starting chord (F5 + A5 + C6 + F6)
      this.playTone(698.46, 0.42, 'square', 0.11);
      this.playTone(880.0, 0.44, 'triangle', 0.13, undefined, 0.01);
      this.playTone(1046.5, 0.48, 'triangle', 0.14, undefined, 0.02);
      this.playTone(1396.91, 0.48, 'sine', 0.12, undefined, 0.03);
    } else {
      // Iconic Mario Kart low-pitched pip
      this.playTone(349.23, 0.19, 'square', 0.12, 342);
      this.playTone(698.46, 0.16, 'triangle', 0.07);
    }
  }

  public playItemBox(): void {
    // Glassy crystal shatter + box chime
    this.playNoiseBurst(0.14, 2400, 0.14);
    this.playTone(783.99, 0.07, 'square', 0.1);
    this.playTone(1046.5, 0.09, 'triangle', 0.13, undefined, 0.05);
  }

  public playRouletteTick(step: number): void {
    // Rapid MK slot-machine blip alternating tones
    const notes = [659.25, 783.99, 880.0, 987.77, 1046.5, 1174.66];
    const freq = notes[step % notes.length];
    this.playTone(freq, 0.05, 'triangle', 0.09);
  }

  public playItemClaim(): void {
    // Iconic MK item lock-in celebratory chime!
    this.playTone(1046.5, 0.08, 'square', 0.1);
    this.playTone(1318.51, 0.09, 'triangle', 0.13, undefined, 0.05);
    this.playTone(1567.98, 0.18, 'triangle', 0.15, undefined, 0.1);
  }

  public playShellFire(): void {
    this.playNoiseBurst(0.12, 1200, 0.15);
    this.playTone(460, 0.16, 'sawtooth', 0.15, 140);
  }

  public playHit(): void {
    this.playNoiseBurst(0.28, 450, 0.24);
    this.playTone(260, 0.32, 'sawtooth', 0.22, 48);
    this.playTone(185, 0.36, 'square', 0.15, 38, 0.03);
  }

  public playFireball(): void {
    this.playNoiseBurst(0.18, 1600, 0.16);
    this.playTone(620, 0.16, 'sawtooth', 0.14, 210);
    this.playTone(940, 0.1, 'triangle', 0.1, 440, 0.02);
  }

  public playBell(): void {
    this.playTone(1046.5, 0.18, 'sine', 0.16);
    this.playTone(1567.98, 0.22, 'triangle', 0.14, undefined, 0.045);
    this.playTone(2093.0, 0.26, 'sine', 0.12, undefined, 0.09);
  }

  public playBalloonShield(): void {
    this.playTone(392, 0.12, 'sine', 0.14, 784);
    this.playTone(587.33, 0.15, 'triangle', 0.12, 988, 0.04);
  }

  public playHeavySplash(): void {
    this.playNoiseBurst(0.26, 320, 0.24);
    this.playTone(140, 0.28, 'triangle', 0.22, 52);
    this.playTone(220, 0.18, 'sawtooth', 0.14, 75, 0.02);
  }

  public playBumpSpark(): void {
    this.playNoiseBurst(0.08, 3200, 0.11);
    this.playTone(720, 0.07, 'square', 0.08, 360);
  }

  public playLap(finalLap: boolean): void {
    if (finalLap) {
      // Iconic Mario Kart Final Lap warning siren + upbeat tempo shift
      const notes = [587.33, 739.99, 880.0, 1174.66, 880.0, 1174.66];
      notes.forEach((n, idx) =>
        this.playTone(n, idx === notes.length - 1 ? 0.34 : 0.13, 'square', 0.13, undefined, idx * 0.075)
      );
      this.setFinalLapTempo(true);
    } else {
      // Lakitu lap chime
      this.playTone(659.25, 0.1, 'triangle', 0.15);
      this.playTone(987.77, 0.24, 'triangle', 0.16, undefined, 0.09);
    }
  }

  public playFinish(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
    fanfare.forEach((n, idx) =>
      this.playTone(
        n,
        idx === fanfare.length - 1 ? 0.56 : 0.14,
        idx % 2 === 0 ? 'triangle' : 'square',
        0.14,
        undefined,
        idx * 0.11
      )
    );
  }

  public setFinalLapTempo(finalLap: boolean): void {
    const nextTempo = finalLap ? 114 : 152;
    if (nextTempo === this.musicTempoMs) return;
    this.musicTempoMs = nextTempo;
    if (this.isPlayingMusic) {
      this.stopMusic();
      this.startMusic();
    }
  }

  public startMusic(): void {
    this.init();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    const bassSeq = [
      130.81, 130.81, 164.81, 196.0, 146.83, 146.83, 174.61, 196.0, 130.81, 130.81, 196.0, 220.0,
      174.61, 196.0, 246.94, 196.0,
    ];
    const leadSeq = [
      523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 659.25, 523.25, 783.99, 880.0, 0, 783.99,
      659.25, 587.33, 659.25,
    ];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
      const idx = this.musicStep % bassSeq.length;
      this.playTone(bassSeq[idx], 0.11, 'triangle', 0.055);
      const lead = leadSeq[idx];
      if (lead > 0) {
        this.playTone(lead, 0.1, 'square', 0.036);
      }
      this.musicStep++;
    }, this.musicTempoMs);
  }

  public stopMusic(): void {
    this.isPlayingMusic = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public dispose(): void {
    this.stopMusic();
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSubOsc?.stop();
      this.turboOsc?.stop();
      void this.ctx?.close();
    } catch {
      // ignore close errors
    }
    this.ctx = null;
  }
}
