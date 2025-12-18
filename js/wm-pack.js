/* Whitney & Marc — wm-pack.js (clean, single-source-of-truth, Nicepage-friendly) */
(() => {
  'use strict';

  // ======= GLOBAL SINGLETON GUARD =======
  if (window.__wmPackLoaded) return;
  window.__wmPackLoaded = true;

  // ======= CONSTANTS =======
  // Wedding: June 26, 2026 — 18:00 Windhoek (UTC+2) => 16:00 UTC
  const WEDDING_TARGET_UTC_MS = Date.UTC(2026, 5, 26, 16, 0, 0);

  const PREFERS_REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const HAS_VIBRATE = typeof navigator !== 'undefined' && !!navigator.vibrate;

  // Audio (single manager)
  const AUDIO_SRC = 'https://raw.githubusercontent.com/Max-Angula/wedding-audio/main/Hot%20Chip%20%E2%80%93%20Devotion.mp3';
  const AUDIO_TARGET_VOL = 0.85;

  // Storage keys
  const K = {
    audioApproved: 'wmAudioApproved',
    audioPlaying:  'wmAudioPlaying',
    audioAnchor:   'wmAudioAnchorMs',
    audioLastT:    'wmAudioLastSec'
  };

  // ======= UTIL =======
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const getLS = (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  const approvedAudio = () => getLS(K.audioApproved) === '1';
  const setApprovedAudio = (v = true) => setLS(K.audioApproved, v ? '1' : '0');
  const wantsPlaying = () => getLS(K.audioPlaying, '1') === '1';
  const setWantsPlaying = (v) => setLS(K.audioPlaying, v ? '1' : '0');

  const getAnchorMs = () => {
    const v = parseInt(getLS(K.audioAnchor) || '', 10);
    return Number.isFinite(v) ? v : null;
  };
  const setAnchorMs = (ms) => setLS(K.audioAnchor, String(ms));

  const getLastSec = () => {
    const v = parseFloat(getLS(K.audioLastT) || '');
    return Number.isFinite(v) ? v : 0;
  };
  const setLastSec = (sec) => setLS(K.audioLastT, String(Math.max(0, sec | 0)));

  const rIC = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));

  // Simple “run-once” helper for CSS injection
  function injectStyleOnce(id, cssText) {
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = cssText;
    document.head.appendChild(s);
  }

  // ======= PERSIST CONTAINER (keeps audio + fixed UI across SPA swaps) =======
  function ensurePersist() {
    let persist = document.getElementById('wm-persist');
    if (!persist) {
      persist = document.createElement('div');
      persist.id = 'wm-persist';
      // Keep it at end of body so it survives our SPA body swap strategy cleanly
      document.body.appendChild(persist);
    }
    return persist;
  }

  // ======= 0) FONTS LOADING CLASS (optional) =======
  function initFontsLoadingClassOnce() {
    if (window.__wmFontsInit) return;
    window.__wmFontsInit = true;

    document.documentElement.classList.add('wm-fonts-loading');
    const done = () => document.documentElement.classList.remove('wm-fonts-loading');

    if (document.fonts && document.fonts.load) {
      Promise.race([
        document.fonts.load('1em "Playfair Display"'),
        new Promise((r) => setTimeout(r, 1500))
      ]).then(done, done);
    } else {
      window.addEventListener('load', done, { once: true });
    }
  }

  // =========================================================
  // 1) COUNTDOWN (ONE IMPLEMENTATION, MULTI-WIDGET)
  // Days / Hours / Minutes only (hide seconds + other units)
  // =========================================================
  function initCountdown(root = document) {
    injectStyleOnce('wm-countdown-css', `
      .u-countdown.wm-triple .u-countdown-seconds,
      .u-countdown.wm-triple .u-countdown-separator-4,
      .u-countdown.wm-triple .u-countdown-years,
      .u-countdown.wm-triple .u-countdown-months,
      .u-countdown.wm-triple .u-countdown-days,
      .u-countdown.wm-triple .u-countdown-hours,
      .u-countdown.wm-triple .u-countdown-minutes { display: inline-flex !important; }
      .u-countdown.wm-triple .u-countdown-separator-2,
      .u-countdown.wm-triple .u-countdown-separator-3 { display: inline-flex !important; }

      /* Hide everything by default inside wm-triple, then show only d/h/m + sep2/sep3 */
      .u-countdown.wm-triple .u-countdown-item,
      .u-countdown.wm-triple .u-countdown-separator { display: none !important; }

      .u-countdown.wm-triple .u-countdown-days,
      .u-countdown.wm-triple .u-countdown-hours,
      .u-countdown.wm-triple .u-countdown-minutes,
      .u-countdown.wm-triple .u-countdown-separator-2,
      .u-countdown.wm-triple .u-countdown-separator-3 { display: inline-flex !important; }
    `);

    function compute(nowMs) {
      const diff = Math.max(0, WEDDING_TARGET_UTC_MS - nowMs);
      const total = Math.floor(diff / 1000);
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      return { days, hours, minutes };
    }

    function renderDigits(counterEl, value, minLen) {
      if (!counterEl) return;
      const str = String(value).padStart(minLen, '0');
      // minimal DOM churn
      counterEl.textContent = '';
      for (const ch of str) {
        const d = document.createElement('div');
        d.className = 'u-countdown-number u-text-custom-color-8';
        d.textContent = ch;
        counterEl.appendChild(d);
      }
    }

    // init each countdown once (per DOM instance)
    $$('.u-countdown', root).forEach((wrap) => {
      if (!wrap || wrap.dataset.wmCountdownInit === '1') return;
      wrap.dataset.wmCountdownInit = '1';

      wrap.classList.add('wm-triple');

      const daysEl = $('.u-countdown-days .u-countdown-counter', wrap);
      const hrsEl  = $('.u-countdown-hours .u-countdown-counter', wrap);
      const minEl  = $('.u-countdown-minutes .u-countdown-counter', wrap);

      // kill seconds if present
      const sec = $('.u-countdown-seconds', wrap);
      const sep4 = $('.u-countdown-separator-4', wrap);
      if (sec) sec.style.display = 'none';
      if (sep4) sep4.style.display = 'none';

      const tick = () => {
        const { days, hours, minutes } = compute(Date.now());
        renderDigits(daysEl, days, Math.max(2, String(days).length));
        renderDigits(hrsEl,  hours, 2);
        renderDigits(minEl,  minutes, 2);
      };

      tick();
      const id = setInterval(tick, 1000);
      WM_CLEANUPS.push(() => clearInterval(id));
    });
  }
<!-- ===== Smooth scroll + auto-focus (RSVP) ===== -->
 
(function () {
  function bindRsvpScroll() {
    const btn  = document.getElementById('rsvp-btn');
    const form = document.getElementById('rsvp-form');
    if (!btn || !form) return; // fail quietly if either is missing

    btn.addEventListener('click', function (e) {
      e.preventDefault(); // stop the default jump

      // Smooth scroll to the form
      try {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        // Fallback if smooth option isn't supported
        form.scrollIntoView(true);
      }

      // Focus the first editable field after a short delay
      setTimeout(() => {
        const firstField = form.querySelector('input, select, textarea');
        if (!firstField) return;
        try {
          firstField.focus({ preventScroll: true });
        } catch {
          firstField.focus();
        }
      }, 450);

      // Keep the URL hash in sync (optional)
      try {
        history.pushState(null, '', '#rsvp-form');
      } catch {}
    }, { passive: false });
  }

  // Make sure it runs after the DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindRsvpScroll, { once: true });
  } else {
    bindRsvpScroll();
  }
})();

