export class AudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private tempo: number = 0.2; // seconds per note
  // A simple cheerful loop: Cmaj7 -> Am7 -> Fmaj7 -> G7
  private sequence = [
    261.63, 329.63, 392.00, 493.88, // C4 E4 G4 B4
    220.00, 261.63, 329.63, 392.00, // A3 C4 E4 G4
    174.61, 220.00, 261.63, 329.63, // F3 A3 C4 E4
    196.00, 246.94, 293.66, 349.23  // G3 B3 D4 F4
  ];
  private currentNote = 0;
  private nextNoteTime = 0;
  private timerId: number | null = null;

  constructor() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  play() {
    if (!this.ctx) return;
    
    // Resume context if suspended (browser autoplay policy)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error("Audio resume failed", e));
    }

    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime;
    this.schedule();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ctx) {
       if (this.isMuted) {
         // Suspending is more efficient than just silencing gain
         this.ctx.suspend(); 
       } else {
         this.ctx.resume();
       }
    }
    return this.isMuted;
  }
  
  getMuted() { return this.isMuted; }

  private schedule() {
    if (!this.ctx || !this.isPlaying) return;

    // Lookahead: Schedule notes for the next 0.1s
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      // If we fell behind (e.g. tab backgrounded), skip ahead
      if (this.nextNoteTime < this.ctx.currentTime - 0.2) {
        this.nextNoteTime = this.ctx.currentTime;
      }
      
      this.playNote(this.sequence[this.currentNote]);
      this.currentNote = (this.currentNote + 1) % this.sequence.length;
      this.nextNoteTime += this.tempo;
    }
    this.timerId = window.setTimeout(() => this.schedule(), 25);
  }

  private playNote(freq: number) {
    if (!this.ctx || this.isMuted) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Triangle wave for a softer 8-bit sound
    osc.type = 'triangle'; 
    osc.frequency.value = freq;
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    const now = this.nextNoteTime;
    const duration = this.tempo * 0.8; // Slight staccato

    // Envelope to avoid clicking
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02); // Quick Attack
    gain.gain.linearRampToValueAtTime(0.05, now + duration - 0.02); // Sustain
    gain.gain.linearRampToValueAtTime(0, now + duration); // Release
    
    osc.start(now);
    osc.stop(now + duration);
  }
}

export const audioController = new AudioController();
