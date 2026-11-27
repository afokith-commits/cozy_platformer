/**
 * Sproutbound — Main Game Controller, Loop & Input Coordinator
 */

import { AudioManager } from "./audio.js";
import { LEVELS_DATA } from "./data.js";
import { ParticleSystem } from "./particles.js";
import { Level } from "./level.js";
import { Player } from "./player.js";
import { GameProgress } from "./save.js";
import { CANVAS_H, CANVAS_W, COLORS, GEM_MAGNET_RADIUS, INTERACT_RADIUS, MAX_DT, UI_SCALE } from "./settings.js";
import { UICallbacks, UIOverlay } from "./ui.js";

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio = new AudioManager();
  private progress = new GameProgress();
  private particles = new ParticleSystem();
  private ui = new UIOverlay();
  private level: Level;
  private player: Player;

  private keys: Record<string, boolean> = {};
  private lastTime = 0;
  private timeSec = 0;
  private irisPhase: "idle" | "closing" | "opening" = "idle";
  private irisT = 0;
  private pendingWarp: { levelId: string; spawnId: string } | null = null;

  private uiCallbacks: UICallbacks = {
    onFastTravel: (levelId, spawnId) => this.startWarp(levelId, spawnId),
    onVolumeChange: (kind, value) => {
      if (kind === "music") { this.progress.music_volume = value; this.audio.setMusicVolume(value); }
      else { this.progress.sfx_volume = value; this.audio.setSfxVolume(value); }
      this.progress.save();
    },
    onResetSave: () => {
      this.progress.reset();
      this.changeLevel(this.progress.current_level, this.progress.spawn_id);
      this.ui.notify("Started Fresh Adventure");
    },
    onPlaySfx: (name) => this.audio.play(name)
  };

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    this.audio.setSfxVolume(this.progress.sfx_volume);
    this.audio.setMusicVolume(this.progress.music_volume);

    this.level = new Level(LEVELS_DATA[this.progress.current_level] || LEVELS_DATA.meadow_hub);
    this.level.syncProgress(this.progress);
    this.particles.seedAmbient(this.level.pixelW, this.level.pixelH, this.level.ambientType);

    const spawn = this.level.spawns[this.progress.spawn_id] || this.level.spawns.start || [64, 128];
    this.player = new Player(spawn[0], spawn[1]);
    this.level.updateCamera(this.player.x, this.player.y, this.player.facing, 1.0);

    this.setupInputs();
    requestAnimationFrame(this.loop);
  }

  private canvasCoords(e: MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * (CANVAS_W / r.width), (e.clientY - r.top) * (CANVAS_H / r.height)];
  }

  private setupInputs(): void {
    window.addEventListener("keydown", (e) => {
      this.audio.startMusic();
      this.keys[e.key] = true;
      if (e.repeat || this.irisPhase !== "idle") return;
      if (["Tab", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      if (this.ui.handleKeyDown(e.key, this.progress, this.uiCallbacks)) return;

      if (e.key === "Tab" || e.key === "i" || e.key === "I") this.ui.toggleModal("inventory", this.progress, (n) => this.audio.play(n));
      else if (e.key === "m" || e.key === "M") this.ui.toggleModal("map", this.progress, (n) => this.audio.play(n));
      else if (e.key === "j" || e.key === "J") this.ui.toggleModal("journal", this.progress, (n) => this.audio.play(n));
      else if (e.key === "Escape") this.ui.toggleModal("pause", this.progress, (n) => this.audio.play(n));
      else if (e.key === " " || e.key === "w" || e.key === "W" || e.key === "ArrowUp" || e.key === "z" || e.key === "Z") {
        this.player.jumpBufferTimer = 0.11;
        if (!this.player.onGround && this.player.coyoteTimer <= 0 && this.player.airJumpsLeft > 0) {
          this.player.triggerDoubleJump(this.audio, this.particles);
        }
      } else if (e.key === "Shift" || e.key === "x" || e.key === "X" || e.key === "k" || e.key === "K") {
        this.player.triggerDash(this.progress, this.audio, this.particles);
      } else if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        this.handleInteraction();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
      if ((e.key === " " || e.key === "w" || e.key === "W" || e.key === "ArrowUp" || e.key === "z" || e.key === "Z") && this.player.vy < 0) {
        this.player.vy *= 0.48;
      }
    });

    this.canvas.addEventListener("mousedown", (e) => {
      this.audio.startMusic();
      const [mx, my] = this.canvasCoords(e);
      this.ui.handlePointerDown(mx, my, this.progress, this.uiCallbacks);
    });
    window.addEventListener("mousemove", (e) => {
      const [mx, my] = this.canvasCoords(e);
      this.ui.handlePointerMove(mx, my, this.uiCallbacks, this.canvas);
    });
    window.addEventListener("mouseup", () => this.ui.handlePointerUp());
  }

  private getNearestInteractable() {
    const px = this.player.x + this.player.width / 2, py = this.player.y + this.player.height / 2;
    const all = [...this.level.npcs, ...this.level.shrines, ...this.level.portals, ...this.level.signs];
    let best: (typeof all)[number] | null = null;
    let bestDist = INTERACT_RADIUS;
    for (const obj of all) {
      const d = Math.hypot(px - obj.x, py - (obj.y - 8));
      if (d < bestDist) { bestDist = d; best = obj; }
    }
    return best;
  }

  private handleInteraction(): void {
    const px = this.player.x + this.player.width / 2, py = this.player.y + this.player.height / 2;

    for (const npc of this.level.npcs) {
      if (Math.hypot(px - npc.x, py - (npc.y - 8)) < INTERACT_RADIUS) {
        this.audio.play("blip");
        this.ui.startDialogue(npc.dialogue_id, npc.name, npc.style, this.progress, (n) => this.audio.play(n));
        return;
      }
    }
    for (const sign of this.level.signs) {
      if (Math.hypot(px - sign.x, py - (sign.y - 6)) < INTERACT_RADIUS) {
        this.audio.play("blip");
        this.ui.startSign(sign.text);
        return;
      }
    }
    for (const shrine of this.level.shrines) {
      if (Math.hypot(px - shrine.x, py - (shrine.y - 10)) < INTERACT_RADIUS) {
        if (!shrine.attuned) {
          shrine.attuned = true;
          shrine.prompt_label = "Fast Travel";
          if (!this.progress.unlocked_shrines.includes(shrine.shrine_id)) {
            this.progress.unlocked_shrines.push(shrine.shrine_id);
            this.progress.save();
          }
          this.audio.play("shrine");
          this.ui.notify(`Shrine Attuned: ${shrine.name}`);
          this.particles.spawnBurst(shrine.x, shrine.y - 12, "#ffe47a", 16, 60);
        } else {
          this.ui.toggleModal("map", this.progress, (n) => this.audio.play(n));
        }
        return;
      }
    }
    for (const portal of this.level.portals) {
      if (Math.hypot(px - portal.x, py - (portal.y - 10)) < INTERACT_RADIUS) {
        this.startWarp(portal.target_level, portal.target_spawn);
        return;
      }
    }
  }

  private startWarp(levelId: string, spawnId: string): void {
    if (!LEVELS_DATA[levelId] || this.irisPhase !== "idle") return;
    this.audio.play("warp");
    this.pendingWarp = { levelId, spawnId };
    this.irisPhase = "closing";
    this.irisT = 0;
  }

  private changeLevel(levelId: string, spawnId: string): void {
    if (!LEVELS_DATA[levelId]) return;
    this.progress.current_level = levelId;
    this.progress.spawn_id = spawnId;
    this.progress.save();

    this.level = new Level(LEVELS_DATA[levelId]);
    this.level.syncProgress(this.progress);
    const spawn = this.level.spawns[spawnId] || this.level.spawns.start || [64, 128];
    this.player.placeAt(spawn[0], spawn[1]);
    this.level.camX = Math.max(0, Math.min(this.level.pixelW - 480, this.player.x - 240));
    this.level.camY = Math.max(0, Math.min(this.level.pixelH - 270, this.player.y - 135));
    this.particles.clear();
    this.particles.seedAmbient(this.level.pixelW, this.level.pixelH, this.level.ambientType);
    this.ui.notify(`Arrived at ${this.level.name}`);
  }

  private loop = (timestamp: number) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(MAX_DT, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;
    this.timeSec += dt;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.ui.update(dt, this.progress, (n) => this.audio.play(n));

    if (this.irisPhase !== "idle") {
      this.irisT += dt / 0.30;
      if (this.irisT >= 1) {
        if (this.irisPhase === "closing") {
          if (this.pendingWarp) {
            this.changeLevel(this.pendingWarp.levelId, this.pendingWarp.spawnId);
            this.pendingWarp = null;
          }
          this.irisPhase = "opening";
          this.irisT = 0;
        } else {
          this.irisPhase = "idle";
          this.irisT = 0;
        }
      }
      return;
    }

    if (this.ui.isModalOpen) return;

    this.player.update(dt, this.keys, this.level, this.progress, this.audio, this.particles);
    const px = this.player.x + this.player.width / 2, py = this.player.y + this.player.height / 2;

    this.level.updateEntities(dt, this.timeSec, px);
    this.level.updateCamera(this.player.x, this.player.y, this.player.facing, dt);
    this.particles.update(dt, this.level.pixelW, this.level.pixelH);

    const hasMagnet = this.progress.isEquipped("magnet_charm");
    this.level.gems.forEach((g) => {
      if (g.collected) return;
      if (hasMagnet) {
        const dx = px - g.x, dy = py - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist < GEM_MAGNET_RADIUS) {
          g.x += (dx / dist) * 140 * dt;
          g.base_y += (dy / dist) * 140 * dt;
          g.y = g.base_y;
        }
      }
      if (Math.hypot(px - g.x, py - g.y) < 16) {
        g.collected = true;
        this.progress.gems += g.value;
        if (!this.progress.collected_gems.includes(g.uid)) this.progress.collected_gems.push(g.uid);
        this.progress.save();
        this.audio.play("gem");
        this.particles.spawnBurst(g.x, g.y, g.value >= 5 ? "#ffe47a" : "#6dbfc2", 8, 45);
        if (g.value >= 5) this.ui.notify("+5 Star Gem!");
      }
    });

    this.level.trinkets.forEach((t) => {
      if (!t.collected && Math.hypot(px - t.x, py - t.y) < 18) {
        t.collected = true;
        if (!this.progress.trinkets.includes(t.trinket_id)) this.progress.trinkets.push(t.trinket_id);
        this.progress.save();
        this.audio.play("trinket");
        this.ui.notify(`Found Trinket: ${t.name}!`);
        this.particles.spawnBurst(t.x, t.y, "#ffe47a", 16, 75);
      }
    });
  }

  private render(): void {
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.ctx.save();
    this.ctx.scale(UI_SCALE, UI_SCALE);
    this.level.render(this.ctx, this.timeSec);
    this.player.render(this.ctx, this.level.camX, this.level.camY, this.progress, this.timeSec);
    this.particles.render(this.ctx, this.level.camX, this.level.camY, this.timeSec);
    this.ctx.restore();

    this.ui.render(this.ctx, this.progress, this.level, this.player, this.getNearestInteractable(), this.timeSec, this.uiCallbacks);

    if (this.irisPhase !== "idle") {
      const maxR = Math.hypot(CANVAS_W, CANVAS_H) * 0.55;
      const p = Math.min(1, this.irisT);
      const radius = this.irisPhase === "closing" ? maxR * (1 - p ** 3) : maxR * (1 - (1 - p) ** 3);
      this.ctx.fillStyle = COLORS.espresso;
      this.ctx.beginPath();
      this.ctx.rect(0, 0, CANVAS_W, CANVAS_H);
      this.ctx.arc(CANVAS_W / 2, CANVAS_H / 2, Math.max(0, radius), 0, Math.PI * 2, true);
      this.ctx.fill("evenodd");
    }
  }
}

const boot = () => new Game("gameCanvas");
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
