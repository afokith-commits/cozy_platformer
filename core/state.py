"""State Stack architecture for seamless overlay menus over live gameplay."""

from __future__ import annotations

from typing import TYPE_CHECKING, Callable
import pygame

from settings import COLORS, SCREEN_H, SCREEN_W, WORLD_H, WORLD_W
from core.tween import ease_in_cubic, ease_out_cubic

if TYPE_CHECKING:
    from core.audio import AudioManager


class State:
    """Base screen/overlay state pushed onto the StateManager stack."""

    transparent: bool = False
    dim_background: bool = False

    def __init__(self, manager: StateManager) -> None:
        self.manager = manager

    def on_enter(self) -> None:
        pass

    def on_exit(self) -> None:
        pass

    def handle_event(self, event: pygame.event.Event) -> None:
        pass

    def update(self, dt: float) -> None:
        pass

    def render(self, screen: pygame.Surface, world_surf: pygame.Surface) -> None:
        pass


class _CircleTransition:
    """Cozy iris wipe transition between rooms or fast-travel points."""

    def __init__(self, duration: float = 0.32) -> None:
        self.duration = duration
        self.phase = "idle"  # idle | closing | opening
        self.elapsed = 0.0
        self.midpoint_cb: Callable[[], None] | None = None
        self._overlay = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        self._max_radius = int((SCREEN_W ** 2 + SCREEN_H ** 2) ** 0.5 * 0.55)

    @property
    def active(self) -> bool:
        return self.phase != "idle"

    def start(self, on_midpoint: Callable[[], None]) -> None:
        self.phase = "closing"
        self.elapsed = 0.0
        self.midpoint_cb = on_midpoint

    def update(self, dt: float) -> None:
        if self.phase == "idle":
            return
        self.elapsed += dt
        if self.elapsed >= self.duration:
            if self.phase == "closing":
                if self.midpoint_cb is not None:
                    self.midpoint_cb()
                    self.midpoint_cb = None
                self.phase = "opening"
                self.elapsed = 0.0
            else:
                self.phase = "idle"
                self.elapsed = 0.0

    def render(self, screen: pygame.Surface) -> None:
        if self.phase == "idle":
            return
        t = min(1.0, self.elapsed / max(0.001, self.duration))
        if self.phase == "closing":
            radius = int(self._max_radius * (1.0 - ease_in_cubic(t)))
        else:
            radius = int(self._max_radius * ease_out_cubic(t))

        self._overlay.fill((*COLORS["espresso"], 255))
        if radius > 0:
            pygame.draw.circle(
                self._overlay,
                (0, 0, 0, 0),
                (SCREEN_W // 2, SCREEN_H // 2),
                radius,
            )
        screen.blit(self._overlay, (0, 0))


class StateManager:
    """Manages a stack of active states (bottom-to-top render, top-only update)."""

    def __init__(self, audio: AudioManager) -> None:
        self.stack: list[State] = []
        self.audio = audio
        self.should_quit = False
        self.transition = _CircleTransition()
        self.world_surf = pygame.Surface((WORLD_W, WORLD_H))
        self._dim_surf = pygame.Surface((SCREEN_W, SCREEN_H), pygame.SRCALPHA)
        self._dim_surf.fill((22, 16, 20, 125))

    @property
    def top(self) -> State | None:
        return self.stack[-1] if self.stack else None

    def push(self, state: State) -> None:
        self.stack.append(state)
        state.on_enter()

    def pop(self) -> State | None:
        if not self.stack:
            return None
        removed = self.stack.pop()
        removed.on_exit()
        return removed

    def replace(self, state: State) -> None:
        if self.stack:
            old = self.stack.pop()
            old.on_exit()
        self.stack.append(state)
        state.on_enter()

    def clear_to_base(self) -> None:
        while len(self.stack) > 1:
            self.pop()

    def start_transition(self, on_midpoint: Callable[[], None]) -> None:
        self.transition.start(on_midpoint)

    def handle_event(self, event: pygame.event.Event) -> None:
        if self.transition.active:
            return
        if self.stack:
            self.stack[-1].handle_event(event)

    def update(self, dt: float) -> None:
        if self.transition.active:
            self.transition.update(dt)
            return
        if self.stack:
            self.stack[-1].update(dt)

    def render(self, screen: pygame.Surface) -> None:
        if not self.stack:
            return
        # Find lowest visible state index (walk backwards until non-transparent)
        start_idx = len(self.stack) - 1
        while start_idx > 0 and self.stack[start_idx].transparent:
            start_idx -= 1

        for idx in range(start_idx, len(self.stack)):
            state = self.stack[idx]
            if idx > start_idx and state.dim_background:
                screen.blit(self._dim_surf, (0, 0))
            state.render(screen, self.world_surf)

        self.transition.render(screen)
