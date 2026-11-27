/**
 * UI Overlay Controller (HUD, Dialogue, Backpack, Shop, Map, Journal, Pause & Settings)
 */

import { CampaignManager, MAP_NODES } from "./campaign.js";
import { DIALOGUES_DATA, ITEMS_DATA } from "./data.js";
import { Level } from "./level.js";
import { Player } from "./player.js";
import { GameProgress } from "./save.js";
import { CANVAS_H, CANVAS_W, COLORS, DASH_COOLDOWN, UI_SCALE } from "./settings.js";
import { DialogueChoice, DialogueNode, DialogueTree } from "./types.js";

export type ModalKind = "none" | "dialogue" | "inventory" | "shop" | "map" | "journal" | "pause";

export interface UICallbacks {
  onFastTravel: (levelId: string, spawnId: string) => void;
  onVolumeChange: (kind: "music" | "sfx", value: number) => void;
  onResetSave: () => void;
  onPlaySfx: (name: string) => void;
}

interface HitRegion { x: number; y: number; w: number; h: number; onClick: () => void; }

export class UIOverlay {
  public activeModal: ModalKind = "none";
  public campaign = new CampaignManager();

  public currentSpeaker = "";
  private currentStyle = "sign";
  private currentText = "";
  private revealedChars = 0;
  private blipAccum = 0;
  private currentChoices: DialogueChoice[] = [];
  public selectedChoiceIdx = 0;
  private dialogueTree: DialogueTree | null = null;

  private invTab: "badges" | "trinkets" = "badges";
  private focusIdx = 0;
  private confirmReset = false;
  private draggingSlider: "music" | "sfx" | null = null;

  private gemScale = 1;
  private lastGems = -1;
  private toastText = "";
  private toastTimer = 0;

  private hitRegions: HitRegion[] = [];
  private sliderBoxes: { music?: { x: number; y: number; w: number; h: number }; sfx?: { x: number; y: number; w: number; h: number } } = {};

  public get isModalOpen(): boolean { return this.activeModal !== "none"; }

  public notify(text: string, duration = 2.6): void {
    this.toastText = text;
    this.toastTimer = duration;
  }

  public toggleModal(kind: ModalKind, progress: GameProgress, sfx: (n: string) => void): void {
    if (this.activeModal === "dialogue") return;
    if (this.activeModal === kind) {
      this.activeModal = "none";
      sfx("cancel");
    } else {
      this.activeModal = kind;
      this.focusIdx = 0;
      this.confirmReset = false;
      if (kind === "map") {
        const idx = MAP_NODES.findIndex((n) => n.level_id === progress.current_level);
        this.focusIdx = idx >= 0 ? idx : 0;
      }
      sfx("blip");
    }
  }

  public startDialogue(dialogueId: string, speaker: string, style: string, progress: GameProgress, sfx: (n: string) => void): boolean {
    const tree = DIALOGUES_DATA[dialogueId];
    if (!tree) return false;
    this.dialogueTree = tree;
    this.currentSpeaker = speaker;
    this.currentStyle = style;
    let startNode = tree.start;

    for (const rule of tree.entry_rules || []) {
      const c = rule.condition;
      let ok = true;
      if (c.trinket_count_gte !== undefined && progress.trinkets.length < c.trinket_count_gte) ok = false;
      if (c.shrine_count_gte !== undefined && progress.unlocked_shrines.length < c.shrine_count_gte) ok = false;
      if (c.badge_count_gte !== undefined && progress.unlocked_badges.length < c.badge_count_gte) ok = false;
      if (c.has_trinket && !progress.hasTrinket(c.has_trinket)) ok = false;
      if (c.flag && !progress.flags[c.flag]) ok = false;
      if (c.not_flag && progress.flags[c.not_flag]) ok = false;
      if (ok) { startNode = rule.node; break; }
    }

    this.showNode(startNode, progress, sfx);
    this.activeModal = "dialogue";
    return true;
  }

  public startSign(text: string): void {
    this.dialogueTree = null;
    this.currentSpeaker = "Wooden Signpost";
    this.currentStyle = "sign";
    this.currentText = text;
    this.revealedChars = 0;
    this.blipAccum = 0;
    this.currentChoices = [{ label: "Close", close: true }];
    this.selectedChoiceIdx = 0;
    this.activeModal = "dialogue";
  }

  private showNode(nodeKey: string, progress: GameProgress, sfx: (n: string) => void): void {
    const node: DialogueNode | undefined = this.dialogueTree?.nodes[nodeKey];
    if (!node) { this.activeModal = "none"; return; }

    this.currentText = node.text;
    this.revealedChars = 0;
    this.blipAccum = 0;
    this.currentChoices = node.choices || [{ label: "Goodbye", close: true }];
    this.selectedChoiceIdx = 0;

    for (const eff of node.effects || []) {
      if (eff.type === "set_flag" && eff.flag) progress.flags[eff.flag] = !!eff.value;
      else if (eff.type === "give_gems" && eff.amount) {
        progress.gems += eff.amount;
        sfx("gem");
        this.notify(`+${eff.amount} Gems!`);
      } else if (eff.type === "give_badge" && eff.badge_id) {
        if (!progress.isUnlocked(eff.badge_id)) {
          progress.unlockBadge(eff.badge_id, true, eff.category || "ability");
          sfx("trinket");
          const item = ITEMS_DATA.abilities[eff.badge_id] || ITEMS_DATA.trails[eff.badge_id];
          this.notify(`Unlocked: ${item?.name || eff.badge_id}!`);
        }
      } else if (eff.type === "save") progress.save();
    }
  }

