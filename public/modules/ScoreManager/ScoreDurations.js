// public/modules/ScoreManager/ScoreDurations.js:

export const ScoreDurations = {
    durationXMLToVexFlow(duration, divisions, tupletRatio = null) {
  let rawDuration = parseFloat(duration);

  if (tupletRatio) {
    rawDuration *= tupletRatio.num_notes / tupletRatio.notes_occupied;
  }

  const durationValue = rawDuration / divisions;
  const epsilon = 0.0001;

  const table = [
    { val: 4.0, dur: "w" },
    { val: 3.0, dur: "hd" },
    { val: 2.0, dur: "h" },
    { val: 1.5, dur: "qd" },
    { val: 1.0, dur: "q" },
    { val: 0.75, dur: "8d" },
    { val: 0.5, dur: "8" },
    { val: 0.375, dur: "16d" },
    { val: 0.333, dur: "8" },
    { val: 0.25, dur: "16" },
    { val: 0.1875, dur: "32d" },
    { val: 0.1667, dur: "16" },
    { val: 0.125, dur: "32" },
    { val: 0.0625, dur: "64" },
  ];

  for (let entry of table) {
    const rounded = Math.round(durationValue * 1000) / 1000;
    if (Math.abs(rounded - entry.val) < epsilon) {
      return entry.dur;
    }
  }

  console.warn(`Unknown duration: ${duration}, defaulting to quarter note`);
  return "q";
},

    addTimeSignature (measure,stave) {
        const timeSignatureElement = measure.timeSignature;
        if (timeSignatureElement) {
  
          this.timeSignature.beats = measure.timeSignature.numBeats;
          this.timeSignature.type = measure.timeSignature.beatValue;
          stave.addTimeSignature(`${measure.timeSignature.numBeats}/${measure.timeSignature.beatValue}`);
        }
    },

    vexFlowDurationToSeconds(vexFlowDuration, tempo, dots) {
        // Duration values relative to a quarter note
        const durationMap = {
            "w": 4,      // Whole note
            "h": 2,      // Half note
            "hd": 3,     // Dotted half note
            "q": 1,      // Quarter note
            "qd": 1.5,   // Dotted quarter note
            "8": 0.5,    // Eighth note
            "8d": 0.75,  // Dotted eighth note
            "16": 0.25,  // Sixteenth note
            "16d": 0.375,// Dotted sixteenth note
            "32": 0.125, // Thirty-second note
            "32d": 0.1875,// Dotted thirty-second note
            "64": 0.0625 // Sixty-fourth note
        };
    
        // Convert tempo (BPM) to seconds per quarter note
        const secondsPerQuarterNote = 60 / tempo;
    
        // Get the relative duration value
        let relativeDuration = durationMap[vexFlowDuration];

        if (dots) relativeDuration *= 1.5;
    
        if (relativeDuration === undefined) {
            console.warn(`Unknown VexFlow duration: ${vexFlowDuration}, defaulting to quarter note.`);
            return secondsPerQuarterNote; // Default to quarter note duration
        }
    
        // Calculate and return the duration in seconds
        return relativeDuration * secondsPerQuarterNote;
    } 
  };