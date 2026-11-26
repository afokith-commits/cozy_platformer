"""Entry point for Sproutbound (Concept C: Cozy Micro-Platformer)."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure cozy_platformer directory is on sys.path regardless of launch cwd
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pygame

from settings import FPS, GAME_TITLE, MAX_DT, SCREEN_H, SCREEN_W
from core.audio import AudioManager
from core.state import StateManager
from states.play_state import PlayState


def main() -> None:
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption(GAME_TITLE)
    clock = pygame.time.Clock()

    audio = AudioManager()
    manager = StateManager(audio)
    play_state = PlayState(manager)
    manager.push(play_state)

    while not manager.should_quit:
        dt = min(MAX_DT, clock.tick(FPS) / 1000.0)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                play_state.save(silent=True)
                manager.should_quit = True
                break
            manager.handle_event(event)

        manager.update(dt)
        manager.render(screen)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
