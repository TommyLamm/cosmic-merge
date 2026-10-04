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

  // 天體投擲佇列
  private currentTier: number = 1;
  private nextTier: number = 2;
  private readonly launchY: number = 70;

  // 警戒線倒數判定
  private hazardActive: boolean = false;
  private hazardTimer: number = 3.0;
  private beepTimer: number = 0;

  private lastTime: number = 0;
  private animFrameId: number = 0;

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

    // 4. 連接物理回調與音效粒子
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

    // 投擲天體回調
    this.inputManager.onDropRequested = (x: number) => {
      if (this.state !== 'PLAYING') return;
      this.handleDropCelestial(x);
    };

    // 剛體引力合成成功回調
    this.physicsWorld.onMergeSuccess = (tier: number, x: number, y: number, addScore: number) => {
      this.score += addScore;
      this.totalMerges += 1;
      this.storageManager.incrementMerges();
      this.storageManager.unlockTier(tier);

      // 檢查是否打破歷史新紀錄
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewRecord = true;
        this.storageManager.updateHighScore(this.highScore);
      }

      // 音效與粒子演出
      this.audioManager.playMerge(tier);
      const cfg = CELESTIAL_CONFIGS[tier - 1];
      this.particleSystem.emitMergeSparks(x, y, cfg.primaryColor, 20 + tier * 2);
      this.particleSystem.emitShockwave(x, y, cfg.glowColor, cfg.radius * 0.8, cfg.radius * 2.2);
      this.particleSystem.emitFloatingText(x, y - cfg.radius * 0.5, `+${addScore}`, '#ffd54f', 22);
      this.particleSystem.triggerShake(Math.min(10, 1.5 + tier * 0.7), 160);
    };

    // 超新星爆發技能回調 (雙日合成)
    this.physicsWorld.onSupernovaTrigger = (x: number, y: number) => {
      this.score += 500;
      this.storageManager.updateHighScore(this.score);
      this.audioManager.playSupernova();
      this.particleSystem.emitShockwave(x, y, '#ffffff', 40, 360);
      this.particleSystem.emitFloatingText(x, y - 50, '💥 SUPERNOVA! +500', '#ffd54f', 28);
      this.particleSystem.triggerShake(14, 320);
    };

    // 黑洞引力吞噬消融回調
    this.physicsWorld.onBlackHoleSwallow = (swallowedTier: number, x: number, y: number) => {
      const bonus = swallowedTier * 12;
      this.score += bonus;
      this.audioManager.playWarp();
      this.particleSystem.emitMergeSparks(x, y, '#80d8ff', 16);
      this.particleSystem.emitFloatingText(x, y, `🕳️ SWALLOWED! +${bonus}`, '#80d8ff', 18);
    };
  }

  private handleDropCelestial(x: number): void {
    // 在 (x, launchY) 處生成實體剛體
    const body = this.physicsWorld.spawnCelestial(x, this.launchY, this.currentTier);
    Matter.Composite.add(this.physicsWorld.world, body);

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
    // 啟動 Playroom 平台成績局次追蹤（非阻塞，離線/訪客不阻擋遊玩）
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
    this.hazardTimer = 3.0;
    this.beepTimer = 0;

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

    // 回報 Playroom 平台成績（安全非負整數，離線/訪客不阻擋遊戲）
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
    // 1. 背景與粒子始終更新以保持動態美感
    this.bgRenderer.update(deltaMs);
    this.particleSystem.update(deltaMs);
    this.celestialRenderer.update(deltaMs);

    // 2. 僅在 PLAYING 狀態下推進物理與警戒線監聽
    if (this.state === 'PLAYING') {
      this.physicsWorld.update(deltaMs);
      this.inputManager.update(deltaMs);
      this.hud.update(deltaMs);

      // 警戒線倒數判定
      const hazardCheck = this.physicsWorld.checkDeadlineHazard();
      if (hazardCheck.isHazard) {
        this.hazardActive = true;
        this.hazardTimer -= deltaMs * 0.001;

        // 每 0.5 秒發出一次急促警報蜂鳴音
        this.beepTimer += deltaMs * 0.001;
        if (this.beepTimer >= 0.45) {
          this.beepTimer = 0;
          this.audioManager.playHazardBeep();
        }

        // 連續超線滿 3 秒判定 Game Over
        if (this.hazardTimer <= 0) {
          this.triggerGameOver();
        }
      } else {
        // 回歸安全線下，重置倒數計時器
        this.hazardActive = false;
        this.hazardTimer = 3.0;
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

    // 3. 繪製目前準備投擲的天體與發射預測導引虛線
    if (this.state === 'PLAYING') {
      this.renderAimingDropper(this.ctx);
    }

    // 4. 繪製粒子、衝擊波與浮動分數文字
    this.particleSystem.render(this.ctx);

    // 5. 繪製頂部 HUD (分數、Next 預覽、警戒線)
    if (this.state === 'PLAYING' || this.state === 'PAUSED') {
      this.hud.render(
        this.ctx,
        this.score,
        this.highScore,
        this.nextTier,
        this.audioManager.isMuted(),
        this.hazardActive,
        this.hazardTimer,
        this.physicsWorld.deadlineY
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

  // 繪製頂部發射軌道、待發星體與導引虛線
  private renderAimingDropper(ctx: CanvasRenderingContext2D): void {
    const aimX = this.inputManager.aimX;
    const currentRadius = CELESTIAL_CONFIGS[this.currentTier - 1].radius;

    ctx.save();

    // 1. 發射頂部安全軌道橫條
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(15, this.launchY);
    ctx.lineTo(this.width - 15, this.launchY);
    ctx.stroke();

    // 2. 向下發射預測虛線 (計算直落落點或下方阻礙物)
    let groundY = this.height - 10;
    const bodies = this.physicsWorld.getAllCelestials();
    for (const b of bodies) {
      const tier = (b as any).celestialTier;
      const r = CELESTIAL_CONFIGS[tier - 1].radius;
      if (Math.abs(b.position.x - aimX) < (currentRadius + r)) {
        const topOfBody = b.position.y - r;
        if (topOfBody > this.launchY && topOfBody < groundY) {
          groundY = topOfBody;
        }
      }
    }

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(aimX, this.launchY + currentRadius);
    ctx.lineTo(aimX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // 3. 落點提示標記圈
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(aimX, groundY, currentRadius * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // 4. 繪製待投擲的當前天體
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
