export interface IStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
  speedY: number;
}

export interface IRotatingNebula {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  rotSpeed: number;
  colorStop0: string;
  colorStop1: string;
  pulsePhase: number;
  pulseSpeed: number;
}

export interface IShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  alpha: number;
  active: boolean;
  color: string;
}

export class BackgroundRenderer {
  private starsLayer1: IStar[] = [];
  private starsLayer2: IStar[] = [];
  private nebulae: IRotatingNebula[] = [];
  private meteors: IShootingStar[] = [];
  private meteorSpawnTimer: number = 2.0; // 倒數生成流星
  private width: number;
  private height: number;

  constructor(width: number = 450, height: number = 800) {
    this.width = width;
    this.height = height;
    this.initStars();
    this.initNebulae();
  }

  private initStars(): void {
    // 遠景微弱微星 (50 顆)
    for (let i = 0; i < 50; i++) {
      this.starsLayer1.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.8 + Math.random() * 0.8,
        baseAlpha: 0.2 + Math.random() * 0.4,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#ffffff',
        speedY: 0.04 + Math.random() * 0.04
      });
    }

    // 近景立體亮星 (28 顆)
    const brightColors = ['#80d8ff', '#ffd54f', '#e1bee7', '#ffffff', '#b388ff'];
    for (let i = 0; i < 28; i++) {
      this.starsLayer2.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1.6 + Math.random() * 1.4,
        baseAlpha: 0.4 + Math.random() * 0.5,
        twinkleSpeed: 0.03 + Math.random() * 0.06,
        twinklePhase: Math.random() * Math.PI * 2,
        color: brightColors[Math.floor(Math.random() * brightColors.length)],
        speedY: 0.10 + Math.random() * 0.08
      });
    }
  }

  private initNebulae(): void {
    // 3 個深空旋轉星雲
    this.nebulae = [
      {
        x: this.width * 0.28,
        y: this.height * 0.35,
        radiusX: 200,
        radiusY: 130,
        rotation: 0.2,
        rotSpeed: 0.015,
        colorStop0: 'rgba(88, 28, 135, 0.22)', // 獵戶紫雲
        colorStop1: 'rgba(15, 23, 42, 0)',
        pulsePhase: 0,
        pulseSpeed: 0.03
      },
      {
        x: this.width * 0.72,
        y: this.height * 0.65,
        radiusX: 240,
        radiusY: 150,
        rotation: 1.1,
        rotSpeed: -0.012,
        colorStop0: 'rgba(30, 64, 175, 0.20)', // 仙女深藍
        colorStop1: 'rgba(15, 23, 42, 0)',
        pulsePhase: 1.5,
        pulseSpeed: 0.025
      },
      {
        x: this.width * 0.5,
        y: this.height * 0.15,
        radiusX: 180,
        radiusY: 100,
        rotation: -0.5,
        rotSpeed: 0.018,
        colorStop0: 'rgba(13, 148, 136, 0.16)', // 翠青星雲
        colorStop1: 'rgba(15, 23, 42, 0)',
        pulsePhase: 2.8,
        pulseSpeed: 0.035
      }
    ];
  }

  private spawnMeteor(): void {
    const startX = Math.random() * (this.width * 0.8) + this.width * 0.2;
    const startY = Math.random() * (this.height * 0.35);
    const speed = 7 + Math.random() * 5;
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3; // 45 度角斜劃

    this.meteors.push({
      x: startX,
      y: startY,
      vx: -Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 60 + Math.random() * 50,
      alpha: 1.0,
      active: true,
      color: Math.random() > 0.4 ? '#80d8ff' : '#ffffff'
    });
  }

  public update(deltaMs: number): void {
    const dt = deltaMs * 0.001;

    // 更新遠景星
    for (const star of this.starsLayer1) {
      star.twinklePhase += star.twinkleSpeed;
      star.y += star.speedY;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // 更新近景星
    for (const star of this.starsLayer2) {
      star.twinklePhase += star.twinkleSpeed;
      star.y += star.speedY;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // 更新旋轉星雲
    for (const neb of this.nebulae) {
      neb.rotation += neb.rotSpeed * dt;
      neb.pulsePhase += neb.pulseSpeed;
    }

    // 定期生成微型流星
    this.meteorSpawnTimer -= dt;
    if (this.meteorSpawnTimer <= 0) {
      this.spawnMeteor();
      this.meteorSpawnTimer = 3.5 + Math.random() * 4.5; // 每 3.5 ~ 8 秒划過一顆
    }

    // 更新流星
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.alpha -= dt * 1.4;
      if (m.alpha <= 0 || m.x < -100 || m.y > this.height + 100) {
        this.meteors.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. 深邃虛空漸層底色
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#040612');
    bgGrad.addColorStop(0.4, '#080c22');
    bgGrad.addColorStop(1, '#0c102a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 隨機旋轉的遙遠深空星雲 (Rotating Distant Nebulae)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const neb of this.nebulae) {
      ctx.save();
      ctx.translate(neb.x, neb.y);
      ctx.rotate(neb.rotation);

      const pulse = 1.0 + 0.12 * Math.sin(neb.pulsePhase);
      const rx = neb.radiusX * pulse;
      const ry = neb.radiusY * pulse;

      const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, rx);
      grad.addColorStop(0, neb.colorStop0);
      grad.addColorStop(1, neb.colorStop1);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // 星雲內部微光旋臂層
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.55, ry * 0.45, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // 3. 繪製遠景閃爍星點
    for (const star of this.starsLayer1) {
      const alpha = Math.max(0.05, star.baseAlpha + 0.25 * Math.sin(star.twinklePhase));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. 繪製近景立體亮星
    for (const star of this.starsLayer2) {
      const alpha = Math.max(0.1, star.baseAlpha + 0.3 * Math.sin(star.twinklePhase));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.shadowColor = star.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. 繪製微型流星划過 (Shooting Stars)
    for (const m of this.meteors) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.max(0, m.alpha);

      // 計算尾部起點 (逆向量)
      const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
      const tailX = m.x - (m.vx / speed) * m.length;
      const tailY = m.y - (m.vy / speed) * m.length;

      const meteorGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
      meteorGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      meteorGrad.addColorStop(0.6, m.color);
      meteorGrad.addColorStop(1, '#ffffff');

      ctx.strokeStyle = meteorGrad;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // 流星頭部微型高光光點
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }
}
