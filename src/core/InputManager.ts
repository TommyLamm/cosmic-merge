export class InputManager {
  private canvas: HTMLCanvasElement;
  public aimX: number = 225; // 預設居中 (450 / 2)
  public isAiming: boolean = false;
  public canDrop: boolean = true;
  private dropCooldownTimer: number = 0;
  private currentRadius: number = 16;
  public width: number = 450;
  public height: number = 800;

  public onDropRequested?: (x: number) => void;
  public onUserGesture?: () => void;

  constructor(canvas: HTMLCanvasElement, width: number = 450, height: number = 800) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.aimX = width / 2;

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

  private bindEvents(): void {
    // 1. 滑鼠事件
    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const pos = this.getCanvasCoords(e.clientX, e.clientY);
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
          this.clampAimX();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isAiming && e.touches.length > 0) {
        e.preventDefault(); // 防止滾動頁面
        const touch = e.touches[0];
        const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
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

    this.onDropRequested?.(this.aimX);
  }

  public update(deltaMs: number): void {
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
  }
}
