"""Procedural cozy synthesizer for SFX and ambient background chords."""

from __future__ import annotations

import math
import struct
import pygame


class AudioManager:
    """Generates and plays soft retro/marimba-like SFX with zero external audio files."""

    SAMPLE_RATE = 22050

    def __init__(self) -> None:
        self.enabled = False
        self.sfx_volume = 0.65
        self.music_volume = 0.45
        self.sounds: dict[str, pygame.mixer.Sound] = {}
        self._music_sound: pygame.mixer.Sound | None = None
        self._music_channel: pygame.mixer.Channel | None = None

        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=self.SAMPLE_RATE, size=-16, channels=1, buffer=512)
            self.enabled = True
            self._build_sounds()
        except pygame.error:
            self.enabled = False

    def _tone(
        self,
        freq_start: float,
        freq_end: float,
        duration: float,
        wave: str = "triangle",
        gain: float = 0.35,
        attack: float = 0.008,
    ) -> pygame.mixer.Sound:
        n_samples = max(1, int(self.SAMPLE_RATE * duration))
        buf = bytearray(n_samples * 2)
        phase = 0.0
        for i in range(n_samples):
            t = i / n_samples
            freq = freq_start + (freq_end - freq_start) * t
            phase += 2.0 * math.pi * freq / self.SAMPLE_RATE
            if wave == "sine":
                raw = math.sin(phase)
            elif wave == "square":
                raw = 1.0 if math.sin(phase) >= 0 else -1.0
            else:  # warm triangle
                raw = (2.0 / math.pi) * math.asin(math.sin(phase))

            env_attack = min(1.0, (i / self.SAMPLE_RATE) / max(0.001, attack))
            env_decay = (1.0 - t) ** 1.6
            sample = int(max(-1.0, min(1.0, raw * gain * env_attack * env_decay)) * 32767)
            struct.pack_into("<h", buf, i * 2, sample)
        return pygame.mixer.Sound(buffer=bytes(buf))

    def _chord_arpeggio(self, freqs: list[float], step_dur: float, gain: float = 0.28) -> pygame.mixer.Sound:
        step_samples = int(self.SAMPLE_RATE * step_dur)
        total = step_samples * len(freqs)
        buf = bytearray(total * 2)
        for idx, freq in enumerate(freqs):
            for j in range(step_samples):
                t = j / step_samples
                phase = 2.0 * math.pi * freq * (j / self.SAMPLE_RATE)
                raw = 0.7 * math.sin(phase) + 0.3 * math.sin(phase * 2.0)
                env = min(1.0, j / max(1, int(self.SAMPLE_RATE * 0.01))) * ((1.0 - t) ** 1.4)
                val = int(max(-1.0, min(1.0, raw * gain * env)) * 32767)
                struct.pack_into("<h", buf, (idx * step_samples + j) * 2, val)
        return pygame.mixer.Sound(buffer=bytes(buf))

    def _build_ambient_loop(self) -> pygame.mixer.Sound:
        """Create a soft 8-second cozy pentatonic music pad loop."""
        duration = 8.0
        n_samples = int(self.SAMPLE_RATE * duration)
        buf = bytearray(n_samples * 2)
        # Gentle Fmaj7 -> Dm7 -> Bbmaj7 -> Csus4 progression
        chords = [
            (174.61, 220.00, 261.63, 329.63),
            (146.83, 220.00, 261.63, 349.23),
            (116.54, 174.61, 220.00, 293.66),
            (130.81, 174.61, 261.63, 392.00),
        ]
        chord_len = n_samples // len(chords)
        for i in range(n_samples):
            c_idx = min(len(chords) - 1, i // chord_len)
            local_t = (i % chord_len) / chord_len
            t_sec = i / self.SAMPLE_RATE
            # Smooth crossfade envelope per chord
            env = math.sin(math.pi * local_t) ** 0.45
            val = 0.0
            for k, f in enumerate(chords[c_idx]):
                wobble = 1.0 + 0.0015 * math.sin(2.0 * math.pi * 0.4 * t_sec + k)
                val += math.sin(2.0 * math.pi * f * wobble * t_sec) * (0.25 if k < 2 else 0.16)
            # Gentle bell sparkle every 1.0s
            beat_t = (t_sec % 1.0)
            bell_notes = [523.25, 659.25, 587.33, 783.99, 698.46, 659.25, 587.33, 523.25]
            bell_f = bell_notes[int(t_sec) % len(bell_notes)]
            bell_env = math.exp(-beat_t * 5.0) * min(1.0, beat_t / 0.01)
            val += math.sin(2.0 * math.pi * bell_f * t_sec) * 0.14 * bell_env

            sample = int(max(-1.0, min(1.0, val * env * 0.22)) * 32767)
            struct.pack_into("<h", buf, i * 2, sample)
        return pygame.mixer.Sound(buffer=bytes(buf))

    def _build_sounds(self) -> None:
        self.sounds = {
            "blip": self._tone(540, 620, 0.045, "sine", 0.20),
            "confirm": self._chord_arpeggio([523.25, 659.25], 0.055, 0.26),
            "cancel": self._tone(360, 240, 0.09, "triangle", 0.24),
            "jump": self._tone(280, 520, 0.11, "triangle", 0.26),
            "double_jump": self._tone(420, 740, 0.12, "sine", 0.25),
            "dash": self._tone(620, 220, 0.13, "triangle", 0.24),
            "land": self._tone(160, 95, 0.06, "triangle", 0.18),
            "bounce": self._tone(240, 680, 0.16, "sine", 0.28),
            "gem": self._chord_arpeggio([659.25, 880.0], 0.05, 0.25),
            "trinket": self._chord_arpeggio([523.25, 659.25, 783.99, 1046.5], 0.075, 0.30),
            "shrine": self._chord_arpeggio([392.0, 523.25, 659.25, 783.99], 0.09, 0.28),
            "warp": self._chord_arpeggio([783.99, 659.25, 523.25, 1046.5], 0.065, 0.28),
            "buy": self._chord_arpeggio([587.33, 739.99, 880.0], 0.06, 0.28),
            "equip": self._tone(440, 660, 0.08, "sine", 0.24),
            "respawn": self._tone(340, 210, 0.18, "sine", 0.22),
            "dialogue_char": self._tone(480, 510, 0.024, "sine", 0.10, attack=0.003),
        }
        self._music_sound = self._build_ambient_loop()

    def start_music(self) -> None:
        if not self.enabled or self._music_sound is None:
            return
        if self._music_channel is None or not self._music_channel.get_busy():
            self._music_channel = self._music_sound.play(loops=-1)
            self.set_music_volume(self.music_volume)

    def set_sfx_volume(self, vol: float) -> None:
        self.sfx_volume = max(0.0, min(1.0, vol))

    def set_music_volume(self, vol: float) -> None:
        self.music_volume = max(0.0, min(1.0, vol))
        if self._music_channel is not None:
            self._music_channel.set_volume(self.music_volume)

    def play(self, name: str, pitch_jitter: float = 0.0) -> None:
        if not self.enabled or self.sfx_volume <= 0.01:
            return
        snd = self.sounds.get(name)
        if snd is not None:
            snd.set_volume(self.sfx_volume)
            snd.play()
