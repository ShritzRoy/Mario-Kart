export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicTempoMs = 155;
  private isPlayingMusic = false;

  public init(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.42;
    this.masterGain.connect(this.ctx.destination);

    // Continuous kart engine synth
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 65;

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.value = 130;

    this.engineOsc.connect(filter);
    this.engineOsc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.engineOsc2.start();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.03);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(speedRatio: number, isBoosting: boolean, isRacing: boolean): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineOsc2) return;
    if (!isRacing) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      return;
    }
    const baseFreq = 58 + Math.min(speedRatio, 1.35) * 115 + (isBoosting ? 42 : 0);
    this.engineOsc.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.98, this.ctx.currentTime, 0.05);
    const vol = 0.06 + Math.min(speedRatio, 1) * 0.07 + (isBoosting ? 0.05 : 0);
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.06);
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
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playSelect(): void {
    this.init();
    this.playTone(523.25, 0.08, 'triangle', 0.14, 659.25);
    this.playTone(783.99, 0.12, 'sine', 0.12, undefined, 0.05);
  }

  public playHop(): void {
    this.playTone(220, 0.11, 'sine', 0.15, 480);
  }

  public playDriftLevel(level: number): void {
    const base = level === 1 ? 520 : level === 2 ? 720 : 980;
    this.playTone(base, 0.12, 'sawtooth', 0.1, base * 1.25);
  }

  public playBoost(power = 1): void {
    this.playTone(180 * power, 0.28, 'sawtooth', 0.18, 620 * power);
    this.playTone(360 * power, 0.32, 'triangle', 0.12, 880 * power, 0.03);
  }

  public playCountdown(go: boolean): void {
    this.init();
    if (go) {
      this.playTone(880, 0.36, 'square', 0.16);
      this.playTone(1174.66, 0.42, 'triangle', 0.14, undefined, 0.04);
    } else {
      this.playTone(440, 0.18, 'square', 0.13);
    }
  }

  public playItemBox(): void {
    this.playTone(660, 0.07, 'square', 0.12);
    this.playTone(880, 0.07, 'square', 0.12, undefined, 0.07);
    this.playTone(1046.5, 0.14, 'triangle', 0.15, undefined, 0.14);
  }

  public playShellFire(): void {
    this.playTone(340, 0.16, 'sawtooth', 0.16, 120);
  }

  public playHit(): void {
    this.playTone(240, 0.3, 'sawtooth', 0.22, 55);
    this.playTone(160, 0.35, 'square', 0.16, 42, 0.04);
  }

  public playLap(finalLap: boolean): void {
    if (finalLap) {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((n, idx) => this.playTone(n, 0.16, 'square', 0.14, undefined, idx * 0.08));
      this.setFinalLapTempo(true);
    } else {
      this.playTone(587.33, 0.12, 'triangle', 0.16);
      this.playTone(880, 0.22, 'triangle', 0.16, undefined, 0.1);
    }
  }

  public playFinish(): void {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    fanfare.forEach((n, idx) =>
      this.playTone(n, idx === fanfare.length - 1 ? 0.5 : 0.14, 'triangle', 0.18, undefined, idx * 0.12)
    );
  }

  public setFinalLapTempo(finalLap: boolean): void {
    const nextTempo = finalLap ? 118 : 155;
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
    const bassSeq = [130.81, 130.81, 164.81, 196.0, 146.83, 146.83, 174.61, 196.0, 130.81, 130.81, 196.0, 220.0, 174.61, 196.0, 246.94, 196.0];
    const leadSeq = [523.25, 0, 659.25, 783.99, 659.25, 0, 587.33, 659.25, 523.25, 783.99, 880.0, 0, 783.99, 659.25, 587.33, 659.25];

    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
      const idx = this.musicStep % bassSeq.length;
      this.playTone(bassSeq[idx], 0.12, 'triangle', 0.065);
      const lead = leadSeq[idx];
      if (lead > 0) {
        this.playTone(lead, 0.11, 'square', 0.042);
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
      this.engineOsc?.stop();
      this.engineOsc2?.stop();
      void this.ctx?.close();
    } catch {
      // ignore close errors
    }
    this.ctx = null;
  }
}
