/**
 * Level Tilemap Engine & Renderer
 */

import { LevelData } from "./types.js";
import { GameProgress } from "./save.js";
import { ITEMS_DATA } from "./data.js";
import { AirCrystal, BouncePad, BreakBlock, Critter, CrumbleTile, Gem, MovingPlatform, NPC, Portal, Shrine, Sign, TrialTotem, Trinket } from "./entities.js";
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
  },
  cavern: {
    skyTop: "#282b4a",
    skyBottom: "#4c4674",
    hillFar: "#38365e",
    hillNear: "#2d3050",
    topTile: "#5bb4b8",
    topHighlight: "#9ef0e8",
    bodyTile: "#44425c",
    bodyDark: "#2e2c40",
    water: "#6b54a8",
    waterCrest: "#caa8ff"
  }
};

function makeGlowSprite(rgb: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, `rgba(${rgb}, 0.55)`);
  grad.addColorStop(0.45, `rgba(${rgb}, 0.18)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

const GLOW_GOLD = makeGlowSprite("255, 224, 122");
const GLOW_TEAL = makeGlowSprite("109, 215, 224");
const GLOW_PLUM = makeGlowSprite("188, 138, 255");

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
  public updraftRects: Array<{ x: number; y: number; w: number; h: number }> = [];
  public thornRects: Array<{ x: number; y: number; w: number; h: number }> = [];

  public bouncePads: BouncePad[] = [];
  public gems: Gem[] = [];
  public trinkets: Trinket[] = [];
  public shrines: Shrine[] = [];
  public portals: Portal[] = [];
  public signs: Sign[] = [];
  public npcs: NPC[] = [];
  public platforms: MovingPlatform[] = [];
  public crumbleTiles: CrumbleTile[] = [];
  public breakBlocks: BreakBlock[] = [];
  public airCrystals: AirCrystal[] = [];
  public critters: Critter[] = [];
  public trialTotem: TrialTotem | null = null;
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
        } else if (ch === "-") {
          this.crumbleTiles.push(new CrumbleTile(x, y));
        } else if (ch === "B") {
          this.breakBlocks.push(new BreakBlock(`${this.id}:${c},${r}`, x, y));
        } else if (ch === "O") {
          this.airCrystals.push(new AirCrystal(x + 8, y + 8));
        } else if (ch === "U") {
          this.updraftRects.push({ x, y, w: TILE_SIZE, h: TILE_SIZE });
        } else if (ch === "X") {
          this.thornRects.push({ x: x + 2, y: y + 6, w: TILE_SIZE - 4, h: TILE_SIZE - 6 });
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

    (data.platforms || []).forEach((p) => {
      this.platforms.push(
        new MovingPlatform(
          p.col1 * TILE_SIZE,
          p.row1 * TILE_SIZE,
          p.col2 * TILE_SIZE,
          p.row2 * TILE_SIZE,
          (p.tiles || 3) * TILE_SIZE,
          p.speed
        )
      );
    });

    (data.critters || []).forEach((c) => {
      this.critters.push(new Critter(c.minCol * TILE_SIZE + 8, c.maxCol * TILE_SIZE + 8, (c.row + 1) * TILE_SIZE, c.style || "beetle"));
    });

    if (data.trial) {
      this.trialTotem = new TrialTotem(
        data.trial.trial_id,
        data.trial.name,
        data.trial.col * TILE_SIZE + 8,
        (data.trial.row + 1) * TILE_SIZE,
        data.trial.time_limit,
        data.trial.rings.map(([rc, rr]) => ({ x: rc * TILE_SIZE + 8, y: rr * TILE_SIZE + 8, collected: false }))
      );
    }
  }

  public syncProgress(progress: GameProgress): void {
    const gemSet = new Set(progress.collected_gems);
    this.gems.forEach((g) => (g.collected = gemSet.has(g.uid)));

    const trinketSet = new Set(progress.trinkets);
    this.trinkets.forEach((t) => (t.collected = trinketSet.has(t.trinket_id)));

    const brokenSet = new Set(progress.broken_blocks);
    this.breakBlocks.forEach((b) => (b.broken = brokenSet.has(b.uid)));

    this.shrines.forEach((s) => s.syncState(progress.unlocked_shrines));
    this.trialTotem?.syncState(progress.completed_trials);
  }

  public getSolidRectsNear(x: number, y: number, w: number, h: number) {
    return this.solidRects.filter((r) => x - 32 < r.x + r.w && x + w + 32 > r.x && y - 32 < r.y + r.h && y + h + 32 > r.y);
  }

  public getOnewayRectsNear(x: number, y: number, w: number, h: number) {
    return this.onewayRects.filter((r) => x - 32 < r.x + r.w && x + w + 32 > r.x && y - 32 < r.y + r.h && y + h + 32 > r.y);
  }

  public hitsHazard(x: number, y: number, w: number, h: number): boolean {
    const inHazard = this.hazardRects.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
    const inThorn = this.thornRects.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
    return inHazard || inThorn;
  }

  public hitsUpdraft(x: number, y: number, w: number, h: number): boolean {
    return this.updraftRects.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
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
    this.platforms.forEach((p) => p.update(dt));
    this.airCrystals.forEach((o) => o.update(dt));
    this.critters.forEach((c) => c.update(dt));
  }

  private buildStaticCanvas(): HTMLCanvasElement {
    const off = document.createElement("canvas");
    off.width = this.pixelW;
    off.height = this.pixelH;
    const octx = off.getContext("2d")!;

    // 1. Rich Background Decor
    this.decor.forEach((d) => {
      const dx = d.col * TILE_SIZE;
      const dy = (d.row + 1) * TILE_SIZE;
      if (d.kind === "tree") {
        octx.fillStyle = COLORS.espresso; octx.fillRect(dx + 4, dy - 24, 8, 24);
        octx.fillStyle = COLORS.wood_dark; octx.fillRect(dx + 5, dy - 24, 6, 24);
        octx.fillStyle = COLORS.wood_mid; octx.fillRect(dx + 6, dy - 22, 2, 20);
        octx.fillStyle = this.theme.hillNear;
        octx.beginPath(); octx.arc(dx + 8, dy - 28, 15, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = this.theme.topTile;
        octx.beginPath(); octx.arc(dx + 4, dy - 30, 10, 0, Math.PI * 2); octx.fill();
        octx.beginPath(); octx.arc(dx + 12, dy - 29, 9, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = this.theme.topHighlight;
        octx.beginPath(); octx.arc(dx + 7, dy - 35, 7, 0, Math.PI * 2); octx.fill();
        octx.fillStyle = COLORS.coral; octx.fillRect(dx + 3, dy - 28, 2, 2); octx.fillRect(dx + 12, dy - 33, 2, 2);
      } else if (d.kind === "pillar") {
        octx.fillStyle = "#484a62"; octx.fillRect(dx + 2, dy - 30, 12, 30);
        octx.fillStyle = "#6c6e88"; octx.fillRect(dx + 3, dy - 29, 10, 28);
        octx.fillStyle = "#8a8da8"; octx.fillRect(dx + 4, dy - 28, 3, 26);
        octx.fillStyle = "#9ca0bc"; octx.fillRect(dx + 1, dy - 32, 14, 4);
        octx.fillStyle = this.theme.topTile; octx.fillRect(dx + 2, dy - 33, 12, 2);
        octx.fillStyle = this.theme.topTile;
        octx.fillRect(dx + 10, dy - 26, 2, 9); octx.fillRect(dx + 9, dy - 18, 2, 7);
      } else if (d.kind === "flower") {
        octx.fillStyle = COLORS.moss;
        octx.fillRect(dx + 5, dy - 5, 1, 5); octx.fillRect(dx + 10, dy - 6, 1, 6);
        octx.fillStyle = COLORS.gold_bright; octx.fillRect(dx + 4, dy - 7, 3, 2);
        octx.fillStyle = COLORS.coral; octx.fillRect(dx + 9, dy - 8, 3, 3);
      } else if (d.kind === "lantern") {
        octx.fillStyle = COLORS.espresso;
        octx.fillRect(dx + 6, dy - 16, 4, 16);
        octx.fillRect(dx + 4, dy - 22, 8, 7);
        octx.fillStyle = COLORS.wood_mid;
        octx.fillRect(dx + 7, dy - 16, 2, 16);
        octx.fillStyle = COLORS.wood_dark;
        octx.fillRect(dx + 4, dy - 22, 8, 2);
        octx.fillRect(dx + 5, dy - 16, 6, 1);
        octx.fillStyle = COLORS.gold_bright;
        octx.fillRect(dx + 5, dy - 20, 6, 4);
        octx.fillStyle = COLORS.white;
        octx.fillRect(dx + 7, dy - 19, 2, 2);
      }
    });

    // 2. Autotiled Terrain (#) & Rope Bridges (=)
    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = c * TILE_SIZE, y = r * TILE_SIZE;
        const hash = (c * 37 + r * 17) & 255;

        if (ch === "#") {
          const above = this.grid[r - 1]?.[c] || "#";
          const below = this.grid[r + 1]?.[c] || "#";
          const left = this.grid[r]?.[c - 1] || "#";
          const right = this.grid[r]?.[c + 1] || "#";

          octx.fillStyle = this.theme.bodyTile;
          octx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          octx.fillStyle = this.theme.bodyDark;
          if (hash % 3 === 0) {
            octx.fillRect(x + 2, y + 6, 5, 3);
            octx.fillRect(x + 10, y + 11, 4, 3);
          } else if (hash % 3 === 1) {
            octx.fillRect(x + 8, y + 5, 5, 4);
            octx.fillRect(x + 3, y + 11, 4, 3);
          }

          if (left !== "#") { octx.fillStyle = this.theme.bodyDark; octx.fillRect(x, y, 2, TILE_SIZE); }
          if (right !== "#") { octx.fillStyle = this.theme.bodyDark; octx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE); }
          if (below !== "#") {
            octx.fillStyle = this.theme.bodyDark; octx.fillRect(x, y + TILE_SIZE - 3, TILE_SIZE, 3);
            if (below === " " && hash % 4 === 0) {
              const vLen = 4 + (hash % 6);
              octx.fillStyle = this.theme === THEMES.cavern ? "#5bb4b8" : this.theme.topTile;
              octx.fillRect(x + 4, y + TILE_SIZE, 2, vLen);
              octx.fillRect(x + 11, y + TILE_SIZE, 2, Math.max(2, vLen - 3));
            }
          }

          if (above !== "#") {
            octx.fillStyle = this.theme.topTile;
            octx.fillRect(x, y, TILE_SIZE, 5);
            octx.fillRect(x + (hash % 5), y + 5, 3, 2);
            octx.fillRect(x + 9 + (hash % 4), y + 5, 3, 2);
            octx.fillStyle = this.theme.topHighlight;
            octx.fillRect(x, y, TILE_SIZE, 2);

            if (above === " " && hash % 2 === 0) {
              octx.fillStyle = this.theme.topHighlight;
              octx.fillRect(x + 3 + (hash % 4), y - 2, 1, 2);
              octx.fillRect(x + 10 + (hash % 3), y - 2, 1, 2);
              if (this.theme === THEMES.cavern && hash % 6 === 0) {
                octx.fillStyle = "#caa8ff";
                octx.fillRect(x + 6, y - 4, 3, 4);
                octx.fillStyle = COLORS.white;
                octx.fillRect(x + 7, y - 4, 1, 2);
              }
            }
          }
        } else if (ch === "=") {
          octx.fillStyle = COLORS.espresso; octx.fillRect(x, y, TILE_SIZE, 5);
          octx.fillStyle = COLORS.wood_mid; octx.fillRect(x, y + 1, TILE_SIZE, 3);
          octx.fillStyle = COLORS.wood_light; octx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 1);
          octx.fillStyle = COLORS.wood_dark;
          octx.fillRect(x + 7, y + 1, 1, 3);
          octx.fillRect(x + 2, y + 4, 2, 3);
          octx.fillRect(x + TILE_SIZE - 4, y + 4, 2, 3);
        }
      });
    });
    return off;
  }

  public render(ctx: CanvasRenderingContext2D, timeSec: number): void {
    const isNight = this.theme === THEMES.ruins || this.theme === THEMES.cavern;

    // 1. Multi-stop atmospheric sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    skyGrad.addColorStop(0, this.theme.skyTop);
    skyGrad.addColorStop(1, this.theme.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    // 2. Twinkling stars OR drifting clouds
    if (isNight) {
      for (let i = 0; i < 36; i++) {
        const sx = Math.round(((i * 97 + 19) % WORLD_W - this.camX * 0.04 + WORLD_W) % WORLD_W);
        const sy = (i * 53 + 11) % (WORLD_H - 95);
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(timeSec * 1.8 + i));
        ctx.fillStyle = `rgba(255, 250, 224, ${tw.toFixed(2)})`;
        ctx.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }
    } else {
      ctx.fillStyle = "rgba(255, 250, 240, 0.45)";
      for (let i = 0; i < 5; i++) {
        const cx = Math.round(((i * 130 - this.camX * 0.08 - timeSec * 5) % (WORLD_W + 90) + WORLD_W + 90) % (WORLD_W + 90)) - 45;
        const cy = 26 + (i % 3) * 22;
        ctx.fillRect(cx, cy, 34, 8);
        ctx.fillRect(cx + 6, cy - 5, 20, 6);
      }
    }

    // 3. Sun / Crescent Moon with soft halo
    const orbX = Math.round(WORLD_W * 0.78 - this.camX * 0.05);
    const orbY = 44;
    if (this.theme !== THEMES.cavern) {
      ctx.fillStyle = isNight ? "rgba(210, 226, 255, 0.14)" : "rgba(255, 240, 180, 0.22)";
      ctx.beginPath(); ctx.arc(orbX, orbY, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isNight ? "#e6efff" : "#fff4c6";
      ctx.beginPath(); ctx.arc(orbX, orbY, 14, 0, Math.PI * 2); ctx.fill();
    }

    // 4. Parallax Ridges
    const cxFar = Math.round(this.camX * 0.16);
    ctx.fillStyle = this.theme.hillFar;
    for (let i = -1; i < 6; i++) {
      const hx = i * 136 - (cxFar % 136);
      ctx.beginPath(); ctx.ellipse(hx + 72, WORLD_H - 36, 86, 56, 0, 0, Math.PI * 2); ctx.fill();
    }
    const cxNear = Math.round(this.camX * 0.34);
    ctx.fillStyle = this.theme.hillNear;
    for (let i = -1; i < 7; i++) {
      const hx = i * 108 - (cxNear % 108);
      ctx.beginPath(); ctx.ellipse(hx + 58, WORLD_H - 18, 68, 42, 0, 0, Math.PI * 2); ctx.fill();
    }

    const mist = ctx.createLinearGradient(0, WORLD_H - 90, 0, WORLD_H);
    mist.addColorStop(0, "rgba(255,255,255,0)");
    mist.addColorStop(1, isNight ? "rgba(24,20,44,0.22)" : "rgba(255,244,218,0.22)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, WORLD_H - 90, WORLD_W, 90);

    // 5. Wind Updrafts (U)
    this.updraftRects.forEach((u) => {
      const ux = Math.round(u.x - this.camX), uy = Math.round(u.y - this.camY);
      ctx.fillStyle = "rgba(182, 244, 240, 0.12)";
      ctx.fillRect(ux + 2, uy, u.w - 4, u.h);
      const off1 = 15 - (Math.floor(timeSec * 28 + u.x) % 16);
      const off2 = (off1 + 8) % 16;
      ctx.fillStyle = "rgba(255, 250, 224, 0.5)";
      ctx.fillRect(ux + 4 + Math.round(Math.sin(timeSec * 6 + u.y) * 2), uy + off1, 1, 4);
      ctx.fillRect(ux + 11 - Math.round(Math.sin(timeSec * 5 + u.y) * 2), uy + off2, 1, 4);
    });

    // 6. Cached Static Terrain & Decor
    ctx.drawImage(this.staticCanvas, -Math.round(this.camX), -Math.round(this.camY));

    // 7. Thorny Brambles (X)
    this.thornRects.forEach((th) => {
      const tx = Math.round(th.x - this.camX), ty = Math.round(th.y - this.camY);
      ctx.fillStyle = "#3c202c";
      ctx.fillRect(tx, ty + 4, th.w, th.h - 4);
      ctx.fillStyle = COLORS.berry;
      ctx.beginPath();
      ctx.moveTo(tx + 1, ty + 5); ctx.lineTo(tx + 3, ty); ctx.lineTo(tx + 5, ty + 5);
      ctx.moveTo(tx + 6, ty + 5); ctx.lineTo(tx + 8, ty - 1); ctx.lineTo(tx + 10, ty + 5);
      ctx.fill();
    });

    // 8. Interactive Entities & Props
    this.portals.forEach((p) => p.render(ctx, this.camX, this.camY, timeSec));
    this.signs.forEach((s) => s.render(ctx, this.camX, this.camY));
    this.shrines.forEach((s) => s.render(ctx, this.camX, this.camY, timeSec));
    this.platforms.forEach((p) => p.render(ctx, this.camX, this.camY));
    this.crumbleTiles.forEach((c) => c.render(ctx, this.camX, this.camY, timeSec));
    this.breakBlocks.forEach((b) => b.render(ctx, this.camX, this.camY));
    this.bouncePads.forEach((pad) => pad.render(ctx, this.camX, this.camY));
    this.airCrystals.forEach((o) => o.render(ctx, this.camX, this.camY, timeSec));
    this.gems.forEach((g) => g.render(ctx, this.camX, this.camY, timeSec));
    this.trinkets.forEach((t) => t.render(ctx, this.camX, this.camY, timeSec));
    this.critters.forEach((c) => c.render(ctx, this.camX, this.camY, timeSec));
    this.trialTotem?.render(ctx, this.camX, this.camY, timeSec);
    this.npcs.forEach((n) => n.render(ctx, this.camX, this.camY, timeSec));

    // 9. Water Caustics
    this.hazardRects.forEach((h) => {
      const hx = Math.round(h.x - this.camX), hy = Math.round(h.y - this.camY);
      const wave = Math.round(Math.sin(timeSec * 3.2 + h.x * 0.12));
      ctx.fillStyle = this.theme.water;
      ctx.fillRect(hx, hy, h.w, h.h);
      ctx.fillStyle = this.theme.waterCrest;
      ctx.fillRect(hx, hy + Math.max(0, wave), h.w, 2);
    });

    // 10. Additive Lighting Glow Pass
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const drawGlow = (sprite: HTMLCanvasElement, wx: number, wy: number, r: number) => {
      ctx.drawImage(sprite, Math.round(wx - this.camX - r), Math.round(wy - this.camY - r), r * 2, r * 2);
    };
    this.decor.forEach((d) => {
      if (d.kind === "lantern") drawGlow(GLOW_GOLD, d.col * TILE_SIZE + 8, d.row * TILE_SIZE - 2, 22 + Math.sin(timeSec * 4 + d.col) * 2);
    });
    this.shrines.forEach((s) => {
      if (s.attuned) drawGlow(GLOW_GOLD, s.x, s.y - 12, 28 + Math.sin(timeSec * 3.5) * 3);
    });
    this.portals.forEach((p) => drawGlow(GLOW_GOLD, p.x + 7, p.y - 13, 18));
    this.airCrystals.forEach((o) => { if (o.cooldown <= 0) drawGlow(GLOW_TEAL, o.x, o.y, 16); });
    this.trinkets.forEach((t) => { if (!t.collected) drawGlow(GLOW_GOLD, t.x, t.y, 20); });
    this.gems.forEach((g) => {
      if (!g.collected && g.value >= 5) drawGlow(GLOW_GOLD, g.x, g.y, 15);
    });
    if (this.theme === THEMES.cavern) {
      this.hazardRects.forEach((h, i) => {
        if (i % 2 === 0) drawGlow(GLOW_PLUM, h.x + 8, h.y + 4, 18);
      });
    }
    ctx.restore();
  }
}
