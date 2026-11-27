/**
 * Master Game Loop & Controller Orchestrator
 */

import { AudioManager } from "./audio.js";
import { LEVELS_DATA } from "./data.js";
import { ParticleSystem } from "./particles.js";
import { Level } from "./level.js";
import { Player } from "./player.js";
import { GameProgress } from "./save.js";
import { CANVAS_H, CANVAS_W, MAX_DT, UI_SCALE } from "./settings.js";
import { UIOverlay } from "./ui.js";

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audio: AudioManager;
  private progress: GameProgress;
  private particles: ParticleSystem;
  private level: Level;
  private player: Player;
  private ui: UIOverlay;

  private keys: Record<string, boolean> = {};
  private lastTime = 0;
  private timeSec = 0;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    this.audio = new AudioManager();
    this.progress = new GameProgress();
    this.particles = new ParticleSystem();
    this.ui = new UIOverlay();

    this.level = new Level(LEVELS_DATA[this.progress.current_level] || LEVELS_DATA.meadow_hub);
    this.level.syncProgress(this.progress);

    const spawn = this.level.spawns[this.progress.spawn_id] || this.level.spawns.start || [64, 128];
    this.player = new Player(spawn[0], spawn[1]);

    this.setupInputs();
    requestAnimationFrame(this.loop);
  }

  private setupInputs(): void {
    window.addEventListener("keydown", (e) => {
      this.audio.startMusic();
      this.keys[e.key] = true;

      if (e.key === "Tab" || e.key === "i" || e.key === "I") {
        e.preventDefault();
        this.ui.inventoryOpen = !this.ui.inventoryOpen;
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        this.ui.mapOpen = !this.ui.mapOpen;
      } else if (e.key === "Escape") {
        this.ui.inventoryOpen = false;
        this.ui.shopOpen = false;
        this.ui.mapOpen = false;
        this.ui.dialogueActive = false;
      } else if (e.key === " ") {
        if (!this.ui.dialogueActive && !this.ui.inventoryOpen && !this.ui.shopOpen) {
          this.player.jumpBufferTimer = 0.11;
          if (!this.player.onGround && this.player.coyoteTimer <= 0 && this.player.airJumpsLeft > 0) {
            this.player.triggerDoubleJump(this.audio, this.particles);
          }
        }
      } else if (e.key === "Shift" || e.key === "x" || e.key === "X") {
        if (!this.ui.dialogueActive) {
          this.player.triggerDash(this.progress, this.audio, this.particles);
        }
      } else if (e.key === "e" || e.key === "E" || e.key === "Enter") {
        this.handleInteraction();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
      if (e.key === " " && this.player.vy < 0) {
        this.player.vy *= 0.48;
      }
    });
  }

  private handleInteraction(): void {
    if (this.ui.dialogueActive) {
      const res = this.ui.selectChoice(this.ui.selectedChoiceIdx, this.progress);
      if (res.openShop) {
        this.ui.shopOpen = true;
      }
      return;
    }

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    for (const npc of this.level.npcs) {
      if (Math.hypot(px - npc.x, py - npc.y) < 32) {
        this.ui.startDialogue(npc.dialogue_id, this.progress);
        return;
      }
    }

    for (const shrine of this.level.shrines) {
      if (Math.hypot(px - shrine.x, py - shrine.y) < 32) {
        if (!shrine.attuned) {
          shrine.attuned = true;
          if (!this.progress.unlocked_shrines.includes(shrine.shrine_id)) {
            this.progress.unlocked_shrines.push(shrine.shrine_id);
            this.progress.save();
          }
          this.audio.play("shrine");
          this.particles.spawnBurst(shrine.x, shrine.y - 12, "#ffe47a", 16, 60);
        } else {
          this.ui.mapOpen = true;
        }
        return;
      }
    }

    for (const portal of this.level.portals) {
      if (Math.hypot(px - portal.x, py - portal.y) < 32) {
        this.changeLevel(portal.target_level, portal.target_spawn);
        return;
      }
    }
  }

  private changeLevel(levelId: string, spawnId: string): void {
    if (!LEVELS_DATA[levelId]) return;

    this.progress.current_level = levelId;
    this.progress.spawn_id = spawnId;
    this.progress.save();

    this.audio.play("warp");
    this.level = new Level(LEVELS_DATA[levelId]);
    this.level.syncProgress(this.progress);

    const spawn = this.level.spawns[spawnId] || this.level.spawns.start || [64, 128];
    this.player.placeAt(spawn[0], spawn[1]);
    this.level.updateCamera(this.player.x, this.player.y, this.player.facing, 1.0);
    this.particles.seedAmbient(this.level.pixelW, this.level.pixelH, this.level.ambientType);
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
    if (this.ui.dialogueActive || this.ui.inventoryOpen || this.ui.shopOpen || this.ui.mapOpen) {
      return;
    }

    this.player.update(dt, this.keys, this.level, this.progress, this.audio, this.particles);
    this.level.updateCamera(this.player.x, this.player.y, this.player.facing, dt);
    this.particles.update(dt, this.level.pixelW, this.level.pixelH);

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    this.level.gems.forEach((g) => {
      if (!g.collected && Math.hypot(px - g.x, py - g.y) < 18) {
        g.collected = true;
        this.progress.gems += g.value;
        this.progress.collected_gems.push(g.uid);
        this.progress.save();
        this.audio.play("gem");
        this.particles.spawnBurst(g.x, g.y, "#6dbfc2", 6, 40);
      }
    });

    this.level.trinkets.forEach((t) => {
      if (!t.collected && Math.hypot(px - t.x, py - t.y) < 18) {
        t.collected = true;
        this.progress.trinkets.push(t.trinket_id);
        this.progress.save();
        this.audio.play("trinket");
        this.particles.spawnBurst(t.x, t.y, "#ffe47a", 14, 70);
      }
    });
  }

  private render(): void {
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    this.ctx.save();
    this.ctx.scale(UI_SCALE, UI_SCALE);

    this.level.render(this.ctx, this.timeSec);
    this.player.render(this.ctx, this.level.camX, this.level.camY);
    this.particles.render(this.ctx, this.level.camX, this.level.camY, this.timeSec);

    this.ctx.restore();

    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    let promptText: string | null = null;
    const interactables = [...this.level.npcs, ...this.level.shrines, ...this.level.portals, ...this.level.signs];

    for (const obj of interactables) {
      if (Math.hypot(px - obj.x, py - obj.y) < 32) {
        promptText = obj.prompt_label;
        break;
      }
    }

    this.ui.render(this.ctx, this.progress, this.level.name, promptText);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game("gameCanvas");
});
