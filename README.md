# Sproutbound 🌱

> A cozy micro-platformer built with Pygame & Python, playable natively on Desktop and directly in the browser via GitHub Pages & WebAssembly (Pygbag).

---

## 🎮 Play Live on GitHub Pages

Once deployed, play Sproutbound in your browser at:
**`https://afokith-commits.github.io/cozy_platformer/`**

---

## ✨ Features

- **Cozy Micro-Platformer Gameplay**: Fluid physics, wall jumps, dash mechanics, and atmospheric particle effects.
- **Multiple Interconnected Regions**: Explore *Canopy Cliffs*, *Meadow Hub*, and *Sunken Ruins*.
- **NPC Dialogues & Shops**: Interact with Bramble the Fox Cartographer, Willow the Badger Shopkeeper, and collect rare trinkets.
- **Audio & Ambiance**: Procedurally synthesized dynamic sound effects and cozy background music track.
- **Cross-Platform & Web Ready**: Runs locally on Windows/macOS/Linux via Pygame and in Web Assembly via Pygbag.

---

## 🕹️ Controls

| Action | Key / Control |
|---|---|
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Jump / Wall Jump** | <kbd>Space</kbd> or <kbd>W</kbd> / <kbd>↑</kbd> |
| **Interact (NPC / Shrine)** | <kbd>E</kbd> |
| **Open Inventory** | <kbd>Tab</kbd> |
| **Pause Menu** | <kbd>Esc</kbd> |

---

## 🚀 How to Run Locally

### Requirements
- **Python 3.9+**
- **Pygame** (or `pygame-ce`)

### Installation & Launch

```bash
# Clone the repository
git clone https://github.com/afokith-commits/cozy_platformer.git
cd cozy_platformer

# Install dependencies
pip install -r requirements.txt

# Launch the game
python main.py
```

---

## 🌐 Deploying to GitHub Pages

This project includes a **GitHub Actions CI/CD workflow** (`.github/workflows/deploy.yml`) that automatically builds the game into WebAssembly (WASM/HTML5) using **Pygbag** on every push to the `main` branch.

### One-Time Setup in GitHub Repository Settings:
1. Go to your GitHub repository: `https://github.com/afokith-commits/cozy_platformer`
2. Click **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions**.
4. Push your changes to `main`. The workflow will automatically build and publish your game to GitHub Pages!

---

## 📁 Project Structure

```
cozy_platformer/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions workflow for Web/GitHub Pages
├── core/
│   ├── audio.py            # Synthesized audio manager
│   ├── save.py             # Game state save/load manager
│   ├── state.py            # State manager machine
│   └── tween.py            # Animation tweening utilities
├── data/
│   ├── dialogues.json      # NPC dialogue data
│   ├── items.json          # Items & trinkets catalog
│   └── levels/             # Tilemap level JSON files
├── states/                 # Game states (Play, Pause, Dialogue, Inventory, Shop, Map)
├── ui/                     # UI components (HUD, Widgets, Prompts)
├── world/                  # Game entities, tilemaps, physics, & player logic
├── main.py                 # Async entry point (Compatible with Desktop & Web)
├── pyproject.toml          # Project configuration & metadata
├── requirements.txt        # Python package dependencies
└── settings.py             # Game configuration constants
```

---

## 📜 License

MIT License. Free to use, modify, and distribute.
