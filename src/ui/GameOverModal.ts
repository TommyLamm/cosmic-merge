export class GameOverModal {
  private width: number;
  private height: number;
  public isOpen: boolean = false;

  public readonly btnRestart = { x: 80, y: 520, w: 290, h: 54 };
  public readonly btnCodex = { x: 80, y: 590, w: 290, h: 50 };

  constructor(width: number = 450, height: number = 800) {
    this.width = width;
    this.height = height;
  }

  public open(): void {
    this.isOpen = true;
  }

  public close(): void {
    this.isOpen = false;
  }

  public checkClick(x: number, y: number): 'restart' | 'codex' | null {
    if (!this.isOpen) return null;
    if (x >= this.btnRestart.x && x <= this.btnRestart.x + this.btnRestart.w &&
        y >= this.btnRestart.y && y <= this.btnRestart.y + this.btnRestart.h) {
      return 'restart';
    }
    if (x >= this.btnCodex.x && x <= this.btnCodex.x + this.btnCodex.w &&
        y >= this.btnCodex.y && y <= this.btnCodex.y + this.btnCodex.h) {
      return 'codex';
    }
    return null;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    finalScore: number,
    highScore: number,
    isNewRecord: boolean,
    totalMerges: number
  ): void {
    if (!this.isOpen) return;

    ctx.save();

    // 1. 半透明暗色全屏遮罩
    ctx.fillStyle = 'rgba(5, 7, 20, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. 坍縮警告符號與大標題
    ctx.font = '54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💥', this.width / 2, 190);

    ctx.font = '900 28px "SF Pro Display", system-ui, sans-serif';
    ctx.fillStyle = '#ff1744';
    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 14;
    ctx.fillText('宇宙熱寂坍縮', this.width / 2, 245);

    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText('星體超過極限警戒線引發時空重力坍縮', this.width / 2, 275);

    // 3. 結算面板核心卡片
    const cardX = 45;
    const cardY = 305;
    const cardW = this.width - 90;
    const cardH = 185;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 最終得分
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillStyle = '#80d8ff';
    ctx.fillText('FINAL SCORE', this.width / 2, cardY + 36);

    ctx.font = '900 48px "SF Pro Display", system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 10;
    ctx.fillText(`${finalScore}`, this.width / 2, cardY + 86);

    if (isNewRecord) {
      ctx.font = '900 13px system-ui, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.shadowColor = '#ffab00';
      ctx.shadowBlur = 8;
      ctx.fillText('🎉 新紀錄! NEW HIGH RECORD!', this.width / 2, cardY + 115);
    }

    // 歷史最佳與合成次數
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText(`🏆 歷史最佳: ${highScore}  |  🔄 總合成: ${totalMerges} 次`, this.width / 2, cardY + 150);

    // 4. 再探宇宙按鈕 (Restart)
    ctx.beginPath();
    ctx.roundRect(this.btnRestart.x, this.btnRestart.y, this.btnRestart.w, this.btnRestart.h, 27);
    const gradRestart = ctx.createLinearGradient(this.btnRestart.x, 0, this.btnRestart.x + this.btnRestart.w, 0);
    gradRestart.addColorStop(0, '#00b0ff');
    gradRestart.addColorStop(1, '#00e5ff');
    ctx.fillStyle = gradRestart;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.font = 'bold 18px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#050a1e';
    ctx.shadowBlur = 0;
    ctx.fillText('🚀 再次探索宇宙', this.btnRestart.x + this.btnRestart.w / 2, this.btnRestart.y + this.btnRestart.h / 2);

    // 5. 查閱圖鑑按鈕 (Codex)
    ctx.beginPath();
    ctx.roundRect(this.btnCodex.x, this.btnCodex.y, this.btnCodex.w, this.btnCodex.h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('📖 查閱天體科普圖鑑', this.btnCodex.x + this.btnCodex.w / 2, this.btnCodex.y + this.btnCodex.h / 2);

    ctx.restore();
  }
}
