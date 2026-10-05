// A teammate's pet visiting this screen. Lightweight: says hi, can be tickled,
// double-click sends it home, and it leaves by itself after a while.
(() => {
  const wrap = document.getElementById('pet-wrap');
  wrap.innerHTML = PetSVG('guest');
  const pet = wrap.querySelector('svg.pet');
  const hit = pet.querySelector('.p-hit');
  const bubble = document.getElementById('bubble');
  const bubbleText = document.getElementById('bubble-text');
  const bubbleSub = document.getElementById('bubble-sub');
  const STAY_MS = 30 * 1000;
  let info = { petName: 'Pet', ownerName: 'A teammate', hostName: 'friend', sound: true };
  let leaving = false;
  let stayTimer = null;
  let bubbleTimer = null;

  function setState(s) {
    pet.classList.forEach((c) => c.startsWith('s-') && pet.classList.remove(c));
    void pet.getBoundingClientRect();
    pet.classList.add(`s-${s}`);
  }
  const look = (eyes, mouth) => { pet.dataset.eyes = eyes; pet.dataset.mouth = mouth; };
  function say(text, sub = '', ms = 4000) {
    clearTimeout(bubbleTimer);
    bubbleText.textContent = text;
    bubbleSub.textContent = sub;
    bubble.className = 'show tip';
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), ms);
  }
  const play = (name, ...a) => info.sound !== false && Sfx[name](...a);

  window.pet.onGuestInit((d) => {
    info = { ...info, ...d };
    pet.dataset.species = d.species || 'cat';
    const eq = d.equipped || {};
    for (const slot of ['head', 'face', 'neck', 'body', 'prop']) pet.dataset[slot] = eq[slot] || '';
    document.documentElement.style.setProperty('--s', d.scale || 1);
    Sfx.setVolume(d.volume ?? 0.7);
    setState('fly');
    look('happy', 'grin');
    play('whee');
  });

  window.pet.onGuestEvent((ev) => {
    if (ev === 'bounce') { play('boing'); return; }
    if (ev === 'landed') {
      setState('land');
      look('happy', 'grin');
      say(`👋 Hi ${info.hostName}! I'm ${info.petName}`, `${info.ownerName}'s pet came to visit`, 5000);
      play('giggle', 5);
      setTimeout(() => !leaving && (setState('idle'), look('open', 'smile')), 700);
      stayTimer = setTimeout(goHome, STAY_MS);
    }
    if (ev === 'leaving') {
      setState('fly');
      look('happy', 'grin');
      play('whee');
    }
  });

  function goHome() {
    if (leaving) return;
    leaving = true;
    clearTimeout(stayTimer);
    say(`Bye ${info.hostName}! 👋`, `Going back to ${info.ownerName}`, 1500);
    setTimeout(() => window.pet.guestLeave(), 900);
  }

  // click-through except on the pet / bubble
  let interactive = false;
  document.addEventListener('mousemove', (e) => {
    const over = !!e.target.closest('.p-hit, #bubble.show');
    if (over !== interactive) {
      interactive = over;
      window.pet.setIgnoreMouse(!over);
    }
  });

  hit.addEventListener('click', () => {
    if (leaving) return;
    setState('tickle');
    look('happy', 'grin');
    say(['hehe!', 'that tickles! 😆', `stop it ${info.hostName}, hehe`][Math.floor(Math.random() * 3)], `${info.ownerName}'s ${info.petName}`, 1500);
    play('giggle', 4);
    window.pet.guestPoke();
    setTimeout(() => !leaving && (setState('idle'), look('open', 'smile')), 900);
  });
  hit.addEventListener('dblclick', goHome);
  hit.addEventListener('contextmenu', (e) => { e.preventDefault(); goHome(); });

  setState('idle');
  look('open', 'smile');
})();
