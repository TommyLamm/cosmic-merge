import Matter from 'matter-js';
import { CELESTIAL_CONFIGS, getRandomSpawnTier } from './core/CelestialData';
import { StorageManager } from './core/StorageManager';
import { AudioManager } from './core/AudioManager';
import { ParticleSystem } from './core/ParticleSystem';
import { PhysicsWorld } from './core/PhysicsWorld';
import { InputManager } from './core/InputManager';
import { BackgroundRenderer } from './render/BackgroundRenderer';
import { CelestialRenderer } from './render/CelestialRenderer';
import { HUD } from './ui/HUD';
import { CodexModal } from './ui/CodexModal';
import { GameOverModal } from './ui/GameOverModal';
import { OverlayUI } from './ui/OverlayUI';
import { Playroom } from './playroom-sdk.js';

export type GameState = 'TITLE' | 'INSTRUCTIONS' | 'PLAYING' | 'PAUSED' | 'CODEX' | 'GAME_OVER';

export class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 450;
  private height: number = 800;

  // 模組實例
  private storageManager: StorageManager;
  private audioManager: AudioManager;
  private particleSystem: ParticleSystem;
  private physicsWorld: PhysicsWorld;
  private inputManager: InputManager;
  private bgRenderer: BackgroundRenderer;
  private celestialRenderer: CelestialRenderer;
  private hud: HUD;
  private codexModal: CodexModal;
  private gameOverModal: GameOverModal;
  private overlayUI: OverlayUI;

  // 遊戲狀態與數值
  private state: GameState = 'TITLE';
  private previousState: GameState = 'TITLE';
  private score: number = 0;
  private highScore: number = 0;
  private totalMerges: number = 0;
  private isNewRecord: boolean = false;
  private accountRun: Promise<{ runId: string } | null> | null = null;

  // 連鎖共鳴 (Cascade Chain) 狀態
  private chainCount: number = 0;
  private chainMultiplier: number = 1.0;
  private chainTimer: number = 0;
  private lastMergeTime: number = 0;

  // 天體投擲佇列
  private currentTier: number = 1;
  private nextTier: number = 2;
  private readonly launchY: number = 70;

  // 警戒線倒數判定 (2.8 秒靜止超線出局)
  private hazardActive: boolean = false;
  private hazardTimer: number = 2.8;
  private beepTimer: number = 0;

  private lastTime: number = 0;
  private animFrameId: number = 0;
  private globalAnimTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D context');
    this.ctx = context;

    // 1. 初始化資料與音訊
    this.storageManager = new StorageManager();
    const saveData = this.storageManager.load();
    this.highScore = saveData.highScore;
    this.audioManager = new AudioManager(!saveData.soundEnabled);

    // 2. 初始化核心物理、渲染與粒子
    this.particleSystem = new ParticleSystem();
    this.physicsWorld = new PhysicsWorld(this.width, this.height);
    this.bgRenderer = new BackgroundRenderer(this.width, this.height);
    this.celestialRenderer = new CelestialRenderer();

    // 3. 初始化 UI 與輸入
    this.hud = new HUD(this.width, this.height, this.celestialRenderer);
    this.codexModal = new CodexModal(this.width, this.height, this.celestialRenderer);
    this.gameOverModal = new GameOverModal(this.width, this.height);
    this.overlayUI = new OverlayUI(this.width, this.height);
    this.inputManager = new InputManager(this.canvas, this.width, this.height);

    // 4. 連接物理回調、連鎖共鳴與超新星演出
    this.setupCallbacks();

    // 5. 綁定全域輸入轉發
    this.bindClickHandlers();

    // 6. 初始化投擲佇列
    this.currentTier = getRandomSpawnTier();
    this.nextTier = getRandomSpawnTier();
    this.inputManager.setCurrentRadius(CELESTIAL_CONFIGS[this.currentTier - 1].radius);
  }

  private setupCallbacks(): void {
    // 玩家手勢喚醒音訊
    this.inputManager.onUserGesture = () => {
      this.audioManager.initOnGesture();
    };

    // 投擲天體回調 (支援微慣性水平速度)
    this.inputManager.onDropRequested = (x: number, vx: number) => {
      if (this.state !== 'PLAYING') return;
      this.handleDropCelestial(x, vx);
    };

    // 剛體引力合成成功回調 (連鎖共鳴機制核心)
    this.physicsWorld.onMergeSuccess = (tier: number, x: number, y: number, baseScore: number) => {
      const now = performance.now();
      const elapsed = (now - this.lastMergeTime) * 0.001;
      this.lastMergeTime = now;

      // 連續在 2 秒內觸發 2 次以上融合時，倍率逐級提升
      if (elapsed <= 2.0 && this.chainCount >= 1) {
        this.chainCount += 1;
        // 階梯倍率: 2次 1.5x, 3次 2.0x, 4次 2.5x, 5次 3.0x...
        this.chainMultiplier = Math.min(5.0, 1.0 + (this.chainCount - 1) * 0.5);
      } else {
        this.chainCount = 1;
        this.chainMultiplier = 1.0;
      }
      this.chainTimer = 2.0; // 重置 2 秒連鎖窗口

      const finalAddScore = Math.round(baseScore * this.chainMultiplier);
      this.score += finalAddScore;
      this.totalMerges += 1;
      this.storageManager.incrementMerges();
      this.storageManager.unlockTier(tier);

      // 檢查是否打破歷史新紀錄
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewRecord = true;
        this.storageManager.updateHighScore(this.highScore);
      }

      const cfg = CELESTIAL_CONFIGS[tier - 1];

      // 連鎖專屬空靈水晶琶音 vs 一般融合和弦
      if (this.chainCount >= 2) {
        this.audioManager.playCascadeArpeggio(this.chainCount);
        this.particleSystem.emitFloatingText(
          x,
          y - cfg.radius * 0.8,
          `⚡ CASCADE ${this.chainMultiplier.toFixed(1)}x! +${finalAddScore}`,
          '#ffd54f',
          24
        );
      } else {
        this.audioManager.playMerge(tier);
        this.particleSystem.emitFloatingText(x, y - cfg.radius * 0.5, `+${finalAddScore}`, '#ffd54f', 22);
      }

      // 星塵爆裂與環形震盪衝擊波
      this.particleSystem.emitMergeSparks(x, y, cfg.primaryColor, 20 + tier * 3);
      this.particleSystem.emitShockwave(x, y, cfg.glowColor, cfg.radius * 0.8, cfg.radius * 2.2, 4);
      this.particleSystem.triggerShake(Math.min(10, 1.5 + tier * 0.7), 160);
    };

    // 超新星爆發技能回調 (Tier 11 太陽、Tier 12 終極黑洞奇異點)
    this.physicsWorld.onSupernovaTrigger = (tier: number, x: number, y: number) => {
      const isSingularity = tier === 12;
      const bonus = isSingularity ? 1000 : 400;
      this.score += bonus;
      this.storageManager.updateHighScore(this.score);

      if (isSingularity) {
        // 終極黑洞誕生超新星全屏爆裂演出
        this.audioManager.playSupernova(1.4);
        this.particleSystem.triggerScreenFlash('#ffffff', 0.65, 300);
        this.particleSystem.emitShockwave(x, y, '#80d8ff', 50, 480, 8);
        this.particleSystem.emitSupernovaDust(x, y, 90);
        this.particleSystem.emitFloatingText(x, y - 60, `💥 SINGULARITY SUPERNOVA! +${bonus}`, '#80d8ff', 28);
        this.particleSystem.triggerShake(16, 400);
      } else {
        // 木星融合成太陽之超新星爆發演出
        this.audioManager.playSupernova(0.85);
        this.particleSystem.triggerScreenFlash('#ffab00', 0.35, 200);
        this.particleSystem.emitShockwave(x, y, '#ff9100', 35, 340, 6);
        this.particleSystem.emitSupernovaDust(x, y, 50);
        this.particleSystem.emitFloatingText(x, y - 50, `💥 SUPERNOVA! +${bonus}`, '#ffd54f', 26);
        this.particleSystem.triggerShake(10, 260);
      }
    };

    // 終極黑洞誕生時一口吞噬周圍 2 顆微型隕石回調
    this.physicsWorld.onSingularityDevour = (count: number, x: number, y: number, bonusScore: number) => {
      this.score += bonusScore;
      this.storageManager.updateHighScore(this.score);
      this.audioManager.playSingularityBirth();
      this.particleSystem.emitSupernovaDust(x, y, 40);
      this.particleSystem.emitFloatingText(x, y + 40, `🕳️ SINGULARITY DEVOUR (${count})! +${bonusScore}`, '#80d8ff', 24);
      this.particleSystem.triggerShake(12, 280);
    };

    // 黑洞被動引力井吞噬消融回調
    this.physicsWorld.onBlackHoleSwallow = (swallowedTier: number, x: number, y: number) => {
      const bonus = swallowedTier * 15;
      this.score += bonus;
      this.audioManager.playWarp();
      this.particleSystem.emitMergeSparks(x, y, '#80d8ff', 18);
      this.particleSystem.emitFloatingText(x, y, `🕳️ SWALLOWED! +${bonus}`, '#80d8ff', 18);
    };
  }

  private handleDropCelestial(x: number, vx: number): void {
    // 在 (x, launchY) 處生成實體剛體
    const body = this.physicsWorld.spawnCelestial(x, this.launchY, this.currentTier);
    Matter.Composite.add(this.physicsWorld.world, body);

    // 賦予微重力微初速度
    if (Math.abs(vx) > 0.1) {
      Matter.Body.setVelocity(body, { x: vx, y: 0.5 });
    }

    this.audioManager.playDrop();

    // 換裝下一個天體
    this.currentTier = this.nextTier;
    this.nextTier = getRandomSpawnTier();
    this.inputManager.setCurrentRadius(CELESTIAL_CONFIGS[this.currentTier - 1].radius);
  }

  private bindClickHandlers(): void {
    const handleActionClick = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // 1. 若圖鑑視窗開啟中
      if (this.codexModal.isOpen) {
        if (this.codexModal.checkClick(x, y)) {
          this.state = this.previousState;
        }
        return;
      }

      // 2. 依狀態處理介面按鈕點擊
      switch (this.state) {
        case 'TITLE': {
          const action = this.overlayUI.checkTitleClick(x, y);
          if (action === 'start') {
            this.startNewGame();
          } else if (action === 'instructions') {
            this.state = 'INSTRUCTIONS';
          } else if (action === 'codex') {
            this.previousState = 'TITLE';
            this.state = 'CODEX';
            this.codexModal.open();
          }
          break;
        }

        case 'INSTRUCTIONS': {
          const action = this.overlayUI.checkInstructionsClick(x, y);
          if (action === 'back') {
            this.state = 'TITLE';
          }
          break;
        }

        case 'PLAYING': {
          const btn = this.hud.checkButtonClick(x, y);
          if (btn === 'pause') {
            this.state = 'PAUSED';
          } else if (btn === 'sound') {
            const isMuted = this.audioManager.toggleMute();
            this.storageManager.setSoundEnabled(!isMuted);
          } else if (btn === 'codex') {
            this.previousState = 'PLAYING';
            this.state = 'CODEX';
            this.codexModal.open();
          }
          break;
        }

        case 'PAUSED': {
          const action = this.overlayUI.checkPauseClick(x, y);
          if (action === 'resume') {
            this.state = 'PLAYING';
          } else if (action === 'restart') {
            this.startNewGame();
          }
          break;
        }

        case 'GAME_OVER': {
          const action = this.gameOverModal.checkClick(x, y);
          if (action === 'restart') {
            this.startNewGame();
          } else if (action === 'codex') {
            this.previousState = 'GAME_OVER';
            this.state = 'CODEX';
            this.codexModal.open();
          }
          break;
        }
      }
    };

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      handleActionClick(e.clientX, e.clientY);
    });

    // 支援圖鑑在桌面的滾輪滑動
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      if (this.state === 'CODEX') {
        this.codexModal.handleWheel(e.deltaY);
      }
    }, { passive: true });

    // 支援圖鑑在手機的滑動
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (this.state === 'CODEX' && e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const y = (e.touches[0].clientY - rect.top) * (this.height / rect.height);
        this.codexModal.handleTouchStart(y);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.state === 'CODEX' && e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const y = (e.touches[0].clientY - rect.top) * (this.height / rect.height);
        this.codexModal.handleTouchMove(y);
      }
    }, { passive: true });
  }

  private startNewGame(): void {
    try {
      this.accountRun = Playroom.startRun().catch((err) => {
        console.warn('[Playroom] startRun skipped or failed:', err);
        return null;
      });
    } catch (err) {
      console.warn('[Playroom] startRun call error:', err);
      this.accountRun = null;
    }

    this.physicsWorld.reset();
    this.particleSystem.clear();
    this.score = 0;
    this.totalMerges = 0;
    this.isNewRecord = false;
    this.hazardActive = false;
    this.hazardTimer = 2.8;
    this.beepTimer = 0;

    this.chainCount = 0;
    this.chainMultiplier = 1.0;
    this.chainTimer = 0;
    this.lastMergeTime = 0;

    this.currentTier = getRandomSpawnTier();
    this.nextTier = getRandomSpawnTier();
    this.inputManager.setCurrentRadius(CELESTIAL_CONFIGS[this.currentTier - 1].radius);
    this.inputManager.resetCooldown();

    this.gameOverModal.close();
    this.codexModal.close();
    this.state = 'PLAYING';
  }

  private triggerGameOver(): void {
    this.state = 'GAME_OVER';
    this.hazardActive = false;
    this.audioManager.playGameOver();
    this.particleSystem.triggerShake(16, 400);

    // 檢查並存檔紀錄
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewRecord = true;
      this.storageManager.updateHighScore(this.highScore);
    }

    // 回報 Playroom 平台成績
    const safeScore = Math.floor(Math.max(0, this.score));
    const pendingRun = this.accountRun;
    this.accountRun = null;
    if (pendingRun) {
      void pendingRun.then((run) => {
        if (run && typeof run.runId === 'string') {
          return Playroom.finishRun({ runId: run.runId, score: safeScore });
        }
        return null;
      }).catch((err) => {
        console.warn('[Playroom] finishRun error:', err);
      });
    }

    this.gameOverModal.open();
  }

  public start(): void {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      const deltaMs = Math.min(50, currentTime - this.lastTime);
      this.lastTime = currentTime;

      this.update(deltaMs);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private update(deltaMs: number): void {
    this.globalAnimTime += deltaMs * 0.001;

    // 1. 背景與粒子始終更新以保持動態美感
    this.bgRenderer.update(deltaMs);
    this.particleSystem.update(deltaMs);
    this.celestialRenderer.update(deltaMs);

    // 2. 僅在 PLAYING 狀態下推進物理與警戒線監聽
    if (this.state === 'PLAYING') {
      this.physicsWorld.update(deltaMs);
      this.inputManager.update(deltaMs);
      this.hud.update(deltaMs);

      // 連鎖倒數衰減
      if (this.chainTimer > 0) {
        this.chainTimer -= deltaMs * 0.001;
        if (this.chainTimer <= 0) {
          this.chainCount = 0;
          this.chainMultiplier = 1.0;
        }
      }

      // 警戒線判定：星體靜止停留超過警戒線 2.8 秒才出局
      const hazardCheck = this.physicsWorld.checkDeadlineHazard(deltaMs);
      if (hazardCheck.isGameOver) {
        this.triggerGameOver();
      } else if (hazardCheck.isHazard) {
        this.hazardActive = true;
        this.hazardTimer = hazardCheck.remainingTime;

        // 每 0.45 秒發出一次急促警報蜂鳴音
        this.beepTimer += deltaMs * 0.001;
        if (this.beepTimer >= 0.45) {
          this.beepTimer = 0;
          this.audioManager.playHazardBeep();
        }
      } else {
        // 回歸安全線下，重置倒數計時器
        this.hazardActive = false;
        this.hazardTimer = 2.8;
        this.beepTimer = 0;
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    // 應用螢幕震動位移
    this.ctx.translate(this.particleSystem.shakeOffsetX, this.particleSystem.shakeOffsetY);

    // 1. 繪製視差星空背景
    this.bgRenderer.render(this.ctx);

    // 2. 繪製重力艙內所有天體
    const bodies = this.physicsWorld.getAllCelestials();
    for (const b of bodies) {
      const tier = (b as any).celestialTier;
      if (tier) {
        this.celestialRenderer.renderBody(
          this.ctx,
          b.position.x,
          b.position.y,
          tier,
          b.angle
        );
      }
    }

    // 3. 繪製微重力輔助投擲儀 (落點拋物線弧度預覽與落點虛擬投影圈)
    if (this.state === 'PLAYING') {
      this.renderMicroGravityAiming(this.ctx);
    }

    // 4. 繪製粒子、衝擊波與浮動分數文字
    this.particleSystem.render(this.ctx);

    // 5. 繪製頂部 HUD (分數、Next 預覽、連鎖指示、警戒線)
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.hud.render(
        this.ctx,
        this.score,
        this.highScore,
        this.nextTier,
        this.audioManager.isMuted(),
        this.hazardActive,
        this.hazardTimer,
        this.physicsWorld.deadlineY,
        this.chainCount,
        this.chainMultiplier,
        this.chainTimer
      );
    }

    // 6. 覆蓋介面 (Title, Instructions, Paused, GameOver, Codex)
    switch (this.state) {
      case 'TITLE':
        this.overlayUI.renderTitle(this.ctx, this.highScore);
        break;
      case 'INSTRUCTIONS':
        this.overlayUI.renderInstructions(this.ctx);
        break;
      case 'PAUSED':
        this.overlayUI.renderPause(this.ctx);
        break;
      case 'GAME_OVER':
        this.gameOverModal.render(
          this.ctx,
          this.score,
          this.highScore,
          this.isNewRecord,
          this.totalMerges
        );
        break;
      case 'CODEX': {
        const unlockedTiers = this.storageManager.load().unlockedTiers;
        this.codexModal.render(this.ctx, unlockedTiers);
        break;
      }
    }

    this.ctx.restore();
  }

  // 繪製微重力輔助投擲儀：真實重力落點拋物線弧度預覽與落點虛擬投影圈
  private renderMicroGravityAiming(ctx: CanvasRenderingContext2D): void {
    const aimX = this.inputManager.aimX;
    const aimVx = this.inputManager.aimVx * 0.4;
    const currentRadius = CELESTIAL_CONFIGS[this.currentTier - 1].radius;

    ctx.save();

    // 1. 高科技磁浮發射滑軌
    const railY = this.launchY;
    const railGrad = ctx.createLinearGradient(15, railY, this.width - 15, railY);
    railGrad.addColorStop(0, 'rgba(0, 229, 255, 0.15)');
    railGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.65)');
    railGrad.addColorStop(1, 'rgba(0, 229, 255, 0.15)');

    ctx.strokeStyle = railGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, railY);
    ctx.lineTo(this.width - 15, railY);
    ctx.stroke();

    // 滑軌兩端高能磁極端點
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(15, railY, 4, 0, Math.PI * 2);
    ctx.arc(this.width - 15, railY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. 微重力真實拋物線步進物理模擬 (計算落點與沿途弧度)
    const points: { x: number; y: number }[] = [];
    let simX = aimX;
    let simY = railY + currentRadius;
    let simVx = aimVx;
    let simVy = 0.5;
    const gravity = 0.28; // 每步微重力增量
    const floorY = this.height - 10 - currentRadius;
    const bodies = this.physicsWorld.getAllCelestials();

    points.push({ x: simX, y: simY });

    let hitPoint = { x: simX, y: floorY };
    const maxSteps = 45;

    for (let step = 0; step < maxSteps; step++) {
      simVy += gravity;
      simX += simVx;
      simY += simVy;

      // 側壁邊界反彈
      if (simX - currentRadius < 4) {
        simX = 4 + currentRadius;
        simVx = -simVx * 0.5;
      } else if (simX + currentRadius > this.width - 4) {
        simX = this.width - 4 - currentRadius;
        simVx = -simVx * 0.5;
      }

      // 天體障礙碰撞預測
      let collided = false;
      for (const b of bodies) {
        const tier = (b as any).celestialTier;
        const bRadius = CELESTIAL_CONFIGS[tier - 1].radius;
        const distSq = (simX - b.position.x) ** 2 + (simY - b.position.y) ** 2;
        if (distSq <= (currentRadius + bRadius) ** 2) {
          collided = true;
          break;
        }
      }

      if (simY >= floorY) {
        simY = floorY;
        collided = true;
      }

      points.push({ x: simX, y: simY });

      if (collided) {
        hitPoint = { x: simX, y: simY };
        break;
      }
    }

    // 3. 繪製微重力拋物能量弧線
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 沿著拋物線流動的微能量光點 (動態波紋)
    const flowT = (this.globalAnimTime * 25) % points.length;
    const flowIndex = Math.floor(flowT);
    if (points[flowIndex]) {
      ctx.beginPath();
      ctx.arc(points[flowIndex].x, points[flowIndex].y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. 落點虛擬全息投影圈 (Virtual Landing Hologram)
    const pulse = 1.0 + 0.08 * Math.sin(this.globalAnimTime * 6);
    const targetR = currentRadius * pulse;

    // 外層脈衝光環
    ctx.beginPath();
    ctx.arc(hitPoint.x, hitPoint.y, targetR * 1.08, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // 內層天體輪廓虛影底
    ctx.beginPath();
    ctx.arc(hitPoint.x, hitPoint.y, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 落點中心十字瞄準光標
    const crossSize = Math.min(10, currentRadius * 0.4);
    ctx.strokeStyle = '#80d8ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hitPoint.x - crossSize, hitPoint.y);
    ctx.lineTo(hitPoint.x + crossSize, hitPoint.y);
    ctx.moveTo(hitPoint.x, hitPoint.y - crossSize);
    ctx.lineTo(hitPoint.x, hitPoint.y + crossSize);
    ctx.stroke();

    // 5. 繪製發射點待投擲的當前天體
    this.celestialRenderer.renderBody(
      ctx,
      aimX,
      this.launchY,
      this.currentTier,
      0,
      1
    );

    ctx.restore();
  }
}
