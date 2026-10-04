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

    // 1. 大氣外發光光暈 (Atmospheric Glow - Lighter 混合)
    this.renderAtmosphericGlow(ctx, radius, config);

    // 2. 特殊背景裝飾 (例如：土星後環)
    if (tier === 9) {
      this.renderSaturnBackRing(ctx, radius);
    } else if (tier === 8) {
      this.renderUranusRing(ctx, radius);
    }

    // 3. 旋轉座標系 (繪製球體表面紋理與斑塊)
    ctx.rotate(angle);

    // 繪製球體主體
    this.renderSphereBody(ctx, radius, config);

    // 繪製表面專屬地貌與紋理
    this.renderSurfaceFeatures(ctx, radius, tier);

    // 4. 特殊前景裝飾 (例如：土星前環、太陽日珥、黑洞吸積盤)
    ctx.rotate(-angle); // 轉回無旋轉參考系以保持光環或吸積盤方向一致
    if (tier === 9) {
      this.renderSaturnFrontRing(ctx, radius);
    } else if (tier === 11) {
      this.renderSunFlares(ctx, radius);
    } else if (tier === 12) {
      this.renderBlackHoleAccretion(ctx, radius);
    }

    ctx.restore();
  }

  // 大氣層外光暈
  private renderAtmosphericGlow(ctx: CanvasRenderingContext2D, radius: number, config: ICelestialConfig): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowRadius = radius * 1.35;
    const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, glowRadius);
    glowGrad.addColorStop(0, config.glowColor);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 偏心立體光影球體
  private renderSphereBody(ctx: CanvasRenderingContext2D, radius: number, config: ICelestialConfig): void {
    const lightX = -radius * 0.35;
    const lightY = -radius * 0.35;

    const sphereGrad = ctx.createRadialGradient(lightX, lightY, radius * 0.08, 0, 0, radius);
    if (config.tier === 12) {
      // 黑洞特殊純黑核心
      sphereGrad.addColorStop(0, '#020208');
      sphereGrad.addColorStop(0.85, '#000000');
      sphereGrad.addColorStop(1, '#000000');
    } else if (config.tier === 11) {
      // 太陽亮橙金核心
      sphereGrad.addColorStop(0, '#fff9c4');
      sphereGrad.addColorStop(0.25, '#ffca28');
      sphereGrad.addColorStop(0.7, '#ff6d00');
      sphereGrad.addColorStop(1, '#e65100');
    } else {
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.2, config.primaryColor);
      sphereGrad.addColorStop(0.8, config.accentColor);
      sphereGrad.addColorStop(1, '#080812');
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, -radius * 0.85, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 20, 0, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius * 0.6, radius * 0.1);
        ctx.quadraticCurveTo(0, radius * 0.3, radius * 0.6, radius * 0.1);
        ctx.stroke();
        break;

      case 5: // 金星：濃硫酸旋流條帶
        ctx.strokeStyle = 'rgba(255, 245, 157, 0.35)';
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
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = radius * 0.08;
        ctx.beginPath();
        ctx.arc(-radius * 0.1, radius * 0.05, radius * 0.5, 0.1, 1.8);
        ctx.stroke();
        break;

      case 7: // 海王星：深邃鈷藍條帶與大暗斑
        ctx.fillStyle = 'rgba(0, 20, 80, 0.45)';
        ctx.beginPath();
        ctx.ellipse(-radius * 0.1, radius * 0.2, radius * 0.3, radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.7, 0.2, 2.6);
        ctx.stroke();
        break;

      case 8: // 天王星：均勻青淡大氣條紋
        ctx.strokeStyle = 'rgba(178, 235, 242, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-radius, -radius * 0.2);
        ctx.lineTo(radius, -radius * 0.2);
        ctx.moveTo(-radius, radius * 0.3);
        ctx.lineTo(radius, radius * 0.3);
        ctx.stroke();
        break;

      case 9: // 土星：琥珀條帶
        ctx.fillStyle = 'rgba(180, 100, 0, 0.25)';
        ctx.fillRect(-radius, -radius * 0.3, radius * 2, radius * 0.25);
        ctx.fillRect(-radius, radius * 0.15, radius * 2, radius * 0.25);
        break;

      case 10: // 木星：多彩緯向風暴帶與大紅斑
        ctx.fillStyle = 'rgba(120, 30, 0, 0.35)';
        ctx.fillRect(-radius, -radius * 0.4, radius * 2, radius * 0.22);
        ctx.fillRect(-radius, radius * 0.1, radius * 2, radius * 0.26);
        // 大紅斑
        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.ellipse(radius * 0.35, radius * 0.22, radius * 0.28, radius * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  // 土星後環 (先於球體繪製)
  private renderSaturnBackRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(0.35); // 傾斜環
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.85, radius * 0.55, 0, Math.PI, 0); // 上半環 (在球體背後)
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.65)';
    ctx.lineWidth = radius * 0.32;
    ctx.stroke();

    // 環間卡西尼環縫
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.7, radius * 0.5, 0, Math.PI, 0);
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // 土星前環 (在球體前方繪製)
  private renderSaturnFrontRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.85, radius * 0.55, 0, 0, Math.PI); // 下半環 (在球體前面)
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.75)';
    ctx.lineWidth = radius * 0.32;
    ctx.stroke();

    // 環縫
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.7, radius * 0.5, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(20, 15, 10, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // 天王星傾斜細環
  private renderUranusRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(1.7); // 近似 98 度垂直傾斜
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.5, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(178, 235, 242, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  // 太陽日珥爆發火焰動態
  private renderSunFlares(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const numFlares = 12;
    for (let i = 0; i < numFlares; i++) {
      const angle = (i / numFlares) * Math.PI * 2 + this.animTime * 0.5;
      const flareLen = radius * 0.15 + Math.sin(this.animTime * 3 + i) * radius * 0.08;
      const fx = Math.cos(angle) * (radius + flareLen);
      const fy = Math.sin(angle) * (radius + flareLen);

      ctx.beginPath();
      ctx.arc(fx, fy, radius * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 145, 0, 0.6)';
      ctx.shadowColor = '#ffab00';
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.restore();
  }

  // 黑洞吸積盤與愛因斯坦重力透鏡光環
  private renderBlackHoleAccretion(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. 愛因斯坦重力透鏡藍光環
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(140, 190, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 15;
    ctx.stroke();

    // 2. 傾斜旋轉吸積盤
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.6, radius * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 170, 255, 0.55)';
    ctx.lineWidth = radius * 0.18;
    ctx.stroke();

    // 3. 旋轉高能量吸積亮流
    const streamAngle = this.animTime * 2.5;
    const sx = Math.cos(streamAngle) * radius * 1.4;
    const sy = Math.sin(streamAngle) * radius * 0.4;
    ctx.beginPath();
    ctx.arc(sx, sy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 16;
    ctx.fill();

    ctx.restore();
  }
}
