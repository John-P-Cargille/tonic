// public/modules/UIManager/AssignedSettingsManager.js

export function manageAssignedSettingsBtn(ui) {
  const btn = document.getElementById("assignedSettings");
  if (!btn) return;

  let assignedByFile = {};

  // Hide by default on first load
  btn.style.display = "none";

  (async () => {
    try {
      const resp = await fetch("/api/lib/list", { cache: "no-store" });
      let data = await resp.json();
      data = data.map(item => (typeof item === "string" ? { file: item } : item));
      assignedByFile = Object.fromEntries(
        data.filter(e => e && e.file).map(e => [e.file, e.presets?.assigned || null])
      );
      _updateAssignedBtnState();
    } catch (e) {
      console.error("Failed to load fileList.json:", e);
      btn.style.display = "none";
    }
  })();

  btn.addEventListener("click", () => {
    const file = _getCurrentFileName(ui);
    const preset = file ? assignedByFile[file] : null;
    if (!preset) return;
    _applyAssignedSettings(ui, preset);
  });

  window.addEventListener("score:loaded", _updateAssignedBtnState);

  function _updateAssignedBtnState() {
    const file = _getCurrentFileName(ui);
    const preset = file ? assignedByFile[file] : null;  // <-- define it!
    if (preset) {
      btn.style.display = "inline-block";
      btn.disabled = false;
    } else {
      btn.style.display = "none";
    }
  }
}

/* ----------------- helpers ----------------- */
function _getCurrentFileName(ui) {
  if (ui?.scoreManager?.currentFileName) return ui.scoreManager.currentFileName;
  const t = document.getElementById("scoreTitleText")?.textContent?.trim();
  return t ? (t.endsWith(".xml") ? t : `${t}.xml`) : null;
}

function _applyAssignedSettings(ui, preset) {
  const sm = ui.scoreManager;
  const ap = ui.audioPlayer;

  if (typeof preset.tempo === "number" && preset.tempo > 0) sm.tempo = preset.tempo;
  if (preset.staff) sm.solfegeStaff = (preset.staff === "solfege");
  if (typeof preset.audio === "boolean" && ap) {
    ap.audioEnabled = preset.audio;
    _updateAudioToggleIcon(ap);
  }

  if (preset.key) {
    if (typeof sm.transposeInto === "function") sm.transposeInto(preset.key);
    else if (typeof sm.transpose === "function") sm.transpose(preset.key);
    else _rerender(sm, ui.onRenderScore);
  } else {
    _rerender(sm, ui.onRenderScore);
  }

  if (typeof preset.syllables === "boolean") _setSyllablesVisible(preset.syllables);
  if (typeof sm.sendToPlay === "function") sm.sendToPlay(ap, sm.VFNoteStacks);
}

function _setSyllablesVisible(show) {
  document.querySelectorAll("g > circle").forEach(c => {
    const g = c.parentNode;
    if (g && g.style) g.style.display = show ? "inline" : "none";
  });
}

function _updateAudioToggleIcon(ap) {
  const btn = document.getElementById("toggleAudioBtn");
  if (btn && ap) btn.textContent = ap.audioEnabled ? "🔊" : "🔇";
}

function _rerender(sm, onRenderScore) {
  if (!sm?.currentXML || typeof onRenderScore !== "function") return;
  const xmlString = new XMLSerializer().serializeToString(sm.currentXML);
  onRenderScore(xmlString);
}
