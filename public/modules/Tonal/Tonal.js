// public/modules/Tonal/Tonal.js

class Tonal {
  constructor () {
    this.chromatic = [
      {natural: "C-natural", sharp: "B-sharp", flat: undefined, pitchClass: 0},
      {natural: undefined, sharp: "C-sharp", flat: "D-flat", pitchClass: 1},
      {natural: "D-natural", sharp: undefined, flat: undefined, pitchClass: 2},
      {natural: undefined, sharp: "D-sharp", flat: "E-flat", pitchClass: 3},
      {natural: "E-natural", sharp: undefined, flat: "F-flat", pitchClass: 4},
      {natural: "F-natural", sharp: "E-sharp", flat: undefined, pitchClass: 5},
      {natural: undefined, sharp: "F-sharp", flat: "G-flat", pitchClass: 6},
      {natural: "G-natural", sharp: undefined, flat: undefined, pitchClass: 7},
      {natural: undefined, sharp: "G-sharp", flat: "A-flat", pitchClass: 8},
      {natural: "A-natural", sharp: undefined, flat: undefined, pitchClass: 9},
      {natural: undefined, sharp: "A-sharp", flat: "B-flat", pitchClass: 10},
      {natural: "B-natural", sharp: undefined, flat: "C-flat", pitchClass: 11}
    ];

    this.chromaticPitches = this.createChromatic();

    this.intervals = {
        major: [2, 2, 1, 2, 2, 2, 1],
        minor: [2, 1, 2, 2, 1, 2, 2]
    };
    this.pitchLetters = ["C", "D", "E", "F", "G", "A", "B"];

    this.accidentalNames = ["doubleflat","flat","natural","sharp","doublesharp"]

    this.positions = this.createPositions();
  };//--end constructor

  createPositions() {
    const positions = [];
    //octave 0:
    for (let i = 0; i < 2; i++) {
      const position = {
        octave: 0,
        pitchNames: []
      };
      this.accidentalNames.forEach(accidentalName => {
        const pitchName = `${this.pitchLetters[5 + i]}-${accidentalName}`;
        position.pitchNames.push(pitchName);
      });
      positions.push(position);
    }

    //octaves 1-8:
    for (let i = 1; i <= 8; i++) {
      for (let j = 0; j < this.pitchLetters.length; j++) {
        const position = {
          octave: i,
          pitchNames: []
        };
        this.accidentalNames.forEach(accidentalName => {
          const pitchName = `${this.pitchLetters[0 + j]}-${accidentalName}`;
          position.pitchNames.push(pitchName);
        });
        positions.push(position);
      }
    }
    
    // Octave 9:
    const lastPosition = {
      octave: 9,
      pitchNames: []
    };
    
    this.accidentalNames.forEach(accidentalName => {
      const pitchName = `C-${accidentalName}`;
      lastPosition.pitchNames.push(pitchName);
    });

    positions.push(lastPosition);

    return positions;
  };//--end method

