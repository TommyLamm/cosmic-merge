import { CELESTIAL_CONFIGS, ICelestialConfig } from '../core/CelestialData';

export class CelestialRenderer {
  private animTime: number = 0;

  public update(deltaMs: number): void {
    this.animTime += deltaMs * 0.001;
  }

  public renderBody(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tier: number,
    angle: number = 0,
    scale: number = 1
  ): void {
    const config = CELESTIAL_CONFIGS[tier - 1];
    if (!config) return;

    const radius = config.radius * scale;

    ctx.save();
    ctx.translate(x, y);

    // 1. 多層柔光大氣層光暈 (Atmospheric Multi-layer Glow)
    this.renderAtmosphericGlow(ctx, radius, config);

    // 2. 特殊背景裝飾 (土星後環與陰影、天王星後環)
    if (tier === 9) {
      this.renderSaturnBackRing(ctx, radius);
    } else if (tier === 8) {
      this.renderUranusRing(ctx, radius, true);
    }

    // 3. 旋轉座標系 (繪製球體表面紋理與斑塊)
    ctx.rotate(angle);

    // 繪製球體主體
    this.renderSphereBody(ctx, radius, config);

    // 繪製表面專屬地貌與紋理
    this.renderSurfaceFeatures(ctx, radius, tier);

    // 4. 特殊前景裝飾 (土星前環與陰影/自轉微粒、天王星前環、太陽日珥、黑洞奇異點吸積盤)
    ctx.rotate(-angle); // 轉回無旋轉參考系以保持光環或吸積盤方向一致
    if (tier === 9) {
      this.renderSaturnFrontRing(ctx, radius);
      this.renderSaturnRingParticles(ctx, radius);
    } else if (tier === 8) {
      this.renderUranusRing(ctx, radius, false);
    } else if (tier === 11) {
      this.renderSunFlares(ctx, radius);
    } else if (tier === 12) {
      this.renderBlackHoleSingularity(ctx, radius);
    }

    ctx.restore();
  }

  // 多層柔光大氣層光暈 (Atmospheric Glow)
  private renderAtmosphericGlow(ctx: CanvasRenderingContext2D, radius: number, config: ICelestialConfig): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 恆星與黑洞具備動態呼吸脈衝
    const pulse = config.tier >= 11 ? 1.0 + 0.08 * Math.sin(this.animTime * 3) : 1.0;

    // 第一層：緊密大氣過渡層 (Inner Atmospheric Boundary)
    const innerRadius = radius * 1.18 * pulse;
    const innerGrad = ctx.createRadialGradient(0, 0, radius * 0.85, 0, 0, innerRadius);
    innerGrad.addColorStop(0, config.glowColor);
    innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fill();

