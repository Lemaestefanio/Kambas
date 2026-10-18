// Audio helper using Web Audio API

class AudioManager {
  private ctx: AudioContext | null = null;
  private voiceOsc: OscillatorNode | null = null;
  private voiceGain: GainNode | null = null;
  private isVoicePlaying = false;
  private voiceTimer: number | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Play a soft notification ding
  playChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Audio playback blocked or unsupported
    }
  }

  // Play / toggle simulated voice note with melodic ambient tone
  startVoicePreview(onEnded?: () => void): boolean {
    try {
      this.initCtx();
      if (!this.ctx) return false;

      this.stopVoicePreview();

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Soft melodic ambient chord representing intimate audio greeting
      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(329.63, now); // E4
      osc2.frequency.setValueAtTime(493.88, now); // B4

      // Gentle vibrato
      osc1.frequency.linearRampToValueAtTime(349.23, now + 1.2);
      osc1.frequency.linearRampToValueAtTime(329.63, now + 2.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 14);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 14);
      osc2.stop(now + 14);

      this.voiceOsc = osc1;
      this.voiceGain = gain;
      this.isVoicePlaying = true;

      this.voiceTimer = window.setTimeout(() => {
        this.isVoicePlaying = false;
        if (onEnded) onEnded();
      }, 14000);

      return true;
    } catch {
      return false;
    }
  }

  stopVoicePreview() {
    if (this.voiceTimer) {
      window.clearTimeout(this.voiceTimer);
      this.voiceTimer = null;
    }
    if (this.voiceGain && this.ctx) {
      try {
        this.voiceGain.gain.setValueAtTime(this.voiceGain.gain.value, this.ctx.currentTime);
        this.voiceGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      } catch {
        // ignore
      }
    }
    this.isVoicePlaying = false;
  }

  isPlaying(): boolean {
    return this.isVoicePlaying;
  }
}

export const audioService = new AudioManager();