  createChromatic() {
    const pitches = [
      // Octave 0: A0, Bb0, B0
      {
        audioName: "A0",
        octave: 0,
        pitchNumber: 0,
        pitchClass: 9,
        pitch: {
          doubleflat: "B-doubleflat",
          flat: undefined,
          natural: "A-natural",
          sharp: undefined,
          doublesharp: "G-doublesharp"
        },
        vexNoteName: {
          doubleflat: "bb/0",
          flat: undefined,
          natural: "a/0",
          sharp: undefined,
          doublesharp: "g##/0"
        }
      },
      {
        audioName: "Bb0",
        octave: 0,
        pitchNumber: 1,
        pitchClass: 10,
        pitch: {
          doubleflat: "C-doubleflat",
          flat: "B-flat",
          natural: undefined,
          sharp: "A-sharp",
          doublesharp: undefined
        },
        vexNoteName: {
          doubleflat: "cbb/0",
          flat: "bb/0",
          natural: undefined,
          sharp: "a#/0",
          doublesharp: undefined
        }
      },
      {
        audioName: "B0",
        octave: 0,
        pitchNumber: 2,
        pitchClass: 11,
        pitch: {
          doubleflat: undefined,
          flat: "C-flat",
          natural: "B-natural",
          sharp: undefined,
          doublesharp: "A-doublesharp"
        },
        vexNoteName: {
          doubleflat: undefined,
          flat: "cb/1",
          natural: "b/0",
          sharp: undefined,
          doublesharp: "a##/0"
        }
      },

      // Octaves 1-7: C1 to B7 (12 notes per octave)
      ...[1,2,3,4,5,6,7].flatMap(oct => [
        {
          audioName: `C${oct}`,
          octave: oct,
          pitchNumber: 3 + (oct - 1) * 12,
          pitchClass: 0,
          pitch: {
            doubleflat: "D-doubleflat",
            flat: undefined,
            natural: "C-natural",
            sharp: "B-sharp",
            doublesharp: undefined
          },
          vexNoteName: {
            doubleflat: `dbb/${oct}`,
            flat: undefined,
            natural: `c/${oct}`,
            sharp: `b#/${oct - 1}`,
            doublesharp: undefined
          }
        },
        {
          audioName: `Db${oct}`,
          octave: oct,
          pitchNumber: 4 + (oct - 1) * 12,
          pitchClass: 1,
          pitch: {
            doubleflat: undefined,
            flat: "D-flat",
            natural: undefined,
            sharp: "C-sharp",
            doublesharp: "B-doublesharp"
          },
          vexNoteName: {
            doubleflat: undefined,
            flat: `db/${oct}`,
            natural: undefined,
            sharp: `c#/${oct}`,
            doublesharp: `b##/${oct}`
          }
        },
        {
          audioName: `D${oct}`,
          octave: oct,
          pitchNumber: 5 + (oct - 1) * 12,
          pitchClass: 2,
          pitch: {
            doubleflat: "E-doubleflat",
            flat: undefined,
            natural: "D-natural",
            sharp: undefined,
            doublesharp: "C-doublesharp"
          },
          vexNoteName: {
            doubleflat: `ebb/${oct}`,
            flat: undefined,
            natural: `d/${oct}`,
            sharp: undefined,
            doublesharp: `c##/${oct}`
          }
        },
        {
          audioName: `Eb${oct}`,
          octave: oct,
          pitchNumber: 6 + (oct - 1) * 12,
          pitchClass: 3,
          pitch: {
            doubleflat: "F-doubleflat",
            flat: "E-flat",
            natural: undefined,
            sharp: "D-sharp",
            doublesharp: undefined
          },
          vexNoteName: {
            doubleflat: `fbb/${oct}`,
            flat: `eb/${oct}`,
            natural: undefined,
            sharp: `d#/${oct}`,
            doublesharp: undefined
          }
        },
        {
          audioName: `E${oct}`,
          octave: oct,
          pitchNumber: 7 + (oct - 1) * 12,
          pitchClass: 4,
          pitch: {
            doubleflat: undefined,
            flat: "F-flat",
            natural: "E-natural",
            sharp: undefined,
            doublesharp: "D-doublesharp"
          },
          vexNoteName: {
            doubleflat: undefined,
            flat: `fb/${oct}`,
            natural: `e/${oct}`,
            sharp: undefined,
            doublesharp: `d##/${oct}`
          }
        },
        {
          audioName: `F${oct}`,
          octave: oct,
          pitchNumber: 8 + (oct - 1) * 12,
          pitchClass: 5,
          pitch: {
            doubleflat: "G-doubleflat",
            flat: undefined,
            natural: "F-natural",
            sharp: "E-sharp",
            doublesharp: undefined
          },
          vexNoteName: {
            doubleflat: `gbb/${oct}`,
            flat: undefined,
            natural: `f/${oct}`,
            sharp: `e#/${oct}`,
            doublesharp: undefined
          }
        },
        {
          audioName: `Gb${oct}`,
          octave: oct,
          pitchNumber: 9 + (oct - 1) * 12,
          pitchClass: 6,
          pitch: {
            doubleflat: undefined,
            flat: "G-flat",
            natural: undefined,
            sharp: "F-sharp",
            doublesharp: "E-doublesharp"
          },
          vexNoteName: {
            doubleflat: undefined,
            flat: `gb/${oct}`,
            natural: undefined,
            sharp: `f#/${oct}`,
            doublesharp: `e##/${oct}`
          }
        },
        {
          audioName: `G${oct}`,
          octave: oct,
          pitchNumber: 10 + (oct - 1) * 12,
          pitchClass: 7,
          pitch: {
            doubleflat: "A-doubleflat",
            flat: undefined,
            natural: "G-natural",
            sharp: undefined,
            doublesharp: "F-doublesharp"
          },
          vexNoteName: {
            doubleflat: `abb/${oct}`,
            flat: undefined,
            natural: `g/${oct}`,
            sharp: undefined,
            doublesharp: `f##/${oct}`
          }
        },
        {
          audioName: `Ab${oct}`,
          octave: oct,
          pitchNumber: 11 + (oct - 1) * 12,
          pitchClass: 8,
          pitch: {
            doubleflat: undefined,
            flat: "A-flat",
            natural: undefined,
            sharp: "G-sharp",
            doublesharp: undefined
          },
          vexNoteName: {
            doubleflat: undefined,
            flat: `ab/${oct}`,
            natural: undefined,
            sharp: `g#/${oct}`,
            doublesharp: undefined
          }
        },
        {
          audioName: `A${oct}`,
          octave: oct,
          pitchNumber: 12 + (oct - 1) * 12,
          pitchClass: 9,
          pitch: {
            doubleflat: "B-doubleflat",
            flat: undefined,
            natural: "A-natural",
            sharp: undefined,
            doublesharp: "G-doublesharp"
          },
          vexNoteName: {
            doubleflat: `bb/${oct}`,
            flat: undefined,
            natural: `a/${oct}`,
            sharp: undefined,
            doublesharp: `g##/${oct}`
          }
        },
        {
          audioName: `Bb${oct}`,
          octave: oct,
          pitchNumber: 13 + (oct - 1) * 12,
          pitchClass: 10,
          pitch: {
            doubleflat: "C-doubleflat",
            flat: "B-flat",
            natural: undefined,
            sharp: "A-sharp",
            doublesharp: undefined
          },
          vexNoteName: {
            doubleflat: `cbb/${oct}`,
            flat: `bb/${oct}`,
            natural: undefined,
            sharp: `a#/${oct}`,
            doublesharp: undefined
          }
        },
        {
          audioName: `B${oct}`,
          octave: oct,
          pitchNumber: 14 + (oct - 1) * 12,
          pitchClass: 11,
          pitch: {
            doubleflat: undefined,
            flat: "C-flat",
            natural: "B-natural",
            sharp: undefined,
            doublesharp: "A-doublesharp"
          },
          vexNoteName: {
            doubleflat: undefined,
            flat: `cb/${oct + 1}`,
            natural: `b/${oct}`,
            sharp: undefined,
            doublesharp: `a##/${oct}`
          }
        }
      ]),

      // Octave 8: C8 only
      {
        audioName: "C8",
        octave: 8,
        pitchNumber: 87,
        pitchClass: 0,
        pitch: {
          doubleflat: "D-doubleflat",
          flat: undefined,
          natural: "C-natural",
          sharp: "B-sharp",
          doublesharp: undefined
        },
        vexNoteName: {
          doubleflat: "dbb/8",
          flat: undefined,
          natural: "c/8",
          sharp: "b#/7",
          doublesharp: undefined
        }
      }
    ];

    return pitches;
  };//--end method

