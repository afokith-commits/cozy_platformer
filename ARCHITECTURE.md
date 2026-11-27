# Sproutbound Architecture & Engine Specification 🌱

> **Sproutbound** is a zero-dependency HTML5 Canvas 2D game engine written in TypeScript, optimized for WebAssembly-free browser execution, GitHub Pages hosting, and desktop Python compatibility.

---

## 🏛️ System Overview

The engine utilizes a **Dual-Viewport Architecture**:
- **World Rendering**: 480 × 270 native pixel-art world space (`WORLD_W` × `WORLD_H`).
- **Canvas Display**: 1280 × 720 display canvas (`CANVAS_W` × `CANVAS_H`), offering a `2.666...` crisp pixel-scaling factor (`UI_SCALE`) with disabled image smoothing (`imageSmoothingEnabled = false`).
- **Audio Engine**: Pure Web Audio API procedural sound synthesizer—no external `.wav` or `.mp3` assets required.
- **Persistence**: `localStorage` JSON save state serialization.

---

## 📁 Module Directory Structure

```
cozy_platformer/
├── src/
│   ├── types.ts           # Core interfaces (Items, Dialogues, Levels, Quests)
│   ├── settings.ts        # Constants, resolution scaling, physics, palette
│   ├── audio.ts           # Web Audio API Synthesizer (SFX & Ambient Music)
│   ├── save.ts            # GameProgress state & LocalStorage manager
│   ├── particles.ts       # Particle System (puffs, trails, bursts, fireflies)
│   ├── entities.ts        # World Entities (Gems, Trinkets, Shrines, NPCs, Portals)
│   ├── player.ts          # Sub-pixel platformer physics, coyote time, dash, glider
│   ├── level.ts           # Tilemap parser, themes, parallax scrolling, camera
│   ├── ui.ts              # HUD, Dialogue Overlay, Satchel, Shrine Map, Shop
│   └── game.ts            # Master Game Loop & Event Dispatcher
├── docs/
│   ├── index.html         # GitHub Pages HTML5 canvas container
│   └── game.js            # Compiled zero-dependency web deployment bundle
└── index.html             # Root web fallback launcher
```

---

## ⚙️ Core Subsystems

### 1. Physics & Collision Engine ([src/player.ts](file:///C:/Users/AEGIS/AndroidStudioProjects/Game/cozy_platformer/src/player.ts))
- **AABB Tilemap Collision**: Axis-Aligned Bounding Box collision detection with independent **X** and **Y** axis resolution passes.
- **One-Way Platforms**: Bridge tiles (`=`) resolved only when the player's previous bottom position is above the platform top surface (`prevBottom <= plat.y + 3`).
- **Platforming Juice**:
  - **Coyote Time** (`0.11s`): Grace period allowing jump execution shortly after walking off ledges.
  - **Jump Buffering** (`0.11s`): Stores jump inputs pressed right before touching the ground.
  - **Squash & Stretch**: Dynamic width/height scale damping on land, jump, dash, and bounce pads.
  - **Zero-Stress Respawns**: Records `lastSafePos` when standing on solid ground and respawns safely without hard game overs.

### 2. Tilemap & Camera Engine ([src/level.ts](file:///C:/Users/AEGIS/AndroidStudioProjects/Game/cozy_platformer/src/level.ts))
- **Grid Parser**: Parses 16×16 tile strings (`#` solid tile, `=` one-way, `~` water hazard, `^` bounce pad, `G`/`*` gems, `P` spawn point).
- **Parallax Background**: Multi-layered hill curves that scroll at `18%` and `36%` of camera speed for atmospheric depth.
- **Smooth Exponential Damping Camera**: Camera position smoothly damps toward player target using exponential decay:
  $$\text{camX} \leftarrow \text{camX} + (\text{desiredX} - \text{camX}) \times \text{dt} \times 7.5$$

### 3. Procedural Web Audio API ([src/audio.ts](file:///C:/Users/AEGIS/AndroidStudioProjects/Game/cozy_platformer/src/audio.ts))
- **SFX Generator**: Uses `OscillatorNode` frequency ramps (`exponentialRampToValueAtTime`) and `GainNode` envelopes for retro jump, dash, land, and pickup sounds.
- **Ambient Music Synthesizer**: Generates continuous background chord progressions (`Fmaj7` → `Dm7` → `Bbmaj7` → `Csus4`) with soft sine oscillators and pentatonic bell chimes.

### 4. Dialogue & Quest Machine ([src/ui.ts](file:///C:/Users/AEGIS/AndroidStudioProjects/Game/cozy_platformer/src/ui.ts))
- **Data-Driven Dialogue Trees**: Evaluates conditional entry rules (`trinket_count_gte`, `has_trinket`, `flag`, `not_flag`) to present dynamic NPC conversations.
- **Effect Execution Engine**: Executes dialogue choice effects seamlessly (`set_flag`, `give_gems`, `give_badge`, `save`).

---

## 🎨 Render Pipeline Sequence

```
1. Clear Canvas (1280x720)
2. Begin 480x270 Viewport Scale (UI_SCALE = 2.6666...)
   ├── Sky Gradient & Sun/Moon
   ├── Parallax Background Hills (Far & Near)
   ├── Tilemap Surfaces & Water Hazards
   ├── Decorative Props (Trees, Pillars, Lanterns)
   ├── Interactive Entities (Shrines, Portals, Signs, NPCs, Gems, Trinkets)
   ├── Player Character & Fluttering Scarf
   └── Particle Effects (Dust, Sparkle Trails, Fireflies)
3. End Viewport Scale
4. Render 1280x720 Crisp UI Layer (HUD, Dialogue Modals, Backpack, Map, Shop)
```

---

## 📄 License
MIT License. Free to use, modify, and distribute.
