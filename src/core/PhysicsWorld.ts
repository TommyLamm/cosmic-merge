import Matter from 'matter-js';
import { CELESTIAL_CONFIGS, IMergeTask } from './CelestialData';

export interface IDeadlineStatus {
  isHazard: boolean;
  isGameOver: boolean;
  remainingTime: number;
  topY: number;
  trespassingBody: Matter.Body | null;
}

export class PhysicsWorld {
  public engine: Matter.Engine;
  public world: Matter.World;
  public width: number;
  public height: number;
  public deadlineY: number = 140;

  private mergeQueue: IMergeTask[] = [];
  public onMergeSuccess?: (tier: number, x: number, y: number, score: number) => void;
  public onSupernovaTrigger?: (tier: number, x: number, y: number) => void;
  public onBlackHoleSwallow?: (swallowedTier: number, x: number, y: number) => void;
  public onSingularityDevour?: (swallowedCount: number, x: number, y: number, bonusScore: number) => void;

  constructor(width: number = 450, height: number = 800) {
    this.width = width;
    this.height = height;

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.98, scale: 0.001 },
      enableSleeping: false
    });
    this.world = this.engine.world;

    this.setupBoundaries();
    this.setupCollisionHandlers();
  }

  private setupBoundaries(): void {
    const wallOptions: Matter.IBodyDefinition = {
      isStatic: true,
      friction: 0.05,
      restitution: 0.1,
      label: 'boundary_wall'
    };
    const thickness = 60;

    // 左邊界牆壁 (x: -30, w: 60)
    const leftWall = Matter.Bodies.rectangle(-thickness / 2, this.height / 2, thickness, this.height * 2, wallOptions);
    // 右邊界牆壁 (x: 450 + 30, w: 60)
    const rightWall = Matter.Bodies.rectangle(this.width + thickness / 2, this.height / 2, thickness, this.height * 2, wallOptions);
    // 底部厚地板 (y: 800 + 30, h: 60)
    const floor = Matter.Bodies.rectangle(this.width / 2, this.height + thickness / 2, this.width * 2, thickness, {
      ...wallOptions,
      friction: 0.25
    });

    Matter.Composite.add(this.world, [leftWall, rightWall, floor]);
  }

  private setupCollisionHandlers(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const tierA = (bodyA as any).celestialTier;
        const tierB = (bodyB as any).celestialTier;

        // 標記落地首度碰撞為 settled
        if (tierA) (bodyA as any).isSettled = true;
        if (tierB) (bodyB as any).isSettled = true;

        // 同階級天體碰撞合成判定 (最高可合成至 Tier 12 終極黑洞奇異點)
        if (tierA && tierB && tierA === tierB && tierA < 12) {
          // 若任一剛體已處於標記佇列中，直接略過，杜絕 Race Condition
          if ((bodyA as any).isMerging || (bodyB as any).isMerging) {
            continue;
          }

          // 原子化上鎖
          (bodyA as any).isMerging = true;
          (bodyB as any).isMerging = true;

          const midX = (bodyA.position.x + bodyB.position.x) / 2;
          const midY = (bodyA.position.y + bodyB.position.y) / 2;

          this.mergeQueue.push({
            bodyA,
            bodyB,
            nextTier: tierA + 1,
            position: { x: midX, y: midY }
          });
        }
      }
    });

    // 在物理更新 tick 結尾統一消除與生成新天體，並處理防死鎖微衝量與黑洞引力
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.resolveMergeQueue();
      this.applyAntiDeadlockImpulse();
      this.applyBlackHoleGravity();
    });
  }

  private resolveMergeQueue(): void {
    if (this.mergeQueue.length === 0) return;

    for (const task of this.mergeQueue) {
      // 自物理世界安全移除
      Matter.Composite.remove(this.world, task.bodyA);
      Matter.Composite.remove(this.world, task.bodyB);

      // 生成新天體
      const newBody = this.spawnCelestial(task.position.x, task.position.y, task.nextTier);
      (newBody as any).isSettled = true;
      Matter.Composite.add(this.world, newBody);

      // 微弱向上與橫向推開衝量，避免擠壓重疊
      Matter.Body.setVelocity(newBody, {
        x: (Math.random() - 0.5) * 1.2,
        y: -1.5
      });

      const config = CELESTIAL_CONFIGS[task.nextTier - 1];

      // 高等級天體超新星爆發 (Tier 11 太陽、Tier 12 終極黑洞)
      if (task.nextTier >= 11) {
        this.triggerSupernovaPulse(task.position.x, task.position.y, task.nextTier);
      }

      // 終極黑洞·奇異點 (Tier 12) 誕生機制：一口吞噬周圍 2 顆微型隕石！
      if (task.nextTier === 12) {
        this.handleSingularityBirthDevour(newBody, task.position.x, task.position.y);
      }

      this.onMergeSuccess?.(task.nextTier, task.position.x, task.position.y, config.score);
    }

    this.mergeQueue = [];
  }

  // 終極黑洞誕生時一口吞噬周圍 2 顆微型隕石，獎勵海量連鎖積分
  private handleSingularityBirthDevour(blackHoleBody: Matter.Body, originX: number, originY: number): void {
    const bodies = this.getAllCelestials().filter(b => b !== blackHoleBody && !(b as any).isMerging);

    // 優先挑選微型小行星 (Tier 1)，若不足再挑選冥王星 (Tier 2)
    const microCelestials = bodies.filter(b => (b as any).celestialTier === 1);
    if (microCelestials.length < 2) {
      const plutos = bodies.filter(b => (b as any).celestialTier === 2);
      microCelestials.push(...plutos);
    }

    // 依距離黑洞誕生中心升序排序，取最近的 2 顆
    microCelestials.sort((a, b) => {
      const distA = Math.hypot(a.position.x - originX, a.position.y - originY);
      const distB = Math.hypot(b.position.x - originX, b.position.y - originY);
      return distA - distB;
    });

    const targetsToDevour = microCelestials.slice(0, 2);
    if (targetsToDevour.length > 0) {
      for (const t of targetsToDevour) {
        Matter.Composite.remove(this.world, t);
      }
      const bonusScore = targetsToDevour.length * 500;
      this.onSingularityDevour?.(targetsToDevour.length, originX, originY, bonusScore);
    }
  }

  // 超新星爆發衝擊波：給予全場天體徑向排斥衝量
  private triggerSupernovaPulse(originX: number, originY: number, tier: number): void {
    const bodies = Matter.Composite.allBodies(this.world);
    const isSingularity = tier === 12;
    const forceFactor = isSingularity ? 14 : 9;

    for (const b of bodies) {
      const bTier = (b as any).celestialTier;
      if (bTier && bTier < tier) {
        const dx = b.position.x - originX;
        const dy = b.position.y - originY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const forceMag = Math.min(0.05, forceFactor / (dist + 35));
        Matter.Body.applyForce(b, b.position, {
          x: (dx / dist) * forceMag,
          y: (dy / dist) * forceMag - (isSingularity ? 0.03 : 0.015)
        });
      }
    }
    this.onSupernovaTrigger?.(tier, originX, originY);
  }

  // 星體微重疊防死鎖推擠微衝量，避免天體卡在漏斗兩側縫隙
  private applyAntiDeadlockImpulse(): void {
    const bodies = this.getAllCelestials();

    // 1. 左右兩側邊界卡死防禦
    for (const b of bodies) {
      const tier = (b as any).celestialTier;
      const radius = CELESTIAL_CONFIGS[tier - 1].radius;
      const isSettled = (b as any).isSettled;

      if (!isSettled) continue;

      // 檢查是否貼緊左壁且縱向移動停滯
      if (b.position.x - radius <= 3 && Math.abs(b.velocity.y) < 0.15) {
        Matter.Body.applyForce(b, b.position, { x: 0.0006, y: -0.0002 });
      }
      // 檢查是否貼緊右壁且縱向移動停滯
      else if (this.width - (b.position.x + radius) <= 3 && Math.abs(b.velocity.y) < 0.15) {
        Matter.Body.applyForce(b, b.position, { x: -0.0006, y: -0.0002 });
      }
    }

    // 2. 天體彼此深度卡死擠壓微推擠
    const len = bodies.length;
    for (let i = 0; i < len; i++) {
      const bA = bodies[i];
      const rA = CELESTIAL_CONFIGS[(bA as any).celestialTier - 1].radius;

      for (let j = i + 1; j < len; j++) {
        const bB = bodies[j];
        const rB = CELESTIAL_CONFIGS[(bB as any).celestialTier - 1].radius;

        const dx = bB.position.x - bA.position.x;
        const dy = bB.position.y - bA.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (rA + rB) * 0.94; // 嚴重重疊狀態

        if (dist < minDist && dist > 1) {
          const relSpeed = Math.hypot(bA.velocity.x - bB.velocity.x, bA.velocity.y - bB.velocity.y);
          if (relSpeed < 0.2) {
            const pushMag = 0.0004;
            const nx = dx / dist;
            const ny = dy / dist;
            Matter.Body.applyForce(bA, bA.position, { x: -nx * pushMag, y: -ny * pushMag - 0.0001 });
            Matter.Body.applyForce(bB, bB.position, { x: nx * pushMag, y: ny * pushMag - 0.0001 });
          }
        }
      }
    }
  }

  // 黑洞被動引力井與事件視界消融
  private applyBlackHoleGravity(): void {
    const bodies = Matter.Composite.allBodies(this.world);
    const blackHoles = bodies.filter(b => (b as any).celestialTier === 12);
    if (blackHoles.length === 0) return;

    const toSwallow: Matter.Body[] = [];

    for (const bh of blackHoles) {
      const bhRadius = CELESTIAL_CONFIGS[11].radius;
      for (const b of bodies) {
        const tier = (b as any).celestialTier;
        if (tier && tier <= 2 && !(b as any).isMerging && b !== bh) {
          const dx = bh.position.x - b.position.x;
          const dy = bh.position.y - b.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 260px 範圍內施加強大向心引力微調
          if (dist < 260 && dist > 5) {
            const pullForce = 0.00075 * (1 - dist / 260);
            Matter.Body.applyForce(b, b.position, {
              x: (dx / dist) * pullForce,
              y: (dy / dist) * pullForce
            });

            // 接觸到事件視界邊緣：吞噬消融！
            if (dist <= bhRadius * 0.95 && !toSwallow.includes(b)) {
              toSwallow.push(b);
            }
          }
        }
      }
    }

    for (const b of toSwallow) {
      const tier = (b as any).celestialTier;
      const pos = { x: b.position.x, y: b.position.y };
      Matter.Composite.remove(this.world, b);
      this.onBlackHoleSwallow?.(tier, pos.x, pos.y);
    }
  }

  public spawnCelestial(x: number, y: number, tier: number): Matter.Body {
    const config = CELESTIAL_CONFIGS[tier - 1];
    const body = Matter.Bodies.circle(x, y, config.radius, {
      density: config.density,
      restitution: config.restitution,
      friction: 0.1,
      frictionAir: 0.012,
      label: `celestial_${tier}`
    });
    (body as any).celestialTier = tier;
    (body as any).isMerging = false;
    (body as any).isSettled = false;
    (body as any).spawnTime = performance.now();
    (body as any).trespassingDuration = 0; // 連續超線靜止停留秒數
    return body;
  }

  public getAllCelestials(): Matter.Body[] {
    return Matter.Composite.allBodies(this.world).filter(b => !!(b as any).celestialTier);
  }

  // 重新設計頂部紅色警戒線判定：
  // 只有「星體靜止停留超過警戒線 2.8 秒」才判定遊戲結束，徹底消除剛彈跳瞬間碰觸紅線就被誤判出局的痛點
  public checkDeadlineHazard(deltaMs: number): IDeadlineStatus {
    const celestials = this.getAllCelestials();
    const now = performance.now();
    const dt = deltaMs * 0.001;

    let minTopY = this.height;
    let maxTrespassing = 0;
    let hazardBody: Matter.Body | null = null;

    for (const b of celestials) {
      const tier = (b as any).celestialTier;
      const config = CELESTIAL_CONFIGS[tier - 1];
      const spawnTime = (b as any).spawnTime || 0;
      const isSettled = (b as any).isSettled;

      // 剛生成小於 1.6 秒者免檢，防止剛下落穿過頂部警戒線被計入
      if (!isSettled && (now - spawnTime < 1600)) {
        continue;
      }

      const topY = b.position.y - config.radius;
      if (topY < minTopY) {
        minTopY = topY;
      }

      // 超線判定
      if (topY < this.deadlineY) {
        // 速度檢測：只有近乎靜止停留在警戒線上方者才累計時間
        // 若垂直速度較大（在跳躍、震動下墜），不累計甚至立即重置
        const isNearRest = Math.abs(b.velocity.y) < 0.28 && Math.abs(b.velocity.x) < 0.35;
        if (isNearRest) {
          (b as any).trespassingDuration = ((b as any).trespassingDuration || 0) + dt;
        } else {
          // 快速彈跳中，重置停留計時，消除彈跳碰線誤判
          (b as any).trespassingDuration = 0;
        }
      } else {
        // 在警戒線安全下方，計時清零
        (b as any).trespassingDuration = 0;
      }

      const duration = (b as any).trespassingDuration || 0;
      if (duration > maxTrespassing) {
        maxTrespassing = duration;
        hazardBody = b;
      }
    }

    const isHazard = maxTrespassing > 0;
    const remainingTime = Math.max(0, 2.8 - maxTrespassing);
    const isGameOver = maxTrespassing >= 2.8;

    return {
      isHazard,
      isGameOver,
      remainingTime,
      topY: minTopY,
      trespassingBody: hazardBody
    };
  }

  public update(deltaMs: number): void {
    Matter.Engine.update(this.engine, deltaMs);
  }

  public reset(): void {
    const bodies = this.getAllCelestials();
    for (const b of bodies) {
      Matter.Composite.remove(this.world, b);
    }
    this.mergeQueue = [];
  }
}
