/* Whitney & Marc – Invite Pack (non-destructive, multi-page) */
(() => {
  const rM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasVibrate = typeof navigator !== 'undefined' && !!navigator.vibrate;

document.documentElement.classList.add('wm-fonts-loading');
(function () {
  const done = () =>
    document.documentElement.classList.remove('wm-fonts-loading');

  if (document.fonts && document.fonts.load) {
    // wait for Playfair Display to load before painting
    Promise.race([
      document.fonts.load('1em "Playfair Display"'),
      new Promise(r => setTimeout(r, 1500))
    ]).then(done, done);
  } else {
    window.addEventListener('load', done, { once: true });
  }
})();

    /* === Wedding Countdown: Days / Hours / Minutes only — multi-widget, throttled === */
    (() => {
      // 18:00 Windhoek (UTC+2) => 16:00 UTC
      const TARGET_UTC_MS = Date.UTC(2026, 5, 26, 16, 0, 0);

      // Inject CSS once (scoped by .wm-triple)
      function ensureCSS() {
        if (document.getElementById('wm-countdown-triple-css')) return;
        const s = document.createElement('style');
        s.id = 'wm-countdown-triple-css';
        s.textContent = `
          .u-countdown.wm-triple .u-countdown-seconds,
          .u-countdown.wm-triple .u-countdown-separator-4,
          .u-countdown.wm-triple .u-countdown-years,
          .u-countdown.wm-triple .u-countdown-numbers,
          .u-countdown.wm-triple .u-countdown-separator-1,
          .u-countdown.wm-triple .u-countdown-separator-5 { display: none !important; }
          .u-countdown.wm-triple .u-countdown-days,
          .u-countdown.wm-triple .u-countdown-hours,
          .u-countdown.wm-triple .u-countdown-minutes,
          .u-countdown.wm-triple .u-countdown-separator-2,
          .u-countdown.wm-triple .u-countdown-separator-3 { display: inline-flex !important; }
        `;
        document.head.appendChild(s);
      }

      function neutralizeVendor(wrap) {
        if (!wrap || wrap._wmNeutralized) return wrap;
        wrap._wmNeutralized = true;
        Array.from(wrap.attributes).forEach(a => {
          if (/^data-/.test(a.name)) wrap.removeAttribute(a.name);
        });
        const clone = wrap.cloneNode(true);
        wrap.replaceWith(clone);
        return clone;
      }

      function digitsInto(counterEl, value, minLen) {
        if (!counterEl) return;
        const str = String(value).padStart(minLen, '0');
        counterEl._wmUpdating = true;
        counterEl.innerHTML = '';
        for (const ch of str) {
          const d = document.createElement('div');
          d.className = 'u-countdown-number u-text-custom-color-8';
          d.textContent = ch;
          counterEl.appendChild(d);
        }
        Promise.resolve().then(() => { counterEl._wmUpdating = false; });
      }

      function compute(nowMs) {
        const diff = Math.max(0, TARGET_UTC_MS - nowMs);
        const total = Math.floor(diff / 1000);
        const days    = Math.floor(total / 86400);
        const hours   = Math.floor((total % 86400) / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        return { days, hours, minutes };
      }

      function initOne(wrap) {
        if (!wrap || wrap._wmTripleInit) return;
        wrap._wmTripleInit = true;

        wrap = neutralizeVendor(wrap);
        wrap.classList.add('wm-triple');
        ensureCSS();

        const daysEl    = wrap.querySelector('.u-countdown-days .u-countdown-counter');
        const hoursEl   = wrap.querySelector('.u-countdown-hours .u-countdown-counter');
        const minutesEl = wrap.querySelector('.u-countdown-minutes .u-countdown-counter');

        const secBlock = wrap.querySelector('.u-countdown-seconds'); if (secBlock) secBlock.style.display = 'none';
        const secSep   = wrap.querySelector('.u-countdown-separator-4'); if (secSep) secSep.style.display = 'none';

        let moBusy = false;
        const mo = new MutationObserver(() => {
          if (moBusy) return;
          moBusy = true;
          requestAnimationFrame(() => {
            if (!(daysEl?._wmUpdating || hoursEl?._wmUpdating || minutesEl?._wmUpdating)) tick();
            moBusy = false;
          });
        });
        mo.observe(wrap, { subtree:true, childList:true, characterData:true });

        function tick() {
          const { days, hours, minutes } = compute(Date.now());
          digitsInto(daysEl,    days,    Math.max(2, String(days).length));
          digitsInto(hoursEl,   hours,   2);
          digitsInto(minutesEl, minutes, 2);
        }

        tick();
        const id = setInterval(tick, 1000);
        wrap._wmCountdownCleanup = () => { clearInterval(id); mo.disconnect(); };
      }

      function start() {
        document.querySelectorAll('.u-countdown').forEach(initOne);
      }

      (document.readyState === 'loading')
        ? document.addEventListener('DOMContentLoaded', start, { once:true })
        : start();

      window.addEventListener('wm:page-swapped', start);
    })();

    /* Top scroll progress line – idle boot + passive listeners */
    (() => {
      const ensureBar = () => {
        let bar = document.getElementById('wm-progress');
        if (!bar) {
          bar = document.createElement('div');
          bar.id = 'wm-progress';
          document.body.prepend(bar);
        }
        return bar;
      };

      let bar, raf = null, hideTimer = null;
      function update() {
        raf = null;
        const doc = document.documentElement;
        const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
        const y   = Math.max(0, window.pageYOffset || doc.scrollTop || 0);
        const p   = Math.min(1, y / max);
        if (!bar) bar = ensureBar();
        bar.style.transform = 'scaleX(' + p + ')';
      }
      function onScroll() {
        if (!raf) raf = requestAnimationFrame(update);
        document.body.classList.add('wm-scrolling');
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => document.body.classList.remove('wm-scrolling'), 300);
      }

      function boot(){
        bar = ensureBar();
        window.addEventListener('scroll', onScroll, { passive:true });
        window.addEventListener('resize', onScroll, { passive:true });
        update();
      }

      const rIC = window.requestIdleCallback || (cb => setTimeout(cb, 120));
      (document.readyState === 'loading')
        ? document.addEventListener('DOMContentLoaded', () => rIC(boot), { once:true })
        : rIC(boot);
    })();

    <!-- Back to top button -->
    <button id="wm-top" class="wm-top" aria-label="Back to top">
      <svg viewBox="0 0 256 256" width="22" height="22" aria-hidden="true">
        <path d="M128 16l48 48h-26l30 130H76l30-130H80l48-48zM64 224h128l-8 24H72l-8-24z" fill="currentColor"/>
      </svg>
    </button>
      
    /* Back-to-top: minimal work, no layout thrash */
    (() => {
      const btn = document.getElementById('wm-top');
      if (!btn) return;
      const prefersReduce = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

      const reveal = () => btn.classList.toggle('show', window.scrollY > 600);
      window.addEventListener('scroll', reveal, { passive:true });
      window.addEventListener('load', reveal,   { passive:true });
      reveal();

      btn.addEventListener('click', () => {
        if (prefersReduce) window.scrollTo(0, 0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      }, { passive:true });
    })();

    /* === Global Audio Manager (lazy src, persist, one script) === */
    (() => {
      const AUDIO_SRC = 'https://raw.githubusercontent.com/Max-Angula/wedding-audio/main/Hot%20Chip%20%E2%80%93%20Devotion.mp3';
      const TARGET_VOL = 0.85;

      const K = {
        approved: 'wmAudioApproved',
        playing:  'wmAudioPlaying',
        anchor:   'wmAudioAnchorMs',
        lastT:    'wmAudioLastSec'
      };

      const get = (k, d=null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
      const set = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
      function approved() { return get(K.approved) === '1'; }
      function setApproved(v=true){ set(K.approved, v ? '1':'0'); }
      function wantsPlaying(){ return get(K.playing, '1') === '1'; }
      function setWantsPlaying(v){ set(K.playing, v ? '1':'0'); }
      function getAnchor(){ const v = parseInt(get(K.anchor) || '', 10); return isFinite(v) ? v : null; }
      function setAnchor(ms){ set(K.anchor, String(ms)); }
      function getLastT(){ const v = parseFloat(get(K.lastT) || ''); return isFinite(v) ? v : 0; }
      function setLastT(sec){ set(K.lastT, String(Math.max(0, sec|0))); }

      function ensureAudio() {
        let a = document.getElementById('wm-audio');
        if (!a) {
          a = document.createElement('audio');
          a.id = 'wm-audio';
          a.preload = 'none';     // 🟢 do not fetch until needed
          a.loop = true;
          a.autoplay = false;
          a.playsInline = true;
          a.crossOrigin = 'anonymous';
          // no src yet — set on first play
          document.body.appendChild(a);
        }
        return a;
      }

      function fadeTo(audio, toVol, ms=600) {
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
        const anchor = getAnchor();
        if (anchor && duration && isFinite(duration) && duration > 1) {
          const elapsed = Math.max(0, (now - anchor) / 1000);
          return elapsed % duration;
        }
        return getLastT();
      }

      async function loadSrcIfNeeded(audio){
        if (!audio.src) {
          audio.src = AUDIO_SRC;
          try {
            await audio.load?.();
          } catch {}
        }
      }

      async function startPlayback(audio){
        await loadSrcIfNeeded(audio);
        if (!approved()) {
          setApproved(true);
          setAnchor(Date.now() - Math.floor(audio.currentTime || 0) * 1000);
        }
        try {
          audio.volume = 0.0;
          await audio.play();
          setWantsPlaying(true);
          fadeTo(audio, TARGET_VOL, 900);
        } catch {}
      }

      function wireFirstGesture(fn){
        const once = async () => { off(); await fn(); };
        const off  = () => ['click','touchstart','keydown','scroll'].forEach(ev => window.removeEventListener(ev, once, { passive:true }));
        ['click','touchstart','keydown','scroll'].forEach(ev => window.addEventListener(ev, once, { passive:true, once:true }));
      }

      function upsertToggle(){
        let btn = document.getElementById('toggle-audio');
        if (!btn) {
          btn = document.createElement('button');
          btn.id = 'toggle-audio';
          btn.className = 'wm-speaker';
          btn.title = 'Música';
          document.body.appendChild(btn);
        } else {
          btn.classList.add('wm-speaker');
        }
        return btn;
      }

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

      function setIcon(btn, playing){
        btn.innerHTML = playing ? SVG_ON : SVG_OFF;
        btn.classList.toggle('playing', playing);
        btn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
      }

      async function boot(){
        const audio = ensureAudio();
        const btn = upsertToggle();

        // Keep last position persisted
        audio.addEventListener('timeupdate', () => setLastT(audio.currentTime));
        audio.addEventListener('seeking',    () => setLastT(audio.currentTime));
        audio.addEventListener('play',       () => setWantsPlaying(true));
        audio.addEventListener('pause',      () => setWantsPlaying(false));

        audio.addEventListener('loadedmetadata', () => {
          const t = computeCurrentTime(audio.duration);
          try { audio.currentTime = t; } catch {}
        }, { once:true });

        // Initial icon
        setIcon(btn, !audio.paused);

        btn.addEventListener('click', async () => {
          if (audio.paused) {
            if (!getAnchor()) setAnchor(Date.now() - Math.floor(audio.currentTime || 0) * 1000);
            await startPlayback(audio);
          } else {
            try { audio.pause(); } catch {}
            setWantsPlaying(false);
          }
          setIcon(btn, !audio.paused);
          try { navigator.vibrate && navigator.vibrate(8); } catch {}
        });

        // Media Session
        if ('mediaSession' in navigator) {
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: 'Ceremony Prelude',
              artist: 'Whitney & Marc',
              album: 'Wedding Invitation'
            });
            navigator.mediaSession.setActionHandler('play',  () => startPlayback(audio));
            navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); setWantsPlaying(false); });
          } catch {}
        }

        // If previously approved and user wanted playing, try to resume (may still need gesture on mobile)
        if (approved() && wantsPlaying()) {
          try {
            await startPlayback(audio);
          } catch {
            wireFirstGesture(() => startPlayback(audio));
          }
        } else if (!approved()) {
          wireFirstGesture(() => startPlayback(audio));
        }

        // Safety persist
        setInterval(() => { if (!audio.paused) setLastT(audio.currentTime); }, 1500);
      }

      (document.readyState === 'loading')
        ? document.addEventListener('DOMContentLoaded', boot, { once:true })
        : boot();

      window.addEventListener('wm:page-swapped', () => setTimeout(boot, 30));
    })();

    <!-- /js/wm-enhance.js -->
    ;(() => {
      if (window.__wmEnhanceLoaded) return;
      window.__wmEnhanceLoaded = true;

      // Idle-callback with fallback (kept behavior)
      const rIC = window.requestIdleCallback || ((cb) => setTimeout(cb, 120));

      // Shorthand queryAll with optional container
      const qSA = (sel, container = document) => Array.from(container.querySelectorAll(sel));

      // expose for later blocks that call rIC/qSA
      window.rIC = rIC;
      window.qSA = qSA;

      // ...rest of your logic here...
    })();
    
      /* -------- Images: best-effort lazy & async (skip hero) -------- */
      function enhanceImages(){
        qSA('img:not([loading])').forEach(img => {
          // skip if marked high priority
          if (img.getAttribute('fetchpriority') === 'high') return;
          img.loading = 'lazy';
        });
        qSA('img:not([decoding])').forEach(img => { img.decoding = 'async'; });
      }

      /* -------- Google Maps: true lazy iframe -------- */
      function lazyMap(){
        const frame = document.querySelector('section[id="block-1"] iframe.embed-responsive-item');
        if (!frame) return;
        if (!frame.dataset.src) {
          frame.dataset.src = frame.src;
          frame.removeAttribute('src'); // no network until near viewport
          frame.setAttribute('title','Map – Masia La Mer');
        }
        const io = new IntersectionObserver((entries) => {
          for (const e of entries){
            if (e.isIntersecting){
              if (!frame.src) frame.src = frame.dataset.src;
              io.disconnect();
              break;
            }
          }
        }, { rootMargin: '600px 0px' });
        io.observe(frame);
      }

      /* -------- Gifts modal: add focus trap (leave your logic intact) -------- */
      function giftModalA11y(){
        const modal = document.getElementById('wm-gift-modal');
        const openBtn = document.getElementById('wm-gift-link');
        if (!modal || !openBtn) return;

        const dlg = modal.querySelector('.wmg-dialog');
        const closeEls = modal.querySelectorAll('[data-wm-close], .wmg-close');

        function isOpen(){ return modal.classList.contains('wmg-open'); }
        function focusables(){
          return qSA('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])', dlg)
                 .filter(el => el.offsetParent !== null);
        }
        function trap(e){
          if (!isOpen() || e.key !== 'Tab') return;
          const list = focusables(); if (!list.length) return;
          const first = list[0], last = list[list.length-1];
          if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
          else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
        }
        function onOpen(){
          modal.setAttribute('aria-hidden','false');
          const first = focusables()[0];
          setTimeout(()=> first && first.focus(), 30);
          document.addEventListener('keydown', trap);
          // Mark role/label once
          dlg.setAttribute('role','dialog');
          dlg.setAttribute('aria-modal','true');
          dlg.setAttribute('aria-labelledby', dlg.querySelector('h3')?.id || 'wmg-title');
        }
        function onClose(){
          modal.setAttribute('aria-hidden','true');
          document.removeEventListener('keydown', trap);
          setTimeout(()=> openBtn.focus(), 40);
        }

        // Hook into your existing open/close by observing class
        const mo = new MutationObserver(() => {
          if (isOpen()) onOpen(); else onClose();
        });
        mo.observe(modal, { attributes:true, attributeFilter:['class'] });

        // Ensure all “close” affordances have role
        closeEls.forEach(btn => btn.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Close'));
      }

      /* -------- Reduced motion: tone down effects & audio resume -------- */
      function reducedMotion(){
        const m = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!m || !m.matches) return;

        // Kill ripple pulses if present
        const css = document.createElement('style');
        css.textContent = `
          #toggle-audio.wm-speaker.playing::before { animation:none !important; opacity:.08; }
          .wm-r { animation:none !important; opacity:.25 !important; }
        `;
        document.head.appendChild(css);

        // Don’t auto-resume audio; user can still tap the button
        try { localStorage.setItem('wmAudioPlaying','0'); } catch {}
      }

      /* -------- Minor A11Y: empty href as buttons -------- */
      function buttonizeEmptyHrefs(){
        qSA('a[href=""], a:not([href])').forEach(a => {
          a.setAttribute('role','button');
          a.setAttribute('tabindex','0');
        });
      }

      /* -------- Boot (defer non-critical) -------- */
      function boot(){
        enhanceImages();
        reducedMotion();
        buttonizeEmptyHrefs();

        // Use the rIC helper if available, otherwise fall back to setTimeout
        const idle = (window.rIC && typeof window.rIC === 'function')
          ? window.rIC
          : (cb) => setTimeout(cb, 120);

        idle(lazyMap);
        idle(giftModalA11y);
      }

      (document.readyState === 'loading')
        ? document.addEventListener('DOMContentLoaded', boot, { once:true })
        : boot();

      window.addEventListener('wm:page-swapped', () => setTimeout(boot, 30), { passive:true });

  /* ---------- Persistent container + UI ---------- */
  function ensurePersist() {
    let persist = document.getElementById('wm-persist');
    if (!persist) {
      persist = document.createElement('div');
      persist.id = 'wm-persist';
      document.body.appendChild(persist);
    }
    return persist;
  }

  function speakerSVG(on=true){
    return on ? (
`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M11 5 7 9H3v6h4l4 4V5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
  <path d="M17 9a5 5 0 0 1 0 6M20 7a8 8 0 0 1 0 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>
</svg>`
    ) : (
`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M11 5 7 9H3v6h4l4 4V5Z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
  <path d="M16 9l5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>`
    );
  }

  function injectUI() {
    // overlay
    let overlay = document.getElementById('wm-sound-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'wm-sound-overlay';
      overlay.style.display = 'none'; // hidden unless truly needed
      overlay.innerHTML = `
        <div class="card">
          <div style="font-size:1.2rem;margin-bottom:6px;">Tap to enable sound</div>
          <div style="font-size:.95rem;opacity:.8">Some browsers block autoplay with audio.</div>
          <button id="wm-enable-btn" aria-label="Enable sound">
            ${speakerSVG(false)} <span>Enable</span>
          </button>
        </div>`;
      document.body.appendChild(overlay);
    }

    // toggle
    let toggle = document.getElementById('wm-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'wm-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-label','Play music');
      toggle.style.display = 'none';
      toggle.innerHTML = `<span id="wm-toggle-label">${speakerSVG(false)}</span>`;
      ensurePersist().appendChild(toggle);
    }

    // lens (kept, but no particle trail)
    let lens = document.getElementById('wm-lens');
    if (!lens) {
      lens = document.createElement('div');
      lens.id = 'wm-lens';
      document.body.appendChild(lens);
    }

    return { overlay, toggle, lens };
  }
  window.wmInjectUI = injectUI;
  
  <!-- ✅ New, simplified Add-to-Calendar handler (single source of truth, mobile-friendly) -->
    (() => {
      const btn = document.getElementById('wm-addtocal');
      if (!btn) return;

      const title   = 'Whitney & Marc — Wedding';
      const start   = new Date(Date.UTC(2026, 5, 26, 16, 0, 0)); // 18:00 Windhoek (UTC+2)
      const end     = new Date(Date.UTC(2026, 5, 26, 20, 0, 0));
      const details = 'Masia La Mer · Cabrera de Mar\nhttps://lamerbcn.com/';
      const loc     = 'Masia La Mer, Camí de Santa Elena, 30, Cabrera de Mar';

      const dt = (u) => u.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
      const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + '&text=' + encodeURIComponent(title)
        + '&dates=' + dt(start) + '/' + dt(end)
        + '&details=' + encodeURIComponent(details)
        + '&location=' + encodeURIComponent(loc);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Use same tab – more reliable on mobile than window.open
        window.location.href = url;
      });
    })();

