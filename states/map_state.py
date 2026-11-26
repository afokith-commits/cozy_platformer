"""Interactive Fast-Travel Map overlay ([M]) with node tooltips and circle-wipe warp."""

from __future__ import annotations

from typing import TYPE_CHECKING
import pygame

from settings import (
    COLORS,
    KEYS_CANCEL,
    KEYS_CONFIRM,
    KEYS_DOWN,
    KEYS_MAP,
    KEYS_UP,
    SCREEN_H,
    SCREEN_W,
)
from core.state import State, StateManager
from core.tween import Tween, ease_out_back
from ui.widgets import Button, NineSlicePanel, get_font, wrap_text

if TYPE_CHECKING:
    from states.play_state import PlayState


WORLD_NODES = [
    {
        "level_id": "meadow_hub",
        "shrine_id": "shrine_meadow",
        "spawn_id": "shrine",
        "name": "Meadow Hub",
        "subtitle": "Warm hearth, Pip's stall, and Grandma Willow's garden.",
        "pos": (370, 390),
        "color": COLORS["moss"],
    },
    {
        "level_id": "canopy_cliffs",
        "shrine_id": "shrine_canopy",
        "spawn_id": "shrine",
        "name": "Canopy Cliffs",
        "subtitle": "Breezy treetop bridges, bouncy mushrooms, and Bramble's lookout.",
        "pos": (640, 240),
        "color": COLORS["sky_teal"],
    },
    {
        "level_id": "sunken_ruins",
        "shrine_id": "shrine_ruins",
        "spawn_id": "shrine",
        "name": "Sunken Ruins",
        "subtitle": "Twilight mossy arches lit by firefly spirits and ancient lanterns.",
        "pos": (900, 370),
        "color": COLORS["plum"],
    },
]


