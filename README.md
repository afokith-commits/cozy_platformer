# Sproutbound 🌱

> A cozy micro-platformer built with Pygame & Python, fully migrated to run directly in the browser via WebAssembly (Pygbag) & GitHub Pages!

---

## 🌐 Play Live in Browser (Website Deployment)

Your game is fully migrated to WebAssembly and ready to play in any web browser at:  
**`https://afokith-commits.github.io/cozy_platformer/`**

---

## ⚙️ 1-Minute GitHub Pages Setup (Fixes 404 Error)

Because GitHub Pages needs to know where `index.html` lives, follow these 2 quick steps on GitHub:

1. **Push your changes to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy web version to /docs"
   git push origin main
   ```

2. **Set GitHub Pages to `/docs`**:
   - Go to your repo: `https://github.com/afokith-commits/cozy_platformer`
   - Click **Settings** → **Pages**.
   - Under **Build and deployment**:
     - **Source**: `Deploy from a branch`
     - **Branch**: `main`
     - **Folder**: `/docs`
   - Click **Save**.

Within 1-2 minutes, your website will be live and your friends can open the link and play directly in their browser!

---

## 🎮 Controls

| Action | Key / Control |
|---|---|
| **Move Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> or <kbd>←</kbd> / <kbd>→</kbd> |
| **Jump / Wall Jump** | <kbd>Space</kbd> or <kbd>W</kbd> / <kbd>↑</kbd> |
| **Interact (NPC / Shrines)** | <kbd>E</kbd> |
| **Open Inventory** | <kbd>Tab</kbd> |
| **Pause Menu** | <kbd>Esc</kbd> |

---

## 💻 Optional: Running Locally

If you or your friend also want to play locally on desktop:

- **Windows**: Double-click `run_game.bat` (auto-installs `pygame` and launches).
- **Mac / Linux**: Run `./run_game.sh` or `python3 main.py`.
