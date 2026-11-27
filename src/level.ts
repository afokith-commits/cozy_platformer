/**
 * Level Tilemap Engine & Renderer
 */

import { LevelData } from "./types.js";
import { GameProgress } from "./save.js";
import { BouncePad, Gem, NPC, Portal, Shrine, Sign, Trinket } from "./entities.js";
import { COLORS, TILE_SIZE, WORLD_H, WORLD_W } from "./settings.js";

export interface ThemeColors {
  skyTop: string;
  skyBottom: string;
  hillFar: string;
  hillNear: string;
  topTile: string;
  topHighlight: string;
  bodyTile: string;
  bodyDark: string;
  water: string;
  waterCrest: string;
}

export const THEMES: Record<string, ThemeColors> = {
  meadow: {
    skyTop: "#92ced6",
    skyBottom: "#f4e5c0",
    hillFar: "#90b898",
    hillNear: "#74a276",
    topTile: "#6aa85c",
    topHighlight: "#98ce7c",
    bodyTile: "#765642",
    bodyDark: "#583f31",
    water: "#62b2bc",
    waterCrest: "#b6eef0"
  },
  canopy: {
    skyTop: "#70a8b2",
    skyBottom: "#e4d6b0",
    hillFar: "#5e9280",
    hillNear: "#487a62",
    topTile: "#5c9862",
    topHighlight: "#90c680",
    bodyTile: "#684836",
    bodyDark: "#4c3428",
    water: "#549ca6",
    waterCrest: "#aee0e2"
  },
  ruins: {
    skyTop: "#4a547c",
    skyBottom: "#9886a8",
    hillFar: "#585476",
    hillNear: "#424462",
    topTile: "#729488",
    topHighlight: "#98c0ae",
    bodyTile: "#606276",
    bodyDark: "#444658",
    water: "#4e80a4",
    waterCrest: "#9cd4ec"
  }
};

export class Level {
  public id: string;
  public name: string;
  public theme: ThemeColors;
  public ambientType: string;

  public grid: string[];
  public rows: number;
  public cols: number;
  public pixelW: number;
  public pixelH: number;

  public solidRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  public onewayRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  public hazardRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  public bouncePads: BouncePad[] = [];
  public gems: Gem[] = [];
  public trinkets: Trinket[] = [];
  public shrines: Shrine[] = [];
  public portals: Portal[] = [];
  public signs: Sign[] = [];
  public npcs: NPC[] = [];
  public decor: Array<{ kind: string; col: number; row: number }> = [];
  public spawns: Record<string, [number, number]> = {};

  public camX = 0;
  public camY = 0;

  constructor(data: LevelData) {
    this.id = data.id;
    this.name = data.name;
    this.theme = THEMES[data.theme] || THEMES.meadow;
    this.ambientType = data.ambient_type || "fireflies";

    this.grid = data.grid;
    this.rows = this.grid.length;
    this.cols = Math.max(...this.grid.map((r) => r.length));
    this.pixelW = this.cols * TILE_SIZE;
    this.pixelH = this.rows * TILE_SIZE;
    this.decor = data.decor || [];

    this.parseGrid();
    this.loadObjects(data);
  }