/* ---------- Audio singleton + seamless resume ---------- */
function ensureAudio() {
  let audio = document.getElementById('wm-audio');
  const persist = ensurePersist();
  if (!audio) {
    audio = document.createElement('audio');
    audio.id = 'wm-audio';
    audio.preload = 'auto';
    audio.loop = true;
    audio.autoplay = false;     // ✅ important: we control play() in code
    audio.playsInline = true;
    audio.crossOrigin = 'anonymous';
    audio.src = 'https://raw.githubusercontent.com/Max-Angula/wedding-audio/main/Hot%20Chip%20%E2%80%93%20Devotion.mp3';
    persist.appendChild(audio);
  } else if (audio.parentElement !== persist) {
    persist.appendChild(audio);
  }
  return audio;
}

/* 🔧 Remove any legacy page-level audio to prevent double-play */
(function removeLegacyAudio(){
  // kill hardcoded #wedding-audio if present
  document.querySelectorAll('#wedding-audio').forEach(el => {
    try { el.pause(); } catch {}
    el.remove();
  });
  // pause any other <audio> tags except our singleton
  document.querySelectorAll('audio:not(#wm-audio)').forEach(el => {
    try { el.pause(); } catch {}
  });
})();

  /* ---------- Lens follow (NO cursor trail) ---------- */
  const lensMove = (() => {
    const lens = () => document.getElementById('wm-lens');
    let lx=0, ly=0, scheduled=false;
    function move(x,y){ const l = lens(); if (l) l.style.transform = `translate(${x-50}px, ${y-50}px)`; }
    return (x,y) => {
      lx=x; ly=y;
      if (!scheduled){ scheduled=true; requestAnimationFrame(()=>{ move(lx,ly); scheduled=false; }); }
    };
  })();

  document.addEventListener('mousemove', e => lensMove(e.clientX, e.clientY), { passive:true });
  document.addEventListener('touchmove', e => { const t=e.touches[0]; if (t) lensMove(t.clientX, t.clientY); }, { passive:true });

  /* Optional click bloom stays — remove this block if you also want no click effect */
  document.addEventListener('click', e => {
    const bloom = document.createElement('div');
    bloom.style.position='absolute';
    bloom.style.left=(e.clientX-25)+'px';
    bloom.style.top=(e.clientY-25)+'px';
    bloom.style.width='50px'; bloom.style.height='50px'; bloom.style.borderRadius='50%';
    bloom.style.background='radial-gradient(circle, rgba(255,240,220,.8), transparent)';
    bloom.style.animation='wmBloom 2s ease-out forwards'; bloom.style.pointerEvents='none'; bloom.style.zIndex='1000';
    document.body.appendChild(bloom); setTimeout(()=>bloom.remove(),2000);
    if (hasVibrate) navigator.vibrate(5);
  }, { passive:true });

  (()=>{ const s=document.createElement('style'); s.textContent='@keyframes wmBloom{0%{transform:scale(.5);opacity:1}70%{transform:scale(1.4);opacity:.5}100%{transform:scale(2);opacity:0}}'; document.head.appendChild(s); })();

  /* ---------- Device tilt (globals) ---------- */
  (() => {
    if (rM) return;
    let enabled=false, gamma=0, beta=0, raf=null;
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    const apply=()=>{ raf=null;
      const x = clamp(gamma,-20,20), y = clamp(beta,-20,20), k=.4;
      document.documentElement.style.setProperty('--wm-tilt-x', (x*k)+'px');
      document.documentElement.style.setProperty('--wm-tilt-y', (y*k)+'px');
    };
    const schedule=()=>{ if(!raf) raf=requestAnimationFrame(apply); };
    function onOri(e){ gamma = e.gamma||0; beta=e.beta||0; schedule(); }

    async function enable(){
      if (enabled) return true;
      try{
        if (typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function') {
          const res = await DeviceOrientationEvent.requestPermission();
          if (res!=='granted') return false;
        }
        window.addEventListener('deviceorientation', onOri, { passive:true });
        enabled=true; return true;
      } catch { return false; }
    }
    enable();
    const tryOnGesture = async () => { const ok = await enable(); if (ok) off(); };
    const off = () => ['touchstart','click','keydown'].forEach(ev=>window.removeEventListener(ev, tryOnGesture, { passive:true }));
    ['touchstart','click','keydown'].forEach(ev=>window.addEventListener(ev, tryOnGesture, { passive:true, once:true }));
  })();

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    injectUI();
    const audio = ensureAudio();
    setupMediaSession(audio);

    const unlocked = isUnlocked();
    await tryAutoplay(audio, /* suppressOverlay */ unlocked);
    bindAudioControls(audio);

    const t = document.getElementById('wm-toggle');
    if (t) t.style.display='flex';

    startResumeWatchdog(audio);
  });

})();

