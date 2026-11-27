/**
 * Core Type Definitions & Interfaces for Sproutbound
 */

export interface ItemDef {
  name: string;
  price?: number;
  description: string;
  hint?: string;
  color?: number[];
}

export interface ItemsCatalog {
  abilities: Record<string, ItemDef>;
  trails: Record<string, ItemDef>;
  trinkets: Record<string, ItemDef>;
}

export interface DialogueChoice {
  label: string;
  next?: string;
  close?: boolean;
  open_shop?: boolean;
}

export interface DialogueEffect {
  type: string;
  flag?: string;
  value?: boolean;
  amount?: number;
  badge_id?: string;
  category?: string;
}

export interface DialogueNode {
  text: string;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
}

export interface DialogueTree {
  start: string;
  entry_rules?: Array<{
    condition: {
      trinket_count_gte?: number;
      shrine_count_gte?: number;
      badge_count_gte?: number;
      has_trinket?: string;
      flag?: string;
      not_flag?: string;
    };
    node: string;
  }>;
  nodes: Record<string, DialogueNode>;
}

export interface LevelData {
  id: string;
  name: string;
  theme: string;
  ambient_type: string;
  grid: string[];
  spawns: Record<string, [number, number]>;
  shrines?: Array<{ shrine_id: string; name: string; col: number; row: number }>;
  npcs?: Array<{ npc_id: string; name: string; dialogue_id: string; col: number; row: number; style?: string }>;
  signs?: Array<{ col: number; row: number; text: string }>;
  portals?: Array<{ target_level: string; target_spawn: string; label: string; col: number; row: number }>;
  trinkets?: Array<{ trinket_id: string; col: number; row: number }>;
  decor?: Array<{ kind: string; col: number; row: number }>;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CampaignRule {
  type: "flag" | "shrine" | "trinket" | "badge" | "badge_count_gte" | "trinket_count_gte" | "shrine_count_gte";
  flag?: string;
  shrine_id?: string;
  trinket_id?: string;
  badge_id?: string;
  count?: number;
}

export interface CampaignObjectiveDef {
  id: string;
  label: string;
  rule: CampaignRule;
}

export interface CampaignChapterDef {
  id: string;
  title: string;
  summary: string;
  objectives: CampaignObjectiveDef[];
}

export interface CampaignMapNode {
  level_id: string;
  shrine_id: string;
  spawn_id: string;
  name: string;
  subtitle: string;
  pos: [number, number];
  color: string;
}

export interface ObjectiveStatus {
  id: string;
  label: string;
  done: boolean;
}

export interface ChapterStatus {
  id: string;
  number: number;
  title: string;
  summary: string;
  objectives: ObjectiveStatus[];
  completed: boolean;
}
