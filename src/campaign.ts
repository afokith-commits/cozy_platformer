/**
 * Modular Campaign & Quest Progression Manager
 */

import { GameProgress } from "./save.js";
import {
  CampaignChapterDef,
  CampaignMapNode,
  CampaignRule,
  ChapterStatus,
  ObjectiveStatus,
} from "./types.js";

export const CAMPAIGN_CHAPTERS: CampaignChapterDef[] = [
  {
    id: "ch1_hearth",
    title: "Awaken the Hearth",
    summary: "Meet Grandma Willow in Meadow Hub, earn your first badge, and reach Canopy Cliffs.",
    objectives: [
      {
        id: "talk_willow",
        label: "Speak with Grandma Willow in Meadow Hub",
        rule: { type: "flag", flag: "willow_gift" },
      },
      {
        id: "get_first_badge",
        label: "Unlock your first Badge from Pip's Shop",
        rule: { type: "badge_count_gte", count: 1 },
      },
      {
        id: "attune_canopy",
        label: "Attune the Canopy Bough Shrine",
        rule: { type: "shrine", shrine_id: "shrine_canopy" },
      },
    ],
  },
  {
    id: "ch2_lanterns",
    title: "Lanterns in the Mist",
    summary: "Descend into the twilight Sunken Ruins and aid Luma the Firefly Spirit.",
    objectives: [
      {
        id: "attune_ruins",
        label: "Attune the Twilight Ruins Shrine",
        rule: { type: "shrine", shrine_id: "shrine_ruins" },
      },
      {
        id: "find_lantern",
        label: "Recover the Starlight Lantern in Sunken Ruins",
        rule: { type: "trinket", trinket_id: "starlight_lantern" },
      },
      {
        id: "luma_blessing",
        label: "Return the Lantern to Luma the Spirit",
        rule: { type: "flag", flag: "luma_charm" },
      },
    ],
  },
  {
    id: "ch3_spire",
    title: "The Sunlit Spire",
    summary: "Ascend above Canopy Cliffs to the golden Sunlit Spire and meet Sol the Skyweaver.",
    objectives: [
      {
        id: "attune_spire",
        label: "Attune the Spire Summit Shrine",
        rule: { type: "shrine", shrine_id: "shrine_spire" },
      },
      {
        id: "sol_glider",
        label: "Receive the Leaf Glider from Sol the Skyweaver",
        rule: { type: "flag", flag: "sol_glider" },
      },
      {
        id: "find_prism",
        label: "Collect the Sunstone Prism atop the Spire",
        rule: { type: "trinket", trinket_id: "sunstone_prism" },
      },
    ],
  },
  {
    id: "ch4_festival",
    title: "Festival of Sprouts",
    summary: "With all four valley shrines lit, return to Grandma Willow to celebrate the Festival!",
    objectives: [
      {
        id: "all_shrines",
        label: "Attune all 4 Shrines across the Valley",
        rule: { type: "shrine_count_gte", count: 4 },
      },
      {
        id: "willow_festival",
        label: "Celebrate the Festival with Grandma Willow",
        rule: { type: "flag", flag: "festival_complete" },
      },
    ],
  },
];

export const MAP_NODES: CampaignMapNode[] = [
  {
    level_id: "meadow_hub",
    shrine_id: "shrine_meadow",
    spawn_id: "shrine",
    name: "Meadow Hub",
    subtitle: "Warm hearth, Pip's stall, and Grandma Willow's garden.",
    pos: [330, 395],
    color: "#6a9e5c",
  },
  {
    level_id: "canopy_cliffs",
    shrine_id: "shrine_canopy",
    spawn_id: "shrine",
    name: "Canopy Cliffs",
    subtitle: "Breezy treetop bridges, bounce mushrooms, and Bramble's lookout.",
    pos: [555, 290],
    color: "#6dbfc2",
  },
  {
    level_id: "sunken_ruins",
    shrine_id: "shrine_ruins",
    spawn_id: "shrine",
    name: "Sunken Ruins",
    subtitle: "Twilight mossy arches lit by firefly spirits and ancient lanterns.",
    pos: [895, 395],
    color: "#84619c",
  },
  {
    level_id: "sunlit_spire",
    shrine_id: "shrine_spire",
    spawn_id: "shrine",
    name: "Sunlit Spire",
    subtitle: "Golden-hour cloud-top sanctuary home to Sol the Skyweaver.",
    pos: [715, 215],
    color: "#f4c04e",
  },
];

export class CampaignManager {
  public evalRule(rule: CampaignRule, progress: GameProgress): boolean {
    switch (rule.type) {
      case "flag":
        return !!(rule.flag && progress.flags[rule.flag]);
      case "shrine":
        return !!(rule.shrine_id && progress.unlocked_shrines.includes(rule.shrine_id));
      case "trinket":
        return !!(rule.trinket_id && progress.hasTrinket(rule.trinket_id));
      case "badge":
        return !!(rule.badge_id && progress.isUnlocked(rule.badge_id));
      case "badge_count_gte":
        return progress.unlocked_badges.length >= (rule.count ?? 0);
      case "trinket_count_gte":
        return progress.trinkets.length >= (rule.count ?? 0);
      case "shrine_count_gte":
        return progress.unlocked_shrines.length >= (rule.count ?? 0);
      default:
        return false;
    }
  }

  public evaluate(progress: GameProgress): ChapterStatus[] {
    return CAMPAIGN_CHAPTERS.map((ch, idx) => {
      const objectives: ObjectiveStatus[] = ch.objectives.map((obj) => ({
        id: obj.id,
        label: obj.label,
        done: this.evalRule(obj.rule, progress),
      }));
      return {
        id: ch.id,
        number: idx + 1,
        title: ch.title,
        summary: ch.summary,
        objectives,
        completed: objectives.every((o) => o.done),
      };
    });
  }

  public activeChapter(progress: GameProgress): ChapterStatus {
    const all = this.evaluate(progress);
    return all.find((c) => !c.completed) || all[all.length - 1];
  }

  public currentObjectiveText(progress: GameProgress): string {
    const ch = this.activeChapter(progress);
    if (ch.completed) return "Festival Complete! Explore freely";
    const next = ch.objectives.find((o) => !o.done);
    return next ? `Ch.${ch.number}: ${next.label}` : ch.title;
  }

  public isComplete(progress: GameProgress): boolean {
    return this.evaluate(progress).every((c) => c.completed);
  }
}
