/**
 * World Entities (Gems, Trinkets, BouncePads, Shrines, Portals, Signs, NPCs)
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

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (this.collected) return;
    const cx = Math.round(this.x - camX);
    const cy = Math.round(this.y - camY);

    ctx.fillStyle = this.value >= 5 ? COLORS.gold : COLORS.sky_teal;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5);
    ctx.lineTo(cx + 4, cy);
    ctx.lineTo(cx, cy + 5);
    ctx.lineTo(cx - 4, cy);
    ctx.closePath();
    ctx.fill();
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

    const pulse = Math.round(6 + 2 * Math.sin(timeSec * 4.0));
    ctx.strokeStyle = COLORS.gold_bright;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
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

    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(sx + 6, sy + 8 + press, 4, 8 - press);
    ctx.fillStyle = COLORS.coral;
    ctx.beginPath();
    ctx.ellipse(sx + 8, sy + 7 + press, 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(sx + 3, sy + 5 + press, 2, 2);
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

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX - 10);
    const sy = Math.round(this.y - camY - 24);

    ctx.fillStyle = COLORS.wood_dark;
    ctx.fillRect(sx + 1, sy + 2, 18, 22);
    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(sx + 4, sy + 5, 12, 19);
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(sx + 17, sy + 11, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class Sign {
  public prompt_label = "Read Sign";
  constructor(public text: string, public x: number, public y: number) {}

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = Math.round(this.x - camX - 7);
    const sy = Math.round(this.y - camY - 14);

    ctx.fillStyle = COLORS.wood_dark;
    ctx.fillRect(sx + 6, sy + 8, 2, 6);
    ctx.fillStyle = COLORS.wood_light;
    ctx.fillRect(sx + 1, sy + 2, 12, 7);
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

    if (this.style === "frog") {
      ctx.fillStyle = "#62a85c";
      ctx.fillRect(sx + 1, sy + 5 + bob, 12, 11);
      ctx.fillStyle = "#c6e098";
      ctx.fillRect(sx + 3, sy + 9 + bob, 8, 6);
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(sx + 2, sy + 1 + bob, 10, 4);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + this.facing, sy + 5 + bob, 2, 2);
      ctx.fillRect(sx + 9 + this.facing, sy + 5 + bob, 2, 2);
    } else if (this.style === "willow") {
      ctx.fillStyle = "#9e7a62";
      ctx.fillRect(sx + 1, sy + 3 + bob, 12, 13);
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
      ctx.fillRect(sx + 2, sy + 1 + bob, 3, 4);
      ctx.fillRect(sx + 9, sy + 1 + bob, 3, 4);
      ctx.fillRect(sx + 2, sy + 4 + bob, 10, 11);
      ctx.fillStyle = COLORS.sky_teal;
      ctx.fillRect(sx + 2, sy + 10 + bob, 10, 3);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + this.facing, sy + 7 + bob, 2, 2);
      ctx.fillRect(sx + 9 + this.facing, sy + 7 + bob, 2, 2);
    } else if (this.style === "owl") {
      ctx.fillStyle = "#e6b464";
      ctx.fillRect(sx + 1, sy + 3 + bob, 12, 12);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(sx + 3, sy + 5 + bob, 8, 5);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(sx + 6, sy + 8 + bob, 2, 3);
      ctx.fillStyle = COLORS.espresso;
      ctx.fillRect(sx + 4 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 2, 2);
      ctx.fillRect(sx + 8 + (this.facing > 0 ? 1 : 0), sy + 6 + bob, 2, 2);
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
      ctx.fillRect(sx + 5 + this.facing, sy + 7 + floatY, 1, 2);
      ctx.fillRect(sx + 9 + this.facing, sy + 7 + floatY, 1, 2);
    }
  }
}
