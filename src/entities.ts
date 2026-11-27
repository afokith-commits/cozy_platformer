/**
 * World Entities (Gems, Trinkets, BouncePads, Shrines, Portals, Signs, NPCs, Platforms, CrumbleTiles, BreakBlocks, AirCrystals, Critters, TrialTotems)
 */

import { COLORS } from "./settings.js";

export class Gem {
  public collected = false;
  public phase: number;
  public y: number;

  constructor(public uid: string, public x: number, public base_y: number, public value = 1) {
    this.phase = (x * 0.13 + base_y * 0.07) % (Math.PI * 2);
    this.y = base_y;
  }

  public update(dt: number, timeSec: number): void {
    this.y = this.base_y + Math.sin(timeSec * 3.6 + this.phase) * 2.2;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec = 0): void {
    if (this.collected) return;
    const cx = Math.round(this.x - camX);
    const cy = Math.round(this.y - camY);

    const star = this.value >= 5;
    const r = star ? 6 : 5;
    ctx.fillStyle = COLORS.espresso;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r - 1, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r + 1, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = star ? COLORS.gold : COLORS.sky_teal;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 1);
    ctx.lineTo(cx + r - 2, cy);
    ctx.lineTo(cx, cy + r - 1);
    ctx.lineTo(cx - r + 2, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = star ? COLORS.gold_bright : "#d6fcf9";
    ctx.fillRect(cx - 1, cy - r + 2, 2, 2);

    if (star && Math.sin(timeSec * 6 + this.x) > 0.35) {
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(cx + 4, cy - 5, 1, 3);
      ctx.fillRect(cx + 3, cy - 4, 3, 1);
    }
  }
}

export class Trinket {
  public collected = false;
  public y: number;

  constructor(
    public trinket_id: string,
    public name: string,
    public x: number,
    public base_y: number,
    public color: string
  ) {
    this.y = base_y;
  }

  public update(dt: number, timeSec: number): void {
    this.y = this.base_y + Math.sin(timeSec * 2.6) * 2.5;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    if (this.collected) return;
    const cx = Math.round(this.x - camX);
    const cy = Math.round(this.y - camY);

    const pulse = Math.round(7 + 1.5 * Math.sin(timeSec * 4));
    ctx.strokeStyle = "rgba(255, 232, 148, 0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = COLORS.espresso;
    ctx.beginPath();
    ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    if (this.trinket_id.includes("bell") || this.trinket_id.includes("chime")) {
      ctx.fillRect(cx - 3, cy - 4, 6, 5);
      ctx.fillRect(cx - 4, cy + 1, 8, 2);
      ctx.fillStyle = COLORS.gold_bright;
      ctx.fillRect(cx - 1, cy + 3, 2, 2);
    } else if (this.trinket_id === "mossy_compass") {
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(cx, cy - 2, 2, 2);
    } else if (this.trinket_id === "fossil_acorn") {
      ctx.fillRect(cx - 3, cy - 1, 6, 5);
      ctx.fillStyle = COLORS.wood_dark;
      ctx.fillRect(cx - 4, cy - 3, 8, 3);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(cx - 2, cy - 2, 2, 2);
    }
  }
}

export class BouncePad {
  public squash = 0.0;
  constructor(public x: number, public y: number) {}

  public trigger(): void {
    this.squash = 1.0;
  }

  public update(dt: number): void {
    if (this.squash > 0) {
      this.squash = Math.max(0, this.squash - dt * 4.5);
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX);
    const sy = Math.round(this.y - camY);
    const press = Math.round(this.squash * 3);

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx + 5, sy + 9 + press, 6, 7 - press);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(sx + 6, sy + 9 + press, 4, 7 - press);

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx + 1, sy + 4 + press, 14, 6);
    ctx.fillRect(sx + 3, sy + 3 + press, 10, 1);
    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(sx + 2, sy + 4 + press, 12, 5);
    ctx.fillRect(sx + 4, sy + 3 + press, 8, 1);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(sx + 4, sy + 5 + press, 2, 2);
    ctx.fillRect(sx + 10, sy + 5 + press, 2, 2);
  }
}

export class Shrine {
  public attuned = false;
  public prompt_label = "Attune Shrine";
  constructor(public shrine_id: string, public name: string, public x: number, public y: number) {}

