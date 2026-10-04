import { CELESTIAL_CONFIGS } from '../core/CelestialData';
import { CelestialRenderer } from '../render/CelestialRenderer';

export class CodexModal {
  private width: number;
  private height: number;
  private celestialRenderer: CelestialRenderer;
  public isOpen: boolean = false;
  private scrollY: number = 0;
  private maxScrollY: number = 0;
  private startTouchY: number = 0;

  // 關閉按鈕判定區 (>= 44px)
  public readonly btnClose = { x: 380, y: 35, w: 46, h: 46 };

  constructor(width: number = 450, height: number = 800, celestialRenderer: CelestialRenderer) {
    this.width = width;
    this.height = height;
    this.celestialRenderer = celestialRenderer;

    // 計算內容總高度與最大滑動量 (12 個天體，每個高度 92px)
    const contentHeight = 12 * 96 + 120;
    this.maxScrollY = Math.max(0, contentHeight - (this.height - 100));
  }

  public open(): void {
    this.isOpen = true;
    this.scrollY = 0;
  }

  public close(): void {
    this.isOpen = false;
  }

  public handleWheel(deltaY: number): void {
    if (!this.isOpen) return;
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + deltaY * 0.8));
  }

  public handleTouchStart(y: number): void {
    this.startTouchY = y;
  }

  public handleTouchMove(y: number): void {
    if (!this.isOpen) return;
    const dy = this.startTouchY - y;
    this.startTouchY = y;
    this.scrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + dy));
  }

  public checkClick(x: number, y: number): boolean {
    if (!this.isOpen) return false;
    // 點擊關閉按鈕或彈窗遮罩外側
    if (x >= this.btnClose.x && x <= this.btnClose.x + this.btnClose.w &&
        y >= this.btnClose.y && y <= this.btnClose.y + this.btnClose.h) {
      this.close();
      return true;
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D, unlockedTiers: number[]): void {
    if (!this.isOpen) return;

    ctx.save();

    // 1. 半透明全屏暗色遮罩
    ctx.fillStyle = 'rgba(4, 6, 18, 0.92)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 標題與解鎖進度
    ctx.font = '900 24px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 10;
    ctx.fillText('🪐 天體科普圖鑑 (Codex)', 24, 62);

    const unlockPercent = Math.round((unlockedTiers.length / CELESTIAL_CONFIGS.length) * 100);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = '#80d8ff';
    ctx.shadowBlur = 0;
    ctx.fillText(`已觀測: ${unlockedTiers.length} / ${CELESTIAL_CONFIGS.length} (${unlockPercent}%)`, 24, 88);

    // 3. 繪製右上角關閉按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnClose.x, this.btnClose.y, this.btnClose.w, this.btnClose.h, 12);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('✕', this.btnClose.x + this.btnClose.w / 2, this.btnClose.y + this.btnClose.h / 2 + 1);

    // 4. 可滑動天體卡片列表
    const startY = 110;
    const viewHeight = this.height - 130;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, this.width, viewHeight);
    ctx.clip(); // 裁剪滑動區

    ctx.translate(0, -this.scrollY);

    let cardY = startY + 10;
    for (const config of CELESTIAL_CONFIGS) {
      const isUnlocked = unlockedTiers.includes(config.tier);
      this.renderCodexCard(ctx, cardY, config, isUnlocked);
      cardY += 98;
    }

    ctx.restore();
    ctx.restore();
  }

  private renderCodexCard(
    ctx: CanvasRenderingContext2D,
    y: number,
    config: any,
    isUnlocked: boolean
  ): void {
    const cardX = 18;
    const cardW = this.width - 36;
    const cardH = 88;

    // 卡片底板
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, y, cardW, cardH, 14);
    ctx.fillStyle = isUnlocked ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)';
    ctx.fill();
    ctx.strokeStyle = isUnlocked ? 'rgba(128, 216, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 左側天體預覽圓圈
    const planetX = cardX + 44;
    const planetY = y + cardH / 2;
    if (isUnlocked) {
      const scale = Math.min(1, 26 / config.radius);
      this.celestialRenderer.renderBody(ctx, planetX, planetY, config.tier, 0, scale);
    } else {
      ctx.beginPath();
      ctx.arc(planetX, planetY, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 25, 45, 0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillText('?', planetX, planetY + 1);
    }

    // 右側資訊文本
    const textX = cardX + 86;
    if (isUnlocked) {
      ctx.font = 'bold 15px "SF Pro Display", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Tier ${config.tier}: ${config.name}`, textX, y + 12);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`📐 實體直徑: ${config.diameterKm}`, textX, y + 33);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      // 限制天文小百科字數自動換行或精簡
      const fact = config.scienceFact.length > 28 ? config.scienceFact.slice(0, 28) + '...' : config.scienceFact;
      ctx.fillText(fact, textX, y + 52);
    } else {
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillText(`Tier ${config.tier}: 未知神秘天體`, textX, y + 20);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillText('在重力艙中引力融合以觀測並解鎖此天體', textX, y + 46);
    }

    ctx.restore();
  }
}
