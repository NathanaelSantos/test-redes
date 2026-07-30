/**
 * Questão 2 — Métodos de transmissão de dados
 * Bloco A: Simplex · Half-duplex · Full-duplex
 * Bloco B: Serial · Paralela
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q2';
  const EXERCISE_TITLE = 'Métodos de transmissão de dados';
  const SESSION_KEY = 'sft_q2_session';

  const DIR_TYPES = [
    {
      id: 'simplex',
      name: 'Simplex',
      color: '#f472b6',
      blurb: 'Só um sentido. Um envia, o outro só recebe — nunca inverte.',
      icon: '→',
    },
    {
      id: 'half',
      name: 'Half-duplex',
      color: '#fbbf24',
      blurb: 'Dois sentidos, mas um de cada vez. Envia ou recebe, não os dois ao mesmo tempo.',
      icon: '⇄',
    },
    {
      id: 'full',
      name: 'Full-duplex',
      color: '#34d399',
      blurb: 'Dois sentidos ao mesmo tempo. Envia e recebe simultaneamente.',
      icon: '⇆',
    },
  ];

  const FORM_TYPES = [
    {
      id: 'serial',
      name: 'Serial',
      color: '#22d3ee',
      blurb: 'Bits enviados um após o outro em um único caminho/canal.',
    },
    {
      id: 'parallel',
      name: 'Paralela',
      color: '#a78bfa',
      blurb: 'Vários bits enviados ao mesmo tempo em múltiplos fios/canais.',
    },
  ];

  const SCENARIOS_A = [
    {
      id: 'a1',
      text: 'Uma estação de rádio AM transmite a programação; os ouvintes só recebem o sinal, sem enviar dados de volta pelo mesmo canal de broadcast.',
      answer: 'simplex',
    },
    {
      id: 'a2',
      text: 'Dois técnicos usam walkie-talkies: enquanto um fala, o outro escuta; depois invertem. Não falam ao mesmo tempo no mesmo canal.',
      answer: 'half',
    },
    {
      id: 'a3',
      text: 'Em uma videochamada, a imagem e o áudio de ambos os lados fluem ao mesmo tempo pela conexão.',
      answer: 'full',
    },
    {
      id: 'a4',
      text: 'Um sensor de temperatura só envia leituras para o servidor; o sensor não recebe comandos por esse enlace.',
      answer: 'simplex',
    },
    {
      id: 'a5',
      text: 'Em um hub Ethernet antigo (half-duplex), as estações competem pelo meio: quando uma transmite, as outras aguardam.',
      answer: 'half',
    },
    {
      id: 'a6',
      text: 'Um switch moderno em full-duplex permite que o PC envie e receba quadros simultaneamente na porta.',
      answer: 'full',
    },
  ];

  const SCENARIOS_B = [
    {
      id: 'b1',
      text: 'USB 2.0 e as portas seriais RS-232 enviam os bits em sequência, um por vez, por um fio de dados principal.',
      answer: 'serial',
    },
    {
      id: 'b2',
      text: 'O cabo paralelo antigo da impressora levava 8 bits de dados de uma vez, cada bit em um fio separado.',
      answer: 'parallel',
    },
    {
      id: 'b3',
      text: 'Em redes Ethernet e fibra óptica, os bits trafegam sequencialmente no meio (transmissão serial).',
      answer: 'serial',
    },
    {
      id: 'b4',
      text: 'Dentro da placa-mãe, o barramento interno entre CPU e módulos pode mover vários bits em paralelo em um ciclo.',
      answer: 'parallel',
    },
  ];

  let teamName = '';
  let teamMembers = '';
  let answers = {};
  let blockPassed = { a: false, b: false };
  let allPassedOnce = false;
  let orderA = SCENARIOS_A.map((s) => s.id);
  let orderB = SCENARIOS_B.map((s) => s.id);

  const $ = (sel) => document.querySelector(sel);

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    ensureAnswers();
    renderDirCards();
    renderFormCards();
    renderListA();
    renderListB();
    bindEvents();
    updateTeamUI();
    updateProgress();
  }

  function loadTeam() {
    const team = R.requireCurrentTeam();
    if (!team) return false;
    teamName = team.name;
    teamMembers = team.members || '';
    return true;
  }

  function ensureAnswers() {
    [...SCENARIOS_A, ...SCENARIOS_B].forEach((s) => {
      if (answers[s.id] == null) answers[s.id] = '';
    });
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        orderA = shuffle(SCENARIOS_A.map((s) => s.id));
        orderB = shuffle(SCENARIOS_B.map((s) => s.id));
        return;
      }
      const s = JSON.parse(raw);
      answers = s.answers || {};
      blockPassed = s.blockPassed || { a: false, b: false };
      allPassedOnce = !!s.allPassedOnce;
      if (Array.isArray(s.orderA) && s.orderA.length === SCENARIOS_A.length) orderA = s.orderA;
      else orderA = shuffle(SCENARIOS_A.map((x) => x.id));
      if (Array.isArray(s.orderB) && s.orderB.length === SCENARIOS_B.length) orderB = s.orderB;
      else orderB = shuffle(SCENARIOS_B.map((x) => x.id));
    } catch {
      orderA = shuffle(SCENARIOS_A.map((s) => s.id));
      orderB = shuffle(SCENARIOS_B.map((s) => s.id));
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ answers, blockPassed, allPassedOnce, orderA, orderB })
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

  function findA(id) {
    return SCENARIOS_A.find((s) => s.id === id);
  }
  function findB(id) {
    return SCENARIOS_B.find((s) => s.id === id);
  }
  function dirMeta(id) {
    return DIR_TYPES.find((t) => t.id === id);
  }
  function formMeta(id) {
    return FORM_TYPES.find((t) => t.id === id);
  }

  function renderDirCards() {
    const el = $('#dir-types');
    if (!el) return;
    el.innerHTML = DIR_TYPES.map(
      (t) => `
      <article class="type-card" style="--tc:${t.color}">
        <div class="type-icon">${esc(t.icon)}</div>
        <div class="type-name">${esc(t.name)}</div>
        <p class="type-blurb">${esc(t.blurb)}</p>
      </article>`
    ).join('');
  }

  function renderFormCards() {
    const el = $('#form-types');
    if (!el) return;
    el.innerHTML = FORM_TYPES.map(
      (t) => `
      <article class="type-card wide" style="--tc:${t.color}">
        <div class="type-name">${esc(t.name)}</div>
        <p class="type-blurb">${esc(t.blurb)}</p>
      </article>`
    ).join('');
  }

  function renderScenarioList(containerId, order, findFn, types, typeKey) {
    const list = $(containerId);
    if (!list) return;
    list.innerHTML = order
      .map((id, idx) => {
        const s = findFn(id);
        if (!s) return '';
        const val = answers[s.id] || '';
        const btns = types
          .map(
            (t) =>
              `<button type="button" class="type-btn ${val === t.id ? 'selected' : ''}"
                data-sid="${esc(s.id)}" data-type="${esc(t.id)}" data-block="${typeKey}"
                style="--tc:${t.color}">${esc(t.name)}</button>`
          )
          .join('');
        return `
        <article class="sc-item" data-sid="${esc(s.id)}" id="sc-${esc(s.id)}">
          <div class="sc-num">${idx + 1}</div>
          <div class="sc-body">
            <p class="sc-text">${esc(s.text)}</p>
            <div class="type-btns">${btns}</div>
            <p class="sc-feedback" data-fb="${esc(s.id)}" hidden></p>
          </div>
        </article>`;
      })
      .join('');
  }

  function renderListA() {
    renderScenarioList('#list-a', orderA, findA, DIR_TYPES, 'a');
    setBadge('a', blockPassed.a);
  }

  function renderListB() {
    renderScenarioList('#list-b', orderB, findB, FORM_TYPES, 'b');
    setBadge('b', blockPassed.b);
  }

  function setBadge(block, ok) {
    const el = $(`#badge-${block}`);
    if (!el) return;
    el.textContent = ok ? 'Correto' : 'Pendente';
    el.className = 'block-badge ' + (ok ? 'ok' : 'wait');
    $(`#block-${block}`)?.classList.toggle('passed', !!ok);
  }

  function bindEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.type-btn');
      if (!btn || !btn.dataset.sid) return;
      const sid = btn.dataset.sid;
      const type = btn.dataset.type;
      const block = btn.dataset.block;
      answers[sid] = type;
      blockPassed[block] = false;
      allPassedOnce = false;
      const item = btn.closest('.sc-item');
      item?.querySelectorAll('.type-btn').forEach((b) => {
        b.classList.toggle('selected', b.dataset.type === type);
      });
      item?.classList.remove('ok', 'err');
      const fb = document.querySelector(`[data-fb="${sid}"]`);
      if (fb) {
        fb.hidden = true;
        fb.textContent = '';
      }
      setBadge(block, false);
      $('#success-banner')?.classList.remove('show');
      persistSession();
      updateProgress();
    });

    $('#btn-validate-a')?.addEventListener('click', () => validateBlock('a'));
    $('#btn-validate-b')?.addEventListener('click', () => validateBlock('b'));
    $('#btn-validate-all')?.addEventListener('click', validateAll);
    $('#btn-submit')?.addEventListener('click', submitResult);
    $('#btn-reset')?.addEventListener('click', resetAll);
  }

  function validateBlock(block, silent) {
    const scenarios = block === 'a' ? SCENARIOS_A : SCENARIOS_B;
    const metaFn = block === 'a' ? dirMeta : formMeta;
    let issues = 0;
    let okCount = 0;

    scenarios.forEach((s) => {
      const item = document.querySelector(`.sc-item[data-sid="${s.id}"]`);
      const fb = document.querySelector(`[data-fb="${s.id}"]`);
      const chosen = answers[s.id] || '';
      item?.classList.remove('ok', 'err');

      if (!chosen) {
        issues++;
        item?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.className = 'sc-feedback err';
          fb.textContent = 'Selecione uma opção.';
        }
        return;
      }

      if (chosen === s.answer) {
        okCount++;
        item?.classList.add('ok');
        if (fb) {
          fb.hidden = false;
          fb.className = 'sc-feedback ok';
          const m = metaFn(s.answer);
          fb.textContent = `Correto: ${m?.name || s.answer}.`;
        }
      } else {
        issues++;
        item?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.className = 'sc-feedback err';
          fb.textContent = `Incorreto. Releia a definição e o cenário.`;
        }
      }
    });

    const ok = issues === 0;
    blockPassed[block] = ok;
    persistSession();
    setBadge(block, ok);

    const res = $(`#result-${block}`);
    if (res) {
      res.hidden = false;
      res.className = 'block-result ' + (ok ? 'ok' : 'err');
      res.innerHTML = ok
        ? `<strong>✓ Bloco ${block.toUpperCase()} correto (${okCount}/${scenarios.length}).</strong>`
        : `<strong>✗ Bloco ${block.toUpperCase()}: ${okCount} acerto(s), ${issues} erro(s)/vazio(s).</strong>`;
    }

    updateProgress();
    if (!silent) {
      showToast(
        ok ? `Bloco ${block.toUpperCase()} validado!` : `Bloco ${block.toUpperCase()}: ainda há erros.`,
        ok ? 'ok' : 'warn'
      );
    }
    return ok;
  }

  function validateAll() {
    const a = validateBlock('a', true);
    const b = validateBlock('b', true);
    showToast(
      a && b ? 'Os 2 blocos estão corretos! Pode enviar.' : 'Ainda há erros em algum bloco.',
      a && b ? 'ok' : 'warn'
    );
    updateProgress();
  }

  function updateProgress() {
    const n = ['a', 'b'].filter((k) => blockPassed[k]).length;
    const pill = $('#progress-pill');
    if (pill) pill.textContent = `${n} / 2 blocos corretos`;
    const btn = $('#btn-submit');
    if (btn) btn.disabled = n < 2 && !allPassedOnce;
    $('#ready-note')?.classList.toggle('show', n === 2);
  }

  function resetAll() {
    if (!confirm('Limpar todas as respostas?')) return;
    answers = {};
    ensureAnswers();
    blockPassed = { a: false, b: false };
    allPassedOnce = false;
    orderA = shuffle(SCENARIOS_A.map((s) => s.id));
    orderB = shuffle(SCENARIOS_B.map((s) => s.id));
    persistSession();
    $('#success-banner')?.classList.remove('show');
    ['a', 'b'].forEach((k) => {
      const el = $(`#result-${k}`);
      if (el) {
        el.hidden = true;
        el.innerHTML = '';
      }
    });
    renderListA();
    renderListB();
    updateProgress();
    showToast('Tudo limpo.', 'ok');
  }

  function submitResult() {
    const a = validateBlock('a', true);
    const b = validateBlock('b', true);
    if (!a || !b) {
      showToast('Os 2 blocos precisam estar corretos para enviar.', 'warn');
      updateProgress();
      return;
    }

    allPassedOnce = true;
    persistSession();
    $('#success-banner')?.classList.add('show');

    try {
      R.markExerciseComplete(teamName, EXERCISE_ID, {
        score: 100,
        title: EXERCISE_TITLE,
        members: teamMembers,
        details: {
          blocks: {
            a: SCENARIOS_A.map((s) => ({ id: s.id, answer: s.answer })),
            b: SCENARIOS_B.map((s) => ({ id: s.id, answer: s.answer })),
          },
          counts: {
            simplex: SCENARIOS_A.filter((s) => s.answer === 'simplex').length,
            half: SCENARIOS_A.filter((s) => s.answer === 'half').length,
            full: SCENARIOS_A.filter((s) => s.answer === 'full').length,
            serial: SCENARIOS_B.filter((s) => s.answer === 'serial').length,
            parallel: SCENARIOS_B.filter((s) => s.answer === 'parallel').length,
          },
        },
      });
      showToast('Resultado enviado ao painel do instrutor!', 'ok');
    } catch (err) {
      showToast('Falha ao gravar: ' + err.message, 'warn');
    }
    updateProgress();
  }

  function updateTeamUI() {
    const badge = $('#team-badge');
    if (badge) {
      badge.hidden = false;
      badge.innerHTML = `<strong>${esc(teamName)}</strong>${
        teamMembers ? ` · ${esc(teamMembers)}` : ''
      }`;
    }
    if (allPassedOnce) $('#success-banner')?.classList.add('show');
  }

  function showToast(msg, type = 'ok') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), 3500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
