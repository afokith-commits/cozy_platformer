"""Save and load progression state (gems, badges, trinkets, flags, shrines)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any

from settings import SAVE_PATH


@dataclass
class GameProgress:
    """Mutable player progression and settings persisted to save.json."""

    gems: int = 0
    collected_gems: list[str] = field(default_factory=list)
    trinkets: list[str] = field(default_factory=list)
    unlocked_badges: list[str] = field(default_factory=list)
    equipped_badges: list[str] = field(default_factory=list)
    unlocked_shrines: list[str] = field(default_factory=lambda: ["shrine_meadow"])
    flags: dict[str, bool] = field(default_factory=dict)
    current_level: str = "meadow_hub"
    spawn_id: str = "start"
    sfx_volume: float = 0.65
    music_volume: float = 0.45

    def has_badge(self, badge_id: str) -> bool:
        return badge_id in self.unlocked_badges

    def is_equipped(self, badge_id: str) -> bool:
        return badge_id in self.equipped_badges

    def toggle_badge(self, badge_id: str, category: str = "ability") -> bool:
        """Equip or unequip an unlocked badge. Cosmetic trails are mutually exclusive."""
        if not self.has_badge(badge_id):
            return False
        if badge_id in self.equipped_badges:
            self.equipped_badges.remove(badge_id)
            return False
        if category == "trail":
            self.equipped_badges = [
                b for b in self.equipped_badges if not b.endswith("_trail")
            ]
        self.equipped_badges.append(badge_id)
        return True

    def unlock_badge(self, badge_id: str, auto_equip: bool = True, category: str = "ability") -> None:
        if badge_id not in self.unlocked_badges:
            self.unlocked_badges.append(badge_id)
        if auto_equip and not self.is_equipped(badge_id):
            self.toggle_badge(badge_id, category=category)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> GameProgress:
        defaults = cls()
        return cls(
            gems=int(data.get("gems", defaults.gems)),
            collected_gems=list(data.get("collected_gems", defaults.collected_gems)),
            trinkets=list(data.get("trinkets", defaults.trinkets)),
            unlocked_badges=list(data.get("unlocked_badges", defaults.unlocked_badges)),
            equipped_badges=list(data.get("equipped_badges", defaults.equipped_badges)),
            unlocked_shrines=list(data.get("unlocked_shrines", defaults.unlocked_shrines)),
            flags=dict(data.get("flags", defaults.flags)),
            current_level=str(data.get("current_level", defaults.current_level)),
            spawn_id=str(data.get("spawn_id", defaults.spawn_id)),
            sfx_volume=float(data.get("sfx_volume", defaults.sfx_volume)),
            music_volume=float(data.get("music_volume", defaults.music_volume)),
        )


def save_progress(progress: GameProgress, path: Path = SAVE_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(progress.to_dict(), indent=2), encoding="utf-8")


def load_progress(path: Path = SAVE_PATH) -> GameProgress:
    if not path.exists():
        return GameProgress()
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return GameProgress.from_dict(raw)
    except (OSError, json.JSONDecodeError, ValueError):
        return GameProgress()
