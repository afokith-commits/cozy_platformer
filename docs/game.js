/**
 * Sproutbound 🌱 — Refactored & Modularized HTML5 Canvas Game Engine
 */

// Global Configuration
const WORLD_W = 480;
const WORLD_H = 270;
const CANVAS_W = 1280;
const CANVAS_H = 720;
const UI_SCALE = CANVAS_W / WORLD_W;

const TILE_SIZE = 16;
const MAX_DT = 0.05;

const GRAVITY = 760.0;
const MAX_FALL_SPEED = 290.0;
const MOVE_ACCEL = 1150.0;
const MOVE_DECEL = 1350.0;
const AIR_ACCEL = 780.0;
const AIR_DECEL = 420.0;
const BASE_MOVE_SPEED = 108.0;
const SPEED_BOOST_MULT = 1.32;

const JUMP_VELOCITY = -238.0;
const DOUBLE_JUMP_VELOCITY = -218.0;
const BOUNCE_PAD_VELOCITY = -315.0;

const COYOTE_TIME = 0.11;
const DASH_SPEED = 260.0;
const DASH_DURATION = 0.14;
const DASH_COOLDOWN = 0.55;

const COLORS = {
  cream: "#faf3e0",
  parchment: "#f2e5c6",
  parchment_dark: "#dbc69e",
  wood_dark: "#4a3429",
  wood_mid: "#704f3b",
  wood_light: "#9a7154",
  espresso: "#2e211c",
  moss: "#6a9e5c",
  moss_light: "#92c679",
  sage: "#7ca890",
  gold: "#f4c04e",
  gold_bright: "#ffe47a",
  coral: "#e57262",
  sky_teal: "#6dbfc2",
  plum: "#84619c",
  berry: "#c45870",
  shadow: "#181216",
  white: "#ffffff"
};

// Web Audio API Synthesizer
class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxVolume = 0.65;
    this.musicVolume = 0.45;
    this.isMusicPlaying = false;
  }

  initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freqStart, freqEnd, duration, type = "triangle", gainVal = 0.25) {
    try {
      this.initCtx();
      if (!this.ctx || this.sfxVolume <= 0.01) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

      const actualGain = gainVal * this.sfxVolume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(actualGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  playArpeggio(notes, stepDur, gainVal = 0.25) {
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.02, stepDur * 1.5, "sine", gainVal);
      }, idx * stepDur * 1000);
    });
  }

  play(name) {
    switch (name) {
      case "jump": this.playTone(280, 520, 0.11, "triangle", 0.26); break;
      case "double_jump": this.playTone(420, 740, 0.12, "sine", 0.25); break;
      case "dash": this.playTone(620, 220, 0.13, "triangle", 0.24); break;
      case "land": this.playTone(160, 95, 0.06, "triangle", 0.18); break;
      case "bounce": this.playTone(240, 680, 0.16, "sine", 0.28); break;
      case "gem": this.playArpeggio([659.25, 880.0], 0.05, 0.25); break;
      case "trinket": this.playArpeggio([523.25, 659.25, 783.99, 1046.5], 0.075, 0.30); break;
      case "shrine": this.playArpeggio([392.0, 523.25, 659.25, 783.99], 0.09, 0.28); break;
      case "warp": this.playArpeggio([783.99, 659.25, 523.25, 1046.5], 0.065, 0.28); break;
      case "buy": this.playArpeggio([587.33, 739.99, 880.0], 0.06, 0.28); break;
      case "respawn": this.playTone(340, 210, 0.18, "sine", 0.22); break;
    }
  }

  startMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.scheduleCozyMusicLoop();
  }

  scheduleCozyMusicLoop = () => {
    if (!this.isMusicPlaying) return;
    this.initCtx();
    if (this.ctx && this.musicVolume > 0.01) {
      const chords = [
        [174.61, 220.00, 261.63, 329.63],
        [146.83, 220.00, 261.63, 349.23],
        [116.54, 174.61, 220.00, 293.66],
        [130.81, 174.61, 261.63, 392.00]
      ];
      const chord = chords[Math.floor(Math.random() * chords.length)];
      chord.forEach((freq) => {
        this.playTone(freq, freq * 1.001, 2.8, "sine", 0.06 * this.musicVolume);
      });
    }
    setTimeout(this.scheduleCozyMusicLoop, 3200);
  };
}

