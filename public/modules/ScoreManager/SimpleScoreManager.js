import { ScoreManager } from "./ScoreManager.js";
import { ScoreAnimator } from "./ScoreAnimator.js";
import { T } from "../../modules/Tonal/Tonal.js";

export class SimpleScoreManager extends ScoreManager {
  loadFromObject(scoreObj) {
    this.currentXML = null;               // bypass XML path
    this.score = scoreObj || { measures: [] };

    if (scoreObj.timeSignature) this.timeSignature = scoreObj.timeSignature;
    if (scoreObj.mode) this.mode = scoreObj.mode;
    if (scoreObj.tonic) this.tonic = scoreObj.tonic;
    if (scoreObj.base) this.base = scoreObj.base;

    // Prepare Tonal scale:
    this.scale = T.getScale(
      T.convertVexKeyNameToPitchName(this.tonic),
      this.mode,
      this.base
    );

    this.renderToVex();
    this.createPlayhead?.();
  }

  sendToPlay(audioPlayer, stacks) {
    // Use ScoreAnimator
    ScoreAnimator.sendToPlay.call(this, audioPlayer, stacks);
  }
}
