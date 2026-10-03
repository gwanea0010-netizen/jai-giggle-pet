(() => {
  const $ = (id) => document.getElementById(id);
  const api = window.pet;
  const { ACCESSORIES, SLOTS, FESTIVALS, activeFestival, isUnlocked } = PET_ACCESSORIES;
  const SIZES = [
    { label: 'Tiny', scale: 0.5 },
    { label: 'Small', scale: 0.65 },
    { label: 'Medium', scale: 0.8 },
    { label: 'Large', scale: 1 },
    { label: 'XL', scale: 1.25 },
  ];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toLocaleDateString('en-CA');
  let S = {};

  // Paint a pet svg with a given look.
  function dress(svg, { species, equipped = {} }) {
    svg.dataset.species = species || 'cat';
    svg.dataset.head = equipped.head || '';
    svg.dataset.face = equipped.face || '';
    svg.dataset.neck = equipped.neck || '';
    svg.dataset.body = equipped.body || '';
    svg.dataset.prop = equipped.prop || '';
  }

  // Next upcoming festival day (or the active one).
  function nextFestival() {
    const now = new Date(today() + 'T00:00:00').getTime();
    let best = null;
    for (const f of FESTIVALS) {
      const days = (f.dates || []).slice();
      const y = new Date().getFullYear();
      for (const md of f.md || []) days.push(`${y}-${md}`, `${y + 1}-${md}`);
      for (const d of days) {
        const t = new Date(d + 'T00:00:00').getTime();
        if (t + f.after * 864e5 >= now && (!best || t < best.t)) best = { f, t };
      }
    }
    return best && { ...best.f, days: Math.round((best.t - now) / 864e5) };
  }

  // ---------- tabs ----------
  function showTab(name) {
    if (!document.querySelector(`[data-panel="${name}"]`)) name = 'pet';
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
    if (name === 'team') refreshTeam();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  api.onOpenTab(showTab);

  // ---------- hero + species + sizes ----------
  $('hero-pet').innerHTML = PetSVG('hero');
  const heroPet = $('hero-pet').querySelector('.pet');

  PET_SPECIES.forEach((sp) => {
    const card = document.createElement('button');
    card.className = 'sp-card';
    card.dataset.id = sp.id;
    card.innerHTML = `${PetSVG('sp-' + sp.id)}<b>${sp.name}</b><small>${sp.blurb}</small>`;
    card.addEventListener('click', () => save({ species: sp.id }));
    $('species').appendChild(card);
  });

  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.textContent = s.label;
    b.dataset.scale = s.scale;
    b.addEventListener('click', () => save({ scale: s.scale }));
    $('size-presets').appendChild(b);
  });

  // ---------- wardrobe ----------
  function renderWardrobe() {
    const total = (S.stats && S.stats.total) || 0;
    const eq = S.equipped || {};
    const collected = S.collected || [];
    $('w-total').textContent = total;
    const regular = ACCESSORIES.filter((a) => !a.festival);
    const next = regular.filter((a) => a.unlock > total).sort((a, b) => a.unlock - b.unlock)[0];
    const prev = regular.filter((a) => a.unlock <= total).reduce((m, a) => Math.max(m, a.unlock), 0);

    const active = activeFestival();
    const upcoming = nextFestival();
    const fest = active || upcoming;
    if (fest) {
      const items = ACCESSORIES.filter((a) => a.festival === fest.id).map((a) => `${a.emoji} ${a.name}`).join(' + ');
      $('festival-card').innerHTML = active
        ? `<b>${fest.emoji} ${fest.greet}!</b><p class="hint">Festival outfit collected: ${items}. It's yours forever.</p>`
        : `<b>${fest.emoji} Next festival: ${fest.name} in ${fest.days} day${fest.days === 1 ? '' : 's'}</b>
           <p class="hint">Keep your pet running around ${fest.name} to collect: ${items}</p>`;
    }
    $('festival-card').hidden = !fest;
    if (next) {
      $('w-bar').style.width = `${Math.round(((total - prev) / (next.unlock - prev)) * 100)}%`;
      $('w-next').textContent = `Next: ${next.emoji} ${next.name} in ${next.unlock - total} more task${next.unlock - total === 1 ? '' : 's'}`;
    } else {
      $('w-bar').style.width = '100%';
      $('w-next').textContent = '🏅 Everything unlocked. Legend!';
    }

    const root = $('wardrobe');
    root.innerHTML = '';
    for (const [slot, label] of Object.entries(SLOTS)) {
      const card = document.createElement('div');
      card.className = 'card slot';
      card.innerHTML = `<h2>${label}</h2><div class="items"></div>`;
      const items = card.querySelector('.items');
      for (const a of ACCESSORIES.filter((x) => x.slot === slot)) {
        const unlocked = isUnlocked(a, total, collected);
        const worn = eq[slot] === a.id;
        const f = a.festival && FESTIVALS.find((x) => x.id === a.festival);
        const lockText = f ? `${f.emoji} ${f.name} special · preview` : `Unlocks at ${a.unlock} tasks · preview`;
        const el = document.createElement('button');
        el.className = `item${unlocked ? '' : ' locked'}${worn ? ' equipped' : ''}`;
        el.innerHTML = `${f ? `<span class="tag">FESTIVAL</span>` : ''}<span class="emoji">${unlocked ? a.emoji : '🔒'}</span><b>${a.name}</b>
          <small>${worn ? '✅ Wearing (click to remove)' : unlocked ? 'Click to wear' : lockText}</small>`;
        el.addEventListener('click', () => {
          if (!unlocked) return api.trigger('preview', a.id);
          save({ equipped: { [slot]: worn ? '' : a.id } });
        });
        items.appendChild(el);
      }
      root.appendChild(card);
    }
  }

  // ---------- team ----------
  let boardMode = 'today';
  document.querySelectorAll('[data-board]').forEach((b) =>
    b.addEventListener('click', () => {
      boardMode = b.dataset.board;
      document.querySelectorAll('[data-board]').forEach((x) => x.classList.toggle('active', x === b));
      refreshTeam();
    })
  );

  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 2) return 'active now';
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
  }

  async function refreshTeam() {
    const t = await api.teamGet();
    $('team-setup').hidden = !!t.folder;
    $('team-board').hidden = !t.folder;
    if (!t.folder) return;
    $('team-folder').textContent = `📁 ${t.folder}`;
    const members = [...t.members];
    if (boardMode === 'total') members.sort((a, b) => b.total - a.total);
    const list = $('board');
    list.innerHTML = '';
    if (!members.length) {
      list.innerHTML = '<li class="empty">No one here yet. Finish a task to show up!</li>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    members.forEach((m, i) => {
      const li = document.createElement('li');
      if (m.id === t.me) li.className = 'me';
      const score = boardMode === 'today' ? m.today : m.total;
      li.innerHTML = `
        <span class="rank">${score > 0 && medals[i] ? medals[i] : i + 1}</span>
        <span class="mini">${PetSVG('tm-' + i)}</span>
        <span class="who"><b>${esc(m.ownerName)}${m.id === t.me ? ' (you)' : ''}</b><small>${esc(m.petName)} · ${ago(m.updatedAt)}</small></span>
        <span class="score"><b>${score}</b><small>${boardMode === 'today' ? 'today' : 'all time'}</small></span>`;
      dress(li.querySelector('.pet'), m);
      list.appendChild(li);
    });
  }

  $('team-pick').addEventListener('click', async () => { await api.teamPick(); refreshTeam(); });
  $('team-change').addEventListener('click', async () => { await api.teamPick(); refreshTeam(); });
  $('team-leave').addEventListener('click', async () => { await api.teamLeave(); refreshTeam(); });
  $('team-refresh').addEventListener('click', refreshTeam);
  $('team-open').addEventListener('click', () => api.teamOpen());
  setInterval(() => document.querySelector('[data-panel="team"].active') && refreshTeam(), 30000);

  // ---------- render ----------
  function render() {
    const owner = (S.ownerName || '').trim();
    $('title').textContent = S.petName || 'Giggles';
    $('subtitle').textContent = owner ? `${owner}'s Cyborg ERP dev buddy` : 'Your Cyborg ERP dev buddy';
    document.title = `${S.petName} · Settings`;
    $('greet-preview').textContent = owner
      ? `${S.petName} will say things like "All done, ${owner}! 🎉"`
      : 'Tell your pet your name so it can greet you 🧡';

    if (document.activeElement !== $('ownerName')) $('ownerName').value = S.ownerName || '';
    if (document.activeElement !== $('petName')) $('petName').value = S.petName || '';

    dress(heroPet, S);
    document.querySelectorAll('.sp-card').forEach((c) => {
      c.classList.toggle('selected', c.dataset.id === S.species);
      dress(c.querySelector('.pet'), { species: c.dataset.id, equipped: S.equipped });
    });
    document.querySelectorAll('#size-presets button').forEach((b) =>
      b.classList.toggle('active', Math.abs(Number(b.dataset.scale) - S.scale) < 0.01)
    );
    $('scale').value = S.scale;
    $('scale-out').textContent = `${Math.round(S.scale * 100)}%`;

    for (const k of ['sound', 'media', 'codeHelper', 'roam', 'notifications', 'startWithWindows']) $(k).checked = !!S[k];
    $('volume').value = S.volume;
    $('tipsEvery').value = String(S.tipsEvery);
    $('autoUpdate').checked = S.autoUpdate !== false;
    if (document.activeElement !== $('updateSource')) $('updateSource').value = S.updateSource || '';

    $('stat-today').textContent = S.stats && S.stats.date === today() ? S.stats.today : 0;
    $('stat-total').textContent = (S.stats && S.stats.total) || 0;
    renderWardrobe();
  }

  async function save(patch) {
    S = await api.setSettings(patch);
    render();
  }

  let typing = null;
  for (const k of ['ownerName', 'petName']) {
    $(k).addEventListener('input', () => {
      clearTimeout(typing);
      typing = setTimeout(() => save({ [k]: $(k).value }), 350);
    });
  }
  $('scale').addEventListener('input', () => { $('scale-out').textContent = `${Math.round($('scale').value * 100)}%`; });
  $('scale').addEventListener('change', () => save({ scale: Number($('scale').value) }));
  $('volume').addEventListener('change', () => save({ volume: Number($('volume').value) }));
  $('tipsEvery').addEventListener('change', () => save({ tipsEvery: Number($('tipsEvery').value) }));
  for (const k of ['sound', 'media', 'codeHelper', 'roam', 'notifications', 'startWithWindows']) {
    $(k).addEventListener('change', () => save({ [k]: $(k).checked }));
  }

  document.querySelectorAll('[data-try]').forEach((b) =>
    b.addEventListener('click', () => {
      const t = b.dataset.try;
      if (t === 'working') api.trigger('working', 'Editing code…');
      else if (t === 'attention') api.trigger('attention', 'Claude needs your permission to run a command');
      else if (t === 'music') api.trigger('music', 'Kesariya - YouTube - Google Chrome');
      else if (t === 'codetest') api.trigger('codetest', "UPDATE dbo.StudentFees SET Status = 'Paid'\nSELECT * FROM dbo.Students WITH (NOLOCK) WHERE Email LIKE '%gmail.com'");
      else api.trigger(t);
    })
  );

  // ---------- Claude Code hooks ----------
  async function refreshHooks(st) {
    st = st || (await api.hooksStatus());
    const el = $('hooks-status');
    const btn = $('hooks-btn');
    if (st.installed) {
      el.textContent = '✅ Connected to Claude Code';
      el.className = 'status ok';
      btn.textContent = 'Disconnect';
      btn.classList.add('danger');
    } else {
      el.textContent = st.connected && st.connected.length ? '⚠️ Partially connected' : '⛔ Not connected';
      el.className = 'status bad';
      btn.textContent = 'Connect';
      btn.classList.remove('danger');
    }
    btn.dataset.installed = st.installed ? '1' : '';
  }
  $('hooks-btn').addEventListener('click', async () => {
    const btn = $('hooks-btn');
    btn.disabled = true;
    try {
      await refreshHooks(btn.dataset.installed ? await api.hooksRemove() : await api.hooksInstall());
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- sharing ----------
  async function runButton(btnId, statusId, busyText, fn, okText) {
    const btn = $(btnId);
    const st = $(statusId);
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyText;
    try {
      const file = await fn();
      st.textContent = `${okText} ${file}`;
      st.className = 'status ok';
    } catch (err) {
      st.textContent = `Failed: ${String(err.message || err).replace(/^Error invoking remote method '[^']+': /, '')}`;
      st.className = 'status bad';
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }
  $('share-btn').addEventListener('click', () => runButton('share-btn', 'share-status', '⏳ Packing…', api.createShare, '✅ Ready:'));
  $('build-btn').addEventListener('click', () => runButton('build-btn', 'build-status', '⏳ Building… (1–3 min)', api.buildInstaller, '✅ Installer ready:'));

  // ---------- updates ----------
  function renderUpdate(u) {
    const el = $('update-status');
    const v = `v${u.current}`;
    const map = {
      'no-source': [`${v} · Pick a team folder (🏆 tab) or an update source below`, 'muted'],
      checking: [`${v} · Checking…`, 'muted'],
      latest: [`✅ ${v} · Up to date`, 'ok'],
      downloading: [`${v} · Downloading ${u.version}…`, 'muted'],
      ready: [`🎁 ${u.version} ready to install${u.notes ? `: ${u.notes}` : ''}`, 'ok'],
      dev: [`${v} (source checkout) · ${u.version} published`, 'muted'],
      error: [`${v} · Couldn't check: ${u.error}`, 'bad'],
      idle: [`${v}`, 'muted'],
    };
    const [text, cls] = map[u.status] || map.idle;
    el.textContent = text;
    el.className = `status ${cls}`;
    $('update-install').hidden = u.status !== 'ready';
  }
  api.onUpdateState(renderUpdate);
  $('update-check').addEventListener('click', async () => renderUpdate(await api.updateCheck()));
  $('update-install').addEventListener('click', () => api.updateInstall());
  $('update-pick').addEventListener('click', async () => renderUpdate(await api.updatePick()));
  $('updateSource').addEventListener('change', () => save({ updateSource: $('updateSource').value }));
  $('autoUpdate').addEventListener('change', () => save({ autoUpdate: $('autoUpdate').checked }));
  $('publish-btn').addEventListener('click', () =>
    runButton('publish-btn', 'publish-status', '⏳ Publishing… (1–3 min)',
      () => api.updatePublish({ level: $('release-level').value, notes: $('release-notes').value }), '✅ Published:')
  );

  api.onSettings((s) => {
    S = { ...S, ...s };
    render();
  });

  Promise.all([api.getSettings(), api.appInfo()]).then(([s, info]) => {
    S = s;
    $('share-dev').hidden = info.packaged;
    $('share-packaged').hidden = !info.packaged;
    $('publish-box').hidden = info.packaged;
    api.updateState().then(renderUpdate);
    $('version').textContent = `Version ${info.version}`;
    render();
    refreshHooks();
    showTab(location.hash.slice(1) || 'pet');
    if (!S.ownerName) $('ownerName').focus();
  });
})();
