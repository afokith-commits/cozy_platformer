/**
 * Game Progress & Save Data Manager
 */

export class GameProgress {
  public gems = 0;
  public collected_gems: string[] = [];
  public trinkets: string[] = [];
  public unlocked_badges: string[] = [];
  public equipped_badges: string[] = [];
  public unlocked_shrines: string[] = [];
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

  public save(): void {
    try {
      localStorage.setItem("sproutbound_save", JSON.stringify(this));
    } catch {
      // Storage fallback
    }
  }

  public load(): void {
    try {
      const dataStr = localStorage.getItem("sproutbound_save");
      if (dataStr) {
        const data = JSON.parse(dataStr);
        Object.assign(this, data);
      }
    } catch {
      // Storage fallback
    }
  }

  public reset(): void {
    localStorage.removeItem("sproutbound_save");
    this.gems = 0;
    this.collected_gems = [];
    this.trinkets = [];
    this.unlocked_badges = [];
    this.equipped_badges = [];
    this.unlocked_shrines = [];
    this.flags = {};
    this.current_level = "meadow_hub";
    this.spawn_id = "start";
    this.save();
  }
}
