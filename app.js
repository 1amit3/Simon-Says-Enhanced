/* =========================================================
   SIMON — Premium AAA Interface (Vanilla JS)
   ========================================================= */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const startScreen = $('startScreen');
  const gameScreen  = $('gameScreen');
  const overScreen  = $('gameOverScreen');
  const startForm   = $('startForm');
  const nameInput   = $('playerName');
  const hudLevel    = $('hudLevel');
  const hudBest     = $('hudBest');
  const hudSteps    = $('hudSteps');
  const hubName     = $('hubName');
  const hubState    = $('hubState');
  const board       = $('board');
  const flash       = $('flash');
  const progressBar = $('progressBar');
  const pads        = Array.from(document.querySelectorAll('.pad'));
  const goverPlayer = $('goverPlayer');
  const goverLevel  = $('goverLevel');
  const goverBest   = $('goverBest');
  const restartBtn  = $('restartBtn');
  const quitBtn     = $('quitBtn');
  const playAgainBtn= $('playAgainBtn');
  const homeBtn     = $('homeBtn');

  const CIRCLED = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫','⑬','⑭','⑮','⑯','⑰','⑱','⑲','⑳'];

  const state = {
    player: 'Player',
    sequence: [], input: [], level: 0,
    best: Number(localStorage.getItem('simon.best') || 0),
    locked: true, gameOver: false, runToken: 0,
  };
  hudBest.textContent = String(state.best).padStart(2, '0');

  // ---------- Audio ----------
  const TONES = [329.63, 261.63, 220.00, 164.81];
  let audioCtx = null;
  const ensureAudio = () => {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  };
  const playTone = (freq, dur = 0.35, type = 'sine', gain = 0.18) => {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 2200;
    osc.type = type; osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle'; osc2.frequency.value = freq * 2.005;
    const g2 = ctx.createGain(); g2.gain.value = 0.05;
    osc.connect(filt); osc2.connect(g2); g2.connect(filt); filt.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.start(t); osc2.start(t);
    osc.stop(t + dur + 0.05); osc2.stop(t + dur + 0.05);
  };
  const playSuccess = () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => playTone(f, 0.22, 'triangle', 0.15), i * 90));
  };
  const playFail = () => {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 1.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + 1.25);
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const ng = ctx.createGain(); ng.gain.value = 0.15;
    src.connect(ng); ng.connect(ctx.destination); src.start(t);
  };
  // Premium UI click — layered, short, glassy
  const playClick = () => {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    // High metallic tick
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = 1760;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.14, t + 0.005);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    // Sub body
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 440;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.10, t + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    // Airy shimmer
    const o3 = ctx.createOscillator(); o3.type = 'sine'; o3.frequency.value = 3520;
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.0001, t);
    g3.gain.exponentialRampToValueAtTime(0.05, t + 0.004);
    g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
    o1.connect(g1); o2.connect(g2); o3.connect(g3);
    g1.connect(hp); g2.connect(hp); g3.connect(hp); hp.connect(ctx.destination);
    o1.start(t); o2.start(t); o3.start(t);
    o1.stop(t + 0.15); o2.stop(t + 0.18); o3.stop(t + 0.10);
  };

  // Premium "flash" chime — sparkly bell layered on top of pad tone
  const playFlashChime = (freq, gain = 0.10) => {
    const ctx = ensureAudio(); if (!ctx) return;
    const t = ctx.currentTime;
    const partials = [1, 2.01, 3.02, 4.98];
    const gains    = [0.9, 0.55, 0.35, 0.18];
    partials.forEach((p, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * p;
      const g = ctx.createGain();
      const peak = gain * gains[i];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55 - i * 0.05);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.7);
    });
    // subtle shimmer noise
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * 0.4;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    const ng = ctx.createGain(); ng.gain.value = 0.05;
    src.connect(hp); hp.connect(ng); ng.connect(ctx.destination); src.start(t);
  };

  // ---------- Screens ----------
  const showScreen = (target) => {
    [startScreen, gameScreen, overScreen].forEach((s) => {
      if (s === target) return;
      if (s.classList.contains('active')) {
        s.classList.add('fade-out');
        setTimeout(() => { s.classList.remove('active','fade-out'); }, 400);
      }
    });
    setTimeout(() => { target.classList.add('active'); }, 240);
  };

  const setHubState = (text, cls = '') => {
    hubState.textContent = text;
    hubState.className = 'hub-state ' + cls;
  };

  // ---------- Progress bar ----------
  const buildProgressBar = () => {
    progressBar.innerHTML = '';
    const total = state.sequence.length;
    for (let i = 0; i < total; i++) {
      const el = document.createElement('div');
      el.className = 'pb-step';
      el.textContent = CIRCLED[i] || String(i + 1);
      progressBar.appendChild(el);
    }
  };
  const pbSteps = () => progressBar.children;
  const clearPbClasses = () => {
    Array.from(pbSteps()).forEach((s) => s.classList.remove('watch','done','fail','done-dim'));
  };
  const pbMarkWatch = (i) => {
    clearPbClasses();
    const steps = pbSteps();
    for (let k = 0; k < i; k++) steps[k].classList.add('done-dim');
    if (steps[i]) steps[i].classList.add('watch');
  };
  const pbResetForPlayer = () => clearPbClasses();
  const pbMarkDone = (upto) => {
    const steps = pbSteps();
    for (let k = 0; k < upto; k++) if (steps[k]) {
      steps[k].classList.remove('watch','fail','done-dim');
      steps[k].classList.add('done');
    }
  };
  const pbMarkFail = (i) => {
    const steps = pbSteps();
    if (steps[i]) steps[i].classList.add('fail');
  };

  // ---------- Pad animation ----------
  const flashPad = (idx, duration = 420) => new Promise((res) => {
    const pad = pads[idx];
    pad.classList.add('active');
    playTone(TONES[idx], duration / 1000 + 0.05, 'sine', 0.2);
    playFlashChime(TONES[idx] * 2, 0.09);
    setTimeout(() => { pad.classList.remove('active'); setTimeout(res, 140); }, duration);
  });
  const triggerRipple = (pad) => {
    pad.classList.remove('ripple');
    void pad.offsetWidth;
    pad.classList.add('ripple');
  };

  const updateHUD = () => {
    hudLevel.textContent = String(state.level).padStart(2, '0');
    hudSteps.innerHTML = state.input.length + '<span class="dim">/' + state.sequence.length + '</span>';
    hudBest.textContent = String(state.best).padStart(2, '0');
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const nextLevel = async () => {
    state.level++;
    state.input = [];
    state.sequence.push(Math.floor(Math.random() * 4));
    updateHUD();
    buildProgressBar();
    setHubState('Watch Carefully', 'watch');
    state.locked = true;
    const token = state.runToken;
    await wait(650);
    if (token !== state.runToken) return;
    const speed = Math.max(180, 520 - state.level * 20);
    for (let i = 0; i < state.sequence.length; i++) {
      if (token !== state.runToken) return;
      pbMarkWatch(i);
      await flashPad(state.sequence[i], speed);
    }
    if (token !== state.runToken) return;
    pbResetForPlayer();
    setHubState('Your Turn', 'turn');
    state.locked = false;
  };

  const handlePadPress = async (idx) => {
    if (state.locked || state.gameOver) return;
    const pad = pads[idx];
    triggerRipple(pad);
    pad.classList.add('active');
    playTone(TONES[idx], 0.28, 'sine', 0.22);
    playFlashChime(TONES[idx] * 2, 0.07);
    setTimeout(() => pad.classList.remove('active'), 220);

    state.input.push(idx);
    updateHUD();
    const step = state.input.length - 1;
    if (state.input[step] !== state.sequence[step]) {
      pbMarkFail(step);
      return fail();
    }
    pbMarkDone(state.input.length);
    if (state.input.length === state.sequence.length) {
      state.locked = true;
      playSuccess();
      if (state.level > state.best) {
        state.best = state.level;
        localStorage.setItem('simon.best', String(state.best));
      }
      await wait(600);
      nextLevel();
    }
  };

  // ---------- Cinematic game over ----------
  const fail = async () => {
    state.gameOver = true; state.locked = true;
    state.runToken++;
    setHubState('Sequence Broken', 'fail');
    playFail();

    // 1. Screen shake
    board.classList.add('shake');
    document.body.classList.add('shake-screen');
    await wait(500);
    board.classList.remove('shake');
    document.body.classList.remove('shake-screen');

    // 2. All FOUR pads crack simultaneously
    pads.forEach((p) => p.classList.add('crack'));
    await wait(360);

    // 3. Break apart and fall with gravity + debris
    spawnDebris(70);
    pads.forEach((p, i) => {
      const tx = (i % 2 === 0 ? -1 : 1) * (60 + Math.random() * 90);
      const rz = (Math.random() * 60 - 30) + 'deg';
      p.style.setProperty('--tx', tx + 'px');
      p.style.setProperty('--rz', rz);
      p.classList.add('fall');
    });

    // 4. Red flash
    await wait(200);
    document.body.classList.add('failing');
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');

    await wait(1100);

    // 5. Popup
    goverPlayer.textContent = state.player;
    goverLevel.textContent  = String(Math.max(0, state.level - 1));
    goverBest.textContent   = String(state.best);
    showScreen(overScreen);
  };

  const spawnDebris = (count) => {
    const rect = board.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'fail-particle';
      const size = 3 + Math.random() * 7;
      const hue = ['#ff3355','#ffd23f','#21d67a','#2b8bff'][i % 4];
      Object.assign(el.style, {
        position: 'fixed',
        left: (rect.left + rect.width * Math.random()) + 'px',
        top: (rect.top + rect.height * Math.random()) + 'px',
        width: size + 'px', height: size + 'px',
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        background: hue,
        boxShadow: `0 0 12px ${hue}`,
        pointerEvents: 'none', zIndex: 9999,
        transition: 'transform 1.2s cubic-bezier(.4,.1,.7,1), opacity 1.2s',
      });
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        const dx = (Math.random() - 0.5) * 400;
        const dy = 300 + Math.random() * 400;
        const rot = (Math.random() * 720 - 360) + 'deg';
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot})`;
        el.style.opacity = '0';
      });
      setTimeout(() => el.remove(), 1400);
    }
  };

  // ---------- Reset ----------
  const resetGame = () => {
    state.runToken++;
    state.sequence = []; state.input = []; state.level = 0;
    state.locked = false; state.gameOver = false;

    document.body.classList.remove('failing','shake-screen');
    board.classList.remove('shake');
    flash.classList.remove('on');
    document.querySelectorAll('.fail-particle').forEach((n) => n.remove());

    pads.forEach((p) => {
      p.classList.remove('fall','crack','active','ripple');
      p.style.removeProperty('--tx');
      p.style.removeProperty('--rz');
      p.style.transform = '';
      p.style.opacity = '';
    });

    progressBar.innerHTML = '';
    setHubState('Get Ready', '');
    hubName.textContent = state.player.toUpperCase();
    updateHUD();
  };

  const startGame = () => {
    ensureAudio();
    resetGame();
    showScreen(gameScreen);
    setTimeout(() => nextLevel(), 700);
  };

  // ---------- Events ----------
  startForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = nameInput.value.trim();
    state.player = n ? n.slice(0, 14) : 'Player';
    playClick();
    startGame();
  });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); startForm.requestSubmit(); }
  });

  pads.forEach((p) => {
    const idx = Number(p.dataset.tone);
    p.addEventListener('pointerdown', (e) => { e.preventDefault(); handlePadPress(idx); });
  });

  document.addEventListener('keydown', (e) => {
    if (!gameScreen.classList.contains('active')) return;
    const k = e.key;
    if (k >= '1' && k <= '4') handlePadPress(Number(k) - 1);
  });

  restartBtn.addEventListener('click', () => {
    playClick(); resetGame(); setTimeout(() => nextLevel(), 350);
  });
  quitBtn.addEventListener('click', () => {
    playClick(); resetGame(); showScreen(startScreen);
  });
  playAgainBtn.addEventListener('click', () => {
    playClick(); resetGame(); showScreen(gameScreen); setTimeout(() => nextLevel(), 700);
  });
  homeBtn.addEventListener('click', () => {
    playClick(); resetGame(); showScreen(startScreen);
  });

  // ---------- Background particles ----------
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  const initParticles = () => {
    const count = Math.min(80, Math.round(innerWidth * innerHeight / 24000));
    particles = Array.from({length: count}, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.6 + Math.random() * 1.8,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.08 - Math.random() * 0.3,
      a: 0.15 + Math.random() * 0.5,
      hue: ['rgba(56,232,255,', 'rgba(255,59,120,', 'rgba(245,201,107,', 'rgba(138,91,255,'][Math.floor(Math.random()*4)],
    }));
  };
  const tick = () => {
    ctx.clearRect(0,0,innerWidth,innerHeight);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = innerHeight + 10; p.x = Math.random()*innerWidth; }
      if (p.x < -10) p.x = innerWidth + 10;
      if (p.x > innerWidth + 10) p.x = -10;
      ctx.beginPath();
      ctx.fillStyle = p.hue + p.a + ')';
      ctx.shadowColor = p.hue + '0.8)';
      ctx.shadowBlur = 8;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(tick);
  };
  window.addEventListener('resize', () => { resize(); initParticles(); });
  resize(); initParticles(); tick();

  setTimeout(() => nameInput.focus(), 300);
})();
