export class OverlayUI {
  private width: number;
  private height: number;

  // Title 介面按鈕
  public readonly btnStart = { x: 85, y: 490, w: 280, h: 54 };
  public readonly btnInstructions = { x: 85, y: 560, w: 280, h: 50 };
  public readonly btnTitleCodex = { x: 85, y: 625, w: 280, h: 50 };

  // Instructions 介面返回按鈕
  public readonly btnBack = { x: 105, y: 660, w: 240, h: 50 };

  // Pause 介面按鈕
  public readonly btnResume = { x: 95, y: 390, w: 260, h: 52 };
  public readonly btnPauseRestart = { x: 95, y: 460, w: 260, h: 50 };

  constructor(width: number = 450, height: number = 800) {
    this.width = width;
    this.height = height;
  }

  // 1. 檢查標題畫面點擊
  public checkTitleClick(x: number, y: number): 'start' | 'instructions' | 'codex' | null {
    if (x >= this.btnStart.x && x <= this.btnStart.x + this.btnStart.w &&
        y >= this.btnStart.y && y <= this.btnStart.y + this.btnStart.h) {
      return 'start';
    }
    if (x >= this.btnInstructions.x && x <= this.btnInstructions.x + this.btnInstructions.w &&
        y >= this.btnInstructions.y && y <= this.btnInstructions.y + this.btnInstructions.h) {
      return 'instructions';
    }
    if (x >= this.btnTitleCodex.x && x <= this.btnTitleCodex.x + this.btnTitleCodex.w &&
        y >= this.btnTitleCodex.y && y <= this.btnTitleCodex.y + this.btnTitleCodex.h) {
      return 'codex';
    }
    return null;
  }

  // 2. 檢查玩法導引點擊
  public checkInstructionsClick(x: number, y: number): 'back' | null {
    if (x >= this.btnBack.x && x <= this.btnBack.x + this.btnBack.w &&
        y >= this.btnBack.y && y <= this.btnBack.y + this.btnBack.h) {
      return 'back';
    }
    return null;
  }

  // 3. 檢查暫停畫面點擊
  public checkPauseClick(x: number, y: number): 'resume' | 'restart' | null {
    if (x >= this.btnResume.x && x <= this.btnResume.x + this.btnResume.w &&
        y >= this.btnResume.y && y <= this.btnResume.y + this.btnResume.h) {
      return 'resume';
    }
    if (x >= this.btnPauseRestart.x && x <= this.btnPauseRestart.x + this.btnPauseRestart.w &&
        y >= this.btnPauseRestart.y && y <= this.btnPauseRestart.y + this.btnPauseRestart.h) {
      return 'restart';
    }
    return null;
  }

  // 渲染標題畫面
  public renderTitle(ctx: CanvasRenderingContext2D, highScore: number): void {
    ctx.save();

    // 宇宙星雲大標題
    ctx.font = '900 38px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 18;
    ctx.fillText('星體融合', this.width / 2, 230);

    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillStyle = '#80d8ff';
    ctx.shadowBlur = 8;
    ctx.fillText('COSMIC MERGE', this.width / 2, 265);

    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('微型宇宙 2D 剛體引力演化', this.width / 2, 295);

    // 歷史最佳紀錄卡片
    if (highScore > 0) {
      ctx.beginPath();
      ctx.roundRect(110, 330, 230, 42, 21);
      ctx.fillStyle = 'rgba(255, 213, 79, 0.1)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.3)';
      ctx.stroke();

      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`🏆 歷史最高分: ${highScore}`, this.width / 2, 356);
    }

    // 開始按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnStart.x, this.btnStart.y, this.btnStart.w, this.btnStart.h, 27);
    const gradStart = ctx.createLinearGradient(this.btnStart.x, 0, this.btnStart.x + this.btnStart.w, 0);
    gradStart.addColorStop(0, '#00b0ff');
    gradStart.addColorStop(1, '#00e5ff');
    ctx.fillStyle = gradStart;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    ctx.fill();

    ctx.font = 'bold 19px "SF Pro Display", system-ui, sans-serif';
    ctx.fillStyle = '#050a1e';
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'middle';
    ctx.fillText('🚀 啟動宇宙 (Start)', this.btnStart.x + this.btnStart.w / 2, this.btnStart.y + this.btnStart.h / 2);

