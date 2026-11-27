/**
 * Sproutbound — Save Progress & Persistent Traveler State
 */

export class GameProgress {
  public gems = 0;
  public collected_gems: string[] = [];
  public trinkets: string[] = [];
  public unlocked_badges: string[] = [];
  public equipped_badges: string[] = [];
  public unlocked_shrines: string[] = ["shrine_meadow"];
  public flags: Record<string, boolean> = {};
  public current_level = "meadow_hub";
  public spawn_id = "start";
  public sfx_volume = 0.65;
  public music_volume = 0.45;

  constructor() {
    this.load();
  }

  public isEquipped(badgeId: string): boolean {
    return this.equipped_badges.includes(badgeId);
  }

  public isUnlocked(badgeId: string): boolean {
    return this.unlocked_badges.includes(badgeId);
  }

  public hasTrinket(trinketId: string): boolean {
    return this.trinkets.includes(trinketId);
  }

  public toggleBadge(badgeId: string, category = "ability"): boolean {
    if (!this.isUnlocked(badgeId)) return false;
    const idx = this.equipped_badges.indexOf(badgeId);
    if (idx >= 0) {
      this.equipped_badges.splice(idx, 1);
      return false;
    }
    if (category === "trail" && badgeId.endsWith("_trail")) {
      this.equipped_badges = this.equipped_badges.filter((b) => !b.endsWith("_trail"));
    }
    this.equipped_badges.push(badgeId);
    return true;
  }

  public unlockBadge(badgeId: string, autoEquip = true, category = "ability"): void {
    if (!this.isUnlocked(badgeId)) this.unlocked_badges.push(badgeId);
    if (autoEquip && !this.isEquipped(badgeId)) this.toggleBadge(badgeId, category);
  }

  public save(): void {
    try {
      localStorage.setItem("sproutbound_save", JSON.stringify(this));
    } catch { /* noop */ }
  }

  public load(): void {
    try {
      const raw = localStorage.getItem("sproutbound_save");
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.gems === "number") this.gems = d.gems;
      if (Array.isArray(d.collected_gems)) this.collected_gems = d.collected_gems;
      if (Array.isArray(d.trinkets)) this.trinkets = d.trinkets;
      if (Array.isArray(d.unlocked_badges)) this.unlocked_badges = d.unlocked_badges;
      if (Array.isArray(d.equipped_badges)) this.equipped_badges = d.equipped_badges;
      if (Array.isArray(d.unlocked_shrines) && d.unlocked_shrines.length > 0) {
        this.unlocked_shrines = d.unlocked_shrines;
      }
      if (d.flags && typeof d.flags === "object") this.flags = d.flags;
      if (typeof d.current_level === "string") this.current_level = d.current_level;
      if (typeof d.spawn_id === "string") this.spawn_id = d.spawn_id;
      if (typeof d.sfx_volume === "number") this.sfx_volume = d.sfx_volume;
      if (typeof d.music_volume === "number") this.music_volume = d.music_volume;
    } catch { /* noop */ }
  }

  public reset(): void {
    try { localStorage.removeItem("sproutbound_save"); } catch { /* noop */ }
    this.gems = 0;
    this.collected_gems = [];
    this.trinkets = [];
    this.unlocked_badges = [];
    this.equipped_badges = [];
    this.unlocked_shrines = ["shrine_meadow"];
    this.flags = {};
    this.current_level = "meadow_hub";
    this.spawn_id = "start";
    this.save();
  }
}
