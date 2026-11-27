/**
 * Player Controller & Physics Engine
 */

import { AudioManager } from "./audio.js";
import { ParticleSystem } from "./particles.js";
import { Level } from "./level.js";
import { GameProgress } from "./save.js";
import {
  AIR_ACCEL,
  AIR_DECEL,
  BASE_MOVE_SPEED,
  BOUNCE_PAD_VELOCITY,
  COLORS,
  COYOTE_TIME,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  DOUBLE_JUMP_VELOCITY,
  GLIDE_FALL_SPEED,
  GRAVITY,
  JUMP_BUFFER_TIME,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  MOVE_ACCEL,
  MOVE_DECEL,
  SPEED_BOOST_MULT
} from "./settings.js";

export class Player {
  public width = 10.0;
  public height = 14.0;
  public x = 0.0;
  public y = 0.0;
  public vx = 0.0;
  public vy = 0.0;
  public facing = 1;
  public onGround = false;

  public coyoteTimer = 0.0;
  public jumpBufferTimer = 0.0;
  public airJumpsLeft = 0;

  public dashTimer = 0.0;
  public dashCooldownTimer = 0.0;
  public dashDir = 1;

  public lastSafePos = { x: 0, y: 0 };
  public respawnFlash = 0.0;

  public scaleX = 1.0;
  public scaleY = 1.0;
  public walkCycle = 0.0;

  public isGliding = false;
  private trailTimer = 0.0;
  private blinkTimer = 2.5;

  constructor(x: number, y: number) {
    this.placeAt(x, y);
  }

  public placeAt(x: number, y: number): void {
    this.x = x - this.width / 2;
    this.y = y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.lastSafePos = { x: this.x, y: this.y };
  }

  public get center(): [number, number] {
    return [this.x + this.width / 2, this.y + this.height / 2];
  }

  public triggerJump(audio: AudioManager, particles: ParticleSystem): void {
    this.vy = JUMP_VELOCITY;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.scaleX = 0.76;
    this.scaleY = 1.28;
    audio.play("jump");
    particles.spawnDust(this.x + this.width / 2, this.y + this.height);
  }

  public triggerDoubleJump(audio: AudioManager, particles: ParticleSystem): void {
    this.vy = DOUBLE_JUMP_VELOCITY;
    this.airJumpsLeft--;
    this.jumpBufferTimer = 0;
    this.scaleX = 0.78;
    this.scaleY = 1.24;
    audio.play("double_jump");
    particles.spawnBurst(this.x + this.width / 2, this.y + this.height, COLORS.cream, 7, 45);
  }