// Save Manager
class GameProgress {
  constructor() {
    this.gems = 0;
    this.collected_gems = [];
    this.trinkets = [];
    this.unlocked_badges = [];
    this.equipped_badges = [];
    this.unlocked_shrines = [];
    this.flags = {};
    this.current_level = "meadow_hub";
    this.spawn_id = "start";
    this.load();
  }

  isEquipped(badgeId) { return this.equipped_badges.includes(badgeId); }
  isUnlocked(badgeId) { return this.unlocked_badges.includes(badgeId); }
  hasTrinket(trinketId) { return this.trinkets.includes(trinketId); }

  save() {
    try { localStorage.setItem("sproutbound_save", JSON.stringify(this)); } catch(e){}
  }

  load() {
    try {
      const dataStr = localStorage.getItem("sproutbound_save");
      if (dataStr) Object.assign(this, JSON.parse(dataStr));
    } catch(e){}
  }
}

// Data Definitions
const ITEMS_DATA = {
  abilities: {
    feather_badge: { name: "Feather Badge", price: 8, description: "Double Jump! Reach high treetops." },
    breeze_dash: { name: "Breeze Dash", price: 12, description: "Press [Shift] or [X] to dash forward." },
    clover_boots: { name: "Clover Boots", price: 10, description: "Increases movement speed by 30%." },
    magnet_charm: { name: "Magnet Charm", price: 14, description: "Pulls nearby gems to satchel." }
  },
  trinkets: {
    dewdrop_bell: { name: "Dewdrop Bell", description: "Rings softly in morning mist." },
    mossy_compass: { name: "Mossy Compass", description: "Points toward warm tea." },
    starlight_lantern: { name: "Starlight Lantern", description: "Humming with twilight." },
    fossil_acorn: { name: "Amber Acorn", description: "Preserved prehistoric acorn." }
  }
};

const DIALOGUES_DATA = {
  grandma_willow: {
    start: "greeting",
    nodes: {
      greeting: {
        text: "Good day, little sprout! Press [Tab] to view your backpack, or [M] for the shrine map.",
        choices: [
          { label: "Ask about Gems", next: "about_gems" },
          { label: "I'm ready to explore!", next: "gift" }
        ]
      },
      about_gems: {
        text: "Shiny gems dot the cliffs. Pip trades them for handy badges—like a Feather Badge for Double Jumping!",
        choices: [{ label: "Thanks!", next: "gift" }]
      },
      gift: {
        text: "Here—take 5 gems from my tea jar so you can try out Pip's shop! Stay cozy out there!",
        effects: [{ type: "set_flag", flag: "willow_gift", value: true }, { type: "give_gems", amount: 5 }, { type: "save" }],
        choices: [{ label: "Thank you!", close: true }]
      }
    }
  },
  pip_merchant: {
    start: "welcome",
    nodes: {
      welcome: {
        text: "Ribbit! Welcome to Pip's Traveling Satchel! I've got Feather Badges, Breeze Dashes, and Clover Boots!",
        choices: [{ label: "Browse Shop", open_shop: true }, { label: "Maybe later", close: true }]
      }
    }
  },
  bramble_fox: {
    start: "intro",
    nodes: {
      intro: {
        text: "Ahoy, wanderer! I'm sketching the Canopy Cliffs. Don't miss the Canopy Shrine up on the middle bough!",
        choices: [{ label: "Good luck mapping!", close: true }]
      }
    }
  },
  luma_spirit: {
    start: "whisper",
    nodes: {
      whisper: {
        text: "Hush, warm little sprout... The Sunken Ruins glow brightest when travelers carry our lost Starlight Lantern.",
        choices: [{ label: "I'll look for it", close: true }]
      }
    }
  }
};

