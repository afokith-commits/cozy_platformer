"""Custom tactile UI widgets: 9-slice panels, bouncy buttons, typewriter box, sliders."""

from __future__ import annotations

import math
from typing import Callable
import pygame

from settings import COLORS
from core.tween import clamp, exp_damp


_FONT_CACHE: dict[tuple[int, bool], pygame.font.Font] = {}


def get_font(size: int, bold: bool = False) -> pygame.font.Font:
    key = (size, bold)
    if key not in _FONT_CACHE:
        _FONT_CACHE[key] = pygame.font.SysFont("trebuchetms,segoeui,verdana", size, bold=bold)
    return _FONT_CACHE[key]


def wrap_text(text: str, font: pygame.font.Font, max_width: int) -> list[str]:
    """Word-wrap text cleanly to fit max_width pixels."""
    lines: list[str] = []
    for paragraph in text.splitlines() or [""]:
        words = paragraph.split(" ")
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if font.size(candidate)[0] <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        lines.append(current)
    return lines


def draw_gem_icon(surf: pygame.Surface, cx: int, cy: int, size: int = 12, gold: bool = False) -> None:
    fill = COLORS["gold"] if gold else COLORS["sky_teal"]
    hi = COLORS["gold_bright"] if gold else (200, 250, 246)
    pts = [(cx, cy - size), (cx + int(size * 0.8), cy), (cx, cy + size), (cx - int(size * 0.8), cy)]
    pygame.draw.polygon(surf, COLORS["espresso"], [(p[0], p[1] + 1) for p in pts])
    pygame.draw.polygon(surf, fill, pts)
    pygame.draw.polygon(surf, COLORS["espresso"], pts, 2)
    pygame.draw.polygon(surf, hi, [(cx, cy - size + 3), (cx + int(size * 0.35), cy - 1), (cx, cy + 2), (cx - int(size * 0.35), cy - 1)])


