"""World-space floating [E] interaction prompts rendered crisply at UI resolution."""

from __future__ import annotations

import math
import pygame

from settings import COLORS, SCREEN_H, SCREEN_W, UI_SCALE
from core.tween import exp_damp
from ui.widgets import NineSlicePanel, get_font


class PromptBubble:
    """Smoothly fading & bobbing [E] prompt above the nearest interactable."""

    def __init__(self) -> None:
        self.alpha = 0.0
        self.label = ""
        self.world_x = 0.0
        self.world_y = 0.0

    def update(self, dt: float, target: object | None) -> None:
        if target is not None:
            self.label = getattr(target, "prompt_label", "Interact")
            ax, ay = target.prompt_anchor
            self.world_x = ax
            self.world_y = ay
            self.alpha = exp_damp(self.alpha, 1.0, 14.0, dt)
        else:
            self.alpha = exp_damp(self.alpha, 0.0, 14.0, dt)

    def render(self, screen: pygame.Surface, cam_x: float, cam_y: float, time_sec: float) -> None:
        if self.alpha <= 0.04 or not self.label:
            return

        sx = (self.world_x - cam_x) * UI_SCALE
        sy = (self.world_y - cam_y) * UI_SCALE - 22 + math.sin(time_sec * 4.2) * 4.0
        sx = max(90.0, min(SCREEN_W - 90.0, sx))
        sy = max(48.0, min(SCREEN_H - 48.0, sy))

        font = get_font(17, bold=True)
        key_font = get_font(16, bold=True)
        text_w = font.size(self.label)[0]
        pill_w = max(96, text_w + 58)
        pill_h = 36
        rect = pygame.FRect(sx - pill_w / 2, sy - pill_h / 2, pill_w, pill_h)

        alpha_i = int(245 * self.alpha)
        NineSlicePanel.draw(screen, rect, style="parchment", shadow=True, alpha=alpha_i)

        # Little [E] badge on left
        key_box = pygame.Rect(int(rect.x + 10), int(rect.y + 7), 24, 22)
        pygame.draw.rect(screen, COLORS["wood_dark"], key_box, border_radius=5)
        k_surf = key_font.render("E", True, COLORS["gold_bright"])
        screen.blit(k_surf, (key_box.centerx - k_surf.get_width() // 2, key_box.centery - k_surf.get_height() // 2))

        l_surf = font.render(self.label, True, COLORS["espresso"])
        l_surf.set_alpha(alpha_i)
        screen.blit(l_surf, (int(rect.x + 42), int(rect.centery - l_surf.get_height() / 2)))
