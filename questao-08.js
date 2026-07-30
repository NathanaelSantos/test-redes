/**
 * Questão 8 — Tipos de rede por abrangência (PAN, LAN, MAN, WAN)
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q8';
  const EXERCISE_TITLE = 'Tipos de rede por abrangência (PAN, LAN, MAN, WAN)';
  const SESSION_KEY = 'sft_q8_session';

  const TYPES = [
    {
      id: 'PAN',
      name: 'PAN',
      full: 'Personal Area Network',
      range: 'Alguns metros (corpo / mesa)',
      color: '#f472b6',
      blurb: 'Rede pessoal: Bluetooth, smartwatch, fones, periféricos muito próximos.',
    },
    {
      id: 'LAN',
      name: 'LAN',
      full: 'Local Area Network',
      range: 'Sala, andar, prédio',
      color: '#22d3ee',
      blurb: 'Rede local: casa, escritório, laboratório, escola no mesmo prédio.',
    },
    {
      id: 'MAN',
      name: 'MAN',
      full: 'Metropolitan Area Network',
      range: 'Cidade / região metropolitana',
      color: '#a78bfa',
      blurb: 'Rede metropolitana: campus universitário grande, rede da prefeitura na cidade.',
    },
    {
      id: 'WAN',
      name: 'WAN',
      full: 'Wide Area Network',
      range: 'Estados, países, continente',
      color: '#fbbf24',
      blurb: 'Rede de longa distância: internet, filiais em cidades diferentes, backbone.',
    },
  ];

  /** Cenários embaralhados na exibição, ordem fixa por id para validação */
  const SCENARIOS = [
    {
      id: 's1',
      text: 'Um usuário conecta o fone sem fio e o smartwatch ao celular via Bluetooth enquanto caminha.',
      answer: 'PAN',
    },
    {
      id: 's2',
      text: 'Todos os computadores de um escritório no mesmo andar compartilham impressora e arquivo em um switch.',
      answer: 'LAN',
    },
    {
      id: 's3',
      text: 'A prefeitura interliga secretarias em vários bairros da mesma cidade com fibra óptica municipal.',
      answer: 'MAN',
    },
    {
      id: 's4',
      text: 'Uma multinacional conecta filiais em São Paulo, Lisboa e Tóquio por enlaces de operadora.',
      answer: 'WAN',
    },
    {
      id: 's5',
      text: 'Teclado e mouse sem fio se comunicam com o notebook sobre a mesa, a poucos metros.',
      answer: 'PAN',
    },
    {
      id: 's6',
      text: 'O laboratório de informática da escola usa Wi-Fi e cabos Ethernet só dentro do prédio.',
      answer: 'LAN',
    },
    {
      id: 's7',
      text: 'Uma universidade liga três campi em bairros diferentes da mesma metrópole em uma rede própria.',
      answer: 'MAN',
    },
    {
      id: 's8',
      text: 'Você acessa um site hospedado em outro continente usando a Internet.',
      answer: 'WAN',
    },
  ];

  let teamName = '';
  let teamMembers = '';
  /** answers[scenarioId] = 'PAN'|'LAN'|'MAN'|'WAN'|'' */
  let answers = {};
  let passedOnce = false;
  /** ordem de exibição dos cenários (embaralhada uma vez) */
  let displayOrder = SCENARIOS.map((s) => s.id);

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    ensureAnswers();
    renderTypes();
    renderScenarios();
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
    SCENARIOS.forEach((s) => {
      if (answers[s.id] == null) answers[s.id] = '';
    });
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) {
        displayOrder = shuffle(SCENARIOS.map((s) => s.id));
        return;
      }
      const s = JSON.parse(raw);
      answers = s.answers || {};
      passedOnce = !!s.passedOnce;
      if (Array.isArray(s.displayOrder) && s.displayOrder.length === SCENARIOS.length) {
        displayOrder = s.displayOrder;
      } else {
        displayOrder = shuffle(SCENARIOS.map((x) => x.id));
      }
    } catch {
      displayOrder = shuffle(SCENARIOS.map((s) => s.id));
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ answers, passedOnce, displayOrder })
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

  function byId(id) {
    return SCENARIOS.find((s) => s.id === id);
  }

  function typeMeta(id) {
    return TYPES.find((t) => t.id === id);
  }

  function renderTypes() {
    const el = $('#types-grid');
    if (!el) return;
    el.innerHTML = TYPES.map(
      (t) => `
      <article class="type-card" style="--tc:${t.color}">
        <div class="type-name">${esc(t.name)}</div>
        <div class="type-full">${esc(t.full)}</div>
        <div class="type-range">${esc(t.range)}</div>
        <p class="type-blurb">${esc(t.blurb)}</p>
      </article>`
    ).join('');
  }

  function renderScenarios() {
    const list = $('#scenarios-list');
    if (!list) return;
    list.innerHTML = displayOrder
      .map((id, idx) => {
        const s = byId(id);
        if (!s) return '';
        const val = answers[s.id] || '';
        const options = TYPES.map(
          (t) =>
            `<button type="button" class="type-btn ${val === t.id ? 'selected' : ''}"
              data-sid="${esc(s.id)}" data-type="${t.id}" style="--tc:${t.color}">
              ${esc(t.name)}
            </button>`
        ).join('');
        return `
        <article class="sc-item" data-sid="${esc(s.id)}" id="sc-${esc(s.id)}">
          <div class="sc-num">${idx + 1}</div>
          <div class="sc-body">
            <p class="sc-text">${esc(s.text)}</p>
            <div class="type-btns" role="group" aria-label="Tipo de rede">
              ${options}
            </div>
            <p class="sc-feedback" data-fb="${esc(s.id)}" hidden></p>
          </div>
        </article>`;
      })
      .join('');
  }

  function bindEvents() {
    $('#scenarios-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.type-btn');
      if (!btn) return;
      const sid = btn.dataset.sid;
      const type = btn.dataset.type;
      answers[sid] = type;
      passedOnce = false;
      // update selected state in this group
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
      $('#success-banner')?.classList.remove('show');
      persistSession();
      updateProgress();
    });

    $('#btn-validate')?.addEventListener('click', () => runValidation(false));
    $('#btn-submit')?.addEventListener('click', () => submitResult());
    $('#btn-reset')?.addEventListener('click', resetAll);
    $('#btn-reshuffle')?.addEventListener('click', () => {
      if (!confirm('Reembaralhar a ordem dos cenários? As respostas preenchidas são mantidas.')) return;
      displayOrder = shuffle(SCENARIOS.map((s) => s.id));
      persistSession();
      renderScenarios();
      updateProgress();
      showToast('Ordem dos cenários reembaralhada.', 'ok');
    });
  }

  function countFilled() {
    return SCENARIOS.filter((s) => answers[s.id]).length;
  }

  function countCorrect() {
    return SCENARIOS.filter((s) => answers[s.id] === s.answer).length;
  }

  function updateProgress() {
    const filled = countFilled();
    const pill = $('#progress-pill');
    if (pill) pill.textContent = `${filled} / ${SCENARIOS.length} respondidos`;
    const allOk = filled === SCENARIOS.length && countCorrect() === SCENARIOS.length;
    const btn = $('#btn-submit');
    if (btn) btn.disabled = !(allOk || passedOnce);
    $('#ready-note')?.classList.toggle('show', allOk);
  }

  function runValidation(silent) {
    let issues = 0;
    let okCount = 0;

    SCENARIOS.forEach((s) => {
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
          fb.textContent = 'Escolha PAN, LAN, MAN ou WAN.';
        }
        return;
      }

      if (chosen === s.answer) {
        okCount++;
        item?.classList.add('ok');
        if (fb) {
          fb.hidden = false;
          fb.className = 'sc-feedback ok';
          const t = typeMeta(s.answer);
          fb.textContent = `Correto: ${s.answer} (${t?.full || ''}).`;
        }
      } else {
        issues++;
        item?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.className = 'sc-feedback err';
          fb.textContent = `Incorreto. "${chosen}" não é o alcance adequado deste cenário.`;
        }
      }
    });

    const panel = $('#validation-panel');
    const summary = $('#validation-summary');
    if (panel) panel.classList.add('show');
    if (summary) {
      if (issues === 0) {
        summary.className = 'val-summary ok';
        summary.textContent = `Todas as ${SCENARIOS.length} classificações estão corretas.`;
      } else {
        summary.className = 'val-summary err';
        summary.textContent = `${okCount} acerto(s) · ${issues} pendência(s)/erro(s).`;
      }
    }

    updateProgress();
    if (!silent) {
      showToast(
        issues === 0
          ? 'Tudo certo! Você pode enviar o resultado.'
          : `${issues} item(ns) para corrigir.`,
        issues === 0 ? 'ok' : 'warn'
      );
    }
    return issues === 0;
  }

  function resetAll() {
    if (!confirm('Limpar todas as classificações?')) return;
    answers = {};
    ensureAnswers();
    passedOnce = false;
    persistSession();
    $('#success-banner')?.classList.remove('show');
    $('#validation-panel')?.classList.remove('show');
    renderScenarios();
    updateProgress();
    showToast('Respostas limpas.', 'ok');
  }

  function submitResult() {
    if (!runValidation(true)) {
      showToast('Classifique todos os cenários corretamente antes de enviar.', 'warn');
      return;
    }

    passedOnce = true;
    persistSession();
    $('#success-banner')?.classList.add('show');

    const details = {
      matches: SCENARIOS.map((s) => ({
        id: s.id,
        type: s.answer,
        text: s.text.slice(0, 80) + (s.text.length > 80 ? '…' : ''),
      })),
      counts: {
        PAN: SCENARIOS.filter((s) => s.answer === 'PAN').length,
        LAN: SCENARIOS.filter((s) => s.answer === 'LAN').length,
        MAN: SCENARIOS.filter((s) => s.answer === 'MAN').length,
        WAN: SCENARIOS.filter((s) => s.answer === 'WAN').length,
      },
    };

    try {
      R.markExerciseComplete(teamName, EXERCISE_ID, {
        score: 100,
        title: EXERCISE_TITLE,
        members: teamMembers,
        details,
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
    if (passedOnce) $('#success-banner')?.classList.add('show');
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