/* ---------- SPA-lite navigation (Nicepage-friendly) ---------- */
(() => {
  function isInternal(url) {
    if (!url) return false;
    if (/^(mailto:|tel:|javascript:)/i.test(url)) return false;
    if (/^https?:\/\//i.test(url)) {
      try { return new URL(url).origin === location.origin && url.endsWith('.html'); }
      catch { return false; }
    }
    return /\.html(\?|#|$)/i.test(url);
  }

  function resolve(url) { try { return new URL(url, location.href).href; } catch { return url; } }

  function syncPageCSS(fromDoc) {
    const existing = new Set(Array.from(document.querySelectorAll('head link[rel="stylesheet"]')).map(l => l.href));
    Array.from(fromDoc.querySelectorAll('head link[rel="stylesheet"]'))
      .filter(l => !/wm-pack\.css$/i.test(l.getAttribute('href')||''))
      .forEach(link => { if (!existing.has(link.href)) document.head.appendChild(link.cloneNode(true)); });
  }

  async function loadAndSwap(url, push = true) {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(res.statusText);
      const html = await res.text();

      const parser = new DOMParser();
      const nextDoc = parser.parseFromString(html, 'text/html');

      document.title = nextDoc.title || document.title;

      const persist = document.getElementById('wm-persist');
      const body = document.body;

      Array.from(body.childNodes).forEach(node => { if (node !== persist) body.removeChild(node); });

      const incoming = Array.from(nextDoc.body.childNodes);
      incoming.forEach(node => { if (node.nodeType === 1 && node.id === 'wm-persist') return; body.appendChild(node.cloneNode(true)); });

      try { window.wmInjectUI && window.wmInjectUI(); } catch {}

      const audio = document.getElementById('wm-audio');
      if (audio) {
        audio.muted = false;
        audio.play().catch(()=>{});
        requestAnimationFrame(() => audio.play().catch(()=>{}));
        setTimeout(() => audio.play().catch(()=>{}), 120);
        window.wmStartResumeWatchdog && window.wmStartResumeWatchdog(audio);
      }

      syncPageCSS(nextDoc);
      if (push) history.pushState({ url }, '', url);
      window.scrollTo(0, 0);
      window.dispatchEvent(new CustomEvent('wm:page-swapped', { detail: { url } }));
    } catch (e) {
      location.href = url;
    }
  }

  function onClick(e) {
    let el = e.target.closest && e.target.closest('[data-href]');
    if (el) {
      const url = el.getAttribute('data-href');
      if (isInternal(url)) { e.preventDefault(); return loadAndSwap(resolve(url), true); }
    }
    const a = e.target.closest && e.target.closest('a[href]');
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
    const audio = document.getElementById('wm-audio');
    if (audio) window.wmStartResumeWatchdog && window.wmStartResumeWatchdog(audio);
  });

  document.addEventListener('click', onClick, { capture: true });
})();