    // 第二層：遠景散射柔光薄霧 (Outer Atmospheric Scattering Glow)
    const outerRadius = radius * (config.tier >= 11 ? 1.7 : 1.48) * pulse;
    const outerGrad = ctx.createRadialGradient(0, 0, radius * 1.05, 0, 0, outerRadius);
    outerGrad.addColorStop(0, config.glowColor);
    outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, outerRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 偏心立體光影球體
  private renderSphereBody(ctx: CanvasRenderingContext2D, radius: number, config: ICelestialConfig): void {
    const lightX = -radius * 0.35;
    const lightY = -radius * 0.35;

    const sphereGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.08, 0, 0, radius);
    if (config.tier === 12) {
      // 終極黑洞奇異點純黑核心
      sphereGrad.addColorStop(0, '#000000');
      sphereGrad.addColorStop(0.88, '#02020a');
      sphereGrad.addColorStop(1, '#080816');
    } else if (config.tier === 11) {
      // 太陽日核高溫金芒
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.18, '#fff9c4');
      sphereGrad.addColorStop(0.45, '#ffca28');
      sphereGrad.addColorStop(0.8, '#ff6d00');
      sphereGrad.addColorStop(1, '#dd2c00');
    } else {
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.2, config.primaryColor);
      sphereGrad.addColorStop(0.8, config.accentColor);
      sphereGrad.addColorStop(1, '#060610');
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();
    ctx.restore();
  }

  // 專屬地貌與紋理繪製
  private renderSurfaceFeatures(ctx: CanvasRenderingContext2D, radius: number, tier: number): void {
    ctx.save();
    // 裁剪在球體內部
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.clip();

    switch (tier) {
      case 1: // 小行星：凹坑撞擊斑塊
        ctx.fillStyle = 'rgba(50, 40, 35, 0.45)';
        ctx.beginPath();
        ctx.arc(-radius * 0.3, radius * 0.2, radius * 0.25, 0, Math.PI * 2);
        ctx.arc(radius * 0.2, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.arc(radius * 0.25, radius * 0.3, radius * 0.18, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 2: // 冥王星：冰藍淺褐心形斑
        ctx.fillStyle = 'rgba(230, 240, 255, 0.35)';
        ctx.beginPath();
        ctx.ellipse(radius * 0.1, radius * 0.15, radius * 0.4, radius * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 3: // 水星：鐵灰斑駁
        ctx.fillStyle = 'rgba(30, 30, 30, 0.35)';
        ctx.beginPath();
        ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.22, 0, Math.PI * 2);
        ctx.arc(radius * 0.3, radius * 0.1, radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 4: // 火星：白極冠與赭紅峽谷
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, -radius * 0.85, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 20, 0, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.6, radius * 0.1);
        ctx.quadraticCurveTo(0, radius * 0.3, radius * 0.6, radius * 0.1);
        ctx.stroke();
        break;

      case 5: // 金星：濃硫酸旋流條帶
        ctx.strokeStyle = 'rgba(255, 245, 157, 0.38)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0.3, 2.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.35, 3.2, 5.8);
        ctx.stroke();
        break;

      case 6: // 地球：各大洲陸地與白雲渦卷
        ctx.fillStyle = '#2e7d32'; // 綠色陸地
        ctx.beginPath();
        ctx.ellipse(-radius * 0.25, -radius * 0.1, radius * 0.35, radius * 0.25, 0.4, 0, Math.PI * 2);
        ctx.ellipse(radius * 0.2, radius * 0.2, radius * 0.3, radius * 0.4, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // 白色旋卷雲層
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = radius * 0.08;
        ctx.beginPath();
        ctx.arc(-radius * 0.1, radius * 0.05, radius * 0.5, 0.1, 1.8);
        ctx.stroke();
        break;

      case 7: // 海王星：深邃鈷藍條帶與大暗斑
        ctx.fillStyle = 'rgba(0, 20, 80, 0.5)';
        ctx.beginPath();
        ctx.ellipse(-radius * 0.1, radius * 0.2, radius * 0.3, radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0.2, 2.6);
        ctx.stroke();
        break;

      case 8: // 天王星：均勻青淡大氣條紋
        ctx.strokeStyle = 'rgba(178, 235, 242, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius, -radius * 0.2);
        ctx.lineTo(radius, -radius * 0.2);
        ctx.moveTo(-radius, radius * 0.3);
        ctx.lineTo(radius, radius * 0.3);
        ctx.stroke();
        break;

      case 9: // 土星：琥珀條帶與光環在本體投影
        ctx.fillStyle = 'rgba(180, 100, 0, 0.25)';
        ctx.fillRect(-radius, -radius * 0.3, radius * 2, radius * 0.25);
        ctx.fillRect(-radius, radius * 0.15, radius * 2, radius * 0.25);

        // 光環投射在本體南半球的柔和陰影帶 (Shadow cast on Saturn)
        ctx.fillStyle = 'rgba(10, 8, 4, 0.42)';
        ctx.beginPath();
        ctx.ellipse(0, radius * 0.12, radius * 0.95, radius * 0.16, 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 10: // 木星：多彩緯向風暴帶與大紅斑
        ctx.fillStyle = 'rgba(120, 30, 0, 0.38)';
        ctx.fillRect(-radius, -radius * 0.4, radius * 2, radius * 0.22);
        ctx.fillRect(-radius, radius * 0.1, radius * 2, radius * 0.26);
        // 大紅斑動態反氣旋
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.ellipse(radius * 0.35, radius * 0.22, radius * 0.28, radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        // 紅斑內部漩渦
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  // 土星後環 (先於球體繪製) - 包含球體投在後環上的動態陰影
  private renderSaturnBackRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(0.35); // 傾斜環角度

    // 後半環
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.9, radius * 0.58, 0, Math.PI, 0); // 上半環 (在球體背後)
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.7)';
    ctx.lineWidth = radius * 0.34;
    ctx.stroke();

    // 環間卡西尼環縫
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.74, radius * 0.52, 0, Math.PI, 0);
    ctx.strokeStyle = 'rgba(15, 12, 8, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 土星球體遮擋光線產生的後環陰影 (Planet shadow on ring)
    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.42, radius * 0.55, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(5, 5, 8, 0.65)';
    ctx.fill();

    ctx.restore();
  }

  // 土星前環 (在球體前方繪製)
  private renderSaturnFrontRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(0.35);

    // 前半環
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.9, radius * 0.58, 0, 0, Math.PI); // 下半環 (在球體前面)
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.8)';
    ctx.lineWidth = radius * 0.34;
    ctx.stroke();

    // 環縫
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.74, radius * 0.52, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(15, 12, 8, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  }

  // 土星環自轉微粒 (Orbiting Ring Ice Particles)
  private renderSaturnRingParticles(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(0.35);
    ctx.globalCompositeOperation = 'lighter';

    const particleCount = 8;
    const a = radius * 1.82;
    const b = radius * 0.55;

    for (let i = 0; i < particleCount; i++) {
      // 依時間計算沿著橢圓軌道的運動角
      const t = this.animTime * 1.2 + (i * Math.PI * 2) / particleCount;
      const px = Math.cos(t) * a;
      const py = Math.sin(t) * b;
      const pSize = 1.2 + (Math.sin(t) > 0 ? 0.8 : 0.4); // 前方微粒稍大

      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fillStyle = '#fff9c4';
      ctx.shadowColor = '#ffd54f';
      ctx.shadowBlur = 5;
      ctx.fill();
    }

    ctx.restore();
  }

  // 天王星傾斜細環 (支援前後分層)
  private renderUranusRing(ctx: CanvasRenderingContext2D, radius: number, isBack: boolean): void {
    ctx.save();
    ctx.rotate(1.7); // 近似 98 度垂直傾斜
    ctx.beginPath();
    if (isBack) {
      ctx.ellipse(0, 0, radius * 1.55, radius * 0.25, 0, Math.PI, 0);
    } else {
      ctx.ellipse(0, 0, radius * 1.55, radius * 0.25, 0, 0, Math.PI);
    }
    ctx.strokeStyle = isBack ? 'rgba(178, 235, 242, 0.35)' : 'rgba(178, 235, 242, 0.65)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.restore();
  }

  // 太陽日珥爆發動態
  private renderSunFlares(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const numFlares = 14;
    for (let i = 0; i < numFlares; i++) {
      const angle = (i / numFlares) * Math.PI * 2 + this.animTime * 0.6;
      const flareLen = radius * 0.16 + Math.sin(this.animTime * 3.5 + i * 1.3) * radius * 0.09;
      const fx = Math.cos(angle) * (radius + flareLen);
      const fy = Math.sin(angle) * (radius + flareLen);

      ctx.beginPath();
      ctx.arc(fx, fy, radius * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.65)';
      ctx.shadowColor = '#ffab00';
      ctx.shadowBlur = 12;
      ctx.fill();
    }
    ctx.restore();
  }

  // 終極黑洞·奇異點吸積盤與愛因斯坦重力透鏡光環
  private renderBlackHoleSingularity(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. 內外雙層愛因斯坦重力透鏡光環 (Einstein Ring Lensing)
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.06, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(160, 210, 255, 0.95)';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 160, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 2. 傾斜高能旋轉吸積盤 (Accretion Disk)
    ctx.rotate(0.38);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.68, radius * 0.46, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.65)';
    ctx.lineWidth = radius * 0.22;
    ctx.stroke();

    // 3. 旋轉高能量吸積亮斑與微射流
    const streamAngle1 = this.animTime * 3.0;
    const sx1 = Math.cos(streamAngle1) * radius * 1.45;
    const sy1 = Math.sin(streamAngle1) * radius * 0.42;
    ctx.beginPath();
    ctx.arc(sx1, sy1, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.fill();

    const streamAngle2 = this.animTime * 3.0 + Math.PI;
    const sx2 = Math.cos(streamAngle2) * radius * 1.45;
    const sy2 = Math.sin(streamAngle2) * radius * 0.42;
    ctx.beginPath();
    ctx.arc(sx2, sy2, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#80d8ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.restore();
  }
}