  public syncState(unlockedShrines: string[]): void {
    this.attuned = unlockedShrines.includes(this.shrine_id);
    this.prompt_label = this.attuned ? "Fast Travel" : "Attune Shrine";
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    const sx = Math.round(this.x - camX - 8);
    const sy = Math.round(this.y - camY - 24);

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx + 1, sy + 5, 14, 19);
    ctx.fillStyle = "#7c7680";
    ctx.fillRect(sx + 2, sy + 18, 12, 6);
    ctx.fillStyle = "#948e98";
    ctx.fillRect(sx + 4, sy + 6, 8, 12);
    ctx.fillStyle = "#6c6670";
    ctx.beginPath();
    ctx.moveTo(sx + 1, sy + 7);
    ctx.lineTo(sx + 8, sy + 1);
    ctx.lineTo(sx + 15, sy + 7);
    ctx.fill();
    ctx.fillStyle = this.attuned ? COLORS.gold_bright : "#525662";
    ctx.beginPath();
    ctx.arc(sx + 8, sy + 12, this.attuned ? 3.5 + Math.sin(timeSec * 4.5) : 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Portal {
  public prompt_label: string;
  constructor(
    public target_level: string,
    public target_spawn: string,
    public label: string,
    public x: number,
    public y: number
  ) {
    this.prompt_label = label;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec = 0): void {
    const sx = Math.round(this.x - camX - 10);
    const sy = Math.round(this.y - camY - 24);

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx, sy + 1, 20, 23);
    ctx.fillStyle = COLORS.wood_mid;
    ctx.fillRect(sx + 1, sy + 2, 18, 22);
    ctx.fillStyle = COLORS.wood_light;
    ctx.fillRect(sx + 2, sy + 2, 16, 2);

    const doorGrad = ctx.createLinearGradient(0, sy + 5, 0, sy + 24);
    doorGrad.addColorStop(0, "#3d2a2e");
    doorGrad.addColorStop(1, "#704d3c");
    ctx.fillStyle = doorGrad;
    ctx.fillRect(sx + 4, sy + 5, 12, 19);

    const sway = Math.round(Math.sin(timeSec * 3) * 0.8);
    ctx.fillStyle = COLORS.wood_dark;
    ctx.fillRect(sx + 16, sy + 7, 3, 2);
    ctx.fillStyle = COLORS.gold_bright;
    ctx.fillRect(sx + 16 + sway, sy + 9, 3, 4);
  }
}

export class Sign {
  public prompt_label = "Read Sign";
  constructor(public text: string, public x: number, public y: number) {}

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX - 7);
    const sy = Math.round(this.y - camY - 15);

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx + 5, sy + 9, 4, 6);
    ctx.fillRect(sx, sy + 1, 14, 9);

    ctx.fillStyle = COLORS.wood_dark;
    ctx.fillRect(sx + 6, sy + 9, 2, 6);
    ctx.fillStyle = COLORS.wood_light;
    ctx.fillRect(sx + 1, sy + 2, 12, 7);
    ctx.fillStyle = COLORS.parchment_dark;
    ctx.fillRect(sx + 1, sy + 2, 12, 1);

    ctx.fillStyle = COLORS.wood_dark;
    ctx.fillRect(sx + 3, sy + 4, 8, 1);
    ctx.fillRect(sx + 3, sy + 6, 6, 1);
  }
}

export class NPC {
  public facing = 1;
  public prompt_label: string;
  constructor(
    public npc_id: string,
    public name: string,
    public dialogue_id: string,
    public x: number,
    public y: number,
    public style = "frog"
  ) {
    this.prompt_label = `Talk: ${name}`;
  }

