// public/modules/ScoreManager/ScoreAccidentals.js:

export const ScoreAccidentals = {
  convertXMLAccidental(xmlAccidental) {

    if (xmlAccidental === undefined) return undefined;

    const accidentalMap = {
      "sharp": "#",
      "flat": "b",
      "natural": "n",
      "double-sharp": "##",
      "double-flat": "bb",
      "sharp-sharp": "##", // Alternate representation for double-sharp
      "flat-flat": "bb"    // Alternate representation for double-flat
      // Add other mappings if needed
    };
  
    return accidentalMap[xmlAccidental] || null;
  },

  getVexAccidental(scale, vexKey) {//currently not involving the scale
    const accidentalMap = {
      sharp: "#",
      flat: "b",
      natural: "n",
      doublesharp: "##",
      doubleflat: "bb",
      // Add other mappings if needed
    };

    const pitchName = T.convertVexKeyNameToPitchName(vexKey.split('/')[0]);

    return accidentalMap[pitchName.split('-')[1]];
  }
};