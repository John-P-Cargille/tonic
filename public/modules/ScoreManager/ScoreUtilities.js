// public/modules/ScoreManager/ScoreUtilities.js:

export const ScoreUtilities = {
  convertFifthsToKey(fifths, mode) {
    const keys = {
      major: ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "E#"],
      minor: ["A", "E", "B", "F#", "C#", "G#", "D#", "A#", "E#", "B#", "F##"]
    };
  
    const flatKeys = {
      major: ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"],
      minor: ["D", "G", "C", "F", "Bb", "Eb", "Ab"]
    };
  
    if (fifths >= 0) {
      return keys[mode][fifths];
    } else {
      return flatKeys[mode][-fifths - 1];
    }
  },

  convertPitchLetterToVexKeyName(pitchLetter, numFifths) {

    if (pitchLetter == undefined || numFifths == undefined) throw Error ('invalid argument');

    const pitchToSymbolMap = {
      "0":["c","d","e","f","g","a","b"],
      "1":["c","d","e","f#","g","a","b"],
      "2":["c#","d","e","f#","g","a","b"],
      "3":["c#","d","e","f#","g#","a","b"],
      "4":["c#","d#","e","f#","g#","a","b"],
      "5":["c#","d#","e","f#","g#","a#","b"],
      "6":["c#","d#","e#","f#","g#","a#","b"],
      "7":["c#","d#","e#","f#","g#","a#","b#"],
      "-1":["c","d","e","f","g","a","bb"],
      "-2":["c","d","eb","f","g","a","bb"],
      "-3":["c","d","eb","f","g","ab","bb"],
      "-4":["c","db","eb","f","g","ab","bb"],
      "-5":["c","db","eb","f","gb","ab","bb"],
      "-6":["cb","db","eb","f","gb","ab","bb"],
      "-7":["cb","db","eb","fb","gb","ab","bb"],
    };

    const scale = pitchToSymbolMap[numFifths];
    let matchedElement = undefined;
    scale.forEach((element) => {
      if (element[0] === pitchLetter.toLowerCase()) {
        matchedElement = element;
      } 
    });

    if (!matchedElement) throw Error('no match for pitch letter');

    return matchedElement;
  },//--end method

  convertKeyToFifths(newTonic, mode) {
    const tonicToFifthsMap = {
      "C": 0,
      "G": 1,
      "D": 2,
      "A": 3,
      "E": 4,
      "B": 5,
      "F#": 6,
      "C#": 7,
      "F": -1,
      "Bb": -2,
      "Eb": -3,
      "Ab": -4,
      "Db": -5,
      "Gb": -6,
      "Cb": -7
    };
  
    const minorAdjustment = {
      "F": -4,
      "C": -3,
      "G": -2,
      "D": -1,
      "A": 0,
      "E": 1,
      "B": 2,
      "F#": 3,
      "C#": 4,
      "G#": 5,
      "D#": 6,
      "A#": 7,
      "Bb": -5,
      "Eb": -6,
      "Ab": -7,
      "Db": -8,
      "Gb": -9,
      "Cb": -10
    };
  
    // Adjust the fifths based on the mode
    if (mode === "minor") {
      return minorAdjustment[newTonic];
    } else {
      return tonicToFifthsMap[newTonic];
    }
  },  

  convertVexKeysToNoteNames(keys, noteIsRest) {
    if (noteIsRest) return undefined; // Skip rests
    
    // Mapping from VexFlow keys to audio player note names
    const sharpToFlatMap = {
      "a#": "bb",
      "b#": "c",
      "c#": "db",
      "d#": "eb",
      "e#": "f",
      "f#": "gb",
      "g#": "ab",
      "a##": "b",
      "b##": "db",
      "c##": "d",
      "d##": "e",
      "e##": "gb",
      "f##": "g",
      "g##": "a",
      "cb": "b",
      "fb": "e",
      "abb": "g",
      "bbb": "a",
      "cbb": "bb",
      "dbb": "c",
      "ebb": "d",
      "fbb": "eb",
      "gbb": "f"
    };
  
    return keys.map((key) => {
      let [note, octave] = key.split("/"); // Split "g/4" into "g" and "4"

      if (note == "cb" || note == "cbb") octave--;//audio note name is pitch class, so the octave must be modified
      if (note == "b#" || note == "b##") octave++;// I think??
  
      // Convert sharp notes to their flat equivalents if necessary
      const flatNote = sharpToFlatMap[note] || note;

      let noteName = `${flatNote.charAt(0).toUpperCase()}${flatNote.slice(1)}${octave}`;

      if (noteIsRest) noteName = undefined;
      return noteName;
    });
  },//--end of method

};