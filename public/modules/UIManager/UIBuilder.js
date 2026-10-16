// public/modules/UIManager/UIBuilder.js

import { AudioPlayer } from '../AudioPlayer.js';

import { ScoreAnimator } from '../ScoreManager/ScoreAnimator.js';

import { ScoreTranspose } from '../ScoreManager/ScoreTranspose.js';

import { PitchTrackerInstance } from "../PitchDetector.js";

export const UIBuilder = {

  async manageScoresDropdown() {
    const container = document.getElementById("sidebarSections");
    if (!container) return;

    // --- load ---
    const resp = await fetch("/api/lib/list", { cache: "no-store" })
    const raw = await resp.json();
    const items = raw.map(it => (typeof it === "string" ? { file: it } : it));

    // --- helpers ---
    const displayName = f => f.replace(/\.xml$/i, "");

    // Canonical groups
    const groups = { mem: [], unit1: [], unit2: [], as3: [], other: [] };

    items.forEach(entry => {
      switch (entry.group) {
        case "Memorization patterns":
          groups.mem.push(entry);
          break;
        case "Unit I melodies":
          groups.unit1.push(entry);
          break;
        case "Unit II melodies":
          groups.unit2.push(entry);
          break;
        case "Aural Skills 3":
          groups.as3.push(entry);
          break;
        case "Supplementary materials":
          groups.other.push(entry);
          break;
        default:
          groups.other.push(entry);
          break;
      }
    });

    // --- modal wiring (with a11y fixes) ---
    const modalEl   = document.getElementById("scoresModal");
    const modalBody = document.getElementById("scoresModalBody");
    const modalTitle= document.getElementById("scoresModalLabel");
    if (!modalEl || !modalBody || !modalTitle || !window.bootstrap) return;

    const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
    let lastTrigger = null;

    modalEl.addEventListener("shown.bs.modal", () => {
      modalEl.querySelector(".btn-close")?.focus();
    });
    modalEl.addEventListener("hide.bs.modal", () => {
      const active = document.activeElement;
      if (active && modalEl.contains(active)) active.blur();
    });
    modalEl.addEventListener("hidden.bs.modal", () => {
      lastTrigger?.focus();
    });

    const openModalFor = (title, list, triggerEl) => {
      lastTrigger = triggerEl || null;
      modalTitle.textContent = title;
      modalBody.innerHTML = "";

      list
        .sort((a, b) => displayName(a.file).localeCompare(displayName(b.file), undefined, { numeric: true }))
        .forEach(entry => {
          const a = document.createElement("a");
          a.href = "#";
          a.className = "list-group-item list-group-item-action";
          a.textContent = displayName(entry.file);
          a.addEventListener("click", e => {
            e.preventDefault();
            a.blur();
            this.loadAndRenderFile(entry);
            bsModal.hide();
          });
          modalBody.appendChild(a);
        });

      bsModal.show();
    };

    const btn = sel => container.querySelector(`button[data-section="${sel}"]`);
    btn("mem")  ?.addEventListener("click", e => openModalFor("Memorization patterns", groups.mem,   e.currentTarget));
    btn("unit1")?.addEventListener("click", e => openModalFor("Unit I melodies",       groups.unit1, e.currentTarget));
    btn("unit2")?.addEventListener("click", e => openModalFor("Unit II melodies",       groups.unit2, e.currentTarget));
    btn("as3")?.addEventListener("click", e => openModalFor("Aural Skills 3",       groups.as3, e.currentTarget));
    btn("other")?.addEventListener("click", e => openModalFor("Other",                  groups.other, e.currentTarget));
  },


  manageFirstBtn() {
    const firstBtn = document.getElementById("firstBtn");
    firstBtn.addEventListener("click", () => {
      if (this.audioPlayer.isPlaying) return;

      const firstStack = ScoreAnimator.restructuredNotes[0];
      if (!firstStack) return;

      // Move playhead
      const playhead = document.getElementById("playhead");
      playhead.setAttribute(
        "transform",
        `translate(${firstStack.playHeadX}, ${firstStack.playHeadY})`
      );

      ScoreAnimator.repaintNoteheads(0);
      ScoreAnimator.adjustPausedTime(0, this.audioPlayer);
    });

    // SVG = Left-pointing bar with triangle
    firstBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect x="4" y="3" width="4" height="18" fill="white"></rect>
        <polygon points="20,3 10,12 20,21" fill="white"></polygon>
      </svg>`;

    firstBtn.disabled = true;
  },

  manageLastBtn() {
    const lastBtn = document.getElementById("lastBtn");
    lastBtn.addEventListener("click", () => {
      if (this.audioPlayer.isPlaying) return;

      const lastIndex = ScoreAnimator.restructuredNotes.length - 1;
      const lastStack = ScoreAnimator.restructuredNotes[lastIndex];
      if (!lastStack) return;

      const playhead = document.getElementById("playhead");
      playhead.setAttribute(
        "transform",
        `translate(${lastStack.playHeadX}, ${lastStack.playHeadY})`
      );

      ScoreAnimator.repaintNoteheads(lastIndex);
      ScoreAnimator.adjustPausedTime(lastIndex, this.audioPlayer);
    });

    // SVG = Right-pointing bar with triangle (flip of firstBtn)
    lastBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <polygon points="4,3 14,12 4,21" fill="white"></polygon>
        <rect x="16" y="3" width="4" height="18" fill="white"></rect>
      </svg>`;

    lastBtn.disabled = true;
  },

  managePlayPauseBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const playPauseBtn = document.getElementById('playPauseBtn');
    playPauseBtn.addEventListener("click", () => {
      // Use the passed AudioPlayer instance
      ScoreAnimator.togglePlayPause(this.audioPlayer);
    });
    playPauseBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <polygon points="5,3 19,12 5,21" fill="white"></polygon>
      </svg>`;
    playPauseBtn.disabled = true;
  },

  managePrevBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const prevBtn = document.getElementById('prevBtn');
    prevBtn.addEventListener("click", () => {
      // Use the passed AudioPlayer instance
      this.clickPrevBtn(this.audioPlayer);
    });
    prevBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <polygon points="19,3 12,12 19,21" fill="white"></polygon>
      <polygon points="12,3 5,12 12,21" fill="white"></polygon>
      </svg>`;
    prevBtn.disabled = true;
  },

  managePitchDetectBtn() {
    const pitchDetectBtn = document.getElementById("pitchDetectBtn");
    if (pitchDetectBtn) {
      pitchDetectBtn.innerHTML = "🎤 ";

      let isDetecting = false;

      pitchDetectBtn.addEventListener("click", async () => {
        console.log('clicked');
        const pitchDetectorDiv = document.getElementById("pitch-detector");

        if (!PitchTrackerInstance.active) {
          if (!isDetecting) {
            try {
              await PitchTrackerInstance.initialize();
              pitchDetectorDiv.innerHTML = "Pitch Detector listening...";
              isDetecting = true;
              console.log("Pitch detection started.");
            } catch (err) {
              console.error("Could not start pitch detection:", err);
            }
          }
        } else {
          PitchTrackerInstance.stop();
          pitchDetectorDiv.innerHTML = "Pitch detection stopped.";
          isDetecting = false;
        }
      });
    }
  },

  manageNextBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.addEventListener("click", () => {
      // Use the passed AudioPlayer instance
      this.clickNextBtn(this.audioPlayer);
    });
    nextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <polygon points="5,3 12,12 5,21" fill="white"></polygon>
      <polygon points="12,3 19,12 12,21" fill="white"></polygon>
      </svg>`;;
    nextBtn.disabled = true;
  },

  manageTransposeDropdown() {
    const transposeList = document.getElementById('transposeListItems');
    // Attach an event listener to the parent list to handle item selection
    transposeList.addEventListener('click', (event) => {
        // Check if the clicked element is a dropdown item
        if (event.target && event.target.classList.contains('dropdown-item')) {
          this.scoreManager.reRenderVexNotes(event.target.textContent);
          this.scoreManager.sendToPlay(this.audioPlayer, this.scoreManager.VFNoteStacks);
        }
    });
    //transposeStepUpBtn.disabled = true;
  },

  manageSolfegeBaseDropdown() {
    document.getElementById('solfegeBaseItems')?.addEventListener('click', (e) => {
      const a = e.target.closest('a.dropdown-item');
      if (!a) return;
      e.preventDefault();
      const base = a.dataset.base;            // "labased" | "dobased"
      if (!base) return;

      // persist + re-render
      window.solfegeSettings = window.solfegeSettings || {};
      window.solfegeSettings.base = base;

      // ScoreManager uses this.base; keep them in sync
      const sm = window.scoreManager;
      if (sm) {
        sm.base = base;
        if (sm.currentXML) {
          const xml = new XMLSerializer().serializeToString(sm.currentXML);
          window.app?.uiManager?.onRenderScore?.(xml);
        }
      }
    });

  },

  clickPrevBtn(audioPlayer) {
    const prevBtn = document.getElementById("prevBtn");
  
    if (!prevBtn) {
      console.error("Prev button not found in the DOM.");
      return;
    }
  
    if (audioPlayer.isPlaying) {
      console.log("Cannot move to the previous note while audio is playing.");
      return;
    }
  
    // Ensure we're not already at the first stack
    if (ScoreAnimator.accumulatedPlayBackTime > 0 && ScoreAnimator.restructuredNotes.length > 0) {
      let accumulatedDurations = 0;
      let targetIndex = -1;
  
      // Calculate the index of the previous stack
      for (let i = 0; i < ScoreAnimator.restructuredNotes.length; i++) {
        accumulatedDurations += ScoreAnimator.restructuredNotes[i].noteDuration;
  
        if (ScoreAnimator.accumulatedPlayBackTime <= accumulatedDurations) {
          // Move to the previous stack
          targetIndex = i;
          break;
        }
      }
  
      // Clamp the index to prevent going below 0
      targetIndex = Math.max(0, targetIndex);
  
      // Get the previous stack
      const previousStack = ScoreAnimator.restructuredNotes[targetIndex];
  
      // Update the playhead position
      const playhead = document.getElementById("playhead");
      playhead.setAttribute(
        "transform",
        `translate(${previousStack.playHeadX}, ${previousStack.playHeadY})`
      );
      
      //repaint the notes
      ScoreAnimator.repaintNoteheads(targetIndex);
  
      ScoreAnimator.adjustPausedTime(targetIndex, this.audioPlayer);
    }
  },
  

  clickNextBtn(audioPlayer) {
    const nextBtn = document.getElementById("nextBtn");
  
    if (!nextBtn) {
      console.error("Next button not found in the DOM.");
      return;
    }
  
    if (audioPlayer.isPlaying) {
      console.log("Cannot move to the next note while audio is playing.");
      return;
    }
    // Ensure we're not already at the last stack
    if (ScoreAnimator.accumulatedPlayBackTime >= 0 && ScoreAnimator.restructuredNotes.length > 0) {
      let accumulatedDurations = 0;
      let targetIndex = -1;
  
      // Calculate the index of the next stack
      for (let i = 0; i < ScoreAnimator.restructuredNotes.length; i++) {
        accumulatedDurations += ScoreAnimator.restructuredNotes[i].noteDuration;
  
        if (ScoreAnimator.accumulatedPlayBackTime < accumulatedDurations) {
          // Move to the next stack
          targetIndex = i + 1;
          break;
        }
      }

          // Ensure targetIndex stays within valid bounds
      if (targetIndex < 0 || targetIndex >= ScoreAnimator.restructuredNotes.length) {
        console.log("Already at the last stack or invalid target index.");
        return;
      }
  
      // Get the next stack
      const nextStack = ScoreAnimator.restructuredNotes[targetIndex];
  
      // Update the playhead position
      const playhead = document.getElementById("playhead");
      playhead.setAttribute(
        "transform",
        `translate(${nextStack.playHeadX}, ${nextStack.playHeadY})`
      );

      //repaint the noteheads:
      ScoreAnimator.repaintNoteheads(targetIndex);
  
      ScoreAnimator.adjustPausedTime(targetIndex, this.audioPlayer);
    }
  },

  manageControls() {
    // Apply draggable functionality after UI is created
    const controlsPanel = document.getElementById("controls");
    if (controlsPanel) {
      this.makeDraggable(controlsPanel);
    }
  },

  manageSidebar() {
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggleSidebar");
    const sidebarContent = sidebar.querySelectorAll("h3, ul, #sidebarSections, hr"); // Select everything except the button
  
    if (sidebar && toggleButton) {
      toggleButton.addEventListener("click", () => {
        const isCollapsed = sidebar.classList.toggle("sidebar-collapsed");
        sidebar.classList.toggle("sidebar-expanded", !isCollapsed);
        toggleButton.innerHTML = isCollapsed ? "&rarr;" : "&larr;"; // Update arrow direction
  
        // Hide content visually, but keep button accessible
        sidebarContent.forEach(item => {
          item.style.opacity = isCollapsed ? "0" : "1"; // Fade out
          item.style.pointerEvents = isCollapsed ? "none" : "auto"; // Disable interactions when collapsed
          item.style.transition = "opacity 0.3s ease-in-out"; // Smooth fade effect
        });
      });
    }
  },

  manageOctaveUpBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const octaveUpBtn = document.getElementById('octaveUpBtn');
    octaveUpBtn.addEventListener("click", () => {
      this.scoreManager.transposeBy(12);//send to ScoreTranspose
      this.scoreManager.sendToPlay(this.audioPlayer, this.scoreManager.VFNoteStacks);
    });
  },
  
  manageOctaveDownBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const octaveDownBtn = document.getElementById('octaveDownBtn');
    octaveDownBtn.addEventListener("click", () => {
      this.scoreManager.transposeBy(-12);//send to ScoreTranspose
      this.scoreManager.sendToPlay(this.audioPlayer, this.scoreManager.VFNoteStacks);
      
    });
  },

  manageStaffBtn() {
    // Add this inside the <script> tag at the bottom of the HTML
    const staffBtn = document.getElementById('staffBtn');
    staffBtn.addEventListener("click", () => {
      const savedTime = ScoreAnimator.accumulatedPlayBackTime;
      this.scoreManager.solfegeStaff = !this.scoreManager.solfegeStaff;
      this.scoreManager.renderToVex();
      this.scoreManager.sendToPlay(this.audioPlayer, this.scoreManager.VFNoteStacks);
      const targetIndex = ScoreAnimator.movePlayeheadToPausedTime(savedTime);
      ScoreAnimator.repaintNoteheads(targetIndex);
      if (this.audioPlayer.isPlaying) {
        ScoreAnimator.togglePlayPause(this.audioPlayer);
      }

    });
    staffBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <line x1="0" y1="1" x2="24" y2="1" style="stroke:white;stroke-width:1" />
        <line x1="0" y1="6" x2="24" y2="6" style="stroke:white;stroke-width:1" />
        <line x1="0" y1="11" x2="24" y2="11" style="stroke:white;stroke-width:1" />
        <line x1="0" y1="16" x2="24" y2="16" style="stroke:white;stroke-width:1" />
        <line x1="0" y1="21" x2="24" y2="21" style="stroke:white;stroke-width:1" />
        <rect width="24" height="4" x="0" y="12" fill="#7fbd73" />
        <ellipse cx="12" cy="13.5" rx="4" ry="3" style="fill:white;" />
    </svg>`;
    staffBtn.disabled = true;
  },

  manageToggleSylBtn() {
    const toggleSylBtn = document.getElementById("toggleSylBtn");
    toggleSylBtn.addEventListener("click", () => {
      const bubbles = document.querySelectorAll("g > circle");
      bubbles.forEach(bubble => {
        const group = bubble.parentNode;
        group.style.display = (group.style.display === "none") ? "inline" : "none";
      });
    });
  },

  manageToggleAudioBtn() {
    const toggleAudioBtn = document.getElementById("toggleAudioBtn");
    const player = this.audioPlayer; // avoid repeated lookup

    const renderIcon = () => {
      if (!player || !toggleAudioBtn) return;
      toggleAudioBtn.textContent = player.audioEnabled ? "🔊" : "🔇";
    };

    if (player) {
      renderIcon();
      toggleAudioBtn.addEventListener("click", () => {
        player.audioEnabled = !player.audioEnabled;
        renderIcon();
      });
    }
  },

  manageTempoBtn() {
    const tempoBtn = document.getElementById("tempoBtn");
    const tempoControls = document.getElementById("tempoControls");
    const tempoInput = document.getElementById("tempoInput");
    const setBtn = document.getElementById("tempoSetBtn");
    const cancelBtn = document.getElementById("tempoCancelBtn");

    tempoBtn.addEventListener("click", () => {
      if (tempoControls.style.display === "flex") {
        tempoControls.style.display = "none";
      } else {
        tempoControls.style.display = "flex";
        tempoInput.value = this.scoreManager.tempo;
      }
    });

    cancelBtn.addEventListener("click", () => {
      tempoControls.style.display = "none";
    });

    setBtn.addEventListener("click", () => {
      const currentTonic = scoreManager.tonic;
      const newTempo = parseInt(tempoInput.value, 10);
      if (!isNaN(newTempo) && newTempo > 0) {
        this.scoreManager.tempo = newTempo;
        if (this.scoreManager.currentXML) {
          const xmlString = new XMLSerializer().serializeToString(this.scoreManager.currentXML);
          this.onRenderScore(xmlString); // re-render score
          scoreManager.transposeInto(currentTonic);
          this.scoreManager.sendToPlay(this.audioPlayer, this.scoreManager.VFNoteStacks);
        }
      }
      tempoControls.style.display = "none";
    });
  },

  manageMetronomeBtn() {
    const btn = document.getElementById("metronomeBtn");
    const controls = document.getElementById("metronomeControls");
    const metronomeEnabledCheckbox = document.getElementById("metronomeEnabled");
    const countInEnabledCheckbox = document.getElementById("countInEnabled");
    const measuresInput = document.getElementById("countInMeasures");
    const setBtn = document.getElementById("metronomeSetBtn");
    const cancelBtn = document.getElementById("metronomeCancelBtn");

    const renderIcon = () => {
      btn.title = "Metronome settings";
      btn.innerHTML = ScoreAnimator.metronomeEnabled? `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <!-- outer body -->
        <path d="M12 2 L5 20 H19 Z" fill="none" stroke="white" stroke-width="1" stroke-linejoin="round"/>
        <!-- pendulum arm-->
        <line x1="11" y1="13.5" x2="18" y2="5.2" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        <!-- pendulum weight -->
        <rect width="4" height="4" x="18" y="1" stroke="white" stroke-width="1.6" fill="rgb(0, 140, 150)"
          transform="rotate(45, 20, 4)" />
      </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <!-- outer body -->
        <path d="M12 2 L5 20 H19 Z" fill="none" stroke="white" stroke-width="1" stroke-linejoin="round"/>
        <!-- pendulum arm-->
        <line x1="11" y1="11.5" x2="18" y2="5.2" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
        <!-- pendulum weight -->
        <rect width="4" height="4" x="18" y="1" stroke="white" stroke-width="1.6" fill="rgb(0, 140, 150)"
          transform="rotate(45, 20, 4)" />
        <!-- crossed lined-->
        <line x1="5" y1="5" x2="22" y2="20" stroke="red" stroke-width="2"/>
      </svg>`;
    };

    renderIcon();

    btn.addEventListener("click", () => {
      // Toggle panel visibility
      controls.style.display = controls.style.display === "flex" ? "none" : "flex";
      countInEnabledCheckbox.checked = ScoreAnimator.COUNT_IN.enabled;
      metronomeEnabledCheckbox.checked = ScoreAnimator.metronomeEnabled;
      measuresInput.value = ScoreAnimator.COUNT_IN.measures;
    });

    cancelBtn.addEventListener("click", () => {
      controls.style.display = "none";
    });

    setBtn.addEventListener("click", () => {
      ScoreAnimator.metronomeEnabled = metronomeEnabledCheckbox.checked;
      ScoreAnimator.COUNT_IN.enabled = countInEnabledCheckbox.checked;
      ScoreAnimator.COUNT_IN.measures = parseInt(measuresInput.value, 10) || 1;

      controls.style.display = "none";
      renderIcon();
    });

    btn.disabled = true;
  },

  managePlayReferenceBtn() {
    const btn = document.getElementById("playReferenceBtn");
    const controls = document.getElementById("playReferenceControls");
    const cancelBtn = document.getElementById("playReferenceCancelBtn");
    const playReferencePlayBtn = document.getElementById("playReferencePlayBtn");
    const playTonicTriadEnabledCheckbox = document.getElementById("playTonicTriadEnabled");
    const playCurrentNoteEnabledCheckbox = document.getElementById("playCurrentNoteEnabled");

    playTonicTriadEnabledCheckbox.addEventListener("change", () => {
      ScoreAnimator.playReference.playTonicTriadEnabled = playTonicTriadEnabledCheckbox.checked;
    });

    playCurrentNoteEnabledCheckbox.addEventListener("change", () => {
      ScoreAnimator.playReference.playCurrentNoteEnabled = playCurrentNoteEnabledCheckbox.checked;
    });

    const renderIcon = () => {
        btn.title = "Play reference settings";
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 500 500" width="24" height="24" preserveAspectRatio="xMidYMid meet" style="display:block">
            <!-- no background panel; transparent SVG -->
            <path d="M0 0 C6.27 0 12.54 0 19 0 C19 77.22 19 154.44 19 234 C29.43982597 225.9795383 29.43982597 225.9795383 39.8125 217.875 C40.72612305 217.15570313 40.72612305 217.15570313 41.65820312 216.421875 C43.10597719 215.28189542 44.55307317 214.14105474 46 213 C49.477063 216.21449303 52.09674186 219.81581006 54.6875 223.75 C55.3367041 224.73419922 55.3367041 224.73419922 55.99902344 225.73828125 C75.68223917 255.95839689 85.96922766 290.07293535 79.9375 326.375 C79.35115161 328.95602891 78.7282719 331.46128025 78 334 C77.76893555 334.80598633 77.53787109 335.61197266 77.29980469 336.44238281 C70.97028852 357.86719792 60.88826523 377.45692813 47 395 C37.66666667 388 28.33333333 381 19 374 C20.42131847 370.8389256 22.2830391 368.10800034 24.27490234 365.28076172 C40.68648202 341.78674834 49.08498891 314.89574365 44.31640625 286.14453125 C40.95102127 269.56408002 33.00399445 254.2118236 22.85351562 240.77685547 C22.31778931 240.06657196 21.78206299 239.35628845 21.23010254 238.6244812 C20.8241687 238.0884024 20.41823486 237.55232361 20 237 C19.99413376 237.93801453 19.98826752 238.87602905 19.98222351 239.84246826 C19.92475139 248.7274446 19.85186432 257.61218192 19.76428509 266.49691391 C19.71975544 271.06351674 19.68046207 275.63003392 19.65356445 280.19677734 C19.6273564 284.61251794 19.58683352 289.0279258 19.53681374 293.44345856 C19.52026239 295.11931435 19.50867569 296.79522754 19.50238609 298.47115326 C19.4627224 308.07759591 18.94536473 316.75363622 16 326 C15.63519531 327.1859375 15.27039063 328.371875 14.89453125 329.59375 C11.94030438 337.52856873 8.06058879 344.21998336 3 351 C2.45601562 351.72960937 1.91203125 352.45921875 1.3515625 353.2109375 C-10.56424584 367.91678877 -29.81125206 377.22334014 -48.50488281 379.27490234 C-67.29419332 380.56734625 -86.8851465 376.37911764 -101.6484375 364.09375 C-104.92124894 361.20600226 -107.96827879 358.13877351 -111 355 C-112.02867187 354.00033203 -112.02867187 354.00033203 -113.078125 352.98046875 C-125.24449403 340.40307374 -131.41179772 321.4701988 -131.5 304.25 C-131.12596036 283.85554055 -123.67190951 264.43430773 -109 250 C-99.03039406 241.00303854 -87.99591104 234.47605685 -75 231 C-74.1646875 230.77441406 -73.329375 230.54882812 -72.46875 230.31640625 C-54.98332765 226.40377316 -37.92727911 228.97295301 -21.875 236.5625 C-21.27856689 236.83578125 -20.68213379 237.1090625 -20.06762695 237.390625 C-12.62050153 241.16747395 -7.67094572 246.35535362 -1 252 C-0.505 127.26 -0.505 127.26 0 0 Z" fill="white" transform="translate(298,50)"/>
            <path d="M0 0 C6.27 0 12.54 0 19 0 C19 77.22 19 154.44 19 234 C29.43982597 225.9795383 29.43982597 225.9795383 39.8125 217.875 C40.42158203 217.39546875 41.03066406 216.9159375 41.65820312 216.421875 C43.10597719 215.28189542 44.55307317 214.14105474 46 213 C49.477063 216.21449303 52.09674186 219.81581006 54.6875 223.75 C55.3367041 224.73419922 55.3367041 224.73419922 55.99902344 225.73828125 C75.68223917 255.95839689 85.96922766 290.07293535 79.9375 326.375 C79.35115161 328.95602891 78.7282719 331.46128025 78 334 C77.76893555 334.80598633 77.53787109 335.61197266 77.29980469 336.44238281 C70.97028852 357.86719792 60.88826523 377.45692813 47 395 C37.66666667 388 28.33333333 381 19 374 C20.42131847 370.8389256 22.2830391 368.10800034 24.27490234 365.28076172 C40.68648202 341.78674834 49.08498891 314.89574365 44.31640625 286.14453125 C40.57049429 267.6893141 31.16365635 251.88487513 20 237 C19.67 259.11 19.34 281.22 19 304 C12.73 304 6.46 304 0 304 C-0.8660906 268.9090192 -1.09496023 233.85356012 -0.90999443 198.75310742 C-0.87381507 191.83904081 -0.84492154 184.92494809 -0.81623887 178.01084699 C-0.76496291 165.69364958 -0.70839008 153.37648299 -0.64819336 141.05932617 C-0.58993735 129.13681214 -0.53435837 117.21429028 -0.48217773 105.29174805 C-0.47730316 104.17828157 -0.47730316 104.17828157 -0.4723301 103.04232083 C-0.45603338 99.31615334 -0.43978716 95.58998563 -0.42356598 91.86381781 C-0.29019719 61.24250701 -0.14776543 30.62124492 0 0 Z" fill="white" transform="translate(298,50)"/>
            <path d="M0 0 C29.00639765 26.28704787 46.62132074 73.91492227 48.87109375 112.21875 C49.58845214 127.69630067 49.82636195 142.90769172 46 158 C45.79068848 158.82838379 45.58137695 159.65676758 45.36572266 160.51025391 C42.38541134 172.02442199 38.80097363 183.10771842 34 194 C33.71431152 194.65887207 33.42862305 195.31774414 33.13427734 195.99658203 C25.05017497 214.51009362 14.04064572 230.84770316 2 247 C-2.39413833 246.12152871 -5.21936913 243.71305685 -8.625 240.9375 C-9.23875488 240.44596436 -9.85250977 239.95442871 -10.48486328 239.44799805 C-11.7311127 238.44895335 -12.97510954 237.44709197 -14.21679688 236.44238281 C-15.85289045 235.11899277 -17.49484669 233.80350119 -19.140625 232.4921875 C-21.43108384 230.6663646 -23.71735965 228.83557945 -26 227 C-24.53502093 222.71533002 -22.35043371 219.59863092 -19.625 216 C-9.2903326 201.90065664 -0.85703408 186.4746527 5 170 C5.23799316 169.33162109 5.47598633 168.66324219 5.72119141 167.97460938 C7.32870824 163.36260682 8.73019441 158.71556911 10 154 C10.32097656 152.82050781 10.64195312 151.64101563 10.97265625 150.42578125 C19.50781582 113.06957124 7.84205706 75.2906621 -11.76757812 43.55908203 C-16.2230023 36.49844643 -21.03009241 29.705602 -26 23 C-24.45161795 18.64008212 -21.06103011 16.42617093 -17.5 13.75 C-16.23666668 12.78035491 -14.97364828 11.81029939 -13.7109375 10.83984375 C-12.77266113 10.12417236 -12.77266113 10.12417236 -11.81542969 9.39404297 C-9.22226002 7.40278439 -6.67342154 5.36072992 -4.125 3.3125 C-3.32320313 2.66925781 -2.52140625 2.02601563 -1.6953125 1.36328125 C-1.13585937 0.91339844 -0.57640625 0.46351563 0 0 Z" fill="white" transform="translate(382,230)"/>
            <path d="M0 0 C5.638777 3.58212563 10.99115196 7.44835512 16.25 11.5625 C16.83990723 12.02116455 17.42981445 12.4798291 18.03759766 12.95239258 C21.60580131 15.7689444 24.84802651 18.7236065 28 22 C27.23816406 23.0415625 26.47632813 24.083125 25.69140625 25.15625 C18.73568414 34.77098068 12.55195999 44.51679604 7 55 C6.18789062 56.485 6.18789062 56.485 5.359375 58 C-9.69592095 86.52582391 -16.13597917 123.48051246 -7 155 C-6.75781738 155.84191895 -6.51563477 156.68383789 -6.26611328 157.55126953 C0.1938244 179.21061061 10.56526744 198.87964524 24 217 C24.99966797 218.36318359 24.99966797 218.36318359 26.01953125 219.75390625 C27.32823168 221.51620777 28.65988262 223.26146934 30 225 C26.87268145 229.29133289 23.37598942 232.26969748 19.1875 235.4375 C15.28527946 238.42433513 11.4766897 241.3994085 7.875 244.75 C5 247 5 247 3.00488281 246.86425781 C0.50421712 245.78627967 -0.38197597 244.63562078 -1.953125 242.421875 C-2.48599121 241.67953613 -3.01885742 240.93719727 -3.56787109 240.17236328 C-4.12297363 239.3729834 -4.67807617 238.57360352 -5.25 237.75 C-5.8270166 236.9338623 -6.4040332 236.11772461 -6.99853516 235.27685547 C-11.62286519 228.67899451 -15.91055352 221.94297135 -20 215 C-20.58007812 214.07703125 -21.16015625 213.1540625 -21.7578125 212.203125 C-27.26718707 203.25965596 -31.15351436 193.74081289 -35 184 C-35.28262695 183.30277832 -35.56525391 182.60555664 -35.85644531 181.88720703 C-52.51373868 140.46553375 -49.37861557 93.82326111 -32.18579102 53.16601562 C-23.86013218 34.05914781 -12.62870871 16.53779347 0 0 Z" fill="white" transform="translate(110,229)"/>
            <path d="M0 0 C4.90205944 3.65251488 9.77403452 7.3425239 14.625 11.0625 C15.16278076 11.4735498 15.70056152 11.88459961 16.25463867 12.30810547 C19.914086 15.11996639 23.47127498 18.02760551 27 21 C26.38193283 24.43027279 25.08833245 26.48489314 23 29.25 C5.93279028 53.15110272 -2.14365483 80.06875494 2.40283203 109.61816406 C3.44883823 114.28743907 5.11862279 118.59847559 7 123 C7.43441406 124.15757812 7.86882812 125.31515625 8.31640625 126.5078125 C12.38051494 136.85913207 18.02942499 147.29942305 25.3671875 155.71484375 C27 158 27 158 26.77758789 159.9855957 C25.4651619 163.38554134 22.40493695 165.14357428 19.5625 167.25 C18.28594886 168.21938153 17.00991074 169.18943902 15.734375 170.16015625 C15.10208984 170.63727051 14.46980469 171.11438477 13.81835938 171.60595703 C10.45963699 174.1809174 7.23056466 176.91756006 3.98828125 179.63671875 C2 181 2 181 -1 181 C-2.86193664 178.70462892 -4.49882316 176.45591072 -6.125 174 C-6.85251465 172.91609985 -6.85251465 172.91609985 -7.59472656 171.81030273 C-18.42768107 155.45268332 -27.11671615 138.09340841 -32 119 C-32.17805176 118.33129883 -32.35610352 117.66259766 -32.53955078 116.97363281 C-34.27651234 109.62198538 -34.30464273 102.3126569 -34.26074219 94.80566406 C-34.25005311 92.63578122 -34.26067363 90.46673229 -34.2734375 88.296875 C-34.28209983 80.03100805 -33.72350469 72.10905055 -32 64 C-31.72800781 62.71609375 -31.45601563 61.4321875 -31.17578125 60.109375 C-28.72453332 50.57058216 -25.27610893 41.85372425 -21 33 C-20.70109863 32.37625488 -20.40219727 31.75250977 -20.09423828 31.10986328 C-14.89155111 20.41466915 -8.45976115 8.45976115 0 0 Z" fill="white" transform="translate(154,263)"/>
            <path d="M0 0 C6.27 0 12.54 0 19 0 C19.15196173 28.90748926 19.29734633 57.81500398 19.4332476 86.72257338 C19.44950752 90.17995801 19.46582482 93.63734237 19.48217773 97.09472656 C19.48543066 97.78267454 19.48868358 98.47062252 19.49203508 99.1794174 C19.53760648 108.79208484 19.58625436 118.40473229 19.6374263 128.01737148 C20.27783839 248.32329196 20.27783839 248.32329196 19 304 C12.73 304 6.46 304 0 304 C-0.8660906 268.9090192 -1.09496023 233.85356012 -0.90999443 198.75310742 C-0.87381507 191.83904081 -0.84492154 184.92494809 -0.81623887 178.01084699 C-0.76496291 165.69364958 -0.70839008 153.37648299 -0.64819336 141.05932617 C-0.58993735 129.13681214 -0.53435837 117.21429028 -0.48217773 105.29174805 C-0.47730316 104.17828157 -0.47730316 104.17828157 -0.4723301 103.04232083 C-0.45603338 99.31615334 -0.43978716 95.58998563 -0.42356598 91.86381781 C-0.29019719 61.24250701 -0.14776543 30.62124492 0 0 Z" fill="white" transform="translate(298,50)"/>
          </svg>`;
      };


    renderIcon();

    btn.addEventListener("click", () => {
      playTonicTriadEnabledCheckbox.checked = ScoreAnimator.playReference.playTonicTriadEnabled;
      playCurrentNoteEnabledCheckbox.checked = ScoreAnimator.playReference.playCurrentNoteEnabled;
      // Toggle panel visibility
      controls.style.display = controls.style.display === "flex" ? "none" : "flex";
    });

    cancelBtn.addEventListener("click", () => {
      controls.style.display = "none";
    });

    playReferencePlayBtn.addEventListener("click", () => {
      let tonicTriadDelay = 0;
      if (ScoreAnimator.playReference.playTonicTriadEnabled) {
        tonicTriadDelay += 3.5;
        for (const chromaticPitch of T.chromaticPitches) {
          const third = this.scoreManager.mode == "major" ? 4 : 3;
          if (chromaticPitch.pitchNumber >= 34 && chromaticPitch.pitchNumber <= 46) {
            Object.entries(chromaticPitch.pitch).forEach( pitchNames => {
              if (pitchNames.includes(this.scoreManager.scale.degrees["1"].diatonic)) {
                this.audioPlayer.playNote(chromaticPitch.audioName, this.audioPlayer.audioContext.currentTime, 3.0, { bypassMute: true });
                this.audioPlayer.playNote(T.chromaticPitches[T.chromaticPitches.indexOf(chromaticPitch) + third].audioName, this.audioPlayer.audioContext.currentTime + 0.5, 2.5, { bypassMute: true });
                this.audioPlayer.playNote(T.chromaticPitches[T.chromaticPitches.indexOf(chromaticPitch) + 7].audioName, this.audioPlayer.audioContext.currentTime + 1, 2.0, { bypassMute: true });
                this.audioPlayer.playNote(T.chromaticPitches[T.chromaticPitches.indexOf(chromaticPitch) + third].audioName, this.audioPlayer.audioContext.currentTime + 1.5, 1.5, { bypassMute: true });
                this.audioPlayer.playNote(chromaticPitch.audioName, this.audioPlayer.audioContext.currentTime + 2, 1.0, { bypassMute: true });
              }
            });
          }
        }
      }

      if (ScoreAnimator.playReference.playCurrentNoteEnabled) {
        const stacks = ScoreAnimator.restructuredNotes || [];
          if (!stacks.length) return;

          // Find the stack at the current playback position
          const EPS = 1e-6;
          const t = Math.max(0, ScoreAnimator.accumulatedPlayBackTime || 0);

          let idx = 0, acc = 0;
          if (t > EPS) {
            for (let i = 0; i < stacks.length; i++) {
              acc += stacks[i].noteDuration;
              if (t < acc) { idx = i; break; }
              // if we reach the end, clamp to last stack
              if (i === stacks.length - 1) idx = i;
            }
          } // else idx stays 0 (start of score)

          const stack = stacks[idx];
            // Pick a VF note in this stack that actually has noteNames (skip rests)
          const vf = stack.alignedNotes.find(n => Array.isArray(n.noteNames) && n.noteNames.length);
          if (!vf) return;

          // Only the first pitch:
          // const names = [vf.noteNames[0]];

          // All pitches in the stack simultaneously:
          const names = vf.noteNames;

          const playAt = this.audioPlayer.audioContext.currentTime + tonicTriadDelay;
          const dur = 1.25; // taste: short reference beep

          // Optional: skip tied “stop” notes so we don’t re-articulate the sustain
          const isStopped = (n, k) => Array.isArray(n.ties?.[k]) && n.ties[k].includes("stop");

          names.forEach((name, k) => {
            if (!isStopped(vf, k)) {
              this.audioPlayer.playNote(name, playAt, dur, { bypassMute: true });
            }
          });
      }
    });

    btn.disabled = true;
  },

  async fetchLibFiles() {
    const resp = await fetch('./lib/fileList.json', { cache: 'no-store' });
    let data = await resp.json();
    // Normalize strings → objects
    data = data.map(item => (typeof item === 'string' ? { file: item } : item));
    return data;
  },

async loadAndRenderFile(fileEntry) {
  if (!fileEntry || !fileEntry.file) {
    console.warn("[UI] loadAndRenderFile: missing fileEntry.file");
    return;
  }

  const fileName = fileEntry.file;
  const url = `/api/lib/${encodeURIComponent(fileName)}`;

  // --- fetch XML ---
  let xml;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    xml = await res.text();
  } catch (err) {
    console.error("[UI] Failed to load score XML:", url, err);
    alert(`Couldn't load score: ${fileName}`);
    return;
  }

  // --- accompaniment (optional) ---
  try {
    const acc = fileEntry.accompaniment || fileEntry?.presets?.assigned?.accompaniment;
    if (acc) {
      const accStr = String(acc);
      const isAbsolute   = /^(https?:)?\/\//i.test(accStr);
      const isApi        = accStr.startsWith("/api/");
      const isRelativeFs = accStr.startsWith("./") || accStr.startsWith("../");

      // Always collapse to a filename if it isn't already absolute/api/relative
      const baseName = accStr.split("/").pop().split("\\").pop();

      // Point to your new server route under server/lib/audio
      const accUrl = (isAbsolute || isApi || isRelativeFs)
        ? accStr
        : `/api/lib/audio/${encodeURIComponent(baseName)}`;

      await this.audioPlayer.setAccompaniment(accUrl);
      this.audioPlayer?.accompGain?.gain?.setValueAtTime?.(
        1.0,
        this.audioPlayer.audioContext.currentTime
      );
      console.log("[UI] Accompaniment loaded:", accUrl);
    } else {
      await this.audioPlayer.clearAccompaniment();
      console.log("[UI] No accompaniment for this score; cleared previous one.");
    }
  } catch (e) {
    console.warn("[UI] Accompaniment load error:", e);
    try { await this.audioPlayer.clearAccompaniment(); } catch {}
  }

  // --- title text (button is in HTML) ---
  const baseTitle = fileName.replace(/\.xml$/i, "");
  const titleTextEl = document.getElementById("scoreTitleText");
  if (titleTextEl) titleTextEl.textContent = baseTitle;
  try { document.title = `${baseTitle} — Shalfege`; } catch {}

  // --- remember current file for other modules ---
  this.scoreManager.currentFileName = fileName;

  // --- render ---
  try {
    // If your render callback returns a Promise, await it
    await this.onRenderScore(xml);
  } catch (e) {
    console.error("[UI] Render failed:", e);
    alert(`Failed to render: ${baseTitle}`);
    return;
  }

  // --- notify others (e.g., AssignedSettingsManager) ---
  window.dispatchEvent(new CustomEvent("score:loaded", { detail: { file: fileName } }));
},

    
  manageKeyboardShortcuts() {
    let shortcutsActive = false;

    // Activate shortcuts only after a score is loaded
    window.addEventListener('score:loaded', () => {
      shortcutsActive = true;
    });

    // Utility: ignore when typing in fields or contenteditable
    const isTypingContext = (el) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        el.isContentEditable
      );
    };

    window.addEventListener('keydown', (e) => {
      if (!shortcutsActive) return;
      if (isTypingContext(document.activeElement)) return;

      // Right/Left arrows -> next/prev
      if (e.code === 'ArrowRight') {
        e.preventDefault(); // stop page from scrolling
        document.getElementById('nextBtn')?.click();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        document.getElementById('playPauseBtn')?.click();
        return;
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        document.getElementById('prevBtn')?.click();
        return;
      }

      // "p" -> Play current note (open its panel)
      if (e.key === 'p' || e.key === 'P') {
        // don't block browser defaults unnecessarily
        document.getElementById('playReferencePlayBtn')?.click();
        return;
      }
    });
  }

};

