/**
 * Particle System (Puffs, Trails, Bursts, Ambient Fireflies & Drifting Leaves)
 */

import { COLORS } from "./settings.js";

export class Particle {
  public alive = true;

  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public life: number,
    public maxLife: number,
    public size: number,
    public color: string,
    public gravity = 0.0,
    public glow = false
  ) {}

  public update(dt: number): void {
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
}

export interface AmbientParticle {
  x: number;
  y: number;
  phase: number;
  speed: number;
  size: number;
  typeIdx: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public ambient: AmbientParticle[] = [];

  public clear(): void {
    this.particles = [];
    this.ambient = [];
  }

  public seedAmbient(width: number, height: number, ambientType: string, count = 24): void {
    this.ambient = [];
    const typeIdx = ambientType === "fireflies" ? 0 : ambientType === "leaves" ? 1 : 2;
    for (let i = 0; i < count; i++) {
      this.ambient.push({
        x: Math.random() * width,
        y: Math.random() * height,
        phase: Math.random() * Math.PI * 2,
        speed: 8.0 + Math.random() * 10.0,
        size: 1.0 + Math.random() * 1.2,
        typeIdx
      });
    }
  }

  public spawnDust(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * Math.random();
      const spd = 14 + Math.random() * 28;
      const life = 0.22 + Math.random() * 0.20;
      this.particles.push(
        new Particle(
          x + (Math.random() * 8 - 4),
          y + (Math.random() * 3 - 2),
          Math.cos(ang) * spd,
          Math.sin(ang) * spd * 0.55 - 8.0,
          life,
          life,
          2.0 + Math.random() * 1.5,
          COLORS.parchment_dark,
          35.0
        )
      );
    }
  }

  public spawnBurst(x: number, y: number, color: string, count = 10, speed = 65): void {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * 0.35 + Math.random() * speed * 0.65;
      const life = 0.25 + Math.random() * 0.30;
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          life,
          life,
          1.8 + Math.random() * 1.4,
          color,
          40.0,
          true
        )
      );
    }
  }

  public spawnTrail(x: number, y: number, trailId: string): void {
    let color = COLORS.sky_teal;
    let grav = 0;
    if (trailId === "sparkle_trail") {
      color = COLORS.gold_bright;
      grav = -12;
    } else if (trailId === "petal_trail") {
      color = COLORS.coral;
      grav = 28;
    } else if (trailId === "starlight_trail") {
      color = COLORS.plum;
      grav = -6;
    }
    const life = 0.28 + Math.random() * 0.20;
    this.particles.push(
      new Particle(
        x + (Math.random() * 6 - 3),
        y + (Math.random() * 6 - 3),
        Math.random() * 24 - 12,
        Math.random() * -18,
        life,
        life,
        1.6 + Math.random() * 1.2,
        color,
        grav,
        true
      )
    );
  }

  public update(dt: number, worldW: number, worldH: number): void {
    this.particles.forEach((p) => p.update(dt));
    this.particles = this.particles.filter((p) => p.alive);

    this.ambient.forEach((a) => {
      a.phase += dt * 1.4;
      if (a.typeIdx === 1) {
        a.x += (Math.sin(a.phase) * 8 - 6) * dt;
        a.y += a.speed * 0.7 * dt;
        if (a.y > worldH) {
          a.y = -4;
          a.x = Math.random() * worldW;
        }
      } else if (a.typeIdx === 2) {
        a.x += Math.sin(a.phase) * 6 * dt;
        a.y -= a.speed * 0.45 * dt;
        if (a.y < -4) {
          a.y = worldH + 4;
          a.x = Math.random() * worldW;
        }
      } else {
        a.x += Math.cos(a.phase * 0.8) * 9 * dt;
        a.y += Math.sin(a.phase * 1.1) * 7 * dt;
        a.x = (a.x + worldW) % Math.max(1, worldW);
        a.y = (a.y + worldH) % Math.max(1, worldH);
      }
    });
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    // Ambient particles
    this.ambient.forEach((a) => {
      const sx = Math.round(a.x - camX);
      const sy = Math.round(a.y - camY);
      const pulse = 0.5 + 0.5 * Math.sin(timeSec * 3 + a.phase);
      ctx.fillStyle = a.typeIdx === 0 ? COLORS.gold_bright : a.typeIdx === 1 ? COLORS.coral : COLORS.sky_teal;
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1, a.size * (0.7 + 0.4 * pulse)), 0, Math.PI * 2);
      ctx.fill();
    });

    // Dynamic particles
    this.particles.forEach((p) => {
      const ratio = Math.max(0, p.life / p.maxLife);
      const r = Math.max(1, p.size * ratio);
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}
