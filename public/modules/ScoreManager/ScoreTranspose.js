// public/modules/ScoreManager/ScoreTranspose.js:

import { T } from "../Tonal/Tonal.js";

export const ScoreTranspose = {
  transposeInto(newTonic) {//newTonic is the starting key--if there are key changes, it needs to be adjusted

    const chromaticPitches = T.chromaticPitches;

    //get old and new scales:
    const oldScale = T.getScale(T.convertVexKeyNameToPitchName(this.tonic), this.mode, this.base);
    const newScale = T.getScale(T.convertVexKeyNameToPitchName(newTonic), this.mode, this.base);

    //calculate transposed interval in semitones
    const transposeInterval = T.findClosestDistanceBetweenTonics
      (T.convertVexToHyphenatedPitch(this.tonic), 
      T.convertVexToHyphenatedPitch(newTonic));

    //measure loop
    this.score.measures.forEach((measure) => {
      //the tonic is checked every new measure but in the present state this is redundant: only one tonic per score
      if (measure.keySignature) {
        measure.keySignature.numFifths = this.convertKeyToFifths(newTonic, this.mode);
        measure.keySignature.tonic = newTonic;
      }

      //notes loop
      measure.notes.forEach(note => {
        if (!note.isRest) {//if it's not a rest
          //derive old pitch data:
          note.keys.forEach((vexKeyName, keyIndex) => {
            const oldPitchName = T.convertVexKeyNameToPitchName(vexKeyName.split('/')[0]);
            const oldKeyDegreeStateObj = T.findPitchInScaleByName(oldPitchName, oldScale);
            //derive the new pitch name based on old degree and state
            const newPitchName = T.findPitchInScaleByDegreeAndState(oldKeyDegreeStateObj.degree, oldKeyDegreeStateObj.state, newScale);  
                     
            //for every chromatic pitch
            for (const chromaticPitch of chromaticPitches) {
              //for every vex state property in chromatic pitch's vexNoteName object:
              for (const vexState of Object.keys(chromaticPitch.vexNoteName)) {
                //if matches the old vex key
                if (chromaticPitch.vexNoteName[vexState] === vexKeyName) {//(NB: vexKeyName is the name of the old pitch)
                  //find new chromatic pitch
                  let newChromaticPitch = chromaticPitches[chromaticPitches.indexOf(chromaticPitch) + transposeInterval];
                  //for every pitch in the new chromatic pitch
                  for (const pitchState of Object.keys(newChromaticPitch.pitch)) {
                    //if matches the new pitch name
                    if (newChromaticPitch.pitch[pitchState] === newPitchName) {
                      const newVexKeyName = newChromaticPitch.vexNoteName[pitchState];
                      note.keys[keyIndex] = newVexKeyName;

                      // refresh accidentals arrays
                      if (note.accidentals.traditional[keyIndex] !== undefined) {
                        note.accidentals.traditional[keyIndex] = newVexKeyName.split('/')[0].length > 1 ? newVexKeyName.split('/')[0].substring(1) : "n";
                      }

                      // NB: note.accidentals.solfege is already taken care of!
                      
                    }
                  }
                }
              }
            }
          });
        }
      }); 
    });

    this.tonic = newTonic;

    this.renderToVex();
  },//--end method

  transposeBy(transposeInterval) {
    const chromaticPitches = T.chromaticPitches;
    const oldScale = T.getScale(T.convertVexKeyNameToPitchName(this.tonic), this.mode, this.base);
    const newScale = oldScale;
    
    const scoreBackUpCopy = JSON.parse(JSON.stringify(this.score));

    try {
        // Measure loop
        this.score.measures.forEach((measure) => {
            // Notes loop
            measure.notes.forEach(note => {
                if (!note.isRest) {
                    // Derive old pitch data:
                    note.keys.forEach((vexKeyName, keyIndex) => {
                        const oldPitchName = T.convertVexKeyNameToPitchName(vexKeyName.split('/')[0]);
                        const oldKeyDegreeStateObj = T.findPitchInScaleByName(oldPitchName, oldScale);
                        const newPitchName = T.findPitchInScaleByDegreeAndState(oldKeyDegreeStateObj.degree, oldKeyDegreeStateObj.state, newScale);

                        // Check for valid transposed chromatic pitch
                        for (const chromaticPitch of chromaticPitches) {
                            for (const vexState of Object.keys(chromaticPitch.vexNoteName)) {
                                if (chromaticPitch.vexNoteName[vexState] === vexKeyName) {
                                    const transposedIndex = chromaticPitches.indexOf(chromaticPitch) + transposeInterval;
                                    
                                    // Abort if index is out of bounds
                                    if (transposedIndex < 0 || transposedIndex >= chromaticPitches.length) {
                                        throw new Error("Transposed pitch out of range");
                                    }

                                    let newChromaticPitch = chromaticPitches[transposedIndex];

                                    for (const pitchState of Object.keys(newChromaticPitch.pitch)) {
                                        if (newChromaticPitch.pitch[pitchState] === newPitchName) {
                                            note.keys[keyIndex] = newChromaticPitch.vexNoteName[pitchState];
                                        }
                                    }
                                }
                            }
                        }
                    });
                }
            });
        });

        this.renderToVex();
    } catch (error) {
        console.error(error.message);
        this.score = scoreBackUpCopy; // Restore original score
    }
  },//--end method

  
};//--end ScoreTranspose

              
