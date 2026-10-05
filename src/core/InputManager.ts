export class InputManager {
  private canvas: HTMLCanvasElement;
  public aimX: number = 225; // 預設居中 (450 / 2)
  public aimVx: number = 0;   // 水平滑動初速度 (微重力拋物弧度參考)
  private lastAimX: number = 225;
  private lastMoveTime: number = 0;

  public isAiming: boolean = false;
  public canDrop: boolean = true;
  private dropCooldownTimer: number = 0;
  private currentRadius: number = 16;
  public width: number = 450;
  public height: number = 800;

  public onDropRequested?: (x: number, vx: number) => void;
  public onUserGesture?: () => void;

  constructor(canvas: HTMLCanvasElement, width: number = 450, height: number = 800) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.aimX = width / 2;
    this.lastAimX = this.aimX;

    this.bindEvents();
  }

  public setCurrentRadius(radius: number): void {
    this.currentRadius = radius;
    this.clampAimX();
  }

  private clampAimX(): void {
    const minX = this.currentRadius + 8;
    const maxX = this.width - this.currentRadius - 8;
    this.aimX = Math.max(minX, Math.min(maxX, this.aimX));
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private updateVelocity(newX: number): void {
    const now = performance.now();
    const dt = Math.max(10, now - this.lastMoveTime);
    this.lastMoveTime = now;

    const dx = newX - this.lastAimX;
    this.lastAimX = newX;

    // 計算水平微初速 (-2.5 ~ 2.5)
    const rawVx = (dx / dt) * 16;
    this.aimVx = this.aimVx * 0.35 + rawVx * 0.65;
    this.aimVx = Math.max(-2.5, Math.min(2.5, this.aimVx));
  }

  private bindEvents(): void {
    // 1. 滑鼠事件
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = this.getCanvasCoords(e.clientX, e.clientY);
      this.updateVelocity(pos.x);
      this.aimX = pos.x;
      this.clampAimX();
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.onUserGesture?.();
      const pos = this.getCanvasCoords(e.clientX, e.clientY);
      // 避免點擊頂部 HUD 按鈕區域 (y < 90)
      if (pos.y >= 90) {
        this.aimX = pos.x;
        this.clampAimX();
        this.requestDrop();
      }
    });

    // 2. 手機觸控事件
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      this.onUserGesture?.();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
        if (pos.y >= 90) {
          this.isAiming = true;
          this.aimX = pos.x;
          this.lastAimX = pos.x;
          this.lastMoveTime = performance.now();
          this.aimVx = 0;
          this.clampAimX();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isAiming && e.touches.length > 0) {
        e.preventDefault(); // 防止滾動頁面
        const touch = e.touches[0];
        const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.updateVelocity(pos.x);
        this.aimX = pos.x;
        this.clampAimX();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e: TouchEvent) => {
      if (this.isAiming) {
        e.preventDefault();
        this.isAiming = false;
        this.requestDrop();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', () => {
      this.isAiming = false;
    });

    // 全域 pointerdown 喚醒手勢音訊
    window.addEventListener('pointerdown', () => {
      this.onUserGesture?.();
    }, { once: false });
  }

  private requestDrop(): void {
    if (!this.canDrop) return;
    this.canDrop = false;
    this.dropCooldownTimer = 550; // 0.55 秒發射冷卻

    // 水平慣性初速度微調
    const releaseVx = this.aimVx * 0.4;
    this.onDropRequested?.(this.aimX, releaseVx);
  }

  public update(deltaMs: number): void {
    // 慣性初速自然阻尼衰減
    this.aimVx *= 0.90;
    if (Math.abs(this.aimVx) < 0.05) this.aimVx = 0;

    if (!this.canDrop) {
      this.dropCooldownTimer -= deltaMs;
      if (this.dropCooldownTimer <= 0) {
        this.canDrop = true;
      }
    }
  }

  public resetCooldown(): void {
    this.canDrop = true;
    this.dropCooldownTimer = 0;
    this.aimVx = 0;
  }
}
