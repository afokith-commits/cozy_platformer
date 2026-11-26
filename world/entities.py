"""World entities: collectibles, NPCs, shrines, portals, signs, and particles."""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
import pygame

from settings import COLORS, TILE_SIZE


@dataclass
class Particle:
    x: float
    y: float
    vx: float
    vy: float
    life: float
    max_life: float
    size: float
    color: tuple[int, int, int]
    gravity: float = 0.0
    glow: bool = False

    @property
    def alive(self) -> bool:
        return self.life > 0

    def update(self, dt: float) -> None:
        self.life -= dt
        self.vy += self.gravity * dt
        self.x += self.vx * dt
        self.y += self.vy * dt


class ParticleSystem:
    """Manages gameplay puffs, trails, sparkles, and ambient fireflies/leaves."""

    def __init__(self) -> None:
        self.particles: list[Particle] = []
        self.ambient: list[dict[str, float]] = []

    def clear(self) -> None:
        self.particles.clear()
        self.ambient.clear()

    def seed_ambient(self, width: int, height: int, ambient_type: str, count: int = 24) -> None:
        self.ambient.clear()
        for _ in range(count):
            self.ambient.append(
                {
                    "x": random.uniform(0, width),
                    "y": random.uniform(0, height),
                    "phase": random.uniform(0, math.tau),
                    "speed": random.uniform(8.0, 18.0),
                    "size": random.uniform(1.0, 2.2),
                    "type_idx": 0 if ambient_type == "fireflies" else (1 if ambient_type == "leaves" else 2),
                }
            )

    def spawn_dust(self, x: float, y: float, count: int = 6, color: tuple[int, int, int] = (232, 224, 200)) -> None:
        for _ in range(count):
            ang = random.uniform(-math.pi, 0.0)
            spd = random.uniform(14.0, 42.0)
            life = random.uniform(0.22, 0.42)
            self.particles.append(
                Particle(
                    x=x + random.uniform(-4, 4),
                    y=y + random.uniform(-2, 1),
                    vx=math.cos(ang) * spd,
                    vy=math.sin(ang) * spd * 0.55 - 8.0,
                    life=life,
                    max_life=life,
                    size=random.uniform(2.0, 3.5),
                    color=color,
                    gravity=35.0,
                )
            )

    def spawn_burst(
        self,
        x: float,
        y: float,
        color: tuple[int, int, int],
        count: int = 10,
        speed: float = 65.0,
        glow: bool = True,
    ) -> None:
        for _ in range(count):
            ang = random.uniform(0, math.tau)
            spd = random.uniform(speed * 0.35, speed)
            life = random.uniform(0.25, 0.55)
            self.particles.append(
                Particle(
                    x=x,
                    y=y,
                    vx=math.cos(ang) * spd,
                    vy=math.sin(ang) * spd,
                    life=life,
                    max_life=life,
                    size=random.uniform(1.8, 3.2),
                    color=color,
                    gravity=40.0,
                    glow=glow,
                )
            )

    def spawn_trail(self, x: float, y: float, trail_id: str) -> None:
        if trail_id == "sparkle_trail":
            col = random.choice([(255, 228, 122), (255, 245, 196), (138, 226, 228)])
            grav = -12.0
        elif trail_id == "petal_trail":
            col = random.choice([(245, 152, 168), (255, 198, 208), (188, 226, 158)])
            grav = 28.0
        elif trail_id == "starlight_trail":
            col = random.choice([(178, 152, 245), (130, 214, 248), (255, 240, 175)])
            grav = -6.0
        else:
            col = (220, 235, 245)
            grav = 0.0

        life = random.uniform(0.28, 0.48)
        self.particles.append(
            Particle(
                x=x + random.uniform(-3, 3),
                y=y + random.uniform(-4, 2),
                vx=random.uniform(-12, 12),
                vy=random.uniform(-14, 4),
                life=life,
                max_life=life,
                size=random.uniform(1.6, 2.8),
                color=col,
                gravity=grav,
                glow=True,
            )
        )

    def update(self, dt: float, world_w: int, world_h: int) -> None:
        for p in self.particles:
            p.update(dt)
        self.particles = [p for p in self.particles if p.alive]

        for a in self.ambient:
            a["phase"] += dt * 1.4
            if a["type_idx"] == 1:  # drifting leaves
                a["x"] += (math.sin(a["phase"]) * 8.0 - 6.0) * dt
                a["y"] += a["speed"] * 0.7 * dt
                if a["y"] > world_h:
                    a["y"] = -4
                    a["x"] = random.uniform(0, world_w)
                if a["x"] < -4:
                    a["x"] = world_w + 2
            elif a["type_idx"] == 2:  # rising spores
                a["x"] += math.sin(a["phase"]) * 6.0 * dt
                a["y"] -= a["speed"] * 0.45 * dt
                if a["y"] < -4:
                    a["y"] = world_h + 4
                    a["x"] = random.uniform(0, world_w)
            else:  # fireflies
                a["x"] += math.cos(a["phase"] * 0.8) * 9.0 * dt
                a["y"] += math.sin(a["phase"] * 1.1) * 7.0 * dt
                a["x"] %= max(1, world_w)
                a["y"] %= max(1, world_h)

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        # Ambient particles
        for a in self.ambient:
            sx = int(a["x"] - cam_x)
            sy = int(a["y"] - cam_y)
            if -8 <= sx <= surf.get_width() + 8 and -8 <= sy <= surf.get_height() + 8:
                pulse = 0.5 + 0.5 * math.sin(time_sec * 3.0 + a["phase"])
                if a["type_idx"] == 0:
                    col = (255, int(215 + 35 * pulse), 115)
                elif a["type_idx"] == 1:
                    col = (196, 152, 94)
                else:
                    col = (135, 225, 210)
                r = max(1, int(a["size"] * (0.7 + 0.4 * pulse)))
                pygame.draw.circle(surf, col, (sx, sy), r)

        # Gameplay particles
        for p in self.particles:
            ratio = max(0.0, p.life / max(0.001, p.max_life))
            r = max(1, int(p.size * ratio))
            sx = int(p.x - cam_x)
            sy = int(p.y - cam_y)
            pygame.draw.circle(surf, p.color, (sx, sy), r)


