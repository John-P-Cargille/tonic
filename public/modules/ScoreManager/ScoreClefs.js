// public/modules/ScoreManager/ScoreClefs.js:

export const ScoreClefs = {
  getClefs (measure, numStaves) {
    // Extract clef from the measure
    let clefs = new Array(numStaves);
    const clefElements = measure.querySelectorAll("clef");
    clefElements.forEach(clefElement => {
      let clef;
      const clefNumber = parseInt(clefElement?.getAttribute("number") || "1"); // Default to "1"
      const sign = clefElement.querySelector("sign")?.textContent || "G";
      const line = clefElement.querySelector("line")?.textContent || "2";
      // Map MusicXML clef sign to VexFlow clef
      switch (sign) {
          case "G":
            clef = "treble";
              break;
          case "F":
            clef = "bass";
              break;
          case "C":
            clef = "alto"; // For simplicity, map to alto clef
              break;
          default: break;
      }
      clefs[clefNumber - 1] = clef;
    });

    return clefs;
    
  }
};