  getVexNoteIndex(vexKeyName) {
    if (!this.chromaticPitches) {
      throw new Error("Chromatic pitches array is not initialized.");
    }
  
    for (let i = 0; i < this.chromaticPitches.length; i++) {
      const { vexNoteName: chromaticPitch } = this.chromaticPitches[i];
  
      if (chromaticPitch.natural === vexKeyName ||
          chromaticPitch.sharp === vexKeyName ||
          chromaticPitch.flat === vexKeyName) {
        return i; // Found the index
      }
    }
  
    return -1; // Not found
  };//--end method

  mod7 = scaleDegree => ((scaleDegree - 1) % 7) + 1;

  getAccidentalName = (inputState, alterBy) => {
    const accidentalMap = ['doubleflat', 'flat', 'natural', 'sharp', 'doublesharp'];

    return accidentalMap[accidentalMap.indexOf(inputState) + alterBy];
  };//--end method

  getScale(tonic, mode, base) {
    const scale = {
      tonic: tonic,
      mode: mode,
      base: base
    };

    const chromatic = this.chromatic;

    scale.syllables = this.getSyllables(mode, base);

    scale.pitches = [];
    scale.degrees = {};

    let pitchName = scale.tonic; // hyphenated tonic  pitch name
    let pitchLetter = pitchName.split('-')[0]; // Extract the pitch letter before the hyphen
    let prevPitchObj;

    // Define the pitches of the scale
    for (let i = 0; i < 7; i++) {
      //iterate through chromatic aggregate to find the next root name:
      chromatic.forEach(pitch => {
        for (const state in pitch) {
          if (pitch[state] === pitchName) {
            //scale.pitches.push(rootName);
            const [_, accidental] = pitchName.split('-'); // Extract the accidental after the hyphen
            scale.degrees[i + 1] = {
                diatonic: pitchName,
                raised: `${pitchLetter}-${this.getAccidentalName(accidental, 1)}`,
                lowered: `${pitchLetter}-${this.getAccidentalName(accidental, -1)}`,
            };
            prevPitchObj = pitch;
          }
        }
      });

      // Define the next pitch in the loop
      const nextPitchIndex = (prevPitchObj.pitchClass + this.intervals[scale.mode][i]) % 12;
      pitchLetter = this.pitchLetters[(this.pitchLetters.indexOf(pitchLetter) + 1) % 7];
      const nextPitchObj = chromatic[nextPitchIndex];
      for (const nextKey in nextPitchObj) {
          if (nextKey !== "pitchClass") {
            if (nextPitchObj[nextKey]) {
              if (nextPitchObj[nextKey].split('-')[0] === pitchLetter) {
                pitchName = nextPitchObj[nextKey];
              }
            }        
          }
      }
    }

    return scale;
  };//--end method

