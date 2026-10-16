// public/modules/ScoreManager/ScoreStaff.js

const tonicToDoMap = {
  C: 3, D: 6, E: 2, F: 5, G: 1, A: 4, B: 0,
};

export const ScoreStaff = {
  /**
   * Draws the solfege staff overlay (22 horizontal guides) with:
   *  - Do stripe + bold Do line
   *  - (Minor only) optional La stripe + styled La line
   *
   * @param {HTMLElement} container  #notation element that contains the SVG
   * @param {number} staveWidth      width of this measure’s stave block
   * @param {number} startX          left X of the stave block
   * @param {number} startY          top Y of the first guide line
   * @param {string} tonic           e.g., "C", "F#", "Bb"
   * @param {string} mode            "major" | "minor"
   * @param {number} yHeight         vertical spacing between guide lines
   */
drawSolfegeStaff(container, staveWidth, startX, startY, tonic, mode, yHeight, base) {
  const svg = container.querySelector('svg');
  if (!svg) return;

  const m = String(mode || 'major').trim().toLowerCase(); // "major" | "minor"
  const tonicLetter = String(tonic || 'C')[0];            // C, D, E, F, G, A, B

  // --- normalize base: "labased" (default) | "dobased"
  const baseNorm = String(base || 'labased')
    .toLowerCase()
    .replace(/\s|_/g, '')
    .replace(/-based$/, 'based'); // e.g., "do-based" -> "dobased"

  const mapVal = tonicToDoMap[tonicLetter] ?? 3; // default to C if unknown
  const mod7 = (n) => ((n % 7) + 7) % 7;

  // In your existing system:
  //  - Major: Do index = mapVal
  //  - Minor (la-based): Do index = mapVal + 6; La = Do + 1
  //  - Minor (do-based): Do should be where La would be in la-based minor => (mapVal + 6) + 1
  let doLineIndex;
  if (m === 'major') {
    doLineIndex = mapVal;
  } else {
    doLineIndex = (baseNorm === 'dobased') ? (mapVal + 7) : (mapVal + 6);
  }

  const doStripeIndex = doLineIndex + 3;

  // La indices (only used when we actually show La)
  const laLineIndex   = doLineIndex + 1; // this matches your current scheme
  const laStripeIndex = laLineIndex + 3;

  // --- Settings
  const S = (typeof window !== 'undefined' && window.solfegeSettings) ? window.solfegeSettings : {};

  // Do (existing)
  const doStripeColor     = S.stripeColor ?? '#36914e';
  const doStripeOpacityPc = Number.isFinite(S.stripeOpacity) ? S.stripeOpacity : 70;
  const doStripeOpacity   = Math.max(0, Math.min(100, doStripeOpacityPc)) / 100;
  const doLineColor       = S.doLineColor ?? '#006400';
  const doLineThickness   = Number.isFinite(S.doLineThickness) ? S.doLineThickness : 2;

  // La (new)
  const laEnabledSetting  = (typeof S.laEnabled === 'boolean') ? S.laEnabled : true;
  // showLa only if: minor mode, settings allow it, and NOT do-based minor
  const showLa            = (m === 'minor') && laEnabledSetting && (baseNorm !== 'dobased');

  const laLineColor       = S.laLineColor ?? '#8B0000';
  const laLineThickness   = Number.isFinite(S.laLineThickness) ? S.laLineThickness : doLineThickness;
  const laLineDash        = (S.laLineDash ?? S.laDash ?? '4,2');
  const laStripeColor     = S.laStripeColor ?? '#ffcccc';
  const laStripeOpacityPc = Number.isFinite(S.laStripeOpacity) ? S.laStripeOpacity : 40;
  const laStripeOpacity   = Math.max(0, Math.min(100, laStripeOpacityPc)) / 100;

  // --- Draw 22 guides
  for (let i = 0; i < 22; i++) {
    const yTop = startY + yHeight * i;

    // stripes
    if (mod7(i) === mod7(doStripeIndex)) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width',  String(staveWidth));
      rect.setAttribute('height', String(yHeight));
      rect.setAttribute('x',      String(startX));
      rect.setAttribute('y',      String(yTop));
      rect.setAttribute('style',  `fill:${doStripeColor}; fill-opacity:${doStripeOpacity}; stroke-width:0;`);
      svg.appendChild(rect);
    }
    if (showLa && (mod7(i) === mod7(laStripeIndex))) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width',  String(staveWidth));
      rect.setAttribute('height', String(yHeight));
      rect.setAttribute('x',      String(startX));
      rect.setAttribute('y',      String(yTop));
      rect.setAttribute('style',  `fill:${laStripeColor}; fill-opacity:${laStripeOpacity}; stroke-width:0;`);
      svg.appendChild(rect);
    }

    // lines
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(startX));
    line.setAttribute('y1', String(yTop));
    line.setAttribute('x2', String(startX + staveWidth));
    line.setAttribute('y2', String(yTop));

    const isDoLine = (mod7(i) === mod7(doLineIndex));
    const isLaLine = showLa && (mod7(i) === mod7(laLineIndex));

    if (isDoLine) {
      line.setAttribute('style', `stroke:${doLineColor}; stroke-width:${doLineThickness}px; fill:none;`);
    } else if (isLaLine) {
      const dash = (laLineDash && String(laLineDash).trim().length) ? `; stroke-dasharray:${laLineDash}` : '';
      line.setAttribute('style', `stroke:${laLineColor}; stroke-width:${laLineThickness}px; fill:none${dash};`);
    } else {
      line.setAttribute('style', 'stroke:black; stroke-width:1px; fill:none;');
    }

    svg.appendChild(line);
  }
}

};
