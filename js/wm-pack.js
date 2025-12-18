/* Whitney & Marc — wm-pack.js (clean, single-source-of-truth, Nicepage-friendly) */
(() => {
  'use strict';

  // ======= GLOBAL SINGLETON GUARD =======
  if (window.__wmPackLoaded) return;
  window.__wmPackLoaded = true;

  // ======= CLEANUP POOL (must exist before any init uses it) =======
  const WM_CLEANUPS = [];

  function runCleanups() {
    while (WM_CLEANUPS.length) {
      const fn = WM_CLEANUPS.pop();
      try { fn && fn(); } catch {}
    }
  }

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
// 1) COUNTDOWN (CSS-ONLY: keep Nicepage styling)
// Show only Days / Hours / Minutes
// =========================================================
function initCountdown(root = document) {
  injectStyleOnce('wm-countdown-css', `
    /* Only HIDE what we don't want (leave the rest to Nicepage) */
    .u-countdown.wm-triple .u-countdown-years,
    .u-countdown.wm-triple .u-countdown-seconds,
    .u-countdown.wm-triple .u-countdown-numbers,
    .u-countdown.wm-triple .u-countdown-separator-1,
    .u-countdown.wm-triple .u-countdown-separator-4,
    .u-countdown.wm-triple .u-countdown-separator-5 {
      display: none !important;
    }
  `);

  $$('.u-countdown', root).forEach((wrap) => {
    if (!wrap || wrap.dataset.wmCountdownInit === '1') return;
    wrap.dataset.wmCountdownInit = '1';
    wrap.classList.add('wm-triple');
  });
  }

  // =========================================================
  // RSVP smooth scroll (bind once per DOM instance)
  // =========================================================
  function initRsvpScroll(root = document) {
    const btn  = $('#rsvp-btn', root);
    const form = $('#rsvp-form', root);
    if (!btn || !form) return;
    if (btn.dataset.wmRsvpBound === '1') return;
    btn.dataset.wmRsvpBound = '1';

    btn.addEventListener('click', (e) => {
      e.preventDefault();

      try { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch { form.scrollIntoView(true); }

      setTimeout(() => {
        const firstField = form.querySelector('input, select, textarea');
        if (!firstField) return;
        try { firstField.focus({ preventScroll: true }); }
        catch { firstField.focus(); }
      }, 450);

      try { history.pushState(null, '', '#rsvp-form'); } catch {}
    }, { passive: false });
  }

  // =========================================================
  // Gift modal controller (bind once per page DOM)
  // =========================================================
  function initGiftModal(root = document) {
    const modal = $('#wm-gift-modal', root);
    if (!modal) return;

    const openBtn = root.querySelector('#wm-gift-link, #wm-gift-link-cat, #wm-gift-link-es, [data-wm-gift]');
    if (!openBtn) return;

    if (modal.dataset.wmGiftBound === '1') return;
    modal.dataset.wmGiftBound = '1';

    function open() {
      modal.classList.add('wmg-open');
      modal.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden';
    }
    function close() {
      modal.classList.remove('wmg-open');
      modal.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
    }

    function buildEpc({ bic, name, iban, remittance }) {
      const sanitize = s => String(s || '').replace(/\n|\r/g, ' ').slice(0, 70);
      return [
        'BCD', '001', '1', 'SCT',
        sanitize(bic),
        sanitize(name),
        sanitize(iban).replace(/\s+/g, ''),
        '', '',
        sanitize(remittance || '')
      ].join('\n');
    }

    function makeQR() {
      const name = $('#wmg-name', modal)?.textContent.trim() || '';
      const iban = $('#wmg-iban', modal)?.textContent.trim() || '';
      const bic  = $('#wmg-swift', modal)?.textContent.trim() || '';
      const ref  = $('#wmg-ref', modal)?.textContent.trim() || '';
      const payload = buildEpc({ bic, name, iban, remittance: ref });

      const box = $('#wmg-qr', modal);
      if (!box || !window.QRCode) return;

      box.innerHTML = '';
      // eslint-disable-next-line no-new
      new window.QRCode(box, { text: payload, width: 180, height: 180, correctLevel: window.QRCode.CorrectLevel.M });
    }

    async function ensureQRLib() {
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

    modal.querySelectorAll('.wmg-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sel = btn.getAttribute('data-copy');
        const el  = sel && modal.querySelector(sel);
        const txt = el ? el.textContent.trim() : '';
        if (!txt) return;
        try {
          await navigator.clipboard.writeText(txt);
          const old = btn.textContent;
          btn.textContent = 'Copiat!';
          setTimeout(() => (btn.textContent = old), 900);
        } catch {}
      }, { passive: true });
    });

    const dl = $('#wmg-download', modal);
    if (dl) {
      dl.addEventListener('click', () => {
        const parts = [
          'Titulars: ' + ($('#wmg-name', modal)?.textContent || ''),
          'IBAN: ' + ($('#wmg-iban', modal)?.textContent || ''),
          'BIC / SWIFT: ' + ($('#wmg-swift', modal)?.textContent || ''),
          'Banc: ' + ($('#wmg-bank', modal)?.textContent || ''),
          'Concepte: ' + ($('#wmg-ref', modal)?.textContent || '')
        ];
        const blob = new Blob([parts.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = 'detalls-regal.txt';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }, { passive: true });
    }
  }

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
// 3) AUDIO MANAGER (speaker button + play/pause)
// =========================================================
function initAudioOnce() {
  if (window.__wmAudioInit) return;
  window.__wmAudioInit = true;

  const persist = ensurePersist();

  injectStyleOnce('wm-audio-css', `
    #wm-audio-btn{
      position:fixed;
      left:14px;
      bottom:18px;
      z-index:99998;
      width:46px;
      height:46px;
      border-radius:999px;
      border:none;
      display:grid;
      place-items:center;
      background:rgba(0,0,0,.62);
      color:#fff;
      box-shadow:0 10px 26px rgba(0,0,0,.22);
      backdrop-filter:blur(6px);
      cursor:pointer;
    }
    #wm-audio-btn[aria-pressed="true"]{ opacity:1; }
    #wm-audio-btn[aria-pressed="false"]{ opacity:.72; }
    #wm-audio-btn svg{ width:22px; height:22px; }
  `);

  // Create/Reuse audio element
  let audio = document.getElementById('wm-audio-el');
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'wm-audio-el';
    audio.src = AUDIO_SRC;
    audio.preload = 'auto';
    audio.loop = true;
    audio.playsInline = true;
    persist.appendChild(audio);
  }

  // Create/Reuse speaker button
  let btn = document.getElementById('wm-audio-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'wm-audio-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Music');
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `
      <svg viewBox="0 0 256 256" aria-hidden="true">
        <path fill="currentColor"
          d="M48 96v64h40l56 48V48L88 96H48zm140.9 32c0 21.2-9.2 40.2-23.8 52.8a8 8 0 0 0 10.3 12.3C193.7 178.7 204.9 154.7 204.9 128s-11.2-50.7-29.5-65.1a8 8 0 1 0-10.3 12.3c14.6 12.6 23.8 31.6 23.8 52.8z"/>
        <path fill="currentColor"
          d="M168.6 26.3a8 8 0 0 0-9.2 13.4C182.8 56.2 196.9 90.6 196.9 128s-14.1 71.8-37.5 88.3a8 8 0 0 0 9.2 13.4C195.7 210.9 212.9 171.4 212.9 128s-17.2-82.9-44.3-101.7z"/>
      </svg>
    `;
    document.body.appendChild(btn);
  }

  // Helpers
  const setBtn = (playing) => {
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  };

  const saveAnchor = () => {
    try {
      setAnchorMs(Date.now());
      setLastSec(audio.currentTime || 0);
    } catch {}
  };

  const restoreTime = () => {
    try {
      const anchor = getAnchorMs();
      const last = getLastSec();
      if (anchor != null && last > 0) {
        const elapsed = (Date.now() - anchor) / 1000;
        audio.currentTime = Math.max(0, last + elapsed);
      }
    } catch {}
  };

  async function playNow() {
    restoreTime();
    audio.volume = AUDIO_TARGET_VOL;
    try {
      await audio.play();
      setBtn(true);
      setWantsPlaying(true);
    } catch {
      setBtn(false);
    }
  }

  function pauseNow() {
    try { audio.pause(); } catch {}
    saveAnchor();
    setBtn(false);
    setWantsPlaying(false);
  }

  // Click speaker toggles play/pause (this counts as a user gesture)
  btn.addEventListener('click', async () => {
    setApprovedAudio(true);
    if (audio.paused) await playNow();
    else pauseNow();
  }, { passive: true });

  // Keep progress saved
  audio.addEventListener('timeupdate', () => {
    // save occasionally (cheap)
    if ((audio.currentTime | 0) % 10 === 0) saveAnchor();
  }, { passive: true });

  window.addEventListener('pagehide', saveAnchor, { passive: true });

  // Auto-start ONLY if user previously approved audio
  if (approvedAudio() && wantsPlaying()) {
    playNow();
  } else {
    setBtn(false);
    // Optional: start on first tap anywhere if they want it “just works”
    const unlock = async () => {
      if (!approvedAudio() || !wantsPlaying()) return;
      await playNow();
    };
    document.addEventListener('click', unlock, { passive: true, once: true, capture: true });
    document.addEventListener('touchstart', unlock, { passive: true, once: true, capture: true });
  }
}


  // =========================================================
  // 4) AR (UNCHANGED from your version)
  // =========================================================
  function initAROnce() {
    if (window.__wmARInit) return;
    window.__wmARInit = true;

    // ... keep your AR code
  }

  // =========================================================
  // 5) SPA-LITE NAVIGATION (UNCHANGED from your version)
  // =========================================================
  function initSPASwapOnce() {
    if (window.__wmSPAInit) return;
    window.__wmSPAInit = true;

    // ... keep your SPA swap code
  }

  // =========================================================
  // 6) ENHANCERS (fix map selector)
  // =========================================================
  function initEnhancers(root = document) {
    $$('img', root).forEach((img) => {
      if (!img.getAttribute('loading') && img.getAttribute('fetchpriority') !== 'high') img.loading = 'lazy';
      if (!img.getAttribute('decoding')) img.decoding = 'async';
    });

    if (!window.__wmMapLazyBound) {
      window.__wmMapLazyBound = true;

      const frame = $('iframe.embed-responsive-item, .u-map iframe', root);
      if (frame && !frame.dataset.src && frame.src) {
        frame.dataset.src = frame.src;
        frame.removeAttribute('src');
        frame.setAttribute('title', 'Mapa – Masia La Mer');
      }

      const getFrame = () => document.querySelector('iframe.embed-responsive-item, .u-map iframe');

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              const f = getFrame();
              if (f && f.dataset.src && !f.src) f.src = f.dataset.src;
              io.disconnect();
              break;
            }
          }
        }, { rootMargin: '600px 0px' });

        const fNow = getFrame();
        if (fNow) io.observe(fNow);
        WM_CLEANUPS.push(() => io.disconnect());
      } else {
        const fNow = getFrame();
        if (fNow && fNow.dataset.src && !fNow.src) fNow.src = fNow.dataset.src;
      }
    }

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
  function initPage(root = document) {
    runCleanups();
    initCountdown(root);
    initRsvpScroll(root);
    initGiftModal(root);
    initAddToCalendar(root); // ✅ added
    initEnhancers(root);
  }

  // =========================================================
  // 8) ADD TO CALENDAR (ICS + GOOGLE) — tiny handler
  // =========================================================
  function initAddToCalendar(root = document) {
    const btn = root.querySelector('#wm-addtocal');
    if (!btn || btn.dataset.wmCalInit === '1') return;
    btn.dataset.wmCalInit = '1';

    const title = 'Casament Whitney & Marc';
    const description = 'Ens casem! 🥂';
    const location = 'Masia La Mer, Camí de Santa Elena, 30, 08349 Cabrera de Mar, Barcelona, Spain';

    // 18:00 Spain (CEST, UTC+2) = 16:00 UTC
    const startUtc = new Date(Date.UTC(2026, 5, 26, 16, 0, 0));
    const endUtc   = new Date(Date.UTC(2026, 5, 26, 21, 30, 0)); // 23:30 Spain = 21:30 UTC

    const pad2 = (n) => String(n).padStart(2, '0');
    const toICSDateUTC = (d) =>
      d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds()) + 'Z';

    const icsEscape = (s) =>
      String(s || '')
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

    function makeICS() {
      const dtstamp = toICSDateUTC(new Date());
      const dtstart = toICSDateUTC(startUtc);
      const dtend   = toICSDateUTC(endUtc);
      const uid     = 'wm-wedding-' + dtstart + '@wm-invite';

      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//WhitneyMarc//WeddingInvite//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${icsEscape(title)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        `LOCATION:${icsEscape(location)}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ];

      return lines.join('\r\n');
    }

    function googleLink() {
      const fmt = (d) =>
        d.getUTCFullYear() +
        pad2(d.getUTCMonth() + 1) +
        pad2(d.getUTCDate()) + 'T' +
        pad2(d.getUTCHours()) +
        pad2(d.getUTCMinutes()) +
        pad2(d.getUTCSeconds()) + 'Z';

      const dates = `${fmt(startUtc)}/${fmt(endUtc)}`;

      const url = new URL('https://calendar.google.com/calendar/render');
      url.searchParams.set('action', 'TEMPLATE');
      url.searchParams.set('text', title);
      url.searchParams.set('details', description);
      url.searchParams.set('location', location);
      url.searchParams.set('dates', dates);
      return url.toString();
    }

    function openChooser() {
      const old = document.getElementById('wm-cal-pop');
      if (old) old.remove();

      const pop = document.createElement('div');
      pop.id = 'wm-cal-pop';
      pop.style.position = 'fixed';
      pop.style.inset = '0';
      pop.style.zIndex = '999999';
      pop.style.background = 'rgba(0,0,0,.35)';
      pop.style.display = 'grid';
      pop.style.placeItems = 'center';
      pop.style.padding = '16px';

      const card = document.createElement('div');
      card.style.background = '#fff';
      card.style.borderRadius = '14px';
      card.style.maxWidth = '360px';
      card.style.width = '100%';
      card.style.boxShadow = '0 24px 60px rgba(0,0,0,.25)';
      card.style.padding = '14px';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
          <div style="font-weight:700;">Afegir al calendari</div>
          <button type="button" id="wm-cal-close" style="border:0; background:transparent; font-size:22px; line-height:1; cursor:pointer;">×</button>
        </div>
        <div style="margin-top:10px; display:grid; gap:10px;">
          <button type="button" id="wm-cal-ics" style="padding:10px 12px; border-radius:12px; border:1px solid rgba(0,0,0,.12); cursor:pointer; font-weight:600;">
            Descarregar .ics (Apple/Outlook)
          </button>
          <a id="wm-cal-g" href="#" target="_blank" rel="noopener"
             style="text-decoration:none; text-align:center; padding:10px 12px; border-radius:12px; background:#111; color:#fff; font-weight:700;">
            Obrir a Google Calendar
          </a>
        </div>
        <div style="margin-top:10px; font-size:12px; opacity:.7;">
          Hora local: 26/06/2026 · 18:00 (Barcelona)
        </div>
      `;

      pop.appendChild(card);
      document.body.appendChild(pop);

      const close = () => pop.remove();
      pop.addEventListener('click', (e) => { if (e.target === pop) close(); }, { passive: true });
      card.querySelector('#wm-cal-close')?.addEventListener('click', close, { passive: true });

      const g = card.querySelector('#wm-cal-g');
      if (g) g.href = googleLink();

      card.querySelector('#wm-cal-ics')?.addEventListener('click', () => {
        try {
          const blob = new Blob([makeICS()], { type: 'text/calendar;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'whitney-marc-wedding.ics';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        } catch {}
        close();
      }, { passive: true });
    }

    btn.setAttribute('href', '#');
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openChooser();
    }, { passive: false });
  }

  // =========================================================
  // BOOT
  // =========================================================
  function boot() {
    initFontsLoadingClassOnce();
    initProgressAndTopOnce();

    initAudioOnce();

    // Re-enable these after you paste your full sections back in:
    initAROnce();
    // initSPASwapOnce();

    initPage(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => rIC(boot), { once: true });
  } else {
    rIC(boot);
  }

  window.addEventListener('wm:page-swapped', () => {
    setTimeout(() => initPage(document), 30);
  }, { passive: true });

})();
