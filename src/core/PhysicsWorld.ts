import Matter from 'matter-js';
import { CELESTIAL_CONFIGS, IMergeTask } from './CelestialData';

export class PhysicsWorld {
  public engine: Matter.Engine;
  public world: Matter.World;
  public width: number;
  public height: number;
  public deadlineY: number = 140;

  private mergeQueue: IMergeTask[] = [];
  public onMergeSuccess?: (tier: number, x: number, y: number, score: number) => void;
  public onSupernovaTrigger?: (x: number, y: number) => void;
  public onBlackHoleSwallow?: (swallowedTier: number, x: number, y: number) => void;

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

    // 左牆壁 (x: -30, w: 60)
    const leftWall = Matter.Bodies.rectangle(-thickness / 2, this.height / 2, thickness, this.height * 2, wallOptions);
    // 右牆壁 (x: 450 + 30, w: 60)
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

        // 同階級天體碰撞合成判定 (最高可合成至 Tier 12 黑洞)
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

    // 在物理更新 tick 結尾統一消除與生成新天體
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.resolveMergeQueue();
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
      (newBody as any).isSettled = true; // 合成新生的天體已落定
      Matter.Composite.add(this.world, newBody);

      // 微弱向上與橫向推開衝量，避免擠壓重疊
      Matter.Body.setVelocity(newBody, {
        x: (Math.random() - 0.5) * 1.2,
        y: -1.5
      });

      const config = CELESTIAL_CONFIGS[task.nextTier - 1];

      // 特殊技能：若合成出 Tier 12 黑洞 (雙太陽合成)，引發超新星全屏爆發！
      if (task.nextTier === 12) {
        this.triggerSupernovaPulse(task.position.x, task.position.y);
      }

      this.onMergeSuccess?.(task.nextTier, task.position.x, task.position.y, config.score);
    }

    this.mergeQueue = [];
  }

  // 超新星爆發衝擊波：給予全場非黑洞天體徑向排斥衝量
  private triggerSupernovaPulse(originX: number, originY: number): void {
    const bodies = Matter.Composite.allBodies(this.world);
    for (const b of bodies) {
      const tier = (b as any).celestialTier;
      if (tier && tier < 12) {
        const dx = b.position.x - originX;
        const dy = b.position.y - originY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const forceMag = Math.min(0.04, 8 / (dist + 30));
        Matter.Body.applyForce(b, b.position, {
          x: (dx / dist) * forceMag,
          y: (dy / dist) * forceMag - 0.02
        });
      }
    }
    this.onSupernovaTrigger?.(originX, originY);
  }

  // 黑洞被動引力井與消融
  private applyBlackHoleGravity(): void {
    const bodies = Matter.Composite.allBodies(this.world);
    const blackHoles = bodies.filter(b => (b as any).celestialTier === 12);
    if (blackHoles.length === 0) return;

    const toSwallow: Matter.Body[] = [];

    for (const bh of blackHoles) {
      const bhRadius = CELESTIAL_CONFIGS[11].radius;
      for (const b of bodies) {
        const tier = (b as any).celestialTier;
        if (tier && tier <= 2 && !(b as any).isMerging) {
          const dx = bh.position.x - b.position.x;
          const dy = bh.position.y - b.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // 240px 範圍內施加向心引力
          if (dist < 240 && dist > 5) {
            const pullForce = 0.0006 * (1 - dist / 240);
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
    return body;
  }

  public getAllCelestials(): Matter.Body[] {
    return Matter.Composite.allBodies(this.world).filter(b => !!(b as any).celestialTier);
  }

  // 檢查頂部危險警戒線 (Y = 140)
  public checkDeadlineHazard(): { isHazard: boolean; topY: number; trespassingBody: Matter.Body | null } {
    const celestials = this.getAllCelestials();
    const now = performance.now();
    let minTopY = this.height;
    let hazardBody: Matter.Body | null = null;

    for (const b of celestials) {
      const tier = (b as any).celestialTier;
      const config = CELESTIAL_CONFIGS[tier - 1];
      const spawnTime = (b as any).spawnTime || 0;
      const isSettled = (b as any).isSettled;

      // 剛生成小於 1.5 秒且尚未落定者享受免檢期
      if (!isSettled && (now - spawnTime < 1500)) {
        continue;
      }

      const topY = b.position.y - config.radius;
      if (topY < minTopY) {
        minTopY = topY;
      }

      // 超過警戒線且垂直速度趨於平緩 (|vy| < 0.35)
      if (topY < this.deadlineY && Math.abs(b.velocity.y) < 0.35) {
        if (!hazardBody || topY < (hazardBody.position.y - CELESTIAL_CONFIGS[(hazardBody as any).celestialTier - 1].radius)) {
          hazardBody = b;
        }
      }
    }

    return {
      isHazard: hazardBody !== null,
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
