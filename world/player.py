"""Cozy Player controller with FRect physics, coyote time, jump buffer, and badges."""

from __future__ import annotations

import math
from typing import TYPE_CHECKING
import pygame

from settings import (
    AIR_ACCEL,
    AIR_DECEL,
    BASE_MOVE_SPEED,
    BOUNCE_PAD_VELOCITY,
    COLORS,
    COYOTE_TIME,
    DASH_COOLDOWN,
    DASH_DURATION,
    DASH_SPEED,
    DOUBLE_JUMP_VELOCITY,
    GRAVITY,
    JUMP_BUFFER_TIME,
    JUMP_CUT_MULT,
    JUMP_VELOCITY,
    KEYS_DASH,
    KEYS_JUMP,
    KEYS_LEFT,
    KEYS_RIGHT,
    MAX_FALL_SPEED,
    SPEED_BOOST_MULT,
    MOVE_ACCEL,
    MOVE_DECEL,
)
from core.tween import exp_damp

if TYPE_CHECKING:
    from core.audio import AudioManager
    from core.save import GameProgress
    from world.entities import ParticleSystem
    from world.level import Level


class Player:
    """Sub-pixel FRect platformer character driven by equipped badges."""

    WIDTH = 10.0
    HEIGHT = 14.0

    def __init__(self, x: float, y: float) -> None:
        self.rect = pygame.FRect(x - self.WIDTH / 2, y - self.HEIGHT, self.WIDTH, self.HEIGHT)
        self.vx = 0.0
        self.vy = 0.0
        self.facing = 1
        self.on_ground = False
        self.coyote_timer = 0.0
        self.jump_buffer_timer = 0.0
        self.air_jumps_left = 0

        self.dash_timer = 0.0
        self.dash_cooldown_timer = 0.0
        self.dash_dir = 1

        self.last_safe_pos = (self.rect.x, self.rect.y)
        self.respawn_flash = 0.0

        # Squash & stretch animation state
        self.scale_x = 1.0
        self.scale_y = 1.0
        self.walk_cycle = 0.0
        self.trail_timer = 0.0
        self.blink_timer = 2.5

    @property
    def center(self) -> tuple[float, float]:
        return (self.rect.centerx, self.rect.centery)

    def place_at(self, x: float, y: float) -> None:
        self.rect.x = x - self.WIDTH / 2
        self.rect.y = y - self.HEIGHT
        self.vx = 0.0
        self.vy = 0.0
        self.last_safe_pos = (self.rect.x, self.rect.y)

    def handle_event(
        self,
        event: pygame.event.Event,
        progress: GameProgress,
        audio: AudioManager,
        particles: ParticleSystem,
    ) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in KEYS_JUMP:
                self.jump_buffer_timer = JUMP_BUFFER_TIME
                # Try immediate double-jump if airborne and coyote expired
                if not self.on_ground and self.coyote_timer <= 0 and self.air_jumps_left > 0:
                    self._perform_double_jump(audio, particles)
            elif event.key in KEYS_DASH and progress.is_equipped("breeze_dash"):
                if self.dash_cooldown_timer <= 0 and self.dash_timer <= 0:
                    self.dash_timer = DASH_DURATION
                    self.dash_cooldown_timer = DASH_COOLDOWN
                    self.dash_dir = self.facing
                    self.vy = 0.0
                    self.scale_x = 1.32
                    self.scale_y = 0.74
                    audio.play("dash")
                    particles.spawn_burst(
                        self.rect.centerx, self.rect.centery, (158, 232, 232), count=8, speed=55.0
                    )

        elif event.type == pygame.KEYUP:
            if event.key in KEYS_JUMP and self.vy < 0:
                self.vy *= JUMP_CUT_MULT

    def _perform_jump(self, audio: AudioManager, particles: ParticleSystem) -> None:
        self.vy = JUMP_VELOCITY
        self.on_ground = False
        self.coyote_timer = 0.0
        self.jump_buffer_timer = 0.0
        self.scale_x = 0.76
        self.scale_y = 1.28
        audio.play("jump")
        particles.spawn_dust(self.rect.centerx, self.rect.bottom, count=5)

    def _perform_double_jump(self, audio: AudioManager, particles: ParticleSystem) -> None:
        self.vy = DOUBLE_JUMP_VELOCITY
        self.air_jumps_left -= 1
        self.jump_buffer_timer = 0.0
        self.scale_x = 0.78
        self.scale_y = 1.24
        audio.play("double_jump")
        particles.spawn_burst(
            self.rect.centerx, self.rect.bottom, (250, 243, 224), count=7, speed=45.0
        )

    def update(
        self,
        dt: float,
        level: Level,
        progress: GameProgress,
        audio: AudioManager,
        particles: ParticleSystem,
    ) -> None:
        keys = pygame.key.get_pressed()
        move_dir = 0
        if any(keys[k] for k in KEYS_LEFT):
            move_dir -= 1
        if any(keys[k] for k in KEYS_RIGHT):
            move_dir += 1

        if move_dir != 0 and self.dash_timer <= 0:
            self.facing = move_dir

        # Timers
        if self.coyote_timer > 0:
            self.coyote_timer = max(0.0, self.coyote_timer - dt)
        if self.jump_buffer_timer > 0:
            self.jump_buffer_timer = max(0.0, self.jump_buffer_timer - dt)
        if self.dash_cooldown_timer > 0:
            self.dash_cooldown_timer = max(0.0, self.dash_cooldown_timer - dt)
        if self.respawn_flash > 0:
            self.respawn_flash = max(0.0, self.respawn_flash - dt)

        # Horizontal velocity
        max_speed = BASE_MOVE_SPEED * (SPEED_BOOST_MULT if progress.is_equipped("clover_boots") else 1.0)
        if self.dash_timer > 0:
            self.dash_timer -= dt
            self.vx = self.dash_dir * DASH_SPEED
            self.vy = 0.0
            particles.spawn_trail(self.rect.centerx, self.rect.centery, "dash")
        else:
            accel = MOVE_ACCEL if self.on_ground else AIR_ACCEL
            decel = MOVE_DECEL if self.on_ground else AIR_DECEL
            if progress.is_equipped("clover_boots"):
                accel *= 1.2
            if move_dir != 0:
                target_vx = move_dir * max_speed
                if self.vx < target_vx:
                    self.vx = min(target_vx, self.vx + accel * dt)
                elif self.vx > target_vx:
                    self.vx = max(target_vx, self.vx - accel * dt)
            else:
                if self.vx > 0:
                    self.vx = max(0.0, self.vx - decel * dt)
                elif self.vx < 0:
                    self.vx = min(0.0, self.vx + decel * dt)

            # Gravity
            self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)

        # Buffered jump + Coyote jump
        if self.jump_buffer_timer > 0 and (self.on_ground or self.coyote_timer > 0):
            self._perform_jump(audio, particles)

        # Move X & collide solid tiles
        self.rect.x += self.vx * dt
        self.rect.x = max(0.0, min(float(level.pixel_w - self.WIDTH), self.rect.x))
        for tile in level.solid_rects_near(self.rect):
            if self.rect.colliderect(tile):
                if self.vx > 0:
                    self.rect.right = tile.left
                elif self.vx < 0:
                    self.rect.left = tile.right
                self.vx = 0.0

        # Move Y & collide solid + one-way tiles
        was_on_ground = self.on_ground
        prev_bottom = self.rect.bottom
        self.rect.y += self.vy * dt
        self.on_ground = False

        for tile in level.solid_rects_near(self.rect):
            if self.rect.colliderect(tile):
                if self.vy > 0:
                    self.rect.bottom = tile.top
                    self.vy = 0.0
                    self.on_ground = True
                elif self.vy < 0:
                    self.rect.top = tile.bottom
                    self.vy = 0.0

        # One-way bridges (only land when falling onto top surface)
        if self.vy >= 0:
            for plat in level.oneway_rects_near(self.rect):
                if self.rect.colliderect(plat) and prev_bottom <= plat.top + 3.0:
                    self.rect.bottom = plat.top
                    self.vy = 0.0
                    self.on_ground = True

        # Grounded transitions
        if self.on_ground:
            self.coyote_timer = COYOTE_TIME
            self.air_jumps_left = 1 if progress.is_equipped("feather_badge") else 0
            if not was_on_ground:
                self.scale_x = 1.24
                self.scale_y = 0.78
                audio.play("land")
                particles.spawn_dust(self.rect.centerx, self.rect.bottom, count=5)
            # Record safe respawn ledge if standing cleanly over safe support
            if level.is_safe_ledge(self.rect):
                self.last_safe_pos = (self.rect.x, self.rect.y)
        elif was_on_ground and self.vy >= 0:
            # Walked off ledge -> grant coyote time
            self.coyote_timer = COYOTE_TIME

        # Bouncy mushrooms
        for pad in level.bounce_pads:
            if self.rect.colliderect(pad.rect) and self.vy >= -40:
                self.vy = BOUNCE_PAD_VELOCITY
                self.on_ground = False
                self.coyote_timer = 0.0
                self.air_jumps_left = 1 if progress.is_equipped("feather_badge") else 0
                self.scale_x = 0.72
                self.scale_y = 1.34
                pad.trigger()
                audio.play("bounce")
                particles.spawn_burst(pad.rect.centerx, pad.rect.top, COLORS["coral"], count=8, speed=50.0)

        # Gentle hazard / void respawn (Zero-Stress Platforming)
        if level.hits_hazard(self.rect) or self.rect.top > level.pixel_h + 18:
            particles.spawn_burst(self.rect.centerx, self.rect.centery, COLORS["sky_teal"], count=12, speed=60.0)
            self.rect.x, self.rect.y = self.last_safe_pos
            self.vx = 0.0
            self.vy = 0.0
            self.dash_timer = 0.0
            self.respawn_flash = 0.45
            audio.play("respawn")
            particles.spawn_burst(self.rect.centerx, self.rect.centery, COLORS["cream"], count=10, speed=45.0)

        # Cosmetic trails
        active_trail = next((b for b in progress.equipped_badges if b.endswith("_trail")), None)
        if active_trail and (abs(self.vx) > 25 or abs(self.vy) > 35):
            self.trail_timer += dt
            if self.trail_timer >= 0.055:
                self.trail_timer = 0.0
                particles.spawn_trail(self.rect.centerx, self.rect.bottom - 3, active_trail)

        # Visual animations
        self.scale_x = exp_damp(self.scale_x, 1.0, 14.0, dt)
        self.scale_y = exp_damp(self.scale_y, 1.0, 14.0, dt)
        if self.on_ground and abs(self.vx) > 12:
            self.walk_cycle += dt * (abs(self.vx) * 0.14)
        else:
            self.walk_cycle = 0.0
        self.blink_timer -= dt
        if self.blink_timer <= -0.12:
            self.blink_timer = 2.8

    def render(self, surf: pygame.Surface, cam_x: float, cam_y: float) -> None:
        if self.respawn_flash > 0 and int(self.respawn_flash * 20) % 2 == 0:
            return

        cx = int(round(self.rect.centerx - cam_x))
        bottom_y = int(round(self.rect.bottom - cam_y))

        w = max(6, int(round(12 * self.scale_x)))
        h = max(8, int(round(15 * self.scale_y)))
        x = cx - w // 2
        y = bottom_y - h

        # Soft ground shadow
        if self.on_ground:
            pygame.draw.ellipse(surf, (30, 24, 28), (cx - 5, bottom_y - 1, 10, 3))

        # Fluttering scarf tail
        scarf_dx = -self.facing * (3 + int(abs(self.vx) * 0.02))
        scarf_dy = int(math.sin(self.walk_cycle) * 1.5)
        pygame.draw.line(
            surf,
            COLORS["coral"],
            (cx, y + h // 2),
            (cx + scarf_dx, y + h // 2 + 2 + scarf_dy),
            2,
        )

        # Cloak / body
        body_rect = pygame.Rect(x + 1, y + 5, w - 2, h - 5)
        pygame.draw.rect(surf, COLORS["sage"], body_rect, border_radius=3)

        # Feet bob
        foot_offset = int(round(math.sin(self.walk_cycle) * 1.5)) if self.on_ground and abs(self.vx) > 12 else 0
        pygame.draw.rect(surf, COLORS["espresso"], (cx - 3, bottom_y - 2 + max(0, foot_offset), 2, 2))
        pygame.draw.rect(surf, COLORS["espresso"], (cx + 1, bottom_y - 2 + max(0, -foot_offset), 2, 2))

        # Hooded head & sprout leaf
        head_rect = pygame.Rect(x, y + 1, w, max(7, h // 2 + 1))
        pygame.draw.rect(surf, COLORS["moss"], head_rect, border_radius=4)
        # Cute sprout stem on cap
        pygame.draw.line(surf, COLORS["moss_light"], (cx, y + 1), (cx + self.facing * 2, y - 2), 2)

        # Face opening & eyes
        face_x = cx + (1 if self.facing > 0 else -4)
        pygame.draw.rect(surf, COLORS["cream"], (face_x - 1, y + 4, 5, 4), border_radius=1)
        if self.blink_timer > 0:
            eye_x = cx + (2 if self.facing > 0 else -3)
            pygame.draw.circle(surf, COLORS["espresso"], (eye_x, y + 6), 1)
