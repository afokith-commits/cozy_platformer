"""Slide-up cozy Dialogue State with typewriter text, NPC portraits, and choices."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
import pygame

from settings import (
    COLORS,
    KEYS_CANCEL,
    KEYS_CONFIRM,
    KEYS_DOWN,
    KEYS_UP,
    SCREEN_H,
    SCREEN_W,
)
from core.state import State, StateManager
from core.tween import Tween, ease_out_back, ease_out_cubic
from ui.widgets import Button, NineSlicePanel, TypewriterBox, get_font

if TYPE_CHECKING:
    from states.play_state import PlayState


class DialogueState(State):
    """Bottom-anchored dialogue card with branching JSON choices and quest effects."""

    transparent = True
    dim_background = True

    def __init__(
        self,
        manager: StateManager,
        play_state: PlayState,
        npc_id: str | None = None,
        speaker: str = "Signpost",
        style: str = "sign",
        sign_text: str | None = None,
    ) -> None:
        super().__init__(manager)
        self.play_state = play_state
        self.npc_id = npc_id
        self.speaker = speaker
        self.style = style
        self.sign_text = sign_text

        self.card_w = 920
        self.card_h = 252
        self.card_x = (SCREEN_W - self.card_w) // 2
        self.target_y = SCREEN_H - self.card_h - 32
        self.slide_tween = Tween(SCREEN_H + 30.0, float(self.target_y), 0.28, ease_out_back)

        self.typewriter = TypewriterBox("", font_size=23, max_width=690, cps=54.0)
        self.buttons: list[Button] = []
        self.choice_actions: list[dict[str, Any]] = []
        self.focus_idx = 0
        self.dialogue_def: dict[str, Any] = {}

        if sign_text is not None:
            self._load_sign(sign_text)
        else:
            self.dialogue_def = self.play_state.dialogues_data.get(npc_id or "", {})
            entry_node = self._pick_entry_node()
            self._load_node(entry_node)

    def _check_condition(self, cond: dict[str, Any] | None) -> bool:
        if not cond:
            return True
        prog = self.play_state.progress
        if "flag" in cond and not prog.flags.get(cond["flag"], False):
            return False
        if "not_flag" in cond and prog.flags.get(cond["not_flag"], False):
            return False
        if "has_trinket" in cond and cond["has_trinket"] not in prog.trinkets:
            return False
        if "trinket_count_gte" in cond and len(prog.trinkets) < int(cond["trinket_count_gte"]):
            return False
        if "gems_gte" in cond and prog.gems < int(cond["gems_gte"]):
            return False
        return True

    def _pick_entry_node(self) -> str:
        for rule in self.dialogue_def.get("entry_rules", []):
            if self._check_condition(rule.get("condition")):
                return str(rule["node"])
        return str(self.dialogue_def.get("start", "root"))

    def _apply_effects(self, effects: list[dict[str, Any]] | None) -> None:
        if not effects:
            return
        prog = self.play_state.progress
        for eff in effects:
            kind = eff.get("type")
            if kind == "set_flag":
                prog.flags[str(eff["flag"])] = bool(eff.get("value", True))
            elif kind == "give_gems":
                amt = int(eff.get("amount", 0))
                prog.gems += amt
                self.manager.audio.play("gem")
                self.play_state.hud.notify(f"+{amt} Gems!")
            elif kind == "give_badge":
                bid = str(eff["badge_id"])
                if not prog.has_badge(bid):
                    prog.unlock_badge(bid, auto_equip=True, category=str(eff.get("category", "ability")))
                    self.manager.audio.play("trinket")
                    meta = self.play_state.items_meta.get("abilities", {}).get(bid, {})
                    self.play_state.hud.notify(f"Unlocked: {meta.get('name', bid)}!")
            elif kind == "save":
                self.play_state.save(silent=True)

    def _load_sign(self, text: str) -> None:
        self.speaker = "Wooden Signpost"
        self.typewriter.set_text(text)
        self.choice_actions = [{"close": True}]
        self._rebuild_buttons(["Close"])

    def _load_node(self, node_id: str) -> None:
        nodes = self.dialogue_def.get("nodes", {})
        node = nodes.get(node_id)
        if not node:
            self.manager.pop()
            return
        self._apply_effects(node.get("effects"))
        self.typewriter.set_text(node.get("text", "..."))

        choices = [c for c in node.get("choices", []) if self._check_condition(c.get("condition"))]
        if not choices:
            choices = [{"label": "Goodbye", "close": True}]
        self.choice_actions = choices
        self._rebuild_buttons([c["label"] for c in choices])

    def _rebuild_buttons(self, labels: list[str]) -> None:
        self.buttons = []
        self.focus_idx = 0
        btn_w = 240
        btn_h = 44
        gap = 14
        total_w = len(labels) * btn_w + max(0, len(labels) - 1) * gap
        start_x = self.card_x + self.card_w - total_w - 28
        if len(labels) > 2:
            btn_w = 210
            total_w = len(labels) * btn_w + (len(labels) - 1) * 10
            start_x = self.card_x + self.card_w - total_w - 24
            gap = 10

        for idx, lbl in enumerate(labels):
            bx = start_x + idx * (btn_w + gap)
            by = self.target_y + self.card_h - btn_h - 18
            btn = Button(
                pygame.FRect(bx, by, btn_w, btn_h),
                lbl,
                on_click=lambda i=idx: self._select_choice(i),
                style="wood",
                font_size=18,
            )
            btn.focused = idx == 0
            self.buttons.append(btn)

    def _select_choice(self, idx: int) -> None:
        from states.shop_state import ShopState

        if not self.typewriter.finished:
            self.typewriter.skip()
            return
        if idx < 0 or idx >= len(self.choice_actions):
            return

        choice = self.choice_actions[idx]
        self.manager.audio.play("confirm")
        self._apply_effects(choice.get("effects"))

        if choice.get("open_shop"):
            self.manager.replace(ShopState(self.manager, self.play_state))
            return
        if choice.get("close") or "next" not in choice:
            self.manager.pop()
            return
        self._load_node(str(choice["next"]))

    def _move_focus(self, delta: int) -> None:
        if not self.buttons:
            return
        self.focus_idx = (self.focus_idx + delta) % len(self.buttons)
        for i, b in enumerate(self.buttons):
            b.focused = i == self.focus_idx
        self.manager.audio.play("blip")

    def handle_event(self, event: pygame.event.Event) -> None:
        if event.type == pygame.KEYDOWN:
            if event.key in KEYS_CANCEL:
                self.manager.audio.play("cancel")
                self.manager.pop()
                return
            if event.key in (pygame.K_LEFT, pygame.K_a, *KEYS_UP):
                self._move_focus(-1)
            elif event.key in (pygame.K_RIGHT, pygame.K_d, *KEYS_DOWN):
                self._move_focus(1)
            elif event.key in KEYS_CONFIRM:
                if not self.typewriter.finished:
                    self.typewriter.skip()
                else:
                    self._select_choice(self.focus_idx)
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if not self.typewriter.finished:
                self.typewriter.skip()
                return
            for i, btn in enumerate(self.buttons):
                if btn.rect.collidepoint(event.pos):
                    btn.pressed = True
                    self.focus_idx = i
                    for j, b in enumerate(self.buttons):
                        b.focused = j == i
        elif event.type == pygame.MOUSEBUTTONUP and event.button == 1:
            for i, btn in enumerate(self.buttons):
                was_pressed = btn.pressed
                btn.pressed = False
                if was_pressed and btn.rect.collidepoint(event.pos):
                    self._select_choice(i)

    def update(self, dt: float) -> None:
        self.slide_tween.update(dt)
        card_y = self.slide_tween.value
        dy = card_y - self.target_y
        if self.typewriter.update(dt):
            self.manager.audio.play("dialogue_char")

        mpos = pygame.mouse.get_pos()
        for i, btn in enumerate(self.buttons):
            btn.rect.y = self.target_y + self.card_h - btn.rect.h - 18 + dy
            if btn.update(dt, mpos):
                self.focus_idx = i
                for j, b in enumerate(self.buttons):
                    b.focused = j == i
                self.manager.audio.play("blip")

    def _draw_portrait(self, screen: pygame.Surface, x: int, y: int) -> None:
        box = pygame.FRect(x, y, 128, 128)
        NineSlicePanel.draw(screen, box, style="wood", shadow=False)
        cx, cy = int(box.centerx), int(box.centery)
        if self.style == "frog":
            pygame.draw.circle(screen, (98, 168, 92), (cx, cy + 8), 34)
            pygame.draw.ellipse(screen, (198, 224, 152), (cx - 22, cy + 10, 44, 24))
            pygame.draw.circle(screen, (98, 168, 92), (cx - 18, cy - 18), 14)
            pygame.draw.circle(screen, (98, 168, 92), (cx + 18, cy - 18), 14)
            pygame.draw.circle(screen, COLORS["espresso"], (cx - 16, cy - 18), 5)
            pygame.draw.circle(screen, COLORS["espresso"], (cx + 16, cy - 18), 5)
            pygame.draw.ellipse(screen, COLORS["coral"], (cx - 28, cy - 34, 56, 16))
        elif self.style == "willow":
            pygame.draw.circle(screen, (158, 122, 98), (cx, cy + 4), 34)
            pygame.draw.circle(screen, COLORS["cream"], (cx - 14, cy - 4), 10)
            pygame.draw.circle(screen, COLORS["cream"], (cx + 14, cy - 4), 10)
            pygame.draw.circle(screen, COLORS["espresso"], (cx - 14, cy - 4), 4)
            pygame.draw.circle(screen, COLORS["espresso"], (cx + 14, cy - 4), 4)
            pygame.draw.polygon(screen, COLORS["gold"], [(cx - 5, cy + 6), (cx + 5, cy + 6), (cx, cy + 14)])
        elif self.style == "fox":
            pygame.draw.polygon(screen, (214, 118, 64), [(cx - 26, cy - 8), (cx - 18, cy - 38), (cx - 4, cy - 14)])
            pygame.draw.polygon(screen, (214, 118, 64), [(cx + 26, cy - 8), (cx + 18, cy - 38), (cx + 4, cy - 14)])
            pygame.draw.circle(screen, (224, 126, 70), (cx, cy + 6), 30)
            pygame.draw.circle(screen, COLORS["espresso"], (cx - 11, cy), 4)
            pygame.draw.circle(screen, COLORS["espresso"], (cx + 11, cy), 4)
            pygame.draw.rect(screen, COLORS["sky_teal"], (cx - 26, cy + 22, 52, 14), border_radius=6)
        elif self.style == "spirit":
            pygame.draw.circle(screen, (165, 240, 224), (cx, cy), 34)
            pygame.draw.circle(screen, COLORS["white"], (cx, cy), 22)
            pygame.draw.circle(screen, COLORS["espresso"], (cx - 8, cy - 2), 4)
            pygame.draw.circle(screen, COLORS["espresso"], (cx + 8, cy - 2), 4)
        else:
            pygame.draw.rect(screen, COLORS["wood_light"], (cx - 28, cy - 22, 56, 34), border_radius=4)
            pygame.draw.rect(screen, COLORS["wood_dark"], (cx - 5, cy + 12, 10, 24))

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        cy = int(self.slide_tween.value)
        card = pygame.FRect(self.card_x, cy, self.card_w, self.card_h)
        NineSlicePanel.draw(screen, card, style="parchment")

        # Speaker nameplate
        name_font = get_font(21, bold=True)
        nw = max(180, name_font.size(self.speaker)[0] + 44)
        name_rect = pygame.FRect(self.card_x + 28, cy - 22, nw, 40)
        NineSlicePanel.draw(screen, name_rect, style="wood")
        n_surf = name_font.render(self.speaker, True, COLORS["gold_bright"])
        screen.blit(n_surf, (int(name_rect.centerx - n_surf.get_width() / 2), int(name_rect.centery - n_surf.get_height() / 2)))

        self._draw_portrait(screen, self.card_x + 28, cy + 38)
        self.typewriter.render(screen, self.card_x + 178, cy + 36)

        if self.typewriter.finished:
            for btn in self.buttons:
                btn.render(screen)
        else:
            skip_font = get_font(15, bold=True)
            hint = skip_font.render("Press [E] / Click to continue...", True, COLORS["wood_mid"])
            screen.blit(hint, (self.card_x + self.card_w - hint.get_width() - 30, cy + self.card_h - 36))
