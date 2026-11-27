/**
 * Sproutbound — Cozy Micro-Platformer Configuration & Physics Constants
 */

export const WORLD_W = 480;
export const WORLD_H = 270;
export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const UI_SCALE = CANVAS_W / WORLD_W;

export const TILE_SIZE = 16;
export const MAX_DT = 0.05;

// Physics constants (pixels/sec in 480x270 world space)
export const GRAVITY = 760.0;
export const MAX_FALL_SPEED = 290.0;
export const MOVE_ACCEL = 1150.0;
export const MOVE_DECEL = 1350.0;
export const AIR_ACCEL = 780.0;
export const AIR_DECEL = 420.0;
export const BASE_MOVE_SPEED = 108.0;
export const SPEED_BOOST_MULT = 1.32;

export const JUMP_VELOCITY = -238.0;
export const DOUBLE_JUMP_VELOCITY = -218.0;
export const JUMP_CUT_MULT = 0.48;
export const BOUNCE_PAD_VELOCITY = -315.0;

export const SLAM_VELOCITY = 390.0;
export const WALL_SLIDE_SPEED = 44.0;
export const WALL_JUMP_VX = 142.0;
export const WALL_JUMP_VY = -228.0;

export const COYOTE_TIME = 0.11;
export const JUMP_BUFFER_TIME = 0.11;

export const DASH_SPEED = 260.0;
export const DASH_DURATION = 0.14;
export const DASH_COOLDOWN = 0.55;

export const GLIDE_FALL_SPEED = 52.0;
export const INTERACT_RADIUS = 30.0;
export const GEM_MAGNET_RADIUS = 58.0;

export const COLORS = {
  cream: "#faf3e0",
  parchment: "#f2e5c6",
  parchment_dark: "#dbc69e",
  wood_dark: "#4a3429",
  wood_mid: "#704f3b",
  wood_light: "#9a7154",
  espresso: "#2e211c",
  moss: "#6a9e5c",
  moss_light: "#92c679",
  sage: "#7ca890",
  gold: "#f4c04e",
  gold_bright: "#ffe47a",
  coral: "#e57262",
  sky_teal: "#6dbfc2",
  plum: "#84619c",
  berry: "#c45870",
  shadow: "#181216",
  white: "#ffffff"
};
