import { AudioPlayer } from "./modules/AudioPlayer.js";
import { ScoreManager } from "./modules/ScoreManager/ScoreManager.js";
import { ScoreAnimator } from "./modules/ScoreManager/ScoreAnimator.js";
import { T } from "./modules/Tonal/Tonal.js";

// ---- Hard-coded dictation (C major, 4/4) ----
const SCORE = {
  // optional global defaults (ScoreManager already has sane defaults)
  timeSignature: { beats: 4, type: 4 },
  measures: [
    { keySignature: { tonic: "C", mode: "major", numFifths: 0 }, clefs: ["treble"],
      notes: [
        { keys: ["c/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["d/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["f/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["c/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["b/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["a/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["d/4"], duration: "h", clef: "treble", voice: 1, staff: 1 },
        { keys: ["c/4"], duration: "h", clef: "treble", voice: 1, staff: 1 },
      ]},
  ],
};

// ---- Keep your MP3 assets + routes identical ----
const audioPlayer = new AudioPlayer("/api/assets/acoustic_grand_piano-mp3");

window.audioPlayer = audioPlayer;

// ---- PRELOAD NOTE SAMPLES + CLICK ----
(async () => {
  // same flats-first set you use in the main app
  const noteLetters = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
  const notesToLoad = [];
  for (let i = 1; i <= 7; i++) {
    for (const L of noteLetters) notesToLoad.push(`${L}${i}`);
  }

  await audioPlayer.preloadSamples(notesToLoad);

  // if you want a metronome click (optional):
  // use the path that matches your repo (see server step below)
  await audioPlayer.loadClickSample("/api/assets/agogo.mp3");

  // now that audio is ready, build the schedule
  sm.sendToPlay(audioPlayer, sm.VFNoteStacks);
})();


// ---- ScoreManager:
const sm = new ScoreManager("notation");

window.scoreManager = sm;
window.app = { sm, audioPlayer, T };   // for console access

// Set the minimal state ScoreManager expects before rendering
sm.tonic = "C";
sm.mode = "major";
sm.base = "labased";                                   // solfege
sm.timeSignature = SCORE.timeSignature || { beats: 4, type: 4 };
sm.scale = T.getScale(T.convertVexKeyNameToPitchName(sm.tonic), sm.mode, sm.base);

// Inject the score object and render using existing pipeline
sm.score = SCORE;
sm.renderToVex();

// Prep playback using existing animator mixin
sm.sendToPlay(audioPlayer, sm.VFNoteStacks);

// ---- Minimal controls (no UIManager) ----
const playBtn = document.getElementById("playPauseBtn");
playBtn.addEventListener("click", async () => {
  try {
    if (audioPlayer.audioContext?.state === "suspended") await audioPlayer.audioContext.resume();
    if (audioPlayer.context?.state === "suspended") await audioPlayer.context.resume();
  } catch {}
  await ScoreAnimator.togglePlayPause(audioPlayer);
  playBtn.textContent = audioPlayer.isPlaying ? "❚❚" : "▶︎";
});

document.getElementById("restartBtn").addEventListener("click", () => {
  ScoreAnimator.stopPlayback?.(audioPlayer, { resetToStart: true });
  playBtn.textContent = "▶︎";
});

document.getElementById("applyTempoBtn").addEventListener("click", () => {
  const bpm = Math.max(40, Math.min(240, parseInt(document.getElementById("tempoInput").value || "96", 10)));
  sm.tempo = bpm;
  sm.sendToPlay(audioPlayer, sm.VFNoteStacks); // rebuild schedule at new tempo
});

// For quick console poking
window.app = { sm, audioPlayer, T };
