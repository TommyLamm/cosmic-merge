import { CELESTIAL_CONFIGS } from '../core/CelestialData';
import { CelestialRenderer } from '../render/CelestialRenderer';

export class HUD {
  private width: number;
  private celestialRenderer: CelestialRenderer;
  private flashPhase: number = 0;

  // 按鈕點擊判定熱區 (>= 44px 人體工學標準)
  public readonly btnPause = { x: 18, y: 16, w: 46, h: 46 };
  public readonly btnSound = { x: 72, y: 16, w: 46, h: 46 };
  public readonly btnCodex = { x: 126, y: 16, w: 46, h: 46 };

  constructor(width: number = 450, _height: number = 800, celestialRenderer: CelestialRenderer) {
    this.width = width;
    this.celestialRenderer = celestialRenderer;
  }

  public update(deltaMs: number): void {
    this.flashPhase += deltaMs * 0.008;
  }

  public checkButtonClick(x: number, y: number): 'pause' | 'sound' | 'codex' | null {
    if (x >= this.btnPause.x && x <= this.btnPause.x + this.btnPause.w &&
        y >= this.btnPause.y && y <= this.btnPause.y + this.btnPause.h) {
      return 'pause';
    }
    if (x >= this.btnSound.x && x <= this.btnSound.x + this.btnSound.w &&
        y >= this.btnSound.y && y <= this.btnSound.y + this.btnSound.h) {
      return 'sound';
    }
    if (x >= this.btnCodex.x && x <= this.btnCodex.x + this.btnCodex.w &&
        y >= this.btnCodex.y && y <= this.btnCodex.y + this.btnCodex.h) {
      return 'codex';
    }
    return null;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    score: number,
    highScore: number,
    nextTier: number,
    isMuted: boolean,
    hazardActive: boolean,
    hazardCountdown: number,
    deadlineY: number = 140,
    chainCount: number = 1,
    chainMultiplier: number = 1.0,
    chainRemainingTime: number = 0
  ): void {
    ctx.save();

    // 1. 頂部深色半透明毛玻璃底板
    const headerGrad = ctx.createLinearGradient(0, 0, 0, 85);
    headerGrad.addColorStop(0, 'rgba(8, 12, 30, 0.95)');
    headerGrad.addColorStop(1, 'rgba(8, 12, 30, 0.40)');
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, this.width, 85);

    // 2. 繪製左側功能按鈕 (暫停、音效、圖鑑)
    this.renderButtons(ctx, isMuted);

    // 3. 繪製中央即時得分與最高分
    ctx.textAlign = 'center';
    // 即時分數
    ctx.font = '900 28px "SF Pro Display", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 8;
    ctx.fillText(`${score}`, 250, 42);

    // 最高紀錄
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = '#ffd54f';
    ctx.shadowColor = '#ffab00';
    ctx.shadowBlur = 4;
    ctx.fillText(`🏆 BEST: ${highScore}`, 250, 64);

    // 4. 繪製右側 Next 下一個星體預覽圓框
    this.renderNextPreview(ctx, nextTier);

    // 5. 繪製連鎖共鳴 (Cascade Chain) 狀態指示
    if (chainCount >= 2 && chainRemainingTime > 0) {
      this.renderCascadeBadge(ctx, chainCount, chainMultiplier, chainRemainingTime);
    }

    // 6. 繪製頂部紅色警戒線 (Deadline Y = 140)
    this.renderDeadline(ctx, deadlineY, hazardActive, hazardCountdown);

    ctx.restore();
  }

  // 連鎖共鳴指示標籤
  private renderCascadeBadge(
    ctx: CanvasRenderingContext2D,
    chainCount: number,
    multiplier: number,
    remainingTime: number
  ): void {
    ctx.save();
    const badgeX = 250;
    const badgeY = 96;
    const badgeW = 160;
    const badgeH = 26;

    ctx.beginPath();
    ctx.roundRect(badgeX - badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 13);
    ctx.fillStyle = 'rgba(255, 171, 0, 0.18)';
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ffab00';
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.font = '900 12px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff59d';
    ctx.shadowBlur = 6;
    ctx.fillText(`⚡ CHAIN ${chainCount} (${multiplier.toFixed(1)}x · ${remainingTime.toFixed(1)}s)`, badgeX, badgeY);

    ctx.restore();
  }

  private renderButtons(ctx: CanvasRenderingContext2D, isMuted: boolean): void {
    // 繪製圓角半透明按鈕底
    const buttons = [
      { rect: this.btnPause, label: '⏸' },
      { rect: this.btnSound, label: isMuted ? '🔇' : '🔊' },
      { rect: this.btnCodex, label: '📖' }
    ];

    for (const b of buttons) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h, 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = '20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.label, b.rect.x + b.rect.w / 2, b.rect.y + b.rect.h / 2 + 1);
      ctx.restore();
    }
  }

  private renderNextPreview(ctx: CanvasRenderingContext2D, nextTier: number): void {
    const previewCenterX = 395;
    const previewCenterY = 38;
    const previewRadius = 28;

    ctx.save();
    // 預覽外環
    ctx.beginPath();
    ctx.arc(previewCenterX, previewCenterY, previewRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 標籤 NEXT
    ctx.font = '800 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#80d8ff';
    ctx.fillText('NEXT', previewCenterX, 78);

    // 縮小渲染 Next 天體
    const nextConfig = CELESTIAL_CONFIGS[nextTier - 1];
    if (nextConfig) {
      const scale = Math.min(1, 20 / nextConfig.radius);
      this.celestialRenderer.renderBody(
        ctx,
        previewCenterX,
        previewCenterY,
        nextTier,
        0,
        scale
      );
    }
    ctx.restore();
  }

  private renderDeadline(
    ctx: CanvasRenderingContext2D,
    deadlineY: number,
    hazardActive: boolean,
    countdownSeconds: number
  ): void {
    ctx.save();

    if (hazardActive) {
      // 警報狀態：紅色強烈閃爍虛線 + 倒數警示 (連續停留 2.8s 判定)
      const flash = (Math.sin(this.flashPhase * 3) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 51, 102, ${0.45 + flash * 0.55})`;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ff3366';
      ctx.shadowBlur = 12;
      ctx.setLineDash([8, 6]);

      ctx.beginPath();
      ctx.moveTo(10, deadlineY);
      ctx.lineTo(this.width - 10, deadlineY);
      ctx.stroke();

      // 警告倒數浮動標籤
      ctx.setLineDash([]);
      ctx.font = '900 13px "SF Pro Display", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff1744';
      ctx.shadowColor = '#ff1744';
      ctx.shadowBlur = 8;
      const timeLeft = Math.max(0, countdownSeconds).toFixed(1);
      ctx.fillText(`⚠️ 靜止超線坍縮倒數: ${timeLeft}s`, this.width / 2, deadlineY - 8);

      // 螢幕邊緣紅色暗角光暈
      const edgeGrad = ctx.createLinearGradient(0, 0, 0, deadlineY + 60);
      edgeGrad.addColorStop(0, `rgba(255, 23, 68, ${0.15 + flash * 0.15})`);
      edgeGrad.addColorStop(1, 'rgba(255, 23, 68, 0)');
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(0, 0, this.width, deadlineY + 60);
    } else {
      // 安全狀態：淡灰白靜態虛線
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(12, deadlineY);
      ctx.lineTo(this.width - 12, deadlineY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillText('CRITICAL DEADLINE', this.width - 16, deadlineY - 4);
    }

    ctx.restore();
  }
}
