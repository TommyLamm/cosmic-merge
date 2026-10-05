export interface IParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface IShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  width: number;
}

export interface IFloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: IParticle[] = [];
  private shockwaves: IShockwave[] = [];
  private floatingTexts: IFloatingText[] = [];

  public shakeMagnitude: number = 0;
  public shakeDuration: number = 0;
  public shakeOffsetX: number = 0;
  public shakeOffsetY: number = 0;

  public triggerShake(magnitude: number, duration: number = 180): void {
    this.shakeMagnitude = Math.max(this.shakeMagnitude, magnitude);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  // 1. 產生合成爆裂星塵粒子
  public emitMergeSparks(x: number, y: number, color: string, count: number = 24): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 4.5;
      const life = 30 + Math.random() * 25;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.5,
        color,
        alpha: 1,
        life,
        maxLife: life
      });
    }
  }

  // 2. 產生擴散衝擊波環 (支援震盪寬度與發光)
  public emitShockwave(x: number, y: number, color: string, startRadius: number, maxRadius: number, width: number = 4): void {
    this.shockwaves.push({
      x,
      y,
      radius: startRadius,
      maxRadius,
      color,
      alpha: 0.95,
      width
    });
  }

  // 2.5 超新星全螢幕星塵爆裂 (Supernova Dust Burst)
  public emitSupernovaDust(x: number, y: number, count: number = 70): void {
    const supernovaColors = ['#ffffff', '#fff59d', '#ffb74d', '#ff7043', '#80d8ff', '#b388ff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 8.5;
      const life = 45 + Math.random() * 35;
      const color = supernovaColors[Math.floor(Math.random() * supernovaColors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 4.5,
        color,
        alpha: 1,
        life,
        maxLife: life
      });
    }
  }

  // 2.6 全螢幕衝擊閃光
  private screenFlashAlpha: number = 0;
  private screenFlashColor: string = '#ffffff';
  private screenFlashDuration: number = 0;
  private screenFlashMaxDuration: number = 0;

  public triggerScreenFlash(color: string = '#ffffff', maxAlpha: number = 0.5, durationMs: number = 220): void {
    this.screenFlashColor = color;
    this.screenFlashAlpha = maxAlpha;
    this.screenFlashDuration = durationMs;
    this.screenFlashMaxDuration = durationMs;
  }

  // 3. 產生浮動積分標記 (支援字體大小與色調)
  public emitFloatingText(x: number, y: number, text: string, color: string = '#ffd54f', size: number = 22): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -1.4,
      text,
      color,
      size,
      alpha: 1,
      life: 50,
      maxLife: 50
    });
  }

  public update(deltaMs: number): void {
    // 更新震屏
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaMs;
      const damping = Math.max(0, this.shakeDuration / 180);
      const currentMag = this.shakeMagnitude * damping;
      this.shakeOffsetX = (Math.random() * 2 - 1) * currentMag;
      this.shakeOffsetY = (Math.random() * 2 - 1) * currentMag;
      if (this.shakeDuration <= 0) {
        this.shakeMagnitude = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // 宇宙微重力下沉
      p.life -= 1;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 更新衝擊波
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      const speed = (sw.maxRadius - sw.radius) * 0.12 + 1.5;
      sw.radius += speed;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0.02) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 更新浮動飄字
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 1;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
    // 更新全螢幕閃光
    if (this.screenFlashDuration > 0) {
      this.screenFlashDuration -= deltaMs;
      if (this.screenFlashDuration <= 0) {
        this.screenFlashAlpha = 0;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 繪製衝擊波 (Lighter 發光混合)
    ctx.globalCompositeOperation = 'lighter';
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.width;
      ctx.globalAlpha = sw.alpha;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();
    }

    // 繪製爆裂星塵粒子
    for (const p of this.particles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    // 全螢幕閃光效果
    if (this.screenFlashDuration > 0 && this.screenFlashAlpha > 0) {
      const flashRatio = Math.max(0, this.screenFlashDuration / this.screenFlashMaxDuration);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.screenFlashAlpha * flashRatio;
      ctx.fillStyle = this.screenFlashColor;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    }

    // 恢復正常混合繪製文字
    ctx.globalCompositeOperation = 'source-over';
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.font = `bold ${ft.size}px 'SF Pro Display', -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  public clear(): void {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
    this.shakeMagnitude = 0;
    this.shakeDuration = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.screenFlashAlpha = 0;
    this.screenFlashDuration = 0;
  }
}
