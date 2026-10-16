// public/modules/ScoreManager/ScoreAnimator.js:

import { T } from "../Tonal/Tonal.js";
import { AudioPlayer } from "../AudioPlayer.js";


export const ScoreAnimator = {
  animationFrameId: null,
  container: null,
  restructuredNotes: [1,2,3],
  accumulatedPlayBackTime: 0,
  pausedTime: 0,
  pitchBuffer: [],
  pitchBufferSize: 10,
  pitchClusterToleranceHz: 5,
  placedEllipses: [],
  minClarityPercent: 80,
  lastPitch: null,
  currentNoteheadColor: "DarkOrchid",
  //metronome click:
  metronomeEnabled: true,          // wire to a toggle later
  beatSec: 0.5,                    //default; overwritten on start
  nextClickTime: 0,                //absolute seconds in playback timeline
  beatsPerMeasure: 4,              //default: set from time signature later
  firstClickFired: false,
  metronomePhaseOffsetSec: 0,
  COUNT_IN: {
    enabled: true,
    measures: 1,
    blink: {low: 0.25, high: 1.0, rampMs: 100} // playhead pulse per click
  },
  didCountIn: false,
  preRollActive: false,
  scoreStartEps: 1e-4, // treat <=0.0001s as "at start"
  isAtScoreStart() {
    return (this.accumulatedPlayBackTime || 0) <= this.scoreStartEps;
  },
  playReference: {
    playTonicTriadEnabled: false,
    playCurrentNoteEnabled: true
  },
  pendingStartAt: null,
  scheduledCountIn: false,


  animate(audioPlayer, animateStartTime, allNotes) {
    const playhead = document.getElementById("playhead");

    //pitch detector notehead:
    /*
    const notehead = document.getElementById("pitch-notehead-group");
    if (!notehead) {
      console.error("Pitch detector notehead not found in DOM");
    }
    */
  
    if (!playhead) {
      console.error("Playhead element not found in the DOM.");
      return;
    }
  
    // Calculate total duration of the score
    const totalDuration = allNotes.reduce((sum, stack) => sum + stack.noteDuration, 0);
  
    let currentI = -1; // Current stack index
    let currentX = allNotes[0].playHeadX; // x position that the playhead will be translated to in a frame
    let currentY = allNotes[0].playHeadY; // y position that the playhead will be translated to in a frame
    
    /*                      __   __   __    
    |\/|  /\  | |\ |   |   /  \ /  \ |__) . 
    |  | /--\ | | \|   |__ \__/ \__/ |    . 
                                                                          
    */
    // main frame loop
    const updateFrame = () => {
      if (!audioPlayer.isPlaying) return;
  
      // Calculate elapsed playback time
           // Calculate elapsed playback time using a robust hybrid clock.
      // Prefer the AudioContext when 'running'; fall back to performance.now()
      // if the context is suspended / throttled (common when metronome & audio are off).
      const ctxState = audioPlayer.audioContext.state; // 'running' | 'suspended' | 'closed'
      const nowAudio = audioPlayer.audioContext.currentTime;
      const nowPerf  = performance.now() / 1000;
 
      // Baselines captured in resumeAnimation()
      const base = this.animateOrigin || this._animateOrigin || {
        audioStartSec: animateStartTime,
        perfStartSec: performance.now() / 1000
      };

      let elapsedSec;
      if (ctxState === 'running') {
        elapsedSec = nowAudio - base.audioStartSec;
      } else {
        elapsedSec = nowPerf - base.perfStartSec;
      }

      // inside updateFrame(), right after you compute elapsedSec:
      let t = (this.pausedTime || 0) + elapsedSec;
      // While we're waiting for startAt, elapsedSec is negative; clamp so we don't advance/play early.
      if (t < 0) t = 0;
      this.accumulatedPlayBackTime = t;

      // metronome clicks:
      // schedule clicks while we've crossed boundaries
      while (this.metronomeEnabled &&
            this.beatSec > 0 &&
            this.accumulatedPlayBackTime >= this.nextClickTime) {

        // Schedule the metronome click exactly on the shared audio timeline
        const whenOnAudio = base.audioStartSec + (this.nextClickTime - (this.pausedTime || 0));
        audioPlayer.playClick(whenOnAudio, 1.6);
        this.nextClickTime += this.beatSec;
      }


  
      // End animation when the score's duration is reached
      if (this.accumulatedPlayBackTime >= totalDuration) {
        const lastStack = allNotes[allNotes.length - 1];
        playhead.setAttribute(
          "transform",
          `translate(${lastStack.playHeadX + 100}, ${lastStack.playHeadY})`
        );
        lastStack.alignedNotes.forEach(lastNote => {
          const lastNoteID = "vf-" + lastNote.getAttribute("id");
          const lastNoteElement = document.getElementById(lastNoteID);
          if (lastNoteElement) lastNoteElement.setAttribute("fill", "black");
        });
        // instead of togglePlayPause(...)
        this.finishPlayback(audioPlayer);
        return;
      }

  
      // Track cumulative duration to find the current stack
      let accumulatedDurations = 0;
      
      //iterate through the notes to determine where we are
      for (let i = 0; i < allNotes.length; i++) {
        accumulatedDurations += allNotes[i].noteDuration;
  
        // Check if current time falls within the current stack's duration
        if (this.accumulatedPlayBackTime < accumulatedDurations) {
          // Calculate progress within the current stack (0.0 to 1.0)
          const progressInStack =
            (this.accumulatedPlayBackTime - (accumulatedDurations - allNotes[i].noteDuration)) /
            allNotes[i].noteDuration;
  
          // calculate the note stack's starting position
          const startX = allNotes[i].playHeadX;
          //find next note
          const nextNote = allNotes[i + 1];
          
          //determine if the next note is at start of the new system
          const nextY = nextNote ? nextNote.playHeadY : currentY;
          const isNextInNewSystem = nextNote && nextY > currentY;

          //calculate the note stack's end x position
          let endX = isNextInNewSystem
            //if at the end of system, set to starting x pos + 150
            ? allNotes[i].playHeadX + 150 
            //if there are more notes, end x is next notes's x position, if at end of score, end x is start x
            : (allNotes[i + 1] ? allNotes[i + 1].playHeadX : startX) || startX;
          
          // if current note is the last note of the score, simply increase startX by 100
          if (i == allNotes.length - 1) endX = allNotes[i].playHeadX + 100;

          //to determine current x position of the playhead, offset it by 5, for visual purposes
          const lagX = 5;

          //set current x position of the playhead
          currentX = startX + (endX - startX) * progressInStack - lagX;
          //set the current y position of the playhead
          currentY = allNotes[i].playHeadY;
  
          const reachedStart =
            (ctxState === 'running'
              ? nowAudio
              : nowPerf) >= (base.audioStartSec - 1e-3);

          // Gate the very first note trigger until we've actually reached startAt.
          if (reachedStart && currentI < i) {
            allNotes[i].alignedNotes.forEach((note) => {
              if (note.noteNames) {
                note.noteNames.forEach((noteName, noteIndex) => {
                  if (!note.ties?.[noteIndex]?.includes("stop")) {
                    if (note.noteTimings[noteIndex] !== undefined) {
                      audioPlayer.playNote(
                        noteName,
                        audioPlayer.audioContext.currentTime,
                        note.noteTimings[noteIndex]
                      );
                    }
                  }
                });
              }
            });

            // Paint once per index change
            this.repaintNoteheads(i);
            currentI = i;
          }

  
          break;
        }
      }
      //console.log(allNotes[currentI].alignedNotes[0].noteNames[0]);
      // Update playhead position
      playhead.setAttribute("transform", `translate(${currentX}, ${currentY})`);

      // update pitch detector position:
      /*
      const y = this.noteheadY(currentX, currentY, currentI, allNotes, notehead);
      const x = y === currentY - 5 ? currentX + 5 : currentX;

      notehead.setAttribute("transform", `translate(${x}, ${y})`);
      */

      // Request the next animation frame
      this.animationFrameId = requestAnimationFrame(updateFrame);
    };
  
    // Start the animation
    this.animationFrameId = requestAnimationFrame(updateFrame);
  },//--end method

  initMetronome(tempoBPM, beatType /* denominator */, beatsNumerator /* numerator */, phaseOffsetSec = 0) {
    // Save phase offset so realignMetronome() can use it
    this.metronomePhaseOffsetSec = phaseOffsetSec;

    // Base: seconds per denominator note (quarter=beatType=4, eighth=8, etc.)
    const secPerDenom = (60 / tempoBPM) * (4 / beatType);

    // Grouping: compound meters (…/8 or …/16 with numerator multiple of 3)
    let groupSize = 1;
    if ((beatType === 8 || beatType === 16) && (beatsNumerator % 3 === 0)) {
      groupSize = 3;
    }

    // Length of one metronome "beat" in seconds
    this.beatSec = secPerDenom * groupSize;

    // How many clicks per measure (e.g., 6/8 → 2, 9/8 → 3, 12/8 → 4, 3/8 → 1)
    this.beatsPerMeasure = Math.max(1, Math.round(beatsNumerator / groupSize));

    // Align next click using current playback time and phase offset
    const t = this.accumulatedPlayBackTime || 0;
    const EPS = 1e-3;
    const r = ((t - this.metronomePhaseOffsetSec) % this.beatSec + this.beatSec) % this.beatSec;
    this.nextClickTime = (r < EPS) ? t + this.beatSec : t + (this.beatSec - r);
  },





  //pitch detector:
  /*
  noteheadY(currentX, currentY, currentI, allNotes, notehead) {
    const { pitch: rawPitch, clarity } = PitchTrackerInstance.getPitch();

    // Flush pitchBuffer if clarity is bad or out of range
    const isInvalid =
      clarity * 100 < this.minClarityPercent ||
      rawPitch < 60 || rawPitch > 1000;

    if (isInvalid) {
      this.pitchBuffer = [];
      this.lastPitch = null;
      notehead.setAttribute("fill-opacity", "0");
      return currentY - 5;
    }

    console.log(allNotes[currentI].alignedNotes[0].noteNames[0], rawPitch);

    const pitch = this.getClusteredPitch(rawPitch);
    const clef = allNotes[currentI].alignedNotes[0].clef;
    const pitchYOffset = clef === 'treble'
      ? PitchTrackerInstance.getYFromPitchFrequency(pitch) + 90
      : PitchTrackerInstance.getYFromPitchFrequency(pitch) + 30;

    notehead.setAttribute("fill-opacity", "1");
    this.placeEllipse(currentX, currentY + pitchYOffset);
    return currentY + pitchYOffset;
  },
  */

  pauseAnimation(audioPlayer) {
    // 1) Snapshot where we are in the score timeline.
    this.pausedTime = this.accumulatedPlayBackTime;

    // 2) Flip state and stop the visual loop.
    audioPlayer.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // 3) Pause accompaniment precisely.
    //    Prefer the decoded buffer path; otherwise, fall back to <audio>.
    if (audioPlayer?.accompBuffer && typeof audioPlayer.pauseAccompaniment === "function") {
      audioPlayer.pauseAccompaniment();
    } else if (audioPlayer?.accomp) {
      try {
        audioPlayer.accomp.pause();
        // Keep resume position if your AudioPlayer exposes accompOffset:
        if (typeof audioPlayer.accompOffset === "number") {
          audioPlayer.accompOffset = audioPlayer.accomp.currentTime || 0;
        }
      } catch {}
    }

    // 4) TODO: to schedule metronome clicks ahead on the audio clock,
    //    must make sure that click scheduler respects isPlaying/pausedTime so nothing new is queued.
    //    If there is a gate/flag for that scheduler, flip it here.

    // 5) Re-enable navigation controls while paused.
    const ids = ["prevBtn", "nextBtn", "firstBtn", "lastBtn"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    // 6) Keep animateOrigin as-is so resumeAnimation can continue from pausedTime.
    //    (If you prefer to mark it, you could set a flag like this.wasPaused = true;)
  },

  resumeAnimation(audioPlayer) {
    // 1) Ensure the audio clock is running
    if (audioPlayer?.audioContext?.state === "suspended") {
      try { audioPlayer.audioContext.resume(); } catch {}
    }
    audioPlayer.isPlaying = true;

    // 2) Disable nav controls during playback
    const disable = id => { const el = document.getElementById(id); if (el) el.disabled = true; };
    disable("prevBtn");
    disable("nextBtn");
    disable("firstBtn");
    disable("lastBtn");

    // 3) Compute an exact start time on the audio timeline
    const now = audioPlayer.audioContext.currentTime;
    const lookaheadSec = 0.06;

    const fromStart = (typeof this.isAtScoreStart === "function")
      ? this.isAtScoreStart()
      : ((this.accumulatedPlayBackTime || 0) <= 1e-6);

    // Use the SAME startAt that runCountIn() scheduled, if present.
    // Otherwise, just give the engine a tiny lookahead.
    let startAt = now + lookaheadSec;
    if (fromStart && Number.isFinite(this.pendingStartAt)) {
      startAt = this.pendingStartAt;
      this.pendingStartAt = null; // consume
    }
    if (!Number.isFinite(startAt)) {
      startAt = now + lookaheadSec; // ultimate guard
    }

    // 4) Schedule accompaniment precisely on the same clock
    if (audioPlayer?.accompBuffer) {
      if (fromStart) {
        audioPlayer.startAccompanimentAt(startAt, { reset: true });
      } else {
        audioPlayer.resumeAccompanimentAt(startAt);
      }
    } else if (audioPlayer?.accomp) {
      // Fallback path for <audio> element (less precise)
      try { if (fromStart) audioPlayer.accomp.currentTime = 0; } catch {}
      const delayMs = Math.max(0, (startAt - now) * 1000);
      setTimeout(() => audioPlayer.playAccompaniment?.(), delayMs);
    }

    // 5) Metronome: optional edge tick and phase alignment
    if (this.metronomeEnabled) {
      const t = this.accumulatedPlayBackTime || 0;
      const EPS = 1e-3;
      if (this.beatSec > 0) {
        const r = ((t - this.metronomePhaseOffsetSec) % this.beatSec + this.beatSec) % this.beatSec;

        // If we did NOT schedule a count-in and we're on (or extremely near) a beat, tick at startAt
        if (!this.scheduledCountIn && (r < EPS || this.beatSec - r < EPS)) {
          audioPlayer.playClick(startAt, 2.0);
          this.firstClickFired = true;
        }

        // Align the repeating clicks to our timeline
        if (typeof this.realignMetronome === "function") {
          this.realignMetronome(t);
        }
      }
    }

    // 6) Establish animation baselines tied to the SAME audio start time
    const perfNowSec = performance.now() / 1000;
    const perfLookahead = startAt - now;
    this.animateOrigin = {
      audioStartSec: startAt,
      perfStartSec:  perfNowSec + perfLookahead
    };

    // Once we’ve started, clear the flag so later resumes may edge-tick again
    this.scheduledCountIn = false;

    // 7) Run the visual animation loop
    this.animate(audioPlayer, this.animateOrigin.audioStartSec, this.restructuredNotes);
  },


  async togglePlayPause(audioPlayer) {
    if (!audioPlayer.isPlaying) {
      if (this.COUNT_IN.enabled && !this.preRollActive && this.isAtScoreStart()) {
        await this.runCountIn();
      }
      this.resumeAnimation(audioPlayer);
    } else {
      this.pauseAnimation(audioPlayer);
    }

    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.innerHTML = audioPlayer.isPlaying 
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <rect x="5" y="3" width="5" height="18" fill="white"></rect>
          <rect x="14" y="3" width="5" height="18" fill="white"></rect>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <polygon points="5,3 19,12 5,21" fill="white"></polygon>
        </svg>`;
  },


  /*
  __  __       __  __  __   __    __        __   __       __  __   
  (_  /  \ |   |_  |_  / _  |_    |__) /  \ |__) |__) |   |_  (_  . 
  __) \__/ |__ |   |__ \__) |__   |__) \__/ |__) |__) |__ |__ __) . 
                                                                    
  */
  createSolfegeBubbles(VFnote) {
    const numVoices = VFnote.stave.numVoices;
    const stave = VFnote.getStave();
    const multipleVoices = numVoices > 1? true : false;
    const oddVoiceIndex = VFnote.voiceIndex % 2 !== 0 ? true : false;

    const lineIndex = multipleVoices && oddVoiceIndex ? 5 : 0;
    const staveY = stave.getYForNote(lineIndex);
    const staveX = VFnote.notePositionX;
    
    //create a copy of note keys and reverse if this is a bottom voice on a multi-voice staff
    // (bc then the note will be vertically flipped )
    const sortedKeys = multipleVoices && oddVoiceIndex 
    ? [...VFnote.keys] 
    : [...VFnote.keys].reverse();

    const bubbles = [];

    if (VFnote.noteNames) {//if note is not a rest
      sortedKeys.forEach((key, keyIndex) => {
        const groupSVG = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const bubbleSVG =  document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const textSVG = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  
        const bubbleX = staveX;
        
        // if note is a chord, the noteheads will be stacked as distanced by this value:
        const stackedY = multipleVoices && oddVoiceIndex ? 15 : -15;
        
        // depending on whether the note is in a high voice on a multi-voice staff, it will be raised/lowered by this value:
        const outerY = multipleVoices && oddVoiceIndex ? 20 : -10;
  
        // calculate y position of bubble:
        const bubbleY = staveY - outerY - (keyIndex * stackedY);
  
        bubbleSVG.setAttributeNS(null, 'cx', bubbleX);
        bubbleSVG.setAttributeNS(null, 'cy', bubbleY);
        bubbleSVG.setAttributeNS(null, 'r', 10);
        bubbleSVG.setAttributeNS(null, 'style', 'fill:rgb(246, 228, 247); fill-opacity: 80%; stroke: gray; stroke-width: 1px;' );
  
        textSVG.setAttributeNS(null, 'x', bubbleX);
        textSVG.setAttributeNS(null, 'y', bubbleY + 2); // Adjust to center text vertically
        textSVG.setAttributeNS(null, 'text-anchor', 'middle'); // Center text horizontally
        textSVG.setAttributeNS(null, 'dominant-baseline', 'middle'); // Center text vertically
        textSVG.setAttributeNS(null, 'font-size', '10px');
        textSVG.setAttributeNS(null, 'fill', 'black');
        textSVG.textContent = T.getSolfegeForVexKey(key, this.scale);//get the solfege syllable from tonal
        
        // Append bubble and text to the group
        groupSVG.appendChild(bubbleSVG);
        groupSVG.appendChild(textSVG);

        // Append the group to the main SVG container
        this.container.querySelector("svg").appendChild(groupSVG);

        bubbles.push(groupSVG)
      });//end for each key
    }//--end if rest
    
    let adjustedY = 0;

    //locate position of the pitch in T.positions
    sortedKeys.forEach((key, keyIndex) => {
      const indexOfPosition = T.getIndexOfPositionFromVexKey (key, this.scale);

      //adjust if note should be further adjusted based on whether it's on a leger line:
      const offsetY = (() => {
        if (!multipleVoices || !oddVoiceIndex) { // If NOT multiple voices OR not the high voice
          const threshold = VFnote.clef === 'treble' ? 25 : 13;
          return indexOfPosition < threshold ? (threshold - indexOfPosition) * 5 : 0;
        }
      
        // If multiple voices AND high voice
        const threshold = VFnote.clef === 'treble' ? 34 : 22;
        const offset = VFnote.clef === 'treble' ? 34 : 2;
        return indexOfPosition > threshold ? (indexOfPosition - offset) * -5 : 0;
      })();

      if (offsetY != 0) adjustedY = offsetY;
    });

    if (adjustedY  !=0) {
      bubbles.forEach((bubble) => {
        bubble.setAttribute(
          "transform",
          `translate(0, ${adjustedY})`
        );
      });
    }
    
    
  },//--end method

  getPickupBeats() {
    const first = this.score?.measures?.[0];
    if (!first || !first.isPickup) return 0;

    // map of VexFlow duration -> quarter-note multiples (matches ScoreDurations)
    const rel = {
      "w": 4, "h": 2, "hd": 3, "q": 1, "qd": 1.5,
      "8": 0.5, "8d": 0.75, "16": 0.25, "16d": 0.375,
      "32": 0.125, "32d": 0.1875, "64": 0.0625
    };

    // accumulate per voice to cover multi-voice pickup measures
    const perVoiceBeats = {};
    const beatType = this.timeSignature.type; // e.g. 4 in 4/4

    for (const n of first.notes) {
      const base = rel[(n.duration || "").replace("r", "")] ?? 0; // strip 'r' rests
      // apply tuplets if any (same way as audio timing)
      const scaled = n.tupletRatio ? base * (n.tupletRatio.notes_occupied / n.tupletRatio.num_notes) : base;
      // convert "quarter multiples" -> "beats (beatType denominator)"
      const beats = scaled * (4 / beatType);
      perVoiceBeats[n.voice] = (perVoiceBeats[n.voice] || 0) + beats;
    }

    const voices = Object.values(perVoiceBeats);
    return voices.length ? Math.max(...voices) : 0;
  },

  createPlayhead() {
    // Add playhead
    this.playhead = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    this.playhead.setAttribute("points", "0,0 10,0 5,10"); // Triangle shape
    this.playhead.setAttribute("transform", "translate(0,5)");
    this.playhead.setAttribute("fill", "red");
    this.playhead.setAttribute("id", "playhead");

    // Safeguard: Ensure the container exists
    if (!this.container) {
      console.error("SVG container not found.");
      return;
    }

    this.container.querySelector("svg").appendChild(this.playhead);

    //create pitch detector notehead:
    /*
    document.getElementById("pitch-notehead-group")?.remove();
  
    const svgNS = "http://www.w3.org/2000/svg";
  
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("id", "pitch-notehead-group");
    g.setAttribute("transform", "translate(0, 0)");
    
    const ellipse = document.createElementNS(svgNS, "ellipse");
    ellipse.setAttribute("cx", "0");
    ellipse.setAttribute("cy", "0");
    ellipse.setAttribute("rx", "5"); 
    ellipse.setAttribute("ry", "4"); 
    ellipse.setAttribute("transform", "rotate(-20)");
    ellipse.setAttribute("fill", "olive");
    g.appendChild(ellipse);
    this.container.querySelector("svg").appendChild(g);
    */
  },//--end method


/* https://patorjk.com/software/taag/#p=display&h=0&f=Straight&t=sendToPlay%3A
              ___      __             
 _  _  _   _|  |   _  |__) |  _     . 
_) (- | ) (_|  |  (_) |    | (_| \/ . 
                                 /    
*/
  sendToPlay(audioPlayer, notes) {//REMEMBER: THE 'THIS' HERE IN SCOREMANAGER--NOT ANIMATOR!
    this.animationFrameId = null;
    ScoreAnimator.restructuredNotes = notes;
    ScoreAnimator.pausedTime = 0;
    ScoreAnimator.accumulatedPlayBackTime = 0;
    ScoreAnimator.didCountIn = false; 
    ScoreAnimator._animateOrigin = null;

    // compute pickup -> phase (time from t=0 to first downbeat)
    const pickupBeats = this.getPickupBeats();
    const beatsPerMeasure = this.timeSignature.beats ?? 4;
    const beatType = this.timeSignature.type ?? 4;
    const tempo = this.tempo ?? 120;

    // only apply if there actually is a pickup
    const beatSec = (60 / tempo) * (4 / beatType);
    const phaseBeats = pickupBeats > 0
      ? (beatsPerMeasure - pickupBeats) % beatsPerMeasure
      : 0;
    const phaseOffsetSec = phaseBeats * beatSec;

    ScoreAnimator.initMetronome(tempo, beatType, beatsPerMeasure, phaseOffsetSec);
    ScoreAnimator.firstClickFired = false;

    ["firstBtn", "playPauseBtn", "lastBtn", "prevBtn", "nextBtn", "staffBtn", "metronomeBtn", "playReferenceBtn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = false;
    });
  },

  //for pitchdetect:
  placeEllipse(xPos, yPos) {
    const svgNS = "http://www.w3.org/2000/svg";
  
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", `translate(${xPos}, ${yPos})`);
  
    const ellipse = document.createElementNS(svgNS, "ellipse");
    ellipse.setAttribute("cx", "0");
    ellipse.setAttribute("cy", "0");
    ellipse.setAttribute("rx", "5"); 
    ellipse.setAttribute("ry", "4"); 
    ellipse.setAttribute("transform", "rotate(-20)");
    ellipse.setAttribute("fill", "olive");
    g.appendChild(ellipse);
    document.getElementById("notation").querySelector("svg").appendChild(g);

    this.placedEllipses.push(g);
  },

  //for pitchdetect:
  getClusteredPitch(rawPitch) {
    if (!rawPitch || isNaN(rawPitch)) return null;

    // 1. Suppress wide jumps (ignore input if >1.5× from lastPitch)
    if (this.lastPitch && rawPitch > this.lastPitch * 1.5) {
      return this.lastPitch; // don't update buffer, keep last good pitch
    }

    // 2. Add pitch to rolling buffer
    this.pitchBuffer.push(rawPitch);
    if (this.pitchBuffer.length > this.pitchBufferSize) {
      this.pitchBuffer.shift(); // remove oldest
    }

    // 3. Cluster similar pitches
    const clusters = [];
    for (const pitch of this.pitchBuffer) {
      let found = false;
      for (const cluster of clusters) {
        if (Math.abs(pitch - cluster[0]) <= this.pitchClusterToleranceHz) {
          cluster.push(pitch);
          found = true;
          break;
        }
      }
      if (!found) {
        clusters.push([pitch]);
      }
    }

    // 4. Pick largest cluster
    const largestCluster = clusters.reduce((a, b) => (a.length > b.length ? a : b), []);
    if (largestCluster.length === 0) return null;

    // 5. Use median of cluster
    const sorted = largestCluster.slice().sort((a, b) => a - b); 
    let pitch = sorted[Math.floor(sorted.length / 2)];

    // 6. Harmonic folding: suppress first/second partials
    if (this.lastPitch && this.lastPitch > 0 && pitch > this.lastPitch * 1.5) {
      const centsDiff = (a, b) => 1200 * Math.log2(a / b);
      const diff1 = centsDiff(pitch, this.lastPitch * 2);
      const diff2 = centsDiff(pitch, this.lastPitch * 3);
      if (Math.abs(diff1) <= 50) pitch /= 2;
      else if (Math.abs(diff2) <= 50) pitch /= 3;
    }

    this.lastPitch = pitch;
    return pitch;
  },

  repaintNoteheads(targetIndex) {
    this.restructuredNotes.forEach((stack, index) => {
      const fillColor = (index === targetIndex) ? this.currentNoteheadColor : "black";
      stack.alignedNotes.forEach(note => {
        const noteID = "vf-" + note.getAttribute("id");
        const noteElement = document.getElementById(noteID);
        if (noteElement) {
          noteElement.setAttribute("fill", fillColor);
        }
      });
    });
  },

  realignMetronome(t) {
    if (!this.metronomeEnabled || this.beatSec <= 0) return;
    const EPS = 1e-3;
    const r = ((t - this.metronomePhaseOffsetSec) % this.beatSec + this.beatSec) % this.beatSec;
    this.nextClickTime = (r < EPS) ? t + this.beatSec : t + (this.beatSec - r);
  },

adjustPausedTime(targetIndex, audioPlayer) {
  const t = (this.restructuredNotes || [])
    .slice(0, targetIndex)
    .reduce((sum, s) => sum + (s.noteDuration || 0), 0);

  this.accumulatedPlayBackTime = t;
  this.pausedTime = t;

  // keep metronome + accompaniment in lockstep
  if (typeof this.realignMetronome === "function") this.realignMetronome(t);
  this.setAccompanimentOffset(audioPlayer, t);
},

movePlayeheadToPausedTime(seconds, audioPlayer) {
  const t = Math.max(0, seconds || 0);
  this.accumulatedPlayBackTime = t;
  this.pausedTime = t;

  // keep metronome + accompaniment in lockstep
  if (typeof this.realignMetronome === "function") this.realignMetronome(t);
  this.setAccompanimentOffset(audioPlayer, t);

  // (existing playhead math preserved)
  let accumulated = 0, targetIndex = 0;
  for (let i = 0; i < this.restructuredNotes.length; i++) {
    accumulated += this.restructuredNotes[i].noteDuration;
    if (t < accumulated) { targetIndex = i; break; }
  }

  const targetStack = this.restructuredNotes[targetIndex];
  const prevAccumulated = accumulated - targetStack.noteDuration;
  const progressInStack = (t - prevAccumulated) / targetStack.noteDuration;

  let startX = targetStack.playHeadX;
  let endX;
  if (targetIndex === this.restructuredNotes.length - 1) {
    endX = startX + 100;
  } else {
    const nextStack = this.restructuredNotes[targetIndex + 1];
    const isNewSystem = nextStack.playHeadY > targetStack.playHeadY;
    endX = isNewSystem ? startX + 150 : nextStack.playHeadX;
  }

  const currentX = startX + (endX - startX) * progressInStack - 5;
  const currentY = targetStack.playHeadY;

  const playhead = document.getElementById("playhead");
  if (playhead) playhead.setAttribute("transform", `translate(${currentX}, ${currentY})`);

  return targetIndex;
},

  pulsePlayhead() {
    const el = document.getElementById('playhead');
    if (!el) return;
    const orig = el.style.opacity || 1;
    el.style.transition = `opacity ${this.COUNT_IN.blink.rampMs}ms linear`;
    el.style.opacity = this.COUNT_IN.blink.high;
    setTimeout(() => {
      el.style.opacity = this.COUNT_IN.blink.low;
      setTimeout(() => { el.style.opacity = orig; }, this.COUNT_IN.blink.rampMs);
    }, this.COUNT_IN.blink.rampMs);
  },

  runCountIn() {
    if (!this.COUNT_IN.enabled) return null;

    const beats = (this.beatsPerMeasure || 4) * this.COUNT_IN.measures;
    const spb   = this.beatSec > 0 ? this.beatSec : 0.5;

    const ap  = window.audioPlayer;
    if (!ap) return null;

    const ctx = ap.audioContext || ap.audioCtx || ap.context || null;
    const now = ctx ? ctx.currentTime : performance.now() / 1000;

    const lookahead = 0.06;
    const anchor    = now + lookahead;        // first count-in click
    const playStart = anchor + beats * spb;   // EXACT score start (audio clock)

    this.preRollActive    = true;
    this.didCountIn       = true;
    this.scheduledCountIn = true;
    this.pendingStartAt   = playStart;

    // schedule clicks on the same audio clock
    for (let i = 0; i < beats; i++) {
      const when = anchor + i * spb;
      ap.playClick(when, i === 0 ? 2.0 : 1.6);
      this.pulsePlayhead(); // purely visual, okay if UI-clock-y
    }

    // optional: clear pre-roll flag near the start moment
    setTimeout(() => { this.preRollActive = false; }, Math.max(0, (playStart - now) * 1000));

    return playStart;
  },

  stopPlayback(audioPlayer, { resetToStart = true, reason = "user" } = {}) {
    // flip state + stop loop
    audioPlayer.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // accompaniment
    if (audioPlayer?.accompBuffer && typeof audioPlayer.stopAccompaniment === "function") {
      audioPlayer.stopAccompaniment();
    } else if (audioPlayer?.accomp) {
      try { audioPlayer.accomp.pause(); audioPlayer.accomp.currentTime = 0; } catch {}
    }

    // count-in / flags
    this.preRollActive = false;
    this.didCountIn = false;

    // rewind and reset clocks
    if (resetToStart) {
      this.accumulatedPlayBackTime = 0;
      this.pausedTime = 0;

      // reset playhead to first stack
      const stacks = this.restructuredNotes || [];
      if (stacks.length) {
        const first = stacks[0];
        const playhead = document.getElementById("playhead");
        if (playhead) playhead.setAttribute("transform", `translate(${first.playHeadX}, ${first.playHeadY})`);
      }

      // repaint all black
      this.repaintNoteheads(-1);

      // metronome phase back to start
      this.realignMetronome(0);
    }

    // controls back on
    ["prevBtn","nextBtn","firstBtn","lastBtn"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });

    // play/pause icon back to "Play"
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <polygon points="5,3 19,12 5,21" fill="white"></polygon>
        </svg>`;
    }

    // let the app know
    window.dispatchEvent(new CustomEvent("score:stopped", { detail: { reason } }));
  },

  finishPlayback(audioPlayer) {
    // same as stop, but reason is "finished"
    this.stopPlayback(audioPlayer, { resetToStart: true, reason: "finished" });
    window.dispatchEvent(new CustomEvent("score:finished"));
  },

  // --- helper: clamp & set accompaniment offset in seconds ---
  setAccompanimentOffset(audioPlayer, seconds) {
    if (!audioPlayer || !audioPlayer.accompBuffer) return;
    const dur = audioPlayer.accompBuffer.duration || 0;
    audioPlayer.accompOffset = Math.max(0, Math.min(seconds || 0, dur));
  },

  // --- helper: seek by stack index; updates time, playhead, bubbles, metronome, accomp offset ---
  seekToIndex(targetIndex, audioPlayer, { movePlayhead = true, repaint = true } = {}) {
    const stacks = this.restructuredNotes || [];
    if (!stacks.length) return 0;

    // clamp index
    const idx = Math.max(0, Math.min(targetIndex | 0, stacks.length - 1));

    // sum durations up to idx
    let t = 0;
    for (let i = 0; i < idx; i++) t += stacks[i].noteDuration || 0;

    this.accumulatedPlayBackTime = t;
    this.pausedTime = t;

    // keep metronome phase correct at the new time
    if (typeof this.realignMetronome === "function") this.realignMetronome(t);

    // set accompaniment offset so resume() starts from the same place
    this.setAccompanimentOffset(audioPlayer, t);

    if (movePlayhead) {
      // position the playhead at the *start* of idx
      const stack = stacks[idx];
      const playhead = document.getElementById("playhead");
      if (playhead && stack) {
        playhead.setAttribute("transform", `translate(${stack.playHeadX}, ${stack.playHeadY})`);
      }
    }

    if (repaint) this.repaintNoteheads(idx);
    return idx;
  },

};