  public update(playerCx: number): void {
    if (Math.abs(playerCx - this.x) > 4) {
      this.facing = playerCx >= this.x ? 1 : -1;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    const sx = Math.round(this.x - camX - 7);
    const sy = Math.round(this.y - camY - 16);
    const bob = Math.round(Math.sin(timeSec * 3 + this.npc_id.length));

    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx, sy + bob, 14, 16);

    if (this.style === "frog") {
      ctx.fillStyle = "#62a85c";
      ctx.fillRect(sx + 1, sy + 1 + bob, 12, 14);
      ctx.fillStyle = "#c6e098";
      ctx.fillRect(sx + 3, sy + 8 + bob, 8, 6);
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(sx + 2, sy + 1 + bob, 10, 3);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 5 + bob, 2, 2);
      ctx.fillRect(sx + 9 + (this.facing > 0 ? 1 : 0), sy + 5 + bob, 2, 2);
    } else if (this.style === "willow") {
      ctx.fillStyle = "#9e7a62";
      ctx.fillRect(sx + 1, sy + 1 + bob, 12, 14);
      ctx.fillStyle = COLORS.plum;
      ctx.fillRect(sx + 1, sy + 9 + bob, 12, 6);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(sx + 3, sy + 5 + bob, 3, 3);
      ctx.fillRect(sx + 8, sy + 5 + bob, 3, 3);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 1, 2);
      ctx.fillRect(sx + 9 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 1, 2);
    } else if (this.style === "fox") {
      ctx.fillStyle = "#d67640";
      ctx.fillRect(sx + 1, sy + 1 + bob, 12, 14);
      ctx.fillStyle = COLORS.sky_teal;
      ctx.fillRect(sx + 1, sy + 10 + bob, 12, 5);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 7 + bob, 2, 2);
      ctx.fillRect(sx + 9 + (this.facing > 0 ? 1 : 0), sy + 7 + bob, 2, 2);
    } else if (this.style === "owl") {
      ctx.fillStyle = "#e6b464";
      ctx.fillRect(sx + 1, sy + 1 + bob, 12, 14);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(sx + 3, sy + 4 + bob, 8, 6);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sx + 6, sy + 7 + bob, 2, 3);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 2, 2);
      ctx.fillRect(sx + 8 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 2, 2);
    } else if (this.style === "mole") {
      ctx.fillStyle = "#5c4a4e";
      ctx.fillRect(sx + 1, sy + 2 + bob, 12, 13);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sx + 2, sy + bob, 10, 4);
      ctx.fillStyle = COLORS.gold_bright;
      ctx.fillRect(sx + (this.facing > 0 ? 9 : 3), sy + 1 + bob, 2, 2);
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(sx + (this.facing > 0 ? 10 : 2), sy + 7 + bob, 2, 2);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 2, 2);
    } else {
      const floatY = Math.round(Math.sin(timeSec * 4) * 2);
      ctx.fillStyle = "#a5f0e0";
      ctx.beginPath();
      ctx.arc(sx + 7, sy + 8 + floatY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.white;
      ctx.beginPath();
      ctx.arc(sx + 7, sy + 8 + floatY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 5 + (this.facing > 0 ? 1 : 0), sy + 7 + floatY, 1, 2);
      ctx.fillRect(sx + 9 + (this.facing > 0 ? 1 : 0), sy + 7 + floatY, 1, 2);
    }
  }
}

export class MovingPlatform {
  public x: number;
  public y: number;
  public dx = 0;
  public dy = 0;
  private phase = 0;

  constructor(
    public startX: number,
    public startY: number,
    public endX: number,
    public endY: number,
    public w: number,
    public speed: number
  ) {
    this.x = startX;
    this.y = startY;
  }

  public update(dt: number): void {
    const prevX = this.x, prevY = this.y;
    this.phase += dt * this.speed;
    const t = 0.5 - 0.5 * Math.cos(this.phase);
    this.x = this.startX + (this.endX - this.startX) * t;
    this.y = this.startY + (this.endY - this.startY) * t;
    this.dx = this.x - prevX;
    this.dy = this.y - prevY;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX), sy = Math.round(this.y - camY);
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(sx - 1, sy, this.w + 2, 7);
    ctx.fillStyle = COLORS.wood_dark; ctx.fillRect(sx, sy, this.w, 6);
    ctx.fillStyle = COLORS.wood_light; ctx.fillRect(sx + 1, sy, this.w - 2, 3);
    ctx.fillStyle = COLORS.gold; ctx.fillRect(sx + 2, sy + 1, 2, 2); ctx.fillRect(sx + this.w - 4, sy + 1, 2, 2);
  }
}

export class CrumbleTile {
  public state: "idle" | "shaking" | "gone" = "idle";
  public timer = 0;
  public w = 16;
  public h = 5;

  constructor(public x: number, public y: number) {}

  public trigger(): boolean {
    if (this.state !== "idle") return false;
    this.state = "shaking";
    this.timer = 0.65;
    return true;
  }

  public update(dt: number): "fell" | "respawned" | null {
    if (this.state === "shaking") {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = "gone"; this.timer = 2.2; return "fell"; }
    } else if (this.state === "gone") {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = "idle"; return "respawned"; }
    }
    return null;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    if (this.state === "gone") {
      ctx.strokeStyle = "rgba(146,198,121,0.35)";
      ctx.strokeRect(Math.round(this.x - camX) + 1, Math.round(this.y - camY) + 1, 14, 3);
      return;
    }
    const shake = this.state === "shaking" ? Math.round(Math.sin(timeSec * 55) * 1.5) : 0;
    const sx = Math.round(this.x - camX + shake), sy = Math.round(this.y - camY);
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(sx, sy, 16, 5);
    ctx.fillStyle = this.state === "shaking" ? COLORS.coral : COLORS.moss;
    ctx.fillRect(sx + 1, sy, 14, 4);
    ctx.fillStyle = COLORS.moss_light;
    ctx.fillRect(sx + 1, sy, 14, 2);
  }
}

