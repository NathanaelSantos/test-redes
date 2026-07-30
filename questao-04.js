/**
 * Questão 4 — Comunicação nas 7 camadas OSI (fluxo em U)
 * Emissor (descida) → meio físico → Receptor (subida)
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q4';
  const EXERCISE_TITLE = 'Comunicação nas 7 camadas OSI';
  const SESSION_KEY = 'sft_q4_session';

  /** Índice 0 = topo (Aplicação / 7) … índice 6 = base (Física / 1) */
  const LAYERS = [
    { id: 'app', num: 7, name: 'Aplicação', pdu: 'Dados', color: '#f472b6', hint: 'HTTP, DNS, e-mail…' },
    { id: 'pres', num: 6, name: 'Apresentação', pdu: 'Dados', color: '#c084fc', hint: 'Criptografia, formato' },
    { id: 'sess', num: 5, name: 'Sessão', pdu: 'Dados', color: '#a78bfa', hint: 'Controle de diálogo' },
    { id: 'trans', num: 4, name: 'Transporte', pdu: 'Segmento', color: '#60a5fa', hint: 'TCP / UDP' },
    { id: 'net', num: 3, name: 'Rede', pdu: 'Pacote', color: '#22d3ee', hint: 'IP, roteamento' },
    { id: 'link', num: 2, name: 'Enlace', pdu: 'Quadro', color: '#34d399', hint: 'MAC, Ethernet' },
    { id: 'phy', num: 1, name: 'Física', pdu: 'Bits', color: '#fbbf24', hint: 'Cabo, sinal, bits' },
  ];

  const CORRECT_ORDER = LAYERS.map((l) => l.id);
  const LAYER_BY_ID = Object.fromEntries(LAYERS.map((l) => [l.id, l]));

  let teamName = '';
  let teamMembers = '';
  /** @type {(string|null)[]} */
  let emitter = Array(7).fill(null);
  /** @type {(string|null)[]} */
  let receptor = Array(7).fill(null);
  /** ordem visual da banca (só embaralha a exibição) */
  let paletteOrder = CORRECT_ORDER.slice();
  let selectedLayerId = null;
  let passedOnce = false;
  let flowOk = false;
  let animating = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    if (paletteOrder.length !== 7) paletteOrder = shuffle(CORRECT_ORDER.slice());
    renderAll();
    bindEvents();
    updateTeamUI();
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
      if (!raw) {
        paletteOrder = shuffle(CORRECT_ORDER.slice());
        return;
      }
      const s = JSON.parse(raw);
      if (Array.isArray(s.emitter) && s.emitter.length === 7) {
        emitter = s.emitter.map((x) => (LAYER_BY_ID[x] ? x : null));
      }
      if (Array.isArray(s.receptor) && s.receptor.length === 7) {
        receptor = s.receptor.map((x) => (LAYER_BY_ID[x] ? x : null));
      }
      if (Array.isArray(s.paletteOrder) && s.paletteOrder.length === 7) {
        paletteOrder = s.paletteOrder.filter((id) => LAYER_BY_ID[id]);
      } else if (Array.isArray(s.pool) && s.pool.length) {
        paletteOrder = s.pool.filter((id) => LAYER_BY_ID[id]);
      }
      if (paletteOrder.length !== 7) paletteOrder = shuffle(CORRECT_ORDER.slice());
      passedOnce = !!s.passedOnce;
      flowOk = !!s.flowOk && orderCorrect(emitter) && orderCorrect(receptor);
    } catch {
      paletteOrder = shuffle(CORRECT_ORDER.slice());
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ emitter, receptor, paletteOrder, passedOnce, flowOk })
    );
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function orderCorrect(arr) {
    return CORRECT_ORDER.every((id, i) => arr[i] === id);
  }

  function stacksComplete() {
    return emitter.every(Boolean) && receptor.every(Boolean);
  }

  function layerChipHtml(id, opts = {}) {
    const L = LAYER_BY_ID[id];
    if (!L) return '';
    const cls = [
      'layer-chip',
      opts.compact ? 'compact' : '',
      opts.selected ? 'selected' : '',
      opts.inSlot ? 'in-slot' : '',
    ]
      .filter(Boolean)
      .join(' ');
    return `
      <button type="button" class="${cls}" data-layer="${esc(id)}" style="--lc:${L.color}"
        draggable="true" title="${esc(L.hint)}">
        <span class="lc-num">${L.num}</span>
        <span class="lc-body">
          <strong>${esc(L.name)}</strong>
          <em>${esc(L.pdu)}</em>
        </span>
      </button>`;
  }

  function renderAll() {
    renderStack('emitter', emitter);
    renderStack('receptor', receptor);
    renderPalette();
    updateStatusBar();
    updateSubmitState();
    if (passedOnce) $('#success-banner')?.classList.add('show');
  }

  function renderStack(side, slots) {
    const el = $(`#stack-${side}`);
    if (!el) return;
    el.innerHTML = slots
      .map((id, i) => {
        const posLabel =
          i === 0 ? 'topo · camada 7' : i === 6 ? 'base · camada 1' : `camada ${7 - i}`;
        const filled = id ? layerChipHtml(id, { inSlot: true, compact: true }) : '';
        return `
        <div class="slot" data-side="${side}" data-index="${i}">
          <div class="slot-meta">
            <span class="slot-idx">${7 - i}</span>
            <span class="slot-pos">${esc(posLabel)}</span>
          </div>
          <div class="slot-drop" data-side="${side}" data-index="${i}">
            ${filled || '<span class="slot-placeholder">Clique na banca e depois aqui · ou arraste</span>'}
          </div>
        </div>`;
      })
      .join('');
  }

  function renderPalette() {
    const el = $('#layer-pool');
    if (!el) return;
    el.innerHTML = paletteOrder
      .map((id) => layerChipHtml(id, { selected: selectedLayerId === id }))
      .join('');
  }

  function updateStatusBar() {
    const eDone = emitter.filter(Boolean).length;
    const rDone = receptor.filter(Boolean).length;
    const fill = $('#fill-status');
    if (fill) fill.textContent = `Emissor ${eDone}/7 · Receptor ${rDone}/7`;

    const flow = $('#flow-status');
    if (flow) {
      if (passedOnce || flowOk) {
        flow.textContent = 'Fluxo OK — pacote chegou à Aplicação do receptor';
        flow.className = 'flow-status ok';
      } else {
        flow.textContent = 'Monte as pilhas e teste o fluxo em U';
        flow.className = 'flow-status';
      }
    }
  }

  function updateSubmitState() {
    const btn = $('#btn-submit');
    if (!btn) return;
    btn.disabled = !(flowOk || passedOnce) || animating;
  }

  function bindEvents() {
    $('#layer-pool')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.layer-chip');
      if (!chip || animating) return;
      const id = chip.dataset.layer;
      selectedLayerId = selectedLayerId === id ? null : id;
      renderPalette();
    });

    document.addEventListener('click', (e) => {
      if (animating) return;

      const chipInSlot = e.target.closest('.slot-drop .layer-chip');
      if (chipInSlot) {
        const drop = chipInSlot.closest('.slot-drop');
        removeFromSlot(drop.dataset.side, Number(drop.dataset.index));
        return;
      }

      const drop = e.target.closest('.slot-drop');
      if (drop && selectedLayerId) {
        placeInSlot(drop.dataset.side, Number(drop.dataset.index), selectedLayerId);
        selectedLayerId = null;
        renderPalette();
      }
    });

    document.addEventListener('dragstart', (e) => {
      const chip = e.target.closest('.layer-chip');
      if (!chip || animating) return;
      const id = chip.dataset.layer;
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      chip.classList.add('dragging');
      const drop = chip.closest('.slot-drop');
      if (drop) {
        e.dataTransfer.setData(
          'application/x-slot',
          JSON.stringify({ side: drop.dataset.side, index: Number(drop.dataset.index) })
        );
      }
    });

    document.addEventListener('dragend', (e) => {
      e.target.closest?.('.layer-chip')?.classList.remove('dragging');
      $$('.slot-drop').forEach((d) => d.classList.remove('drag-over'));
    });

    document.addEventListener('dragover', (e) => {
      const drop = e.target.closest('.slot-drop');
      if (!drop || animating) return;
      e.preventDefault();
      drop.classList.add('drag-over');
    });

    document.addEventListener('dragleave', (e) => {
      const drop = e.target.closest('.slot-drop');
      if (drop && !drop.contains(e.relatedTarget)) drop.classList.remove('drag-over');
    });

    document.addEventListener('drop', (e) => {
      const drop = e.target.closest('.slot-drop');
      if (!drop || animating) return;
      e.preventDefault();
      drop.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      if (!LAYER_BY_ID[id]) return;

      let fromSlot = null;
      try {
        const raw = e.dataTransfer.getData('application/x-slot');
        if (raw) fromSlot = JSON.parse(raw);
      } catch {
        /* ignore */
      }

      const side = drop.dataset.side;
      const index = Number(drop.dataset.index);
      const arrTo = side === 'emitter' ? emitter : receptor;

      if (fromSlot) {
        const arrFrom = fromSlot.side === 'emitter' ? emitter : receptor;
        if (fromSlot.side === side && fromSlot.index === index) return;
        const displaced = arrTo[index];
        arrTo[index] = id;
        arrFrom[fromSlot.index] = displaced || null;
        // se o id já existia noutro slot do destino, limpa
        for (let i = 0; i < arrTo.length; i++) {
          if (i !== index && arrTo[i] === id) arrTo[i] = null;
        }
      } else {
        placeInSlot(side, index, id);
        return;
      }

      flowOk = false;
      selectedLayerId = null;
      persistSession();
      renderAll();
      clearFlowVisual();
    });

    $('#btn-test-flow')?.addEventListener('click', () => testFlow());
    $('#btn-submit')?.addEventListener('click', () => submitResult());
    $('#btn-reset')?.addEventListener('click', resetAll);
    $('#btn-shuffle')?.addEventListener('click', () => {
      if (animating) return;
      paletteOrder = shuffle(CORRECT_ORDER.slice());
      selectedLayerId = null;
      persistSession();
      renderPalette();
      showToast('Banca reembaralhada.', 'ok');
    });
    $('#btn-hint-order')?.addEventListener('click', () => {
      showToast(
        'Cima → baixo: 7 Aplicação · 6 Apresentação · 5 Sessão · 4 Transporte · 3 Rede · 2 Enlace · 1 Física. As duas pilhas usam a mesma ordem.',
        'ok'
      );
    });
  }

  function placeInSlot(side, index, id) {
    if (!LAYER_BY_ID[id]) return;
    const arr = side === 'emitter' ? emitter : receptor;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === id && i !== index) arr[i] = null;
    }
    arr[index] = id;
    flowOk = false;
    persistSession();
    renderAll();
    clearFlowVisual();
  }

  function removeFromSlot(side, index) {
    const arr = side === 'emitter' ? emitter : receptor;
    if (!arr[index]) return;
    arr[index] = null;
    flowOk = false;
    persistSession();
    renderAll();
    clearFlowVisual();
  }

  function resetAll() {
    if (!confirm('Limpar as duas pilhas e recomeçar?')) return;
    emitter = Array(7).fill(null);
    receptor = Array(7).fill(null);
    paletteOrder = shuffle(CORRECT_ORDER.slice());
    selectedLayerId = null;
    flowOk = false;
    passedOnce = false;
    persistSession();
    clearFlowVisual();
    $('#success-banner')?.classList.remove('show');
    const list = $('#log-list');
    if (list) list.innerHTML = '';
    $('#flow-log')?.classList.remove('show');
    renderAll();
    showToast('Tudo limpo.', 'ok');
  }

  function clearFlowVisual() {
    $$('.slot').forEach((s) => s.classList.remove('active', 'ok', 'err', 'done'));
    const pkt = $('#packet');
    if (pkt) {
      pkt.classList.remove('show', 'fail', 'success');
      pkt.style.transition = 'none';
      pkt.style.left = '';
      pkt.style.top = '';
      pkt.style.opacity = '0';
    }
    $('#medium-path')?.classList.remove('active', 'ok', 'err');
  }

  function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function logStep(msg, type = 'info') {
    const list = $('#log-list');
    const panel = $('#flow-log');
    if (!list || !panel) return;
    panel.classList.add('show');
    const li = document.createElement('li');
    li.className = 'log-' + type;
    li.textContent = msg;
    list.appendChild(li);
    list.scrollTop = list.scrollHeight;
  }

  async function testFlow() {
    if (animating) return;

    clearFlowVisual();
    const list = $('#log-list');
    if (list) list.innerHTML = '';
    $('#flow-log')?.classList.add('show');

    if (!stacksComplete()) {
      showToast('Preencha as 7 camadas no emissor e no receptor.', 'warn');
      logStep('Falha: pilhas incompletas.', 'err');
      return;
    }

    animating = true;
    flowOk = false;
    updateSubmitState();
    if ($('#btn-test-flow')) $('#btn-test-flow').disabled = true;

    logStep('Início: dados na Aplicação do emissor.', 'info');

    // Descida no emissor (0 → 6)
    for (let i = 0; i < 7; i++) {
      const ok = emitter[i] === CORRECT_ORDER[i];
      const slot = document.querySelector(`.slot[data-side="emitter"][data-index="${i}"]`);
      const L = LAYER_BY_ID[emitter[i]];
      const expected = LAYER_BY_ID[CORRECT_ORDER[i]];

      slot?.classList.add('active');
      await movePacketToSlot('emitter', i);
      await sleep(360);

      if (!ok) {
        slot?.classList.add('err');
        slot?.classList.remove('active');
        $('#packet')?.classList.add('fail');
        logStep(
          `Emissor · pos. ${7 - i}: esperava ${expected.name} (${expected.num}), encontrou ${L?.name || '?'} (${L?.num || '?'}). Pacote descartado.`,
          'err'
        );
        showToast('Fluxo interrompido no emissor. Corrija a ordem.', 'warn');
        finishAnim();
        return;
      }

      slot?.classList.remove('active');
      slot?.classList.add('ok', 'done');
      logStep(`Emissor ↓ ${L.name} (${L.num}) · PDU: ${L.pdu}`, 'ok');
      await sleep(140);
    }

    // Meio físico
    $('#medium-path')?.classList.add('active');
    logStep('Meio físico: bits trafegam do emissor ao receptor…', 'info');
    await movePacketAcrossMedium();
    await sleep(180);
    $('#medium-path')?.classList.remove('active');
    $('#medium-path')?.classList.add('ok');

    // Subida no receptor (6 → 0)
    for (let i = 6; i >= 0; i--) {
      const ok = receptor[i] === CORRECT_ORDER[i];
      const slot = document.querySelector(`.slot[data-side="receptor"][data-index="${i}"]`);
      const L = LAYER_BY_ID[receptor[i]];
      const expected = LAYER_BY_ID[CORRECT_ORDER[i]];

      slot?.classList.add('active');
      await movePacketToSlot('receptor', i);
      await sleep(360);

      if (!ok) {
        slot?.classList.add('err');
        slot?.classList.remove('active');
        $('#packet')?.classList.add('fail');
        logStep(
          `Receptor · pos. ${7 - i}: esperava ${expected.name} (${expected.num}), encontrou ${L?.name || '?'}. Mensagem não chega.`,
          'err'
        );
        showToast('Fluxo interrompido no receptor. Corrija a ordem.', 'warn');
        finishAnim();
        return;
      }

      slot?.classList.remove('active');
      slot?.classList.add('ok', 'done');
      logStep(`Receptor ↑ ${L.name} (${L.num}) · PDU: ${L.pdu}`, 'ok');
      await sleep(140);
    }

    $('#packet')?.classList.add('success');
    flowOk = true;
    logStep('Sucesso: pacote chegou à Aplicação do receptor (fluxo em U completo).', 'ok');
    showToast('Fluxo correto! Agora envie o resultado.', 'ok');
    updateStatusBar();
    updateSubmitState();
    finishAnim();
    persistSession();
  }

  function finishAnim() {
    animating = false;
    if ($('#btn-test-flow')) $('#btn-test-flow').disabled = false;
    updateSubmitState();
  }

  function getSlotCenter(side, index) {
    const drop = document.querySelector(`.slot-drop[data-side="${side}"][data-index="${index}"]`);
    const stage = $('#u-stage');
    if (!drop || !stage) return { x: 40, y: 40 };
    const dr = drop.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return {
      x: dr.left - sr.left + dr.width / 2,
      y: dr.top - sr.top + dr.height / 2,
    };
  }

  function getMediumPoints() {
    const path = $('#medium-path');
    const stage = $('#u-stage');
    if (!path || !stage) return { x1: 40, y: 0, x2: 200 };
    const pr = path.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    return {
      x1: pr.left - sr.left + 16,
      x2: pr.right - sr.left - 16,
      y: pr.top - sr.top + pr.height / 2,
    };
  }

  async function movePacketToSlot(side, index) {
    const pkt = $('#packet');
    if (!pkt) return;
    const { x, y } = getSlotCenter(side, index);
    pkt.classList.add('show');
    pkt.classList.remove('fail', 'success');
    pkt.style.transition = 'left 0.3s ease, top 0.3s ease, opacity 0.15s';
    pkt.style.left = x + 'px';
    pkt.style.top = y + 'px';
    pkt.style.opacity = '1';
    await sleep(320);
  }

  async function movePacketAcrossMedium() {
    const pkt = $('#packet');
    if (!pkt) return;
    const m = getMediumPoints();
    pkt.style.transition = 'left 0.22s ease, top 0.22s ease';
    pkt.style.left = m.x1 + 'px';
    pkt.style.top = m.y + 'px';
    await sleep(240);
    pkt.style.transition = 'left 0.65s ease';
    pkt.style.left = m.x2 + 'px';
    await sleep(680);
  }

  function submitResult() {
    if (animating) return;
    if (!flowOk && !passedOnce) {
      showToast('Teste o fluxo com sucesso antes de enviar.', 'warn');
      return;
    }
    if (!orderCorrect(emitter) || !orderCorrect(receptor)) {
      showToast('As pilhas não estão na ordem OSI. Corrija e teste de novo.', 'warn');
      flowOk = false;
      updateSubmitState();
      return;
    }

    passedOnce = true;
    flowOk = true;
    persistSession();
    $('#success-banner')?.classList.add('show');

    try {
      R.markExerciseComplete(teamName, EXERCISE_ID, {
        score: 100,
        title: EXERCISE_TITLE,
        members: teamMembers,
        details: {
          emitter: emitter.map((id) => LAYER_BY_ID[id]?.name),
          receptor: receptor.map((id) => LAYER_BY_ID[id]?.name),
          flow: 'U-shape OK',
        },
      });
      showToast('Resultado enviado! Consta no painel do instrutor.', 'ok');
    } catch (err) {
      showToast('Falha ao gravar no painel: ' + err.message, 'warn');
    }
    updateSubmitState();
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
    showToast._t = setTimeout(() => el.classList.remove('show'), 4000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