class Interactable:
    """Base world object that supports proximity [E] prompt & interaction."""

    prompt_label: str = "Interact"

    def __init__(self, x: float, y: float, w: float, h: float) -> None:
        self.rect = pygame.FRect(x, y, w, h)

    @property
    def prompt_anchor(self) -> tuple[float, float]:
        return (self.rect.centerx, self.rect.top - 6)


class Gem:
    """Collectible gem or star-gem."""

    def __init__(self, uid: str, x: float, y: float, value: int = 1) -> None:
        self.uid = uid
        self.base_x = x
        self.base_y = y
        self.rect = pygame.FRect(x - 5, y - 5, 10, 10)
        self.value = value
        self.collected = False
        self.phase = (x * 0.13 + y * 0.07) % math.tau

    def update(self, dt: float, time_sec: float) -> None:
        bob = math.sin(time_sec * 3.6 + self.phase) * 2.2
        self.rect.y = self.base_y - 5 + bob

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        if self.collected:
            return
        cx = int(self.rect.centerx - cam_x)
        cy = int(self.rect.centery - cam_y)
        if self.value >= 5:
            # Golden star-gem
            pts = [(cx, cy - 6), (cx + 5, cy), (cx, cy + 6), (cx - 5, cy)]
            pygame.draw.polygon(surf, COLORS["gold"], pts)
            pygame.draw.polygon(surf, COLORS["gold_bright"], [(cx, cy - 4), (cx + 2, cy), (cx, cy + 2), (cx - 2, cy)])
        else:
            # Teal-emerald gem
            pts = [(cx, cy - 5), (cx + 4, cy), (cx, cy + 5), (cx - 4, cy)]
            pygame.draw.polygon(surf, COLORS["sky_teal"], pts)
            pygame.draw.polygon(surf, (195, 248, 244), [(cx, cy - 3), (cx + 2, cy), (cx, cy + 1), (cx - 2, cy)])