/* Modal + copiar + QR EPC/SEPA (carga bajo demanda) — SINGLE controller */
(function () {
  // Supports multiple possible triggers
  const openBtn = document.querySelector('#wm-gift-link, #wm-gift-link-cat, #wm-gift-link-es, [data-wm-gift]');
  const modal   = document.getElementById('wm-gift-modal');
  if (!openBtn || !modal) return;

  function open(){
    modal.classList.add('wmg-open');
    modal.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow='hidden';
  }
  function close(){
    modal.classList.remove('wmg-open');
    modal.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow='';
  }

  // EPC payload (importe omitido → el ordenante lo elige)
  function buildEpc({bic, name, iban, remittance}){
    const sanitize = s => String(s || '').replace(/\n|\r/g,' ').slice(0,70);
    return [
      'BCD','001','1','SCT',
      sanitize(bic),
      sanitize(name),
      sanitize(iban).replace(/\s+/g,''),
      '','',
      sanitize(remittance || '')
    ].join('\n');
  }

  function makeQR(){
    const name = document.getElementById('wmg-name')?.textContent.trim() || '';
    const iban = document.getElementById('wmg-iban')?.textContent.trim() || '';
    const bic  = document.getElementById('wmg-swift')?.textContent.trim() || '';
    const ref  = document.getElementById('wmg-ref')?.textContent.trim() || '';
    const payload = buildEpc({bic, name, iban, remittance: ref});

    const box = document.getElementById('wmg-qr');
    if (!box || !window.QRCode) return;

    box.innerHTML = '';
    new QRCode(box, { text: payload, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.M });
  }

  async function ensureQRLib(){
    if (window.QRCode) return;
    await new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = res;
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  openBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    open();
    try { await ensureQRLib(); makeQR(); } catch {}
  }, { passive: false });

  modal.addEventListener('click', (e) => {
    if (e.target.matches('[data-wm-close], .wmg-backdrop')) close();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  }, { passive: true });

  // Copy buttons
  modal.querySelectorAll('.wmg-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sel = btn.getAttribute('data-copy');
      const el  = sel && modal.querySelector(sel);
      const txt = el ? el.textContent.trim() : '';
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        const old = btn.textContent;
        btn.textContent = '¡Copiado!';
        setTimeout(() => btn.textContent = old, 900);
      } catch {}
    }, { passive: true });
  });

  // Download .txt
  const dl = document.getElementById('wmg-download');
  if (dl){
    dl.addEventListener('click', () => {
      const parts = [
        'Titulares de la cuenta: ' + (document.getElementById('wmg-name')?.textContent || ''),
        'IBAN: ' + (document.getElementById('wmg-iban')?.textContent || ''),
        'BIC / SWIFT: ' + (document.getElementById('wmg-swift')?.textContent || ''),
        'Banco: ' + (document.getElementById('wmg-bank')?.textContent || ''),
        'Concepto: ' + (document.getElementById('wmg-ref')?.textContent || '')
      ];
      const blob = new Blob([parts.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'detalles-regalo.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, { passive: true });
  }
})();
  // =========================================================
  // 2) TOP SCROLL PROGRESS LINE + BACK TO TOP (ONE IMPLEMENTATION)
  // =========================================================
  function initProgressAndTopOnce() {
    if (window.__wmProgressTopInit) return;
    window.__wmProgressTopInit = true;

    injectStyleOnce('wm-progress-top-css', `
      #wm-progress {
        position: fixed; top: 0; left: 0; right: 0; height: 2px;
        transform-origin: 0 50%;
        transform: scaleX(0);
        z-index: 99999;
        background: currentColor;
        opacity: .65;
        pointer-events: none;
      }
      body.wm-scrolling #wm-progress { opacity: .9; }

      #wm-top.wm-top {
        position: fixed; right: 14px; bottom: 18px; z-index: 99998;
        width: 46px; height: 46px; border-radius: 999px;
        border: none; cursor: pointer;
        display: grid; place-items: center;
        background: rgba(0,0,0,.62);
        color: #fff;
        box-shadow: 0 10px 26px rgba(0,0,0,.22);
        backdrop-filter: blur(6px);
        opacity: 0; transform: translateY(10px);
        transition: opacity .2s ease, transform .2s ease;
      }
      #wm-top.wm-top.show { opacity: 1; transform: translateY(0); }
    `);

    function ensureBar() {
      let bar = document.getElementById('wm-progress');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'wm-progress';
        document.body.prepend(bar);
      }
      return bar;
    }

    function ensureTopBtn() {
      let btn = document.getElementById('wm-top');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'wm-top';
        btn.className = 'wm-top';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Back to top');
        btn.innerHTML = `
          <svg viewBox="0 0 256 256" width="22" height="22" aria-hidden="true">
            <path d="M128 16l48 48h-26l30 130H76l30-130H80l48-48zM64 224h128l-8 24H72l-8-24z" fill="currentColor"/>
          </svg>
        `;
        document.body.appendChild(btn);
      }
      return btn;
    }

    const bar = ensureBar();
    const btn = ensureTopBtn();

    let raf = null;
    let hideTimer = null;

    function update() {
      raf = null;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const y = Math.max(0, window.pageYOffset || doc.scrollTop || 0);
      const p = Math.min(1, y / max);
      bar.style.transform = 'scaleX(' + p + ')';
      btn.classList.toggle('show', y > 600);
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
      document.body.classList.add('wm-scrolling');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => document.body.classList.remove('wm-scrolling'), 300);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', onScroll, { passive: true });

    btn.addEventListener('click', () => {
      if (PREFERS_REDUCED) window.scrollTo(0, 0);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    }, { passive: true });

    update();
  }

  // =========================================================
  // 3) AUDIO MANAGER (ONE IMPLEMENTATION, PERSISTENT)
  // =========================================================
  function initAudioOnce() {
    if (window.__wmAudioInit) return;
    window.__wmAudioInit = true;

    injectStyleOnce('wm-audio-css', `
      #toggle-audio.wm-speaker {
        position: fixed; left: 14px; bottom: 18px; z-index: 99998;
        width: 46px; height: 46px; border-radius: 999px;
        border: none; cursor: pointer;
        display: grid; place-items: center;
        background: rgba(0,0,0,.62);
        color: #fff;
        box-shadow: 0 10px 26px rgba(0,0,0,.22);
        backdrop-filter: blur(6px);
      }
      #toggle-audio.wm-speaker svg { width: 22px; height: 22px; }
      #toggle-audio.wm-speaker.playing::before {
        content:"";
        position:absolute; inset:-6px;
        border-radius:999px;
        border: 1px solid rgba(255,255,255,.25);
        opacity:.0;
      }
      #toggle-audio.wm-speaker.playing::before {
        opacity:.18;
        ${PREFERS_REDUCED ? 'animation:none;' : 'animation: wmPulse 1.6s ease-in-out infinite;'}
      }
      @keyframes wmPulse { 0%{transform:scale(.98)} 50%{transform:scale(1.08)} 100%{transform:scale(.98)} }
    `);

    const SVG_ON = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M11 5 7 9H3v6h4l4 4V5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
        <path d="M17 9a5 5 0 0 1 0 6M20 7a8 8 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
      </svg>`;
    const SVG_OFF = `
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M11 5 7 9H3v6h4l4 4V5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
        <path d="M16 9l5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>`;

    function ensureAudio() {
      const persist = ensurePersist();
      let a = document.getElementById('wm-audio');
      if (!a) {
        a = document.createElement('audio');
        a.id = 'wm-audio';
        a.preload = 'none';        // do not fetch until needed
        a.loop = true;
        a.autoplay = false;
        a.playsInline = true;
        a.crossOrigin = 'anonymous';
        persist.appendChild(a);
      } else if (a.parentElement !== persist) {
        persist.appendChild(a);
      }
      return a;
    }

    function upsertToggle() {
      const persist = ensurePersist();
      let btn = document.getElementById('toggle-audio');
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'toggle-audio';
        btn.className = 'wm-speaker';
        btn.type = 'button';
        btn.title = 'Música';
        persist.appendChild(btn);
      } else {
        btn.classList.add('wm-speaker');
      }
      return btn;
    }

    function setIcon(btn, playing) {
      btn.innerHTML = playing ? SVG_ON : SVG_OFF;
      btn.classList.toggle('playing', playing);
      btn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
    }

    function fadeTo(audio, toVol, ms = 700) {
      const from = (audio.volume ?? 0);
      const start = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - start) / ms);
        try { audio.volume = from + (toVol - from) * k; } catch {}
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    function computeCurrentTime(duration) {
      const now = Date.now();
      const anchor = getAnchorMs();
      if (anchor && duration && Number.isFinite(duration) && duration > 1) {
        const elapsed = Math.max(0, (now - anchor) / 1000);
        return elapsed % duration;
      }
      return getLastSec();
    }

    async function loadSrcIfNeeded(audio) {
      if (!audio.src) {
        audio.src = AUDIO_SRC;
        try { audio.load?.(); } catch {}
      }
    }

    async function startPlayback(audio) {
      await loadSrcIfNeeded(audio);

      if (!approvedAudio()) {
        setApprovedAudio(true);
        setAnchorMs(Date.now() - Math.floor(audio.currentTime || 0) * 1000);
      }

      try {
        audio.volume = 0.0;
        await audio.play();
        setWantsPlaying(true);
        fadeTo(audio, AUDIO_TARGET_VOL, 900);
      } catch {
        // autoplay blocked; gesture will handle
      }
    }

    function wireFirstGesture(fn) {
      const once = async () => { off(); await fn(); };
      const off = () => ['click', 'touchstart', 'keydown', 'scroll'].forEach((ev) =>
        window.removeEventListener(ev, once, { passive: true })
      );
      ['click', 'touchstart', 'keydown', 'scroll'].forEach((ev) =>
        window.addEventListener(ev, once, { passive: true, once: true })
      );
    }

    async function boot() {
      const audio = ensureAudio();
      const btn = upsertToggle();

      // persist last position
      audio.addEventListener('timeupdate', () => setLastSec(audio.currentTime));
      audio.addEventListener('seeking', () => setLastSec(audio.currentTime));
      audio.addEventListener('play', () => setWantsPlaying(true));
      audio.addEventListener('pause', () => setWantsPlaying(false));

      audio.addEventListener('loadedmetadata', () => {
        const t = computeCurrentTime(audio.duration);
        try { audio.currentTime = t; } catch {}
      }, { once: true });

      setIcon(btn, !audio.paused);

      btn.addEventListener('click', async () => {
        if (audio.paused) {
          if (!getAnchorMs()) setAnchorMs(Date.now() - Math.floor(audio.currentTime || 0) * 1000);
          await startPlayback(audio);
        } else {
          try { audio.pause(); } catch {}
          setWantsPlaying(false);
        }
        setIcon(btn, !audio.paused);
        if (HAS_VIBRATE) { try { navigator.vibrate(8); } catch {} }
      });

      // Media Session (optional)
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Ceremony Prelude',
            artist: 'Whitney & Marc',
            album: 'Wedding Invitation'
          });
          navigator.mediaSession.setActionHandler('play', () => startPlayback(audio));
          navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); setWantsPlaying(false); });
        } catch {}
      }

      // reduced motion: don’t auto resume
      if (PREFERS_REDUCED) {
        setWantsPlaying(false);
        setIcon(btn, false);
        return;
      }

      // Resume intent
      if (approvedAudio() && wantsPlaying()) {
        try {
          await startPlayback(audio);
        } catch {
          wireFirstGesture(() => startPlayback(audio));
        }
      } else if (!approvedAudio()) {
        wireFirstGesture(() => startPlayback(audio));
      }

      // safety persist
      const tid = setInterval(() => { if (!audio.paused) setLastSec(audio.currentTime); }, 1500);
      WM_CLEANUPS.push(() => clearInterval(tid));
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
      boot();
    }

    // Re-assert UI/audio after swaps (idempotent)
    window.addEventListener('wm:page-swapped', () => setTimeout(() => {
      try { ensurePersist(); } catch {}
      // ensure button still exists in persist
      try { upsertToggle(); } catch {}
    }, 30), { passive: true });
  }

  // =========================================================
  // 4) AR “GOLDEN DUST” (ONE IMPLEMENTATION)
  // =========================================================
  function initAROnce() {
    if (window.__wmARInit) return;
    window.__wmARInit = true;

    if (PREFERS_REDUCED) return;

    injectStyleOnce('wm-ar-golddust-css', `
      #wm-ar-btn {
        position: fixed; right: 14px; bottom: 86px; z-index: 99998;
        width: 54px; height: 54px; border-radius: 50%;
        border: none; background: rgba(0,0,0,.65); color: #fff;
        display: grid; place-items: center; font-weight: 800;
        box-shadow: 0 8px 22px rgba(0,0,0,.25); backdrop-filter: blur(6px);
        cursor: pointer;
      }
      #wm-ar-overlay { position: fixed; inset: 0; z-index: 99999; display: none; background:#000; }
      #wm-ar-overlay.show { display:flex; }
      #wm-ar-wrap { position: relative; width: 100%; height: 100%; }
      #wm-ar-video, #wm-ar-canvas {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; touch-action: none;
      }
      #wm-ar-ui {
        position: absolute; left: 0; right: 0; bottom: 0;
        display: flex; gap: 10px; justify-content: space-between; align-items: center;
        padding: 14px 16px; pointer-events: none;
        background: linear-gradient(180deg, rgba(0,0,0,0) 0, rgba(0,0,0,.35) 60%, rgba(0,0,0,.55) 100%);
      }
      #wm-ar-ui button {
        pointer-events: auto; border: 0; border-radius: 999px; color: #111;
        font-weight: 800; font-family: inherit; cursor: pointer;
        box-shadow: 0 8px 28px rgba(0,0,0,.35);
      }
      #wm-ar-close { background: rgba(255,255,255,.92); padding: 10px 14px; }
      #wm-ar-snap  { background: rgba(255,223,120,.95); padding: 12px 18px; }
    `);

    function makeGoldColor() {
      const h = 38 + Math.random() * 10;
      const s = 88 + Math.random() * 8;
      const l = 60 + Math.random() * 10;
      return `hsl(${h} ${s}% ${l}%)`;
    }

    function ensureOverlay() {
      let root = document.getElementById('wm-ar-overlay');
      if (!root) {
        root = document.createElement('div');
        root.id = 'wm-ar-overlay';
        root.innerHTML = `
          <div id="wm-ar-wrap">
            <video id="wm-ar-video" autoplay playsinline muted></video>
            <canvas id="wm-ar-canvas"></canvas>
            <div id="wm-ar-ui">
              <button id="wm-ar-close" aria-label="Close AR">Close</button>
              <button id="wm-ar-snap" aria-label="Save photo">Save</button>
            </div>
          </div>
        `;
        document.body.appendChild(root);
      }

      const persist = ensurePersist();

      let b = document.getElementById('wm-ar-btn');
      if (!b) {
        b = document.createElement('button');
        b.id = 'wm-ar-btn';
        b.type = 'button';
        b.textContent = 'AR';
        persist.appendChild(b);
      }
      return root;
    }

    function startParticles(canvas, opts) {
      const ctx = canvas.getContext('2d', { alpha: true });
      const DPR = clamp(window.devicePixelRatio || 1, 1, 2);

      let raf = null;
      let tLast = performance.now();
      let windX = 0, windY = 40;
      let twinkle = 0;

      function resize() {
        const r = canvas.getBoundingClientRect();
        const w = Math.floor(r.width * DPR);
        const h = Math.floor(r.height * DPR);
        canvas.width = w;
        canvas.height = h;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      const targetCount = Math.round(
        clamp((canvas.clientWidth * canvas.clientHeight) * (opts.density || 0.00006), 40, 140)
      );

      const particles = [];
      function spawnParticle(yTop = Math.random() * canvas.clientHeight) {
        const size = (Math.random() * (opts.maxSize || 2.2)) + (opts.minSize || 0.6);
        particles.push({
          x: Math.random() * canvas.clientWidth,
          y: yTop,
          r: size,
          vx: (Math.random() - 0.5) * (opts.wander || 14),
          vy: (opts.fallSpeed || 22) + Math.random() * 18,
          glow: makeGoldColor(),
          tw: Math.random() * Math.PI * 2
        });
      }
      for (let i = 0; i < targetCount; i++) spawnParticle(Math.random() * canvas.clientHeight);

      let beta = 0, gamma = 0;
      const onTilt = (ev) => { beta = ev.beta || 0; gamma = ev.gamma || 0; };
      window.addEventListener('deviceorientation', onTilt, { passive: true });

      canvas.addEventListener('pointerdown', () => {
        twinkle = 1;
        setTimeout(() => twinkle = 0, 300);
      }, { passive: true });

      function step(now) {
        const dt = Math.min(0.06, (now - tLast) / 1000);
        tLast = now;

        const targetWindX = clamp(gamma * 6, -70, 70);
        const targetWindY = 40 + clamp(beta, -30, 50);
        windX = windX + (targetWindX - windX) * 0.08;
        windY = windY + (targetWindY - windY) * 0.06;

        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        ctx.globalCompositeOperation = 'lighter';

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += (p.vx + windX) * dt;
          p.y += (p.vy + windY) * dt;
          p.tw += dt * 3.2;
          const pulse = 0.65 + Math.sin(p.tw) * 0.35 + (twinkle ? Math.random() * 0.25 : 0);

          if (p.y - p.r > canvas.clientHeight + 6) {
            particles.splice(i, 1);
            spawnParticle(-10 - Math.random() * 40);
            continue;
          }
          if (p.x < -6) p.x += canvas.clientWidth + 12;
          if (p.x > canvas.clientWidth + 6) p.x -= canvas.clientWidth + 12;

          ctx.save();
          ctx.shadowBlur = p.r * 6;
          ctx.shadowColor = p.glow;
          ctx.fillStyle = p.glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (Math.random() < 0.02) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#fff8cc';
            ctx.fillRect(p.x - 0.4, p.y - 0.4, 0.8, 0.8);
            ctx.restore();
          }
        }

        while (particles.length < targetCount) spawnParticle(-Math.random() * 100);
        raf = requestAnimationFrame(step);
      }

      raf = requestAnimationFrame(step);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        window.removeEventListener('deviceorientation', onTilt);
      };
    }

    let stopParticles = null;
    let mediaStream = null;

    async function openAR() {
      const root = ensureOverlay();
      const video = $('#wm-ar-video', root);
      const canvas = $('#wm-ar-canvas', root);
      const btnClose = $('#wm-ar-close', root);
      const btnSnap = $('#wm-ar-snap', root);

      root.classList.add('show');

      // attempt camera, but gracefully degrade
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false
        });
        video.srcObject = mediaStream;
      } catch {}

      stopParticles = startParticles(canvas, {
        density: window.innerWidth < 600 ? 0.00005 : 0.00006,
        minSize: 0.7,
        maxSize: 2.2,
        fallSpeed: 18,
        wander: 10
      });

      const close = () => {
        root.classList.remove('show');
        if (stopParticles) { stopParticles(); stopParticles = null; }
        if (video) video.srcObject = null;
        if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
      };

      btnClose.onclick = close;

      btnSnap.onclick = () => {
        try {
          const snap = document.createElement('canvas');
          const w = canvas.width, h = canvas.height;
          snap.width = w; snap.height = h;
          const sctx = snap.getContext('2d');

          if (video && video.readyState >= 2) sctx.drawImage(video, 0, 0, w, h);
          else { sctx.fillStyle = '#000'; sctx.fillRect(0, 0, w, h); }

          sctx.drawImage(canvas, 0, 0);
          const url = snap.toDataURL('image/jpeg', 0.9);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'golden-moment.jpg';
          a.click();
        } catch {}
      };
    }

    // expose
    window.wmOpenGoldDustAR = openAR;

    function bindARTriggersOnce() {
      if (window.__wmARTriggersBound) return;
      window.__wmARTriggersBound = true;

      document.addEventListener('click', (e) => {
        const trigger = e.target && e.target.closest && e.target.closest('[data-ar="gold-dust"], #wm-ar-btn');
        if (trigger) {
          e.preventDefault();
          openAR();
        }
      }, { passive: false, capture: true });
    }

    // Ensure button exists on load and after swaps (idempotent)
    const ensure = () => { ensureOverlay(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensure, { once: true });
    else ensure();

    window.addEventListener('wm:page-swapped', () => setTimeout(ensure, 30), { passive: true });
    bindARTriggersOnce();
  }

  // =========================================================
  // 5) SPA-LITE NAVIGATION (ONE IMPLEMENTATION)
  // =========================================================
  function initSPASwapOnce() {
    if (window.__wmSPAInit) return;
    window.__wmSPAInit = true;

    function isInternal(url) {
      if (!url) return false;
      if (/^(mailto:|tel:|javascript:)/i.test(url)) return false;
      if (/^https?:\/\//i.test(url)) {
        try {
          const u = new URL(url);
          return u.origin === location.origin && /\.html(\?|#|$)/i.test(u.pathname);
        } catch { return false; }
      }
      return /\.html(\?|#|$)/i.test(url);
    }

    function resolve(url) {
      try { return new URL(url, location.href).href; }
      catch { return url; }
    }

    function syncPageCSS(fromDoc) {
      const existing = new Set(
        $$('head link[rel="stylesheet"]').map(l => l.href)
      );
      $$('head link[rel="stylesheet"]', fromDoc)
        .filter(l => !/wm-pack\.css$/i.test(l.getAttribute('href') || ''))
        .forEach(link => {
          if (!existing.has(link.href)) document.head.appendChild(link.cloneNode(true));
        });
    }

    async function loadAndSwap(url, push = true) {
      try {
        const res = await fetch(url, { credentials: 'same-origin' });
        if (!res.ok) throw new Error(res.statusText);
        const html = await res.text();

        const parser = new DOMParser();
        const nextDoc = parser.parseFromString(html, 'text/html');

        document.title = nextDoc.title || document.title;

        // Keep persist node
        const persist = document.getElementById('wm-persist');
        const body = document.body;

        // Remove everything except persist
        Array.from(body.childNodes).forEach(node => {
          if (persist && node === persist) return;
          body.removeChild(node);
        });

        // Append new body nodes except incoming persist
        Array.from(nextDoc.body.childNodes).forEach(node => {
          if (node.nodeType === 1 && node.id === 'wm-persist') return;
          body.appendChild(node.cloneNode(true));
        });

        syncPageCSS(nextDoc);

        if (push) history.pushState({ url }, '', url);

        window.scrollTo(0, 0);

        // Announce swap
        window.dispatchEvent(new CustomEvent('wm:page-swapped', { detail: { url } }));

        // Re-init page-level features idempotently
        initPage(document);

      } catch {
        location.href = url; // fallback
      }
    }

    function onClick(e) {
      // Nicepage patterns: data-href, or normal anchors
      const dh = e.target && e.target.closest && e.target.closest('[data-href]');
      if (dh) {
        const url = dh.getAttribute('data-href');
        if (isInternal(url)) {
          e.preventDefault();
          loadAndSwap(resolve(url), true);
          return;
        }
      }

      const a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;

      const href = a.getAttribute('href');
      const target = a.getAttribute('target');

      if (!href || href.startsWith('#') || target === '_blank' || !isInternal(href)) return;

      e.preventDefault();
      loadAndSwap(resolve(href), true);
    }

    window.addEventListener('popstate', (e) => {
      const url = (e.state && e.state.url) || location.href;
      loadAndSwap(url, false);
    });

    document.addEventListener('click', onClick, { capture: true });
  }

  // =========================================================
  // 6) OPTIONAL LIGHTWEIGHT “PAGE ENHANCERS” (SAFE + IDENTITY)
  // =========================================================
  function initEnhancers(root = document) {
    // Images: lazy+async (skip fetchpriority=high)
    $$('img', root).forEach((img) => {
      if (!img.getAttribute('loading') && img.getAttribute('fetchpriority') !== 'high') img.loading = 'lazy';
      if (!img.getAttribute('decoding')) img.decoding = 'async';
    });

    // Google Maps iframe: true lazy load (if present)
    if (!window.__wmMapLazyBound) {
      window.__wmMapLazyBound = true;

      const frame = $('section[id="block-1"] iframe.embed-responsive-item', root);
      if (frame && !frame.dataset.src && frame.src) {
        frame.dataset.src = frame.src;
        frame.removeAttribute('src');
        frame.setAttribute('title', 'Map – Masia La Mer');
      }

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const f = $('section[id="block-1"] iframe.embed-responsive-item');
              if (f && f.dataset.src && !f.src) f.src = f.dataset.src;
              io.disconnect();
              break;
            }
          }
        }, { rootMargin: '600px 0px' });

        const fNow = $('section[id="block-1"] iframe.embed-responsive-item');
        if (fNow) io.observe(fNow);
        WM_CLEANUPS.push(() => io.disconnect());
      } else {
        // fallback: load immediately
        const fNow = $('section[id="block-1"] iframe.embed-responsive-item');
        if (fNow && fNow.dataset.src && !fNow.src) fNow.src = fNow.dataset.src;
      }
    }

    // Tiny haptics (bind once, global)
    if (!window.__wmHapticsBound) {
      window.__wmHapticsBound = true;
      document.addEventListener('click', (e) => {
        const hit = e.target && e.target.closest && e.target.closest('a, button, .u-btn, [role="button"]');
        if (hit && HAS_VIBRATE) { try { navigator.vibrate(10); } catch {} }
      }, { passive: true, capture: true });
    }
  }

  // =========================================================
  // 7) INIT / CLEANUP STRATEGY FOR SPA SWAPS
  // =========================================================
  const WM_CLEANUPS = [];

  function runCleanups() {
    while (WM_CLEANUPS.length) {
      const fn = WM_CLEANUPS.pop();
      try { fn && fn(); } catch {}
    }
  }

  function initPage(root = document) {
    // Clean timers/observers created for old DOM nodes
    runCleanups();

    // Per-page idempotent init
    initCountdown(root);
    initEnhancers(root);
  }

  // =========================================================
  // BOOT
  // =========================================================
  function boot() {
    initFontsLoadingClassOnce();

    // One-time singletons
    initProgressAndTopOnce();
    initAudioOnce();
    initAROnce();
    initSPASwapOnce();

    // First page init
    initPage(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => rIC(boot), { once: true });
  } else {
    rIC(boot);
  }

  // On swap: re-init page logic (singletons already guarded)
  window.addEventListener('wm:page-swapped', () => {
    setTimeout(() => initPage(document), 30);
  }, { passive: true });

})();