  private selectChoice(idx: number, progress: GameProgress, sfx: (n: string) => void): void {
    if (this.revealedChars < this.currentText.length) {
      this.revealedChars = this.currentText.length;
      return;
    }
    const ch = this.currentChoices[idx];
    if (!ch || ch.close) { sfx("cancel"); this.activeModal = "none"; return; }
    sfx("confirm");
    if (ch.open_shop) { this.focusIdx = 0; this.activeModal = "shop"; return; }
    if (ch.next) this.showNode(ch.next, progress, sfx);
  }

  private getShopItems() {
    const list: Array<{ id: string; cat: "ability" | "trail"; name: string; price: number; description: string }> = [];
    Object.entries(ITEMS_DATA.abilities).forEach(([id, d]) => {
      if ((d.price || 0) > 0) list.push({ id, cat: "ability", name: d.name, price: d.price!, description: d.description });
    });
    Object.entries(ITEMS_DATA.trails).forEach(([id, d]) => {
      if ((d.price || 0) > 0) list.push({ id, cat: "trail", name: d.name, price: d.price!, description: d.description });
    });
    return list;
  }

  private getBadgeEntries() {
    return [
      ...Object.entries(ITEMS_DATA.abilities).map(([id, d]) => ({ id, cat: "ability" as const, ...d })),
      ...Object.entries(ITEMS_DATA.trails).map(([id, d]) => ({ id, cat: "trail" as const, ...d }))
    ];
  }

  public handleKeyDown(key: string, progress: GameProgress, cb: UICallbacks): boolean {
    if (!this.isModalOpen) return false;
    const isUp = key === "ArrowUp" || key === "w" || key === "W";
    const isDown = key === "ArrowDown" || key === "s" || key === "S";
    const isLeft = key === "ArrowLeft" || key === "a" || key === "A";
    const isRight = key === "ArrowRight" || key === "d" || key === "D";
    const isConfirm = key === "e" || key === "E" || key === "Enter" || key === " ";

    if (key === "Escape") { this.activeModal = "none"; cb.onPlaySfx("cancel"); return true; }

    if (this.activeModal === "dialogue") {
      if (isUp || isLeft) {
        this.selectedChoiceIdx = (this.selectedChoiceIdx - 1 + this.currentChoices.length) % this.currentChoices.length;
        cb.onPlaySfx("blip");
      } else if (isDown || isRight) {
        this.selectedChoiceIdx = (this.selectedChoiceIdx + 1) % this.currentChoices.length;
        cb.onPlaySfx("blip");
      } else if (isConfirm) {
        this.selectChoice(this.selectedChoiceIdx, progress, cb.onPlaySfx);
      }
      return true;
    }

    if (this.activeModal === "inventory") {
      if (key === "Tab" || key === "i" || key === "I") { this.activeModal = "none"; cb.onPlaySfx("cancel"); return true; }
      if (isLeft || isRight) { this.invTab = this.invTab === "badges" ? "trinkets" : "badges"; this.focusIdx = 0; cb.onPlaySfx("blip"); }
      const len = this.invTab === "badges" ? this.getBadgeEntries().length : Object.keys(ITEMS_DATA.trinkets).length;
      if (isUp) { this.focusIdx = (this.focusIdx - 1 + len) % len; cb.onPlaySfx("blip"); }
      if (isDown) { this.focusIdx = (this.focusIdx + 1 + len) % len; cb.onPlaySfx("blip"); }
      if (isConfirm && this.invTab === "badges") {
        const e = this.getBadgeEntries()[this.focusIdx];
        if (e && progress.isUnlocked(e.id)) {
          const on = progress.toggleBadge(e.id, e.cat);
          progress.save(); cb.onPlaySfx("equip");
          this.notify(`${on ? "Equipped" : "Unequipped"} ${e.name}`);
        }
      }
      return true;
    }

    if (this.activeModal === "shop") {
      const items = this.getShopItems();
      if (isUp || isLeft) { this.focusIdx = (this.focusIdx - 1 + items.length) % items.length; cb.onPlaySfx("blip"); }
      if (isDown || isRight) { this.focusIdx = (this.focusIdx + 1) % items.length; cb.onPlaySfx("blip"); }
      if (isConfirm) this.buyOrToggleShopItem(this.focusIdx, progress, cb.onPlaySfx);
      return true;
    }

    if (this.activeModal === "map") {
      if (key === "m" || key === "M") { this.activeModal = "none"; cb.onPlaySfx("cancel"); return true; }
      if (isLeft || isUp) { this.focusIdx = (this.focusIdx - 1 + MAP_NODES.length) % MAP_NODES.length; cb.onPlaySfx("blip"); }
      if (isRight || isDown) { this.focusIdx = (this.focusIdx + 1) % MAP_NODES.length; cb.onPlaySfx("blip"); }
      if (isConfirm) this.warpToNode(this.focusIdx, progress, cb);
      return true;
    }

    if (this.activeModal === "journal" && (key === "j" || key === "J")) {
      this.activeModal = "none"; cb.onPlaySfx("cancel"); return true;
    }

    if (this.activeModal === "pause") {
      if (isUp) { this.focusIdx = (this.focusIdx + 4) % 5; cb.onPlaySfx("blip"); }
      if (isDown) { this.focusIdx = (this.focusIdx + 1) % 5; cb.onPlaySfx("blip"); }
      if ((isLeft || isRight) && (this.focusIdx === 0 || this.focusIdx === 1)) {
        const d = isRight ? 0.05 : -0.05;
        if (this.focusIdx === 0) cb.onVolumeChange("music", Math.max(0, Math.min(1, progress.music_volume + d)));
        else cb.onVolumeChange("sfx", Math.max(0, Math.min(1, progress.sfx_volume + d)));
      }
      if (isConfirm) {
        if (this.focusIdx === 2) { this.activeModal = "none"; cb.onPlaySfx("confirm"); }
        else if (this.focusIdx === 3) { progress.save(); cb.onPlaySfx("confirm"); this.notify("Progress Saved!"); }
        else if (this.focusIdx === 4) this.triggerReset(cb);
      }
      return true;
    }
    return true;
  }