const LEVELS_DATA = {
  meadow_hub: {
    id: "meadow_hub", name: "Meadow Hub", theme: "meadow", ambient_type: "fireflies",
    grid: [
      "#############################################",
      "#                                           #",
      "#                                           #",
      "#            *                              #",
      "#          #####                            #",
      "#                                           #",
      "#                ===    ===                 #",
      "#                                           #",
      "#  ===                   ===       =======  #",
      "#       ===                                 #",
      "#           G   G           ^               #",
      "#          =======         ===   G    G     #",
      "#   P             G     G       ===  ===    #",
      "########################~~~##################",
      "#############################################"
    ],
    spawns: { start: [4, 12], shrine: [7, 12], from_canopy: [41, 8], from_ruins: [39, 12] },
    shrines: [{ shrine_id: "shrine_meadow", name: "Meadow Hearth Shrine", col: 6, row: 12 }],
    npcs: [
      { npc_id: "grandma_willow", name: "Grandma Willow", dialogue_id: "grandma_willow", col: 11, row: 12, style: "willow" },
      { npc_id: "pip_merchant", name: "Pip the Merchant", dialogue_id: "pip_merchant", col: 20, row: 12, style: "frog" }
    ],
    portals: [
      { target_level: "canopy_cliffs", target_spawn: "from_meadow", label: "To Canopy Cliffs", col: 41, row: 8 },
      { target_level: "sunken_ruins", target_spawn: "from_meadow", label: "To Sunken Ruins", col: 42, row: 12 }
    ],
    trinkets: [{ trinket_id: "dewdrop_bell", col: 14, row: 3 }]
  },
  canopy_cliffs: {
    id: "canopy_cliffs", name: "Canopy Cliffs", theme: "canopy", ambient_type: "leaves",
    grid: [
      "##############################################",
      "#                                            #",
      "#                                     *      #",
      "#                                   ######   #",
      "#             G   G                          #",
      "#            =======        ===              #",
      "#      ===                        ===        #",
      "#                     ===                    #",
      "#                  #######                   #",
      "#                     ^                G  G  #",
      "#    ^       G   ===       G          ###### #",
      "#   ===     ===           ===                #",
      "#     G                             ^        #",
      "#   #####          ===             ===       #",
      "#                                            #",
      "#########~~~############~~~###################",
      "##############################################"
    ],
    spawns: { start: [3, 14], from_meadow: [3, 14], shrine: [20, 7], from_ruins: [42, 9] },
    shrines: [{ shrine_id: "shrine_canopy", name: "Canopy Bough Shrine", col: 20, row: 7 }],
    npcs: [{ npc_id: "bramble_fox", name: "Bramble the Fox", dialogue_id: "bramble_fox", col: 7, row: 14, style: "fox" }],
    portals: [
      { target_level: "meadow_hub", target_spawn: "from_canopy", label: "Back to Meadow Hub", col: 2, row: 14 },
      { target_level: "sunken_ruins", target_spawn: "from_canopy", label: "Descend to Sunken Ruins", col: 43, row: 9 }
    ],
    trinkets: [{ trinket_id: "mossy_compass", col: 40, row: 2 }]
  },
  sunken_ruins: {
    id: "sunken_ruins", name: "Sunken Ruins", theme: "ruins", ambient_type: "spores",
    grid: [
      "##############################################",
      "#                                            #",
      "#       *                                    #",
      "#     ######                         ######  #",
      "#               ===                          #",
      "#      ===               ===      ===        #",
      "#                                            #",
      "#   ^                                        #",
      "#  ===           G   G               G  G    #",
      "#               =======     ===     ======   #",
      "#     ===                                    #",
      "#                        ^       G           #",
      "#   G    G              ===     ===    *     #",
      "############~~~####~~~#################~~~####",
      "##############################################"
    ],
    spawns: { start: [3, 12], from_meadow: [3, 12], shrine: [16, 12], from_canopy: [40, 4] },
    shrines: [{ shrine_id: "shrine_ruins", name: "Twilight Ruins Shrine", col: 16, row: 12 }],
    npcs: [{ npc_id: "luma_spirit", name: "Luma the Spirit", dialogue_id: "luma_spirit", col: 18, row: 12, style: "spirit" }],
    portals: [
      { target_level: "meadow_hub", target_spawn: "from_ruins", label: "Back to Meadow Hub", col: 2, row: 12 },
      { target_level: "canopy_cliffs", target_spawn: "from_ruins", label: "Up to Canopy Cliffs", col: 42, row: 4 }
    ],
    trinkets: [
      { trinket_id: "starlight_lantern", col: 10, row: 2 },
      { trinket_id: "fossil_acorn", col: 37, row: 12 }
    ]
  }
};

