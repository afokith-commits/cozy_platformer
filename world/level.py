"""Tilemap level loader, parallax scenery, safe-ledge checks, and smooth camera."""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any
import pygame

from settings import COLORS, LEVELS_DIR, TILE_SIZE, WORLD_H, WORLD_W
from core.tween import clamp, exp_damp
from world.entities import BouncePad, Gem, NPC, Portal, Shrine, Sign, Trinket


THEMES: dict[str, dict[str, Any]] = {
    "meadow": {
        "sky_top": (146, 206, 214),
        "sky_bottom": (244, 229, 192),
        "hill_far": (144, 184, 152),
        "hill_near": (116, 162, 118),
        "top_tile": (106, 168, 92),
        "top_highlight": (152, 206, 124),
        "body_tile": (118, 86, 66),
        "body_dark": (88, 63, 49),
        "water": (98, 178, 188),
        "water_crest": (182, 238, 240),
    },
    "canopy": {
        "sky_top": (112, 168, 178),
        "sky_bottom": (228, 214, 176),
        "hill_far": (94, 146, 128),
        "hill_near": (72, 122, 98),
        "top_tile": (92, 152, 98),
        "top_highlight": (144, 198, 128),
        "body_tile": (104, 72, 54),
        "body_dark": (76, 52, 40),
        "water": (84, 156, 166),
        "water_crest": (170, 224, 226),
    },
    "ruins": {
        "sky_top": (74, 84, 124),
        "sky_bottom": (152, 134, 168),
        "hill_far": (88, 84, 118),
        "hill_near": (66, 68, 98),
        "top_tile": (114, 148, 136),
        "top_highlight": (152, 192, 174),
        "body_tile": (96, 98, 118),
        "body_dark": (68, 70, 88),
        "water": (78, 128, 164),
        "water_crest": (156, 212, 236),
    },
}