  private buyOrToggleShopItem(idx: number, progress: GameProgress, sfx: (n: string) => void): void {
    const item = this.getShopItems()[idx];
    if (!item) return;
    if (progress.isUnlocked(item.id)) {
      const on = progress.toggleBadge(item.id, item.cat);
      progress.save(); sfx("equip");
      this.notify(`${on ? "Equipped" : "Unequipped"} ${item.name}`);
    } else if (progress.gems >= item.price) {
      progress.gems -= item.price;
      progress.unlockBadge(item.id, true, item.cat);
      progress.save(); sfx("buy");
      this.notify(`Bought & Equipped ${item.name}!`);
    } else {
      sfx("cancel");
      this.notify("Need more Gems!");
    }
  }

  private warpToNode(idx: number, progress: GameProgress, cb: UICallbacks): void {
    const node = MAP_NODES[idx];
    if (!node) return;
    if (!progress.unlocked_shrines.includes(node.shrine_id)) {
      cb.onPlaySfx("cancel");
      this.notify("Attune that region's Shrine first!");
      return;
    }
    this.activeModal = "none";
    cb.onFastTravel(node.level_id, node.spawn_id);
  }

  private triggerReset(cb: UICallbacks): void {
    if (!this.confirmReset) { this.confirmReset = true; cb.onPlaySfx("blip"); return; }
    this.confirmReset = false;
    this.activeModal = "none";
    cb.onResetSave();
  }

