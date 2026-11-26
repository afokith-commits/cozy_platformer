"""Minimal RPG-lite HUD with bouncy gem counter, active badges, and toast banners."""

from __future__ import annotations

from typing import TYPE_CHECKING
import pygame

from settings import COLORS, SCREEN_W
from core.tween import ease_out_cubic, exp_damp
from ui.widgets import NineSlicePanel, draw_badge_icon, draw_gem_icon, get_font

if TYPE_CHECKING:
    from core.save import GameProgress
    from world.player import Player


class HUD:
    """Always-on top-screen cozy HUD rendered at crisp 1280x720 resolution."""

    def __init__(self) -> None:
        self._gem_scale = 1.0
        self._last_gems = -1
        self._toast_text = ""
        self._toast_timer = 0.0
        self._toast_max = 2.6

    def notify(self, message: str, duration: float = 2.6) -> None:
        self._toast_text = message
        self._toast_timer = duration
        self._toast_max = duration

    def bounce_gem(self) -> None:
        self._gem_scale = 1.42

    def update(self, dt: float, progress: GameProgress) -> None:
        if self._last_gems >= 0 and progress.gems > self._last_gems:
            self.bounce_gem()
        self._last_gems = progress.gems
        self._gem_scale = exp_damp(self._gem_scale, 1.0, 12.0, dt)
        if self._toast_timer > 0:
            self._toast_timer = max(0.0, self._toast_timer - dt)

    def render(
        self,
        screen: pygame.Surface,
        progress: GameProgress,
        player: Player,
        level_name: str,
        total_trinkets: int = 4,
    ) -> None:
        # Top-left: Gem counter & Room badge
        NineSlicePanel.draw(screen, pygame.FRect(20, 18, 250, 74), style="parchment")
        gem_cx = 52
        gem_cy = 44
        draw_gem_icon(screen, gem_cx, gem_cy, size=int(13 * self._gem_scale))

        gem_font = get_font(26, bold=True)
        gem_txt = gem_font.render(f"{progress.gems}", True, COLORS["espresso"])
        screen.blit(gem_txt, (76, 27))

        sub_font = get_font(15, bold=True)
        trinket_txt = sub_font.render(
            f"Trinkets {len(progress.trinkets)}/{total_trinkets}", True, COLORS["wood_mid"]
        )
        screen.blit(trinket_txt, (148, 34))

        room_txt = sub_font.render(level_name, True, COLORS["moss"])
        screen.blit(room_txt, (36, 62))

        # Top-right: Quick key hints + equipped ability badges
        NineSlicePanel.draw(screen, pygame.FRect(SCREEN_W - 332, 18, 312, 46), style="wood")
        hint_font = get_font(15, bold=True)
        hint_surf = hint_font.render("[Tab] Bag   [M] Map   [Esc] Menu", True, COLORS["cream"])
        screen.blit(hint_surf, (SCREEN_W - 314, 31))

        # Equipped badge icons row below top-right pill
        if progress.equipped_badges:
            bx = SCREEN_W - 44
            by = 92
            for badge_id in reversed(progress.equipped_badges):
                draw_badge_icon(screen, bx, by, badge_id, radius=16)
                if badge_id == "breeze_dash" and player.dash_cooldown_timer > 0:
                    ratio = min(1.0, player.dash_cooldown_timer / 0.55)
                    pygame.draw.arc(
                        screen,
                        COLORS["coral"],
                        (bx - 18, by - 18, 36, 36),
                        0,
                        6.28 * ratio,
                        3,
                    )
                bx -= 42

        # Toast banner (top-center)
        if self._toast_timer > 0 and self._toast_text:
            fade = 1.0
            if self._toast_timer < 0.4:
                fade = self._toast_timer / 0.4
            elif self._toast_max - self._toast_timer < 0.25:
                fade = ease_out_cubic((self._toast_max - self._toast_timer) / 0.25)

            t_font = get_font(20, bold=True)
            tw = max(220, t_font.size(self._toast_text)[0] + 48)
            slide_y = int(18 + (1.0 - fade) * -18)
            rect = pygame.FRect(SCREEN_W / 2 - tw / 2, slide_y, tw, 44)
            NineSlicePanel.draw(screen, rect, style="parchment", alpha=int(255 * fade))
            txt = t_font.render(self._toast_text, True, COLORS["espresso"])
            txt.set_alpha(int(255 * fade))
            screen.blit(txt, (int(rect.centerx - txt.get_width() / 2), int(rect.centery - txt.get_height() / 2)))
