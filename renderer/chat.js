(() => {
  const $ = (id) => document.getElementById(id);
  const C = window.pet.chat;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let state = { members: [] };
  let current = location.hash.slice(1) || '';

  function dress(svg, m) {
    svg.dataset.species = m.species || 'cat';
    const eq = m.equipped || {};
    for (const slot of ['head', 'face', 'neck', 'body', 'prop']) svg.dataset[slot] = eq[slot] || '';
  }

  async function loadPeople() {
    state = await C.state();
    const list = $('people');
    list.innerHTML = '';
    $('people-empty').hidden = state.members.length > 0;
    if (!state.team) $('people-empty').textContent = 'Join a team first: right-click the pet → Team leaderboard.';
    if (!current && state.members[0]) current = state.members[0].id;
    state.members.forEach((m, i) => {
      const li = document.createElement('li');
      li.dataset.id = m.id;
      if (m.id === current) li.className = 'active';
      li.innerHTML = `<span class="avatar">${PetSVG('c' + i)}<span class="dot${m.online ? ' on' : ''}"></span></span>
        <span class="pname"><b>${esc(m.ownerName)}</b><small>${esc(m.petName)} · ${m.online ? 'online' : 'offline'}</small></span>
        ${m.unread ? `<span class="unread">${m.unread}</span>` : '<span></span>'}`;
      dress(li.querySelector('.pet'), m);
      li.addEventListener('click', () => select(m.id));
      list.appendChild(li);
    });
    renderHead();
  }

  function renderHead() {
    const m = state.members.find((x) => x.id === current);
    $('thread-head').innerHTML = m
      ? `💬 ${esc(m.ownerName)} <small>${m.online ? '🟢 online' : '⚪ offline · they get it when their pet starts'}</small>`
      : '<span class="muted">Pick a teammate</span>';
    for (const el of [$('text'), $('send'), ...document.querySelectorAll('[data-q]')]) el.disabled = !m;
  }

  const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDay = (t) => new Date(t).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  async function loadThread() {
    const box = $('messages');
    if (!current) { box.innerHTML = ''; return; }
    const msgs = await C.thread(current);
    if (!msgs.length) {
      box.innerHTML = '<div class="empty-thread">No messages yet.<br>Say hi! 👋</div>';
      return;
    }
    let lastDay = '';
    box.innerHTML = msgs.map((m) => {
      const day = fmtDay(m.at);
      const sep = day !== lastDay ? `<div class="day">${day}</div>` : '';
      lastDay = day;
      return `${sep}<div class="msg ${m.dir}">${esc(m.text)}<time>${fmtTime(m.at)}</time></div>`;
    }).join('');
    box.scrollTop = box.scrollHeight;
  }

  async function select(id) {
    current = id;
    document.querySelectorAll('#people li').forEach((li) => li.classList.toggle('active', li.dataset.id === id));
    renderHead();
    await loadThread();
    loadPeople(); // refresh unread badges
    $('text').focus();
  }

  async function send(text) {
    if (!current || !String(text).trim()) return;
    $('send').disabled = true;
    $('error').textContent = '';
    const r = await C.send(current, text);
    $('send').disabled = false;
    if (!r.ok) return ($('error').textContent = `❌ ${r.error}`);
    $('text').value = '';
    loadThread();
  }

  $('composer').addEventListener('submit', (e) => { e.preventDefault(); send($('text').value); });
  $('text').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send($('text').value); }
  });
  document.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => send(b.dataset.q)));

  C.onUpdate((withId) => {
    if (withId === current) loadThread();
    loadPeople();
  });
  C.onSelect((id) => select(id));
  setInterval(loadPeople, 30000);

  loadPeople().then(loadThread);
})();