  public handlePointerDown(mx: number, my: number, progress: GameProgress, cb: UICallbacks): void {
    if (this.activeModal === "pause") {
      for (const kind of ["music", "sfx"] as const) {
        const b = this.sliderBoxes[kind];
        if (b && mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          this.draggingSlider = kind;
          cb.onVolumeChange(kind, Math.max(0, Math.min(1, (mx - b.x) / b.w)));
          return;
        }
      }
    }
    for (let i = this.hitRegions.length - 1; i >= 0; i--) {
      const r = this.hitRegions[i];
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) { r.onClick(); return; }
    }
  }

  public handlePointerMove(mx: number, my: number, cb: UICallbacks, canvas: HTMLCanvasElement): void {
    if (this.draggingSlider && this.activeModal === "pause") {
      const b = this.sliderBoxes[this.draggingSlider];
      if (b) cb.onVolumeChange(this.draggingSlider, Math.max(0, Math.min(1, (mx - b.x) / b.w)));
    }
    const over = this.hitRegions.some((r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
    canvas.style.cursor = over || this.draggingSlider ? "pointer" : "default";
  }

  public handlePointerUp(): void { this.draggingSlider = null; }

  public update(dt: number, progress: GameProgress, sfx: (n: string) => void): void {
    if (this.lastGems >= 0 && progress.gems > this.lastGems) this.gemScale = 1.42;
    this.lastGems = progress.gems;
    this.gemScale += (1 - this.gemScale) * Math.min(1, dt * 12);

    if (this.toastTimer > 0) this.toastTimer = Math.max(0, this.toastTimer - dt);
    if (this.activeModal === "dialogue" && this.revealedChars < this.currentText.length) {
      const prev = Math.floor(this.revealedChars);
      this.revealedChars = Math.min(this.currentText.length, this.revealedChars + dt * 52);
      const curr = Math.floor(this.revealedChars);
      if (curr > prev) {
        this.blipAccum += curr - prev;
        if (this.blipAccum >= 3) { this.blipAccum = 0; sfx("blip"); }
      }
    }
  }

  private drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, style: "parchment" | "wood" | "dark" = "parchment"): void {
    ctx.fillStyle = "rgba(20,14,18,0.35)";
    ctx.beginPath(); ctx.roundRect(x + 4, y + 5, w, h, 12); ctx.fill();
    ctx.fillStyle = style === "parchment" ? COLORS.parchment : style === "wood" ? COLORS.wood_mid : "#362a2e";
    ctx.strokeStyle = style === "parchment" ? COLORS.wood_dark : COLORS.espresso;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = style === "parchment" ? COLORS.cream : style === "wood" ? COLORS.wood_light : "#564448";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x + 4, y + 4, w - 8, h - 8, 9); ctx.stroke();
  }

  private drawGemIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    ctx.fillStyle = COLORS.sky_teal;
    ctx.strokeStyle = COLORS.espresso;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size * 0.8, cy);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  private drawBadgeIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, id: string, r = 15): void {
    ctx.fillStyle = id === "feather_badge" ? "#ecf5f2" : id === "breeze_dash" ? "#d6f0f2" : id === "clover_boots" ? "#e2f2d4" : id === "magnet_charm" ? "#f8e4e0" : id === "glide_leaf" ? "#fce8d8" : COLORS.parchment;
    ctx.strokeStyle = COLORS.wood_dark;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = id.includes("sparkle") || id === "festival_crown" ? COLORS.gold : id.includes("petal") || id === "glide_leaf" || id === "magnet_charm" ? COLORS.coral : id.includes("starlight") ? COLORS.plum : id === "clover_boots" ? COLORS.moss : COLORS.sky_teal;
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2); ctx.fill();
  }

  public render(
    ctx: CanvasRenderingContext2D, progress: GameProgress, level: Level, player: Player,
    promptObj: { x: number; y: number; prompt_label: string } | null, timeSec: number, cb: UICallbacks
  ): void {
    this.hitRegions = [];
    this.sliderBoxes = {};

    // Top-left Parchment HUD Card
    const totalTrinkets = Object.keys(ITEMS_DATA.trinkets).length;
    this.drawPanel(ctx, 18, 16, 370, 78, "parchment");
    this.drawGemIcon(ctx, 48, 43, Math.round(12 * this.gemScale));
    ctx.fillStyle = COLORS.espresso;
    ctx.font = "bold 24px system-ui, sans-serif";
    ctx.fillText(`${progress.gems}`, 70, 51);
    ctx.fillStyle = COLORS.wood_mid;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(`Trinkets ${progress.trinkets.length}/${totalTrinkets}`, 142, 47);
    ctx.fillStyle = COLORS.moss;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText(`${level.name}  •  ${this.campaign.currentObjectiveText(progress)}`, 32, 76);

    // Top-right Wood Action Pills
    const pills: Array<{ label: string; modal: ModalKind; x: number; w: number }> = [
      { label: "[Tab] Bag", modal: "inventory", x: CANVAS_W - 448, w: 100 },
      { label: "[M] Map", modal: "map", x: CANVAS_W - 340, w: 96 },
      { label: "[J] Journal", modal: "journal", x: CANVAS_W - 236, w: 112 },
      { label: "[Esc] Menu", modal: "pause", x: CANVAS_W - 116, w: 98 }
    ];
    pills.forEach((p) => {
      this.drawPanel(ctx, p.x, 16, p.w, 38, this.activeModal === p.modal ? "parchment" : "wood");
      ctx.fillStyle = this.activeModal === p.modal ? COLORS.espresso : COLORS.cream;
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(p.label, p.x + p.w / 2, 40); ctx.textAlign = "left";
      this.hitRegions.push({ x: p.x, y: 16, w: p.w, h: 38, onClick: () => this.toggleModal(p.modal, progress, cb.onPlaySfx) });
    });

    // Equipped badges row + Dash cooldown ring
    let bx = CANVAS_W - 38;
    for (let i = progress.equipped_badges.length - 1; i >= 0; i--) {
      const bid = progress.equipped_badges[i];
      this.drawBadgeIcon(ctx, bx, 80, bid, 15);
      if (bid === "breeze_dash" && player.dashCooldownTimer > 0) {
        ctx.strokeStyle = COLORS.coral;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bx, 80, 17, 0, Math.PI * 2 * Math.min(1, player.dashCooldownTimer / DASH_COOLDOWN));
        ctx.stroke();
      }
      bx -= 38;
    }

    // World-space [E] Prompt Bubble
    if (promptObj && !this.isModalOpen) {
      const px = Math.max(150, Math.min(CANVAS_W - 150, (promptObj.x - level.camX) * UI_SCALE));
      const py = Math.max(54, Math.min(CANVAS_H - 60, (promptObj.y - 26 - level.camY) * UI_SCALE + Math.sin(timeSec * 4) * 4));
      ctx.font = "bold 16px system-ui, sans-serif";
      const w = Math.max(130, ctx.measureText(promptObj.prompt_label).width + 66);
      this.drawPanel(ctx, px - w / 2, py - 20, w, 40, "parchment");
      ctx.fillStyle = COLORS.wood_dark;
      ctx.beginPath(); ctx.roundRect(px - w / 2 + 10, py - 12, 24, 24, 5); ctx.fill();
      ctx.fillStyle = COLORS.gold_bright;
      ctx.textAlign = "center"; ctx.fillText("E", px - w / 2 + 22, py + 6);
      ctx.fillStyle = COLORS.espresso; ctx.textAlign = "left";
      ctx.fillText(promptObj.prompt_label, px - w / 2 + 42, py + 6);
    }

    if (this.activeModal === "dialogue") this.renderDialogue(ctx, progress, cb);
    else if (this.activeModal === "inventory") this.renderInventory(ctx, progress, cb);
    else if (this.activeModal === "shop") this.renderShop(ctx, progress, cb);
    else if (this.activeModal === "map") this.renderMap(ctx, progress, cb);
    else if (this.activeModal === "journal") this.renderJournal(ctx, progress, cb);
    else if (this.activeModal === "pause") this.renderPause(ctx, progress, cb);

    if (this.toastTimer > 0 && this.toastText) {
      ctx.globalAlpha = Math.min(1, this.toastTimer * 2.5);
      ctx.font = "bold 18px system-ui, sans-serif";
      const tw = Math.max(240, ctx.measureText(this.toastText).width + 48);
      this.drawPanel(ctx, CANVAS_W / 2 - tw / 2, 16, tw, 44, "parchment");
      ctx.fillStyle = COLORS.espresso;
      ctx.textAlign = "center"; ctx.fillText(this.toastText, CANVAS_W / 2, 44); ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }

  private renderModalFrame(ctx: CanvasRenderingContext2D, title: string, cb: UICallbacks) {
    ctx.fillStyle = "rgba(24, 18, 22, 0.72)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const mw = 980, mh = 560, mx = (CANVAS_W - mw) / 2, my = (CANVAS_H - mh) / 2;
    this.drawPanel(ctx, mx, my, mw, mh, "parchment");
    ctx.fillStyle = COLORS.espresso;
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(title, mx + 34, my + 48);

    const cx = mx + mw - 122, cy = my + 20;
    this.drawPanel(ctx, cx, cy, 94, 34, "wood");
    ctx.fillStyle = COLORS.cream;
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("Close [Esc]", cx + 47, cy + 22); ctx.textAlign = "left";
    this.hitRegions.push({ x: cx, y: cy, w: 94, h: 34, onClick: () => { this.activeModal = "none"; cb.onPlaySfx("cancel"); } });
    return { mx, my, mw, mh };
  }

  private drawPortrait(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawPanel(ctx, x, y, 120, 120, "wood");
    const cx = x + 60, cy = y + 60;
    if (this.currentStyle === "frog") {
      ctx.fillStyle = "#62a85c"; ctx.beginPath(); ctx.arc(cx, cy + 6, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 16, cy - 18, 12, 0, Math.PI * 2); ctx.arc(cx + 16, cy - 18, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.coral; ctx.beginPath(); ctx.ellipse(cx, cy - 26, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.arc(cx - 14, cy - 18, 4, 0, Math.PI * 2); ctx.arc(cx + 14, cy - 18, 4, 0, Math.PI * 2); ctx.fill();
    } else if (this.currentStyle === "willow") {
      ctx.fillStyle = "#9e7a62"; ctx.beginPath(); ctx.arc(cx, cy + 4, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.cream; ctx.beginPath(); ctx.arc(cx - 13, cy - 4, 9, 0, Math.PI * 2); ctx.arc(cx + 13, cy - 4, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.arc(cx - 13, cy - 4, 3.5, 0, Math.PI * 2); ctx.arc(cx + 13, cy - 4, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (this.currentStyle === "fox") {
      ctx.fillStyle = "#e07e46"; ctx.beginPath(); ctx.arc(cx, cy + 6, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.sky_teal; ctx.fillRect(cx - 24, cy + 20, 48, 12);
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.arc(cx - 10, cy, 4, 0, Math.PI * 2); ctx.arc(cx + 10, cy, 4, 0, Math.PI * 2); ctx.fill();
    } else if (this.currentStyle === "owl") {
      ctx.fillStyle = "#e6b464"; ctx.beginPath(); ctx.arc(cx, cy + 4, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.cream; ctx.beginPath(); ctx.ellipse(cx, cy, 22, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.arc(cx - 10, cy - 2, 4, 0, Math.PI * 2); ctx.arc(cx + 10, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
    } else if (this.currentStyle === "spirit") {
      ctx.fillStyle = "#a5f0e0"; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.white; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.espresso; ctx.beginPath(); ctx.arc(cx - 8, cy - 2, 3.5, 0, Math.PI * 2); ctx.arc(cx + 8, cy - 2, 3.5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = COLORS.wood_light; ctx.fillRect(cx - 24, cy - 20, 48, 30);
      ctx.fillStyle = COLORS.wood_dark; ctx.fillRect(cx - 5, cy + 10, 10, 22);
    }
  }

  private renderDialogue(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    ctx.fillStyle = "rgba(24, 18, 22, 0.45)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const boxW = 920, boxH = 240, boxX = (CANVAS_W - boxW) / 2, boxY = CANVAS_H - boxH - 28;
    this.drawPanel(ctx, boxX, boxY, boxW, boxH, "parchment");
    this.drawPanel(ctx, boxX + 24, boxY - 22, 240, 38, "wood");
    ctx.fillStyle = COLORS.gold_bright;
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(this.currentSpeaker, boxX + 40, boxY + 2);

    this.drawPortrait(ctx, boxX + 28, boxY + 42);
    ctx.fillStyle = COLORS.espresso;
    ctx.font = "21px system-ui, sans-serif";
    this.wrapText(ctx, this.currentText.slice(0, Math.floor(this.revealedChars)), boxX + 170, boxY + 52, boxW - 200, 28);

    if (this.revealedChars < this.currentText.length) {
      ctx.fillStyle = COLORS.wood_mid;
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText("Press [E] / Click to continue...", boxX + boxW - 230, boxY + boxH - 22);
      this.hitRegions.push({ x: boxX, y: boxY, w: boxW, h: boxH, onClick: () => { this.revealedChars = this.currentText.length; } });
      return;
    }

    this.currentChoices.forEach((ch, idx) => {
      const bw = 228, bh = 40;
      const bx = boxX + boxW - 24 - (this.currentChoices.length - idx) * (bw + 10) + 10;
      const by = boxY + boxH - 56;
      const sel = idx === this.selectedChoiceIdx;
      this.drawPanel(ctx, bx, by, bw, bh, "wood");
      if (sel) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.strokeRect(bx - 1, by - 1, bw + 2, bh + 2); }
      ctx.fillStyle = sel ? COLORS.gold_bright : COLORS.cream;
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(ch.label, bx + bw / 2, by + 25); ctx.textAlign = "left";
      this.hitRegions.push({ x: bx, y: by, w: bw, h: bh, onClick: () => { this.selectedChoiceIdx = idx; this.selectChoice(idx, progress, cb.onPlaySfx); } });
    });
  }

  private renderInventory(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    const { mx, my, mw, mh } = this.renderModalFrame(ctx, "Traveler's Backpack", cb);
    const tabs: Array<{ id: "badges" | "trinkets"; label: string; x: number }> = [
      { id: "badges", label: "Badges & Trails", x: mx + 34 },
      { id: "trinkets", label: `Trinkets (${progress.trinkets.length}/${Object.keys(ITEMS_DATA.trinkets).length})`, x: mx + 234 }
    ];
    tabs.forEach((t) => {
      this.drawPanel(ctx, t.x, my + 70, 186, 38, this.invTab === t.id ? "wood" : "parchment");
      ctx.fillStyle = this.invTab === t.id ? COLORS.gold_bright : COLORS.espresso;
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(t.label, t.x + 93, my + 94); ctx.textAlign = "left";
      this.hitRegions.push({ x: t.x, y: my + 70, w: 186, h: 38, onClick: () => { this.invTab = t.id; this.focusIdx = 0; cb.onPlaySfx("blip"); } });
    });

    let footerText = "";
    if (this.invTab === "badges") {
      this.getBadgeEntries().forEach((entry, idx) => {
        const col = idx % 2, row = Math.floor(idx / 2);
        const x = mx + 34 + col * 462, y = my + 122 + row * 64, w = 446, h = 56;
        const owned = progress.isUnlocked(entry.id), eq = progress.isEquipped(entry.id), focused = idx === this.focusIdx;
        this.drawPanel(ctx, x, y, w, h, owned ? "parchment" : "dark");
        if (focused) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); }
        if (owned) this.drawBadgeIcon(ctx, x + 28, y + 28, entry.id, 14);
        ctx.fillStyle = owned ? COLORS.espresso : "#aba098";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.fillText(entry.name, x + 54, y + 34);
        ctx.fillStyle = eq ? COLORS.moss : owned ? COLORS.wood_mid : "#7e726c";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "right"; ctx.fillText(eq ? "EQUIPPED" : owned ? "EQUIP" : "LOCKED", x + w - 16, y + 33); ctx.textAlign = "left";
        if (focused) footerText = owned ? entry.description : (entry.hint || "Keep exploring!");
        this.hitRegions.push({
          x, y, w, h,
          onClick: () => {
            this.focusIdx = idx;
            if (owned) {
              const on = progress.toggleBadge(entry.id, entry.cat);
              progress.save(); cb.onPlaySfx("equip");
              this.notify(`${on ? "Equipped" : "Unequipped"} ${entry.name}`);
            } else cb.onPlaySfx("cancel");
          }
        });
      });
    } else {
      Object.entries(ITEMS_DATA.trinkets).forEach(([id, meta], idx) => {
        const col = idx % 2, row = Math.floor(idx / 2);
        const x = mx + 34 + col * 462, y = my + 122 + row * 82, w = 446, h = 72;
        const found = progress.hasTrinket(id), focused = idx === this.focusIdx;
        this.drawPanel(ctx, x, y, w, h, found ? "parchment" : "dark");
        if (focused) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); }
        if (found) this.drawBadgeIcon(ctx, x + 28, y + 36, id, 15);
        ctx.fillStyle = found ? COLORS.espresso : "#aba098";
        ctx.font = "bold 17px system-ui, sans-serif";
        ctx.fillText(found ? meta.name : "Undiscovered Trinket", x + 54, y + 32);
        ctx.fillStyle = found ? COLORS.moss : "#8a7e77";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText(found ? "FOUND" : "Click to view hint", x + 54, y + 52);
        if (focused) footerText = found ? meta.description : (meta.hint || "Search the valley.");
        this.hitRegions.push({ x, y, w, h, onClick: () => { this.focusIdx = idx; cb.onPlaySfx("blip"); } });
      });
    }

    this.drawPanel(ctx, mx + 34, my + mh - 94, mw - 68, 70, "wood");
    ctx.fillStyle = COLORS.cream;
    ctx.font = "15px system-ui, sans-serif";
    this.wrapText(ctx, footerText, mx + 52, my + mh - 64, mw - 104, 21);
  }

  private renderShop(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    const { mx, my, mw, mh } = this.renderModalFrame(ctx, "Pip's Cozy Curiosity Shop", cb);
    this.drawPanel(ctx, mx + mw - 270, my + 18, 134, 38, "wood");
    this.drawGemIcon(ctx, mx + mw - 246, my + 37, 10);
    ctx.fillStyle = COLORS.gold_bright;
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(`${progress.gems}`, mx + mw - 226, my + 44);

    const items = this.getShopItems();
    let desc = "";
    items.forEach((item, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      const x = mx + 34 + col * 462, y = my + 82 + row * 86, w = 446, h = 74;
      const owned = progress.isUnlocked(item.id), eq = progress.isEquipped(item.id), afford = progress.gems >= item.price;
      const focused = idx === this.focusIdx;

      this.drawPanel(ctx, x, y, w, h, owned || afford ? "parchment" : "dark");
      if (focused) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.strokeRect(x - 1, y - 1, w + 2, h + 2); }
      this.drawBadgeIcon(ctx, x + 30, y + 37, item.id, 15);
      ctx.fillStyle = owned || afford ? COLORS.espresso : "#9f948d";
      ctx.font = "bold 17px system-ui, sans-serif";
      ctx.fillText(item.name, x + 56, y + 32);
      ctx.fillStyle = eq ? COLORS.moss : owned ? COLORS.wood_mid : afford ? COLORS.wood_dark : "#7e726c";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(eq ? "EQUIPPED (Toggle)" : owned ? "OWNED (Equip)" : `${item.price} Gems`, x + 56, y + 54);
      if (focused) desc = item.description;
      this.hitRegions.push({ x, y, w, h, onClick: () => { this.focusIdx = idx; this.buyOrToggleShopItem(idx, progress, cb.onPlaySfx); } });
    });

    this.drawPanel(ctx, mx + 34, my + mh - 94, mw - 68, 70, "wood");
    ctx.fillStyle = COLORS.cream;
    ctx.font = "15px system-ui, sans-serif";
    this.wrapText(ctx, desc, mx + 52, my + mh - 64, mw - 104, 21);
  }

  private renderMap(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    const { mx, my, mw, mh } = this.renderModalFrame(ctx, "World Map & Shrines", cb);
    this.drawPanel(ctx, mx + 34, my + 74, mw - 68, 326, "dark");

    ctx.strokeStyle = COLORS.wood_light;
    ctx.lineWidth = 4;
    [[0, 1], [0, 2], [1, 2], [1, 3]].forEach(([a, b]) => {
      ctx.beginPath(); ctx.moveTo(MAP_NODES[a].pos[0], MAP_NODES[a].pos[1]); ctx.lineTo(MAP_NODES[b].pos[0], MAP_NODES[b].pos[1]); ctx.stroke();
    });

    MAP_NODES.forEach((node, idx) => {
      const [nx, ny] = node.pos;
      const unlocked = progress.unlocked_shrines.includes(node.shrine_id);
      const selected = idx === this.focusIdx, here = node.level_id === progress.current_level;
      if (selected) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(nx, ny, 34, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = unlocked ? node.color : "#5c5860";
      ctx.beginPath(); ctx.arc(nx, ny, 26, 0, Math.PI * 2); ctx.fill();
      if (here) {
        ctx.fillStyle = COLORS.gold; ctx.fillRect(nx - 22, ny - 44, 44, 16);
        ctx.fillStyle = COLORS.espresso; ctx.font = "bold 11px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.fillText("HERE", nx, ny - 32);
      }
      ctx.fillStyle = COLORS.cream; ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(node.name, nx, ny + 44); ctx.textAlign = "left";
      this.hitRegions.push({
        x: nx - 34, y: ny - 34, w: 68, h: 68,
        onClick: () => { if (this.focusIdx === idx) this.warpToNode(idx, progress, cb); else { this.focusIdx = idx; cb.onPlaySfx("blip"); } }
      });
    });

    const sel = MAP_NODES[this.focusIdx] || MAP_NODES[0];
    const unlocked = progress.unlocked_shrines.includes(sel.shrine_id);
    this.drawPanel(ctx, mx + 34, my + mh - 134, mw - 270, 102, "wood");
    ctx.fillStyle = unlocked ? COLORS.gold_bright : COLORS.parchment_dark;
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(`${sel.name} (${unlocked ? "Shrine Attuned" : "Unattuned"})`, mx + 52, my + mh - 98);
    ctx.fillStyle = COLORS.cream; ctx.font = "14px system-ui, sans-serif";
    this.wrapText(ctx, sel.subtitle, mx + 52, my + mh - 70, mw - 305, 20);

    const wx = mx + mw - 216, wy = my + mh - 108;
    this.drawPanel(ctx, wx, wy, 182, 50, unlocked ? "wood" : "dark");
    ctx.fillStyle = unlocked ? COLORS.cream : "#998d86";
    ctx.font = "bold 17px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText(unlocked ? "Fast Travel" : "Shrine Locked", wx + 91, wy + 31); ctx.textAlign = "left";
    this.hitRegions.push({ x: wx, y: wy, w: 182, h: 50, onClick: () => this.warpToNode(this.focusIdx, progress, cb) });
  }

  private renderJournal(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    const { mx, my } = this.renderModalFrame(ctx, "Explorer's Campaign Journal", cb);
    this.campaign.evaluate(progress).forEach((ch, idx) => {
      const col = idx % 2, row = Math.floor(idx / 2);
      const x = mx + 34 + col * 462, y = my + 82 + row * 226, w = 446, h = 210;
      this.drawPanel(ctx, x, y, w, h, ch.completed ? "wood" : "dark");
      ctx.fillStyle = ch.completed ? COLORS.moss_light : COLORS.gold_bright;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(`Chapter ${ch.number}: ${ch.title} ${ch.completed ? "✓" : ""}`, x + 18, y + 32);
      ctx.fillStyle = COLORS.parchment_dark;
      ctx.font = "13px system-ui, sans-serif";
      this.wrapText(ctx, ch.summary, x + 18, y + 56, w - 36, 18);
      ch.objectives.forEach((obj, oIdx) => {
        ctx.fillStyle = obj.done ? COLORS.moss_light : COLORS.cream;
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(`${obj.done ? "☑" : "☐"} ${obj.label}`, x + 18, y + 114 + oIdx * 28);
      });
    });
  }

  private renderPause(ctx: CanvasRenderingContext2D, progress: GameProgress, cb: UICallbacks): void {
    const { mx, my, mw } = this.renderModalFrame(ctx, "Cozy Pause & Settings", cb);
    const drawSlider = (label: string, val: number, y: number, kind: "music" | "sfx", focused: boolean) => {
      ctx.fillStyle = focused ? COLORS.gold_bright : COLORS.espresso;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(label, mx + 120, y + 20);
      const tx = mx + 320, tw = 420;
      ctx.fillStyle = COLORS.parchment_dark; ctx.beginPath(); ctx.roundRect(tx, y + 8, tw, 12, 6); ctx.fill();
      ctx.fillStyle = COLORS.moss; ctx.beginPath(); ctx.roundRect(tx, y + 8, tw * val, 12, 6); ctx.fill();
      ctx.fillStyle = COLORS.wood_mid; ctx.beginPath(); ctx.arc(tx + tw * val, y + 14, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COLORS.espresso; ctx.fillText(`${Math.round(val * 100)}%`, tx + tw + 22, y + 20);
      this.sliderBoxes[kind] = { x: tx, y, w: tw, h: 30 };
    };

    drawSlider("Music Volume", progress.music_volume, my + 108, "music", this.focusIdx === 0);
    drawSlider("SFX Volume", progress.sfx_volume, my + 164, "sfx", this.focusIdx === 1);

    const btns = [
      { label: "Resume Adventure", y: my + 240, fn: () => { this.activeModal = "none"; cb.onPlaySfx("confirm"); } },
      { label: "Save Progress Now", y: my + 306, fn: () => { progress.save(); cb.onPlaySfx("confirm"); this.notify("Progress Saved!"); } },
      { label: this.confirmReset ? "Click Again to Confirm Reset" : "Reset Save Data", y: my + 372, fn: () => this.triggerReset(cb) }
    ];
    btns.forEach((b, i) => {
      const bx = mx + mw / 2 - 210, bw = 420, bh = 48;
      this.drawPanel(ctx, bx, b.y, bw, bh, i === 2 ? "dark" : "wood");
      if (this.focusIdx === i + 2) { ctx.strokeStyle = COLORS.gold_bright; ctx.lineWidth = 3; ctx.strokeRect(bx - 1, b.y - 1, bw + 2, bh + 2); }
      ctx.fillStyle = COLORS.cream; ctx.font = "bold 17px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText(b.label, mx + mw / 2, b.y + 30); ctx.textAlign = "left";
      this.hitRegions.push({ x: bx, y: b.y, w: bw, h: bh, onClick: b.fn });
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, y); line = words[n] + " "; y += lineHeight;
      } else line = testLine;
    }
    ctx.fillText(line, x, y);
  }
}
