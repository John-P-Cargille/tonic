// public/modules/UIManager/UIManager.js

import { UIBuilder } from './UIBuilder.js';
import { manageAssignedSettingsBtn } from "./AssignedSettingsManager.js";


class UIManager {
  constructor(containerId, onRenderScore, audioPlayer, scoreManager) {
    this.container = document.getElementById(containerId);
    this.onRenderScore = onRenderScore; // Callback to notify App.js
    this.audioPlayer = audioPlayer;
    this.createUI();
    this.scoreManager = scoreManager;
  }

  async createUI() {
    this.manageScoresDropdown();    
    this.manageSolfegeBaseDropdown();
    this.managePlayPauseBtn();
    this.managePrevBtn();
    this.manageNextBtn();
    this.manageOctaveUpBtn();
    this.manageOctaveDownBtn();
    this.manageTransposeDropdown();
    this.manageStaffBtn();
    this.manageControls();
    this.manageSidebar();
    this.managePitchDetectBtn();
    this.manageFirstBtn();
    this.manageLastBtn();
    this.manageToggleSylBtn();
    this.manageToggleAudioBtn();
    this.manageTempoBtn();
    this.manageMetronomeBtn();
    this.managePlayReferenceBtn();
    manageAssignedSettingsBtn(this);
    this.manageKeyboardShortcuts();


    // hover-only, no lingering after click/drag
    const initTooltips = () => {
      const nodes = Array.from(document.querySelectorAll('[title]'));

      nodes.forEach((el) => {
        // Move text from title -> data-bs-title to prevent native tooltip
        const t = el.getAttribute('title');
        if (t) {
          el.setAttribute('data-bs-title', t);
          el.removeAttribute('title');
          // (Optional for a11y) keep a label for AT users
          if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', t);
        }

        const tip = new bootstrap.Tooltip(el, {
          trigger: 'hover',      // no 'focus' => won’t stick after click
          container: 'body',     // avoid z-index/layout issues
          placement: 'top'
        });

        // Hide on click & blur just in case
        el.addEventListener('click', () => { tip.hide(); el.blur(); });
        el.addEventListener('blur',  () => tip.hide());

        // If the panel starts dragging, hide any visible tooltip
        el.addEventListener('pointerdown', () => tip.hide());
      });
    };

    initTooltips();

  }

  makeDraggable(el) {
    let startX = 0, startY = 0;
    let originLeft = 0, originTop = 0;
    let pointerId = null;
    let dragging = false;

    const isInteractive = (node) =>
      node.closest?.('button, input, select, textarea, a, [role="button"], [contenteditable="true"]');

    const onPointerDown = (e) => {
      // left button / primary pointer only
      if (e.button !== 0 || e.isPrimary === false) return;
      // don’t start drag from controls inside the panel
      if (isInteractive(e.target)) return;

      pointerId = e.pointerId;
      el.setPointerCapture(pointerId);

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      // compute current offset relative to viewport
      originLeft = rect.left;
      originTop  = rect.top;

      // visual + UX tweaks
      el.style.transition = 'none';
      el.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.left = `${originLeft + dx}px`;
      el.style.top  = `${originTop  + dy}px`;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      try { if (pointerId != null) el.releasePointerCapture(pointerId); } catch {}
      pointerId = null;
      el.style.cursor = 'grab';
      document.body.style.userSelect = '';
    };

    // End drag on any of these
    const onPointerUp = (e) => { if (e.pointerId === pointerId) endDrag(); };
    const onPointerCancel = endDrag;
    const onBlur = endDrag;        // window/tab switch
    const onEscape = (e) => { if (e.key === 'Escape') endDrag(); };

    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onEscape);

    // Optional: initialize cursor
    el.style.cursor = 'grab';
  }


  // Defer to UIBuilder versions to avoid duplication ---
  async fetchLibFiles() {
    // Delegates to UIBuilder.fetchLibFiles (normalizes strings → {file})
    return UIBuilder.fetchLibFiles.call(this);
  }

  async loadAndRenderFile(fileOrEntry) {
    // Accept old string usage or new object shape
    const entry = (typeof fileOrEntry === 'string')
      ? { file: fileOrEntry }
      : fileOrEntry;

    return UIBuilder.loadAndRenderFile.call(this, entry);
  }
  
}

Object.assign(UIManager.prototype, UIBuilder);

export { UIManager };