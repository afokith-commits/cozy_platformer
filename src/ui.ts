/**
 * UI Systems (HUD, Dialogue Box, Inventory, Shrine Map, Shop)
 */

import { DIALOGUES_DATA, DialogueChoice, DialogueNode, DialogueTree, ITEMS_DATA } from "./data.js";
import { GameProgress } from "./save.js";
import { COLORS, CANVAS_W, CANVAS_H } from "./settings.js";

export class UIOverlay {
  public dialogueActive = false;
  public currentSpeaker = "";
  public currentText = "";
  public currentChoices: DialogueChoice[] = [];
  public selectedChoiceIdx = 0;
  private dialogueNode: DialogueNode | null = null;
  private dialogueTree: DialogueTree | null = null;

  public inventoryOpen = false;
  public shopOpen = false;
  public mapOpen = false;

  constructor() {}

  public startDialogue(dialogueId: string, progress: GameProgress): boolean {
    const tree = DIALOGUES_DATA[dialogueId];
    if (!tree) return false;

    this.dialogueTree = tree;
    let startNode = tree.start;

    if (tree.entry_rules) {
      for (const rule of tree.entry_rules) {
        const cond = rule.condition;
        let pass = true;
        if (cond.trinket_count_gte !== undefined && progress.trinkets.length < cond.trinket_count_gte) pass = false;
        if (cond.has_trinket && !progress.hasTrinket(cond.has_trinket)) pass = false;
        if (cond.flag && !progress.flags[cond.flag]) pass = false;
        if (cond.not_flag && progress.flags[cond.not_flag]) pass = false;

        if (pass) {
          startNode = rule.node;
          break;
        }
      }
    }

    this.showNode(startNode, progress);
    this.dialogueActive = true;
    return true;
  }

  public showNode(nodeKey: string, progress: GameProgress): void {
    if (!this.dialogueTree) return;
    const node = this.dialogueTree.nodes[nodeKey];
    if (!node) return;

    this.dialogueNode = node;
    this.currentText = node.text;
    this.currentChoices = node.choices || [];
    this.selectedChoiceIdx = 0;

    if (node.effects) {
      node.effects.forEach((eff) => {
        if (eff.type === "set_flag" && eff.flag) progress.flags[eff.flag] = !!eff.value;
        else if (eff.type === "give_gems" && eff.amount) progress.gems += eff.amount;
        else if (eff.type === "give_badge" && eff.badge_id) {
          if (!progress.isUnlocked(eff.badge_id)) progress.unlocked_badges.push(eff.badge_id);
          if (!progress.isEquipped(eff.badge_id)) progress.equipped_badges.push(eff.badge_id);
        }
        else if (eff.type === "save") progress.save();
      });
    }
  }

  public selectChoice(idx: number, progress: GameProgress): { close?: boolean; openShop?: boolean } {
    if (!this.currentChoices[idx]) return { close: true };
    const choice = this.currentChoices[idx];

    if (choice.close) {
      this.dialogueActive = false;
      return { close: true };
    }
    if (choice.open_shop) {
      this.dialogueActive = false;
      this.shopOpen = true;
      return { openShop: true };
    }
    if (choice.next) {
      this.showNode(choice.next, progress);
    }
    return {};
  }

  public render(ctx: CanvasRenderingContext2D, progress: GameProgress, levelName: string, promptText: string | null): void {
    // HUD
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`💎 Gems: ${progress.gems}`, 24, 38);

    ctx.fillStyle = COLORS.sky_teal;
    ctx.fillText(`🔔 Trinkets: ${progress.trinkets.length}/4`, 180, 38);