/* === Whitney & Marc — Wedding Countdown (Windhoek) — CLEAN UNITS === */
(() => {
  const TARGET_UTC_MS = Date.UTC(2026, 5, 19, 16, 0, 0);

  const VISIBLE_UNIT_SELECTORS = [
    '.u-countdown-days',
    '.u-countdown-hours',
    '.u-countdown-minutes',
    '.u-countdown-seconds'
  ];
  const VISIBLE_SEPARATORS = ['.u-countdown-separator-2', '.u-countdown-separator-3', '.u-countdown-separator-4'];

  function findCountdownRoot(doc = document){
    return doc.querySelector('#sec-01f7 .u-countdown') || doc.querySelector('.u-countdown');
  }

  function hide(el){ if (el) el.style.display = 'none'; }
  function showInlineFlex(el){ if (el) el.style.display = 'inline-flex'; }

  function setupVisibility(wrap){
    if (!wrap) return;
    wrap.querySelectorAll('.u-countdown-item').forEach(hide);
    wrap.querySelectorAll('.u-countdown-separator').forEach(hide);
    VISIBLE_UNIT_SELECTORS.forEach(sel => wrap.querySelectorAll(sel).forEach(showInlineFlex));
    VISIBLE_SEPARATORS.forEach(sel => wrap.querySelectorAll(sel).forEach(showInlineFlex));
    const msg = wrap.querySelector('.u-countdown-message');
    if (msg) msg.classList.add('u-hidden');
  }

  function renderDigits(counterEl, value, minDigits){
    if (!counterEl) return;
    const str = String(value).padStart(minDigits, '0');
    counterEl.innerHTML = '';
    for (const ch of str){
      const d = document.createElement('div');
      d.className = 'u-countdown-number u-text-custom-color-8';
      d.textContent = ch;
      counterEl.appendChild(d);
    }
  }

  function startCountdown(root = document){
    const wrap = findCountdownRoot(root);
    if (!wrap) return () => {};
    if (wrap._wmCountdownTimer) clearInterval(wrap._wmCountdownTimer);

    setupVisibility(wrap);

    const daysBox    = wrap.querySelector('.u-countdown-days .u-countdown-counter');
    const hoursBox   = wrap.querySelector('.u-countdown-hours .u-countdown-counter');
    const minutesBox = wrap.querySelector('.u-countdown-minutes .u-countdown-counter');
    const secondsBox = wrap.querySelector('.u-countdown-seconds .u-countdown-counter');
    const doneMsg    = wrap.querySelector('.u-countdown-message');

    function tick(){
      const now  = Date.now();
      let diff   = TARGET_UTC_MS - now;

      if (diff <= 0){
        renderDigits(daysBox, 0, 2);
        renderDigits(hoursBox, 0, 2);
        renderDigits(minutesBox, 0, 2);
        renderDigits(secondsBox, 0, 2);
        if (doneMsg) doneMsg.classList.remove('u-hidden');
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const days     = Math.floor(totalSec / 86400);
      const hours    = Math.floor((totalSec % 86400) / 3600);
      const minutes  = Math.floor((totalSec % 3600) / 60);
      const seconds  = totalSec % 60;

      renderDigits(daysBox,    days,    Math.max(2, String(days).length));
      renderDigits(hoursBox,   hours,   2);
      renderDigits(minutesBox, minutes, 2);
      renderDigits(secondsBox, seconds, 2);
      if (doneMsg) doneMsg.classList.add('u-hidden');
    }

    tick();
    wrap._wmCountdownTimer = setInterval(tick, 1000);
    return () => clearInterval(wrap._wmCountdownTimer);
  }

  (function injectOnce(){
    if (document.getElementById('wm-countdown-fix-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-countdown-fix-css';
    s.textContent = `
      #sec-01f7 .u-countdown .u-countdown-item,
      #sec-01f7 .u-countdown .u-countdown-separator { display: none !important; }
      #sec-01f7 .u-countdown .u-countdown-days,
      #sec-01f7 .u-countdown .u-countdown-hours,
      #sec-01f7 .u-countdown .u-countdown-minutes,
      #sec-01f7 .u-countdown .u-countdown-seconds,
      #sec-01f7 .u-countdown .u-countdown-separator-2,
      #sec-01f7 .u-countdown .u-countdown-separator-3,
      #sec-01f7 .u-countdown .u-countdown-separator-4 { display: inline-flex !important; }
    `;
    document.head.appendChild(s);
  })();

  let cleanup = startCountdown(document);
  window.addEventListener('wm:page-swapped', () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = startCountdown(document);
  });
})();

/* === Layered Parallax (flowers/backgrounds) === */
(() => {
  const prefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  (function injectParallaxCSS(){
    if (document.getElementById('wm-parallax-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-parallax-css';
    s.textContent = `
      .parallax-wrap { position: relative; isolation: isolate; }
      .parallax-layer { position: absolute; inset: 0; pointer-events: none; }
      [data-depth] { transform: translate3d(0,0,0); will-change: transform; transition: transform .25s ease; }
    `;
    document.head.appendChild(s);
  })();

  function applyParallax(root=document){
    const computed = getComputedStyle(document.documentElement);
    const tx = parseFloat(computed.getPropertyValue('--wm-tilt-x')) || 0;
    const ty = parseFloat(computed.getPropertyValue('--wm-tilt-y')) || 0;
    root.querySelectorAll('[data-depth]').forEach(el => {
      const depth = parseFloat(el.getAttribute('data-depth') || '1');
      el.style.transform = `translate3d(${tx*depth}px, ${ty*depth}px, 0)`;
    });
  }

  let raf=null;
  const queue = () => { if (!raf) raf=requestAnimationFrame(() => { raf=null; applyParallax(); }); };

  window.addEventListener('deviceorientation', queue, { passive:true });
  window.addEventListener('mousemove', queue, { passive:true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queue(); });
  window.addEventListener('wm:page-swapped', () => setTimeout(queue, 60));
})();

/* === Card Tilt + Golden Glare (with WOW mobile tilt) === */
(() => {
  const prefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  (function injectTiltCSS(){
    if (document.getElementById('wm-tilt-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-tilt-css';
    s.textContent = `
      .tilt-card {
        position: relative;
        transform-style: preserve-3d;
        transition: transform .18s ease, box-shadow .18s ease;
        box-shadow: 0 8px 28px rgba(0,0,0,.08);
        border-radius: 18px;
        will-change: transform;
      }
      .tilt-card .glare {
        position: absolute; inset: -2px;
        background: radial-gradient(120px 40px at var(--gx,50%) var(--gy,0%),
                    rgba(255,248,220,.65), rgba(255,248,220,0) 60%);
        mix-blend-mode: screen; pointer-events: none; border-radius: inherit;
        opacity: .0; transition: opacity .2s ease;
      }
      .tilt-card.is-tilting .glare { opacity: .9; }
    `;
    document.head.appendChild(s);
  })();

  const MAX = 8;

  function bindTilt(el){
    el.classList.add('tilt-card');
    let glare = el.querySelector('.glare');
    if (!glare) { glare = document.createElement('div'); glare.className = 'glare'; el.appendChild(glare); }

    const setFromPoint = (x, y) => {
      const r = el.getBoundingClientRect();
      const px = (x - r.left) / r.width;
      const py = (y - r.top)  / r.height;
      const rx = (py - .5) * -MAX;
      const ry = (px - .5) *  MAX;
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      glare.style.setProperty('--gx', `${px*100}%`);
      glare.style.setProperty('--gy', `${py*100}%`);
    };

    const onMove = e => { el.classList.add('is-tilting'); setFromPoint(e.clientX, e.clientY); };
    const onLeave= () => { el.classList.remove('is-tilting'); el.style.transform = ''; };

    el.addEventListener('pointermove', onMove, { passive:true });
    el.addEventListener('pointerleave', onLeave, { passive:true });

    if (!prefersReduced) {
      const GAIN_X = 5.0, GAIN_Y = 3.2, SMOOTH = 0.18, MAX_DEG = 14;
      let g0=0,b0=0,gx=0,by=0,calibrated=false,rafId=null;
      const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
      const requestPermissionIfNeeded = async () => {
        try{
          if (typeof DeviceOrientationEvent!=='undefined' &&
              typeof DeviceOrientationEvent.requestPermission==='function'){
            return (await DeviceOrientationEvent.requestPermission())==='granted';
          }
          return true;
        } catch { return false; }
      };
      const calibrate=()=>{ calibrated=false; };
      let lastTap=0;
      el.addEventListener('touchend', ()=>{ const n=Date.now(); if(n-lastTap<350) calibrate(); lastTap=n; }, { passive:true });

      const applyFromGyro=(gamma,beta)=>{
        if (!calibrated){ g0=gamma||0; b0=beta||0; calibrated=true; }
        const targetX=( (gamma-g0)||0 )*GAIN_X;
        const targetY=( (beta -b0)||0 )*GAIN_Y;
        gx += (targetX - gx)*SMOOTH;
        by += (targetY - by)*SMOOTH;
        const rx = clamp((by/10), -MAX_DEG, MAX_DEG);
        const ry = clamp((gx/10), -MAX_DEG, MAX_DEG);
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width/2 + gx;
        const cy = r.top  + r.height/2 + by;
        el.classList.add('is-tilting');
        el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
        glare.style.setProperty('--gx', `${((cx-r.left)/r.width)*100}%`);
        glare.style.setProperty('--gy', `${((cy-r.top )/r.height)*100}%`);
      };

      const onTilt = (ev)=>{
        if (rafId) return;
        rafId = requestAnimationFrame(()=>{ rafId=null; applyFromGyro(ev.gamma??0, ev.beta??0); });
      };

      const prime = async ()=>{
        document.removeEventListener('touchstart', prime, true);
        document.removeEventListener('click', prime, true);
        if (await requestPermissionIfNeeded()){
          window.addEventListener('deviceorientation', onTilt, { passive:true });
          calibrate();
        }
      };
      document.addEventListener('touchstart', prime, true);
      document.addEventListener('click', prime, true);
      window.addEventListener('orientationchange', calibrate);
      document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) calibrate(); });
    }
  }

  function init(root=document){ root.querySelectorAll('[data-tilt]').forEach(bindTilt); }
  init();
  window.addEventListener('wm:page-swapped', () => setTimeout(()=>init(), 30));
})();

/* === AR "Golden Dust" Camera — lightweight, mobile-first === */
/* === AR "Golden Dust" Camera — lightweight, mobile-first === */
(() => {
  const prefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ... (unchanged helpers)

  function ensureOverlay(){
    let root = document.getElementById('wm-ar-overlay');
    if (root) return root;
    // ... (creates overlay + buttons)
    return root;
  }

  // NEW: make sure the floating AR button is created on page load
  document.addEventListener('DOMContentLoaded', () => { ensureOverlay(); });

  // NEW: also re-create after SPA swaps so the button persists across pages
  window.addEventListener('wm:page-swapped', () => { ensureOverlay(); });

  // ... (open(), startParticles(), handlers)
  window.wmOpenGoldDustAR = open;

  // keep the attribute-trigger too
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-ar="gold-dust"]');
    if (trigger) { e.preventDefault(); open(); }
  }, { passive: false });
})();

