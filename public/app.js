import { AudioPlayer } from "./modules/AudioPlayer.js";
import { ScoreManager } from "./modules/ScoreManager/ScoreManager.js";
import { ScoreAnimator } from "./modules/ScoreManager/ScoreAnimator.js";
import { T } from "./modules/Tonal/Tonal.js";

// // ---- Hard-coded dictation (C major, 4/4) ----
// const SCORE = {
//   // optional global defaults (ScoreManager already has sane defaults)
//   timeSignature: { beats: 4, type: 4 },
//   measures: [
//     { keySignature: { tonic: "C", mode: "major", numFifths: 0 }, clefs: ["treble"],
//       notes: [
//         { keys: ["c/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["d/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//       ]},
//     { notes: [
//         { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["f/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["c/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//       ]},
//     { notes: [
//         { keys: ["b/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["a/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["e/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
//       ]},
//     { notes: [
//         { keys: ["d/4"], duration: "h", clef: "treble", voice: 1, staff: 1 },
//         { keys: ["c/4"], duration: "h", clef: "treble", voice: 1, staff: 1 },
//       ]},
//   ],
// };

// ---- Hard-coded dictation (G major, 3/4) ----
const SCORE = {
  // optional global defaults (ScoreManager already has sane defaults)
  timeSignature: { beats: 3, type: 4 },
  measures: [
    { keySignature: { tonic: "G", mode: "major", numFifths: 0 }, clefs: ["treble"],
      notes: [
        { keys: ["g/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["b/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["d/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["g/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["f#/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["d/5"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["c/5"], duration: "8", clef: "treble", voice: 1, staff: 1 },
        { keys: ["a/4"], duration: "8", clef: "treble", voice: 1, staff: 1 },
        { keys: ["f#/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["d/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
      ]},
    { notes: [
        { keys: ["d/4"], duration: "q", clef: "treble", voice: 1, staff: 1 },
        { keys: ["g/4"], duration: "h", clef: "treble", voice: 1, staff: 1 },
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
// Need to update the tonic and the number of beats to change between excercises
sm.tonic = "G";
sm.mode = "major";
sm.base = "labased";                                   // solfege
sm.timeSignature = SCORE.timeSignature || { beats: 3, type: 4 };
sm.scale = T.getScale(T.convertVexKeyNameToPitchName(sm.tonic), sm.mode, sm.base);

// Inject the score object and render using existing pipeline
sm.score = SCORE;
sm.renderToVex();

// Prep playback using existing animator mixin
sm.sendToPlay(audioPlayer, sm.VFNoteStacks);
//Hide properly created correct notation
document.getElementById("notation-container").style.display = "none";

// ---- ScoreManager:
const sm2 = new ScoreManager("user-notation");

window.scoreManager = sm2;

// Set the minimal state ScoreManager expects before rendering
sm2.tonic = sm.tonic;
sm2.mode = sm.mode
sm2.base = sm.base;                                   // solfege
sm2.timeSignature = sm.timeSignature;
sm2.scale = sm.scale;

//Global variables
var allNotes = [];
var currentNotes = [];
var currentMeasure = 0;
var selectedNoteIndex = 1;
var music = new Vex.Flow.Music();
var scaleMap = music.createScaleMap(sm2.tonic);

sm2.score = {
    // optional global defaults (ScoreManager already has sane defaults)
    timeSignature: sm.score.timeSignature,
    measures: [
      { keySignature: sm.score.keySignature,
        notes: []},
    ],
  };

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

// document.getElementById("restartBtn").addEventListener("click", () => {
//   ScoreAnimator.stopPlayback?.(audioPlayer, { resetToStart: true });
//   playBtn.textContent = "▶︎";
// });

// document.getElementById("applyTempoBtn").addEventListener("click", () => {
//   const bpm = Math.max(40, Math.min(240, parseInt(document.getElementById("tempoInput").value || "96", 10)));
//   sm.tempo = bpm;
//   sm.sendToPlay(audioPlayer, sm.VFNoteStacks); // rebuild schedule at new tempo
// });

const firstNote = sm.score.measures[0].notes[0];
allNotes.push(firstNote);
currentNotes.push(firstNote);
sm2.score.measures[0].notes = currentNotes;
sm2.renderToVex();

function findOldNote(oldNotePosition) {
  let measureToCheck = 0;
  while(oldNotePosition >= sm2.score.measures[measureToCheck].notes?.length) {
      oldNotePosition -= sm2.score.measures[measureToCheck].notes.length;
      measureToCheck++; 
      if(sm2.score.measures[measureToCheck]?.notes == null) {
        return null;
      }
  }
  console.log(`oldNotePosition is ${oldNotePosition}`)
  return sm2.score.measures[measureToCheck].notes[oldNotePosition];
}

function getSemitoneValue(noteString) {
  // Expected input format: "c/4", "eb/5", "f#/3"
  const parts = noteString.split('/');
  const key = parts[0].toLowerCase(); // e.g., "c", "eb"
  const octave = parseInt(parts[1], 10); // e.g., 4, 5

  // Get the 0-11 pitch class value from VexFlow
  const noteParts = music.getNoteParts(key);
  const pitchClass = music.getNoteValue(noteParts.root);
  
  // Adjust for accidentals manually if needed, or via music utility
  let accidentalModifier = 0;
  if (noteParts.accidental) {
    if (noteParts.accidental === '#') accidentalModifier = 1;
    if (noteParts.accidental === 'b') accidentalModifier = -1;
  }

  // Calculate absolute semitone index (C0 = 0)
  return (octave * 12) + pitchClass + accidentalModifier;
}

function calculateInterval(note1, note2) {
  const semitone1 = getSemitoneValue(note1);
  const semitone2 = getSemitoneValue(note2);
  
  // Returns absolute numeric distance in semitones
  return semitone2 - semitone1;
}

function findDefaultOctave(oldNoteName, oldNoteOctave, newNoteName) {
  //Assumes they'll be the same
  let newNoteOctave = oldNoteOctave;
  //distance is -11 to 11
  const distance = calculateInterval((oldNoteName + "/" + oldNoteOctave), (newNoteName + "/" + oldNoteOctave));
  //Adds or subtract an octave appropriately, e.g. A4  C5, D4
  if (distance > 5) {
    newNoteOctave = parseInt(newNoteOctave) - 1;
  } else if (distance < -5) {
    newNoteOctave = parseInt(newNoteOctave) + 1;
  }
  return newNoteOctave;
}

async function addNote(noteName, noteValue) {
  let measureNoteValue = 0;
  let oldNoteName;
  let oldNoteOctave;
  const oldNoteParts = allNotes.at(-1).keys[0].split('/');
  oldNoteName = oldNoteParts[0];
  oldNoteOctave = oldNoteParts[1];
  const noteOctave = findDefaultOctave(oldNoteName, oldNoteOctave, noteName);
  console.log(`noteOctave is ${noteOctave}`);
  let fullNoteName = noteName + "/" + noteOctave;
  let newNote = { keys: [fullNoteName], duration: noteValue, clef: "treble", voice: 1, staff: 1 }
  currentNotes.push(newNote);
    for(let i = 0; i < currentNotes.length; i++) {
      switch(currentNotes[i].duration) {
        case "16":
          measureNoteValue += 0.25;
          break;
        case "8":
          measureNoteValue += 0.5;
          break;
        case "q":
          measureNoteValue += 1;
          break;
        case "h":
          measureNoteValue += 2;
          break;
        case "w":
          measureNoteValue += 4;
          break;
      }
    }
    if(measureNoteValue > sm2.timeSignature.beats) {
      currentNotes.pop();
    } else {
      allNotes.push(newNote);
      selectedNoteIndex = allNotes.length;
      document.getElementById("selectedIndex").textContent = `Selected index is: ${selectedNoteIndex}`;
      sm2.score.measures[currentMeasure].notes = currentNotes;
      sm2.renderToVex();
    }
    if(measureNoteValue == sm2.timeSignature.beats) {
      currentNotes = [];
      currentMeasure++;
      sm2.score.measures[currentMeasure] = {notes: []};
    }
}

async function removeNote() {
  if(!((currentMeasure == 0) && (currentNotes.length <= 1))) {
    if(currentNotes.length == 0) {
      currentMeasure--;
      currentNotes = sm2.score.measures[currentMeasure].notes;
      sm2.score.measures.pop();
    }
    currentNotes.pop();
    allNotes.pop();
    selectedNoteIndex = allNotes.length;
    document.getElementById("selectedIndex").textContent = `Selected index is: ${selectedNoteIndex}`;
    console.log(sm2.score.measures[currentMeasure]);
    sm2.renderToVex();
  }
}


async function replaceNote(oldNoteIndex, newNoteName, newNoteOctave) {
  if(oldNoteIndex != 0) {
    let measureToCheck = 0;
    let oldNotePosition = oldNoteIndex;
    while(oldNotePosition >= sm2.score.measures[measureToCheck].notes.length) {
        oldNotePosition -= sm2.score.measures[measureToCheck].notes.length;
        measureToCheck++; 
    }
    let oldNote = sm2.score.measures[measureToCheck].notes[oldNotePosition];
    let fullNewNoteName = newNoteName + "/" + newNoteOctave;
    let newNote = { keys: [fullNewNoteName], duration: oldNote.duration, clef: "treble", voice: 1, staff: 1 };
    sm2.score.measures[measureToCheck].notes[oldNotePosition] = newNote;
    sm2.renderToVex();
    allNotes[oldNoteIndex] = newNote;
  }
}

async function moveNoteUpOctave() {
  const oldNote = findOldNote(selectedNoteIndex);
  if(oldNote != null) {
    const oldNoteAndOct = oldNote.keys[0].split("/");
    const noteName = oldNoteAndOct[0];
    const noteOctave = parseInt(oldNoteAndOct[1], 10) + 1;
    replaceNote(selectedNoteIndex, noteName, noteOctave);
  }
}

async function moveNoteDownOctave() {
  const oldNote = findOldNote(selectedNoteIndex);
  if(oldNote != null) {
  const oldNoteAndOct = oldNote.keys[0].split("/");
  const noteName = oldNoteAndOct[0];
  const noteOctave = parseInt(oldNoteAndOct[1], 10) - 1;
  replaceNote(selectedNoteIndex, noteName, noteOctave);
  }
}

function moveNoteUpHalfStep(noteName) {
  const noteValue = getSemitoneValue(noteName) % 12;
  let newNoteValue;
  let noteOctave = (noteName.split("/"))[1];
  if(noteValue == 11) {
    newNoteValue = 0;
    noteOctave = parseInt(noteOctave) + 1;
  } else {
    newNoteValue = noteValue + 1;
  }
  noteName = music.getCanonicalNoteName(newNoteValue);
  return {noteName: noteName, noteOctave: noteOctave};
}

function moveNoteDownHalfStep(noteName) {
  const noteValue = getSemitoneValue(noteName) % 12;
  let newNoteValue;
  let noteOctave = (noteName.split("/"))[1];
  if(noteValue == 0) {
    newNoteValue = 11;
    noteOctave = parseInt(noteOctave) - 1;
  } else {
    newNoteValue = noteValue - 1;
  }
  noteName = music.getCanonicalNoteName(newNoteValue);
  return {noteName: noteName, noteOctave: noteOctave};
}

function calculateGrades() {
  let numUnweightedCorrectNotes = 0;
  let numWeightedCorrectChoices = 0;
  let correctNotes = [];
  for(let i = 0; i < sm.score.measures.length; i++) {
    for(let j = 0; j < sm.score.measures[i].notes.length; j++) {
      correctNotes.push(sm.score.measures[i].notes[j]);
    }
  }

  let skippedNotePattern = 0;
  let addedNotePattern = 0;
  let offIntervalPattern = 0;
  for(let i = 0; i < correctNotes.length; i++) {
    if(allNotes[i] == null) {
      break;
    }
    if((allNotes[i].duration == correctNotes[i].duration)
      && (allNotes[i].keys[0] == correctNotes[i].keys[0])) {
      numUnweightedCorrectNotes++;
      numWeightedCorrectChoices++;
      if(skippedNotePattern >= 3) {
        numWeightedCorrectChoices += skippedNotePattern;
        skippedNotePattern = 0;
      }
      if(addedNotePattern >= 3) {
        numWeightedCorrectChoices += addedNotePattern;
        addedNotePattern = 0;
      }
      if(offIntervalPattern >= 3) {
        numWeightedCorrectChoices += offIntervalPattern;
        offIntervalPattern = 0;
      }
    }
    if(allNotes[i-1] != null) {
      if((allNotes[i-1].duration == correctNotes[i].duration)
        && (allNotes[i-1].keys[0] == correctNotes[i].keys[0])) {
            skippedNotePattern++;
      }
      const userInterval = calculateInterval(allNotes[i-1].keys[0], allNotes[i].keys[0]);
      const correctInterval = calculateInterval(correctNotes[i-1].keys[0], correctNotes[i].keys[0]);
      if((allNotes[i].duration == correctNotes[i].duration)
        && (Math.abs(userInterval - correctInterval) >= 1)) {
            offIntervalPattern++;
      }  
    }
    if((allNotes[i+1] != null) 
      && (allNotes[i+1].keys[0] == correctNotes[i].keys[0])) {
          addedNotePattern++;
    }  
  }
  if(allNotes.length > correctNotes.length) {
    const numExtraNotes = allNotes.length - correctNotes.length;
    numUnweightedCorrectNotes = Math.max(0, numUnweightedCorrectNotes - numExtraNotes);
    numWeightedCorrectChoices = Math.max(0, numWeightedCorrectChoices - numExtraNotes);
  }
  numWeightedCorrectChoices = Math.min(numWeightedCorrectChoices, correctNotes.length);
  return {unweighted: `${numUnweightedCorrectNotes}/${correctNotes.length}`,
          weighted: `${numWeightedCorrectChoices}/${correctNotes.length}`};
}

//Adds note if a key is depressed that corresponds to a note name
document.addEventListener("keydown", (event) => {
  console.log("key is " + event.key);
  let key = event.key;
  let acceptableNotes = ["c", "d", "e", "f", "g", "a", "b"];
  if(acceptableNotes.includes(key)) {
    let noteName = key;
    const diatonicNotes = Object.values(scaleMap);
    console.log(diatonicNotes);
    if(!(diatonicNotes.includes(noteName + "n"))) {
      for(let i = 0; i < diatonicNotes.length; i++) {
        const notePattern = new RegExp(`${noteName}.*`);
        console.log(notePattern);
        if(notePattern.test(diatonicNotes[i])) {
          noteName = diatonicNotes[i];
          console.log(noteName);
        }
      }
    }
    let noteValue = document.querySelector("input[name=noteValue]:checked").value;
    const oldNote = findOldNote(selectedNoteIndex);
    if(oldNote == null) {
      addNote(noteName, noteValue);
    } else {
      const previousNote = findOldNote(selectedNoteIndex - 1)
      const previousNoteParts = previousNote.keys[0].split("/");
      let noteOctave = findDefaultOctave(previousNoteParts[0], previousNoteParts[1], noteName);
      replaceNote(selectedNoteIndex, noteName, noteOctave);
    }
  } else if(key == "Backspace") {
    removeNote();
  } else if(key == "ArrowLeft") {
    event.preventDefault();
    if(selectedNoteIndex > -1) {
      selectedNoteIndex--;
      document.getElementById("selectedIndex").textContent = `Selected index is: ${selectedNoteIndex}`;
    }
  } else if(key == "ArrowRight") {
    event.preventDefault();
    if(selectedNoteIndex < allNotes.length) {
      selectedNoteIndex++;
      document.getElementById("selectedIndex").textContent = `Selected index is: ${selectedNoteIndex}`;
    }
  } else if(key == "ArrowUp") {
    event.preventDefault();
    if(event.ctrlKey) {
      moveNoteUpOctave();
    } else {
      const oldNote = findOldNote(selectedNoteIndex);
      if(oldNote != null) {
        const fullOldNoteName = oldNote.keys[0];
        let newNote = moveNoteUpHalfStep(fullOldNoteName);
        console.log(newNote);
        console.log(newNote.noteName + "n");
        if(!(Object.values(scaleMap).includes(newNote.noteName)) && !(Object.values(scaleMap).includes(newNote.noteName + "n"))) {
          newNote = moveNoteUpHalfStep(newNote.noteName + "/" + newNote.noteOctave);
          console.log(newNote);
        }
        replaceNote(selectedNoteIndex, newNote.noteName, newNote.noteOctave);
      }
    }
  } else if(key == "ArrowDown") {
    event.preventDefault();
    if(event.ctrlKey) {
      moveNoteDownOctave();
    } else {
      const oldNote = findOldNote(selectedNoteIndex);
      if(oldNote != null) {
        const fullOldNoteName = oldNote.keys[0];
        let newNote = moveNoteDownHalfStep(fullOldNoteName);
        if(!(Object.values(scaleMap).includes(newNote.noteName)) && !(Object.values(scaleMap).includes(newNote.noteName + "n"))) {
          newNote = moveNoteDownHalfStep(newNote.noteName + "/" + newNote.noteOctave);
          console.log(newNote);
        }
        replaceNote(selectedNoteIndex, newNote.noteName, newNote.noteOctave);
      }
    }
  } else if (key == "1") {
    document.getElementById("sixteenthValue").checked = true;
  } else if (key == "2") {
    document.getElementById("eighthValue").checked = true;
  } else if (key == "3") {
    document.getElementById("quarterValue").checked = true;
  } else if (key == "4") {
    document.getElementById("halfValue").checked = true;
  } else if (key == "5") {
    document.getElementById("wholeValue").checked = true;
  }
});

//Adds note based on the enter-notes-panel info
document.getElementById("addNoteBtn").addEventListener("click",  () => {
  let noteName = document.getElementById("noteName").value;
  let noteValue = document.querySelector("input[name=noteValue]:checked").value;
  addNote(noteName, noteValue);
});

document.getElementById("removeNoteBtn").addEventListener("click",  () => {
  removeNote();
});

document.getElementById("octUpBtn").addEventListener("click", () => {
  moveNoteUpOctave();
});

document.getElementById("octDownBtn").addEventListener("click", () => {
  moveNoteDownOctave();
});

document.getElementById("submitBtn").addEventListener("click", () => {
  document.addEventListener("keydown", (event) => { event.preventDefault() });
  document.getElementById("enter-notes-panel").style.display = "none";
  document.getElementById("buttons").style.display = "none";
  document.getElementById("notation-container").style.visibility = "visible";
  document.getElementById("notation-container").style.display = "flex";
  const grades = calculateGrades();
  document.getElementById("unweightedGrade").textContent = `Your unweighted score: ${grades.unweighted}`;
  document.getElementById("weightedGrade").textContent = `Your weighted score: ${grades.weighted}`;
});

document.getElementById("indexUpdateTracker").addEventListener("click", () => { 
  selectedNoteIndex = document.getElementById("stackIndexValue").value;
  document.getElementById("selectedIndex").textContent = `Selected index is: ${selectedNoteIndex}`;
});

// For quick console poking
window.app = { sm, audioPlayer, T };