  getSyllables = (mode, base) => {
    const syllables = {
        labased: {
            major: {
              1: {"diatonic":"do","raised":"di","lowered":"do-"}, 
              2: {"diatonic":"re","raised":"ri","lowered":"ra"}, 
              3: {"diatonic":"mi","raised":"mi+","lowered":"me"}, 
              4: {"diatonic":"fa","raised":"fi","lowered":"fa-"}, 
              5: {"diatonic":"sol","raised":"si","lowered":"se"}, 
              6: {"diatonic":"la","raised":"li","lowered":"le"}, 
              7: {"diatonic":"ti","raised":"ti+","lowered":"te"}
            },
            minor: {
              1: {"diatonic":"la","raised":"li","lowered":"le"}, 
              2: {"diatonic":"ti","raised":"ti+","lowered":"te"},
              3: {"diatonic":"do","raised":"di","lowered":"do-"},
              4: {"diatonic":"re","raised":"ri","lowered":"ra"},  
              5: {"diatonic":"mi","raised":"mi+","lowered":"me"}, 
              6: {"diatonic":"fa","raised":"fi","lowered":"fa-"}, 
              7: {"diatonic":"sol","raised":"si","lowered":"se"},              
            },
        },
        dobased: {
          major: {
            1: {"diatonic":"do","raised":"di","lowered":"do-"}, 
            2: {"diatonic":"re","raised":"ri","lowered":"ra"}, 
            3: {"diatonic":"mi","raised":"mi+","lowered":"me"}, 
            4: {"diatonic":"fa","raised":"fi","lowered":"fa-"}, 
            5: {"diatonic":"sol","raised":"si","lowered":"se"}, 
            6: {"diatonic":"la","raised":"li","lowered":"le"}, 
            7: {"diatonic":"ti","raised":"ti+","lowered":"te"}
          },
          minor: {
            1: {"diatonic":"do","raised":"di","lowered":"do-"}, 
            2: {"diatonic":"re","raised":"ri","lowered":"ra"}, 
            3: {"diatonic":"me","raised":"mi","lowered":"me-"}, 
            4: {"diatonic":"fa","raised":"fi","lowered":"fa-"}, 
            5: {"diatonic":"sol","raised":"si","lowered":"se"}, 
            6: {"diatonic":"le","raised":"li","lowered":"le-"}, 
            7: {"diatonic":"te","raised":"ti","lowered":"te-"}
          },
        },
        numbers: {
            major: ["1", "2", "3", "4", "5", "6", "7"],
            minor: ["1", "2", "3", "4", "5", "6", "7"]
        },
        fixed: {
            major: ["do", "re", "mi", "fa", "sol", "la", "ti"],
            minor: ["do", "re", "mi", "fa", "sol", "la", "ti"]
        }
    };

    // Return the syllables if the base is not "count"
    return base !== "count" ? syllables[base][mode] : [];
  };//--end method