  public triggerDash(progress: GameProgress, audio: AudioManager, particles: ParticleSystem): void {
    if (progress.isEquipped("breeze_dash") && this.dashCooldownTimer <= 0 && this.dashTimer <= 0) {
      this.dashTimer = DASH_DURATION;
      this.dashCooldownTimer = DASH_COOLDOWN;
      this.dashDir = this.facing;
      this.vy = 0;
      this.scaleX = 1.32;
      this.scaleY = 0.74;
      audio.play("dash");
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.sky_teal, 8, 55);
    }
  }

  public update(
    dt: number,
    keys: Record<string, boolean>,
    level: Level,
    progress: GameProgress,
    audio: AudioManager,
    particles: ParticleSystem
  ): void {
    let moveDir = 0;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) moveDir -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) moveDir += 1;

    if (moveDir !== 0 && this.dashTimer <= 0) {
      this.facing = moveDir;
    }

    if (this.coyoteTimer > 0) this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.dashCooldownTimer > 0) this.dashCooldownTimer = Math.max(0, this.dashCooldownTimer - dt);
    if (this.respawnFlash > 0) this.respawnFlash = Math.max(0, this.respawnFlash - dt);

    const maxSpeed = BASE_MOVE_SPEED * (progress.isEquipped("clover_boots") ? SPEED_BOOST_MULT : 1.0);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * DASH_SPEED;
      this.vy = 0;
      this.isGliding = false;
      particles.spawnTrail(this.x + this.width / 2, this.y + this.height / 2, "dash");
    } else {
      let accel = this.onGround ? MOVE_ACCEL : AIR_ACCEL;
      let decel = this.onGround ? MOVE_DECEL : AIR_DECEL;
      if (progress.isEquipped("clover_boots")) accel *= 1.2;

      if (moveDir !== 0) {
        const targetVx = moveDir * maxSpeed;
        if (this.vx < targetVx) this.vx = Math.min(targetVx, this.vx + accel * dt);
        else if (this.vx > targetVx) this.vx = Math.max(targetVx, this.vx - accel * dt);
      } else {
        if (this.vx > 0) this.vx = Math.max(0, this.vx - decel * dt);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel * dt);
      }

      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);

      const holdingJump = !!(keys[" "] || keys["w"] || keys["W"] || keys["ArrowUp"] || keys["z"] || keys["Z"]);
      if (progress.isEquipped("glide_leaf") && holdingJump && !this.onGround && this.vy > GLIDE_FALL_SPEED) {
        this.vy = GLIDE_FALL_SPEED;
        this.isGliding = true;
      } else {
        this.isGliding = false;
      }
    }

    if (this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.triggerJump(audio, particles);
    }

    // Move X
    this.x += this.vx * dt;
    this.x = Math.max(0, Math.min(level.pixelW - this.width, this.x));
    const solidRects = level.getSolidRectsNear(this.x, this.y, this.width, this.height);

    solidRects.forEach((tile) => {
      if (this.intersects(tile)) {
        if (this.vx > 0) this.x = tile.x - this.width;
        else if (this.vx < 0) this.x = tile.x + tile.w;
        this.vx = 0;
      }
    });

    // Move Y
    const wasOnGround = this.onGround;
    const prevBottom = this.y + this.height;
    this.y += this.vy * dt;
    this.onGround = false;

    solidRects.forEach((tile) => {
      if (this.intersects(tile)) {
        if (this.vy > 0) {
          this.y = tile.y - this.height;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = tile.y + tile.h;
          this.vy = 0;
        }
      }
    });

    if (this.vy >= 0) {
      const onewayRects = level.getOnewayRectsNear(this.x, this.y, this.width, this.height);
      onewayRects.forEach((plat) => {
        if (this.intersects(plat) && prevBottom <= plat.y + 3) {
          this.y = plat.y - this.height;
          this.vy = 0;
          this.onGround = true;
        }
      });
    }

    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.airJumpsLeft = progress.isEquipped("feather_badge") ? 1 : 0;
      this.isGliding = false;
      if (!wasOnGround) {
        this.scaleX = 1.24;
        this.scaleY = 0.78;
        audio.play("land");
        particles.spawnDust(this.x + this.width / 2, this.y + this.height);
      }
      if (level.isSafeLedge(this.x, this.y, this.width, this.height)) {
        this.lastSafePos = { x: this.x, y: this.y };
      }
    } else if (wasOnGround && this.vy >= 0) {
      this.coyoteTimer = COYOTE_TIME;
    }

    level.bouncePads.forEach((pad) => {
      const padRect = { x: pad.x + 1, y: pad.y + 6, w: 14, h: 10 };
      if (this.intersects(padRect) && this.vy >= -40) {
        this.vy = BOUNCE_PAD_VELOCITY;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.airJumpsLeft = progress.isEquipped("feather_badge") ? 1 : 0;
        this.scaleX = 0.72;
        this.scaleY = 1.34;
        pad.trigger();
        audio.play("bounce");
        particles.spawnBurst(pad.x + 8, pad.y + 6, COLORS.coral, 8, 50);
      }
    });

    if (level.hitsHazard(this.x, this.y, this.width, this.height) || this.y > level.pixelH + 18) {
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.sky_teal, 12, 60);
      this.x = this.lastSafePos.x;
      this.y = this.lastSafePos.y;
      this.vx = 0;
      this.vy = 0;
      this.dashTimer = 0;
      this.isGliding = false;
      this.respawnFlash = 0.45;
      audio.play("respawn");
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.cream, 10, 45);
    }

    const activeTrail = progress.equipped_badges.find((b) => b.endsWith("_trail"));
    if (activeTrail && (Math.abs(this.vx) > 25 || Math.abs(this.vy) > 35)) {
      this.trailTimer += dt;
      if (this.trailTimer >= 0.055) {
        this.trailTimer = 0;
        particles.spawnTrail(this.x + this.width / 2, this.y + this.height - 2, activeTrail);
      }
    }
    if (progress.isEquipped("festival_crown") && Math.random() < dt * 7) {
      particles.spawnTrail(this.x + this.width / 2, this.y + 1, "festival_crown");
    }

    if (this.onGround && Math.abs(this.vx) > 12) this.walkCycle += dt * Math.abs(this.vx) * 0.14;
    else this.walkCycle = 0;

    this.blinkTimer -= dt;
    if (this.blinkTimer <= -0.12) this.blinkTimer = 2.8;

    this.scaleX += (1.0 - this.scaleX) * dt * 14.0;
    this.scaleY += (1.0 - this.scaleY) * dt * 14.0;
  }

  private intersects(rect: { x: number; y: number; w: number; h: number }): boolean {
    return this.x < rect.x + rect.w && this.x + this.width > rect.x && this.y < rect.y + rect.h && this.y + this.height > rect.y;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, progress?: GameProgress, timeSec = 0): void {
    if (this.respawnFlash > 0 && Math.floor(this.respawnFlash * 20) % 2 === 0) return;

    const cx = Math.round(this.x + this.width / 2 - camX);
    const bottomY = Math.round(this.y + this.height - camY);
    const w = Math.max(6, Math.round(12 * this.scaleX));
    const h = Math.max(8, Math.round(15 * this.scaleY));
    const x = cx - Math.floor(w / 2);
    const y = bottomY - h;

    if (this.onGround) {
      ctx.fillStyle = "rgba(24,18,22,0.45)";
      ctx.fillRect(cx - 5, bottomY - 1, 10, 2);
    }

    if (this.isGliding) {
      ctx.fillStyle = COLORS.coral;
      ctx.beginPath();
      ctx.ellipse(cx, y - 4, 9, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.wood_dark;
      ctx.fillRect(cx - 1, y - 3, 2, 5);
    }

    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(cx - this.facing * 4, y + Math.floor(h / 2), 4, 2);

    ctx.fillStyle = COLORS.sage;
    ctx.fillRect(x + 1, y + 5, w - 2, h - 5);
    const footOff = this.onGround && Math.abs(this.vx) > 12 ? Math.round(Math.sin(this.walkCycle)) : 0;
    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(cx - 3, bottomY - 2 + Math.max(0, footOff), 2, 2);
    ctx.fillRect(cx + 1, bottomY - 2 + Math.max(0, -footOff), 2, 2);

    ctx.fillStyle = COLORS.moss;
    ctx.fillRect(x, y + 1, w, Math.max(7, Math.floor(h / 2 + 1)));
    ctx.fillStyle = COLORS.moss_light;
    ctx.fillRect(cx, y - 1, 2, 2);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(cx + (this.facing > 0 ? 1 : -4), y + 4, 5, 4);
    if (this.blinkTimer > 0) {
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(cx + (this.facing > 0 ? 2 : -3), y + 5, 2, 2);
    }

    if (progress?.isEquipped("festival_crown")) {
      ctx.strokeStyle = COLORS.gold_bright;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, y - 2 + Math.sin(timeSec * 4), 5, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
