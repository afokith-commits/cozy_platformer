"""Lightweight easing curves and tween helpers for tactile UI and world polish."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def exp_damp(current: float, target: float, speed: float, dt: float) -> float:
    """Frame-rate independent exponential smoothing."""
    return lerp(current, target, 1.0 - math.exp(-speed * dt))


def ease_linear(t: float) -> float:
    return clamp(t, 0.0, 1.0)


def ease_out_cubic(t: float) -> float:
    t = clamp(t, 0.0, 1.0)
    return 1.0 - (1.0 - t) ** 3


def ease_in_cubic(t: float) -> float:
    t = clamp(t, 0.0, 1.0)
    return t ** 3


def ease_in_out_sine(t: float) -> float:
    t = clamp(t, 0.0, 1.0)
    return -(math.cos(math.pi * t) - 1.0) / 2.0


def ease_out_back(t: float, overshoot: float = 1.70158) -> float:
    t = clamp(t, 0.0, 1.0)
    c3 = overshoot + 1.0
    return 1.0 + c3 * ((t - 1.0) ** 3) + overshoot * ((t - 1.0) ** 2)


@dataclass
class Tween:
    """Animated scalar tween over a fixed duration."""

    start: float
    end: float
    duration: float
    easing: Callable[[float], float] = ease_out_cubic
    elapsed: float = 0.0
    on_complete: Callable[[], None] | None = None
    _completed: bool = False

    @property
    def done(self) -> bool:
        return self.elapsed >= self.duration

    @property
    def progress(self) -> float:
        if self.duration <= 0:
            return 1.0
        return clamp(self.elapsed / self.duration, 0.0, 1.0)

    @property
    def value(self) -> float:
        return lerp(self.start, self.end, self.easing(self.progress))

    def reset(self, start: float | None = None, end: float | None = None) -> None:
        if start is not None:
            self.start = start
        if end is not None:
            self.end = end
        self.elapsed = 0.0
        self._completed = False

    def update(self, dt: float) -> float:
        if not self._completed:
            self.elapsed = min(self.duration, self.elapsed + dt)
            if self.done:
                self._completed = True
                if self.on_complete is not None:
                    self.on_complete()
        return self.value
