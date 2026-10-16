// // public/modules/ScoreManager/ScoreManager.js

import { ScoreAnimator } from './ScoreAnimator.js';
import { ScoreBarlines } from './ScoreBarlines.js';
import { ScoreDurations } from './ScoreDurations.js';
import { ScoreClefs } from './ScoreClefs.js';
import { ScoreStems } from './ScoreStems.js';
import { ScoreAccidentals } from './ScoreAccidentals.js';
import { ScoreTranspose } from './ScoreTranspose.js';
import { ScoreUtilities } from './ScoreUtilities.js';
import { ScoreXMLParser } from './ScoreXMLParser.js';
import { ScoreStaff } from './ScoreStaff.js';
import { T } from "../Tonal/Tonal.js";

class ScoreManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.globalScaleFactor =
      (typeof window !== 'undefined' && window.solfegeSettings?.zoom)
        ? window.solfegeSettings.zoom
        : 1.0; // default 100%


    const VF = Vex.Flow;

    this.VF = VF;
    this.renderer = new VF.Renderer(this.container, VF.Renderer.Backends.SVG);

    this.VFNoteStacks = [];
    this.tempo = 120;

    this.containerWidth = this.container.clientWidth || window.innerWidth;
    this.systemWidth = this.containerWidth;

    // Geometry
    this.yHeight = 10;                // distance between staff lines
    this.staffHeight = this.yHeight * 22;
    this.startX = 10;
    this.startY = 12;
    this.staveWidthPadding = 40;

    // Musical state
    this.timeSignature = { beats: 4, type: 4 };
    this.currentClefs = ["treble"];
    this.currentNumVoices = 1;
    this.tonic = "C";
    this.scale = null;
    this.mode = "major";
    this.numFifths = 0;
    this.base = "labased";
    this.currentXML = null;
    this.score = { measures: [], maxStaves: 0 };
    this.solfegeStaff = false;

    // Layout tunables (all used)
    this.BASE_ELEMENT_PX   ??= 40;
    this.MIN_MEASURE_PX    ??= 140;
    this.CLEF_PX           ??= 28;
    this.KEYSIG_PX         ??= 18;   // per accidental glyph
    this.TIMESIG_PX        ??= 26;
    this.LEFT_MARGIN_PX    ??= 18;
    this.RIGHT_MARGIN_PX   ??= 18;
    this.SYSTEM_BUFFER_PX  ??= 30;   // breathing room
  }

  renderToVex() {
    this.VFNoteStacks = [];
    this.VFNoteStacksByPart = [];
    const tieObjects = [];

    const div = this.container;
    div.innerHTML = ""; // clear prior SVG

    // Build systems first so we know the height to resize to
    const systems = this.createMeasureSystems(this.score.measures);
    this.score.maxStaves = this.countStaves();
    const partsCount = Math.max(1, this.score.maxStaves || 1);

    // Per-system accumulators so we can format voices across parts per measure:
    let voicesByPartPerSystem = []; // [part][measureIndex] = [VF.Voice, ...]
    let stavesByPartPerSystem = []; // [part][measureIndex] = VF.Stave

    const VF = this.VF;
    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);

    const yFactor = this.solfegeStaff ? 1 : 0.5;
    const systemBlockHeight = this.staffHeight * partsCount * yFactor;
    const totalHeight = (systems.length * systemBlockHeight) + 100;

    // --- Global zoom via viewBox + resized surface ---
    const s = (window.solfegeSettings?.zoom ?? this.globalScaleFactor ?? 1);
    const effectiveW = this.getEffectiveWidth();   // = (systemWidth / s)

    // Make the drawing surface match the formatted width
    renderer.resize(effectiveW, totalHeight);

    const context = renderer.getContext();
    const svgEl = div.querySelector('svg');
    if (svgEl) {
      // Show entire drawing area, not cropped
      svgEl.setAttribute('viewBox', `0 0 ${effectiveW} ${totalHeight}`);
      svgEl.setAttribute('preserveAspectRatio', 'xMinYMin meet');

      // Let the SVG’s layout box be the effective width we formatted for
      svgEl.style.display = 'block';
      svgEl.style.width = `${effectiveW}px`;

      // Visual zoom
      svgEl.style.transformOrigin = 'top left';
      svgEl.style.transform = `scale(${s})`;

      // Make the scroll container tall enough for the scaled height
      this.container.style.height = `${Math.ceil(totalHeight * s)}px`;
    }


    let currentX = this.startX;
    let currentY = this.startY;

    const tiesMap = new Map();   // `${key}-${voice}-${systemIndex}-${measureIndex}-${noteIndex}` -> { note, keyIndex, systemIndex }

    systems.forEach((system, systemIndex) => {
      // reset per-system part/stave/voice arrays
      voicesByPartPerSystem = Array.from({ length: partsCount }, () => []);
      stavesByPartPerSystem = Array.from({ length: partsCount }, () => []);

      system.measures.forEach((measure, measureIndex) => {
        const tupletGroups = new Map();
        const measureVFNotes = [];
        const effectiveW = this.getEffectiveWidth();
        const staveWidth =
          system.staveWidths?.[measureIndex] ??
          Math.floor((effectiveW - this.LEFT_MARGIN_PX - this.RIGHT_MARGIN_PX) / Math.max(1, system.measures.length));

        // Create (or ensure) one stave per PART (top-to-bottom) for this measure
        const staves = [];
        for (let partIndex = 1; partIndex <= partsCount; partIndex++) {
          const partSlot = partIndex - 1;
          const clefForPart = (measure.clefs?.[partSlot]) || this.currentClefs[partSlot] || 'treble';
          const solfegeAlignOffset = clefForPart === "treble" ? 0 : this.yHeight * 6;

          const staffY = this.solfegeStaff
            ? currentY + solfegeAlignOffset
            : currentY + (partSlot * this.staffHeight * 0.5);

          const stave = new VF.Stave(currentX, staffY, staveWidth);
          staves.push(stave);
          stavesByPartPerSystem[partSlot][measureIndex] = stave;
        }

        // Per-staff: clef/key/time, barlines, draw staff
        for (let staffIndex = 0; staffIndex < staves.length; staffIndex++) {
          // Update running clefs/keys to support mid-system changes
          if (measure.clefs) {
            measure.clefs.forEach((clef, idx) => { if (clef) this.currentClefs[idx] = clef; });
          }
          if (measure.keySignature) {
            this.mode = measure.keySignature.mode;
            this.tonic = measure.keySignature.tonic;
            this.numFifths = measure.keySignature.numFifths;
            this.scale = T.getScale(T.convertVexKeyNameToPitchName(this.tonic), this.mode, this.base);
          }

          // Build a canonical label like "F#m" or "Eb"
          let vexTonicLabel = this.mode === "minor" ? `${this.tonic}m` : this.tonic;

          // At start of system: key and clef for each staff
          const resolvedClef =
            (measure.clefs && measure.clefs[staffIndex]) ||
            this.currentClefs[staffIndex] ||
            'treble';

          // keep the running state synced so later measures without <clef> are safe
          this.currentClefs[staffIndex] = resolvedClef;

          if (measureIndex === 0) {
            staves[staffIndex].addKeySignature(vexTonicLabel);
            staves[staffIndex].addClef(resolvedClef);
            //Displays time signature
            const timeSignature = this.timeSignature.beats + "/" + this.timeSignature.type;
            staves[staffIndex].addTimeSignature(timeSignature);
            this.lastKeySigDrawn = vexTonicLabel;
          } else {
            // mid-system key change
            if (measure.keySignature && vexTonicLabel !== this.lastKeySigDrawn) {
              staves[staffIndex].addKeySignature(vexTonicLabel);
              this.lastKeySigDrawn = vexTonicLabel;
            }
            // (optional) if we want to support mid-system clef changes when provided:
            if (measure.clefs && measure.clefs[staffIndex]) {
              staves[staffIndex].addClef(resolvedClef);
            }
          }


          this.addTimeSignature(measure, staves[staffIndex]);

          if (this.solfegeStaff) {
            if (staffIndex === 0) {
              ScoreBarlines.drawSolfegeBarline(this.container, currentX, currentY - this.yHeight, this.staffHeight - this.yHeight);
            }
            ScoreBarlines.drawSolfegeBarline(this.container, currentX + staveWidth, currentY - this.yHeight, this.staffHeight - this.yHeight);
          } else {
            this.addBarline(measure, staves[staffIndex]);
          }

          if (this.solfegeStaff) {
            ScoreStaff.drawSolfegeStaff(this.container, staveWidth, currentX, currentY - this.yHeight, this.tonic, this.mode, this.yHeight, this.base);
          } else {
            staves[staffIndex].setContext(context).draw();
          }

          // Minimal left connector (kept from wer current state)
          if (staves.length > 1 && measureIndex === 0 && staffIndex === 0 && !this.solfegeStaff) {
            new VF.StaveConnector(staves[0], staves[staves.length - 1])
              .setType(VF.StaveConnector.type.SINGLE)
              .setContext(context)
              .draw();
          }
        }

        // --- Build voices/notes PER PART for THIS measure, then align across parts ---
        // We'll collect all voices (across parts) so a single Formatter.format aligns them horizontally.
        const allVoicesForMeasure = [];
        const beamsForMeasure = [];
        const vexTupletsForMeasure = [];

        for (let partIndex = 1; partIndex <= partsCount; partIndex++) {
          const partSlot = partIndex - 1;

          // Filter notes for THIS part by MusicXML/Vex parsed 'staff' (defaults to 1)
          const notesForPart = (measure.notes || []).filter(n => (n.staff || 1) === partIndex);

          // Prepare voice bucket map for this part (keyed by note.voice)
          const voices = {};
          const beams = [];
          let beamGroup = [];
          const beamGroups = [];

          // Create voices on this part's stave (lazily when we first see a voice id)
          const voiceFor = (voiceIndex) => {
            if (!voices[voiceIndex]) {
              const v = new VF.Voice({
                num_beats: this.timeSignature.beats,
                beat_value: this.timeSignature.type,
              }).setStave(staves[partSlot]);

              v.setStrict(false);           // allow pickups & flexible content
              v.accumulatedTiming = 0;
              voices[voiceIndex] = v;
            }
            return voices[voiceIndex];
          };

          // Build VF notes, beams, tuplets, ties for this part
          notesForPart.forEach((note, noteIndex) => {
            const vexFlowNote = new VF.StaveNote({
              keys: note.keys,
              duration: note.duration,
              clef: note.clef
            });

            // Dots
            for (let i = 0; i < (note.dots || 0); i++) {
              VF.Dot.buildAndAttach([vexFlowNote], { all: true });
            }

            // Accidentals
            if (!note.isRest && this.solfegeStaff) {
              note.accidentals?.solfege?.forEach((acc, idx) => {
                const type = acc === "raised" ? "#" : acc === "lowered" ? "b" : null;
                if (type) vexFlowNote.addModifier(new VF.Accidental(type), idx);
              });
            } else if (!note.isRest && note.accidentals?.traditional) {
              note.accidentals.traditional.forEach((acc, idx) => {
                if (acc) vexFlowNote.addModifier(new VF.Accidental(acc), idx);
              });
            }

            const v = voiceFor(note.voice);

            // Custom attrs for player/animation
            const numVoicesOnThisStave = Object.keys(voices).length;
            vexFlowNote.setStemDirection(this.getStemDirection(vexFlowNote, vexFlowNote.clef, numVoicesOnThisStave, note.voice - 1));
            vexFlowNote.noteNames = this.convertVexKeysToNoteNames(note.keys, note.isRest);
            vexFlowNote.beamState = note.beamState;
            vexFlowNote.tonic = this.tonic;
            vexFlowNote.mode = this.mode;
            vexFlowNote.voiceIndex = note.voice;
            vexFlowNote.partIndex = partIndex;

            // Duration seconds (tuplets aware)
            let baseDuration = this.vexFlowDurationToSeconds(vexFlowNote.duration, this.tempo, note.dots);
            if (note.tupletRatio) baseDuration *= note.tupletRatio.notes_occupied / note.tupletRatio.num_notes;
            vexFlowNote.noteDuration = baseDuration;
            vexFlowNote.noteTimings = note.keys.map(() => vexFlowNote.noteDuration);

            vexFlowNote.startTime = v.accumulatedTiming;
            vexFlowNote.notePositionY = currentY;
            vexFlowNote.ties = note.ties;

            // Beam grouping within this part
            const bs = note.beamState;
            if (bs === "begin" || bs === "continue") {
              beamGroup.push(vexFlowNote);
            } else if (bs === "end") {
              beamGroup.push(vexFlowNote);
              beamGroups.push([...beamGroup]);
              beamGroup = [];
            }

            // Voice ticks & timing
            const ticks = vexFlowNote.getTicks().value();
            v.totalTicksUsed = (v.totalTicksUsed || 0) + ticks;
            v.addTickables([vexFlowNote]);
            v.accumulatedTiming += vexFlowNote.noteDuration;

            measureVFNotes.push(vexFlowNote);

            // Tuplets
            if (note.tupletRatio) {
              const key = `${note.voice}-${partIndex}-${note.tupletRatio.num_notes}-${note.tupletRatio.notes_occupied}`;
              if (!tupletGroups.has(key)) tupletGroups.set(key, [[]]);
              const groups = tupletGroups.get(key);
              const last = groups[groups.length - 1];
              if (last.length < note.tupletRatio.num_notes) last.push({ vexFlowNote });
              else groups.push([{ vexFlowNote }]);
            }

            // Ties
            note.keys.forEach((key, keyIndex) => {
              const tieInfo = note.ties?.[keyIndex];
              const mapKey = `${key}-${note.voice}-${systemIndex}-${measureIndex}-${noteIndex}`;
              if (tieInfo?.includes("start")) {
                tiesMap.set(mapKey, { note: vexFlowNote, keyIndex, systemIndex });
              }
              if (tieInfo?.includes("stop")) {
                for (let [k, vStored] of tiesMap.entries()) {
                  const [storedKey, storedVoice] = k.split("-").slice(0, 2);
                  if (storedKey === key && Number(storedVoice) === note.voice) {
                    if (vStored.systemIndex !== systemIndex) {
                      tieObjects.push(new VF.StaveTie({ first_note: vStored.note, first_indices: [vStored.keyIndex], last_note: null }));
                      tieObjects.push(new VF.StaveTie({ first_note: null, last_note: vexFlowNote, last_indices: [keyIndex] }));
                    } else {
                      tieObjects.push(new VF.StaveTie({
                        first_note: vStored.note, last_note: vexFlowNote,
                        first_indices: [vStored.keyIndex], last_indices: [keyIndex]
                      }));
                    }
                    vStored.note.noteTimings[vStored.keyIndex] += vexFlowNote.noteTimings[keyIndex];
                    tiesMap.delete(k);
                    break;
                  }
                }
              }
            });
          }); // end notesForPart

          // Stem direction unify inside each beam group (per part)
          beamGroups.forEach(group => {
            const sum = group.reduce((a, n) => a + n.getStemDirection(), 0);
            const dir = sum > 0 ? 1 : -1;
            group.forEach(n => n.setStemDirection(dir));
          });

          beamGroups.forEach(group => beams.push(new VF.Beam(group)));
          beamsForMeasure.push(...beams);

          // Tuplets -> VexFlow (per part)
          for (const [k, noteGroups] of tupletGroups.entries()) {
            // key format: `${voice}-${partIndex}-${actual}-${normal}`
            const partsOfKey = k.split("-");
            if (partsOfKey.length !== 4) continue;
            const actual = Number(partsOfKey[2]);
            const normal = Number(partsOfKey[3]);
            noteGroups.forEach((entries) => {
              const notes = entries.map(e => e.vexFlowNote);
              if (notes.length === actual) {
                const t = new VF.Tuplet(notes, { num_notes: actual, notes_occupied: normal, bracketed: true });
                notes.forEach(n => n.setTuplet(t));
                t.attach();
                vexTupletsForMeasure.push(t);
              }
            });
          }

          // Save this part's voices for later global measure formatting
          const partVoices = Object.values(voices);
          voicesByPartPerSystem[partSlot][measureIndex] = partVoices;
          allVoicesForMeasure.push(...partVoices);

        } // end per-part loop

        // --- Cross-part alignment for THIS measure ---
        if (allVoicesForMeasure.length) {
          const fmt = new this.VF.Formatter();

          // Join voices per stave (keeps collisions sane), then format everything together
          staves.forEach(stave => {
            const staveVoices = allVoicesForMeasure.filter(v => v.getStave() === stave);
            if (staveVoices.length) fmt.joinVoices(staveVoices);
          });

          // Compute justify width per stave (accounting for modifiers)
          const justifyWidths = staves.map(stave => {
            const padding = stave.getModifiers().reduce((tot, mod) => tot + mod.getWidth(), 0);
            return staveWidth - padding - this.staveWidthPadding;
          });

          fmt.format(allVoicesForMeasure, Math.min(...justifyWidths));
        }

        // Draw all voices (already aligned) on their staves
        allVoicesForMeasure.forEach(v => v.draw(context, v.getStave()));

        // Draw beams/tuplets/ties for this measure
        beamsForMeasure.forEach(b => (b.setContext(context), b.postFormat(), b.draw()));
        tieObjects.forEach(t => t.setContext(context).draw());
        vexTupletsForMeasure.forEach(t => (t.setContext(context), t.draw()));

        // Advance X for next measure
        currentX += staveWidth;

        // Note x-centers for bubbles + animator stacks
        measureVFNotes.forEach(VFnote => {
          const bb = VFnote.getBoundingBox();
          if (bb) VFnote.notePositionX = bb.getX() + bb.getW() / 2;
          this.createSolfegeBubbles(VFnote);
        });
        // Build stacks (flat) and per-part stacks
        const measureStacks = this.createMeasureStacksTimeAligned(measureVFNotes);
        this.VFNoteStacks = this.VFNoteStacks.concat(measureStacks);
        // Per-part capture (annotated earlier via vexFlowNote.partIndex)
        measureStacks.forEach(stack => {
          const partsInStack = [...new Set(stack.alignedNotes.map(n => n.partIndex || 1))];
          partsInStack.forEach(p => {
            const slot = p - 1;
            if (!this.VFNoteStacksByPart[slot]) this.VFNoteStacksByPart[slot] = [];
            this.VFNoteStacksByPart[slot].push(stack);
          });
        });
      }); // end measures in system

      // Next system
      currentX = this.startX;
      currentY += systemBlockHeight;
    }); // end systems

    // Click-to-seek
      this.VFNoteStacks.forEach((stack, stackIndex) => {
        stack.alignedNotes.forEach((VFnote) => {
          const el = document.getElementById("vf-" + VFnote.getAttribute("id"));
          if (!el) return;
          el.style.cursor = "pointer";
          el.addEventListener("click", () => {
            const ap = window.audioPlayer;
            if (ap?.isPlaying) return;           // don’t seek while playing

            //Exposes index of the clicked notehead
            document.getElementById("stackIndexValue").value = stackIndex;
            document.getElementById("indexUpdateTracker").click();
            // Jump engine time + playhead + repaint + accomp offset + metronome phase
            ScoreAnimator.seekToIndex(stackIndex, ap, { movePlayhead: true, repaint: true });
          });
        });
      });

    if (this.solfegeStaff) this.removeLegerLines();
    this.createPlayhead();
  }


  createMeasureSystems(measures) {
    if (!Array.isArray(measures) || measures.length === 0) return [];

    const systems = [];
    const W = this.getEffectiveWidth();
    const LEFT   = this.LEFT_MARGIN_PX;
    const RIGHT  = this.RIGHT_MARGIN_PX;
    const BUFFER = this.SYSTEM_BUFFER_PX;

    let i = 0;
    while (i < measures.length) {
      const prefixW = this.estimateSystemPrefixWidth(measures[i]) || 0;

      let used = LEFT + prefixW;
      let j = i;
      const pack = [];
      const widths = [];

      while (j < measures.length) {
        const nextW = this.estimateMeasureWidth(measures[j]) || this.MIN_MEASURE_PX;
        if (used + nextW + RIGHT > (W - BUFFER)) break;

        pack.push(measures[j]);
        widths.push(nextW);
        used += nextW;
        j++;

        // packing loop (to prevent spacing of measures that are too tight):
        // if (j < measures.length) {
        //   const look1 = this.estimateMeasureWidth(measures[j]) || this.MIN_MEASURE_PX;
        //   const canAddOne = used + look1 + RIGHT <= W;
        //   if (canAddOne) {
        //     const look2 = (j + 1 < measures.length)
        //       ? (this.estimateMeasureWidth(measures[j + 1]) || this.MIN_MEASURE_PX)
        //       : Number.POSITIVE_INFINITY;
        //     const tightIfTwo = used + look1 + look2 + RIGHT > W;
        //     if (tightIfTwo) break; // conservative: one fewer
        //   }
        // }
      }

      if (pack.length === 0) {
        const w0 = this.estimateMeasureWidth(measures[i]) || this.MIN_MEASURE_PX;
        pack.push(measures[i]);
        widths.push(w0);
        j = i + 1;
      }

      // Make widths array match pack length
      while (widths.length < pack.length) {
        widths.push(this.estimateMeasureWidth(pack[widths.length]) || this.MIN_MEASURE_PX);
      }

      // ---- Justify to uniform system width ----
      if (widths.length > 0) {
        widths[0] = Math.max((widths[0] ?? this.MIN_MEASURE_PX) + (prefixW || 0), this.MIN_MEASURE_PX);
      }
      const targetLane = W - LEFT - RIGHT; // flush to container edges
      const currentSum = widths.reduce((a, b) => a + b, 0) || 1;
      const scale = targetLane / currentSum;
      let scaled = widths.map(w => Math.max(this.MIN_MEASURE_PX, Math.round(w * scale)));

      // fix rounding drift
      let drift = targetLane - scaled.reduce((a, b) => a + b, 0);
      if (drift !== 0 && scaled.length) {
        const order = [...scaled.keys()].sort((a, b) => scaled[b] - scaled[a]);
        while (drift !== 0) {
          for (const idx of order) {
            if (drift === 0) break;
            if (drift > 0) { scaled[idx] += 1; drift -= 1; }
            else if (scaled[idx] > this.MIN_MEASURE_PX) { scaled[idx] -= 1; drift += 1; }
          }
        }
      }

      systems.push({
        measures: pack,
        staveWidths: scaled,
        systemIndex: systems.length,
      });

      i = j;
    }

    return systems;
  }

  countNotesInMeasure(measure) {
    const counts = {};
    (measure.notes || []).forEach(n => { counts[n.voice] = (counts[n.voice] || 0) + 1; });
    return Math.max(0, ...Object.values(counts));
  }

  countStaves() {
    let max = 0;
    (this.score.measures || []).forEach(m => {
      (m.notes || []).forEach(n => { if (n.staff > max) max = n.staff; });
    });
    return max;
  }

  createMeasureStacks(measureVFNotes) {
    const stacks = new Map();
    (measureVFNotes || []).forEach(note => {
      const key = `${note.notePositionY},${note.startTime}`;
      if (!stacks.has(key)) {
        stacks.set(key, {
          alignedNotes: [],
          playHeadX: note.notePositionX,
          playHeadY: note.notePositionY,
          noteDuration: note.noteDuration,
          startTime: note.startTime,
        });
      }
      const s = stacks.get(key);
      s.alignedNotes.push(note);
      s.noteDuration = Math.min(s.noteDuration, note.noteDuration);
    });
    return Array.from(stacks.values()).sort((a, b) =>
      a.playHeadY === b.playHeadY ? a.startTime - b.startTime : a.playHeadY - b.playHeadY
    );
  }

  // Group all notes in a measure by onset time (across all parts),
