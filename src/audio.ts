/**
 * Sproutbound — Web Audio API Sound Effects & Cozy Music Generator
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private isMusicPlaying = false;
  private sfxVolume = 0.65;
  private musicVolume = 0.45;
  private chordIdx = 0;

  public setSfxVolume(v: number) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  public setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = "triangle",
    gainVal = 0.25,
    isMusic = false
  ) {
    try {
      this.initCtx();
      const vol = isMusic ? this.musicVolume : this.sfxVolume;
      if (!this.ctx || this.ctx.state !== "running" || vol <= 0.01) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freqStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

      const actualGain = gainVal * vol;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(actualGain, now + (isMusic ? 0.25 : 0.008));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch { /* Audio fallback */ }
  }

  public playArpeggio(freqs: number[], duration = 0.08, gainVal = 0.2) {
    freqs.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, f * 1.001, duration, "sine", gainVal), idx * 75);
    });
  }

  public play(sfxName: string) {
    switch (sfxName) {
      case "jump":
        this.playTone(220, 440, 0.14, "triangle", 0.2);
        break;
      case "double_jump":
        this.playTone(330, 660, 0.16, "sine", 0.22);
        break;
      case "dash":
        this.playTone(440, 150, 0.15, "sawtooth", 0.18);
        break;
      case "gem":
        this.playTone(587.33, 880, 0.18, "sine", 0.22);
        break;
      case "trinket":
        this.playTone(440, 880, 0.35, "sine", 0.25);
        setTimeout(() => this.playTone(880, 1320, 0.25, "sine", 0.2), 120);
        break;
      case "shrine":
        this.playTone(261.63, 523.25, 0.6, "sine", 0.3);
        setTimeout(() => this.playTone(392.0, 783.99, 0.5, "sine", 0.25), 200);
        break;
      case "warp":
        this.playTone(300, 150, 0.4, "triangle", 0.25);
        break;
      case "blip":
        this.playTone(480, 520, 0.06, "sine", 0.12);
        break;
      case "confirm":
        this.playTone(523.25, 659.25, 0.12, "sine", 0.18);
        break;
      case "cancel":
        this.playTone(350, 280, 0.12, "triangle", 0.15);
        break;
      case "equip":
        this.playTone(400, 600, 0.12, "sine", 0.16);
        break;
      case "buy":
        this.playTone(523.25, 1046.5, 0.25, "sine", 0.25);
        break;
      case "orb":
        this.playArpeggio([783.99, 1046.5], 0.045, 0.25);
        break;
      case "crumble":
        this.playTone(210, 120, 0.12, "triangle", 0.16);
        break;
      case "slam":
        this.playTone(170, 55, 0.16, "triangle", 0.30);
        break;
      case "smash":
        this.playTone(260, 70, 0.18, "sawtooth", 0.22);
        break;
      case "bubble":
        this.playTone(320, 780, 0.14, "sine", 0.28);
        break;
      case "stomp":
        this.playTone(260, 560, 0.12, "sine", 0.26);
        break;
      case "trial_start":
        this.playArpeggio([440, 554.37, 659.25], 0.07, 0.28);
        break;
      case "trial_tick":
        this.playTone(680, 640, 0.05, "sine", 0.16);
        break;
      case "trial_win":
        this.playArpeggio([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.07, 0.30);
        break;
      default:
        this.playTone(300, 400, 0.1, "triangle", 0.15);
        break;
    }
  }

  public startMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.scheduleCozyMusicLoop();
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer !== null) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleCozyMusicLoop = () => {
    if (!this.isMusicPlaying) return;
    if (this.ctx && this.ctx.state === "running" && this.musicVolume > 0.01) {
      const chords = [
        [174.61, 220.00, 261.63, 329.63], // Fmaj7
        [146.83, 220.00, 261.63, 349.23], // Dm7
        [116.54, 174.61, 220.00, 293.66], // Bbmaj7
        [130.81, 174.61, 261.63, 392.00]  // Csus4
      ];
      const bells = [523.25, 659.25, 587.33, 783.99];
      chords[this.chordIdx % chords.length].forEach((f) => this.playTone(f, f * 1.001, 2.9, "sine", 0.055, true));
      const bell = bells[this.chordIdx % bells.length];
      setTimeout(() => this.playTone(bell, bell, 0.9, "sine", 0.04, true), 900);
      this.chordIdx = (this.chordIdx + 1) % chords.length;
    }
    this.musicTimer = window.setTimeout(this.scheduleCozyMusicLoop, 3000);
  };
}