    ctx.fillStyle = COLORS.cream;
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`📍 ${levelName}`, CANVAS_W - 220, 38);

    // Interaction Prompt
    if (promptText && !this.dialogueActive && !this.inventoryOpen && !this.shopOpen && !this.mapOpen) {
      const w = 320;
      const x = (CANVAS_W - w) / 2;
      const y = CANVAS_H - 80;

      ctx.fillStyle = "rgba(46, 33, 28, 0.88)";
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, 44, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.cream;
      ctx.font = "16px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Press [E] to ${promptText}`, CANVAS_W / 2, y + 27);
      ctx.textAlign = "left";
    }

    // Dialogue Overlay
    if (this.dialogueActive) {
      const boxW = 860;
      const boxH = 220;
      const boxX = (CANVAS_W - boxW) / 2;
      const boxY = CANVAS_H - boxH - 40;

      ctx.fillStyle = "rgba(46, 33, 28, 0.95)";
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = COLORS.cream;
      ctx.font = "20px system-ui, serif";
      this.wrapText(ctx, this.currentText, boxX + 30, boxY + 45, boxW - 60, 28);

      this.currentChoices.forEach((ch, idx) => {
        const selected = idx === this.selectedChoiceIdx;
        const cy = boxY + 130 + idx * 36;
        ctx.fillStyle = selected ? COLORS.gold_bright : COLORS.parchment;
        ctx.font = selected ? "bold 18px system-ui, sans-serif" : "18px system-ui, sans-serif";
        ctx.fillText(`${selected ? "▶ " : "  "}${ch.label}`, boxX + 40, cy);
      });
    }

    // Inventory Modal
    if (this.inventoryOpen) {
      this.renderModal(ctx, "🎒 Satchel & Badges", () => {
        ctx.fillStyle = COLORS.cream;
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText("Equipped Badges:", 100, 160);

        Object.entries(ITEMS_DATA.abilities).forEach(([id, item], idx) => {
          const equipped = progress.isEquipped(id);
          const unlocked = progress.isUnlocked(id);
          ctx.fillStyle = equipped ? COLORS.gold_bright : unlocked ? COLORS.cream : "#777";
          ctx.fillText(`${equipped ? "☑" : "☐"} ${item.name} — ${item.description}`, 120, 200 + idx * 36);
        });

        ctx.fillStyle = COLORS.sky_teal;
        ctx.fillText(`Trinkets Collected (${progress.trinkets.length}/4):`, 100, 380);
        progress.trinkets.forEach((tId, idx) => {
          const item = ITEMS_DATA.trinkets[tId];
          ctx.fillStyle = COLORS.cream;
          ctx.fillText(`✨ ${item?.name || tId}: ${item?.description || ""}`, 120, 420 + idx * 32);
        });
      });
    }

    // Shop Modal
    if (this.shopOpen) {
      this.renderModal(ctx, "🐸 Pip's Cozy Curiosity Shop", () => {
        ctx.fillStyle = COLORS.gold;
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText(`Gems Available: ${progress.gems}`, 100, 160);

        const shopItems = [
          ...Object.entries(ITEMS_DATA.abilities),
          ...Object.entries(ITEMS_DATA.trails)
        ];

        shopItems.forEach(([id, item], idx) => {
          const unlocked = progress.isUnlocked(id);
          const y = 210 + idx * 44;
          ctx.fillStyle = unlocked ? COLORS.sage : progress.gems >= (item.price || 0) ? COLORS.gold_bright : "#888";
          ctx.fillText(
            `${unlocked ? "OWNED" : `[${item.price} Gems]`} ${item.name} — ${item.description}`,
            120,
            y
          );
        });
      });
    }

    // Shrine Map Modal
    if (this.mapOpen) {
      this.renderModal(ctx, "🗺️ Valley Shrine Map", () => {
        ctx.fillStyle = COLORS.cream;
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText("Attuned Shrines (Click to Fast-Travel):", 100, 170);

        const shrines = [
          { id: "shrine_meadow", name: "Meadow Hearth Shrine", level: "meadow_hub" },
          { id: "shrine_canopy", name: "Canopy Bough Shrine", level: "canopy_cliffs" },
          { id: "shrine_ruins", name: "Twilight Ruins Shrine", level: "sunken_ruins" }
        ];

        shrines.forEach((s, idx) => {
          const unlocked = progress.unlocked_shrines.includes(s.id);
          ctx.fillStyle = unlocked ? COLORS.gold_bright : "#666";
          ctx.fillText(`${unlocked ? "⛩️ [Unlocked]" : "🔒 [Locked]"} ${s.name}`, 140, 230 + idx * 60);
        });
      });
    }
  }

  private renderModal(ctx: CanvasRenderingContext2D, title: string, content: () => void) {
    ctx.fillStyle = "rgba(24, 18, 22, 0.85)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const mw = 960;
    const mh = 560;
    const mx = (CANVAS_W - mw) / 2;
    const my = (CANVAS_H - mh) / 2;

    ctx.fillStyle = "rgba(46, 33, 28, 0.98)";
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = "bold 26px system-ui, serif";
    ctx.fillText(title, mx + 40, my + 55);

    ctx.fillStyle = COLORS.parchment;
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillText("Press [Esc] or [Tab] to Close", mx + mw - 260, my + 55);

    content();
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }
}
