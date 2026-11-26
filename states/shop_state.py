"""Merchant Shop overlay for buying abilities & cosmetic trails with gems."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
import pygame

from settings import COLORS, KEYS_CANCEL, KEYS_CONFIRM, KEYS_DOWN, KEYS_UP, SCREEN_H, SCREEN_W
from core.save import save_progress
from core.state import State, StateManager
from core.tween import Tween, ease_out_back
from ui.widgets import Button, NineSlicePanel, draw_badge_icon, draw_gem_icon, get_font, wrap_text

if TYPE_CHECKING:
    from states.play_state import PlayState


class ShopState(State):
    """Cozy centered shop overlay run by Pip the Frog Merchant."""

    transparent = True
    dim_background = True

    def __init__(self, manager: StateManager, play_state: PlayState) -> None:
        super().__init__(manager)
        self.play_state = play_state
        self.panel_w = 780
        self.panel_h = 540
        self.panel_x = (SCREEN_W - self.panel_w) // 2
        self.target_y = float((SCREEN_H - self.panel_h) // 2)
        self.pop_tween = Tween(float(SCREEN_H + 40), self.target_y, 0.28, ease_out_back)

        self.focus_idx = 0
        self.catalog: list[tuple[str, dict[str, Any], str]] = []
        self.buttons: list[Button] = []
        self.close_btn: Button
        self._build_catalog()

    def _build_catalog(self) -> None:
        self.catalog = []
        self.buttons = []
        items = self.play_state.items_meta
        prog = self.play_state.progress

        for cat_key, cat_name in (("abilities", "ability"), ("trails", "trail")):
            for item_id, meta in items.get(cat_key, {}).items():
                if int(meta.get("price", 0)) > 0:
                    self.catalog.append((item_id, meta, cat_name))

        y = self.target_y + 114
        for idx, (item_id, meta, cat) in enumerate(self.catalog):
            owned = prog.has_badge(item_id)
            equipped = prog.is_equipped(item_id)
            price = int(meta["price"])
            if owned:
                sub = "EQUIPPED (Toggle)" if equipped else "OWNED (Equip)"
                can_act = True
            else:
                sub = f"{price} Gems"
                can_act = prog.gems >= price

            btn = Button(
                pygame.FRect(self.panel_x + 32, y, self.panel_w - 64, 58),
                f"      {meta['name']}",
                on_click=lambda i=idx: self._buy_or_equip(i),
                style="parchment" if can_act else "dark",
                font_size=19,
                sublabel=sub,
                enabled=can_act,
            )
            btn.focused = idx == self.focus_idx
            self.buttons.append(btn)
            y += 66

        self.close_btn = Button(
            pygame.FRect(self.panel_x + self.panel_w - 168, self.target_y + self.panel_h - 62, 136, 42),
            "Leave Shop",
            on_click=self._close,
            style="wood",
            font_size=17,
        )

    def _buy_or_equip(self, idx: int) -> None:
        if idx < 0 or idx >= len(self.catalog):
            return
        item_id, meta, cat = self.catalog[idx]
        prog = self.play_state.progress
        price = int(meta["price"])

        if prog.has_badge(item_id):
            equipped = prog.toggle_badge(item_id, category=cat)
            self.manager.audio.play("equip")
            self.play_state.hud.notify(f"{'Equipped' if equipped else 'Unequipped'} {meta['name']}")
            save_progress(prog)
            self._build_catalog()
            return

        if prog.gems >= price:
            prog.gems -= price
            prog.unlock_badge(item_id, auto_equip=True, category=cat)
            self.manager.audio.play("buy")
            self.play_state.hud.notify(f"Bought & Equipped {meta['name']}!")
            save_progress(prog)
            self._build_catalog()
        else:
            self.manager.audio.play("cancel")

    def _close(self) -> None:
        self.manager.audio.play("cancel")
        self.manager.pop()

    def _sync_focus(self) -> None:
        for i, b in enumerate(self.buttons):
            b.focused = i == self.focus_idx

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in KEYS_CANCEL:
                self._close()
                return
            if event.key in KEYS_UP and self.buttons:
                self.focus_idx = (self.focus_idx - 1) % len(self.buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_DOWN and self.buttons:
                self.focus_idx = (self.focus_idx + 1) % len(self.buttons)
                self._sync_focus()
                self.manager.audio.play("blip")
            elif event.key in KEYS_CONFIRM:
                self._buy_or_equip(self.focus_idx)

        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.close_btn.rect.collidepoint(event.pos):
                self.close_btn.pressed = True
            for i, btn in enumerate(self.buttons):
                if btn.rect.collidepoint(event.pos):
                    btn.pressed = True
                    self.focus_idx = i
                    self._sync_focus()
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            if self.close_btn.pressed and self.close_btn.rect.collidepoint(event.pos):
                self.close_btn.pressed = False
                self._close()
                return
            self.close_btn.pressed = False
            for i, btn in enumerate(self.buttons):
                was = btn.pressed
                btn.pressed = False
                if was and btn.rect.collidepoint(event.pos):
                    self._buy_or_equip(i)

    def update(self, dt: float) -> None:
        self.pop_tween.update(dt)
        dy = self.pop_tween.value - self.target_y
        mpos = pygame.mouse.get_pos()

        for i, btn in enumerate(self.buttons):
            btn.rect.y = self.target_y + 114 + i * 66 + dy
            if btn.update(dt, mpos) and i != self.focus_idx:
                self.focus_idx = i
                self._sync_focus()

        self.close_btn.rect.y = self.target_y + self.panel_h - 62 + dy
        self.close_btn.update(dt, mpos)

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        py = int(self.pop_tween.value)
        panel = pygame.FRect(self.panel_x, py, self.panel_w, self.panel_h)
        NineSlicePanel.draw(screen, panel, style="parchment")

        title_font = get_font(28, bold=True)
        screen.blit(title_font.render("Pip's Cozy Curiosity Shop", True, COLORS["espresso"]), (self.panel_x + 32, py + 26))

        sub_font = get_font(16)
        screen.blit(sub_font.render("Ribbit! Badges can be toggled anytime in your [Tab] Bag.", True, COLORS["wood_mid"]), (self.panel_x + 34, py + 62))

        # Gem wallet pill top-right of shop card
        wallet = pygame.FRect(self.panel_x + self.panel_w - 170, py + 24, 138, 46)
        NineSlicePanel.draw(screen, wallet, style="wood", shadow=False)
        draw_gem_icon(screen, int(wallet.x + 28), int(wallet.centery), size=11)
        g_txt = get_font(22, bold=True).render(f"{self.play_state.progress.gems}", True, COLORS["gold_bright"])
        screen.blit(g_txt, (int(wallet.x + 50), int(wallet.centery - g_txt.get_height() / 2)))

        for i, btn in enumerate(self.buttons):
            btn.render(screen)
            item_id, _, _ = self.catalog[i]
            draw_badge_icon(screen, int(btn.rect.x + 30), int(btn.rect.centery), item_id, radius=15)

        # Focused item description footer
        if self.catalog and 0 <= self.focus_idx < len(self.catalog):
            _, meta, _ = self.catalog[self.focus_idx]
            desc_rect = pygame.FRect(self.panel_x + 32, py + self.panel_h - 102, self.panel_w - 220, 80)
            NineSlicePanel.draw(screen, desc_rect, style="wood", shadow=False)
            d_font = get_font(16)
            for li, line in enumerate(wrap_text(meta["description"], d_font, int(desc_rect.w - 24))[:3]):
                screen.blit(d_font.render(line, True, COLORS["cream"]), (int(desc_rect.x + 14), int(desc_rect.y + 10 + li * 21)))

        self.close_btn.render(screen)