  convertVexKeyNameToPitchName = (vexKeyName) => {
    const pitchClassMap = {
        c: "C",
        d: "D",
        e: "E",
        f: "F",
        g: "G",
        a: "A",
        b: "B",
    };

    // Extract the pitch letter and accidentals
    const pitchLetter = pitchClassMap[vexKeyName[0].toLowerCase()];
    const accidental = vexKeyName.slice(1);

    // Map the accidental symbols to their names
    const accidentalMap = {
        "": "natural",
        "#": "sharp",
        "##": "doublesharp",
        "b": "flat",
        "bb": "doubleflat",
    };

    // Convert the accidental to its name
    const accidentalName = accidentalMap[accidental] || undefined;

    // Combine the pitch letter and accidental
    return `${pitchLetter}-${accidentalName}`;
  };//--end method

  findPitchInScaleByName(pitch, scale) {
    const scaleDegrees = scale.degrees;
    for (const degree of Object.keys(scaleDegrees)) {
      for (const state of Object.keys(scaleDegrees[degree])) {
        if (pitch === scaleDegrees[degree][state]) {
            return { degree, state };
        }
      }
    }

    return null; // Return null if no match is found
  };//--end method

  findPitchInScaleByDegreeAndState(pitchDegree, pitchState, scale) {
    const scaleDegrees = scale.degrees;
    for (const degree of Object.keys(scaleDegrees)) {
      if (degree === pitchDegree) {
        for (const state of Object.keys(scaleDegrees[degree])) {
          if (state === pitchState) {
              return scaleDegrees[degree][state];
          }
        }
      }
    }

    return null; // Return null if no match is found
  };//--end method

  findClosestDistanceBetweenTonics = (pitch1, pitch2) => {
    const aggregate = this.chromatic;
    // Helper function to find the pitchClass for a given pitch name
    const getPitchClass = (pitch, aggregate) => {
      for (const item of aggregate) {
          if (Object.values(item).includes(pitch)) {
              return item.pitchClass;
          }
      }
      throw new Error(`Pitch "${pitch}" not found in the aggregate.`);
    };

    // Get pitchClass for each pitch
    const pitchClass1 = getPitchClass(pitch1, aggregate);
    const pitchClass2 = getPitchClass(pitch2, aggregate);

    // Calculate distances in both directions in modulo 12 space
    const forwardDistance = (pitchClass2 - pitchClass1 + 12) % 12;
    const backwardDistance = -((pitchClass1 - pitchClass2 + 12) % 12);

    // Return the smaller distance (forward is positive, backward is negative)
    return Math.abs(forwardDistance) <= Math.abs(backwardDistance)
        ? forwardDistance
        : backwardDistance;
  };

  findNewTonicByTransposeInterval = (pitch, transposeInterval) => {
    // Helper function to find the pitchClass for a given pitch name
    const getPitchClass = (pitch, chromatic) => {
      for (const item of chromatic) {
          if (Object.values(item).includes(pitch)) {
              return item.pitchClass;
          }
      }
      throw new Error(`Pitch "${pitch}" not found in the aggregate.`);
    };

    // Helper function to get the pitch from a given pitch class
    const getPitchName = (pitch, pitchClass, chromatic) => {
      for (const chromaticPitchObject of chromatic) {
        if (chromaticPitchObject.pitchClass === pitchClass) {
          const pitchState = pitch.split('-')[1];
          return chromaticPitchObject[pitchState];
        }
      }
      throw new Error(`Pitch "${pitch}" not found in the aggregate.`);
    };

    
    const pitchClass1 = getPitchClass(pitch, this.chromatic);
    const pitchClass2 = (pitchClass1 + transposeInterval) % 12;

    
    return getPitchName(pitch, pitchClass2, this.chromatic);
    
  };

