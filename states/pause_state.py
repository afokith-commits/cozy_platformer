"""Pause & Settings overlay ([Esc]) with audio sliders, save/reset, and controls."""

from __future__ import annotations

from typing import TYPE_CHECKING
import pygame

from settings import COLORS, KEYS_CANCEL, KEYS_CONFIRM, KEYS_DOWN, KEYS_UP, SCREEN_H, SCREEN_W
from core.save import save_progress
from core.state import State, StateManager
from core.tween import Tween, ease_out_back
from ui.widgets import Button, NineSlicePanel, Slider, get_font

if TYPE_CHECKING:
    from states.play_state import PlayState


class PauseState(State):
    """Centered pause & settings card."""

    transparent = True
    dim_background = True

    def __init__(self, manager: StateManager, play_state: PlayState) -> None:
        super().__init__(manager)
        self.play_state = play_state
        self.panel_w = 560
        self.panel_h = 520
        self.panel_x = (SCREEN_W - self.panel_w) // 2
        self.target_y = float((SCREEN_H - self.panel_h) // 2)
        self.pop_tween = Tween(float(SCREEN_H + 30), self.target_y, 0.24, ease_out_back)

        self.confirm_reset = False
        self.focus_idx = 0

        self.music_slider = Slider(
            pygame.FRect(self.panel_x + 36, self.target_y + 98, self.panel_w - 72, 34),
            "Music Volume",
            play_state.progress.music_volume,
            self._on_music_vol,
        )
        self.sfx_slider = Slider(
            pygame.FRect(self.panel_x + 36, self.target_y + 144, self.panel_w - 72, 34),
            "SFX Volume",
            play_state.progress.sfx_volume,
            self._on_sfx_vol,
        )

        self.buttons: list[Button] = []
        self._build_buttons()

    def _on_music_vol(self, val: float) -> None:
        self.play_state.progress.music_volume = val
        self.manager.audio.set_music_volume(val)

    def _on_sfx_vol(self, val: float) -> None:
        self.play_state.progress.sfx_volume = val
        self.manager.audio.set_sfx_volume(val)

    def _build_buttons(self) -> None:
        bw = self.panel_w - 72
        bx = self.panel_x + 36
        self.buttons = [
            Button(pygame.FRect(bx, self.target_y + 204, bw, 46), "Resume Adventure", self._resume, style="wood", font_size=19),
            Button(pygame.FRect(bx, self.target_y + 260, bw, 46), "Save Progress", self._save, style="parchment", font_size=19),
            Button(
                pygame.FRect(bx, self.target_y + 316, bw, 46),
                "Confirm Reset? (Click Again)" if self.confirm_reset else "Reset Save Data",
                self._reset,
                style="dark" if not self.confirm_reset else "wood",
                font_size=18,
            ),
            Button(pygame.FRect(bx, self.target_y + 372, bw, 46), "Quit Game", self._quit, style="dark", font_size=19),
        ]
        self._sync_focus()

    def _sync_focus(self) -> None:
        for i, b in enumerate(self.buttons):
            b.focused = i == self.focus_idx

    def _resume(self) -> None:
        save_progress(self.play_state.progress)
        self.manager.audio.play("confirm")
        self.manager.pop()

    def _save(self) -> None:
        self.play_state.save()
        self.manager.audio.play("confirm")

    def _reset(self) -> None:
        if not self.confirm_reset:
            self.confirm_reset = True
            self.manager.audio.play("blip")
            self._build_buttons()
            return
        self.play_state.reset_save()
        self.manager.audio.play("cancel")
        self.manager.pop()

    def _quit(self) -> None:
        save_progress(self.play_state.progress)
        self.manager.should_quit = True

    def handle_event(self, event: pygame.event.Event) -> None:
        if self.music_slider.handle_event(event) or self.sfx_slider.handle_event(event):
            return

        if event.type == pygame.KEYDOWN:
            if event.key in KEYS_CANCEL:
                self._resume()
                return
            if event.key in KEYS_UP:
                self.focus_idx = (self.focus_idx - 1) % len(self.buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_DOWN:
                self.focus_idx = (self.focus_idx + 1) % len(self.buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_CONFIRM:
                self.buttons[self.focus_idx].trigger()

        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            for i, btn in enumerate(self.buttons):
                if btn.rect.collidepoint(event.pos):
                    btn.pressed = True
                    self.focus_idx = i
                    self._sync_focus()
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            for btn in self.buttons:
                was = btn.pressed
                btn.pressed = False
                if was and btn.rect.collidepoint(event.pos):
                    btn.trigger()

    def update(self, dt: float) -> None:
        self.pop_tween.update(dt)
        dy = self.pop_tween.value - self.target_y
        mpos = pygame.mouse.get_pos()

        self.music_slider.rect.y = self.target_y + 98 + dy
        self.sfx_slider.rect.y = self.target_y + 144 + dy

        base_ys = (204, 260, 316, 372)
        for i, btn in enumerate(self.buttons):
            btn.rect.y = self.target_y + base_ys[i] + dy
            if btn.update(dt, mpos) and i != self.focus_idx:
                self.focus_idx = i
                self._sync_focus()

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        py = int(self.pop_tween.value)
        panel = pygame.FRect(self.panel_x, py, self.panel_w, self.panel_h)
        NineSlicePanel.draw(screen, panel, style="parchment")

        title = get_font(28, bold=True).render("Cozy Pause & Settings", True, COLORS["espresso"])
        screen.blit(title, (int(panel.centerx - title.get_width() / 2), py + 28))

        self.music_slider.render(screen)
        self.sfx_slider.render(screen)

        for btn in self.buttons:
            btn.render(screen)

        ctrl_font = get_font(14, bold=True)
        ctrl = ctrl_font.render(
            "Move: WASD/Arrows  |  Jump: Space/Z  |  Dash: Shift/X  |  Interact: E",
            True,
            COLORS["wood_mid"],
        )
        screen.blit(ctrl, (int(panel.centerx - ctrl.get_width() / 2), py + self.panel_h - 46))