def draw_badge_icon(surf: pygame.Surface, cx: int, cy: int, item_id: str, radius: int = 16) -> None:
    """Crisp vector emblem for badges, trails, and trinkets."""
    pygame.draw.circle(surf, COLORS["espresso"], (cx, cy + 2), radius)
    if item_id == "feather_badge":
        pygame.draw.circle(surf, (236, 245, 242), (cx, cy), radius)
        pygame.draw.ellipse(surf, COLORS["sky_teal"], (cx - 8, cy - 10, 16, 20))
        pygame.draw.line(surf, COLORS["cream"], (cx - 4, cy + 7), (cx + 5, cy - 7), 2)
    elif item_id == "breeze_dash":
        pygame.draw.circle(surf, (214, 240, 242), (cx, cy), radius)
        pygame.draw.line(surf, COLORS["sky_teal"], (cx - 8, cy - 4), (cx + 7, cy - 4), 3)
        pygame.draw.line(surf, COLORS["moss"], (cx - 5, cy + 2), (cx + 9, cy + 2), 3)
        pygame.draw.line(surf, COLORS["sky_teal"], (cx - 9, cy + 7), (cx + 3, cy + 7), 2)
    elif item_id == "clover_boots":
        pygame.draw.circle(surf, (226, 242, 212), (cx, cy), radius)
        pygame.draw.circle(surf, COLORS["moss"], (cx - 4, cy - 2), 5)
        pygame.draw.circle(surf, COLORS["moss"], (cx + 4, cy - 2), 5)
        pygame.draw.circle(surf, COLORS["moss_light"], (cx, cy - 6), 5)
        pygame.draw.line(surf, COLORS["wood_dark"], (cx, cy + 1), (cx, cy + 9), 2)
    elif item_id == "magnet_charm":
        pygame.draw.circle(surf, (248, 228, 224), (cx, cy), radius)
        pygame.draw.arc(surf, COLORS["coral"], (cx - 8, cy - 7, 16, 16), 0, math.pi, 4)
        pygame.draw.rect(surf, COLORS["cream"], (cx - 8, cy + 1, 4, 5))
        pygame.draw.rect(surf, COLORS["cream"], (cx + 4, cy + 1, 4, 5))
    elif item_id.endswith("_trail"):
        col = COLORS["gold"] if "sparkle" in item_id else (COLORS["coral"] if "petal" in item_id else COLORS["plum"])
        pygame.draw.circle(surf, COLORS["parchment"], (cx, cy), radius)
        pygame.draw.circle(surf, col, (cx - 4, cy + 4), 4)
        pygame.draw.circle(surf, col, (cx + 2, cy - 2), 5)
        pygame.draw.circle(surf, COLORS["white"], (cx + 6, cy - 6), 2)
    else:
        pygame.draw.circle(surf, COLORS["gold"], (cx, cy), radius)
        pygame.draw.circle(surf, COLORS["cream"], (cx - 3, cy - 3), max(3, radius // 4))
    pygame.draw.circle(surf, COLORS["wood_dark"], (cx, cy), radius, 2)


class NineSlicePanel:
    """Procedural 9-slice texture renderer so rounded cozy panels scale without corner distortion."""

    _TEMPLATES: dict[str, tuple[pygame.Surface, int]] = {}

    @classmethod
    def _get_template(cls, style: str) -> tuple[pygame.Surface, int]:
        if style in cls._TEMPLATES:
            return cls._TEMPLATES[style]

        size = 48
        corner = 14
        surf = pygame.Surface((size, size), pygame.SRCALPHA)
        if style == "wood":
            outer, fill, inner = COLORS["espresso"], COLORS["wood_mid"], COLORS["wood_light"]
        elif style == "dark":
            outer, fill, inner = (22, 16, 20), (54, 42, 46), (86, 68, 72)
        else:  # parchment
            outer, fill, inner = COLORS["wood_dark"], COLORS["parchment"], COLORS["cream"]

        pygame.draw.rect(surf, outer, (0, 0, size, size), border_radius=12)
        pygame.draw.rect(surf, fill, (3, 3, size - 6, size - 6), border_radius=10)
        pygame.draw.rect(surf, inner, (6, 6, size - 12, size - 12), width=2, border_radius=8)
        cls._TEMPLATES[style] = (surf, corner)
        return surf, corner

    @classmethod
    def draw(
        cls,
        target: pygame.Surface,
        rect: pygame.Rect | pygame.FRect,
        style: str = "parchment",
        shadow: bool = True,
        alpha: int = 255,
    ) -> None:
        r = pygame.Rect(int(rect.x), int(rect.y), max(32, int(rect.w)), max(32, int(rect.h)))
        if shadow:
            sh = pygame.Surface((r.w, r.h), pygame.SRCALPHA)
            pygame.draw.rect(sh, (20, 14, 18, int(90 * (alpha / 255.0))), (0, 0, r.w, r.h), border_radius=14)
            target.blit(sh, (r.x + 4, r.y + 6))

        src, c = cls._get_template(style)
        sw, sh = src.get_size()
        mid_sw = sw - 2 * c
        mid_sh = sh - 2 * c
        mid_dw = max(1, r.w - 2 * c)
        mid_dh = max(1, r.h - 2 * c)

        panel_surf = pygame.Surface((r.w, r.h), pygame.SRCALPHA)
        # Corners
        panel_surf.blit(src, (0, 0), (0, 0, c, c))
        panel_surf.blit(src, (r.w - c, 0), (sw - c, 0, c, c))
        panel_surf.blit(src, (0, r.h - c), (0, sh - c, c, c))
        panel_surf.blit(src, (r.w - c, r.h - c), (sw - c, sh - c, c, c))
        # Edges
        panel_surf.blit(pygame.transform.scale(src.subsurface((c, 0, mid_sw, c)), (mid_dw, c)), (c, 0))
        panel_surf.blit(pygame.transform.scale(src.subsurface((c, sh - c, mid_sw, c)), (mid_dw, c)), (c, r.h - c))
        panel_surf.blit(pygame.transform.scale(src.subsurface((0, c, c, mid_sh)), (c, mid_dh)), (0, c))
        panel_surf.blit(pygame.transform.scale(src.subsurface((sw - c, c, c, mid_sh)), (c, mid_dh)), (r.w - c, c))
        # Center
        panel_surf.blit(pygame.transform.scale(src.subsurface((c, c, mid_sw, mid_sh)), (mid_dw, mid_dh)), (c, c))

        if alpha < 255:
            panel_surf.set_alpha(alpha)
        target.blit(panel_surf, (r.x, r.y))


class Button:
    """Tactile button with smooth hover scale, click dip, and keyboard focus."""

    def __init__(
        self,
        rect: pygame.FRect,
        label: str,
        on_click: Callable[[], None] | None = None,
        style: str = "wood",
        font_size: int = 22,
        sublabel: str = "",
        enabled: bool = True,
    ) -> None:
        self.rect = rect
        self.label = label
        self.sublabel = sublabel
        self.on_click = on_click
        self.style = style
        self.font_size = font_size
        self.enabled = enabled

        self.hovered = False
        self.focused = False
        self.pressed = False
        self._scale = 1.0
        self._press_offset = 0.0

    def update(self, dt: float, mouse_pos: tuple[int, int]) -> bool:
        """Returns True if newly hovered this frame."""
        was_hovered = self.hovered
        self.hovered = self.rect.collidepoint(mouse_pos)
        active = (self.hovered or self.focused) and self.enabled
        target_scale = 1.04 if active else 1.0
        self._scale = exp_damp(self._scale, target_scale, 18.0, dt)
        self._press_offset = exp_damp(self._press_offset, 3.0 if self.pressed else 0.0, 24.0, dt)
        return self.hovered and not was_hovered

    def trigger(self) -> None:
        if self.enabled and self.on_click is not None:
            self.on_click()

    def render(self, surf: pygame.Surface) -> None:
        w = self.rect.w * self._scale
        h = self.rect.h * self._scale
        x = self.rect.centerx - w / 2
        y = self.rect.centery - h / 2 + self._press_offset
        draw_rect = pygame.FRect(x, y, w, h)

        style = self.style if self.enabled else "dark"
        NineSlicePanel.draw(surf, draw_rect, style=style, shadow=not self.pressed)

        if self.focused or (self.hovered and self.enabled):
            pygame.draw.rect(
                surf,
                COLORS["gold_bright"],
                pygame.Rect(int(x) - 2, int(y) - 2, int(w) + 4, int(h) + 4),
                width=3,
                border_radius=14,
            )

        font = get_font(self.font_size, bold=True)
        txt_col = (
            COLORS["cream"] if style in ("wood", "dark") else COLORS["espresso"]
        )
        if not self.enabled:
            txt_col = (165, 155, 148)

        label_surf = font.render(self.label, True, txt_col)
        if self.sublabel:
            sub_font = get_font(max(14, self.font_size - 6))
            sub_surf = sub_font.render(self.sublabel, True, COLORS["gold_bright"] if style == "wood" else COLORS["wood_mid"])
            surf.blit(label_surf, (int(x + 18), int(draw_rect.centery - label_surf.get_height() / 2)))
            surf.blit(sub_surf, (int(draw_rect.right - sub_surf.get_width() - 18), int(draw_rect.centery - sub_surf.get_height() / 2)))
        else:
            surf.blit(
                label_surf,
                (
                    int(draw_rect.centerx - label_surf.get_width() / 2),
                    int(draw_rect.centery - label_surf.get_height() / 2),
                ),
            )


class TypewriterBox:
    """Word-wrapped text renderer with smooth typewriter reveal."""

    def __init__(self, text: str = "", font_size: int = 24, max_width: int = 760, cps: float = 48.0) -> None:
        self.font = get_font(font_size)
        self.max_width = max_width
        self.cps = cps
        self.full_text = ""
        self.lines: list[str] = []
        self.visible_chars = 0.0
        self._blip_accum = 0.0
        self.set_text(text)

    def set_text(self, text: str) -> None:
        self.full_text = text
        self.lines = wrap_text(text, self.font, self.max_width)
        self.visible_chars = 0.0
        self._blip_accum = 0.0

    @property
    def finished(self) -> bool:
        return int(self.visible_chars) >= len(self.full_text)

    def skip(self) -> None:
        self.visible_chars = float(len(self.full_text))

    def update(self, dt: float) -> bool:
        """Advances typewriter; returns True when a character blip should sound."""
        if self.finished:
            return False
        prev = int(self.visible_chars)
        self.visible_chars = min(float(len(self.full_text)), self.visible_chars + self.cps * dt)
        curr = int(self.visible_chars)
        if curr > prev:
            self._blip_accum += curr - prev
            if self._blip_accum >= 3:
                self._blip_accum = 0
                return True
        return False

    def render(self, surf: pygame.Surface, x: int, y: int, color: tuple[int, int, int] = COLORS["espresso"]) -> None:
        remaining = int(self.visible_chars)
        line_h = self.font.get_height() + 6
        for idx, line in enumerate(self.lines):
            if remaining <= 0:
                break
            chunk = line[:remaining]
            remaining -= len(line) + 1
            surf.blit(self.font.render(chunk, True, color), (x, y + idx * line_h))


class Slider:
    """Interactive horizontal slider for volume settings."""

    def __init__(self, rect: pygame.FRect, label: str, value: float, on_change: Callable[[float], None]) -> None:
        self.rect = rect
        self.label = label
        self.value = clamp(value, 0.0, 1.0)
        self.on_change = on_change
        self.dragging = False
        self.focused = False

    def set_from_x(self, mx: float) -> None:
        track_x = self.rect.x + 170
        track_w = self.rect.w - 230
        self.value = clamp((mx - track_x) / max(1.0, track_w), 0.0, 1.0)
        self.on_change(self.value)

    def nudge(self, delta: float) -> None:
        self.value = clamp(self.value + delta, 0.0, 1.0)
        self.on_change(self.value)

    def handle_event(self, event: pygame.event.Event) -> bool:
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.rect.collidepoint(event.pos):
                self.dragging = True
                self.set_from_x(event.pos[0])
                return True
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            self.dragging = False
        elif event.type == pygame.MOUSEMOTION and self.dragging:
            self.set_from_x(event.pos[0])
            return True
        return False

    def render(self, surf: pygame.Surface) -> None:
        font = get_font(20, bold=True)
        lbl = font.render(self.label, True, COLORS["espresso"])
        surf.blit(lbl, (int(self.rect.x), int(self.rect.centery - lbl.get_height() / 2)))

        track_x = int(self.rect.x + 170)
        track_w = int(self.rect.w - 230)
        track_y = int(self.rect.centery - 5)
        pygame.draw.rect(surf, COLORS["parchment_dark"], (track_x, track_y, track_w, 10), border_radius=5)
        fill_w = int(track_w * self.value)
        if fill_w > 0:
            pygame.draw.rect(surf, COLORS["moss"], (track_x, track_y, fill_w, 10), border_radius=5)

        knob_x = track_x + fill_w
        knob_col = COLORS["gold"] if self.focused or self.dragging else COLORS["wood_mid"]
        pygame.draw.circle(surf, COLORS["espresso"], (knob_x, int(self.rect.centery)), 12)
        pygame.draw.circle(surf, knob_col, (knob_x, int(self.rect.centery)), 9)

        pct = font.render(f"{int(round(self.value * 100))}%", True, COLORS["wood_dark"])
        surf.blit(pct, (track_x + track_w + 14, int(self.rect.centery - pct.get_height() / 2)))
