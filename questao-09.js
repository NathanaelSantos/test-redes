/**
 * Questão 9 — Duas redes com hosts, switch e roteadores interligados
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q9';
  const EXERCISE_TITLE = 'Duas redes interligadas por roteadores';
  const SESSION_KEY = 'sft_q9_session';

  const $ = (sel) => document.querySelector(sel);

  /** Requisitos do exercício */
  const REQ = {
    hostsPerLan: 5,
    switchesPerLan: 1,
    routers: 2,
    // redes sugeridas (validação aceita qualquer plano válido)
    suggested: {
      lanA: '192.168.1.0/24',
      lanB: '192.168.2.0/24',
      wan: '10.0.0.0/30',
    },
  };

  let teamName = '';
  let teamMembers = '';
  let passedOnce = false;
  let nextId = 1;
  let devices = []; // { id, type, label, x, y, ip, mask, gateway, ifaces[] }
  let links = []; // { id, a, b }
  let mode = 'select'; // select | connect | delete
  let connectFrom = null;
  let selectedId = null;
  let drag = null;

  // ---------- Session (topologia da questão; equipe vem do index) ----------
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

  function loadTeam() {
    const team = R.requireCurrentTeam();
    if (!team) return false;
    teamName = team.name;
    teamMembers = team.members || '';
    return true;
  }

  // ---------- Init ----------
  function init() {
    if (!loadTeam()) return;
    restoreSession();
    bindEvents();
    updateTeamUI();
    renderCanvas();
    renderProps();
    updateCounts();
    if (passedOnce) $('#success-banner')?.classList.add('show');
  }

  function bindEvents() {
    $$('.tool-add').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!teamName) return showToast('Cadastre a equipe no início do teste.', 'warn');
        addDevice(btn.dataset.type);
      });
    });

    $('#btn-mode-select')?.addEventListener('click', () => setMode('select'));
    $('#btn-mode-connect')?.addEventListener('click', () => setMode('connect'));
    $('#btn-mode-delete')?.addEventListener('click', () => setMode('delete'));
    $('#btn-validate')?.addEventListener('click', () => runValidation(true));
    $('#btn-reset')?.addEventListener('click', resetAll);
    $('#btn-example')?.addEventListener('click', loadExample);
    $('#btn-toggle-hint')?.addEventListener('click', () => {
      $('#hint-box')?.classList.toggle('open');
    });

    const canvas = $('#canvas');
    canvas?.addEventListener('mousedown', onCanvasDown);
    canvas?.addEventListener('mousemove', onCanvasMove);
    canvas?.addEventListener('mouseup', onCanvasUp);
    canvas?.addEventListener('mouseleave', onCanvasUp);
    canvas?.addEventListener('click', onCanvasClick);

    // touch drag
    canvas?.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        if (!t) return;
        const fake = { clientX: t.clientX, clientY: t.clientY, target: e.target, preventDefault: () => e.preventDefault() };
        onCanvasDown(fake);
      },
      { passive: false }
    );
    canvas?.addEventListener(
      'touchmove',
      (e) => {
        const t = e.touches[0];
        if (!t || !drag) return;
        e.preventDefault();
        onCanvasMove({ clientX: t.clientX, clientY: t.clientY });
      },
      { passive: false }
    );
    canvas?.addEventListener('touchend', onCanvasUp);

    $('#props-body')?.addEventListener('input', onPropsInput);
    $('#props-body')?.addEventListener('change', onPropsInput);
  }

  function $$(sel) {
    return Array.from(document.querySelectorAll(sel));
  }

  // ---------- Team (cadastrada no index) ----------
  function updateTeamUI() {
    const badge = $('#team-badge');
    const work = $('#work-area');
    if (teamName) {
      if (badge) {
        badge.hidden = false;
        badge.innerHTML = `<strong>${esc(teamName)}</strong>${teamMembers ? ` · ${esc(teamMembers)}` : ''}`;
      }
      if (work) work.hidden = false;
    } else {
      if (badge) badge.hidden = true;
      if (work) work.hidden = true;
    }
  }

  // ---------- Devices ----------
  function countByType(type) {
    return devices.filter((d) => d.type === type).length;
  }

  function addDevice(type) {
    const n = countByType(type) + 1;
    const labels = { host: 'PC', switch: 'SW', router: 'R' };
    const id = 'd' + nextId++;
    const canvas = $('#canvas');
    const w = canvas?.clientWidth || 800;
    const h = canvas?.clientHeight || 480;

    // espalha: hosts à esquerda/direita, switches centro, routers centro-baixo
    let x = 80 + Math.random() * (w - 160);
    let y = 60 + Math.random() * (h - 140);

    if (type === 'host') {
      const hosts = countByType('host');
      // primeiros 5 à esquerda (Rede A), próximos à direita (Rede B)
      if (hosts < 5) {
        x = 40 + (hosts % 5) * 70;
        y = 40 + Math.floor(hosts / 5) * 90;
      } else {
        x = w - 280 + ((hosts - 5) % 5) * 50;
        y = 40 + Math.floor((hosts - 5) / 5) * 90;
      }
    } else if (type === 'switch') {
      const sw = countByType('switch');
      x = sw === 0 ? w * 0.22 : w * 0.72;
      y = h * 0.45;
    } else if (type === 'router') {
      const rt = countByType('router');
      x = rt === 0 ? w * 0.28 : w * 0.62;
      y = h * 0.72;
    }

    const dev = {
      id,
      type,
      label: `${labels[type]}${n}`,
      x: Math.round(x),
      y: Math.round(y),
      ip: '',
      mask: type === 'host' ? '255.255.255.0' : '',
      gateway: '',
      ifaces:
        type === 'router'
          ? [
              { name: 'G0/0', ip: '', mask: '255.255.255.0', role: 'lan' },
              { name: 'G0/1', ip: '', mask: '255.255.255.252', role: 'wan' },
            ]
          : [],
    };
    devices.push(dev);
    selectedId = id;
    persistSession();
    renderCanvas();
    renderProps();
    updateCounts();
    showToast(`${dev.label} adicionado.`, 'ok');
  }

  function getDevice(id) {
    return devices.find((d) => d.id === id);
  }

  function removeDevice(id) {
    devices = devices.filter((d) => d.id !== id);
    links = links.filter((l) => l.a !== id && l.b !== id);
    if (selectedId === id) selectedId = null;
    if (connectFrom === id) connectFrom = null;
    persistSession();
    renderCanvas();
    renderProps();
    updateCounts();
  }

  function linkExists(a, b) {
    return links.some(
      (l) => (l.a === a && l.b === b) || (l.a === b && l.b === a)
    );
  }

  function addLink(a, b) {
    if (a === b) return;
    if (linkExists(a, b)) {
      showToast('Já existe cabo entre esses dispositivos.', 'warn');
      return;
    }
    // regras simples de cabo
    const da = getDevice(a);
    const db = getDevice(b);
    if (!da || !db) return;
    const okPair = isAllowedCable(da.type, db.type);
    if (!okPair) {
      showToast(`Cabo ${da.type}↔${db.type} não permitido neste exercício.`, 'err');
      return;
    }
    links.push({ id: 'l' + nextId++, a, b });
    persistSession();
    renderCanvas();
    updateCounts();
    showToast(`Ligado: ${da.label} — ${db.label}`, 'ok');
  }

  function isAllowedCable(t1, t2) {
    const pair = [t1, t2].sort().join('-');
    // host-switch, switch-router, router-router, switch-switch (não), host-router (não neste exercício)
    return (
      pair === 'host-switch' ||
      pair === 'router-switch' ||
      pair === 'router-router'
    );
  }

  function removeLinkAt(x, y) {
    // remove link se click próximo ao meio do cabo
    const hit = links.find((l) => {
      const da = getDevice(l.a);
      const db = getDevice(l.b);
      if (!da || !db) return false;
      const mx = (da.x + db.x) / 2 + 40;
      const my = (da.y + db.y) / 2 + 30;
      return Math.hypot(x - mx, y - my) < 14;
    });
    if (hit) {
      links = links.filter((l) => l.id !== hit.id);
      persistSession();
      renderCanvas();
      updateCounts();
      return true;
    }
    return false;
  }

  // ---------- Modes ----------
  function setMode(m) {
    mode = m;
    connectFrom = null;
    $$('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
    const canvas = $('#canvas');
    if (canvas) {
      canvas.classList.toggle('mode-connect', m === 'connect');
      canvas.classList.toggle('mode-delete', m === 'delete');
    }
    const hint = $('#mode-hint');
    if (hint) {
      const texts = {
        select: 'Clique para selecionar · arraste para mover',
        connect: 'Clique em dois dispositivos para ligar o cabo',
        delete: 'Clique em um dispositivo ou no meio do cabo para remover',
      };
      hint.textContent = texts[m] || '';
    }
  }

  // ---------- Canvas interaction ----------
  function canvasPoint(e) {
    const canvas = $('#canvas');
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function hitDevice(x, y) {
    // topmost: reverse order
    for (let i = devices.length - 1; i >= 0; i--) {
      const d = devices[i];
      if (x >= d.x && x <= d.x + 88 && y >= d.y && y <= d.y + 72) return d;
    }
    return null;
  }

  function onCanvasDown(e) {
    if (mode !== 'select') return;
    const p = canvasPoint(e);
    const d = hitDevice(p.x, p.y);
    if (d) {
      selectedId = d.id;
      drag = { id: d.id, ox: p.x - d.x, oy: p.y - d.y };
      renderCanvas();
      renderProps();
      e.preventDefault?.();
    }
  }

  function onCanvasMove(e) {
    if (!drag) return;
    const p = canvasPoint(e);
    const d = getDevice(drag.id);
    if (!d) return;
    const canvas = $('#canvas');
    d.x = Math.max(0, Math.min((canvas?.clientWidth || 800) - 90, p.x - drag.ox));
    d.y = Math.max(0, Math.min((canvas?.clientHeight || 480) - 80, p.y - drag.oy));
    renderCanvas();
  }

  function onCanvasUp() {
    if (drag) {
      drag = null;
      persistSession();
    }
  }

  function onCanvasClick(e) {
    const p = canvasPoint(e);
    const d = hitDevice(p.x, p.y);

    if (mode === 'delete') {
      if (d) {
        removeDevice(d.id);
        return;
      }
      if (removeLinkAt(p.x, p.y)) return;
      return;
    }

    if (mode === 'connect') {
      if (!d) return;
      if (!connectFrom) {
        connectFrom = d.id;
        renderCanvas();
        showToast(`Origem: ${d.label}. Clique no destino.`, 'ok');
        return;
      }
      if (connectFrom === d.id) {
        connectFrom = null;
        renderCanvas();
        return;
      }
      addLink(connectFrom, d.id);
      connectFrom = null;
      renderCanvas();
      return;
    }

    // select
    if (d) {
      selectedId = d.id;
      renderCanvas();
      renderProps();
    } else {
      selectedId = null;
      renderCanvas();
      renderProps();
    }
  }

  // ---------- Render ----------
  function iconFor(type) {
    if (type === 'host') return '💻';
    if (type === 'switch') return '🔀';
    if (type === 'router') return '📡';
    return '⬜';
  }

  function renderCanvas() {
    const canvas = $('#canvas');
    if (!canvas) return;

    // SVG links
    let svg = '<svg class="cables" xmlns="http://www.w3.org/2000/svg">';
    links.forEach((l) => {
      const da = getDevice(l.a);
      const db = getDevice(l.b);
      if (!da || !db) return;
      const x1 = da.x + 44;
      const y1 = da.y + 36;
      const x2 = db.x + 44;
      const y2 = db.y + 36;
      const isWan = da.type === 'router' && db.type === 'router';
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="cable ${isWan ? 'wan' : 'lan'}" />`;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      svg += `<circle cx="${mx}" cy="${my}" r="5" class="cable-mid ${isWan ? 'wan' : ''}" data-link="${l.id}" />`;
    });
    if (connectFrom) {
      const da = getDevice(connectFrom);
      if (da) {
        svg += `<circle cx="${da.x + 44}" cy="${da.y + 36}" r="10" class="connect-pulse" />`;
      }
    }
    svg += '</svg>';

    const nodes = devices
      .map((d) => {
        const sel = d.id === selectedId ? 'selected' : '';
        const from = d.id === connectFrom ? 'connect-from' : '';
        const ipLine =
          d.type === 'host' && d.ip
            ? `<div class="dev-ip">${esc(d.ip)}</div>`
            : d.type === 'router' && d.ifaces?.[0]?.ip
              ? `<div class="dev-ip">${esc(d.ifaces[0].ip)}</div>`
              : '';
        return `
        <div class="device ${d.type} ${sel} ${from}" data-id="${d.id}" style="left:${d.x}px;top:${d.y}px">
          <div class="dev-icon">${iconFor(d.type)}</div>
          <div class="dev-label">${esc(d.label)}</div>
          ${ipLine}
        </div>`;
      })
      .join('');

    canvas.innerHTML = svg + nodes;
  }

  function renderProps() {
    const box = $('#props-body');
    if (!box) return;
    const d = getDevice(selectedId);
    if (!d) {
      box.innerHTML = `<p class="muted">Selecione um dispositivo no canvas para configurar IP e interfaces.</p>`;
      return;
    }

    if (d.type === 'switch') {
      box.innerHTML = `
        <h4>${esc(d.label)} · Switch</h4>
        <p class="muted">Switch L2 — não precisa de IP neste exercício. Conecte os hosts e o roteador da mesma rede.</p>
        <label>Nome</label>
        <input type="text" data-prop="label" value="${esc(d.label)}" maxlength="20" />
      `;
      return;
    }

    if (d.type === 'host') {
      box.innerHTML = `
        <h4>${esc(d.label)} · Host</h4>
        <label>Nome</label>
        <input type="text" data-prop="label" value="${esc(d.label)}" maxlength="20" />
        <label>IP</label>
        <input type="text" data-prop="ip" value="${esc(d.ip)}" placeholder="192.168.1.10" spellcheck="false" />
        <label>Máscara</label>
        <input type="text" data-prop="mask" value="${esc(d.mask)}" placeholder="255.255.255.0" spellcheck="false" />
        <label>Gateway (IP do roteador na LAN)</label>
        <input type="text" data-prop="gateway" value="${esc(d.gateway)}" placeholder="192.168.1.1" spellcheck="false" />
      `;
      return;
    }

    // router
    const ifaces = d.ifaces || [];
    box.innerHTML = `
      <h4>${esc(d.label)} · Roteador</h4>
      <label>Nome</label>
      <input type="text" data-prop="label" value="${esc(d.label)}" maxlength="20" />
      ${ifaces
        .map(
          (iface, i) => `
        <div class="iface-block">
          <strong>${esc(iface.name)} <span class="role">(${iface.role === 'wan' ? 'WAN / ligação entre roteadores' : 'LAN'})</span></strong>
          <label>IP</label>
          <input type="text" data-iface="${i}" data-field="ip" value="${esc(iface.ip)}" placeholder="${iface.role === 'wan' ? '10.0.0.1' : '192.168.1.1'}" spellcheck="false" />
          <label>Máscara</label>
          <input type="text" data-iface="${i}" data-field="mask" value="${esc(iface.mask)}" spellcheck="false" />
        </div>`
        )
        .join('')}
      <p class="muted tip">G0/0 = rede local (hosts). G0/1 = enlace entre os dois roteadores.</p>
    `;
  }

  function onPropsInput(e) {
    const d = getDevice(selectedId);
    if (!d) return;
    const t = e.target;
    if (t.dataset.prop) {
      d[t.dataset.prop] = t.value.trim();
      if (t.dataset.prop === 'label') renderCanvas();
    }
    if (t.dataset.iface !== undefined) {
      const i = Number(t.dataset.iface);
      if (d.ifaces[i]) d.ifaces[i][t.dataset.field] = t.value.trim();
      if (t.dataset.field === 'ip') renderCanvas();
    }
    persistSession();
  }

  function updateCounts() {
    const hosts = countByType('host');
    const sw = countByType('switch');
    const rt = countByType('router');
    const set = (id, val, ok) => {
      const el = $(id);
      if (!el) return;
      el.textContent = String(val);
      el.classList.toggle('ok', !!ok);
      el.classList.toggle('bad', !ok && val > 0);
    };
    set('#cnt-hosts', hosts, hosts === 10);
    set('#cnt-sw', sw, sw === 2);
    set('#cnt-rt', rt, rt === 2);
    set('#cnt-links', links.length, links.length >= 12); // 5+5 host-sw + 2 sw-rt + 1 rt-rt = 13? 5+5+1+1+1=13
  }

  // ---------- Example topology ----------
  function loadExample() {
    if (!teamName) return showToast('Cadastre a equipe no início do teste.', 'warn');
    if (!confirm('Carregar topologia de exemplo? Substitui o desenho atual.')) return;

    devices = [];
    links = [];
    nextId = 1;

    const mk = (type, label, x, y, extra = {}) => {
      const id = 'd' + nextId++;
      const dev = {
        id,
        type,
        label,
        x,
        y,
        ip: '',
        mask: type === 'host' ? '255.255.255.0' : '',
        gateway: '',
        ifaces: [],
        ...extra,
      };
      devices.push(dev);
      return id;
    };

    // Rede A (esquerda)
    const swA = mk('switch', 'SW-A', 180, 220);
    const rA = mk('router', 'R1', 200, 360, {
      ifaces: [
        { name: 'G0/0', ip: '192.168.1.1', mask: '255.255.255.0', role: 'lan' },
        { name: 'G0/1', ip: '10.0.0.1', mask: '255.255.255.252', role: 'wan' },
      ],
    });
    const hostsA = [];
    for (let i = 0; i < 5; i++) {
      hostsA.push(
        mk('host', `PC-A${i + 1}`, 40 + i * 72, 60, {
          ip: `192.168.1.${10 + i}`,
          mask: '255.255.255.0',
          gateway: '192.168.1.1',
        })
      );
    }

    // Rede B (direita)
    const swB = mk('switch', 'SW-B', 620, 220);
    const rB = mk('router', 'R2', 600, 360, {
      ifaces: [
        { name: 'G0/0', ip: '192.168.2.1', mask: '255.255.255.0', role: 'lan' },
        { name: 'G0/1', ip: '10.0.0.2', mask: '255.255.255.252', role: 'wan' },
      ],
    });
    const hostsB = [];
    for (let i = 0; i < 5; i++) {
      hostsB.push(
        mk('host', `PC-B${i + 1}`, 500 + i * 72, 60, {
          ip: `192.168.2.${10 + i}`,
          mask: '255.255.255.0',
          gateway: '192.168.2.1',
        })
      );
    }

    const link = (a, b) => links.push({ id: 'l' + nextId++, a, b });
    hostsA.forEach((h) => link(h, swA));
    hostsB.forEach((h) => link(h, swB));
    link(swA, rA);
    link(swB, rB);
    link(rA, rB);

    selectedId = rA;
    persistSession();
    renderCanvas();
    renderProps();
    updateCounts();
    showToast('Exemplo carregado. Ainda é preciso validar.', 'ok');
  }

  function resetAll() {
    if (!confirm('Limpar toda a topologia?')) return;
    devices = [];
    links = [];
    selectedId = null;
    connectFrom = null;
    passedOnce = false;
    persistSession();
    renderCanvas();
    renderProps();
    updateCounts();
    $('#validation-panel')?.classList.remove('show');
    $('#success-banner')?.classList.remove('show');
    showToast('Topologia limpa.', 'ok');
  }

  // ---------- Graph helpers ----------
  function neighbors(id) {
    const out = [];
    links.forEach((l) => {
      if (l.a === id) out.push(l.b);
      if (l.b === id) out.push(l.a);
    });
    return out;
  }

  function connectedToType(id, type) {
    return neighbors(id)
      .map(getDevice)
      .filter((d) => d && d.type === type);
  }

  // ---------- Validation ----------
  function runValidation(showPanel) {
    const issues = [];
    const okItems = [];

    if (!teamName) {
      issues.push({ level: 'err', msg: 'Cadastre a equipe no início do teste (index).' });
      if (showPanel) renderValidation(issues, okItems, false);
      showToast('Cadastre a equipe no início do teste.', 'warn');
      return false;
    }

    const hosts = devices.filter((d) => d.type === 'host');
    const switches = devices.filter((d) => d.type === 'switch');
    const routers = devices.filter((d) => d.type === 'router');

    // Contagens
    if (hosts.length !== 10) {
      issues.push({
        level: 'err',
        msg: `Devem existir exatamente 10 hosts (5 por rede). Atual: ${hosts.length}.`,
      });
    } else okItems.push('10 hosts no desenho.');

    if (switches.length !== 2) {
      issues.push({
        level: 'err',
        msg: `Devem existir exatamente 2 switches (um por rede). Atual: ${switches.length}.`,
      });
    } else okItems.push('2 switches no desenho.');

    if (routers.length !== 2) {
      issues.push({
        level: 'err',
        msg: `Devem existir exatamente 2 roteadores. Atual: ${routers.length}.`,
      });
    } else okItems.push('2 roteadores no desenho.');

    // Enlace entre roteadores
    let wanLink = null;
    if (routers.length === 2) {
      const [r1, r2] = routers;
      if (linkExists(r1.id, r2.id)) {
        wanLink = { r1, r2 };
        okItems.push(`Roteadores ligados: ${r1.label} ↔ ${r2.label}.`);
      } else {
        issues.push({
          level: 'err',
          msg: 'Os dois roteadores precisam estar ligados entre si (cabo WAN) para interligar as redes.',
        });
      }
    }

    // Cada switch: 5 hosts + 1 router
    const lanGroups = [];

    switches.forEach((sw) => {
      const hostNs = connectedToType(sw.id, 'host');
      const routerNs = connectedToType(sw.id, 'router');

      if (hostNs.length !== 5) {
        issues.push({
          level: 'err',
          msg: `${sw.label}: deve ter exatamente 5 hosts conectados (tem ${hostNs.length}).`,
        });
      } else {
        okItems.push(`${sw.label}: 5 hosts conectados.`);
      }

      if (routerNs.length !== 1) {
        issues.push({
          level: 'err',
          msg: `${sw.label}: deve estar ligado a exatamente 1 roteador (tem ${routerNs.length}).`,
        });
      } else {
        okItems.push(`${sw.label}: ligado ao roteador ${routerNs[0].label}.`);
      }

      if (hostNs.length === 5 && routerNs.length === 1) {
        lanGroups.push({ switch: sw, hosts: hostNs, router: routerNs[0] });
      }
    });

    if (lanGroups.length === 2) {
      // switches não podem compartilhar o mesmo roteador
      if (lanGroups[0].router.id === lanGroups[1].router.id) {
        issues.push({
          level: 'err',
          msg: 'Cada rede precisa do seu próprio roteador (os dois switches estão no mesmo roteador).',
        });
      } else {
        okItems.push('Duas redes distintas (switch + 5 hosts + roteador cada).');
      }
    }

    // Hosts soltos (não no switch)
    hosts.forEach((h) => {
      const swN = connectedToType(h.id, 'switch');
      if (swN.length === 0) {
        issues.push({ level: 'err', msg: `${h.label}: host sem conexão a um switch.` });
      } else if (swN.length > 1) {
        issues.push({ level: 'err', msg: `${h.label}: host ligado a mais de um switch.` });
      }
      // host não pode ligar direto em router neste exercício
      if (connectedToType(h.id, 'router').length) {
        issues.push({
          level: 'err',
          msg: `${h.label}: ligue o host ao switch, não direto no roteador.`,
        });
      }
    });

    // IPs dos hosts e gateway
    const lanNets = [];

    lanGroups.forEach((g, idx) => {
      const r = g.router;
      const lanIface = (r.ifaces || []).find((i) => i.role === 'lan') || r.ifaces?.[0];
      if (!lanIface || !R.isValidIP(lanIface.ip) || !R.isValidIP(lanIface.mask)) {
        issues.push({
          level: 'err',
          msg: `${r.label}: configure IP e máscara da interface LAN (G0/0).`,
        });
        return;
      }
      const lanCidr = R.maskToCidr(lanIface.mask);
      if (lanCidr === null) {
        issues.push({ level: 'err', msg: `${r.label}: máscara LAN inválida.` });
        return;
      }
      const lanNet = R.networkOf(lanIface.ip, lanCidr);
      const lanBcast = R.broadcastOf(lanIface.ip, lanCidr);
      const gw = R.parseIP(lanIface.ip);

      if (gw === lanNet || gw === lanBcast) {
        issues.push({
          level: 'err',
          msg: `${r.label}: IP LAN não pode ser rede nem broadcast.`,
        });
      }

      lanNets.push({ router: r, net: lanNet, cidr: lanCidr, gw: lanIface.ip, mask: lanIface.mask });

      g.hosts.forEach((h) => {
        if (!R.isValidIP(h.ip)) {
          issues.push({ level: 'err', msg: `${h.label}: IP inválido ou vazio.` });
          return;
        }
        if (!R.isValidIP(h.mask)) {
          issues.push({ level: 'err', msg: `${h.label}: máscara inválida.` });
          return;
        }
        const hCidr = R.maskToCidr(h.mask);
        if (hCidr !== lanCidr) {
          issues.push({
            level: 'err',
            msg: `${h.label}: máscara deve ser igual à da LAN do ${r.label} (${lanIface.mask}).`,
          });
        }
        if (!R.sameSubnet(h.ip, lanIface.ip, lanCidr)) {
          issues.push({
            level: 'err',
            msg: `${h.label}: IP fora da rede do gateway ${lanIface.ip}/${lanCidr}.`,
          });
        }
        const hip = R.parseIP(h.ip);
        if (hip === lanNet || hip === lanBcast) {
          issues.push({
            level: 'err',
            msg: `${h.label}: IP não pode ser endereço de rede nem broadcast.`,
          });
        }
        if (hip === gw) {
          issues.push({
            level: 'err',
            msg: `${h.label}: IP igual ao do roteador (${lanIface.ip}).`,
          });
        }
        if (!R.isValidIP(h.gateway) || h.gateway !== lanIface.ip) {
          issues.push({
            level: 'err',
            msg: `${h.label}: gateway deve ser o IP LAN do ${r.label} (${lanIface.ip}).`,
          });
        } else {
          okItems.push(`${h.label}: IP e gateway OK na rede ${R.intToIP(lanNet)}/${lanCidr}.`);
        }
      });

      // IPs únicos na LAN
      const ips = g.hosts.map((h) => h.ip).filter(Boolean);
      ips.push(lanIface.ip);
      const set = new Set(ips);
      if (set.size !== ips.length) {
        issues.push({ level: 'err', msg: `Rede do ${r.label}: há IPs duplicados.` });
      }
    });

    // LANs devem ser redes diferentes
    if (lanNets.length === 2) {
      if (lanNets[0].net === lanNets[1].net && lanNets[0].cidr === lanNets[1].cidr) {
        issues.push({
          level: 'err',
          msg: 'As duas LANs estão na mesma rede. Use sub-redes diferentes (ex.: 192.168.1.0/24 e 192.168.2.0/24).',
        });
      } else {
        okItems.push(
          `LANs distintas: ${R.intToIP(lanNets[0].net)}/${lanNets[0].cidr} e ${R.intToIP(lanNets[1].net)}/${lanNets[1].cidr}.`
        );
      }
    }

    // WAN entre roteadores
    if (wanLink && routers.length === 2) {
      const wanIfaces = routers.map((r) => {
        const w = (r.ifaces || []).find((i) => i.role === 'wan') || r.ifaces?.[1];
        return { router: r, iface: w };
      });

      let wanOk = true;
      wanIfaces.forEach(({ router, iface }) => {
        if (!iface || !R.isValidIP(iface.ip) || !R.isValidIP(iface.mask)) {
          issues.push({
            level: 'err',
            msg: `${router.label}: configure IP e máscara da interface WAN (G0/1).`,
          });
          wanOk = false;
        }
      });

      if (wanOk) {
        const [a, b] = wanIfaces;
        const cA = R.maskToCidr(a.iface.mask);
        const cB = R.maskToCidr(b.iface.mask);
        if (cA === null || cB === null) {
          issues.push({ level: 'err', msg: 'Máscara WAN inválida.' });
        } else if (cA !== cB) {
          issues.push({ level: 'err', msg: 'As interfaces WAN dos roteadores devem ter a mesma máscara.' });
        } else if (!R.sameSubnet(a.iface.ip, b.iface.ip, cA)) {
          issues.push({
            level: 'err',
            msg: `IPs WAN ${a.iface.ip} e ${b.iface.ip} não estão na mesma rede. Use um enlace (ex.: 10.0.0.1 e 10.0.0.2 /30).`,
          });
        } else if (a.iface.ip === b.iface.ip) {
          issues.push({ level: 'err', msg: 'Os IPs WAN dos roteadores não podem ser iguais.' });
        } else {
          // WAN diferente das LANs
          const wanNet = R.networkOf(a.iface.ip, cA);
          const clash = lanNets.some((ln) => ln.net === wanNet && ln.cidr === cA);
          if (clash) {
            issues.push({
              level: 'err',
              msg: 'A rede WAN entre roteadores não pode ser a mesma de uma LAN.',
            });
          } else {
            okItems.push(
              `Enlace WAN OK: ${a.iface.ip} ↔ ${b.iface.ip} (${R.intToIP(wanNet)}/${cA}).`
            );
          }
        }

        // WAN IPs não podem ser rede/broadcast
        wanIfaces.forEach(({ router, iface }) => {
          const c = R.maskToCidr(iface.mask);
          if (c === null) return;
          const n = R.networkOf(iface.ip, c);
          const bc = R.broadcastOf(iface.ip, c);
          const ip = R.parseIP(iface.ip);
          if (ip === n || ip === bc) {
            issues.push({
              level: 'err',
              msg: `${router.label}: IP WAN não pode ser rede nem broadcast.`,
            });
          }
        });
      }
    }

    const errors = issues.filter((i) => i.level === 'err');
    const passed = errors.length === 0 && lanGroups.length === 2 && !!wanLink;

    if (showPanel) renderValidation(issues, okItems, passed);

    if (passed) {
      onPass(lanNets, wanLink);
    } else if (showPanel) {
      showToast(`${errors.length} erro(s). Corrija a topologia/IPs e valide de novo.`, 'err');
    }
    return passed;
  }

  function onPass(lanNets, wanLink) {
    passedOnce = true;
    persistSession();

    const details = {
      lans: lanNets.map((ln) => ({
        router: ln.router.label,
        network: `${R.intToIP(ln.net)}/${ln.cidr}`,
        gateway: ln.gw,
      })),
      link: wanLink
        ? `${wanLink.r1.label} ↔ ${wanLink.r2.label}`
        : '',
      devices: {
        hosts: countByType('host'),
        switches: countByType('switch'),
        routers: countByType('router'),
        links: links.length,
      },
    };

    try {
      R.markExerciseComplete(teamName, EXERCISE_ID, {
        score: 100,
        title: EXERCISE_TITLE,
        members: teamMembers,
        details,
      });
    } catch (ex) {
      showToast(ex.message, 'err');
      return;
    }

    $('#success-banner')?.classList.add('show');
    showToast('Exercício concluído! Registrado no painel do instrutor.', 'ok');
  }

  function renderValidation(issues, okItems, passed) {
    const panel = $('#validation-panel');
    const list = $('#validation-list');
    const summary = $('#validation-summary');
    if (!panel || !list) return;
    panel.classList.add('show');

    if (summary) {
      if (passed) {
        summary.className = 'val-summary ok';
        summary.textContent = '✓ Validação aprovada — as duas redes estão corretas e interligadas.';
      } else {
        const n = issues.filter((i) => i.level === 'err').length;
        summary.className = 'val-summary err';
        summary.textContent = `✗ ${n} erro(s) — corrija e valide novamente.`;
      }
    }

    const parts = issues.map((i) => `<div class="val-item ${i.level}">${esc(i.msg)}</div>`);
    if (passed) {
      okItems.forEach((m) => parts.push(`<div class="val-item ok">${esc(m)}</div>`));
    }
    list.innerHTML = parts.join('') || '<div class="val-item">Nenhum item.</div>';
  }

  function showToast(msg, type) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.className = `toast show ${type || ''}`;
    t.textContent = msg;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => t.classList.remove('show'), 4000);
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