export class BreakBlock {
  public broken = false;
  public w = 16;
  public h = 16;
  constructor(public uid: string, public x: number, public y: number) {}

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.broken) return;
    const sx = Math.round(this.x - camX), sy = Math.round(this.y - camY);
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(sx, sy, 16, 16);
    ctx.fillStyle = "#8a786c"; ctx.fillRect(sx + 1, sy + 1, 14, 14);
    ctx.fillStyle = "#625248"; ctx.fillRect(sx + 2, sy + 2, 12, 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(sx + 4, sy + 3, 2, 5); ctx.fillRect(sx + 6, sy + 7, 4, 2); ctx.fillRect(sx + 10, sy + 9, 2, 4);
  }
}

export class AirCrystal {
  public cooldown = 0;
  constructor(public x: number, public y: number) {}

  public collect(): boolean {
    if (this.cooldown > 0) return false;
    this.cooldown = 2.4;
    return true;
  }

  public update(dt: number): void {
    if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - dt);
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    const cx = Math.round(this.x - camX);
    const cy = Math.round(this.y - camY + Math.sin(timeSec * 3.5 + this.x) * 2);
    if (this.cooldown > 0) {
      ctx.strokeStyle = "rgba(109,191,194,0.4)";
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    ctx.fillStyle = COLORS.espresso;
    ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 6, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COLORS.sky_teal;
    ctx.beginPath(); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx + 5, cy); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx - 5, cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(cx - 1, cy - 2, 2, 3);
  }
}

export class Critter {
  public x: number;
  public y: number;
  public dir = 1;
  public stunTimer = 0;
  private speed = 34;

  constructor(
    public minX: number,
    public maxX: number,
    y: number,
    public style: "beetle" | "crystal" = "beetle"
  ) {
    this.x = (minX + maxX) / 2;
    this.y = y;
  }

  public update(dt: number): void {
    if (this.stunTimer > 0) { this.stunTimer = Math.max(0, this.stunTimer - dt); return; }
    this.x += this.dir * this.speed * dt;
    if (this.x <= this.minX) { this.x = this.minX; this.dir = 1; }
    if (this.x >= this.maxX) { this.x = this.maxX; this.dir = -1; }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    const sx = Math.round(this.x - camX - 6), sy = Math.round(this.y - camY - 10);
    const sq = this.stunTimer > 0 ? 3 : Math.round(Math.abs(Math.sin(timeSec * 6)));
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(sx - 1, sy + sq - 1, 14, 11 - sq);
    ctx.fillStyle = this.style === "crystal" ? COLORS.plum : COLORS.berry;
    ctx.fillRect(sx, sy + sq, 12, 10 - sq);
    ctx.fillStyle = COLORS.gold_bright;
    ctx.fillRect(sx + (this.dir > 0 ? 8 : 2), sy + 3 + sq, 2, 2);
  }
}

export class TrialTotem {
  public prompt_label: string;
  public completed = false;

  constructor(
    public trial_id: string,
    public name: string,
    public x: number,
    public y: number,
    public timeLimit: number,
    public rings: Array<{ x: number; y: number; collected: boolean }>
  ) {
    this.prompt_label = `Start Trial: ${name}`;
  }

  public syncState(completedTrials: string[]): void {
    this.completed = completedTrials.includes(this.trial_id);
    this.prompt_label = this.completed ? `Replay Trial: ${this.name}` : `Start Trial: ${this.name}`;
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number, timeSec: number): void {
    const sx = Math.round(this.x - camX - 6), sy = Math.round(this.y - camY - 20);
    ctx.fillStyle = COLORS.espresso; ctx.fillRect(sx, sy + 4, 12, 17);
    ctx.fillStyle = COLORS.wood_dark; ctx.fillRect(sx + 1, sy + 5, 10, 15);
    ctx.fillStyle = this.completed ? COLORS.gold_bright : COLORS.sky_teal;
    ctx.beginPath(); ctx.arc(sx + 6, sy + 5 + Math.sin(timeSec * 4), 4.5, 0, Math.PI * 2); ctx.fill();
  }
}
