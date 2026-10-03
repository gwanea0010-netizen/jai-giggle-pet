// Pet behaviour: state machine, reactions, interactions, confetti.
(() => {
  const wrap = document.getElementById('pet-wrap');
  wrap.innerHTML = PetSVG('main');
  const pet = wrap.querySelector('svg.pet');
  const hit = pet.querySelector('.p-hit');
  const bubble = document.getElementById('bubble');
  const bubbleText = document.getElementById('bubble-text');
  const bubbleSub = document.getElementById('bubble-sub');
  const pupils = [...pet.querySelectorAll('.p-pupil')];

  const SLEEP_AFTER_MS = 4 * 60 * 1000;
  const WORKING_STALE_MS = 5 * 60 * 1000;
  const BROWSERS = ['chrome', 'msedge', 'firefox', 'brave', 'opera', 'vivaldi'];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let S = {
    ownerName: '', petName: 'Giggles', species: 'cat', scale: 1,
    sound: true, volume: 0.7, roam: false, media: true, tipsEvery: 30,
  };
  const owner = () => (S.ownerName || '').trim() || 'friend';
  const hasOwner = () => !!(S.ownerName || '').trim();

  // ---------- lines ----------
  const L = {
    done: () => [`All done, ${owner()}! 🎉`, 'Ta-da! ✨', `Finished! Come look, ${owner()} 👀`, 'Nailed it! 💪', 'Work complete! 🥳', 'Done & dusted! 🌟'],
    tickle: () => ['hehe!', 'that tickles! 😆', 'hihihi~', `stop it ${owner()}, hehe`, 'giggle giggle 🤭', 'eep!'],
    wake: () => ['hm? 😪', "I'm up! I'm up!", '*yawn*'],
    bye: () => [`Bye bye, ${owner()}! 👋`, 'See you soon!'],
    snack: () => [`Yum! Thanks ${owner()} 🍪`, 'Nom nom nom 😋', 'Best. Cookie. Ever. 🧡'],
    pat: () => ['prrr… 💕', `Love you too, ${owner()} 🥰`, 'more pats please!'],
    dizzy: () => ["Whoa… I'm dizzy 😵‍💫", 'Too many clicks! 🌀'],
    tips: () => [
      `💧 Water break, ${owner()}?`,
      '🧘 Roll your shoulders for 10 seconds!',
      '👀 20-20-20: look 20 ft away for 20 seconds',
      '💾 Good moment to commit your work!',
      '🧪 Ask Claude to write tests for that change',
      '📝 Tip: /compact keeps long Claude chats snappy',
      '🔍 Ask Claude to review the diff before you ship',
      `☕ Chai break? You've earned it, ${owner()}`,
      '🚶 A short walk = fresh ideas',
      '🔐 Never paste passwords or keys into prompts',
      '🔺 Cyborg ERP tip: small commits, clear messages',
      '🪑 Sit up straight! Your back says thanks',
    ],
    quotes: () => [
      'First, solve the problem. Then, write the code. — John Johnson',
      'Make it work, make it right, make it fast. — Kent Beck',
      'Talk is cheap. Show me the code. — Linus Torvalds',
      'Simplicity is the soul of efficiency. — Austin Freeman',
      'Code is like humor. When you have to explain it, it’s bad. — Cory House',
      'Fix the cause, not the symptom. — Steve Maguire',
      'Experience is the name everyone gives to their mistakes. — Oscar Wilde',
      'The best error message is the one that never shows up. — Thomas Fuchs',
      'It always seems impossible until it’s done. — Nelson Mandela',
      'Done is better than perfect. 🚀',
      'Every expert was once a beginner. Keep shipping! 🌱',
      'Small commits, big wins. 💪',
      'A bug is just a feature you haven’t understood yet. 🐛',
      `Bug aaj nahi to kal fix hoga. Ruk mat, ${owner()}! 💪`,
      `Aaj ka code, kal ka product. Chalo ${owner()}! 🔺`,
      `Thoda aur, ${owner()}. Tu kar lega! 🔥`,
      'Coffee ☕ + Code = Magic ✨',
      'Progress, not perfection. 📈',
      'Read the error message. It’s trying to help! 👀',
      'Great software is built one tiny step at a time. 🧱',
      `You’ve solved harder bugs than this, ${owner()}. 💡`,
      'Stay curious. Ship often. Learn always. 🚀',
      'Clean code always looks like it was written by someone who cares. — Robert C. Martin',
      'Deleted code is debugged code. — Jeff Sickel',
    ],
    jokes: [
      'Why do programmers prefer dark mode? Because light attracts bugs 🐛',
      "A SQL query walks into a bar, sees two tables and asks: 'Can I JOIN you?' 🍻",
      "I'd tell you a UDP joke, but you might not get it 📦",
      'It works on my machine ¯\\_(ツ)_/¯',
      'There are 10 kinds of people: those who know binary and those who don’t 🤓',
      'Debugging: being the detective in a crime movie where you are also the murderer 🔍',
      '!false — funny because it’s true 😄',
      'Why did the ERP go to therapy? Too many unresolved dependencies 🔺',
    ],
  };

  function greeting() {
    if (!hasOwner()) return `Hi! I'm ${S.petName} 👋`;
    const fest = PET_ACCESSORIES.activeFestival();
    if (fest) return `${fest.greet}, ${owner()}! ${fest.emoji}`;
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return `Good morning, ${owner()}! ☀️`;
    if (h >= 12 && h < 17) return `Good afternoon, ${owner()}! 🌤️`;
    if (h >= 17 && h < 21) return `Good evening, ${owner()}! 🌆`;
    return `Coding late, ${owner()}? 🌙`;
  }

  function browserLine(t = '') {
    const o = owner();
    if (/youtube/i.test(t)) return pick([`📺 YouTube time? Play some music, ${o}!`, '🎶 Ooh, YouTube! Something fun?']);
    if (/github/i.test(t)) return '🐙 Checking GitHub, huh?';
    if (/stack ?overflow/i.test(t)) return `🧐 Stack Overflow… tricky bug, ${o}?`;
    if (/cyborg/i.test(t)) return '🔺 Cyborg ERP! My favourite!';
    if (/claude/i.test(t)) return '🧡 Visiting my buddy Claude!';
    if (/gmail|outlook|mail/i.test(t)) return '📬 Inbox time…';
    return pick([`🤔 What are we searching, ${o}?`, '👀 Browsing time!', '🌐 Ooh, the internet!', '🤔 Hmm… research mode?']);
  }

  function cleanTitle(t) {
    return (t || '')
      .replace(/^\(\d+\)\s*/, '')
      .replace(/\s+[-–—]\s+(YouTube|YouTube Music|Google Chrome|Microsoft​?\s?Edge|Mozilla Firefox|Brave|Opera|Vivaldi)\b.*$/i, '')
      .trim()
      .slice(0, 48);
  }

  // ---------- state ----------
  let state = 'idle';
  let stateTimer = null;
  let bubbleTimer = null;
  let lastActivity = Date.now();
  let lastProject = '';
  let workDetail = 'Working…';
  const workingSessions = new Map();

  let musicOn = false;
  let callOn = false;
  let mediaTitle = '';

  function play(name, ...args) {
    if (!S.sound || callOn) return;
    Sfx[name](...args);
  }

  function setLook(eyes, mouth) {
    pet.dataset.eyes = eyes;
    pet.dataset.mouth = mouth;
  }

  function setState(next) {
    clearTimeout(stateTimer);
    if (state === 'walk' && next !== 'walk') {
      window.pet.walkStop();
      pet.classList.remove('face-left');
    }
    pet.classList.forEach((c) => c.startsWith('s-') && pet.classList.remove(c));
    void pet.getBoundingClientRect(); // restart CSS animations
    pet.classList.add('s-' + next);
    state = next;
  }

  function after(ms, fn) {
    clearTimeout(stateTimer);
    stateTimer = setTimeout(fn, ms);
  }

  function updateAccessories() {
    pet.classList.toggle('acc-phones', musicOn || callOn);
    pet.classList.toggle('acc-mic', callOn);
  }

  function settle() {
    if (workingSessions.size > 0) return goWorking();
    if (musicOn && !callOn) return goMusic(false);
    goIdle();
  }

  function goIdle(keepBubble) {
    setState('idle');
    setLook('open', callOn ? 'flat' : 'smile');
    lookAt(0, 0);
    if (!keepBubble) hideBubble();
  }

  function goWorking(detail) {
    if (detail) workDetail = detail;
    if (state !== 'working') {
      setState('working');
      setLook('open', 'flat');
      lookAt(0, 3.5);
    }
    showBubble(`${esc(workDetail)} <span class="dots"><span>.</span><span>.</span><span>.</span></span>`, {
      sub: lastProject, cls: 'working', sticky: true, html: true,
    });
  }

  function goDone(project, count) {
    setState('done');
    setLook('happy', 'grin');
    let text = pick(L.done());
    let sub = project || '';
    if ([5, 10, 20, 30, 50, 100].includes(count)) text = `🏆 ${count} tasks done today, ${owner()}!`;
    const h = new Date().getHours();
    if ((h >= 23 || h < 5) && Math.random() < 0.5) sub = `It's late, ${owner()}. Rest soon 🌙`;
    showBubble(text, { sub, ms: 5000 });
    burstConfetti(110);
    play('chime');
    setTimeout(() => play('giggle'), 380);
    after(4600, () => {
      if (workingSessions.size > 0) return goWorking();
      if (musicOn && !callOn) return goMusic(false);
      setState('idle');
      setLook('open', 'smile');
    });
  }

  function goAttention(detail) {
    setState('attention');
    setLook('open', 'o');
    lookAt(0, -1);
    showBubble(esc(detail || 'Claude needs you!'), {
      sub: `Hey ${owner()}!${lastProject ? ' · ' + lastProject : ''}`, cls: 'attention', sticky: true, html: true,
    });
    play('ping');
    after(30000, settle);
  }

  function goHello() {
    setState('hello');
    setLook('happy', 'grin');
    showBubble(greeting(), {
      sub: hasOwner() ? `I'm ${S.petName}` : 'Right-click me → Settings ⚙️',
      ms: 3200,
    });
    play('pop');
    after(2800, settle);
  }

  function goBye() {
    setState('bye');
    setLook('happy', 'smile');
    showBubble(pick(L.bye()), { ms: 2200 });
    after(2400, goSleep);
  }

  function goSleep() {
    setState('sleep');
    setLook('closed', 'smile');
    hideBubble();
  }

  function goMusic(announce) {
    setState('music');
    setLook('happy', 'smile');
    lookAt(0, 0);
    if (announce) {
      const title = cleanTitle(mediaTitle);
      if (title) showBubble(`🎵 ${title}`, { sub: `Vibing with you, ${owner()}!`, cls: 'music', ms: 4500 });
      else showBubble(`🎧 Vibing with you, ${owner()}!`, { cls: 'music', ms: 3500 });
    }
  }

  function tickle() {
    const resume = state;
    setState('tickle');
    setLook('happy', 'grin');
    showBubble(pick(L.tickle()), { ms: 1500 });
    play('giggle', 4 + Math.floor(Math.random() * 3));
    after(900, () => {
      if (resume === 'working' && workingSessions.size > 0) return goWorking();
      settle();
    });
  }

  function goDizzy() {
    setState('dizzy');
    setLook('dizzy', 'o');
    showBubble(pick(L.dizzy()), { ms: 2200 });
    play('pop');
    after(2400, settle);
  }

  function goSnack() {
    setState('eat');
    setLook('open', 'o');
    lookAt(0, -4);
    let n = 0;
    setTimeout(() => {
      lookAt(0, 0);
      const chew = setInterval(() => {
        if (state !== 'eat') return clearInterval(chew);
        setLook('closed', n % 2 ? 'grin' : 'o');
        play('chomp');
        if (++n >= 6) clearInterval(chew);
      }, 160);
    }, 700);
    setTimeout(() => {
      if (state !== 'eat') return;
      setLook('happy', 'grin');
      hearts();
      showBubble(pick(L.snack()), { ms: 2500 });
    }, 1700);
    after(3600, settle);
  }

  function goDance() {
    setState('dance');
    setLook('happy', 'grin');
    showBubble('💃 Dance party! 🕺', { ms: 3000 });
    play('tune');
    burstConfetti(50);
    after(5500, settle);
  }

  function tellJoke() {
    const joke = pick(L.jokes);
    if (state === 'idle' || state === 'music') setLook('open', 'grin');
    showBubble(joke, { sub: '😂 Joke time', cls: 'long', ms: 2500 + joke.length * 55 });
    setTimeout(() => play('giggle', 4), 1800 + joke.length * 40);
  }

  function showTip() {
    // Alternate between wellness/coding tips and a little motivation.
    if (Math.random() < 0.5) return showQuote();
    showBubble(pick(L.tips()), { sub: `💡 ${S.petName}'s tip`, cls: 'tip long', ms: 7000 });
  }

  function showQuote(sub) {
    const q = pick(L.quotes());
    if (state === 'idle' || state === 'music' || state === 'land') setLook('happy', 'smile');
    showBubble(q, { sub: sub || `💪 Motivation for ${owner()}`, cls: 'tip long', ms: 4000 + q.length * 45 });
  }

  function hearts() {
    pet.classList.remove('hearts');
    void pet.getBoundingClientRect();
    pet.classList.add('hearts');
    setTimeout(() => pet.classList.remove('hearts'), 2200);
  }

  function wake() {
    goIdle(true);
    showBubble(pick(L.wake()), { ms: 1600 });
  }

  // ---------- media / call / browser reactions ----------
  let loudTicks = 0;
  let quietTicks = 0;
  let wasBrowser = false;
  let lastBrowserQuip = 0;

  function startMusic() {
    musicOn = true;
    quietTicks = 0;
    updateAccessories();
    if (state === 'idle' || state === 'sleep') goMusic(true);
  }

  function stopMusic() {
    musicOn = false;
    updateAccessories();
    if (state === 'music') {
      goIdle(true);
      showBubble('🎧 Music over? Back to work!', { ms: 2200 });
    }
  }

  function startCall() {
    callOn = true;
    updateAccessories();
    if (['idle', 'music', 'sleep'].includes(state)) goIdle(true);
    showBubble(`🤫 You're on a call, ${owner()}. I'll stay quiet`, { ms: 3500 });
  }

  function endCall() {
    callOn = false;
    updateAccessories();
    showBubble(`📞 Call done! Welcome back, ${owner()}`, { ms: 2500 });
    if (state === 'idle') settle();
  }

  function clearMedia() {
    loudTicks = quietTicks = 0;
    if (musicOn) stopMusic();
    if (callOn) { callOn = false; updateAccessories(); }
  }

  let manualUntil = 0; // test triggers from Settings win over the live monitor for a while

  window.pet.onSystem((d) => {
    if (!S.media || Date.now() < manualUntil) return;
    mediaTitle = d.media || '';

    // Ignore our own sound effects.
    const loud = d.peak > 0.015 && Date.now() - Sfx.lastPlayed() > 4000;
    if (loud) { loudTicks++; quietTicks = 0; } else { quietTicks++; loudTicks = 0; }
    if (!musicOn && loudTicks >= 2) startMusic();
    if (musicOn && quietTicks >= 4) stopMusic();

    if (d.mic && !callOn) startCall();
    else if (!d.mic && callOn) endCall();

    const isBrowser = BROWSERS.includes(String(d.fgProc || '').toLowerCase());
    if (isBrowser && !wasBrowser && state === 'idle' && !callOn && !musicOn && Date.now() - lastBrowserQuip > 3 * 60 * 1000) {
      lastBrowserQuip = Date.now();
      setLook('open', 'o');
      lookAt(-3, -2);
      showBubble(browserLine(d.fgTitle), { cls: 'thought', ms: 3500 });
      setTimeout(() => state === 'idle' && (setLook('open', 'smile'), lookAt(0, 0)), 3500);
    }
    wasBrowser = isBrowser;
  });

  // ---------- events from Claude Code / menus ----------
  window.pet.onEvent(({ state: ev, project, session = 'default', detail, count, sub }) => {
    lastActivity = Date.now();
    if (project) lastProject = project;

    switch (ev) {
      case 'working':
        workingSessions.set(session, Date.now());
        if (['done', 'tickle', 'hello', 'eat', 'dance', 'dizzy', 'aim', 'fly', 'land'].includes(state)) {
          if (detail) workDetail = detail;
        } else {
          goWorking(detail);
        }
        break;
      case 'done':
        workingSessions.delete(session);
        goDone(project, count);
        break;
      case 'attention': goAttention(detail); break;
      case 'hello': if (state === 'idle' || state === 'sleep') goHello(); break;
      case 'bye':
        workingSessions.delete(session);
        if (workingSessions.size === 0 && state !== 'done') goBye();
        break;
      case 'sleep': goSleep(); break;
      case 'snack': goSnack(); break;
      case 'dance': goDance(); break;
      case 'joke': tellJoke(); break;
      case 'quote': showQuote(); break;
      case 'tip': showTip(); break;
      case 'preview': previewItem(detail); break;
      case 'unlock': setTimeout(() => goUnlock(detail), 4800); break; // after the "done" party
      case 'festival':
        setState('done');
        setLook('happy', 'grin');
        showBubble(detail, { sub: sub || '', ms: 6500, cls: 'long' });
        burstConfetti(120);
        play('chime');
        setTimeout(() => play('giggle'), 400);
        after(5000, settle);
        break;
      case 'update':
        showBubble(`🎁 New version ${detail} is ready!`, { sub: S.autoUpdate ? "I'll update when you're free" : 'Settings → Updates', cls: 'tip', ms: 5000 });
        play('pop');
        break;
      case 'updating':
        setState('bye');
        setLook('happy', 'smile');
        showBubble(`🔄 Updating to ${detail}… brb!`, { ms: 4000 });
        break;
      case 'rank':
        if (state === 'idle' || state === 'music') setLook('happy', 'grin');
        showBubble(detail, { sub: '🏆 Team leaderboard', cls: 'tip long', ms: 6000 });
        if (/#1/.test(detail)) { burstConfetti(40); play('chime'); }
        break;
      case 'music':
        manualUntil = Date.now() + 9000;
        mediaTitle = detail || '';
        startMusic();
        setTimeout(() => musicOn && stopMusic(), 9000);
        break;
      case 'call':
        manualUntil = Date.now() + 8000;
        startCall();
        setTimeout(() => callOn && endCall(), 8000);
        break;
    }
  });

  // ---------- settings ----------
  let previewTimer = null;
  function applyWardrobe(eq = S.equipped || {}) {
    pet.dataset.head = eq.head || '';
    pet.dataset.face = eq.face || '';
    pet.dataset.neck = eq.neck || '';
    pet.dataset.body = eq.body || '';
    pet.dataset.prop = eq.prop || '';
  }

  function previewItem(id) {
    const item = PET_ACCESSORIES.ACCESSORIES.find((a) => a.id === id);
    if (!item) return;
    clearTimeout(previewTimer);
    applyWardrobe({ ...(S.equipped || {}), [item.slot]: item.id });
    hearts();
    const fest = item.festival && PET_ACCESSORIES.FESTIVALS.find((f) => f.id === item.festival);
    showBubble(`${item.emoji} Trying on: ${item.name}`, {
      sub: fest ? `${fest.emoji} ${fest.name} special` : `Unlocks at ${item.unlock} tasks`,
      ms: 3500,
    });
    previewTimer = setTimeout(() => applyWardrobe(), 4000);
  }

  function goUnlock(name) {
    setState('done');
    setLook('happy', 'grin');
    showBubble(`🎁 Unlocked: ${name}!`, { sub: 'Wearing it now ✨', ms: 5000 });
    burstConfetti(90);
    play('chime');
    setTimeout(() => play('giggle'), 400);
    after(4600, settle);
  }

  function applySettings(next) {
    const prevSpecies = S.species;
    S = { ...S, ...next };
    pet.dataset.species = S.species;
    if (next.equipped) applyWardrobe();
    document.documentElement.style.setProperty('--s', S.scale);
    Sfx.setVolume(S.volume);
    if (!S.media) clearMedia();
    if (next.species && prevSpecies !== next.species && booted) {
      setState('hello');
      setLook('happy', 'grin');
      const name = (PET_SPECIES.find((s) => s.id === S.species) || {}).name || 'new look';
      showBubble(`Ta-da! ${name} ✨`, { sub: S.petName, ms: 2500 });
      burstConfetti(40);
      play('pop');
      after(2500, settle);
    }
  }
  window.pet.onSettings(applySettings);

  // ---------- eyes, blinking, 3D tilt ----------
  function lookAt(x, y) {
    pupils.forEach((p) => {
      p.style.setProperty('--px', x);
      p.style.setProperty('--py', y);
    });
  }

  function setTilt(nx, ny) {
    // Fake 3D turn with 2D transforms (real 3D transforms freeze repaints in transparent windows).
    wrap.style.transform = `skewY(${nx * -3}deg) scale(${1 - Math.abs(nx) * 0.05}, ${1 - Math.abs(ny) * 0.03}) rotate(${nx * 2}deg)`;
    pet.style.setProperty('--fx', (nx * 5).toFixed(2));
    pet.style.setProperty('--fy', (ny * 3.5).toFixed(2));
  }

  function trackCursor(clientX, clientY) {
    const r = wrap.getBoundingClientRect();
    const nx = clamp((clientX - (r.left + r.width / 2)) / (r.width * 0.9), -1, 1);
    const ny = clamp((clientY - (r.top + r.height * 0.55)) / (r.height * 0.9), -1, 1);
    if (aim || state === 'fly') return;
    if (state !== 'walk') setTilt(nx, ny);
    if (pet.dataset.eyes !== 'open' || state === 'working' || state === 'eat') return;
    lookAt(nx * 4.5, ny * 4);
  }

  function scheduleBlink() {
    setTimeout(() => {
      if (pet.dataset.eyes === 'open') {
        pet.classList.add('blink');
        setTimeout(() => pet.classList.remove('blink'), 130);
        if (Math.random() < 0.25) {
          setTimeout(() => {
            pet.classList.add('blink');
            setTimeout(() => pet.classList.remove('blink'), 120);
          }, 260);
        }
      }
      scheduleBlink();
    }, 2200 + Math.random() * 3800);
  }

  // Idle fidgets: turn the head and glance around now and then.
  setInterval(() => {
    if (state !== 'idle' || hovering) return;
    if (Math.random() < 0.5) {
      const nx = (Math.random() - 0.5) * 1.6;
      const ny = (Math.random() - 0.5) * 0.8;
      setTilt(nx * 0.6, ny * 0.6);
      lookAt(nx * 4, ny * 3);
      setTimeout(() => {
        if (state === 'idle' && !hovering) { lookAt(0, 0); setTilt(0, 0); }
      }, 1500);
    }
  }, 4000);

  // Sleep, stale sessions, tips, roaming.
  let lastTip = Date.now();
  setInterval(() => {
    const now = Date.now();
    for (const [s, ts] of workingSessions) if (now - ts > WORKING_STALE_MS) workingSessions.delete(s);
    if (state === 'working' && workingSessions.size === 0) goIdle();
    if (state === 'idle' && !hovering && !callOn && now - lastActivity > SLEEP_AFTER_MS) goSleep();
    if (S.tipsEvery > 0 && now - lastTip > S.tipsEvery * 60000 && (state === 'idle' || state === 'music') && !callOn) {
      lastTip = now;
      showTip();
    }
  }, 10000);

  setInterval(() => {
    if (!S.roam || state !== 'idle' || hovering || down || musicOn || callOn) return;
    if (Math.random() < 0.4) startWalk();
  }, 25000);

  function startWalk() {
    const dx = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 220);
    setState('walk');
    setLook('open', 'smile');
    setTilt(0, 0);
    pet.classList.toggle('face-left', dx < 0);
    window.pet.walk(dx);
  }
  window.pet.onWalkDone(() => {
    pet.classList.remove('face-left');
    if (state === 'walk') settle();
  });

  // ---------- mouse: click-through, drag, tickle, petting ----------
  let hovering = false;
  let interactive = false;
  let down = null;
  let dragging = false;
  let lastX = null;
  let lastDir = 0;
  let flips = [];
  let lastPat = 0;
  let clicks = [];

  function setInteractive(on) {
    if (on === interactive) return;
    interactive = on;
    window.pet.setIgnoreMouse(!on);
  }

  document.addEventListener('mousemove', (e) => {
    const over = !!e.target.closest('.p-hit, #bubble.show');
    setInteractive(over || dragging || !!aim);
    trackCursor(e.clientX, e.clientY);
    if (over !== hovering) {
      hovering = over;
      if (over) onHover();
    }
    // Petting: rub back and forth over the pet.
    if (over && !down && e.target.closest('.p-hit')) {
      if (lastX !== null) {
        const dir = Math.sign(e.clientX - lastX);
        if (dir && dir !== lastDir) {
          const now = Date.now();
          flips = flips.filter((t) => now - t < 1500).concat(now);
          lastDir = dir;
          if (flips.length >= 5 && now - lastPat > 4000 && ['idle', 'music', 'sleep'].includes(state)) {
            lastPat = now;
            flips = [];
            petted();
          }
        }
      }
      lastX = e.clientX;
    } else {
      lastX = null;
    }
  });

  document.addEventListener('mouseleave', () => {
    if (dragging || aim) return;
    hovering = false;
    setInteractive(false);
    setTilt(0, 0);
    if (state === 'idle') lookAt(0, 0);
  });

  function onHover() {
    lastActivity = Date.now();
    if (state === 'sleep') wake();
    else if (state === 'attention') after(2500, settle);
  }

  function petted() {
    lastActivity = Date.now();
    if (state === 'sleep') goIdle(true);
    hearts();
    play('purr');
    setLook('happy', 'smile');
    showBubble(pick(L.pat()), { ms: 1800 });
    setTimeout(() => {
      if (state === 'idle') setLook('open', callOn ? 'flat' : 'smile');
    }, 1600);
  }

  // ---------- slingshot: hold still ~0.5s, pull back, let go ----------
  const sling = document.getElementById('sling');
  const sctx = sling.getContext('2d');
  const HOLD_MS = 450;
  const MAX_PULL = 170;
  const POWER = 0.3; // px of pull -> px/frame launch speed
  const VIS = 0.28; // how far the pet visibly stretches inside its window
  let holdTimer = null;
  let aim = null; // { ax, ay, px, py }

  function sizeSling() {
    sling.width = window.innerWidth * devicePixelRatio;
    sling.height = window.innerHeight * devicePixelRatio;
    sctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', sizeSling);
  sizeSling();

  function startAim() {
    if (!down || dragging) return;
    aim = { ax: down.x, ay: down.y, px: 0, py: 0 };
    setState('aim');
    setLook('open', 'o');
    setTilt(0, 0);
    lookAt(0, 0);
    showBubble('🎯 Pull back & let go!', { ms: 2500 });
    play('pop');
    drawSling();
  }

  function updateAim(e) {
    let px = e.screenX - aim.ax;
    let py = e.screenY - aim.ay;
    const d = Math.hypot(px, py);
    if (d > MAX_PULL) { px *= MAX_PULL / d; py *= MAX_PULL / d; }
    aim.px = px;
    aim.py = py;
    const k = Math.hypot(px, py) / MAX_PULL;
    wrap.style.transform = `translate(${px * VIS}px, ${py * VIS}px) rotate(${px * 0.08}deg) scale(${1 + k * 0.06}, ${1 - k * 0.08})`;
    lookAt((-px / MAX_PULL) * 4.5, (-py / MAX_PULL) * 4); // eyes on the target
    if (k > 0.85) setLook('open', 'grin');
    drawSling();
  }

  function drawSling() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    sctx.clearRect(0, 0, W, H);
    if (!aim) return;
    const s = S.scale;
    const cx = W / 2;
    const stemTop = H - 45 * s;
    const tipL = { x: cx - 78 * s, y: H - 100 * s };
    const tipR = { x: cx + 78 * s, y: H - 100 * s };
    const pet = { x: cx + aim.px * VIS, y: H - 100 * s + aim.py * VIS };
    const k = Math.hypot(aim.px, aim.py) / MAX_PULL;

    // wooden fork
    sctx.lineCap = 'round';
    sctx.lineJoin = 'round';
    sctx.strokeStyle = '#7a4a24';
    sctx.lineWidth = 10 * s;
    sctx.beginPath();
    sctx.moveTo(cx, H - 2);
    sctx.lineTo(cx, stemTop);
    sctx.lineTo(tipL.x, tipL.y);
    sctx.moveTo(cx, stemTop);
    sctx.lineTo(tipR.x, tipR.y);
    sctx.stroke();

    // rubber bands get thinner and redder as they stretch
    sctx.strokeStyle = `rgb(${90 + k * 140}, ${40 + (1 - k) * 30}, 40)`;
    sctx.lineWidth = (6 - k * 3) * s;
    sctx.beginPath();
    sctx.moveTo(tipL.x, tipL.y);
    sctx.lineTo(pet.x, pet.y);
    sctx.lineTo(tipR.x, tipR.y);
    sctx.stroke();

    // trajectory preview (scaled down to fit the window)
    if (k > 0.12) {
      let x = pet.x;
      let y = pet.y;
      let vx = -aim.px * POWER;
      let vy = -aim.py * POWER;
      for (let i = 1; i <= 14; i++) {
        for (let j = 0; j < 3; j++) { vy += 1.1; x += vx * 0.07; y += vy * 0.07; }
        sctx.globalAlpha = 1 - i / 16;
        sctx.fillStyle = '#ffd23f';
        sctx.beginPath();
        sctx.arc(x, y, (3.2 - i * 0.12) * s + 1, 0, Math.PI * 2);
        sctx.fill();
      }
      sctx.globalAlpha = 1;
    }
  }

  function releaseAim() {
    const { px, py } = aim;
    aim = null;
    drawSling();
    wrap.style.transform = '';
    if (Math.hypot(px, py) < 25) return settle(); // barely pulled: cancel
    lastActivity = Date.now();
    setState('fly');
    setLook('happy', 'grin');
    hideBubble();
    play('whee');
    window.pet.fling(-px * POWER, -py * POWER);
  }

  window.pet.onFlyBounce(() => {
    play('boing');
    setLook('dizzy', 'o');
    setTimeout(() => state === 'fly' && setLook('happy', 'grin'), 250);
  });

  window.pet.onFlyDone(({ bounces = 0, crossed = false } = {}) => {
    if (state !== 'fly') return;
    setState('land');
    setLook(bounces >= 3 ? 'dizzy' : 'happy', 'grin');
    play('chomp');
    setTimeout(() => {
      if (state !== 'land') return;
      showQuote(crossed ? '🖥️ Wheee, new screen!' : bounces >= 3 ? '😵 Boing boing… I’m okay!' : '🚀 Wheee! That was fun');
    }, 700);
    after(7000, settle);
  });

  hit.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    hit.setPointerCapture(e.pointerId);
    down = { x: e.screenX, y: e.screenY, lx: e.screenX, ly: e.screenY };
    clearTimeout(holdTimer);
    if (state !== 'fly') holdTimer = setTimeout(startAim, HOLD_MS);
  });
  hit.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (aim) return updateAim(e);
    if (!dragging && Math.hypot(e.screenX - down.x, e.screenY - down.y) > 4) {
      clearTimeout(holdTimer);
      dragging = true;
      wrap.classList.add('dragging');
      if (state === 'walk') goIdle();
    }
    if (dragging) {
      window.pet.moveBy(e.screenX - down.lx, e.screenY - down.ly);
      down.lx = e.screenX;
      down.ly = e.screenY;
    }
  });
  hit.addEventListener('pointerup', (e) => {
    if (!down) return;
    clearTimeout(holdTimer);
    hit.releasePointerCapture(e.pointerId);
    if (aim) {
      down = null;
      return releaseAim();
    }
    if (state === 'fly') { down = null; return; }
    const wasDrag = dragging;
    down = null;
    dragging = false;
    wrap.classList.remove('dragging');
    if (wasDrag) return window.pet.dragEnd();

    lastActivity = Date.now();
    const now = Date.now();
    clicks = clicks.filter((t) => now - t < 3000).concat(now);
    if (state === 'sleep') wake();
    else if (state === 'attention') { hideBubble(); settle(); }
    else if (clicks.length >= 6) { clicks = []; goDizzy(); }
    else tickle();
  });
  // If the OS takes the mouse away mid-gesture (alt-tab, lock screen…), finish it cleanly.
  hit.addEventListener('lostpointercapture', () => {
    clearTimeout(holdTimer);
    if (aim) {
      down = null;
      releaseAim();
    } else if (dragging) {
      down = null;
      dragging = false;
      wrap.classList.remove('dragging');
      window.pet.dragEnd();
    }
  });
  hit.addEventListener('dblclick', () => goDone(lastProject));
  hit.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.pet.contextMenu();
  });

  // ---------- bubble ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function showBubble(text, { sub = '', ms = 3000, sticky = false, cls = '', html = false } = {}) {
    clearTimeout(bubbleTimer);
    if (html) bubbleText.innerHTML = text;
    else bubbleText.textContent = text;
    bubbleSub.textContent = sub || '';
    bubble.className = 'show' + (cls ? ' ' + cls : '');
    if (!sticky) bubbleTimer = setTimeout(hideBubble, ms);
  }

  function hideBubble() {
    clearTimeout(bubbleTimer);
    bubble.classList.remove('show');
  }

  // ---------- confetti ----------
  const canvas = document.getElementById('confetti');
  const cctx = canvas.getContext('2d');
  let particles = [];
  let raf = null;
  const COLORS = ['#ff6f91', '#ffd23f', '#4fb3ef', '#22a83a', '#3b2d91', '#ff9f5c'];

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    cctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function burstConfetti(n) {
    const ox = window.innerWidth / 2;
    const oy = window.innerHeight - 110 * S.scale;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const v = (4 + Math.random() * 6) * Math.max(0.7, S.scale);
      particles.push({
        x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 4 + Math.random() * 5, h: 6 + Math.random() * 6,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        c: pick(COLORS), life: 0, max: 90 + Math.random() * 50, round: Math.random() < 0.3,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    cctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter((p) => p.life < p.max);
    for (const p of particles) {
      p.life++;
      p.vy += 0.18;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      cctx.save();
      cctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      cctx.translate(p.x, p.y);
      cctx.rotate(p.r);
      cctx.fillStyle = p.c;
      if (p.round) {
        cctx.beginPath();
        cctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        cctx.fill();
      } else {
        cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
      }
      cctx.restore();
    }
    raf = particles.length ? requestAnimationFrame(tick) : null;
    if (!raf) cctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---------- boot ----------
  let booted = false;
  window.pet.getSettings().then((s) => {
    applySettings(s);
    booted = true;
    scheduleBlink();
    goHello();
  });
})();