(() => {
  const prefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  let duckUndo = null;
  function duckMusic(vol = 0.35) {
    const a = document.getElementById('wm-audio');
    if (!a) return () => {};
    const prev = a.volume;
    try { a.volume = clamp(vol, 0, 1); } catch {}
    duckUndo = () => { try { a.volume = prev; } catch {} };
    return duckUndo;
  }

  (function injectCSS(){
    if (document.getElementById('wm-ar-golddust-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-ar-golddust-css';
    s.textContent = `
      #wm-ar-btn {
        position: fixed; right: 14px; bottom: 86px; z-index: 9999;
        width: 54px; height: 54px; border-radius: 50%;
        border: none; background: rgba(0,0,0,.65); color: #fff;
        display: grid; place-items: center; font-weight: 700; letter-spacing:.3px;
        box-shadow: 0 8px 22px rgba(0,0,0,.25); backdrop-filter: blur(6px);
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
        font-weight: 700; font-family: inherit; letter-spacing:.2px; cursor: pointer;
        box-shadow: 0 8px 28px rgba(0,0,0,.35);
      }
      #wm-ar-close { background: rgba(255,255,255,.92); padding: 10px 14px; }
      #wm-ar-snap  { background: rgba(255,223,120,.95); padding: 12px 18px; }
    `;
    document.head.appendChild(s);
  })();

  function ensureOverlay(){
    let root = document.getElementById('wm-ar-overlay');
    if (root) return root;

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

    if (!document.getElementById('wm-ar-btn')) {
      const b = document.createElement('button');
      b.id = 'wm-ar-btn'; b.textContent = 'AR';
      b.addEventListener('click', (e)=>{ e.preventDefault(); open(); }, { passive:false });
      document.body.appendChild(b);
    }

    return root;
  }

  function makeGoldColor(){
    const h  = 38 + Math.random()*10;
    const s  = 88 + Math.random()*8;
    const l  = 60 + Math.random()*10;
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function startParticles(canvas, opts){
    const ctx = canvas.getContext('2d', { alpha: true });
    const DPR = clamp(window.devicePixelRatio || 1, 1, 2);

    let w = 0, h = 0, raf = null, tLast = performance.now();
    let windX = 0, windY = 40;
    let twinkle = 0;

    function resize(){
      const r = canvas.getBoundingClientRect();
      w = Math.floor(r.width  * DPR);
      h = Math.floor(r.height * DPR);
      canvas.width = w; canvas.height = h;
      ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    resize();
    window.addEventListener('resize', resize);

    const targetCount = Math.round(
      clamp((canvas.clientWidth * canvas.clientHeight) * (opts.density || 0.00006), 40, 140)
    );

    const particles = [];
    function spawnParticle(yTop = Math.random()*canvas.clientHeight){
      const size = (Math.random()* (opts.maxSize || 2.2)) + (opts.minSize || 0.6);
      particles.push({
        x: Math.random()*canvas.clientWidth,
        y: yTop,
        r: size,
        vx: (Math.random()-.5) * (opts.wander || 14),
        vy: (opts.fallSpeed || 22) + Math.random()*18,
        glow: makeGoldColor(),
        tw: Math.random()*Math.PI*2
      });
    }
    for (let i=0;i<targetCount;i++) spawnParticle(Math.random()*canvas.clientHeight);

    let beta=0,gamma=0;
    const onTilt = (ev) => { beta  = ev.beta  || 0; gamma = ev.gamma || 0; };
    if (!prefersReduced) window.addEventListener('deviceorientation', onTilt, { passive:true });

    canvas.addEventListener('pointerdown', () => { twinkle = 1; setTimeout(()=>twinkle = 0, 300); }, { passive:true });

    function step(now){
      const dt = Math.min(0.06, (now - tLast)/1000);
      tLast = now;

      const targetWindX = Math.max(-70, Math.min(70, gamma * 6));
      const targetWindY = 40 + Math.max(-30, Math.min(50, beta));
      windX = windX + (targetWindX - windX) * 0.08;
      windY = windY + (targetWindY - windY) * 0.06;

      ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);
      ctx.globalCompositeOperation = 'lighter';
      for (let i=particles.length-1; i>=0; i--){
        const p = particles[i];
        p.x += (p.vx + windX)*dt;
        p.y += (p.vy + windY)*dt;
        p.tw += dt*3.2;
        const pulse = 0.65 + Math.sin(p.tw)*0.35 + (twinkle? Math.random()*0.25:0);

        if (p.y - p.r > canvas.clientHeight + 6) {
          particles.splice(i,1);
          spawnParticle(-10 - Math.random()*40);
          continue;
        }
        if (p.x < -6) p.x += canvas.clientWidth + 12;
        if (p.x > canvas.clientWidth + 6) p.x -= canvas.clientWidth + 12;

        ctx.save();
        ctx.shadowBlur = p.r*6;
        ctx.shadowColor = p.glow;
        ctx.fillStyle = p.glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r*pulse, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        if (Math.random()<0.02){
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = '#fff8cc';
          ctx.fillRect(p.x-0.4, p.y-0.4, 0.8, 0.8);
          ctx.restore();
        }
      }

      while (particles.length < targetCount) spawnParticle(-Math.random()*100);
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      if (!prefersReduced) window.removeEventListener('deviceorientation', onTilt);
    };
  }

  let stopParticles = null;
  let mediaStream   = null;

  async function open(){
    const root = ensureOverlay();
    const video = root.querySelector('#wm-ar-video');
    const canvas= root.querySelector('#wm-ar-canvas');
    const btnClose = root.querySelector('#wm-ar-close');
    const btnSnap  = root.querySelector('#wm-ar-snap');

    root.classList.add('show');

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false
      });
      video.srcObject = mediaStream;
    } catch (e) {
      console.warn('Camera blocked; showing particles only.', e);
    }

    stopParticles = startParticles(canvas, {
      density: window.innerWidth < 600 ? 0.00005 : 0.00006,
      minSize: 0.7,
      maxSize: 2.2,
      fallSpeed: 18,
      wander: 10
    });

    duckMusic(0.35);

    const close = () => {
      root.classList.remove('show');
      if (stopParticles) { stopParticles(); stopParticles=null; }
      if (video) video.srcObject = null;
      if (mediaStream) { mediaStream.getTracks().forEach(t=>t.stop()); mediaStream = null; }
      if (duckUndo) duckUndo();
    };
    btnClose.onclick = close;

    btnSnap.onclick = () => {
      try {
        const snap = document.createElement('canvas');
        const w = canvas.width, h = canvas.height;
        snap.width = w; snap.height = h;
        const sctx = snap.getContext('2d');
        if (video.readyState >= 2) sctx.drawImage(video, 0, 0, w, h);
        else { sctx.fillStyle = '#000'; sctx.fillRect(0,0,w,h); }
        sctx.drawImage(canvas, 0, 0);
        const url = snap.toDataURL('image/jpeg', 0.9);
        const a = document.createElement('a'); a.href = url; a.download = 'golden-moment.jpg'; a.click();
      } catch (e) { console.warn('Snapshot failed', e); }
    };
  }

  window.wmOpenGoldDustAR = open;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-ar="gold-dust"]');
    if (trigger) { e.preventDefault(); open(); }
  }, { passive: false });
})();

