// public/modules/AudioPlayer.js

export class AudioPlayer {
  constructor(samplePath) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.samplePath = samplePath;
    this.audioBuffers = {};
    this.isPlaying = false;
    this.audioEnabled = true;
    this.clickBuffer = null;
    this.metronomeAudioEnabled = true;
    this.accomp = null;           // current BufferSource (active playback node)
    this.accompBuffer = null;     // decoded audio buffer
    this.accompGain = this.audioContext.createGain();
    this.accompGain.connect(this.audioContext.destination);
    this.accompStartTime = 0;     // audioContext time when the track started
    this.accompOffset = 0;        // seconds into the buffer (for resume)
  }

  async preloadSamples(notes) {
    const promises = notes.map(async (note) => {
      const url = `${this.samplePath}/${note}.mp3`;
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffers[note] = await this.audioContext.decodeAudioData(arrayBuffer);
    });
    await Promise.all(promises);
    console.log("All samples preloaded!");
  }

  async loadClickSample(url = "assets/agogo.mp3") {
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    this.clickBuffer = await this.audioContext.decodeAudioData(arrayBuf);
  }

  playNote(noteName, startTime, duration, opts) {
    const buffer = this.audioBuffers[noteName];
    if (!buffer) return;

    // allow reference beeps to bypass the global "audioEnabled" mute
    if (this.audioContext?.state === 'suspended') { this.audioContext.resume(); }

    const bypassMute = opts && opts.bypassMute === true;
    if (!this.audioEnabled && !bypassMute) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    source.buffer = buffer;
    source.connect(gainNode).connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(1, startTime + duration - 0.005);

     // Schedule a fade-out to 0 volume just before stopping the note
    const fadeOutTime = Math.max(0, startTime + duration - 0.001); // Ensure no negative time
    gainNode.gain.linearRampToValueAtTime(0, fadeOutTime);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  playClick(when = this.audioContext.currentTime, gain = 1.0) {
    if (!this.metronomeAudioEnabled || !this.clickBuffer) return; // <-- decoupled
    const src = this.audioContext.createBufferSource();
    src.buffer = this.clickBuffer;
    const g = this.audioContext.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.audioContext.destination);
    src.start(when);
  }

  async setAccompaniment(url) {
    await this.clearAccompaniment();

    // Fetch and decode the MP3 file in advance (so play is instantaneous)
    const res = await fetch(url, { cache: "no-store" });
    const arr = await res.arrayBuffer();
    this.accompBuffer = await this.audioContext.decodeAudioData(arr);
    this.accompOffset = 0;
  }

  createAccompanimentSource() {
    if (!this.accompBuffer) return null;
    const src = this.audioContext.createBufferSource();
    src.buffer = this.accompBuffer;
    src.connect(this.accompGain);
    return src;
  }

  async clearAccompaniment() {
    try { this.stopAccompaniment(); } catch {}
    this.accompBuffer = null;
    this.accomp = null;
    this.accompOffset = 0;
  }

  startAccompanimentAt(when, { reset = true } = {}) {
    if (!this.accompBuffer) return;

    if (this.accomp) { try { this.accomp.stop(); } catch {} }

    if (reset) this.accompOffset = 0;

    const src = this.createAccompanimentSource();
    this.accomp = src;
    const offset = Math.max(0, Math.min(this.accompOffset, this.accompBuffer.duration));
    this.accompStartTime = when - offset;
    src.start(when, offset);
  }

  pauseAccompaniment() {
    if (!this.accomp) return;
    const now = this.audioContext.currentTime;
    this.accompOffset = Math.max(0, now - this.accompStartTime);
    try { this.accomp.stop(); } catch {}
    this.accomp = null;
  }

  resumeAccompanimentAt(when) {
    if (!this.accompBuffer) return;

    if (this.accomp) { try { this.accomp.stop(); } catch {} this.accomp = null; }

    const offset = Math.max(0, Math.min(this.accompOffset, this.accompBuffer.duration));
    const src = this.createAccompanimentSource();
    this.accomp = src;
    this.accompStartTime = when - offset;
    src.start(when, offset);
  }

  stopAccompaniment() {
    if (this.accomp) { try { this.accomp.stop(); } catch {} }
    this.accomp = null;
    this.accompOffset = 0;
  }
}