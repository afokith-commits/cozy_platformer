/**
 * Procedural Web Audio API Synthesizer for SFX and cozy background music.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  public sfxVolume = 0.65;
  public musicVolume = 0.45;
  private musicTimer: number | null = null;
  private isMusicPlaying = false;

  constructor() {
    // AudioContext will initialize on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playTone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType = "triangle", gainVal = 0.25) {
    try {
      this.initCtx();
      if (!this.ctx || this.sfxVolume <= 0.01) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

      const actualGain = gainVal * this.sfxVolume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(actualGain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio fallback
    }
  }

  public playArpeggio(notes: number[], stepDur: number, gainVal = 0.25) {
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.02, stepDur * 1.5, "sine", gainVal);
      }, idx * stepDur * 1000);
    });
  }

  public play(name: string) {
    switch (name) {
      case "jump":
        this.playTone(280, 520, 0.11, "triangle", 0.26);
        break;
      case "double_jump":
        this.playTone(420, 740, 0.12, "sine", 0.25);
        break;
      case "dash":
        this.playTone(620, 220, 0.13, "triangle", 0.24);
        break;
      case "land":
        this.playTone(160, 95, 0.06, "triangle", 0.18);
        break;
      case "bounce":
        this.playTone(240, 680, 0.16, "sine", 0.28);
        break;
      case "gem":
        this.playArpeggio([659.25, 880.0], 0.05, 0.25);
        break;
      case "trinket":
        this.playArpeggio([523.25, 659.25, 783.99, 1046.5], 0.075, 0.30);
        break;
      case "shrine":
        this.playArpeggio([392.0, 523.25, 659.25, 783.99], 0.09, 0.28);
        break;
      case "warp":
        this.playArpeggio([783.99, 659.25, 523.25, 1046.5], 0.065, 0.28);
        break;
      case "buy":
        this.playArpeggio([587.33, 739.99, 880.0], 0.06, 0.28);
        break;
      case "equip":
        this.playTone(440, 660, 0.08, "sine", 0.24);
        break;
      case "respawn":
        this.playTone(340, 210, 0.18, "sine", 0.22);
        break;
      case "confirm":
        this.playArpeggio([523.25, 659.25], 0.055, 0.26);
        break;
      case "cancel":
        this.playTone(360, 240, 0.09, "triangle", 0.24);
        break;
      case "blip":
        this.playTone(480, 510, 0.024, "sine", 0.10);
        break;
    }
  }

  public startMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.scheduleCozyMusicLoop();
  }

  private scheduleCozyMusicLoop = () => {
    if (!this.isMusicPlaying) return;
    this.initCtx();
    if (this.ctx && this.musicVolume > 0.01) {
      const chords = [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [146.83, 220.00, 261.63, 349.23], // Dm7
        [116.54, 174.61, 220.00, 293.66], // Bbmaj7
        [130.81, 174.61, 261.63, 392.00]  // Csus4
      ];
      const chord = chords[Math.floor(Math.random() * chords.length)];
      chord.forEach((freq) => {
        this.playTone(freq, freq * 1.001, 2.8, "sine", 0.06 * this.musicVolume);
      });
    }
    this.musicTimer = window.setTimeout(this.scheduleCozyMusicLoop, 3200);
  };
}