  private parseGrid(): void {
    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (ch === "#") {
          this.solidRects.push({ x, y, w: TILE_SIZE, h: TILE_SIZE });
        } else if (ch === "=") {
          this.onewayRects.push({ x, y, w: TILE_SIZE, h: 5 });
        } else if (ch === "~") {
          this.hazardRects.push({ x, y: y + 5, w: TILE_SIZE, h: TILE_SIZE - 5 });
        } else if (ch === "^") {
          this.bouncePads.push(new BouncePad(x, y));
        } else if (ch === "G") {
          const uid = `${this.id}:${c},${r}`;
          this.gems.push(new Gem(uid, x + TILE_SIZE / 2, y + TILE_SIZE / 2, 1));
        } else if (ch === "*") {
          const uid = `${this.id}:${c},${r}`;
          this.gems.push(new Gem(uid, x + TILE_SIZE / 2, y + TILE_SIZE / 2, 5));
        }
      });
    });
  }

  private loadObjects(data: LevelData): void {
    Object.entries(data.spawns || {}).forEach(([sid, coords]) => {
      this.spawns[sid] = [coords[0] * TILE_SIZE + TILE_SIZE / 2, coords[1] * TILE_SIZE + TILE_SIZE];
    });

    (data.portals || []).forEach((p) => {
      this.portals.push(
        new Portal(
          p.target_level,
          p.target_spawn,
          p.label,
          p.col * TILE_SIZE + TILE_SIZE / 2,
          (p.row + 1) * TILE_SIZE
        )
      );
    });

    (data.npcs || []).forEach((n) => {
      this.npcs.push(
        new NPC(
          n.npc_id,
          n.name,
          n.dialogue_id,
          n.col * TILE_SIZE + TILE_SIZE / 2,
          (n.row + 1) * TILE_SIZE,
          n.style || "frog"
        )
      );
    });

    (data.signs || []).forEach((s) => {
      this.signs.push(new Sign(s.text, s.col * TILE_SIZE + TILE_SIZE / 2, (s.row + 1) * TILE_SIZE));
    });

    (data.shrines || []).forEach((sh) => {
      this.shrines.push(new Shrine(sh.shrine_id, sh.name, sh.col * TILE_SIZE + TILE_SIZE / 2, (sh.row + 1) * TILE_SIZE));
    });

    (data.trinkets || []).forEach((t) => {
      this.trinkets.push(
        new Trinket(t.trinket_id, t.trinket_id, t.col * TILE_SIZE + TILE_SIZE / 2, t.row * TILE_SIZE + TILE_SIZE / 2, COLORS.gold)
      );
    });
  }

  public syncProgress(progress: GameProgress): void {
    const gemSet = new Set(progress.collected_gems);
    this.gems.forEach((g) => (g.collected = gemSet.has(g.uid)));

    const trinketSet = new Set(progress.trinkets);
    this.trinkets.forEach((t) => (t.collected = trinketSet.has(t.trinket_id)));

    this.shrines.forEach((s) => s.syncState(progress.unlocked_shrines));
  }

  public getSolidRectsNear(x: number, y: number, w: number, h: number) {
    return this.solidRects.filter((r) => x - 32 < r.x + r.w && x + w + 32 > r.x && y - 32 < r.y + r.h && y + h + 32 > r.y);
  }

  public getOnewayRectsNear(x: number, y: number, w: number, h: number) {
    return this.onewayRects.filter((r) => x - 32 < r.x + r.w && x + w + 32 > r.x && y - 32 < r.y + r.h && y + h + 32 > r.y);
  }

  public hitsHazard(x: number, y: number, w: number, h: number): boolean {
    return this.hazardRects.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  }

  public isSafeLedge(x: number, y: number, w: number, h: number): boolean {
    if (this.hitsHazard(x, y, w, h)) return false;
    const footY = Math.floor((y + h + 2) / TILE_SIZE);
    const leftC = Math.floor((x + 1) / TILE_SIZE);
    const rightC = Math.floor((x + w - 1) / TILE_SIZE);
    const chL = this.grid[footY]?.[leftC] || " ";
    const chR = this.grid[footY]?.[rightC] || " ";
    return (chL === "#" || chL === "=") && (chR === "#" || chR === "=");
  }

  public updateCamera(targetX: number, targetY: number, facing: number, dt: number): void {
    const maxCx = Math.max(0, this.pixelW - WORLD_W);
    const maxCy = Math.max(0, this.pixelH - WORLD_H);
    const desiredX = Math.max(0, Math.min(maxCx, targetX + facing * 22.0 - WORLD_W / 2));
    const desiredY = Math.max(0, Math.min(maxCy, targetY - WORLD_H * 0.54));

    this.camX += (desiredX - this.camX) * dt * 7.5;
    this.camY += (desiredY - this.camY) * dt * 6.5;
  }

  public render(ctx: CanvasRenderingContext2D, timeSec: number): void {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    skyGrad.addColorStop(0, this.theme.skyTop);
    skyGrad.addColorStop(1, this.theme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Parallax
    const cxFar = Math.round(this.camX * 0.18);
    ctx.fillStyle = this.theme.hillFar;
    for (let i = -1; i < 6; i++) {
      const hx = i * 140 - (cxFar % 140);
      ctx.beginPath();
      ctx.ellipse(hx + 80, WORLD_H - 40, 85, 55, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiles
    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = Math.round(c * TILE_SIZE - this.camX);
        const y = Math.round(r * TILE_SIZE - this.camY);
        if (ch === "#") {
          const above = this.grid[r - 1]?.[c];
          if (above !== "#") {
            ctx.fillStyle = this.theme.bodyTile;
            ctx.fillRect(x, y + 4, TILE_SIZE, TILE_SIZE - 4);
            ctx.fillStyle = this.theme.topTile;
            ctx.fillRect(x, y, TILE_SIZE, 6);
            ctx.fillStyle = this.theme.topHighlight;
            ctx.fillRect(x, y, TILE_SIZE, 2);
          } else {
            ctx.fillStyle = this.theme.bodyTile;
            ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          }
        } else if (ch === "=") {
          ctx.fillStyle = COLORS.wood_mid;
          ctx.fillRect(x, y, TILE_SIZE, 4);
        } else if (ch === "~") {
          ctx.fillStyle = this.theme.water;
          ctx.fillRect(x, y + 5, TILE_SIZE, TILE_SIZE - 5);
        }
      });
    });

    // Entities
    this.portals.forEach((p) => p.render(ctx, this.camX, this.camY));
    this.signs.forEach((s) => s.render(ctx, this.camX, this.camY));
    this.shrines.forEach((s) => s.render(ctx, this.camX, this.camY, timeSec));
    this.bouncePads.forEach((pad) => pad.render(ctx, this.camX, this.camY));
    this.gems.forEach((g) => g.render(ctx, this.camX, this.camY));
    this.trinkets.forEach((t) => t.render(ctx, this.camX, this.camY, timeSec));
    this.npcs.forEach((n) => n.render(ctx, this.camX, this.camY, timeSec));
  }
}
