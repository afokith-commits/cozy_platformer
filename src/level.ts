/**
 * Level Tilemap Engine & Renderer
 */

import { LevelData } from "./types.js";
import { GameProgress } from "./save.js";
import { ITEMS_DATA } from "./data.js";
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
  },
  spire: {
    skyTop: "#7ab4d4",
    skyBottom: "#f9d696",
    hillFar: "#d9b89c",
    hillNear: "#c2997a",
    topTile: "#e5ae52",
    topHighlight: "#ffe18e",
    bodyTile: "#8a6b5c",
    bodyDark: "#664c40",
    water: "#7cbcd4",
    waterCrest: "#eaf8ff"
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
  private staticCanvas: HTMLCanvasElement;

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
    this.staticCanvas = this.buildStaticCanvas();
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
        } else if (ch === "P" && !this.spawns.start) {
          this.spawns.start = [x + TILE_SIZE / 2, y + TILE_SIZE];
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
      const meta = ITEMS_DATA.trinkets[t.trinket_id];
      const col = meta?.color ? `rgb(${meta.color.join(",")})` : COLORS.gold;
      this.trinkets.push(
        new Trinket(t.trinket_id, meta?.name || t.trinket_id, t.col * TILE_SIZE + TILE_SIZE / 2, t.row * TILE_SIZE + TILE_SIZE / 2, col)
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

  public updateEntities(dt: number, timeSec: number, playerCx: number): void {
    this.gems.forEach((g) => g.update(dt, timeSec));
    this.trinkets.forEach((t) => t.update(dt, timeSec));
    this.bouncePads.forEach((p) => p.update(dt));
    this.npcs.forEach((n) => n.update(playerCx));
  }

  private buildStaticCanvas(): HTMLCanvasElement {
    const off = document.createElement("canvas");
    off.width = this.pixelW;
    off.height = this.pixelH;
    const octx = off.getContext("2d")!;

    this.decor.forEach((d) => {
      const dx = d.col * TILE_SIZE;
      const dy = (d.row + 1) * TILE_SIZE;
      if (d.kind === "tree") {
        octx.fillStyle = COLORS.wood_dark;
        octx.fillRect(dx + 5, dy - 22, 6, 22);
        octx.fillStyle = this.theme.hillNear;
        octx.beginPath(); octx.arc(dx + 8, dy - 28, 14, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = this.theme.topTile;
        octx.beginPath(); octx.arc(dx + 8, dy - 31, 11, 0, Math.PI * 2); octx.fill();
      } else if (d.kind === "pillar") {
        octx.fillStyle = "#6c6e84";
        octx.fillRect(dx + 3, dy - 28, 10, 28);
        octx.fillStyle = "#84869c";
        octx.fillRect(dx + 1, dy - 30, 14, 4);
      } else if (d.kind === "flower") {
        octx.fillStyle = COLORS.moss;
        octx.fillRect(dx + 7, dy - 5, 2, 5);
        octx.fillStyle = COLORS.gold;
        octx.fillRect(dx + 6, dy - 7, 4, 3);
      } else if (d.kind === "lantern") {
        octx.fillStyle = COLORS.wood_dark;
        octx.fillRect(dx + 7, dy - 16, 2, 16);
        octx.fillStyle = COLORS.gold_bright;
        octx.beginPath(); octx.arc(dx + 8, dy - 17, 3, 0, Math.PI * 2); octx.fill();
      }
    });

    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (ch === "#") {
          const above = this.grid[r - 1]?.[c];
          if (above !== "#") {
            octx.fillStyle = this.theme.bodyTile;
            octx.fillRect(x, y + 4, TILE_SIZE, TILE_SIZE - 4);
            octx.fillStyle = this.theme.topTile;
            octx.fillRect(x, y, TILE_SIZE, 6);
            octx.fillStyle = this.theme.topHighlight;
            octx.fillRect(x, y, TILE_SIZE, 2);
          } else {
            octx.fillStyle = this.theme.bodyTile;
            octx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            octx.fillStyle = this.theme.bodyDark;
            octx.fillRect(x + 2, y + 3, 5, 3);
            octx.fillRect(x + 9, y + 10, 5, 3);
          }
        } else if (ch === "=") {
          octx.fillStyle = COLORS.wood_mid;
          octx.fillRect(x, y, TILE_SIZE, 4);
          octx.fillStyle = COLORS.wood_light;
          octx.fillRect(x, y, TILE_SIZE, 1);
          octx.fillStyle = COLORS.wood_dark;
          octx.fillRect(x + 2, y + 4, 2, 3);
          octx.fillRect(x + TILE_SIZE - 4, y + 4, 2, 3);
        }
      });
    });
    return off;
  }

  public render(ctx: CanvasRenderingContext2D, timeSec: number): void {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    skyGrad.addColorStop(0, this.theme.skyTop);
    skyGrad.addColorStop(1, this.theme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // Near hills + sun/moon
    const cxNear = Math.round(this.camX * 0.36);
    ctx.fillStyle = this.theme.hillNear;
    for (let i = -1; i < 6; i++) {
      const hx = i * 110 - (cxNear % 110);
      ctx.beginPath();
      ctx.ellipse(hx + 70, WORLD_H - 22, 70, 42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = this.theme === THEMES.ruins ? "#dee8ff" : "#fff0b9";
    ctx.beginPath();
    ctx.arc(Math.round(WORLD_W * 0.78 - this.camX * 0.05), 46, 15, 0, Math.PI * 2);
    ctx.fill();

    // Cached tiles & decor in 1 draw call
    ctx.drawImage(this.staticCanvas, -Math.round(this.camX), -Math.round(this.camY));

    // Animated water ripples
    const wave = Math.round(Math.sin(timeSec * 3.2) * 1.5);
    this.hazardRects.forEach((h) => {
      const hx = Math.round(h.x - this.camX);
      const hy = Math.round(h.y - this.camY);
      ctx.fillStyle = this.theme.water;
      ctx.fillRect(hx, hy, h.w, h.h);
      ctx.fillStyle = this.theme.waterCrest;
      ctx.fillRect(hx, hy + Math.max(0, wave), h.w, 1);
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