class Level:
    """Loaded tilemap room with entities, camera smoothing, and themed rendering."""

    def __init__(self, level_id: str, data: dict[str, Any], items_meta: dict[str, Any]) -> None:
        self.level_id = level_id
        self.name: str = data["name"]
        self.theme_name: str = data.get("theme", "meadow")
        self.theme = THEMES.get(self.theme_name, THEMES["meadow"])
        self.ambient_type: str = data.get("ambient_type", "fireflies")

        self.grid: list[str] = data["grid"]
        self.rows = len(self.grid)
        self.cols = max((len(r) for r in self.grid), default=30)
        self.pixel_w = self.cols * TILE_SIZE
        self.pixel_h = self.rows * TILE_SIZE

        self.solid_rects: list[pygame.FRect] = []
        self.oneway_rects: list[pygame.FRect] = []
        self.hazard_rects: list[pygame.FRect] = []
        self.bounce_pads: list[BouncePad] = []
        self.gems: list[Gem] = []
        self.trinkets: list[Trinket] = []
        self.shrines: list[Shrine] = []
        self.portals: list[Portal] = []
        self.signs: list[Sign] = []
        self.npcs: list[NPC] = []
        self.decor: list[dict[str, Any]] = list(data.get("decor", []))
        self.spawns: dict[str, tuple[float, float]] = {}

        self._parse_grid()
        self._load_objects(data, items_meta)

        self.cam_x = 0.0
        self.cam_y = 0.0
        self._sky_surface = self._build_sky_surface()
        self._tile_surface = self._build_tile_surface()

    @classmethod
    def load(cls, level_id: str, items_meta: dict[str, Any]) -> Level:
        path: Path = LEVELS_DIR / f"{level_id}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(level_id, data, items_meta)

    def _tile_at(self, col: int, row: int) -> str:
        if 0 <= row < self.rows and 0 <= col < len(self.grid[row]):
            return self.grid[row][col]
        return " "

    def _parse_grid(self) -> None:
        for r, line in enumerate(self.grid):
            for c, ch in enumerate(line):
                x = c * TILE_SIZE
                y = r * TILE_SIZE
                if ch == "#":
                    self.solid_rects.append(pygame.FRect(x, y, TILE_SIZE, TILE_SIZE))
                elif ch == "=":
                    self.oneway_rects.append(pygame.FRect(x, y, TILE_SIZE, 5))
                elif ch == "~":
                    self.hazard_rects.append(pygame.FRect(x, y + 5, TILE_SIZE, TILE_SIZE - 5))
                elif ch == "^":
                    self.bounce_pads.append(BouncePad(x, y))
                elif ch == "G":
                    uid = f"{self.level_id}:{c},{r}"
                    self.gems.append(Gem(uid, x + TILE_SIZE / 2, y + TILE_SIZE / 2, value=1))
                elif ch == "*":
                    uid = f"{self.level_id}:{c},{r}"
                    self.gems.append(Gem(uid, x + TILE_SIZE / 2, y + TILE_SIZE / 2, value=5))
                elif ch == "P":
                    self.spawns.setdefault("start", (x + TILE_SIZE / 2, y + TILE_SIZE))

    def _load_objects(self, data: dict[str, Any], items_meta: dict[str, Any]) -> None:
        for sid, coords in data.get("spawns", {}).items():
            self.spawns[sid] = (coords[0] * TILE_SIZE + TILE_SIZE / 2, coords[1] * TILE_SIZE + TILE_SIZE)
        self.spawns.setdefault("start", (64.0, 128.0))

        for p in data.get("portals", []):
            self.portals.append(
                Portal(
                    target_level=p["target_level"],
                    target_spawn=p["target_spawn"],
                    label=p["label"],
                    x=p["col"] * TILE_SIZE + TILE_SIZE / 2,
                    y=(p["row"] + 1) * TILE_SIZE,
                )
            )

        for n in data.get("npcs", []):
            self.npcs.append(
                NPC(
                    npc_id=n["npc_id"],
                    name=n["name"],
                    dialogue_id=n["dialogue_id"],
                    x=n["col"] * TILE_SIZE + TILE_SIZE / 2,
                    y=(n["row"] + 1) * TILE_SIZE,
                    style=n.get("style", "frog"),
                )
            )

        for s in data.get("signs", []):
            self.signs.append(
                Sign(
                    text=s["text"],
                    x=s["col"] * TILE_SIZE + TILE_SIZE / 2,
                    y=(s["row"] + 1) * TILE_SIZE,
                )
            )

        for sh in data.get("shrines", []):
            self.shrines.append(
                Shrine(
                    shrine_id=sh["shrine_id"],
                    name=sh["name"],
                    x=sh["col"] * TILE_SIZE + TILE_SIZE / 2,
                    y=(sh["row"] + 1) * TILE_SIZE,
                )
            )

        trinkets_meta = items_meta.get("trinkets", {})
        for t in data.get("trinkets", []):
            tid = t["trinket_id"]
            meta = trinkets_meta.get(tid, {})
            col = tuple(meta.get("color", [244, 192, 78]))
            self.trinkets.append(
                Trinket(
                    trinket_id=tid,
                    name=meta.get("name", tid),
                    x=t["col"] * TILE_SIZE + TILE_SIZE / 2,
                    y=t["row"] * TILE_SIZE + TILE_SIZE / 2,
                    color=(int(col[0]), int(col[1]), int(col[2])),
                )
            )

    def _build_sky_surface(self) -> pygame.Surface:
        surf = pygame.Surface((WORLD_W, WORLD_H))
        top = self.theme["sky_top"]
        bot = self.theme["sky_bottom"]
        for y in range(WORLD_H):
            t = y / max(1, WORLD_H - 1)
            r = int(top[0] + (bot[0] - top[0]) * t)
            g = int(top[1] + (bot[1] - top[1]) * t)
            b = int(top[2] + (bot[2] - top[2]) * t)
            pygame.draw.line(surf, (r, g, b), (0, y), (WORLD_W, y))
        return surf

    def _build_tile_surface(self) -> pygame.Surface:
        surf = pygame.Surface((self.pixel_w, self.pixel_h), pygame.SRCALPHA)
        # Render decorative background elements first
        for d in self.decor:
            dx = d["col"] * TILE_SIZE
            dy = (d["row"] + 1) * TILE_SIZE
            kind = d.get("kind", "tree")
            if kind == "tree":
                pygame.draw.rect(surf, COLORS["wood_dark"], (dx + 5, dy - 22, 6, 22))
                pygame.draw.circle(surf, self.theme["hill_near"], (dx + 8, dy - 28), 14)
                pygame.draw.circle(surf, self.theme["top_tile"], (dx + 8, dy - 31), 11)
            elif kind == "pillar":
                pygame.draw.rect(surf, (108, 110, 132), (dx + 3, dy - 28, 10, 28))
                pygame.draw.rect(surf, (132, 134, 156), (dx + 1, dy - 30, 14, 4))
                pygame.draw.rect(surf, self.theme["top_tile"], (dx + 3, dy - 30, 8, 2))
            elif kind == "flower":
                pygame.draw.line(surf, COLORS["moss"], (dx + 8, dy), (dx + 8, dy - 5))
                pygame.draw.circle(surf, COLORS["gold"], (dx + 8, dy - 6), 2)
            elif kind == "lantern":
                pygame.draw.rect(surf, COLORS["wood_dark"], (dx + 7, dy - 16, 2, 16))
                pygame.draw.circle(surf, COLORS["gold_bright"], (dx + 8, dy - 17), 3)

        # Render solid & one-way tiles
        for r, line in enumerate(self.grid):
            for c, ch in enumerate(line):
                x = c * TILE_SIZE
                y = r * TILE_SIZE
                if ch == "#":
                    above = self._tile_at(c, r - 1)
                    if above != "#":
                        pygame.draw.rect(surf, self.theme["body_tile"], (x, y + 4, TILE_SIZE, TILE_SIZE - 4))
                        pygame.draw.rect(surf, self.theme["top_tile"], (x, y, TILE_SIZE, 6))
                        pygame.draw.rect(surf, self.theme["top_highlight"], (x, y, TILE_SIZE, 2))
                    else:
                        pygame.draw.rect(surf, self.theme["body_tile"], (x, y, TILE_SIZE, TILE_SIZE))
                        # Subtle brick/stone texture
                        pygame.draw.rect(surf, self.theme["body_dark"], (x + 2, y + 3, 5, 3))
                        pygame.draw.rect(surf, self.theme["body_dark"], (x + 9, y + 10, 5, 3))
                elif ch == "=":
                    pygame.draw.rect(surf, COLORS["wood_mid"], (x, y, TILE_SIZE, 4))
                    pygame.draw.rect(surf, COLORS["wood_light"], (x, y, TILE_SIZE, 1))
                    pygame.draw.rect(surf, COLORS["wood_dark"], (x + 2, y + 4, 2, 3))
                    pygame.draw.rect(surf, COLORS["wood_dark"], (x + TILE_SIZE - 4, y + 4, 2, 3))
        return surf

    def sync_collected(self, collected_gems: list[str], collected_trinkets: list[str], unlocked_shrines: list[str]) -> None:
        gem_set = set(collected_gems)
        for g in self.gems:
            g.collected = g.uid in gem_set
        trinket_set = set(collected_trinkets)
        for t in self.trinkets:
            t.collected = t.trinket_id in trinket_set
        for s in self.shrines:
            s.sync_state(unlocked_shrines)

    def solid_rects_near(self, rect: pygame.FRect) -> list[pygame.FRect]:
        margin = TILE_SIZE * 2
        expanded = pygame.FRect(rect.x - margin, rect.y - margin, rect.w + margin * 2, rect.h + margin * 2)
        return [r for r in self.solid_rects if expanded.colliderect(r)]

    def oneway_rects_near(self, rect: pygame.FRect) -> list[pygame.FRect]:
        margin = TILE_SIZE * 2
        expanded = pygame.FRect(rect.x - margin, rect.y - margin, rect.w + margin * 2, rect.h + margin * 2)
        return [r for r in self.oneway_rects if expanded.colliderect(r)]

    def hits_hazard(self, rect: pygame.FRect) -> bool:
        return any(rect.colliderect(h) for h in self.hazard_rects)

    def is_safe_ledge(self, rect: pygame.FRect) -> bool:
        """True if both left and right feet rest above a solid/oneway tile without hazard overlap."""
        if self.hits_hazard(rect):
            return False
        foot_y = int((rect.bottom + 2) // TILE_SIZE)
        left_c = int((rect.left + 1) // TILE_SIZE)
        right_c = int((rect.right - 1) // TILE_SIZE)
        return self._tile_at(left_c, foot_y) in ("#", "=") and self._tile_at(right_c, foot_y) in ("#", "=")

    def snap_camera(self, target_x: float, target_y: float) -> None:
        max_cx = max(0.0, float(self.pixel_w - WORLD_W))
        max_cy = max(0.0, float(self.pixel_h - WORLD_H))
        self.cam_x = clamp(target_x - WORLD_W / 2, 0.0, max_cx)
        self.cam_y = clamp(target_y - WORLD_H / 2, 0.0, max_cy)

    def update_camera(self, target_x: float, target_y: float, facing: int, dt: float) -> None:
        max_cx = max(0.0, float(self.pixel_w - WORLD_W))
        max_cy = max(0.0, float(self.pixel_h - WORLD_H))
        desired_x = clamp(target_x + facing * 22.0 - WORLD_W / 2, 0.0, max_cx)
        desired_y = clamp(target_y - WORLD_H * 0.54, 0.0, max_cy)
        self.cam_x = exp_damp(self.cam_x, desired_x, 7.5, dt)
        self.cam_y = exp_damp(self.cam_y, desired_y, 6.5, dt)

    def update_entities(self, dt: float, time_sec: float, player_cx: float) -> None:
        for g in self.gems:
            g.update(dt, time_sec)
        for t in self.trinkets:
            t.update(dt, time_sec)
        for pad in self.bounce_pads:
            pad.update(dt)
        for npc in self.npcs:
            npc.update(player_cx)

    def all_interactables(self) -> list[Any]:
        return [*self.npcs, *self.shrines, *self.portals, *self.signs]

    def render(self, surf: pygame.Surface, time_sec: float) -> None:
        surf.blit(self._sky_surface, (0, 0))

        # Parallax clouds / hills
        cx_far = int(self.cam_x * 0.18)
        cx_near = int(self.cam_x * 0.36)
        for i in range(-1, 6):
            hx = i * 140 - (cx_far % 140)
            pygame.draw.ellipse(surf, self.theme["hill_far"], (hx, WORLD_H - 96, 175, 110))
        for i in range(-1, 6):
            hx = i * 110 - (cx_near % 110)
            pygame.draw.ellipse(surf, self.theme["hill_near"], (hx, WORLD_H - 64, 140, 90))

        # Subtle sun or moon
        orb_x = int(WORLD_W * 0.78 - self.cam_x * 0.05)
        orb_y = 46
        orb_col = (255, 240, 185) if self.theme_name != "ruins" else (222, 232, 255)
        pygame.draw.circle(surf, orb_col, (orb_x, orb_y), 16)

        # Static tilemap & decor
        surf.blit(self._tile_surface, (-int(self.cam_x), -int(self.cam_y)))

        # Animated water/mist tiles
        wave_off = int(math.sin(time_sec * 3.2) * 1.5)
        for h in self.hazard_rects:
            hx = int(h.x - self.cam_x)
            hy = int(h.y - self.cam_y)
            if -TILE_SIZE <= hx <= WORLD_W + TILE_SIZE:
                pygame.draw.rect(surf, self.theme["water"], (hx, hy, int(h.w), int(h.h)))
                pygame.draw.line(surf, self.theme["water_crest"], (hx, hy + wave_off + 1), (hx + TILE_SIZE - 1, hy - wave_off + 1))

        # Interactive objects
        for portal in self.portals:
            portal.render(surf, self.cam_x, self.cam_y)
        for sign in self.signs:
            sign.render(surf, self.cam_x, self.cam_y)
        for shrine in self.shrines:
            shrine.render(surf, self.cam_x, self.cam_y, time_sec)
        for pad in self.bounce_pads:
            pad.render(surf, self.cam_x, self.cam_y)
        for gem in self.gems:
            gem.render(surf, self.cam_x, self.cam_y, time_sec)
        for trinket in self.trinkets:
            trinket.render(surf, self.cam_x, self.cam_y, time_sec)
        for npc in self.npcs:
            npc.render(surf, self.cam_x, self.cam_y, time_sec)
