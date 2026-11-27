/**
 * Player Controller & Physics Engine
 */

import { AudioManager } from "./audio.js";
import { ParticleSystem } from "./particles.js";
import { Level } from "./level.js";
import { GameProgress } from "./save.js";
import { MovingPlatform } from "./entities.js";
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
  SLAM_VELOCITY,
  SPEED_BOOST_MULT,
  WALL_JUMP_VX,
  WALL_JUMP_VY,
  WALL_SLIDE_SPEED
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
  public isSlamming = false;
  public isWallSliding = false;
  public bubbleReady = false;
  public invulnTimer = 0.0;

  private wallDir: -1 | 0 | 1 = 0;
  private wallCoyote = 0.0;
  private wallJumpLock = 0.0;
  private ridingPlatform: MovingPlatform | null = null;
  private trailTimer = 0.0;
  private blinkTimer = 2.5;

  private ghosts: Array<{ x: number; y: number; scaleX: number; scaleY: number; life: number }> = [];
  private ghostTimer = 0.0;

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

  public maxAirJumps(progress: GameProgress): number {
    return (progress.isEquipped("feather_badge") ? 1 : 0) + (progress.isEquipped("trial_wing") ? 1 : 0);
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
      this.isSlamming = false;
      this.scaleX = 1.32;
      this.scaleY = 0.74;
      audio.play("dash");
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.sky_teal, 8, 55);
    }
  }

  public triggerSlam(progress: GameProgress, audio: AudioManager, particles: ParticleSystem): void {
    if (!progress.isEquipped("acorn_slam") || this.onGround || this.isSlamming) return;
    this.isSlamming = true;
    this.dashTimer = 0;
    this.isGliding = false;
    this.vx = 0;
    this.vy = SLAM_VELOCITY;
    this.scaleX = 0.72;
    this.scaleY = 1.32;
    audio.play("slam");
    particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.gold, 7, 45);
  }

  public tryWallJump(progress: GameProgress, audio: AudioManager, particles: ParticleSystem): boolean {
    if (!progress.isEquipped("moss_claws") || this.onGround || (this.wallDir === 0 && this.wallCoyote <= 0)) return false;
    const dir = this.wallDir !== 0 ? this.wallDir : this.facing;
    this.vy = WALL_JUMP_VY;
    this.vx = -dir * WALL_JUMP_VX;
    this.facing = -dir;
    this.wallCoyote = 0;
    this.wallJumpLock = 0.13;
    this.isSlamming = false;
    this.scaleX = 0.76;
    this.scaleY = 1.28;
    audio.play("jump");
    particles.spawnDust(this.x + (dir > 0 ? this.width : 0), this.y + this.height / 2, 6);
    return true;
  }

  public hitHazardOrCritter(progress: GameProgress, audio: AudioManager, particles: ParticleSystem, knockDir = 0): void {
    if (this.invulnTimer > 0) return;
    if (progress.isEquipped("bubble_shield") && this.bubbleReady) {
      this.bubbleReady = false;
      this.invulnTimer = 1.1;
      this.vy = -255;
      this.vx = knockDir * 95;
      this.isSlamming = false;
      this.airJumpsLeft = this.maxAirJumps(progress);
      this.dashCooldownTimer = 0;
      audio.play("bubble");
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.sky_teal, 14, 70);
      return;
    }
    if (knockDir !== 0) {
      this.invulnTimer = 0.85;
      this.vy = -145;
      this.vx = knockDir * 125;
      audio.play("respawn");
      particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.cream, 8, 45);
      return;
    }
    particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.sky_teal, 12, 60);
    this.x = this.lastSafePos.x;
    this.y = this.lastSafePos.y;
    this.vx = 0;
    this.vy = 0;
    this.dashTimer = 0;
    this.isSlamming = false;
    this.respawnFlash = 0.45;
    audio.play("respawn");
    particles.spawnBurst(this.x + this.width / 2, this.y + this.height / 2, COLORS.cream, 10, 45);
  }

  public update(
    dt: number,
    keys: Record<string, boolean>,
    level: Level,
    progress: GameProgress,
    audio: AudioManager,
    particles: ParticleSystem
  ): void {
    if (this.ridingPlatform && this.onGround) {
      this.x += this.ridingPlatform.dx;
      this.y += this.ridingPlatform.dy;
    }
    this.ridingPlatform = null;

    this.ghosts.forEach((g) => (g.life -= dt));
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
    if (this.dashTimer > 0) {
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0) {
        this.ghostTimer = 0.026;
        this.ghosts.push({ x: this.x, y: this.y, scaleX: this.scaleX, scaleY: this.scaleY, life: 0.16 });
      }
    }

    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.wallCoyote > 0) this.wallCoyote = Math.max(0, this.wallCoyote - dt);
    if (this.wallJumpLock > 0) this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);

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
      this.isSlamming = false;
      particles.spawnTrail(this.x + this.width / 2, this.y + this.height / 2, "dash");
    } else if (this.isSlamming) {
      this.vx = 0;
      this.vy = SLAM_VELOCITY;
      particles.spawnTrail(this.x + this.width / 2, this.y + this.height / 2, "sparkle_trail");
    } else if (this.wallJumpLock > 0) {
      this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);
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
    const solidRects = [
      ...level.getSolidRectsNear(this.x, this.y, this.width, this.height),
      ...level.breakBlocks.filter((b) => !b.broken).map((b) => ({ x: b.x, y: b.y, w: b.w, h: b.h }))
    ];

    solidRects.forEach((tile) => {
      if (this.intersects(tile)) {
        if (this.vx > 0) this.x = tile.x - this.width;
        else if (this.vx < 0) this.x = tile.x + tile.w;
        this.vx = 0;
      }
    });

    level.breakBlocks.forEach((b) => {
      if (b.broken) return;
      const expanded = { x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 };
      if ((this.dashTimer > 0 || this.isSlamming) && this.intersects(expanded)) {
        b.broken = true;
        if (!progress.broken_blocks.includes(b.uid)) {
          progress.broken_blocks.push(b.uid);
          progress.gems += 3;
          progress.save();
        }
        if (this.isSlamming) {
          this.vy = -170;
          this.isSlamming = false;
        }
        audio.play("smash");
        particles.spawnBurst(b.x + 8, b.y + 8, COLORS.gold_bright, 14, 75);
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
      level.crumbleTiles.forEach((c) => {
        if (c.state !== "gone" && this.intersects(c) && prevBottom <= c.y + 3) {
          this.y = c.y - this.height;
          this.vy = 0;
          this.onGround = true;
          if (c.trigger()) audio.play("crumble");
        }
      });
      level.platforms.forEach((p) => {
        const rect = { x: p.x, y: p.y, w: p.w, h: 6 };
        if (this.intersects(rect) && prevBottom <= p.y + 4 + Math.max(0, p.dy)) {
          this.y = p.y - this.height;
          this.vy = 0;
          this.onGround = true;
          this.ridingPlatform = p;
        }
      });
    }

    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.airJumpsLeft = this.maxAirJumps(progress);
      this.isGliding = false;
      this.bubbleReady = true;
      if (this.isSlamming) {
        this.isSlamming = false;
        this.scaleX = 1.42;
        this.scaleY = 0.65;
        audio.play("slam");
        particles.spawnDust(this.x + this.width / 2, this.y + this.height, 10);
      } else if (!wasOnGround) {
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

    // Wall slide & Wall probe
    this.wallDir = 0;
    this.isWallSliding = false;
    if (!this.onGround && progress.isEquipped("moss_claws") && !this.isSlamming) {
      const probeR = { x: this.x + this.width, y: this.y + 2, w: 1.5, h: this.height - 4 };
      const probeL = { x: this.x - 1.5, y: this.y + 2, w: 1.5, h: this.height - 4 };
      if (solidRects.some((r) => probeR.x < r.x + r.w && probeR.x + probeR.w > r.x && probeR.y < r.y + r.h && probeR.y + probeR.h > r.y)) {
        this.wallDir = 1;
      } else if (solidRects.some((r) => probeL.x < r.x + r.w && probeL.x + probeL.w > r.x && probeL.y < r.y + r.h && probeL.y + probeL.h > r.y)) {
        this.wallDir = -1;
      }
      if (this.wallDir !== 0) {
        this.wallCoyote = 0.1;
        if (moveDir === this.wallDir && this.vy > WALL_SLIDE_SPEED) {
          this.vy = WALL_SLIDE_SPEED;
          this.isWallSliding = true;
          if (Math.random() < dt * 12) {
            particles.spawnDust(this.x + (this.wallDir > 0 ? this.width : 0), this.y + 8, 1);
          }
        }
      }
    }

    if (level.hitsUpdraft(this.x, this.y, this.width, this.height) && !this.isSlamming) {
      const lift = this.isGliding ? 1680 : 1080;
      const maxLift = this.isGliding ? -185 : -125;
      this.vy = Math.max(maxLift, this.vy - lift * dt);
    }

    level.bouncePads.forEach((pad) => {
      const padRect = { x: pad.x + 1, y: pad.y + 6, w: 14, h: 10 };
      if (this.intersects(padRect) && this.vy >= -40) {
        const mult = this.isSlamming ? 1.32 : 1.0;
        this.vy = BOUNCE_PAD_VELOCITY * mult;
        this.onGround = false;
        this.coyoteTimer = 0;
        this.airJumpsLeft = this.maxAirJumps(progress);
        this.isSlamming = false;
        this.scaleX = 0.72;
        this.scaleY = 1.34;
        pad.trigger();
        audio.play("bounce");
        particles.spawnBurst(pad.x + 8, pad.y + 6, COLORS.coral, 8, 50);
      }
    });

    level.critters.forEach((crit) => {
      const critRect = { x: crit.x - 6, y: crit.y - 10, w: 12, h: 10 };
      if (this.intersects(critRect)) {
        if (this.vy > 0 && this.y + this.height - this.vy * dt <= critRect.y + 4) {
          this.vy = -230;
          this.airJumpsLeft = this.maxAirJumps(progress);
          crit.stunTimer = 1.5;
          audio.play("stomp");
          particles.spawnBurst(crit.x, crit.y - 5, COLORS.gold_bright, 8, 40);
          progress.gems += 1;
        } else {
          const knockDir = this.x < crit.x ? -1 : 1;
          this.hitHazardOrCritter(progress, audio, particles, knockDir);
        }
      }
    });

    if (level.hitsHazard(this.x, this.y, this.width, this.height) || this.y > level.pixelH + 18) {
      this.hitHazardOrCritter(progress, audio, particles, 0);
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
    this.ghosts.forEach((g) => {
      ctx.globalAlpha = (g.life / 0.16) * 0.42;
      const gcx = Math.round(g.x + this.width / 2 - camX), gby = Math.round(g.y + this.height - camY);
      const gw = Math.round(12 * g.scaleX), gh = Math.round(15 * g.scaleY);
      ctx.fillStyle = COLORS.sky_teal;
      ctx.fillRect(gcx - Math.floor(gw / 2), gby - gh, gw, gh);
    });
    ctx.globalAlpha = 1;

    if (this.respawnFlash > 0 && Math.floor(this.respawnFlash * 20) % 2 === 0) return;

    const cx = Math.round(this.x + this.width / 2 - camX);
    const bottomY = Math.round(this.y + this.height - camY);
    const w = Math.max(8, Math.round(12 * this.scaleX));
    const h = Math.max(10, Math.round(15 * this.scaleY));
    const x = cx - Math.floor(w / 2);
    const y = bottomY - h;

    if (this.onGround) {
      ctx.fillStyle = "rgba(24, 18, 22, 0.28)";
      ctx.fillRect(cx - 4, bottomY, 8, 1);
      ctx.fillRect(cx - 3, bottomY + 1, 6, 1);
    }

    if (this.isGliding) {
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.ellipse(cx, y - 4, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.coral; ctx.beginPath(); ctx.ellipse(cx, y - 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.gold_bright; ctx.fillRect(cx - 5, y - 4, 10, 1);
      ctx.fillStyle = COLORS.wood_dark; ctx.fillRect(cx - 1, y - 3, 2, 5);
    }

    const wave = Math.round(Math.sin(this.walkCycle + timeSec * 5) * 1.4);
    ctx.fillStyle = COLORS.berry;
    ctx.fillRect(cx - this.facing * 5, y + Math.floor(h / 2) + wave, 3, 2);
    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(cx - this.facing * 3, y + Math.floor(h / 2), 4, 2);

    // Boots (drawn cleanly under cloak hem)
    const footOff = this.onGround && Math.abs(this.vx) > 12 ? Math.round(Math.sin(this.walkCycle)) : 0;
    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(cx - 3, bottomY - 2 + Math.max(0, footOff), 2, 2);
    ctx.fillRect(cx + 1, bottomY - 2 + Math.max(0, -footOff), 2, 2);

    // Outlined Cloak (stops 2px above bottomY so boots stay distinct)
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(x, y + 5, w, Math.max(4, h - 7));
    ctx.fillStyle = COLORS.sage; ctx.fillRect(x + 1, y + 5, w - 2, Math.max(3, h - 8));
    ctx.fillStyle = "#5c8874"; ctx.fillRect(x + 1, bottomY - 4, w - 2, 1);

    // Outlined Hood & sunlit highlight
    const headH = Math.max(7, Math.floor(h / 2 + 1));
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(x - 1, y, w + 2, headH + 2);
    ctx.fillStyle = COLORS.moss; ctx.fillRect(x, y + 1, w, headH);
    ctx.fillStyle = COLORS.moss_light; ctx.fillRect(x + 1, y + 1, w - 2, 2);

    const lean = Math.sign(this.vx) * -1;
    ctx.fillStyle = COLORS.moss; ctx.fillRect(cx, y - 2, 1, 3);
    ctx.fillStyle = COLORS.moss_light;
    ctx.fillRect(cx - 2 + lean, y - 3, 2, 2);
    ctx.fillRect(cx + 1 + lean, y - 4, 2, 2);

    ctx.fillStyle = COLORS.cream; ctx.fillRect(cx + (this.facing > 0 ? 1 : -4), y + 4, 5, 4);
    ctx.fillStyle = "#f2a094"; ctx.fillRect(cx + (this.facing > 0 ? 1 : -2), y + 7, 1, 1);
    if (this.blinkTimer > 0) {
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(cx + (this.facing > 0 ? 3 : -3), y + 5, 2, 2);
    }

    if (progress?.isEquipped("bubble_shield") && this.bubbleReady) {
      ctx.strokeStyle = "rgba(128, 232, 236, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, bottomY - h / 2, 10.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(cx, bottomY - h / 2, 8.5, -2.4, -1.5);
      ctx.stroke();
    }

    if (progress?.isEquipped("festival_crown")) {
      ctx.strokeStyle = COLORS.gold_bright;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, y - 4 + Math.sin(timeSec * 4), 5, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