// Particle Engine
class ParticleSystem {
  constructor() {
    this.particles = [];
    this.ambient = [];
  }

  seedAmbient(w, h, type) {
    this.ambient = [];
    for (let i = 0; i < 24; i++) {
      this.ambient.push({
        x: Math.random() * w, y: Math.random() * h,
        phase: Math.random() * Math.PI * 2,
        speed: 8 + Math.random() * 10, size: 1 + Math.random() * 1.2
      });
    }
  }

  spawnBurst(x, y, color, count = 10, speed = 65) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * 0.35 + Math.random() * speed * 0.65;
      const life = 0.25 + Math.random() * 0.30;
      this.particles.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life, maxLife: life, size: 2, color, grav: 40
      });
    }
  }

  update(dt, w, h) {
    this.particles.forEach((p) => {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);

    this.ambient.forEach((a) => {
      a.phase += dt * 1.4;
      a.x += Math.cos(a.phase * 0.8) * 9 * dt;
      a.y += Math.sin(a.phase * 1.1) * 7 * dt;
      a.x = (a.x + w) % Math.max(1, w);
      a.y = (a.y + h) % Math.max(1, h);
    });
  }

  render(ctx, camX, camY) {
    this.ambient.forEach((a) => {
      ctx.fillStyle = COLORS.gold_bright;
      ctx.beginPath();
      ctx.arc(Math.round(a.x - camX), Math.round(a.y - camY), a.size, 0, Math.PI * 2);
      ctx.fill();
    });
    this.particles.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(Math.round(p.x - camX), Math.round(p.y - camY), p.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

// Player Entity
class Player {
  constructor(x, y) {
    this.width = 10;
    this.height = 14;
    this.placeAt(x, y);
    this.facing = 1;
    this.onGround = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.airJumpsLeft = 0;
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.dashDir = 1;
  }

  placeAt(x, y) {
    this.x = x - this.width / 2;
    this.y = y - this.height;
    this.vx = 0;
    this.vy = 0;
    this.lastSafe = { x: this.x, y: this.y };
  }

  update(dt, keys, level, progress, audio, particles) {
    let moveDir = 0;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) moveDir -= 1;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) moveDir += 1;

    if (moveDir !== 0 && this.dashTimer <= 0) this.facing = moveDir;

    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    const maxSpeed = BASE_MOVE_SPEED * (progress.isEquipped("clover_boots") ? SPEED_BOOST_MULT : 1.0);

    if (moveDir !== 0) {
      const targetVx = moveDir * maxSpeed;
      this.vx += (targetVx - this.vx) * Math.min(1.0, 15.0 * dt);
    } else {
      this.vx *= Math.max(0, 1.0 - 20.0 * dt);
    }

    this.vy = Math.min(MAX_FALL_SPEED, this.vy + GRAVITY * dt);

    if (this.jumpBufferTimer > 0 && (this.onGround || this.coyoteTimer > 0)) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      audio.play("jump");
    }

    // Move X
    this.x += this.vx * dt;
    level.solidRects.forEach((r) => {
      if (this.intersects(r)) {
        if (this.vx > 0) this.x = r.x - this.width;
        else if (this.vx < 0) this.x = r.x + r.w;
        this.vx = 0;
      }
    });

    // Move Y
    this.y += this.vy * dt;
    this.onGround = false;

    level.solidRects.forEach((r) => {
      if (this.intersects(r)) {
        if (this.vy > 0) {
          this.y = r.y - this.height;
          this.vy = 0;
          this.onGround = true;
        } else if (this.vy < 0) {
          this.y = r.y + r.h;
          this.vy = 0;
        }
      }
    });

    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
      this.airJumpsLeft = progress.isEquipped("feather_badge") ? 1 : 0;
      this.lastSafe = { x: this.x, y: this.y };
    }

    if (this.y > level.pixelH + 18) {
      this.x = this.lastSafe.x;
      this.y = this.lastSafe.y;
      this.vx = 0;
      this.vy = 0;
      audio.play("respawn");
    }
  }

  intersects(r) {
    return this.x < r.x + r.w && this.x + this.width > r.x && this.y < r.y + r.h && this.y + this.height > r.y;
  }

  render(ctx, camX, camY) {
    const cx = Math.round(this.x + this.width / 2 - camX);
    const bottomY = Math.round(this.y + this.height - camY);
    const x = cx - 6;
    const y = bottomY - 14;

    ctx.fillStyle = COLORS.sage;
    ctx.fillRect(x + 1, y + 4, 10, 10);
    ctx.fillStyle = COLORS.moss;
    ctx.fillRect(x, y + 1, 12, 6);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(cx + (this.facing > 0 ? 1 : -4), y + 4, 5, 4);
    ctx.fillStyle = COLORS.espresso;
    ctx.fillRect(cx + (this.facing > 0 ? 2 : -3), y + 5, 2, 2);
  }
}