class Trinket:
    """Unique collectible story trinket found in exploration spots."""

    def __init__(self, trinket_id: str, name: str, x: float, y: float, color: tuple[int, int, int]) -> None:
        self.trinket_id = trinket_id
        self.name = name
        self.base_y = y
        self.rect = pygame.FRect(x - 6, y - 6, 12, 12)
        self.color = color
        self.collected = False

    def update(self, dt: float, time_sec: float) -> None:
        self.rect.y = self.base_y - 6 + math.sin(time_sec * 2.6) * 2.5

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        if self.collected:
            return
        cx = int(self.rect.centerx - cam_x)
        cy = int(self.rect.centery - cam_y)
        pulse = int(7 + 2 * math.sin(time_sec * 4.0))
        pygame.draw.circle(surf, (255, 232, 148), (cx, cy), pulse, 1)
        pygame.draw.circle(surf, COLORS["espresso"], (cx, cy), 5)
        pygame.draw.circle(surf, self.color, (cx, cy), 4)
        pygame.draw.circle(surf, COLORS["cream"], (cx - 1, cy - 1), 1)


class BouncePad:
    """Cozy springy mushroom pad."""

    def __init__(self, x: float, y: float) -> None:
        self.rect = pygame.FRect(x + 1, y + 6, TILE_SIZE - 2, TILE_SIZE - 6)
        self.squash = 0.0

    def trigger(self) -> None:
        self.squash = 1.0

    def update(self, dt: float) -> None:
        if self.squash > 0:
            self.squash = max(0.0, self.squash - dt * 4.5)

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float) -> None:
        x = int(self.rect.x - cam_x)
        y = int(self.rect.y - cam_y)
        press = int(self.squash * 3)
        # Stem
        pygame.draw.rect(surf, COLORS["cream"], (x + 5, y + 4 + press, 4, 6 - press))
        # Spotted cap
        cap_rect = pygame.Rect(x - 1, y + press, 16, 6)
        pygame.draw.ellipse(surf, COLORS["coral"], cap_rect)
        pygame.draw.circle(surf, COLORS["cream"], (x + 3, y + 2 + press), 1)
        pygame.draw.circle(surf, COLORS["cream"], (x + 10, y + 2 + press), 1)


class Shrine(Interactable):
    """Fast-travel lantern shrine."""

    def __init__(self, shrine_id: str, name: str, x: float, y: float) -> None:
        super().__init__(x - 8, y - 24, 16, 24)
        self.shrine_id = shrine_id
        self.name = name
        self.attuned = False
        self.prompt_label = "Attune Shrine"

    def sync_state(self, unlocked_shrines: list[str]) -> None:
        self.attuned = self.shrine_id in unlocked_shrines
        self.prompt_label = "Fast Travel" if self.attuned else "Attune Shrine"

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        x = int(self.rect.x - cam_x)
        y = int(self.rect.y - cam_y)
        # Stone pedestal & arch
        pygame.draw.rect(surf, (124, 118, 128), (x + 2, y + 18, 12, 6))
        pygame.draw.rect(surf, (148, 142, 152), (x + 4, y + 6, 8, 12))
        pygame.draw.polygon(surf, (108, 102, 112), [(x + 1, y + 7), (x + 8, y + 1), (x + 15, y + 7)])
        # Lantern core
        if self.attuned:
            glow = int(4 + 1.5 * math.sin(time_sec * 4.5))
            pygame.draw.circle(surf, (255, 224, 110), (x + 8, y + 12), glow)
            pygame.draw.circle(surf, COLORS["white"], (x + 8, y + 12), 2)
        else:
            pygame.draw.circle(surf, (82, 86, 98), (x + 8, y + 12), 3)


class Portal(Interactable):
    """Doorway or trail arch leading to another room."""

    def __init__(self, target_level: str, target_spawn: str, label: str, x: float, y: float) -> None:
        super().__init__(x - 10, y - 24, 20, 24)
        self.target_level = target_level
        self.target_spawn = target_spawn
        self.label = label
        self.prompt_label = label

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float) -> None:
        x = int(self.rect.x - cam_x)
        y = int(self.rect.y - cam_y)
        # Cozy arched wooden doorway
        pygame.draw.rect(surf, COLORS["wood_dark"], (x + 1, y + 2, 18, 22), border_radius=6)
        pygame.draw.rect(surf, COLORS["espresso"], (x + 4, y + 5, 12, 19), border_radius=4)
        # Little warm lantern beside arch
        pygame.draw.circle(surf, COLORS["gold"], (x + 17, y + 11), 2)


