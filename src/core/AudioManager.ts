export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor(initialMuted: boolean = false) {
    this.muted = initialMuted;
  }

  public initOnGesture(): void {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  // 1. 投擲下落音 (柔和微型正弦滑降)
  public playDrop(): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // 容錯保護
    }
  }

  // 2. 引力融合和弦音 (依階級升階，五聲音階 + 諧波)
  public playMerge(tier: number): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const pentatonic = [
        261.63, 293.66, 329.63, 392.00, 440.00,
        523.25, 587.33, 659.25, 783.99, 880.00,
        1046.50, 1174.66
      ];
      const baseFreq = pentatonic[Math.min(tier - 1, pentatonic.length - 1)];

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = tier >= 8 ? 'triangle' : 'sine';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, now); // 五度和弦

      const duration = 0.28 + Math.min(tier * 0.02, 0.2);
      const volume = Math.min(0.25 + tier * 0.015, 0.45);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // 容錯保護
    }
  }

  // 2.5 連鎖共鳴水晶和弦琶音 (Cascade Arpeggio)
  public playCascadeArpeggio(chainCount: number): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 根據連鎖次數升階和弦琶音 (E6, G#6, B6, E7, F#7, G#7...)
      const arpeggioNotes = [
        [659.25, 830.61, 987.77],          // 2x chain
        [830.61, 987.77, 1318.51],         // 3x chain
        [987.77, 1318.51, 1661.22],        // 4x chain
        [1318.51, 1661.22, 1975.53, 2637]  // 5x+ chain
      ];
      const notes = arpeggioNotes[Math.min(chainCount - 2, arpeggioNotes.length - 1)] || arpeggioNotes[0];

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const noteTime = now + idx * 0.055;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.22, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.35);
      });
    } catch {
      // 容錯保護
    }
  }

  // 3. 超新星爆發音 (低通濾波白噪音爆炸 + 衝擊巨響 + 低頻衝擊)
  public playSupernova(intensity: number = 1): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100 * intensity, now);
      filter.frequency.exponentialRampToValueAtTime(35, now + 0.9);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(Math.min(0.65, 0.45 * intensity), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.9);

      // 低頻次重音震盪 (Sub-bass rumble)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

      subGain.gain.setValueAtTime(0.4 * intensity, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.6);
    } catch {
      // 容錯保護
    }
  }

  // 3.5 終極黑洞奇異點誕生音效
  public playSingularityBirth(): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // 奇異點時空畸變逆向滑音
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // 容錯保護
    }
  }

  // 4. 黑洞引力吞噬消融音 (鋸齒波空靈音)
  public playWarp(): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // 容錯保護
    }
  }

  // 5. 急促警戒蜂鳴音 (方波脈衝)
  public playHazardBeep(): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // 容錯保護
    }
  }

  // 6. 宇宙坍縮 Game Over 音效
  public playGameOver(): void {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch {
      // 容錯保護
    }
  }
}
