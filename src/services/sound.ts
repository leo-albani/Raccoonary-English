/**
 * Web Audio API synthesized sound engine for Raccoonary.
 * Generates audio tones dynamically with smooth gain ramps to avoid clicks.
 * Does not require external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  try {
    const saved = localStorage.getItem('raccoonary_sound_enabled');
    return saved !== 'false'; // default enabled
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('raccoonary_sound_enabled', enabled ? 'true' : 'false');
  } catch {}
}

export type SoundEffect = 'correct' | 'review' | 'sessionComplete' | 'acorn' | 'levelAchieved';

export function playSound(effect: SoundEffect): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  try {
    if (effect === 'correct') {
      // 2 short ascending bright notes (e.g. C5 -> E5)
      const notes = [523.25, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);

        const start = now + idx * 0.09;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
        gain.gain.linearRampToValueAtTime(0, start + 0.1);

        osc.start(start);
        osc.stop(start + 0.1);
      });
    } else if (effect === 'review') {
      // 1 short soft warm note (330Hz), never a harsh alarm/buzzer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      gain.gain.linearRampToValueAtTime(0, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    } else if (effect === 'sessionComplete') {
      // 4 ascending arpeggio notes
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);

        const start = now + idx * 0.08;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
        gain.gain.linearRampToValueAtTime(0, start + 0.15);

        osc.start(start);
        osc.stop(start + 0.15);
      });
    } else if (effect === 'acorn') {
      // Quick high "pop" pitch sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.008);
      gain.gain.linearRampToValueAtTime(0, now + 0.09);

      osc.start(now);
      osc.stop(now + 0.09);
    } else if (effect === 'levelAchieved') {
      // Full rich chord (C5, E5, G5, C6) with lingering decay
      const chord = [523.25, 659.25, 783.99, 1046.50];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);

        const start = now + idx * 0.03;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.start(start);
        osc.stop(start + 0.6);
      });
    }
  } catch (e) {
    console.error('Audio playback error:', e);
  }
}
