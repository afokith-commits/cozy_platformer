"""Slide-in Backpack & Badge Drawer overlay ([Tab] / [I])."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
import pygame

from settings import (
    COLORS,
    KEYS_CANCEL,
    KEYS_CONFIRM,
    KEYS_DOWN,
    KEYS_INVENTORY,
    KEYS_UP,
    SCREEN_H,
    SCREEN_W,
)
from core.save import save_progress
from core.state import State, StateManager
from core.tween import Tween, ease_out_cubic
from ui.widgets import Button, NineSlicePanel, draw_badge_icon, get_font, wrap_text

if TYPE_CHECKING:
    from states.play_state import PlayState


class InventoryState(State):
    """Right-side sliding backpack for toggling Badges & inspecting Trinkets."""

    transparent = True
    dim_background = True

    def __init__(self, manager: StateManager, play_state: PlayState) -> None:
        super().__init__(manager)
        self.play_state = play_state
        self.drawer_w = 510
        self.drawer_h = SCREEN_H - 40
        self.target_x = float(SCREEN_W - self.drawer_w - 20)
        self.slide_tween = Tween(float(SCREEN_W + 20), self.target_x, 0.26, ease_out_cubic)
        self.closing = False

        self.active_tab = "badges"  # "badges" | "trinkets"
        self.focus_idx = 0
        self.tab_buttons: list[Button] = []
        self.entries: list[tuple[str, dict[str, Any], str]] = []
        self.item_buttons: list[Button] = []

        self._build_ui()

    def _build_ui(self) -> None:
        self.tab_buttons = [
            Button(pygame.FRect(self.target_x + 24, 90, 222, 44), "Badges & Trails", lambda: self._switch_tab("badges"), style="wood" if self.active_tab == "badges" else "parchment", font_size=18),
            Button(pygame.FRect(self.target_x + 260, 90, 222, 44), "Trinkets", lambda: self._switch_tab("trinkets"), style="wood" if self.active_tab == "trinkets" else "parchment", font_size=18),
        ]

        self.entries = []
        self.item_buttons = []
        prog = self.play_state.progress
        items_meta = self.play_state.items_meta

        if self.active_tab == "badges":
            for cat_key, cat_name in (("abilities", "ability"), ("trails", "trail")):
                for item_id, meta in items_meta.get(cat_key, {}).items():
                    self.entries.append((item_id, meta, cat_name))
        else:
            for item_id, meta in items_meta.get("trinkets", {}).items():
                self.entries.append((item_id, meta, "trinket"))

        y = 156
        for idx, (item_id, meta, cat) in enumerate(self.entries):
            owned = (
                prog.has_badge(item_id) if cat != "trinket" else (item_id in prog.trinkets)
            )
            equipped = prog.is_equipped(item_id) if cat != "trinket" else False
            if cat == "trinket":
                status = "FOUND" if owned else "???"
                title = meta["name"] if owned else "Undiscovered Trinket"
            else:
                status = "EQUIPPED" if equipped else ("EQUIP" if owned else "LOCKED")
                title = meta["name"] if owned else f"{meta['name']}"

            btn = Button(
                pygame.FRect(self.target_x + 24, y, self.drawer_w - 48, 60),
                f"      {title}",
                on_click=lambda i=idx: self._activate_item(i),
                style="parchment" if owned else "dark",
                font_size=18,
                sublabel=status,
                enabled=owned and cat != "trinket",
            )
            btn.focused = idx == self.focus_idx
            self.item_buttons.append(btn)
            y += 68

    def _switch_tab(self, tab: str) -> None:
        if self.active_tab != tab:
            self.active_tab = tab
            self.focus_idx = 0
            self.manager.audio.play("blip")
            self._build_ui()

    def _activate_item(self, idx: int) -> None:
        if idx < 0 or idx >= len(self.entries):
            return
        item_id, meta, cat = self.entries[idx]
        if cat == "trinket":
            return
        prog = self.play_state.progress
        if not prog.has_badge(item_id):
            return
        equipped = prog.toggle_badge(item_id, category=cat)
        self.manager.audio.play("equip")
        self.play_state.hud.notify(f"{'Equipped' if equipped else 'Unequipped'} {meta['name']}")
        save_progress(prog)
        self._build_ui()

    def _close(self) -> None:
        if not self.closing:
            self.closing = True
            self.manager.audio.play("cancel")
            self.slide_tween = Tween(
                self.slide_tween.value,
                float(SCREEN_W + 20),
                0.20,
                ease_out_cubic,
                on_complete=self.manager.pop,
            )

    def handle_event(self, event: pygame.event.Event) -> None:
        if self.closing:
            return
        if event.type == pygame.KEYDOWN:
            if event.key in (*KEYS_INVENTORY, *KEYS_CANCEL):
                self._close()
                return
            if event.key in (pygame.K_LEFT, pygame.K_a):
                self._switch_tab("badges")
            elif event.key in (pygame.K_RIGHT, pygame.K_d):
                self._switch_tab("trinkets")
            elif event.key in KEYS_UP and self.item_buttons:
                self.focus_idx = (self.focus_idx - 1) % len(self.item_buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_DOWN and self.item_buttons:
                self.focus_idx = (self.focus_idx + 1) % len(self.item_buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_CONFIRM:
                self._activate_item(self.focus_idx)

        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            for tb in self.tab_buttons:
                if tb.rect.collidepoint(event.pos):
                    tb.trigger()
                    return
            for i, btn in enumerate(self.item_buttons):
                if btn.rect.collidepoint(event.pos):
                    btn.pressed = True
                    self.focus_idx = i
                    self._sync_focus()
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            for i, btn in enumerate(self.item_buttons):
                was = btn.pressed
                btn.pressed = False
                if was and btn.rect.collidepoint(event.pos):
                    self._activate_item(i)

    def _sync_focus(self) -> None:
        for i, btn in enumerate(self.item_buttons):
            btn.focused = i == self.focus_idx

    def update(self, dt: float) -> None:
        self.slide_tween.update(dt)
        dx = self.slide_tween.value - self.target_x
        mpos = pygame.mouse.get_pos()

        for tb in self.tab_buttons:
            tb.rect.x = (self.target_x + (24 if tb is self.tab_buttons[0] else 260)) + dx
            tb.update(dt, mpos)

        for i, btn in enumerate(self.item_buttons):
            btn.rect.x = self.target_x + 24 + dx
            if btn.update(dt, mpos) and i != self.focus_idx:
                self.focus_idx = i
                self._sync_focus()

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        dx = int(self.slide_tween.value)
        drawer = pygame.FRect(dx, 20, self.drawer_w, self.drawer_h)
        NineSlicePanel.draw(screen, drawer, style="parchment")

        title_font = get_font(28, bold=True)
        screen.blit(title_font.render("Traveler's Backpack", True, COLORS["espresso"]), (dx + 28, 38))

        for tb in self.tab_buttons:
            tb.render(screen)

        prog = self.play_state.progress
        for i, btn in enumerate(self.item_buttons):
            btn.render(screen)
            item_id, meta, cat = self.entries[i]
            owned = prog.has_badge(item_id) if cat != "trinket" else (item_id in prog.trinkets)
            if owned:
                draw_badge_icon(screen, int(btn.rect.x + 28), int(btn.rect.centery), item_id, radius=15)

        # Description footer box for focused item
        if self.entries and 0 <= self.focus_idx < len(self.entries):
            item_id, meta, cat = self.entries[self.focus_idx]
            owned = prog.has_badge(item_id) if cat != "trinket" else (item_id in prog.trinkets)
            desc_box = pygame.FRect(dx + 24, SCREEN_H - 122, self.drawer_w - 48, 84)
            NineSlicePanel.draw(screen, desc_box, style="wood", shadow=False)
            desc_text = meta.get("description", "") if owned else meta.get("hint", "Keep exploring or visit Pip's Shop to unlock this!")
            d_font = get_font(16)
            for li, line in enumerate(wrap_text(desc_text, d_font, int(desc_box.w - 28))[:3]):
                screen.blit(d_font.render(line, True, COLORS["cream"]), (int(desc_box.x + 14), int(desc_box.y + 12 + li * 22)))