/* === Hold to feel the heartbeat (long-press haptics + soft pulse) === */
(() => {
  const hasVibrate = 'vibrate' in navigator;
  let holdTO=null, beatTO=null, pulseEl=null;

  function injectCSS(){
    if (document.getElementById('wm-heartbeat-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-heartbeat-css';
    s.textContent = `
      .wm-heartbeat-pulse {
        position: fixed; inset: 0; pointer-events: none; z-index: 9998;
        background: radial-gradient(120px 120px at var(--px,50%) var(--py,50%),
                    rgba(255,182,193,.18), transparent 60%);
        opacity: 0; transition: opacity .18s ease;
      }
      .wm-heartbeat-pulse.on { opacity: 1; }
    `;
    document.head.appendChild(s);
  }

  function startBeat(x, y){
    injectCSS();
    if (!pulseEl) { pulseEl = document.createElement('div'); pulseEl.className='wm-heartbeat-pulse'; document.body.appendChild(pulseEl); }
    pulseEl.style.setProperty('--px', x+'px');
    pulseEl.style.setProperty('--py', y+'px');
    pulseEl.classList.add('on');

    if (hasVibrate) {
      const beat = () => navigator.vibrate([15, 110, 25]);
      beat();
      beatTO = setInterval(beat, 600);
    }
  }
  function stopBeat(){
    if (beatTO) clearInterval(beatTO), beatTO=null;
    if (pulseEl) pulseEl.classList.remove('on');
    if (hasVibrate) navigator.vibrate(0);
  }

  const onDown = (e) => {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;
    clearTimeout(holdTO);
    holdTO = setTimeout(()=> startBeat(x,y), 500);
  };
  const onUpCancel = () => { clearTimeout(holdTO); stopBeat(); };

  window.addEventListener('mousedown', onDown, { passive:true });
  window.addEventListener('touchstart', onDown, { passive:true });
  window.addEventListener('mouseup', onUpCancel, { passive:true });
  window.addEventListener('touchend', onUpCancel, { passive:true });
  window.addEventListener('touchcancel', onUpCancel, { passive:true });
})();

/* === Ring Tilt Parallax — apply to elements with [data-ring-tilt] === */
(() => {
  const prefersReduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function injectCSS(){
    if (document.getElementById('wm-ring-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-ring-css';
    s.textContent = `
      [data-ring-tilt] {
        position: relative; transform-style: preserve-3d;
        transition: transform .14s ease, filter .18s ease;
        will-change: transform;
      }
      [data-ring-tilt]::after {
        content: ""; pointer-events: none; position: absolute; inset: -4px; border-radius: inherit;
        background: radial-gradient(180px 60px at var(--rgx,50%) var(--rgy,30%),
                    rgba(255,248,220,.55), transparent 60%);
        mix-blend-mode: screen; opacity: .0; transition: opacity .2s ease;
      }
      [data-ring-tilt].on::after { opacity: .95; }
    `;
    document.head.appendChild(s);
  }

  function bind(el){
    injectCSS();
    const MAX = 16;
    const setFrom = (x,y) => {
      const r = el.getBoundingClientRect();
      const px=(x-r.left)/r.width, py=(y-r.top)/r.height;
      const rx=(py-.5)*-MAX, ry=(px-.5)*MAX;
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      el.style.filter = `drop-shadow(0 18px 30px rgba(0,0,0,.12))`;
      el.classList.add('on');
      el.style.setProperty('--rgx', `${px*100}%`);
      el.style.setProperty('--rgy', `${py*100}%`);
    };
    const leave=()=>{ el.classList.remove('on'); el.style.transform=''; el.style.filter=''; };

    el.addEventListener('pointermove', e=>setFrom(e.clientX,e.clientY), { passive:true });
    el.addEventListener('pointerleave', leave, { passive:true });

    if (!prefersReduced) {
      const onTilt = (ev) => {
        const gamma = ev.gamma ?? 0, beta = ev.beta ?? 0;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width/2 + gamma*4;
        const cy = r.top  + r.height/2 + beta *2.4;
        setFrom(cx, cy);
      };
      window.addEventListener('deviceorientation', onTilt, { passive:true });
    }
  }

  function init(root=document){ root.querySelectorAll('[data-ring-tilt]').forEach(bind); }
  init();
  window.addEventListener('wm:page-swapped', () => setTimeout(init, 40));
})();

/* === Flip to hush — face-down pauses/fades music, upright resumes === */
(() => {
  const audio = () => document.getElementById('wm-audio');
  let manualPaused = false;
  let lastState = 'up';

  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('#wm-toggle');
    if (t) {
      const a = audio();
      if (a) manualPaused = a.paused;
      setTimeout(() => { const b=audio(); if (b) manualPaused = b.paused; }, 50);
    }
  }, { capture: true });

  function fadeTo(vol, ms=250){
    const a = audio(); if (!a) return;
    const start = a.volume, delta = vol - start, t0 = performance.now();
    function anim(t){ 
      const k = Math.min(1, (t-t0)/ms);
      try { a.volume = Math.max(0, Math.min(1, start + delta*k)); } catch {}
      if (k<1) requestAnimationFrame(anim);
    }
    requestAnimationFrame(anim);
  }

  function onTilt(ev){
    const beta = ev.beta ?? 0;
    const nowDown = (Math.abs(beta) > 135);
    if (nowDown && lastState!=='down') {
      lastState='down';
      const a = audio();
      if (a && !a.paused) { fadeTo(0.0, 220); a._flipWasPlaying = true; }
    } else if (!nowDown && lastState!=='up') {
      lastState='up';
      const a = audio();
      if (a && a._flipWasPlaying && !manualPaused) {
        try { a.play().catch(()=>{}); } catch {}
        fadeTo(0.9, 260);
      }
      if (a) a._flipWasPlaying = false;
    }
  }

  const prime = async () => {
    document.removeEventListener('touchstart', prime, true);
    document.removeEventListener('click', prime, true);
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission().catch(()=>{});
      }
    } catch {}
    window.addEventListener('deviceorientation', onTilt, { passive:true });
  };
  document.addEventListener('touchstart', prime, true);
  document.addEventListener('click', prime, true);
})();

