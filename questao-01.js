/**
 * Questão 1 — Rede cliente–servidor (só figuras)
 * Banca à esquerda + área grande para colar / arrastar figuras.
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q1';
  const EXERCISE_TITLE = 'Rede cliente–servidor (figuras)';
  const SESSION_KEY = 'sft_q1_session';

  const REQ = {
    minClients: 2,
    servers: 1,
    switches: 1,
  };

  const TYPES = {
    client: { label: 'Cliente', emoji: '💻', color: '#22d3ee' },
    server: { label: 'Servidor', emoji: '🖥️', color: '#a78bfa' },
    switch: { label: 'Switch', emoji: '🔀', color: '#34d399' },
  };

  let teamName = '';
  let teamMembers = '';
  let passedOnce = false;
  let nextId = 1;
  /** @type {{id:number,type:string,label:string,x:number,y:number}[]} */
  let devices = [];
  /** @type {{id:number,a:number,b:number}[]} */
  let links = [];
  let mode = 'select';
  let placeType = null;
  let connectFrom = null;
  let selectedId = null;
  let drag = null;
  let suppressClick = false;

  const $ = (sel) => document.querySelector(sel);

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    bindEvents();
    updateTeamUI();
    setMode('select');
    render();
    updateCounts();
    if (passedOnce) $('#success-banner')?.classList.add('show');
  }

  function loadTeam() {
    const team = R.requireCurrentTeam();
    if (!team) return false;
    teamName = team.name;
    teamMembers = team.members || '';
    return true;
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      passedOnce = !!s.passedOnce;
      devices = s.devices || [];
      links = s.links || [];
      nextId = s.nextId || 1;
    } catch {
      /* ignore */
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ passedOnce, devices, links, nextId })
    );
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function canvasEl() {
    return $('#canvas');
  }

  function wrapEl() {
    return $('#canvas-wrap');
  }

  function getCanvasRect() {
    const el = wrapEl() || canvasEl();
    return el.getBoundingClientRect();
  }

  function clientToCanvas(clientX, clientY) {
    const rect = getCanvasRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function bindEvents() {
    // Clique na banca: prepara para colocar
    document.querySelectorAll('[data-place]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        // se veio de drag, ignore click residual
        if (btn.dataset.dragged === '1') {
          btn.dataset.dragged = '0';
          return;
        }
        placeType = btn.dataset.place;
        setMode('place');
        document.querySelectorAll('[data-place]').forEach((b) =>
          b.classList.toggle('active', b.dataset.place === placeType)
        );
        wrapEl()?.classList.add('place-mode');
        showToast(
          `Clique na área pontilhada para colocar: ${TYPES[placeType].label}`,
          'ok'
        );
      });

      // Drag da banca
      btn.addEventListener('dragstart', (e) => {
        const type = btn.dataset.place;
        e.dataTransfer.setData('text/plain', type);
        e.dataTransfer.setData('application/x-sft-device', type);
        e.dataTransfer.effectAllowed = 'copy';
        btn.dataset.dragged = '1';
        placeType = type;
      });
      btn.addEventListener('dragend', () => {
        setTimeout(() => {
          btn.dataset.dragged = '0';
        }, 50);
      });
    });

    const wrap = wrapEl();
    // Drop na área
    wrap?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      wrap.classList.add('drag-over');
    });
    wrap?.addEventListener('dragleave', (e) => {
      if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('drag-over');
    });
    wrap?.addEventListener('drop', (e) => {
      e.preventDefault();
      wrap.classList.remove('drag-over');
      const type =
        e.dataTransfer.getData('application/x-sft-device') ||
        e.dataTransfer.getData('text/plain');
      if (!TYPES[type]) return;
      const p = clientToCanvas(e.clientX, e.clientY);
      addDevice(type, p.x, p.y, p.width, p.height);
      setMode('select');
    });

    $('#btn-mode-select')?.addEventListener('click', () => setMode('select'));
    $('#btn-mode-connect')?.addEventListener('click', () => setMode('connect'));
    $('#btn-mode-delete')?.addEventListener('click', () => setMode('delete'));
    $('#btn-example')?.addEventListener('click', loadExample);
    $('#btn-reset')?.addEventListener('click', resetAll);
    $('#btn-validate')?.addEventListener('click', () => runValidation(true));
    $('#btn-submit')?.addEventListener('click', submitResult);

    const canvas = canvasEl();
    canvas?.addEventListener('click', onCanvasClick);
    canvas?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // re-render se redimensionar
    window.addEventListener('resize', () => render());
  }

  function setMode(m) {
    mode = m;
    if (m !== 'place') {
      placeType = null;
      document.querySelectorAll('[data-place]').forEach((b) => b.classList.remove('active'));
      wrapEl()?.classList.remove('place-mode');
    } else {
      wrapEl()?.classList.add('place-mode');
    }
    if (m !== 'connect') connectFrom = null;

    $('#btn-mode-select')?.classList.toggle('active', mode === 'select');
    $('#btn-mode-connect')?.classList.toggle('active', mode === 'connect');
    $('#btn-mode-delete')?.classList.toggle('active', mode === 'delete');

    const canvas = canvasEl();
    if (canvas) {
      canvas.classList.remove('mode-select', 'mode-connect', 'mode-delete', 'mode-place');
      canvas.classList.add('mode-' + (mode === 'place' ? 'place' : mode));
    }

    const hint = $('#mode-hint');
    if (hint) {
      const map = {
        select:
          'Modo <strong>Mover</strong>: arraste as figuras na área. Arraste também da banca para cá.',
        connect:
          'Modo <strong>Ligar cabo</strong>: clique em um equipamento e depois no outro.',
        delete: 'Modo <strong>Apagar</strong>: clique no equipamento ou no cabo.',
        place: placeType
          ? `Modo colocar: clique na área para posicionar <strong>${TYPES[placeType].label}</strong>.`
          : 'Escolha uma figura na banca.',
      };
      hint.innerHTML = map[mode] || '';
    }
    render();
  }

  function countByType(type) {
    return devices.filter((d) => d.type === type).length;
  }

  function nextLabel(type) {
    const n = countByType(type) + 1;
    if (type === 'client') return 'Cliente ' + n;
    if (type === 'server') return 'Servidor';
    if (type === 'switch') return 'Switch';
    return type;
  }

  function canAdd(type) {
    if (type === 'server' && countByType('server') >= 1) {
      showToast('Já existe 1 servidor. Basta um.', 'warn');
      return false;
    }
    if (type === 'switch' && countByType('switch') >= 1) {
      showToast('Já existe 1 switch. Basta um.', 'warn');
      return false;
    }
    if (type === 'client' && countByType('client') >= 6) {
      showToast('Máximo de 6 clientes neste exercício.', 'warn');
      return false;
    }
    return true;
  }

  function addDevice(type, x, y, width, height) {
    if (!TYPES[type] || !canAdd(type)) return null;
    const w = width || getCanvasRect().width;
    const h = height || getCanvasRect().height;
    const device = {
      id: nextId++,
      type,
      label: nextLabel(type),
      x: Math.max(48, Math.min(w - 48, x)),
      y: Math.max(48, Math.min(h - 48, y)),
    };
    devices.push(device);
    passedOnce = false;
    selectedId = device.id;
    persistSession();
    render();
    updateCounts();
    showToast(`${TYPES[type].label} colocado.`, 'ok');
    return device;
  }

  function onCanvasClick(e) {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const p = clientToCanvas(e.clientX, e.clientY);
    const hit = hitDevice(p.x, p.y);

    if (mode === 'place' && placeType) {
      if (hit) return;
      addDevice(placeType, p.x, p.y, p.width, p.height);
      // mantém mode place se quiser vários clientes
      if (placeType !== 'client') {
        setMode('select');
      } else {
        // atualiza label da banca
        document.querySelectorAll('[data-place]').forEach((b) =>
          b.classList.toggle('active', b.dataset.place === placeType)
        );
        wrapEl()?.classList.add('place-mode');
      }
      return;
    }

    if (mode === 'delete') {
      if (hit) {
        removeDevice(hit.id);
        return;
      }
      const link = hitLink(p.x, p.y);
      if (link) {
        links = links.filter((l) => l.id !== link.id);
        passedOnce = false;
        persistSession();
        render();
        updateCounts();
        showToast('Cabo removido.', 'ok');
      }
      return;
    }

    if (mode === 'connect') {
      if (!hit) return;
      if (!connectFrom) {
        connectFrom = hit.id;
        selectedId = hit.id;
        render();
        showToast('Agora clique no outro equipamento.', 'ok');
        return;
      }
      if (connectFrom === hit.id) {
        connectFrom = null;
        selectedId = null;
        render();
        return;
      }
      const exists = links.some(
        (l) =>
          (l.a === connectFrom && l.b === hit.id) ||
          (l.a === hit.id && l.b === connectFrom)
      );
      if (exists) {
        showToast('Esses dois já estão ligados.', 'warn');
      } else {
        links.push({ id: nextId++, a: connectFrom, b: hit.id });
        passedOnce = false;
        persistSession();
        showToast('Cabo conectado!', 'ok');
      }
      connectFrom = null;
      selectedId = hit.id;
      render();
      updateCounts();
      return;
    }

    // select
    selectedId = hit ? hit.id : null;
    render();
  }

  function hitDevice(x, y) {
    const r = 40;
    for (let i = devices.length - 1; i >= 0; i--) {
      const d = devices[i];
      const dx = x - d.x;
      const dy = y - d.y;
      if (dx * dx + dy * dy <= r * r) return d;
    }
    return null;
  }

  function hitLink(x, y) {
    for (const l of links) {
      const a = devices.find((d) => d.id === l.a);
      const b = devices.find((d) => d.id === l.b);
      if (!a || !b) continue;
      if (distToSegment(x, y, a.x, a.y, b.x, b.y) < 10) return l;
    }
    return null;
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function removeDevice(id) {
    devices = devices.filter((d) => d.id !== id);
    links = links.filter((l) => l.a !== id && l.b !== id);
    if (selectedId === id) selectedId = null;
    if (connectFrom === id) connectFrom = null;
    passedOnce = false;
    persistSession();
    render();
    updateCounts();
    showToast('Equipamento removido.', 'ok');
  }

  function onPointerDown(e) {
    if (mode !== 'select') return;
    if (e.button != null && e.button !== 0) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    const hit = hitDevice(p.x, p.y);
    if (!hit) return;
    selectedId = hit.id;
    drag = {
      id: hit.id,
      ox: p.x - hit.x,
      oy: p.y - hit.y,
      moved: false,
    };
    try {
      canvasEl()?.setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    render();
  }

  function onPointerMove(e) {
    if (!drag) return;
    const p = clientToCanvas(e.clientX, e.clientY);
    const d = devices.find((x) => x.id === drag.id);
    if (!d) return;
    d.x = Math.max(48, Math.min(p.width - 48, p.x - drag.ox));
    d.y = Math.max(48, Math.min(p.height - 48, p.y - drag.oy));
    drag.moved = true;
    render();
  }

  function onPointerUp() {
    if (drag) {
      if (drag.moved) {
        suppressClick = true;
        passedOnce = false;
        persistSession();
        updateCounts();
      }
      drag = null;
    }
  }

  function render() {
    const svg = $('#canvas-svg');
    const layer = $('#devices-layer');
    const empty = $('#canvas-empty');
    if (!svg || !layer) return;

    if (empty) empty.classList.toggle('hidden', devices.length > 0);

    svg.innerHTML = links
      .map((l) => {
        const a = devices.find((d) => d.id === l.a);
        const b = devices.find((d) => d.id === l.b);
        if (!a || !b) return '';
        const highlight =
          connectFrom === l.a ||
          connectFrom === l.b ||
          selectedId === l.a ||
          selectedId === l.b;
        return `<line class="link ${highlight ? 'hi' : ''}"
          x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`;
      })
      .join('');

    layer.innerHTML = devices
      .map((d) => {
        const t = TYPES[d.type];
        const sel = selectedId === d.id || connectFrom === d.id ? 'selected' : '';
        return `
        <div class="device ${sel}" data-id="${d.id}"
          style="left:${d.x}px;top:${d.y}px;--dc:${t.color}">
          <div class="device-icon">${t.emoji}</div>
          <div class="device-label">${esc(d.label)}</div>
          <div class="device-type">${esc(t.label)}</div>
        </div>`;
      })
      .join('');
  }

  function updateCounts() {
    const c = countByType('client');
    const s = countByType('server');
    const sw = countByType('switch');
    const el = $('#counts');
    if (el) {
      el.innerHTML = `
        <span class="${c >= REQ.minClients ? 'ok' : ''}">Clientes ${c}/${REQ.minClients}+</span>
        <span class="${s >= REQ.servers ? 'ok' : ''}">Servidor ${s}/${REQ.servers}</span>
        <span class="${sw >= REQ.switches ? 'ok' : ''}">Switch ${sw}/${REQ.switches}</span>
        <span>Cabos ${links.length}</span>`;
    }
    const btn = $('#btn-submit');
    if (btn) btn.disabled = !passedOnce;
  }

  function neighbors(id) {
    const ids = [];
    links.forEach((l) => {
      if (l.a === id) ids.push(l.b);
      if (l.b === id) ids.push(l.a);
    });
    return ids;
  }

  function runValidation(showUi) {
    const issues = [];
    const oks = [];

    const clients = devices.filter((d) => d.type === 'client');
    const servers = devices.filter((d) => d.type === 'server');
    const switches = devices.filter((d) => d.type === 'switch');

    if (clients.length < REQ.minClients) {
      issues.push(`Coloque pelo menos ${REQ.minClients} clientes (figuras de PC).`);
    } else {
      oks.push(`${clients.length} cliente(s) na topologia.`);
    }

    if (servers.length !== REQ.servers) {
      issues.push(
        servers.length === 0
          ? 'Coloque 1 servidor na área de montagem.'
          : 'Use exatamente 1 servidor neste exercício.'
      );
    } else {
      oks.push('Servidor presente.');
    }

    if (switches.length !== REQ.switches) {
      issues.push(
        switches.length === 0
          ? 'Coloque 1 switch no centro da rede.'
          : 'Use exatamente 1 switch.'
      );
    } else {
      oks.push('Switch presente.');
    }

    if (servers.length === 1 && switches.length === 1) {
      const sw = switches[0];
      const srv = servers[0];
      const swN = neighbors(sw.id);
      if (!swN.includes(srv.id)) {
        issues.push('Ligue o servidor ao switch (modo Ligar cabo).');
      } else {
        oks.push('Servidor ligado ao switch.');
      }

      clients.forEach((c) => {
        if (!neighbors(c.id).includes(sw.id)) {
          issues.push(`${c.label} precisa estar ligado ao switch.`);
        }
      });
      if (
        clients.length >= REQ.minClients &&
        clients.every((c) => neighbors(c.id).includes(sw.id))
      ) {
        oks.push('Todos os clientes ligados ao switch.');
      }
    }

    if (devices.length && links.length === 0) {
      issues.push('Ainda não há cabos. Use o modo Ligar cabo.');
    }

    const ok = issues.length === 0;

    if (showUi) {
      const panel = $('#validation-panel');
      const list = $('#validation-list');
      const summary = $('#validation-summary');
      if (panel) panel.classList.add('show');
      if (summary) {
        summary.className = 'val-summary ' + (ok ? 'ok' : 'err');
        summary.textContent = ok
          ? 'Rede cliente–servidor montada corretamente!'
          : `${issues.length} item(ns) para corrigir.`;
      }
      if (list) {
        list.innerHTML = [
          ...oks.map((m) => `<li class="ok">${esc(m)}</li>`),
          ...issues.map((m) => `<li class="err">${esc(m)}</li>`),
        ].join('');
      }
      showToast(
        ok ? 'Validação OK! Pode enviar o resultado.' : 'Ainda falta algo na montagem.',
        ok ? 'ok' : 'warn'
      );
    }

    if (ok) {
      passedOnce = true;
      persistSession();
      $('#success-banner')?.classList.add('show');
    }
    updateCounts();
    return ok;
  }

  function submitResult() {
    if (!runValidation(true)) {
      showToast('Monte e valide a rede antes de enviar.', 'warn');
      return;
    }
    try {
      R.markExerciseComplete(teamName, EXERCISE_ID, {
        score: 100,
        title: EXERCISE_TITLE,
        members: teamMembers,
        details: {
          clients: countByType('client'),
          server: countByType('server'),
          switch: countByType('switch'),
          links: links.length,
          labels: devices.map((d) => d.label),
        },
      });
      showToast('Resultado enviado ao painel do instrutor!', 'ok');
    } catch (err) {
      showToast('Falha ao gravar: ' + err.message, 'warn');
    }
    updateCounts();
  }

  function loadExample() {
    if (!confirm('Carregar um exemplo pronto? Isso substitui a montagem atual.')) return;
    const rect = getCanvasRect();
    const w = Math.max(rect.width, 400);
    const h = Math.max(rect.height, 360);
    const cx = w / 2;
    devices = [
      { id: 1, type: 'server', label: 'Servidor', x: cx, y: h * 0.2 },
      { id: 2, type: 'switch', label: 'Switch', x: cx, y: h * 0.48 },
      { id: 3, type: 'client', label: 'Cliente 1', x: w * 0.22, y: h * 0.78 },
      { id: 4, type: 'client', label: 'Cliente 2', x: cx, y: h * 0.82 },
      { id: 5, type: 'client', label: 'Cliente 3', x: w * 0.78, y: h * 0.78 },
    ];
    links = [
      { id: 10, a: 1, b: 2 },
      { id: 11, a: 3, b: 2 },
      { id: 12, a: 4, b: 2 },
      { id: 13, a: 5, b: 2 },
    ];
    nextId = 20;
    passedOnce = false;
    selectedId = null;
    connectFrom = null;
    persistSession();
    setMode('select');
    render();
    updateCounts();
    $('#validation-panel')?.classList.remove('show');
    $('#success-banner')?.classList.remove('show');
    showToast('Exemplo carregado. Ainda é preciso validar.', 'ok');
  }

  function resetAll() {
    if (!confirm('Apagar toda a montagem?')) return;
    devices = [];
    links = [];
    nextId = 1;
    passedOnce = false;
    selectedId = null;
    connectFrom = null;
    persistSession();
    setMode('select');
    render();
    updateCounts();
    $('#validation-panel')?.classList.remove('show');
    $('#success-banner')?.classList.remove('show');
    showToast('Área limpa.', 'ok');
  }

  function updateTeamUI() {
    const badge = $('#team-badge');
    if (badge) {
      badge.hidden = false;
      badge.innerHTML = `<strong>${esc(teamName)}</strong>${
        teamMembers ? ` · ${esc(teamMembers)}` : ''
      }`;
    }
  }

  function showToast(msg, type = 'ok') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
