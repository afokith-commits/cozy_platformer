"""Main exploration gameplay state: world simulation, camera, pickups, interactions."""

from __future__ import annotations

import json
import math
from typing import Any
import pygame

from settings import (
    COLORS,
    DATA_DIR,
    GEM_MAGNET_RADIUS,
    INTERACT_RADIUS,
    KEYS_INTERACT,
    KEYS_INVENTORY,
    KEYS_MAP,
    KEYS_PAUSE,
    SCREEN_H,
    SCREEN_W,
)
from core.save import GameProgress, load_progress, save_progress
from core.state import State, StateManager
from world.entities import NPC, ParticleSystem, Portal, Shrine, Sign
from world.level import Level
from world.player import Player
from ui.hud import HUD
from ui.prompts import PromptBubble


class PlayState(State):
    """Base exploration state sitting at index 0 of the State Stack."""

    transparent = False
    dim_background = False

    def __init__(self, manager: StateManager, progress: GameProgress | None = None) -> None:
        super().__init__(manager)
        self.progress = progress or load_progress()
        self.items_meta: dict[str, Any] = json.loads(
            (DATA_DIR / "items.json").read_text(encoding="utf-8")
        )
        self.dialogues_data: dict[str, Any] = json.loads(
            (DATA_DIR / "dialogues.json").read_text(encoding="utf-8")
        )

        self.particles = ParticleSystem()
        self.hud = HUD()
        self.prompt = PromptBubble()
        self.time_sec = 0.0

        self.level: Level
        self.player = Player(64.0, 128.0)
        self.nearest_interactable: Any | None = None

        self.load_level(self.progress.current_level, self.progress.spawn_id, snap=True)
        self.manager.audio.set_sfx_volume(self.progress.sfx_volume)
        self.manager.audio.set_music_volume(self.progress.music_volume)
        self.manager.audio.start_music()

    def load_level(self, level_id: str, spawn_id: str = "start", snap: bool = True) -> None:
        self.level = Level.load(level_id, self.items_meta)
        self.level.sync_collected(
            self.progress.collected_gems,
            self.progress.trinkets,
            self.progress.unlocked_shrines,
        )
        sx, sy = self.level.spawns.get(spawn_id, self.level.spawns["start"])
        self.player.place_at(sx, sy)
        self.progress.current_level = level_id
        self.progress.spawn_id = spawn_id
        self.particles.clear()
        self.particles.seed_ambient(self.level.pixel_w, self.level.pixel_h, self.level.ambient_type)
        if snap:
            self.level.snap_camera(self.player.rect.centerx, self.player.rect.centery)

    def transition_to_level(self, level_id: str, spawn_id: str) -> None:
        def _swap() -> None:
            self.load_level(level_id, spawn_id, snap=True)
            save_progress(self.progress)
            self.hud.notify(f"Arrived at {self.level.name}")

        self.manager.audio.play("warp")
        self.manager.start_transition(_swap)

    def save(self, silent: bool = False) -> None:
        save_progress(self.progress)
        if not silent:
            self.hud.notify("Progress Saved")

    def reset_save(self) -> None:
        self.progress = GameProgress()
        save_progress(self.progress)
        self.load_level(self.progress.current_level, self.progress.spawn_id, snap=True)
        self.hud.notify("Started Fresh Adventure")

    def _find_nearest_interactable(self) -> Any | None:
        px, py = self.player.center
        best = None
        best_dist = INTERACT_RADIUS
        for obj in self.level.all_interactables():
            ox, oy = obj.rect.centerx, obj.rect.centery
            dist = math.hypot(px - ox, py - oy)
            if dist <= best_dist:
                best_dist = dist
                best = obj
        return best

    def _trigger_interactable(self, obj: Any) -> None:
        from states.dialogue_state import DialogueState
        from states.map_state import MapState

        if isinstance(obj, NPC):
            self.manager.audio.play("blip")
            self.manager.push(DialogueState(self.manager, self, npc_id=obj.dialogue_id, speaker=obj.name, style=obj.style))
        elif isinstance(obj, Sign):
            self.manager.audio.play("blip")
            self.manager.push(DialogueState(self.manager, self, sign_text=obj.text))
        elif isinstance(obj, Portal):
            self.transition_to_level(obj.target_level, obj.target_spawn)
        elif isinstance(obj, Shrine):
            if obj.shrine_id not in self.progress.unlocked_shrines:
                self.progress.unlocked_shrines.append(obj.shrine_id)
                obj.sync_state(self.progress.unlocked_shrines)
                self.manager.audio.play("shrine")
                self.particles.spawn_burst(obj.rect.centerx, obj.rect.centery, COLORS["gold_bright"], count=16, speed=75.0)
                self.hud.notify(f"Shrine Attuned: {obj.name}")
                save_progress(self.progress)
            else:
                self.manager.audio.play("blip")
                self.manager.push(MapState(self.manager, self))

    def handle_event(self, event: pygame.event.Event) -> None:
        from states.inventory_state import InventoryState
        from states.map_state import MapState
        from states.pause_state import PauseState

        self.player.handle_event(event, self.progress, self.manager.audio, self.particles)

        if event.type == pygame.KEYDOWN:
            if event.key in KEYS_INTERACT and self.nearest_interactable is not None:
                self._trigger_interactable(self.nearest_interactable)
            elif event.key in KEYS_INVENTORY:
                self.manager.audio.play("blip")
                self.manager.push(InventoryState(self.manager, self))
            elif event.key in KEYS_MAP:
                self.manager.audio.play("blip")
                self.manager.push(MapState(self.manager, self))
            elif event.key in KEYS_PAUSE:
                self.manager.audio.play("blip")
                self.manager.push(PauseState(self.manager, self))

    def update(self, dt: float) -> None:
        self.time_sec += dt
        self.player.update(dt, self.level, self.progress, self.manager.audio, self.particles)
        self.level.update_entities(dt, self.time_sec, self.player.rect.centerx)
        self.level.update_camera(self.player.rect.centerx, self.player.rect.centery, self.player.facing, dt)

        # Gem collection (with optional Magnet Charm pull)
        px, py = self.player.center
        has_magnet = self.progress.is_equipped("magnet_charm")
        for gem in self.level.gems:
            if gem.collected:
                continue
            if has_magnet:
                dx = px - gem.rect.centerx
                dy = py - gem.rect.centery
                dist = math.hypot(dx, dy)
                if 1.0 < dist < GEM_MAGNET_RADIUS:
                    pull = 140.0 * dt
                    gem.base_x += (dx / dist) * pull
                    gem.base_y += (dy / dist) * pull
                    gem.rect.centerx = gem.base_x
                    gem.rect.centery = gem.base_y

            if self.player.rect.colliderect(gem.rect):
                gem.collected = True
                self.progress.gems += gem.value
                self.progress.collected_gems.append(gem.uid)
                self.manager.audio.play("gem")
                col = COLORS["gold_bright"] if gem.value >= 5 else COLORS["sky_teal"]
                self.particles.spawn_burst(gem.rect.centerx, gem.rect.centery, col, count=9, speed=55.0)
                if gem.value >= 5:
                    self.hud.notify("+5 Star Gem!")

        # Unique Trinket collection
        for trinket in self.level.trinkets:
            if not trinket.collected and self.player.rect.colliderect(trinket.rect):
                trinket.collected = True
                if trinket.trinket_id not in self.progress.trinkets:
                    self.progress.trinkets.append(trinket.trinket_id)
                self.manager.audio.play("trinket")
                self.particles.spawn_burst(trinket.rect.centerx, trinket.rect.centery, COLORS["gold_bright"], count=18, speed=80.0)
                self.hud.notify(f"Found Trinket: {trinket.name}!")
                save_progress(self.progress)

        self.particles.update(dt, self.level.pixel_w, self.level.pixel_h)
        self.nearest_interactable = self._find_nearest_interactable()
        self.prompt.update(dt, self.nearest_interactable)
        self.hud.update(dt, self.progress)

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        self.level.render(world_surf, self.time_sec)
        self.player.render(world_surf, self.level.cam_x, self.level.cam_y)
        self.particles.render(world_surf, self.level.cam_x, self.level.cam_y, self.time_sec)

        pygame.transform.scale(world_surf, (SCREEN_W, SCREEN_H), screen)

        self.prompt.render(screen, self.level.cam_x, self.level.cam_y, self.time_sec)
        total_trinkets = len(self.items_meta.get("trinkets", {}))
        self.hud.render(screen, self.progress, self.player, self.level.name, total_trinkets=total_trinkets)