/* === Tactile UI cues — tiny haptics on taps === */
(() => {
  const buzz = (ms=8) => { try{ navigator.vibrate && navigator.vibrate(ms); } catch{} };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a, button, .u-btn, [role="button"]');
    if (a) buzz(10);
  }, { passive:true, capture: true });
})();

    (function(){
      let layer = document.querySelector('.wm-ripple');
      if(!layer){
        layer = document.createElement('div');
        layer.className='wm-ripple';
        document.body.appendChild(layer);
      }
      document.addEventListener('click', e => {
        const r = document.createElement('i');
        r.className='wm-r';
        r.style.left = e.clientX+'px';
        r.style.top  = e.clientY+'px';
        layer.appendChild(r);
        setTimeout(()=>r.remove(), 650);
      }, {passive:true});
    })();
   
/* === “Scented scroll” silk sheen — add class="silk-heading" to titles === */
(() => {
  function injectCSS(){
    if (document.getElementById('wm-sheen-css')) return;
    const s = document.createElement('style');
    s.id = 'wm-sheen-css';
    s.textContent = `
      .silk-heading {
        position: relative; display: inline-block;
        background:
          linear-gradient(90deg,
            rgba(255,255,255,0) 0%,
            rgba(255,248,220,.75) 50%,
            rgba(255,255,255,0) 100%);
        background-size: 200% 100%;
        background-position: var(--sheen, -120%) 0%;
        -webkit-background-clip: text; background-clip: text; color: inherit;
        text-shadow: 0 1px 0 rgba(255,255,255,.25);
      }
    `;
    document.head.appendChild(s);
  }
  injectCSS();

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) animateSheen(e.target);
  }, { threshold: .2 });

  function animateSheen(el){
    el.style.setProperty('--sheen', '-120%');
    const start = performance.now();
    const dur = 1400;
    function step(t){
      const k = Math.min(1, (t-start)/dur);
      const pos = -120 + k*240;
      el.style.setProperty('--sheen', pos+'%');
      if (k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    io.unobserve(el);
  }

  function init(root=document){
    root.querySelectorAll('.silk-heading').forEach(el => io.observe(el));
  }
  init();
  window.addEventListener('wm:page-swapped', () => setTimeout(init, 30));
})();