    // 玩法說明按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnInstructions.x, this.btnInstructions.y, this.btnInstructions.w, this.btnInstructions.h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('📖 玩法導引', this.btnInstructions.x + this.btnInstructions.w / 2, this.btnInstructions.y + this.btnInstructions.h / 2);

    // 天體圖鑑按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnTitleCodex.x, this.btnTitleCodex.y, this.btnTitleCodex.w, this.btnTitleCodex.h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🪐 天體科普圖鑑', this.btnTitleCodex.x + this.btnTitleCodex.w / 2, this.btnTitleCodex.y + this.btnTitleCodex.h / 2);

    ctx.restore();
  }

  // 渲染玩法導引
  public renderInstructions(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = '900 24px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 10;
    ctx.fillText('宇宙重力引導 (Instructions)', this.width / 2, 70);

    const cardX = 24;
    const cardY = 110;
    const cardW = this.width - 48;
    const cardH = 520;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 18);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.2)';
    ctx.stroke();

    const rules = [
      { icon: '🎯', title: '微重力投擲儀', desc: '拖曳調整發射軌道，具備真實重力拋物線弧度預覽與落點全息投影圈，放開精準下落。' },
      { icon: '⚡', title: '連鎖共鳴倍率', desc: '連續在 2 秒內觸發多次融合，倍率逐級提升 (1.5x, 2.0x, 3.0x...) 並奏響空靈水晶和弦！' },
      { icon: '💥', title: '超新星爆發', desc: '高等級天體（木星、太陽）合成時引發環形震盪衝擊波與全螢幕星塵爆裂，疏通重力艙！' },
      { icon: '🕳️', title: '終極黑洞·奇異點', desc: '雙太陽合成誕生終極黑洞，誕生時一口吞噬周圍 2 顆微型隕石，獎勵海量連鎖積分！' },
      { icon: '⚠️', title: '靜止防誤判警戒線', desc: '星體在頂部警戒線上方「靜止停留超過 2.8 秒」才判定坍縮，消除彈跳擦邊誤判痛點！' }
    ];

    let itemY = cardY + 28;
    for (const r of rules) {
      ctx.textAlign = 'left';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(r.icon, cardX + 20, itemY + 24);

      ctx.font = 'bold 15px "SF Pro Display", system-ui, sans-serif';
      ctx.fillStyle = '#80d8ff';
      ctx.fillText(r.title, cardX + 60, itemY + 12);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.wrapText(ctx, r.desc, cardX + 60, itemY + 34, cardW - 85, 18);

      itemY += 96;
    }

    // 返回按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.stroke();

    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('◀ 返回主畫面', this.btnBack.x + this.btnBack.w / 2, this.btnBack.y + this.btnBack.h / 2);

    ctx.restore();
  }

  // 渲染暫停畫面
  public renderPause(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 18, 0.88)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.font = '900 28px "SF Pro Display", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#80d8ff';
    ctx.shadowBlur = 12;
    ctx.fillText('遊戲暫停 (PAUSED)', this.width / 2, 310);

    // 繼續遊戲按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnResume.x, this.btnResume.y, this.btnResume.w, this.btnResume.h, 26);
    const gradResume = ctx.createLinearGradient(this.btnResume.x, 0, this.btnResume.x + this.btnResume.w, 0);
    gradResume.addColorStop(0, '#00b0ff');
    gradResume.addColorStop(1, '#00e5ff');
    ctx.fillStyle = gradResume;
    ctx.fill();

    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#050a1e';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ 繼續遊戲', this.btnResume.x + this.btnResume.w / 2, this.btnResume.y + this.btnResume.h / 2);

    // 重新開始按鈕
    ctx.beginPath();
    ctx.roundRect(this.btnPauseRestart.x, this.btnPauseRestart.y, this.btnPauseRestart.w, this.btnPauseRestart.h, 25);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.stroke();

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🔄 重新開始', this.btnPauseRestart.x + this.btnPauseRestart.w / 2, this.btnPauseRestart.y + this.btnPauseRestart.h / 2);

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    let line = '';
    let currY = y;
    for (let n = 0; n < text.length; n++) {
      const testLine = line + text[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currY);
        line = text[n];
        currY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currY);
  }
}