// then build stacks in chronological order.
createMeasureStacksTimeAligned(measureVFNotes) {
  if (!Array.isArray(measureVFNotes) || measureVFNotes.length === 0) return [];

  const toKey = (t) => Math.round((t || 0) * 1000);
  const buckets = new Map(); // key(ms) -> { tSec, notes[] }

  for (const n of measureVFNotes) {
    const k = toKey(n.startTime);
    if (!buckets.has(k)) buckets.set(k, { tSec: k / 1000, notes: [] });
    buckets.get(k).notes.push(n);
  }

  const keys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const stacks = [];

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const { tSec, notes } = buckets.get(k);

    // Duration = until next onset, else max sustain among starters
    let noteDuration;
    if (i < keys.length - 1) {
      const nextTSec = keys[i + 1] / 1000;
      noteDuration = Math.max(0, nextTSec - tSec);
    } else {
      noteDuration = Math.max(...notes.map(n => n.noteDuration || 0), 0);
    }

    // Choose a consistent playhead anchor: use the leftmost note’s X,
    // and the TOP staff’s Y (smallest Y) so the playhead sits nicely.
    const withPos = notes.filter(n => n.notePositionX != null && n.notePositionY != null);
    const playHeadX = withPos.length ? withPos.reduce((min, n) => Math.min(min, n.notePositionX), Infinity) : undefined;
    const playHeadY = withPos.length ? withPos.reduce((min, n) => Math.min(min, n.notePositionY), Infinity) : undefined;

    stacks.push({
      alignedNotes: notes,
      noteDuration,
      startTime: tSec,
      playHeadX,
      playHeadY,
    });
  }

  return stacks;
}



  reRenderVexNotes(newTonic) {
    this.transposeInto(newTonic);
  }

  removeLegerLines() {
    document.querySelectorAll('.vf-stavenote').forEach(staveNote => {
      staveNote.querySelectorAll('path').forEach(path => {
        const d = path.getAttribute('d');
        if (!d) return;
        const isLedgerLine = /^M[\d.]+ ([\d.]+)L[\d.]+ \1$/.test(d.trim());
        if (isLedgerLine) path.remove();
      });
    });
  }

  estimateMeasureComplexity(measure) {
    const notes = Array.isArray(measure?.notes) ? measure.notes : [];
    const noteCount = notes.length;
    const accidentalCount = notes.reduce((acc, n) => acc + (Array.isArray(n?.accidentals) ? n.accidentals.length : 0), 0);

    const barlineWeight =
      (measure?.startBarline && measure.startBarline !== 'single' ? 1 : 0) +
      (measure?.endBarline   && measure.endBarline   !== 'single' ? 1 : 0);

    const tuplets   = Array.isArray(measure?.tuplets)   ? measure.tuplets.length   : 0;
    const ornaments = Array.isArray(measure?.ornaments) ? measure.ornaments.length : 0;

    const localKeyChange  = measure?.keyChange  ? 2 : 0;
    const localTimeChange = measure?.timeChange ? 2 : 0;

    return noteCount + accidentalCount + barlineWeight +
           Math.ceil(tuplets * 0.5) + Math.ceil(ornaments * 0.5) +
           localKeyChange + localTimeChange;
  }

  estimateMeasureWidth(measure) {
    const base = this.BASE_ELEMENT_PX;
    const min  = this.MIN_MEASURE_PX;
    const complexity = this.estimateMeasureComplexity(measure);
    return Math.max(min, complexity * base);
  }

  estimateSystemPrefixWidth(firstMeasure) {
    const CLEF = this.CLEF_PX;
    const KEY  = this.KEYSIG_PX;
    const TIME = this.TIMESIG_PX;

    let w = CLEF + TIME;
    const numFifths = firstMeasure?.keySignature?.numFifths ?? this.score?.keySignature?.numFifths ?? 0;
    w += Math.abs(numFifths) * KEY;
    return w;
  }

  getEffectiveWidth() {
    const s = this.globalScaleFactor || 1;
    return Math.floor((this.systemWidth ?? this.width ?? 1200) / s);
  }
}

Object.assign(ScoreManager.prototype, ScoreAnimator);
Object.assign(ScoreManager.prototype, ScoreBarlines);
Object.assign(ScoreManager.prototype, ScoreDurations);
Object.assign(ScoreManager.prototype, ScoreClefs);
Object.assign(ScoreManager.prototype, ScoreStems);
Object.assign(ScoreManager.prototype, ScoreAccidentals);
Object.assign(ScoreManager.prototype, ScoreTranspose);
Object.assign(ScoreManager.prototype, ScoreUtilities);
Object.assign(ScoreManager.prototype, ScoreXMLParser);
Object.assign(ScoreManager.prototype, ScoreStaff);

export { ScoreManager };
