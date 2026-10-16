// // public/modules/ScoreManager/ScoreBarlines.js:

export const ScoreBarlines = {
  addBarline (measure, stave) {
    const VF = this.VF; // Access VF from the class context
    // Handle barlines
    const barlineElements = measure.barlines;
    if (barlineElements) {
      barlineElements.forEach(barlineElement => {

        if (barlineElement.location == 'right') {
          const barStyle = barlineElement.style;
          switch (barStyle) {
            case "light-light":
              stave.setEndBarType(VF.Barline.type.DOUBLE);
              break;
            case "light-heavy":
              stave.setEndBarType(VF.Barline.type.END);
              break;
            case "heavy-light":
              stave.setEndBarType(VF.Barline.type.REPEAT_BEGIN);
              break;
            case "light":
              stave.setEndBarType(VF.Barline.type.SINGLE);
              break;
            default:
              stave.setEndBarType(VF.Barline.type.SINGLE);
              break;
          }
        }
      });
    }
  },

  addRepeatStart (measure, stave) {
    // Add section begin repeat barline if present
    const repeatStart = measure.querySelector("barline[location='left']");
    if (repeatStart) {
      stave.setBegBarType(VF.Barline.type.REPEAT_BEGIN);
    }
  },

  hasBarline(measure) {
    const barlineElement = measure.querySelector("barline[location='right']");
    return (barlineElement === true);
  },

  drawSolfegeBarline(container, startX, startY, staffHeight) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttributeNS(null, 'x1', startX);
      line.setAttributeNS(null, 'y1', startY);
      line.setAttributeNS(null, 'x2', startX);
      line.setAttributeNS(null, 'y2', startY + staffHeight);
      line.setAttributeNS(null, 'style', `stroke: rgb(0, 0, 0); stroke-width: 1px;` );
      container.querySelector('svg').appendChild(line);
  }
};