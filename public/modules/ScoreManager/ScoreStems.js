// public/modules/ScoreManager/ScoreStems.js

import { T } from "../Tonal/Tonal.js";

export const ScoreStems = {
  getStemDirection(vexNote, clef, numVoices, voiceIndex) {
    if (numVoices > 1) {
      if (voiceIndex == 0) {
        return this.VF.Stem.UP;
      } else {
        return this.VF.Stem.DOWN;
      }
    } else {
      let sumKeyIndexes = 0;
      vexNote.keys.forEach(element => {
        sumKeyIndexes += T.getVexNoteIndex(element);
      });
      const avgIndex = sumKeyIndexes / vexNote.keys.length;
      if (clef == 'treble') {
        if (avgIndex < 49) {
          return this.VF.Stem.UP;
        } else {
          return this.VF.Stem.DOWN;
        }
      } else {
        if (avgIndex <= 28) {
          return this.VF.Stem.UP;
        } else {
          return this.VF.Stem.DOWN;
        }
      }
    }
  }
};