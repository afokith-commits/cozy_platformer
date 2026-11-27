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
    } catch { /* Storage fallback */ }
  }

  public load(): void {
    try {
      const raw = localStorage.getItem("sproutbound_save");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.gems === "number") this.gems = data.gems;
      if (Array.isArray(data.collected_gems)) this.collected_gems = data.collected_gems;
      if (Array.isArray(data.trinkets)) this.trinkets = data.trinkets;
      if (Array.isArray(data.unlocked_badges)) this.unlocked_badges = data.unlocked_badges;
      if (Array.isArray(data.equipped_badges)) this.equipped_badges = data.equipped_badges;
      if (Array.isArray(data.unlocked_shrines) && data.unlocked_shrines.length > 0) {
        this.unlocked_shrines = data.unlocked_shrines;
      }
      if (data.flags && typeof data.flags === "object") this.flags = data.flags;
      if (typeof data.current_level === "string") this.current_level = data.current_level;
      if (typeof data.spawn_id === "string") this.spawn_id = data.spawn_id;
      if (typeof data.sfx_volume === "number") this.sfx_volume = data.sfx_volume;
      if (typeof data.music_volume === "number") this.music_volume = data.music_volume;
    } catch { /* Storage fallback */ }
  }

  public reset(): void {
    try { localStorage.removeItem("sproutbound_save"); } catch { /* Storage fallback */ }
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