class Sign(Interactable):
    """Readable wooden signpost."""

    def __init__(self, text: str, x: float, y: float) -> None:
        super().__init__(x - 7, y - 14, 14, 14)
        self.text = text
        self.prompt_label = "Read Sign"

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float) -> None:
        x = int(self.rect.x - cam_x)
        y = int(self.rect.y - cam_y)
        pygame.draw.rect(surf, COLORS["wood_dark"], (x + 6, y + 8, 2, 6))
        pygame.draw.rect(surf, COLORS["wood_light"], (x + 1, y + 2, 12, 7), border_radius=1)
        pygame.draw.line(surf, COLORS["wood_dark"], (x + 3, y + 4), (x + 10, y + 4))
        pygame.draw.line(surf, COLORS["wood_dark"], (x + 3, y + 6), (x + 8, y + 6))


class NPC(Interactable):
    """Quirky animated NPC with custom appearance & dialogue trigger."""

    def __init__(self, npc_id: str, name: str, dialogue_id: str, x: float, y: float, style: str = "frog") -> None:
        super().__init__(x - 7, y - 16, 14, 16)
        self.npc_id = npc_id
        self.name = name
        self.dialogue_id = dialogue_id
        self.style = style
        self.facing = 1
        self.prompt_label = f"Talk: {name}"

    def update(self, player_cx: float) -> None:
        if abs(player_cx - self.rect.centerx) > 4:
            self.facing = 1 if player_cx >= self.rect.centerx else -1

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        x = int(self.rect.x - cam_x)
        y = int(self.rect.y - cam_y)
        bob = int(round(math.sin(time_sec * 3.0 + len(self.npc_id)) * 1.0))

        if self.style == "frog":
            # Pip the Frog Merchant: plump green frog with amber beret & satchel
            pygame.draw.ellipse(surf, (98, 168, 92), (x + 1, y + 5 + bob, 12, 11))
            pygame.draw.ellipse(surf, (198, 224, 152), (x + 3, y + 9 + bob, 8, 6))
            # Eyes on top
            pygame.draw.circle(surf, (98, 168, 92), (x + 4, y + 4 + bob), 3)
            pygame.draw.circle(surf, (98, 168, 92), (x + 10, y + 4 + bob), 3)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 4 + self.facing, y + 4 + bob), 1)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 10 + self.facing, y + 4 + bob), 1)
            # Beret
            pygame.draw.ellipse(surf, COLORS["coral"], (x + 2, y + 1 + bob, 10, 4))
        elif self.style == "willow":
            # Grandma Willow: cozy elder owl/spirit in plum shawl
            pygame.draw.ellipse(surf, (158, 122, 98), (x + 1, y + 3 + bob, 12, 13))
            pygame.draw.rect(surf, COLORS["plum"], (x + 1, y + 9 + bob, 12, 6), border_radius=2)
            # Spectacles & eyes
            pygame.draw.circle(surf, COLORS["cream"], (x + 4, y + 6 + bob), 2)
            pygame.draw.circle(surf, COLORS["cream"], (x + 10, y + 6 + bob), 2)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 4 + self.facing, y + 6 + bob), 1)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 10 + self.facing, y + 6 + bob), 1)
        elif self.style == "fox":
            # Bramble the Fox Cartographer: russet fox with teal scarf
            pygame.draw.polygon(surf, (214, 118, 64), [(x + 2, y + 5 + bob), (x + 4, y + bob), (x + 6, y + 5 + bob)])
            pygame.draw.polygon(surf, (214, 118, 64), [(x + 8, y + 5 + bob), (x + 10, y + bob), (x + 12, y + 5 + bob)])
            pygame.draw.ellipse(surf, (224, 126, 70), (x + 2, y + 4 + bob, 10, 11))
            pygame.draw.rect(surf, COLORS["sky_teal"], (x + 2, y + 10 + bob, 10, 3))
            pygame.draw.circle(surf, COLORS["espresso"], (x + 5 + self.facing, y + 7 + bob), 1)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 9 + self.facing, y + 7 + bob), 1)
        else:
            # Luma Spirit: floating luminescent sprout sprite
            float_y = int(round(math.sin(time_sec * 4.0) * 2.0))
            pygame.draw.circle(surf, (165, 240, 224), (x + 7, y + 8 + float_y), 6)
            pygame.draw.circle(surf, COLORS["white"], (x + 7, y + 8 + float_y), 4)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 5 + self.facing, y + 8 + float_y), 1)
            pygame.draw.circle(surf, COLORS["espresso"], (x + 9 + self.facing, y + 8 + float_y), 1)