  convertVexToHyphenatedPitch = (vexPitch) => {
    // Map for converting pitch letters to uppercase letters
    const pitchLetterMap = {
        c: "C",
        d: "D",
        e: "E",
        f: "F",
        g: "G",
        a: "A",
        b: "B",
    };

    // Extract the pitch letter and accidental part
    const pitchLetter = pitchLetterMap[vexPitch[0].toLowerCase()];
    const accidental = vexPitch.slice(1);

    // Map accidental symbols to their hyphenated names
    const accidentalMap = {
        "": "natural",
        "#": "sharp",
        "##": "doublesharp",
        "b": "flat",
        "bb": "doubleflat",
    };

    // Convert accidental to its name or throw an error if invalid
    const accidentalName = accidentalMap[accidental];
    if (!accidentalName) {
        throw new Error(`Invalid accidental: "${accidental}"`);
    }

    // Combine the pitch letter and accidental name
    return `${pitchLetter}-${accidentalName}`;
  };

  getSolfegeForVexKey(key, scale) {
    const pitchName =  this.convertVexKeyNameToPitchName(key.split('/')[0]);
    let syl = "";
    Object.keys(scale.degrees).forEach(degree => {
      Object.keys(scale.degrees[degree]).forEach(state => {
        if (scale.degrees[degree][state] === pitchName) {
          syl = scale.syllables[degree][state];
        }
      });
    });

    return syl;
  };


  getIndexOfPositionFromVexKey (key, scale) {
    for (const [degree, statesObj] of Object.entries(scale.degrees)) {
      for (const [state, pitchName] of Object.entries(statesObj)) {
        if (T.convertVexKeyNameToPitchName(key.split('/')[0]) === pitchName) {
          const octave = parseInt(key.split('/')[1]);
  
          const foundPosition = T.positions.find(position =>
            position.octave === octave && position.pitchNames.includes(pitchName)
          );
  
          return foundPosition ? T.positions.indexOf(foundPosition) : -1;
        }
      }
    }
    return -1; // Return -1 if no match is found
  };

  getChromaticPitchesIndexFromVexKey(key) {
    for (let index = 0; index < this.chromaticPitches.length; index++) {
      const chromaticPitch = this.chromaticPitches[index];
      for (const vexNoteName of Object.values(chromaticPitch.vexNoteName)) {
          if (vexNoteName === key) {
              return index;
          }
      }
    }

    return -1;
  };

  getNoteNameFromMidi(midi) {
    const pitchIndex = midi - 21; // MIDI 21 = A0 = chromaticPitches[0]
    if (pitchIndex < 0 || pitchIndex >= this.chromaticPitches.length) return null;

    const pitch = this.chromaticPitches[pitchIndex];
    // Choose a default spelling (natural > sharp > flat)
    return pitch.pitch.natural?.replace("-natural", "") + pitch.octave
        || pitch.pitch.sharp?.replace("-sharp", "#") + pitch.octave
        || pitch.pitch.flat?.replace("-flat", "b") + pitch.octave;
  };

  getDegreeState(noteKeyOrName, scale) {
    const s = String(noteKeyOrName || "");
    let pitchName;

    if (s.includes("/")) {
      // VexFlow key form like "c#/4"
      pitchName = this.convertVexKeyNameToPitchName(s.split("/")[0]);
    } else if (s.includes("-")) {
      // Already hyphenated form like "C-sharp"
      pitchName = s;
    } else {
      // Plain form like "C#", "Bb"
      pitchName = this.convertVexKeyNameToPitchName(s);
    }

    // Default if not found
    let state = "diatonic";
    const degrees = scale?.degrees || {};
    Object.keys(degrees).forEach(degree => {
      Object.keys(degrees[degree]).forEach(degreeState => {
        if (degrees[degree][degreeState] === pitchName) state = degreeState;
      });
    });
    return state; // "diatonic" | "raised" | "lowered"
  }

}

const T = new Tonal();
export { T };