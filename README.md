# 🌱 Sproutbound

> A cozy 4-chapter micro-platformer written in TypeScript & HTML5 Canvas, running natively in any browser with zero runtime dependencies.

---

## 🌐 Play Live in Browser

Play directly in your browser:  
**`https://afokith-commits.github.io/cozy_platformer/`**

---

## 🎮 Game Features & Controls

Explore all 4 regions of the valley: **Meadow Hub**, **Canopy Cliffs**, **Sunken Ruins**, and the **Sunlit Spire**!

### Key Bindings

| Action | Controls |
|---|---|
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Jump & Leaf Glider** | <kbd>Space</kbd> / <kbd>W</kbd> / <kbd>↑</kbd> *(Hold mid-air to float with Leaf Glider)* |
| **Breeze Dash** | <kbd>Shift</kbd> / <kbd>X</kbd> |
| **Interact (NPCs, Signs, Shrines)** | <kbd>E</kbd> or <kbd>Enter</kbd> |
| **Traveler's Backpack** | <kbd>Tab</kbd> or <kbd>I</kbd> |
| **World Shrine Map** | <kbd>M</kbd> |
| **Campaign Journal** | <kbd>J</kbd> |
| **Pause & Audio Settings** | <kbd>Esc</kbd> |

---

## 🛠️ Local Development & Building

1. **Install dependencies (TypeScript compiler):**
   ```bash
   npm install typescript --save-dev
   ```

2. **Compile TypeScript (`src/` → `docs/`):**
   ```bash
   npx tsc
   ```

3. **Serve locally:**
   ```bash
   npx serve docs
   # or
   python3 -m http.server
   ```
   Open `http://localhost:3000/docs/` in your browser.

---

## 🚀 Automated GitHub Pages CI/CD

The repository includes a GitHub Action ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that automatically compiles TypeScript and deploys `/docs` directly to GitHub Pages on every push to `main`.
