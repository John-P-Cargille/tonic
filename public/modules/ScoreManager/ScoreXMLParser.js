// public/modules/ScoreManager/ScoreXMLParses.js:

export const ScoreXMLParser = {

  parsePartLabelsFromXML(xmlDoc) {
    const labels = [];
    const partList = xmlDoc.querySelector('part-list');
    if (!partList) return labels;

    const parts = Array.from(partList.querySelectorAll('score-part'));
    parts.forEach((p, idx) => {
      const abbr = p.querySelector('part-abbreviation')?.textContent?.trim();
      const name = p.querySelector('part-name')?.textContent?.trim();
      const label = (abbr && abbr.length) ? abbr : (name && name.length ? name : `Part ${idx + 1}`);
      labels.push(label);
    });

    return labels;
  },

  writeScoreObjectFromXML(xmlContent) {
    // Parse the XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, "application/xml");
    this.currentXML = xmlDoc;
    this.divisions = 4; // default

    const parsedPartLabels = this.parsePartLabelsFromXML(xmlDoc);

    this.score = {
      measures: [],
      partLabels: []
    };

    // Running musical state
    let scale;
    let currentKeySignature, currentTimeSignature;
    let declaredNumStaves = 0; // from <staves> when present

    // --- Iterate by <part>, then merge measures with the same number ---
    const partElems = Array.from(xmlDoc.querySelectorAll("score-partwise > part"));
    const measureMap = new Map(); // number(string) -> measureObj
    const partIdToIndex = new Map(partElems.map((p, i) => [p.getAttribute("id") || `P${i+1}`, i + 1]));

    partElems.forEach((partEl, partIdx0) => {
      const partIndex = partIdx0 + 1;

      const measures = Array.from(partEl.querySelectorAll(":scope > measure"));
      measures.forEach((measure, localMeasureIdx) => {
        const numberAttr = measure.getAttribute("number") ?? String(localMeasureIdx + 1);
        let measureObj = measureMap.get(numberAttr);
        if (!measureObj) {
          // create a new measureObj on first encounter of this number
          measureObj = {
            number: numberAttr,
            notes: [],
            // the fields below will be filled lazily from the first part that provides them
            keySignature: undefined,
            keyChange: false,
            timeSignature: undefined,
            clefs: undefined,
            barlines: undefined,
            numStaves: undefined,
            isPickup: false,
          };
          // pickup?
          const implicit = measure.getAttribute("implicit");
          measureObj.isPickup = (implicit === "yes" || numberAttr === "0");
          measureMap.set(numberAttr, measureObj);
        }

        // Divisions (track latest seen)
        const divisionsElement = measure.querySelector("divisions");
        if (divisionsElement) {
          this.divisions = parseInt(divisionsElement.textContent || "4", 10);
        }

        // Key (set once if not set yet on this merged measure)
        const keyElement = measure.querySelector("key");
        if (keyElement && !measureObj.keySignature) {
          const fifths = parseInt(keyElement.querySelector("fifths")?.textContent || "0", 10);
          if (!Number.isNaN(fifths)) this.numFifths = fifths;

          const mode = keyElement.querySelector("mode")?.textContent || "major";
          if (mode) this.mode = mode;

          const tonic = this.convertFifthsToKey(fifths, this.mode);
          this.tonic = tonic;

          measureObj.keySignature = { mode: this.mode, numFifths: fifths, tonic };
          measureObj.keyChange = localMeasureIdx > 0; // simple heuristic

          currentKeySignature = measureObj.keySignature;
          scale = T.getScale(T.convertVexKeyNameToPitchName(this.tonic), this.mode, this.base);
        }

        // Time (set once if not set yet on this merged measure)
        const timeSignatureElement = measure.querySelector("time");
        if (timeSignatureElement && !measureObj.timeSignature) {
          const numBeats = parseInt(timeSignatureElement.querySelector("beats")?.textContent || "4", 10);
          const beatValue = parseInt(timeSignatureElement.querySelector("beat-type")?.textContent || "4", 10);
          measureObj.timeSignature = { numBeats, beatValue };
          currentTimeSignature = measureObj.timeSignature;

          // also set ScoreManager.timeSignature if you want
          this.timeSignature = { beats: numBeats, type: beatValue };
        }

        // <staves> (rare; when present, just record the max across parts)
        const stavesElement = measure.querySelector("staves");
        if (stavesElement) {
          const n = parseInt(stavesElement.textContent || "1", 10);
          if (n > declaredNumStaves) declaredNumStaves = n;
          measureObj.numStaves = Math.max(measureObj.numStaves || 0, n);

          // Ensure instance-level currentClefs has placeholders for this part’s staves
          const base = partIndex - 1;
          this.currentClefs = this.currentClefs || [];
          for (let s = 0; s < (measureObj.numStaves || n); s++) {
            const idx = base + s;
            if (!this.currentClefs[idx]) this.currentClefs[idx] = 'treble';
          }
        }


        // Clefs (collect per staff index, per part)
        const clefsArr = this.getClefs(measure);
        if (clefsArr && clefsArr.length) {
          measureObj.clefs = measureObj.clefs || [];

          // Base offset where this part’s first staff lives in the global stack
          // (P1 -> 0, P2 -> 1, P3 -> 2, etc; supports multi-staff parts later)
          const base = partIndex - 1;

          clefsArr.forEach((clefName, localStaffIdx) => {
            if (!clefName) return;
            const globalIdx = base + localStaffIdx;

            // Write into the merged measure’s clef array at the global staff slot
            measureObj.clefs[globalIdx] = clefName;

            // Keep a running instance-level currentClefs so later measures (w/o <clef>) inherit correctly
            this.currentClefs = this.currentClefs || [];
            this.currentClefs[globalIdx] = clefName;
          });
        }


        // Barlines
        const barlineElements = measure.querySelectorAll("barline");
        if (barlineElements.length) {
          measureObj.barlines = measureObj.barlines || [];
          barlineElements.forEach(barline => {
            measureObj.barlines.push({
              location: barline.getAttribute("location"),
              style: barline.querySelector("bar-style")?.textContent || "light",
            });
          });
        }

        // ---- NOTES (MERGED) ----
        const notes = measureObj.notes;
        const noteElements = measure.querySelectorAll("note");
        let isChordGroup = false;

        noteElements.forEach(noteElement => {
          // staff: if missing, default to THIS part index (so P1->1, P2->2, …)
          const staffFromXML = noteElement.querySelector("staff");
          const staff = parseInt(staffFromXML?.textContent || String(partIndex), 10);

          const voice = parseInt(noteElement.querySelector("voice")?.textContent || "1", 10);

          // pitch
          const pitchElement = noteElement.querySelector("pitch");
          const step = pitchElement?.querySelector("step")?.textContent || "C";
          const octave = pitchElement?.querySelector("octave")?.textContent || "4";
          const alter = pitchElement?.querySelector("alter")?.textContent || "0";

          const timeModElement = noteElement.querySelector("time-modification");
          let tupletRatio = null;
          if (timeModElement) {
            const actualNotes = parseInt(timeModElement.querySelector("actual-notes")?.textContent || "0", 10);
            const normalNotes = parseInt(timeModElement.querySelector("normal-notes")?.textContent || "0", 10);
            if (actualNotes && normalNotes && actualNotes !== normalNotes) {
              tupletRatio = { num_notes: actualNotes, notes_occupied: normalNotes };
            }
          }

          // ties
          const tieTags = noteElement.querySelectorAll("tie");
          const tieTypes = Array.from(tieTags).map(t => t.getAttribute("type"));

          // accidental from <alter>
          const vexAccidental = {
            "1": "#", "-1": "b", "2": "##", "-2": "bb", "0": ""
          }[alter] || "";

          let noteKey = `${step.toLowerCase()}${vexAccidental}/${octave}`;

          // duration
          const durationXML = noteElement.querySelector("duration")?.textContent || "4";
          let vexFlowDuration = this.durationXMLToVexFlow(durationXML, this.divisions, tupletRatio);

          const dotCount = noteElement.querySelectorAll("dot").length;
          const isChord = noteElement.querySelector("chord") !== null;
          const isRest  = noteElement.querySelector("rest")  !== null;
          const beamTag = noteElement.querySelector("beam")?.textContent || undefined;

          // accidentals (both models)
          let traditionalAccidentals = [];
          let solfegeAccidentals = [];

          // clefs
          const resolvedClef =
          (measureObj.clefs && measureObj.clefs[staff - 1]) ||
          (this.currentClefs && this.currentClefs[staff - 1]) ||
          "treble";

          const xmlAccidental = noteElement.querySelector("accidental")?.textContent || undefined;
          const traditional = this.convertXMLAccidental(xmlAccidental);
          const solfegeStatus = (() => {
            const pitchName = T.convertVexKeyNameToPitchName(noteKey.split('/')[0]);
            let state = "diatonic";
            if (scale?.degrees) {
              Object.keys(scale.degrees).forEach(degree => {
                Object.keys(scale.degrees[degree]).forEach(degreeState => {
                  if (scale.degrees[degree][degreeState] === pitchName) {
                    state = degreeState;
                  }
                });
              });
            }
            return state;
          })();
          traditionalAccidentals.push(traditional);
          solfegeAccidentals.push(solfegeStatus);

          if (!isChord) {
            isChordGroup = false;
          } else if (!isChordGroup) {
            isChordGroup = true;
          }

          if (isRest) {
            vexFlowDuration += "r";
            noteKey = (resolvedClef === "bass") ? "d/3" : "b/4";
          }

          if (isChord && notes.length > 0) {
            // Add pitch to the previous chord head
            notes[notes.length - 1].keys.push(noteKey);
            notes[notes.length - 1].ties.push(tieTypes);
            // keep arrays aligned per key index
            notes[notes.length - 1].accidentals.traditional.push(traditional);
            notes[notes.length - 1].accidentals.solfege.push(solfegeStatus);
          } else {
            // New notehead
            const vexNoteObject = {
              staff,
              keys: [noteKey],
              duration: vexFlowDuration,
              dots: dotCount,
              isRest,
              beamState: beamTag,
              accidentals: {
                traditional: traditionalAccidentals,
                solfege: solfegeAccidentals
              },
              voice,
              clef: resolvedClef,
              ties: [tieTypes],
              tupletRatio
            };
            notes.push(vexNoteObject);
          }
        });
      });
    });

    // Finalize the measures array in numeric order by measure number (fallback to insertion if NaN)
    const sortedNumbers = Array.from(measureMap.keys()).sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
    this.score.measures = sortedNumbers.map(k => measureMap.get(k));

    // ---- Determine stavesDetected ----
    // 1) max staff index observed in notes
    let maxStaffSeen = 1;
    this.score.measures.forEach(m => (m.notes || []).forEach(n => { if (n.staff > maxStaffSeen) maxStaffSeen = n.staff; }));
    // 2) explicit <staves> if present anywhere
    const explicitStaves = declaredNumStaves || 0;
    // 3) number of <score-part>s
    const partsDeclared = parsedPartLabels.length || 0;

    const stavesDetected = Math.max(maxStaffSeen, explicitStaves, partsDeclared, 1);

    // ---- Part labels ----
    let labels = [];
    if (stavesDetected === 1) {
      labels = [parsedPartLabels[0] || "Staff 1"];
    } else {
      for (let i = 0; i < stavesDetected; i++) {
        labels.push(parsedPartLabels[i] || `Staff ${i + 1}`);
      }
    }
    this.score.partLabels = labels;

    // Finalize currentClefs length to the detected number of staves
    this.currentClefs = Array.from({ length: stavesDetected }, (_, i) =>
      (this.currentClefs && this.currentClefs[i]) ? this.currentClefs[i] : 'treble'
    );


    return this.score;
  }//--end of writeScoreObjectFromXML

};//--end of ScoreXMLParser