class MapState(State):
    """Stylized world map for inspecting progress and fast-traveling to attuned shrines."""

    transparent = True
    dim_background = True

    def __init__(self, manager: StateManager, play_state: PlayState) -> None:
        super().__init__(manager)
        self.play_state = play_state
        self.panel_w = 880
        self.panel_h = 540
        self.panel_x = (SCREEN_W - self.panel_w) // 2
        self.target_y = float((SCREEN_H - self.panel_h) // 2)
        self.pop_tween = Tween(float(SCREEN_H + 30), self.target_y, 0.26, ease_out_back)

        self.selected_idx = next(
            (i for i, n in enumerate(WORLD_NODES) if n["level_id"] == play_state.progress.current_level),
            0,
        )
        self.warp_btn = Button(
            pygame.FRect(self.panel_x + self.panel_w - 220, self.target_y + self.panel_h - 72, 188, 46),
            "Fast Travel",
            on_click=self._warp_selected,
            style="wood",
            font_size=19,
        )

    def _node_rect(self, idx: int, dy: float = 0.0) -> pygame.Rect:
        nx, ny = WORLD_NODES[idx]["pos"]
        return pygame.Rect(nx - 42, int(ny - 42 + dy), 84, 84)

    def _is_unlocked(self, idx: int) -> bool:
        return WORLD_NODES[idx]["shrine_id"] in self.play_state.progress.unlocked_shrines

    def _warp_selected(self) -> None:
        node = WORLD_NODES[self.selected_idx]
        if not self._is_unlocked(self.selected_idx):
            self.manager.audio.play("cancel")
            self.play_state.hud.notify("Attune that room's Shrine first!")
            return
        self.manager.pop()
        self.play_state.transition_to_level(node["level_id"], node["spawn_id"])

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in (*KEYS_MAP, *KEYS_CANCEL):
                self.manager.audio.play("cancel")
                self.manager.pop()
                return
            if event.key in (pygame.K_LEFT, pygame.K_a, *KEYS_UP):
                self.selected_idx = (self.selected_idx - 1) % len(WORLD_NODES)
                self.manager.audio.play("blip")
            elif event.key in (pygame.K_RIGHT, pygame.K_d, *KEYS_DOWN):
                self.selected_idx = (self.selected_idx + 1) % len(WORLD_NODES)
                self.manager.audio.play("blip")
            elif event.key in KEYS_CONFIRM:
                self._warp_selected()

        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.warp_btn.rect.collidepoint(event.pos):
                self.warp_btn.pressed = True
            for i in range(len(WORLD_NODES)):
                if self._node_rect(i).collidepoint(event.pos):
                    self.selected_idx = i
                    self.manager.audio.play("blip")
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            was = self.warp_btn.pressed
            self.warp_btn.pressed = False
            if was and self.warp_btn.rect.collidepoint(event.pos):
                self._warp_selected()

    def update(self, dt: float) -> None:
        self.pop_tween.update(dt)
        dy = self.pop_tween.value - self.target_y
        mpos = pygame.mouse.get_pos()

        unlocked = self._is_unlocked(self.selected_idx)
        self.warp_btn.enabled = unlocked
        self.warp_btn.label = "Fast Travel" if unlocked else "Shrine Locked"
        self.warp_btn.rect.y = self.target_y + self.panel_h - 72 + dy
        self.warp_btn.update(dt, mpos)

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        py = int(self.pop_tween.value)
        dy = py - self.target_y
        panel = pygame.FRect(self.panel_x, py, self.panel_w, self.panel_h)
        NineSlicePanel.draw(screen, panel, style="parchment")

        title_font = get_font(28, bold=True)
        screen.blit(title_font.render("World Map & Shrines", True, COLORS["espresso"]), (self.panel_x + 32, py + 24))
        hint = get_font(15, bold=True).render("Select a Shrine node to fast travel   [M] / [Esc] Close", True, COLORS["wood_mid"])
        screen.blit(hint, (self.panel_x + 34, py + 60))

        # Inner map parchment canvas
        canvas = pygame.FRect(self.panel_x + 28, py + 94, self.panel_w - 56, 294)
        NineSlicePanel.draw(screen, canvas, style="dark", shadow=False)

        # Connecting paths
        pts = [(n["pos"][0], int(n["pos"][1] + dy)) for n in WORLD_NODES]
        pygame.draw.line(screen, COLORS["parchment_dark"], pts[0], pts[1], 5)
        pygame.draw.line(screen, COLORS["parchment_dark"], pts[1], pts[2], 5)
        pygame.draw.line(screen, COLORS["wood_light"], pts[0], pts[2], 3)

        prog = self.play_state.progress
        lbl_font = get_font(17, bold=True)

        for i, node in enumerate(WORLD_NODES):
            nx, ny = pts[i]
            unlocked = self._is_unlocked(i)
            is_curr = node["level_id"] == prog.current_level
            is_sel = i == self.selected_idx

            if is_sel:
                pygame.draw.circle(screen, COLORS["gold_bright"], (nx, ny), 38, 4)
            pygame.draw.circle(screen, COLORS["espresso"], (nx, ny), 32)
            fill_col = node["color"] if unlocked else (92, 88, 96)
            pygame.draw.circle(screen, fill_col, (nx, ny), 28)

            # Lantern or lock glyph inside node
            if unlocked:
                pygame.draw.circle(screen, COLORS["gold_bright"], (nx, ny), 10)
                pygame.draw.circle(screen, COLORS["white"], (nx, ny), 4)
            else:
                pygame.draw.rect(screen, COLORS["cream"], (nx - 7, ny - 2, 14, 11), border_radius=2)
                pygame.draw.arc(screen, COLORS["cream"], (nx - 5, ny - 10, 10, 10), 0, 3.14, 2)

            if is_curr:
                badge = get_font(13, bold=True).render("HERE", True, COLORS["espresso"])
                pygame.draw.rect(screen, COLORS["gold"], (nx - 22, ny - 48, 44, 20), border_radius=6)
                screen.blit(badge, (nx - badge.get_width() // 2, ny - 46))

            txt = lbl_font.render(node["name"], True, COLORS["cream"])
            screen.blit(txt, (nx - txt.get_width() // 2, ny + 38))

        # Tooltip card at bottom
        sel = WORLD_NODES[self.selected_idx]
        unlocked = self._is_unlocked(self.selected_idx)
        info_box = pygame.FRect(self.panel_x + 28, py + self.panel_h - 126, self.panel_w - 270, 98)
        NineSlicePanel.draw(screen, info_box, style="wood", shadow=False)

        name_s = get_font(20, bold=True).render(
            f"{sel['name']}  ({'Shrine Attuned' if unlocked else 'Unattuned'})",
            True,
            COLORS["gold_bright"] if unlocked else COLORS["parchment_dark"],
        )
        screen.blit(name_s, (int(info_box.x + 16), int(info_box.y + 12)))
        d_font = get_font(15)
        for li, line in enumerate(wrap_text(sel["subtitle"], d_font, int(info_box.w - 32))[:2]):
            screen.blit(d_font.render(line, True, COLORS["cream"]), (int(info_box.x + 16), int(info_box.y + 42 + li * 22)))

        self.warp_btn.render(screen)
