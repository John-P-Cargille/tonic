// public/modules/modal.js
(function initSolfegeSettings() {
  // ---- Defaults -------------------------------------------------------------
  const DEFAULTS = {
    // Do (existing)
    stripeColor: '#36914e',
    stripeOpacity: 70,           // percent 0..100
    doLineColor: '#006400',
    doLineThickness: 2,

    // Global
    zoom: 1.0,                   // 1.0..1.5; UI slider shows 100..150

    // La (new)
    laEnabled: true,
    laLineColor: '#8B0000',
    laLineThickness: 2,
    laLineDash: '4,2',           // SVG stroke-dasharray
    laStripeColor: '#ffcccc',
    laStripeOpacity: 40          // percent 0..100
  };

  // ---- Utilities ------------------------------------------------------------
  const byId = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function loadSettings() {
    try {
      const raw = localStorage.getItem('solfegeSettings');
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(s) {
    localStorage.setItem('solfegeSettings', JSON.stringify(s));
    window.solfegeSettings = s; // keep global in sync
  }

  // ---- Global in-memory copy (read by other modules) ------------------------
  window.solfegeSettings = loadSettings();

  // ---- UI Hydration ---------------------------------------------------------
  function hydrateForm() {
    const s = window.solfegeSettings;

    // Do / stripe
    if (byId('stripeColor')) byId('stripeColor').value = s.stripeColor;
    if (byId('stripeOpacity')) {
      byId('stripeOpacity').value = String(clamp(+s.stripeOpacity || 0, 0, 100));
      if (byId('stripeOpacityValue')) {
        byId('stripeOpacityValue').textContent = `${byId('stripeOpacity').value}%`;
      }
    }
    if (byId('doLineColor')) byId('doLineColor').value = s.doLineColor;
    if (byId('doLineThickness')) byId('doLineThickness').value = String(clamp(+s.doLineThickness || 1, 1, 6));

    // Zoom: stored as 1.0..1.5; UI shows % (100..150)
    const zPct = clamp(Math.round((Number(s.zoom) || 1) * 100), 50, 300); // guard rails
    if (byId('scoreZoom')) byId('scoreZoom').value = String(zPct);
    if (byId('scoreZoomValue')) byId('scoreZoomValue').textContent = `${zPct}%`;

    // La controls
    if (byId('laEnabled')) byId('laEnabled').checked = !!s.laEnabled;
    if (byId('laLineColor')) byId('laLineColor').value = s.laLineColor;
    if (byId('laLineThickness')) byId('laLineThickness').value = String(clamp(+s.laLineThickness || 1, 1, 6));
    if (byId('laLineDash')) byId('laLineDash').value = s.laLineDash ?? '';

    if (byId('laStripeColor')) byId('laStripeColor').value = s.laStripeColor;
    if (byId('laStripeOpacity')) {
      byId('laStripeOpacity').value = String(clamp(+s.laStripeOpacity || 0, 0, 100));
      if (byId('laStripeOpacityValue')) {
        byId('laStripeOpacityValue').textContent = `${byId('laStripeOpacity').value}%`;
      }
    }

    toggleLaControls();
  }

  function toggleLaControls() {
    const enabled = byId('laEnabled')?.checked ?? true;
    ['laLineColor', 'laLineThickness', 'laLineDash', 'laStripeColor', 'laStripeOpacity']
      .forEach(id => { if (byId(id)) byId(id).disabled = !enabled; });
  }

  // ---- Wire up events -------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    hydrateForm();

    // Live labels
    const stripeOpacityInput = byId('stripeOpacity');
    if (stripeOpacityInput) {
      stripeOpacityInput.addEventListener('input', () => {
        if (byId('stripeOpacityValue')) {
          byId('stripeOpacityValue').textContent = `${stripeOpacityInput.value}%`;
        }
      });
    }

    const laStripeOpacityInput = byId('laStripeOpacity');
    if (laStripeOpacityInput) {
      laStripeOpacityInput.addEventListener('input', () => {
        if (byId('laStripeOpacityValue')) {
          byId('laStripeOpacityValue').textContent = `${laStripeOpacityInput.value}%`;
        }
      });
    }

    const zoomInput = byId('scoreZoom');
    if (zoomInput) {
      zoomInput.addEventListener('input', () => {
        const v = parseInt(zoomInput.value, 10) || 100;
        if (byId('scoreZoomValue')) byId('scoreZoomValue').textContent = `${v}%`;
      });
    }

    const laEnabled = byId('laEnabled');
    if (laEnabled) {
      laEnabled.addEventListener('change', toggleLaControls);
    }

     // Fix: blur focus before hiding the settings modal
    const modalEl = document.getElementById('solfegeSettingsModal');
    if (modalEl) {
      modalEl.addEventListener('hide.bs.modal', () => {
        if (document.activeElement) {
          document.activeElement.blur();
        }
      });
    }

    // Apply
    const applyBtn = byId('applySolfegeSettings');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const zPct = parseInt(byId('scoreZoom')?.value ?? '100', 10);
        const z = clamp(zPct, 50, 300) / 100; // convert % -> scalar

        const next = {
          // Do / stripe
          stripeColor: byId('stripeColor')?.value ?? DEFAULTS.stripeColor,
          stripeOpacity: clamp(parseInt(byId('stripeOpacity')?.value ?? DEFAULTS.stripeOpacity, 10), 0, 100),
          doLineColor: byId('doLineColor')?.value ?? DEFAULTS.doLineColor,
          doLineThickness: clamp(parseInt(byId('doLineThickness')?.value ?? DEFAULTS.doLineThickness, 10), 1, 6),

          // Global
          zoom: clamp(z, 0.25, 3),

          // La
          laEnabled: !!byId('laEnabled')?.checked,
          laLineColor: byId('laLineColor')?.value ?? DEFAULTS.laLineColor,
          laLineThickness: clamp(parseInt(byId('laLineThickness')?.value ?? DEFAULTS.laLineThickness, 10), 1, 6),
          laLineDash: byId('laLineDash')?.value ?? DEFAULTS.laLineDash,
          laStripeColor: byId('laStripeColor')?.value ?? DEFAULTS.laStripeColor,
          laStripeOpacity: clamp(parseInt(byId('laStripeOpacity')?.value ?? DEFAULTS.laStripeOpacity, 10), 0, 100)
        };

        saveSettings(next);

        // Tell the app to re-render while preserving current state
        window.dispatchEvent(new CustomEvent('solfege:settings:applied', {
          detail: { settings: next, at: Date.now() }
        }));

      });
    }

    // Pick up settings (incl. zoom) and re-render without touching App.js
    window.addEventListener('solfege:settings:applied', (e) => {
      const sm = window.scoreManager;
      if (!sm) return;

      const z = e?.detail?.settings?.zoom ?? window.solfegeSettings?.zoom ?? 1;
      sm.globalScaleFactor = z;

      // keep layout math in sync
      if (sm.container) sm.systemWidth = sm.container.clientWidth || window.innerWidth;

      // prefer app’s state-preserving path, else hard re-render
      if (window.app?.softRerenderPreservingState) {
        window.app.softRerenderPreservingState();
      } else if (sm.currentXML && window.app?.uiManager?.onRenderScore) {
        const xml = new XMLSerializer().serializeToString(sm.currentXML);
        window.app.uiManager.onRenderScore(xml);
      }
    });
    // Reset
    const resetBtn = byId('resetSolfegeSettings');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Restore defaults
        const next = { ...DEFAULTS };
        saveSettings(next);
        hydrateForm();

        // Immediately apply defaults to the score (including zoom)
        window.dispatchEvent(new CustomEvent('solfege:settings:applied', {
          detail: { settings: next, at: Date.now() }
        }));
      });
    }

  });
})();
