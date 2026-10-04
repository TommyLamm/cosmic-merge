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

export class BackgroundRenderer {
  private starsLayer1: IStar[] = [];
  private starsLayer2: IStar[] = [];
  private nebulaTime: number = 0;
  private width: number;
  private height: number;

  constructor(width: number = 450, height: number = 800) {
    this.width = width;
    this.height = height;
    this.initStars();
  }

  private initStars(): void {
    // 遠景微弱微星 (45 顆)
    for (let i = 0; i < 45; i++) {
      this.starsLayer1.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.8 + Math.random() * 0.8,
        baseAlpha: 0.2 + Math.random() * 0.4,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        twinklePhase: Math.random() * Math.PI * 2,
        color: '#ffffff',
        speedY: 0.05 + Math.random() * 0.05
      });
    }

    // 近景立體亮星 (25 顆)
    const brightColors = ['#80d8ff', '#ffd54f', '#e1bee7', '#ffffff'];
    for (let i = 0; i < 25; i++) {
      this.starsLayer2.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1.6 + Math.random() * 1.4,
        baseAlpha: 0.4 + Math.random() * 0.5,
        twinkleSpeed: 0.03 + Math.random() * 0.06,
        twinklePhase: Math.random() * Math.PI * 2,
        color: brightColors[Math.floor(Math.random() * brightColors.length)],
        speedY: 0.12 + Math.random() * 0.1
      });
    }
  }

  public update(deltaMs: number): void {
    this.nebulaTime += deltaMs * 0.001;

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
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // 1. 深邃虛空漸層底色
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#050713');
    bgGrad.addColorStop(0.5, '#0a0d24');
    bgGrad.addColorStop(1, '#0e112d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 緩慢脈動之暗調星雲光暈 (Nebula Glow)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const nebulaPulse1 = 0.5 + 0.5 * Math.sin(this.nebulaTime * 0.8);
    const nebulaGrad1 = ctx.createRadialGradient(
      this.width * 0.3,
      this.height * 0.4,
      30,
      this.width * 0.3,
      this.height * 0.4,
      220
    );
    nebulaGrad1.addColorStop(0, `rgba(50, 25, 90, ${0.18 + nebulaPulse1 * 0.06})`);
    nebulaGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad1;
    ctx.fillRect(0, 0, this.width, this.height);

    const nebulaPulse2 = 0.5 + 0.5 * Math.cos(this.nebulaTime * 0.6);
    const nebulaGrad2 = ctx.createRadialGradient(
      this.width * 0.75,
      this.height * 0.7,
      40,
      this.width * 0.75,
      this.height * 0.7,
      260
    );
    nebulaGrad2.addColorStop(0, `rgba(20, 60, 110, ${0.16 + nebulaPulse2 * 0.05})`);
    nebulaGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad2;
    ctx.fillRect(0, 0, this.width, this.height);
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

    // 4. 繪製近景立體亮星 (外加微光芒)
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
  }
}
