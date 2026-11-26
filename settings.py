"""Global configuration, resolution, physics constants, colors, and keybinds."""

from pathlib import Path
import pygame

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LEVELS_DIR = DATA_DIR / "levels"
SAVE_PATH = BASE_DIR / "save.json"

GAME_TITLE = "Sproutbound — Cozy Micro-Platformer"

# Split resolution: pixel-art world rendered at 480x270, crisp UI at 1280x720
WORLD_W = 480
WORLD_H = 270
SCREEN_W = 1280
SCREEN_H = 720
UI_SCALE = SCREEN_W / WORLD_W  # 2.6666...

TILE_SIZE = 16
FPS = 60
MAX_DT = 0.05

# Player physics (pixels/sec in world coordinates)
GRAVITY = 760.0
MAX_FALL_SPEED = 290.0
MOVE_ACCEL = 1150.0
MOVE_DECEL = 1350.0
AIR_ACCEL = 780.0
AIR_DECEL = 420.0
BASE_MOVE_SPEED = 108.0
SPEED_BOOST_MULT = 1.32

JUMP_VELOCITY = -238.0
DOUBLE_JUMP_VELOCITY = -218.0
JUMP_CUT_MULT = 0.48
BOUNCE_PAD_VELOCITY = -315.0

COYOTE_TIME = 0.11
JUMP_BUFFER_TIME = 0.11

DASH_SPEED = 260.0
DASH_DURATION = 0.14
DASH_COOLDOWN = 0.55

INTERACT_RADIUS = 26.0
GEM_MAGNET_RADIUS = 58.0

# Cozy color palette
COLORS = {
    "cream": (250, 243, 224),
    "parchment": (242, 229, 198),
    "parchment_dark": (219, 198, 158),
    "wood_dark": (74, 52, 41),
    "wood_mid": (112, 79, 59),
    "wood_light": (154, 113, 84),
    "espresso": (46, 33, 28),
    "moss": (106, 158, 92),
    "moss_light": (146, 198, 121),
    "sage": (124, 168, 144),
    "gold": (244, 192, 78),
    "gold_bright": (255, 228, 122),
    "coral": (229, 114, 98),
    "sky_teal": (109, 191, 194),
    "plum": (132, 97, 156),
    "berry": (196, 88, 112),
    "shadow": (24, 18, 22),
    "white": (255, 255, 255),
}

# Keybinds
KEYS_LEFT = (pygame.K_a, pygame.K_LEFT)
KEYS_RIGHT = (pygame.K_d, pygame.K_RIGHT)
KEYS_UP = (pygame.K_w, pygame.K_UP)
KEYS_DOWN = (pygame.K_s, pygame.K_DOWN)
KEYS_JUMP = (pygame.K_SPACE, pygame.K_w, pygame.K_UP, pygame.K_z)
KEYS_INTERACT = (pygame.K_e, pygame.K_RETURN)
KEYS_DASH = (pygame.K_LSHIFT, pygame.K_RSHIFT, pygame.K_x, pygame.K_k)
KEYS_INVENTORY = (pygame.K_TAB, pygame.K_i)
KEYS_MAP = (pygame.K_m,)
KEYS_PAUSE = (pygame.K_ESCAPE,)
KEYS_CONFIRM = (pygame.K_RETURN, pygame.K_SPACE, pygame.K_e)
KEYS_CANCEL = (pygame.K_ESCAPE, pygame.K_BACKSPACE)