// Level Engine
class Level {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.grid = data.grid;
    this.rows = this.grid.length;
    this.cols = Math.max(...this.grid.map((r) => r.length));
    this.pixelW = this.cols * TILE_SIZE;
    this.pixelH = this.rows * TILE_SIZE;

    this.solidRects = [];
    this.gems = [];
    this.trinkets = [];
    this.npcs = [];
    this.portals = [];
    this.shrines = [];
    this.spawns = {};

    this.parseGrid();
    this.loadObjects(data);
    this.camX = 0;
    this.camY = 0;
  }

  parseGrid() {
    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;
        if (ch === "#") this.solidRects.push({ x, y, w: TILE_SIZE, h: TILE_SIZE });
        else if (ch === "G" || ch === "*") this.gems.push({ uid: `${this.id}:${c},${r}`, x: x + 8, y: y + 8, value: ch === "*" ? 5 : 1, collected: false });
      });
    });
  }

  loadObjects(data) {
    Object.entries(data.spawns || {}).forEach(([sid, coords]) => {
      this.spawns[sid] = [coords[0] * TILE_SIZE + TILE_SIZE / 2, coords[1] * TILE_SIZE + TILE_SIZE];
    });
    (data.portals || []).forEach((p) => this.portals.push({ ...p, x: p.col * TILE_SIZE + 8, y: (p.row + 1) * TILE_SIZE }));
    (data.npcs || []).forEach((n) => this.npcs.push({ ...n, x: n.col * TILE_SIZE + 8, y: (n.row + 1) * TILE_SIZE }));
    (data.shrines || []).forEach((s) => this.shrines.push({ ...s, x: s.col * TILE_SIZE + 8, y: (s.row + 1) * TILE_SIZE }));
    (data.trinkets || []).forEach((t) => this.trinkets.push({ ...t, x: t.col * TILE_SIZE + 8, y: t.row * TILE_SIZE + 8, collected: false }));
  }

  updateCamera(targetX, targetY, facing, dt) {
    const desiredX = Math.max(0, Math.min(this.pixelW - WORLD_W, targetX + facing * 20 - WORLD_W / 2));
    const desiredY = Math.max(0, Math.min(this.pixelH - WORLD_H, targetY - WORLD_H * 0.5));
    this.camX += (desiredX - this.camX) * dt * 8;
    this.camY += (desiredY - this.camY) * dt * 7;
  }

  render(ctx) {
    ctx.fillStyle = "#92ced6";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);

    this.grid.forEach((line, r) => {
      line.split("").forEach((ch, c) => {
        const x = Math.round(c * TILE_SIZE - this.camX);
        const y = Math.round(r * TILE_SIZE - this.camY);
        if (ch === "#") {
          ctx.fillStyle = "#6aa85c";
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        }
      });
    });

    this.gems.forEach((g) => {
      if (g.collected) return;
      ctx.fillStyle = g.value >= 5 ? COLORS.gold : COLORS.sky_teal;
      ctx.beginPath();
      ctx.arc(Math.round(g.x - this.camX), Math.round(g.y - this.camY), 4, 0, Math.PI * 2);
      ctx.fill();
    });

    this.trinkets.forEach((t) => {
      if (t.collected) return;
      ctx.fillStyle = COLORS.gold_bright;
      ctx.beginPath();
      ctx.arc(Math.round(t.x - this.camX), Math.round(t.y - this.camY), 5, 0, Math.PI * 2);
      ctx.fill();
    });

    this.npcs.forEach((n) => {
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(Math.round(n.x - this.camX - 6), Math.round(n.y - this.camY - 12), 12, 12);
    });
  }
}

