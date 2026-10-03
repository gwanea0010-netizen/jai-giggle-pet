(() => {
  const $ = (id) => document.getElementById(id);
  const V = window.pet.vault;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let entries = [];
  let editing = null; // { id, type }

  // ---------- helpers ----------
  function show(view) {
    for (const v of ['setup', 'unlock', 'list', 'edit']) $(`view-${v}`).hidden = v !== view;
    $('lock-btn').hidden = !(view === 'list' || view === 'edit');
    const focus = { setup: 'setup-pw', unlock: 'unlock-pw', list: 'search', edit: 'e-title' }[view];
    setTimeout(() => $(focus) && $(focus).focus(), 30);
  }

  let toastTimer = null;
  function toast(text) {
    $('toast').textContent = text;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2200);
  }

  function strength(pw) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (pw.length >= 16) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(score, 5) / 5;
  }
  function paintMeter(el, pw) {
    const s = strength(pw);
    el.style.width = `${Math.max(pw ? 8 : 0, s * 100)}%`;
    el.style.background = s < 0.4 ? '#e5484d' : s < 0.8 ? '#f5b301' : '#22a83a';
  }

  // ---------- setup / unlock ----------
  async function refresh() {
    const st = await V.status();
    if (!st.exists) return show('setup');
    if (!st.unlocked) return show('unlock');
    await loadList();
    show('list');
  }

  $('setup-pw').addEventListener('input', () => paintMeter($('setup-meter'), $('setup-pw').value));
  $('setup-btn').addEventListener('click', async () => {
    const a = $('setup-pw').value;
    const b = $('setup-pw2').value;
    if (a !== b) return ($('setup-error').textContent = 'The two passwords don’t match');
    if (!$('setup-ack').checked) return ($('setup-error').textContent = 'Please save your master password first, then tick the box.');
    const r = await V.create(a);
    if (!r.ok) return ($('setup-error').textContent = r.error);
    $('setup-pw').value = $('setup-pw2').value = '';
    $('setup-ack').checked = false;
    toast('🔐 Vault created');
    refresh();
  });

  async function unlock() {
    $('unlock-btn').disabled = true;
    $('unlock-error').textContent = '';
    const r = await V.unlock($('unlock-pw').value);
    $('unlock-btn').disabled = false;
    $('unlock-pw').value = '';
    if (!r.ok) return ($('unlock-error').textContent = r.error);
    refresh();
  }
  $('unlock-btn').addEventListener('click', unlock);
  $('unlock-pw').addEventListener('keydown', (e) => e.key === 'Enter' && unlock());
  $('setup-pw2').addEventListener('keydown', (e) => e.key === 'Enter' && $('setup-btn').click());

  $('lock-btn').addEventListener('click', async () => {
    await V.lock();
    toast('🔒 Locked');
    refresh();
  });
  V.onLocked(() => {
    entries = [];
    $('entries').innerHTML = '';
    refresh();
  });

  // ---------- list ----------
  async function loadList() {
    const r = await V.list();
    if (!r.ok) return refresh();
    entries = r.result.sort((a, b) => a.title.localeCompare(b.title));
    renderList();
  }

  function renderList() {
    const q = $('search').value.trim().toLowerCase();
    const list = entries.filter((e) => !q || `${e.title} ${e.username} ${e.url}`.toLowerCase().includes(q));
    $('entries').innerHTML = '';
    $('empty-hint').hidden = entries.length > 0;
    for (const e of list) {
      const li = document.createElement('li');
      const sub = e.type === 'note' ? 'Secure note' : [e.username, e.url].filter(Boolean).join(' · ') || '—';
      li.innerHTML = `
        <span class="icon">${e.type === 'note' ? '📝' : '🔑'}</span>
        <span class="who"><b>${esc(e.title)}</b><small>${esc(sub)}</small></span>
        <span class="acts">
          ${e.type !== 'note' && e.username ? '<button data-act="user" title="Copy username">👤</button>' : ''}
          ${e.type !== 'note' && e.hasPassword ? '<button data-act="pass" title="Copy password (clears in 20s)">📋</button>' : ''}
        </span>`;
      li.addEventListener('click', async (ev) => {
        const act = ev.target.closest('button') && ev.target.closest('button').dataset.act;
        if (act) {
          ev.stopPropagation();
          const r = await V.copy(e.id, act === 'user' ? 'username' : 'password');
          toast(r.ok ? (act === 'user' ? '👤 Username copied' : '📋 Password copied, clears in 20s') : r.error);
          return;
        }
        openEditor(e.id);
      });
      $('entries').appendChild(li);
    }
  }
  $('search').addEventListener('input', renderList);

  // ---------- editor ----------
  async function openEditor(id, type = 'login') {
    let e = { type, title: '', username: '', password: '', url: '', notes: '' };
    if (id) {
      const r = await V.get(id);
      if (!r.ok) return refresh();
      e = r.result;
    }
    editing = { id: id || null, type: e.type };
    $('edit-title').textContent = id ? `Edit ${e.type === 'note' ? 'note' : 'password'}` : e.type === 'note' ? 'New note' : 'New password';
    document.querySelector('.login-only').hidden = e.type === 'note';
    $('e-title').value = e.title;
    $('e-username').value = e.username;
    $('e-password').value = e.password;
    $('e-password').type = 'password';
    $('e-url').value = e.url;
    $('e-notes').value = e.notes;
    $('e-delete').hidden = !id;
    $('edit-error').textContent = '';
    paintMeter($('e-meter'), e.password);
    show('edit');
  }

  $('add-login').addEventListener('click', () => openEditor(null, 'login'));
  $('add-note').addEventListener('click', () => openEditor(null, 'note'));
  $('e-cancel').addEventListener('click', () => {
    editing = null;
    show('list');
  });
  $('e-show').addEventListener('click', () => {
    $('e-password').type = $('e-password').type === 'password' ? 'text' : 'password';
  });
  $('e-gen').addEventListener('click', async () => {
    $('e-password').value = await V.generate(18);
    $('e-password').type = 'text';
    paintMeter($('e-meter'), $('e-password').value);
  });
  $('e-password').addEventListener('input', () => paintMeter($('e-meter'), $('e-password').value));

  $('e-save').addEventListener('click', async () => {
    if (!$('e-title').value.trim()) return ($('edit-error').textContent = 'Give it a title');
    const r = await V.save({
      id: editing.id,
      type: editing.type,
      title: $('e-title').value,
      username: $('e-username').value,
      password: $('e-password').value,
      url: $('e-url').value,
      notes: $('e-notes').value,
    });
    if (!r.ok) return ($('edit-error').textContent = r.error);
    $('e-password').value = '';
    editing = null;
    toast('✅ Saved');
    await loadList();
    show('list');
  });

  $('e-delete').addEventListener('click', async () => {
    if (!editing || !editing.id) return;
    if (!confirm(`Delete "${$('e-title').value}"? This can’t be undone.`)) return;
    const r = await V.remove(editing.id);
    if (!r.ok) return ($('edit-error').textContent = r.error);
    editing = null;
    toast('🗑️ Deleted');
    await loadList();
    show('list');
  });

  // ---------- change master password ----------
  $('cm-btn').addEventListener('click', async () => {
    const r = await V.changeMaster($('cm-old').value, $('cm-new').value);
    $('cm-old').value = $('cm-new').value = '';
    if (!r.ok) return ($('cm-error').textContent = r.error);
    $('cm-error').textContent = '';
    toast('🔐 Master password changed');
  });

  refresh();
})();