// Master Game Controller
class SproutboundGame {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.audio = new AudioManager();
    this.progress = new GameProgress();
    this.particles = new ParticleSystem();

    this.level = new Level(LEVELS_DATA[this.progress.current_level] || LEVELS_DATA.meadow_hub);
    const spawn = this.level.spawns[this.progress.spawn_id] || [64, 128];
    this.player = new Player(spawn[0], spawn[1]);

    this.keys = {};
    this.lastTime = 0;

    window.addEventListener("keydown", (e) => {
      this.audio.startMusic();
      this.keys[e.key] = true;
      if (e.key === " ") this.player.jumpBufferTimer = 0.11;
    });
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));

    requestAnimationFrame(this.loop);
  }

  loop = (timestamp) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(MAX_DT, (timestamp - this.lastTime) / 1000.0);
    this.lastTime = timestamp;

    this.player.update(dt, this.keys, this.level, this.progress, this.audio, this.particles);
    this.level.updateCamera(this.player.x, this.player.y, this.player.facing, dt);
    this.particles.update(dt, this.level.pixelW, this.level.pixelH);

    // Pickups
    const px = this.player.x + this.player.width / 2;
    const py = this.player.y + this.player.height / 2;

    this.level.gems.forEach((g) => {
      if (!g.collected && Math.hypot(px - g.x, py - g.y) < 18) {
        g.collected = true;
        this.progress.gems += g.value;
        this.progress.save();
        this.audio.play("gem");
      }
    });

    this.level.trinkets.forEach((t) => {
      if (!t.collected && Math.hypot(px - t.x, py - t.y) < 18) {
        t.collected = true;
        this.progress.trinkets.push(t.trinket_id);
        this.progress.save();
        this.audio.play("trinket");
      }
    });

    // Render
    this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.ctx.save();
    this.ctx.scale(UI_SCALE, UI_SCALE);

    this.level.render(this.ctx);
    this.player.render(this.ctx, this.level.camX, this.level.camY);
    this.particles.render(this.ctx, this.level.camX, this.level.camY);

    this.ctx.restore();

    // HUD
    this.ctx.fillStyle = COLORS.gold;
    this.ctx.font = "bold 22px system-ui, sans-serif";
    this.ctx.fillText(`💎 Gems: ${this.progress.gems}`, 24, 38);
    this.ctx.fillText(`🔔 Trinkets: ${this.progress.trinkets.length}/4`, 200, 38);

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener("DOMContentLoaded", () => {
  new SproutboundGame();
});
