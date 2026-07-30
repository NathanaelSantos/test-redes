/**
 * Questão 3 — Associar problemas numerados à topologia adequada
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q3';
  const EXERCISE_TITLE = 'Problemas × topologias de rede';
  const SESSION_KEY = 'sft_q3_session';

  /**
   * Problemas enumerados (enunciado que a equipe lê).
   * correctTopologyId = resposta correta (não exposta na UI).
   */
  const PROBLEMS = [
    {
      num: 1,
      text:
        'Um escritório pequeno tem um único switch central. Todos os PCs, impressoras e o roteador de saída se conectam a esse equipamento. Se o switch falhar, a rede inteira para.',
      correctTopologyId: 'estrela',
    },
    {
      num: 2,
      text:
        'Em uma instalação legada, vários hosts compartilham o mesmo cabo coaxial. Os dados circulam no meio comum; uma ruptura no cabo interrompe todos os pontos daquele segmento.',
      correctTopologyId: 'barramento',
    },
    {
      num: 3,
      text:
        'Três prédios de um campus estão ligados por fibra formando um circuito fechado. Cada prédio se conecta a dois vizinhos. Se um enlace cair, o tráfego ainda pode seguir pelo outro lado do circuito.',
      correctTopologyId: 'anel',
    },
    {
      num: 4,
      text:
        'No datacenter da empresa, servidores críticos precisam de vários caminhos alternativos entre si. A prioridade é alta disponibilidade e ausência de ponto único de falha, mesmo com mais cabos e custo.',
      correctTopologyId: 'malha',
    },
    {
      num: 5,
      text:
        'A rede do campus segue o modelo hierárquico: núcleo (core), distribuição e acesso. Switches de andares sobem para a distribuição, que sobe para o core — estrutura em camadas, como uma árvore invertida.',
      correctTopologyId: 'arvore',
    },
    {
      num: 6,
      text:
        'Cada andar usa um switch em estrela para os PCs, mas o backbone entre andares e o datacenter usa um anel de fibra. A solução final mistura mais de um tipo de topologia física/lógica.',
      correctTopologyId: 'hibrida',
    },
  ];

  /** Topologias exibidas (ordem diferente dos problemas para não “colar” pela sequência) */
  const TOPOLOGIES = [
    {
      id: 'malha',
      name: 'Malha (Mesh)',
      blurb: 'Vários caminhos entre nós; alta redundância.',
      accent: '#a78bfa',
    },
    {
      id: 'estrela',
      name: 'Estrela (Star)',
      blurb: 'Dispositivos ligados a um ponto central (hub/switch).',
      accent: '#22d3ee',
    },
    {
      id: 'hibrida',
      name: 'Híbrida',
      blurb: 'Combina duas ou mais topologias em uma só rede.',
      accent: '#f472b6',
    },
    {
      id: 'barramento',
      name: 'Barramento (Bus)',
      blurb: 'Meio compartilhado linear; cabo comum a todos.',
      accent: '#fbbf24',
    },
    {
      id: 'arvore',
      name: 'Árvore (Tree)',
      blurb: 'Hierarquia em camadas (raiz → ramos → folhas).',
      accent: '#34d399',
    },
    {
      id: 'anel',
      name: 'Anel (Ring)',
      blurb: 'Nós em circuito fechado; cada um liga a dois vizinhos.',
      accent: '#fb923c',
    },
  ];

  const correctByTopo = Object.fromEntries(
    PROBLEMS.map((p) => [p.correctTopologyId, p.num])
  );

  let teamName = '';
  let teamMembers = '';
  /** topologyId -> número do problema (string) */
  let answers = {};
  let passedOnce = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    renderProblems();
    renderTopologies();
    bindEvents();
    updateTeamUI();
    updateUsedBadges();
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
      answers = s.answers || {};
      passedOnce = !!s.passedOnce;
    } catch {
      /* ignore */
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ answers, passedOnce })
    );
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function renderProblems() {
    const list = $('#problems-list');
    if (!list) return;
    list.innerHTML = PROBLEMS.map(
      (p) => `
      <li class="problem-item" data-num="${p.num}">
        <span class="problem-num" aria-hidden="true">${p.num}</span>
        <p class="problem-text"><strong>Problema ${p.num}.</strong> ${esc(p.text)}</p>
      </li>`
    ).join('');
  }

  function topoSvg(id) {
    // Mini diagramas SVG por topologia
    const stroke = 'currentColor';
    switch (id) {
      case 'estrela':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <circle cx="60" cy="45" r="10" fill="currentColor" opacity="0.9"/>
          <circle cx="20" cy="18" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="100" cy="18" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="20" cy="72" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="100" cy="72" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="60" cy="12" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <line x1="60" y1="45" x2="20" y2="18" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="45" x2="100" y2="18" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="45" x2="20" y2="72" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="45" x2="100" y2="72" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="45" x2="60" y2="12" stroke="${stroke}" stroke-width="1.5"/>
        </svg>`;
      case 'barramento':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <line x1="10" y1="55" x2="110" y2="55" stroke="${stroke}" stroke-width="3"/>
          <line x1="25" y1="55" x2="25" y2="28" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="50" y1="55" x2="50" y2="28" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="75" y1="55" x2="75" y2="28" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="100" y1="55" x2="100" y2="28" stroke="${stroke}" stroke-width="1.5"/>
          <circle cx="25" cy="22" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="50" cy="22" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="75" cy="22" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="100" cy="22" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
        </svg>`;
      case 'anel':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <circle cx="60" cy="48" r="28" fill="none" stroke="${stroke}" stroke-width="2" stroke-dasharray="4 2"/>
          <circle cx="60" cy="20" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="88" cy="40" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="78" cy="72" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="42" cy="72" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="32" cy="40" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
        </svg>`;
      case 'malha':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <circle cx="30" cy="25" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="90" cy="25" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="30" cy="70" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="90" cy="70" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="60" cy="48" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <line x1="30" y1="25" x2="90" y2="25" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="30" y1="70" x2="90" y2="70" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="30" y1="25" x2="30" y2="70" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="90" y1="25" x2="90" y2="70" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="30" y1="25" x2="90" y2="70" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="90" y1="25" x2="30" y2="70" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="30" y1="25" x2="60" y2="48" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="90" y1="25" x2="60" y2="48" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="30" y1="70" x2="60" y2="48" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="90" y1="70" x2="60" y2="48" stroke="${stroke}" stroke-width="1.2"/>
        </svg>`;
      case 'arvore':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <circle cx="60" cy="16" r="7" fill="currentColor" opacity="0.9"/>
          <circle cx="35" cy="42" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="85" cy="42" r="7" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="20" cy="72" r="6" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="50" cy="72" r="6" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="70" cy="72" r="6" fill="none" stroke="${stroke}" stroke-width="2"/>
          <circle cx="100" cy="72" r="6" fill="none" stroke="${stroke}" stroke-width="2"/>
          <line x1="60" y1="23" x2="35" y2="35" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="23" x2="85" y2="35" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="35" y1="49" x2="20" y2="66" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="35" y1="49" x2="50" y2="66" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="85" y1="49" x2="70" y2="66" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="85" y1="49" x2="100" y2="66" stroke="${stroke}" stroke-width="1.5"/>
        </svg>`;
      case 'hibrida':
        return `<svg viewBox="0 0 120 90" class="topo-svg" aria-hidden="true">
          <!-- anel backbone -->
          <circle cx="60" cy="48" r="22" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.5"/>
          <circle cx="60" cy="26" r="6" fill="currentColor" opacity="0.85"/>
          <circle cx="82" cy="58" r="6" fill="currentColor" opacity="0.85"/>
          <circle cx="38" cy="58" r="6" fill="currentColor" opacity="0.85"/>
          <!-- estrelas locais -->
          <circle cx="20" cy="18" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
          <circle cx="100" cy="18" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
          <circle cx="20" cy="78" r="5" fill="none" stroke="${stroke}" stroke-width="1.5"/>
          <line x1="60" y1="26" x2="20" y2="18" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="60" y1="26" x2="100" y2="18" stroke="${stroke}" stroke-width="1.2"/>
          <line x1="38" y1="58" x2="20" y2="78" stroke="${stroke}" stroke-width="1.2"/>
        </svg>`;
      default:
        return '';
    }
  }

  function renderTopologies() {
    const grid = $('#topo-grid');
    if (!grid) return;
    grid.innerHTML = TOPOLOGIES.map((t) => {
      const val = answers[t.id] != null && answers[t.id] !== '' ? String(answers[t.id]) : '';
      return `
      <article class="topo-card" data-topo="${esc(t.id)}" style="--topo-accent:${t.accent}">
        <div class="topo-diagram">${topoSvg(t.id)}</div>
        <h3 class="topo-name">${esc(t.name)}</h3>
        <p class="topo-blurb">${esc(t.blurb)}</p>
        <label class="topo-label" for="ans-${esc(t.id)}">Nº do problema</label>
        <div class="topo-input-row">
          <input
            id="ans-${esc(t.id)}"
            class="topo-input"
            type="number"
            min="1"
            max="${PROBLEMS.length}"
            step="1"
            inputmode="numeric"
            placeholder="?"
            data-topo="${esc(t.id)}"
            value="${esc(val)}"
            autocomplete="off"
          />
          <span class="topo-hint">1–${PROBLEMS.length}</span>
        </div>
        <p class="topo-feedback" data-feedback="${esc(t.id)}" hidden></p>
      </article>`;
    }).join('');
  }

  function bindEvents() {
    $('#topo-grid')?.addEventListener('input', (e) => {
      const input = e.target.closest('.topo-input');
      if (!input) return;
      const id = input.dataset.topo;
      let v = String(input.value || '').trim();
      // só dígitos / vazio
      if (v !== '' && !/^\d+$/.test(v)) {
        v = v.replace(/\D/g, '');
        input.value = v;
      }
      if (v === '') {
        delete answers[id];
      } else {
        const n = Number(v);
        if (n < 1 || n > PROBLEMS.length) {
          input.classList.add('invalid');
        } else {
          input.classList.remove('invalid');
        }
        answers[id] = v;
      }
      input.classList.remove('ok', 'err');
      const fb = document.querySelector(`[data-feedback="${id}"]`);
      if (fb) {
        fb.hidden = true;
        fb.textContent = '';
      }
      persistSession();
      updateUsedBadges();
    });

    $('#btn-validate')?.addEventListener('click', () => runValidation(true));
    $('#btn-reset')?.addEventListener('click', resetAnswers);
    $('#btn-clear-highlights')?.addEventListener('click', clearHighlights);
  }

  function updateTeamUI() {
    const badge = $('#team-badge');
    if (badge) {
      badge.hidden = false;
      badge.innerHTML = `<strong>${esc(teamName)}</strong>${
        teamMembers ? ` · ${esc(teamMembers)}` : ''
      }`;
    }
    if (passedOnce) {
      $('#success-banner')?.classList.add('show');
    }
  }

  function updateUsedBadges() {
    const used = new Set();
    Object.values(answers).forEach((v) => {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= PROBLEMS.length) used.add(n);
    });

    $$('.problem-item').forEach((li) => {
      const n = Number(li.dataset.num);
      li.classList.toggle('used', used.has(n));
    });

    const counter = $('#match-counter');
    if (counter) {
      const filled = Object.keys(answers).filter((k) => String(answers[k]).trim() !== '').length;
      counter.textContent = `${filled} / ${TOPOLOGIES.length} topologias preenchidas`;
    }
  }

  function clearHighlights() {
    $$('.topo-input').forEach((el) => el.classList.remove('ok', 'err', 'invalid'));
    $$('[data-feedback]').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('ok', 'err');
    });
    $$('.topo-card').forEach((c) => c.classList.remove('ok', 'err'));
    $('#validation-panel')?.classList.remove('show');
  }

  function resetAnswers() {
    if (!confirm('Limpar todas as associações?')) return;
    answers = {};
    passedOnce = false;
    persistSession();
    renderTopologies();
    clearHighlights();
    updateUsedBadges();
    $('#success-banner')?.classList.remove('show');
    showToast('Associações limpas.', 'ok');
  }

  function runValidation(logToPanel) {
    const issues = [];
    const okItems = [];

    if (!teamName) {
      issues.push({ level: 'err', msg: 'Cadastre a equipe no início do teste (index).' });
      renderValidation(issues, okItems);
      showToast('Cadastre a equipe no início do teste.', 'warn');
      return false;
    }

    // limpa estados visuais
    $$('.topo-input').forEach((el) => el.classList.remove('ok', 'err', 'invalid'));
    $$('.topo-card').forEach((c) => c.classList.remove('ok', 'err'));
    $$('[data-feedback]').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
      el.classList.remove('ok', 'err');
    });

    const seen = new Map(); // num -> topoId
    let allFilled = true;
    let allCorrect = true;

    TOPOLOGIES.forEach((t) => {
      const raw = String(answers[t.id] ?? '').trim();
      const input = document.querySelector(`.topo-input[data-topo="${t.id}"]`);
      const card = document.querySelector(`.topo-card[data-topo="${t.id}"]`);
      const fb = document.querySelector(`[data-feedback="${t.id}"]`);
      const expected = correctByTopo[t.id];

      if (raw === '') {
        allFilled = false;
        allCorrect = false;
        input?.classList.add('invalid');
        card?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.classList.add('err');
          fb.textContent = 'Informe o número do problema.';
        }
        issues.push({
          level: 'err',
          msg: `[${t.name}] Sem número — associe um dos problemas 1–${PROBLEMS.length}.`,
        });
        return;
      }

      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > PROBLEMS.length) {
        allFilled = false;
        allCorrect = false;
        input?.classList.add('invalid');
        card?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.classList.add('err');
          fb.textContent = `Use um número entre 1 e ${PROBLEMS.length}.`;
        }
        issues.push({
          level: 'err',
          msg: `[${t.name}] Número inválido (${raw}).`,
        });
        return;
      }

      if (seen.has(n)) {
        allCorrect = false;
        input?.classList.add('err');
        card?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.classList.add('err');
          fb.textContent = `Problema ${n} já foi usado em outra topologia.`;
        }
        issues.push({
          level: 'err',
          msg: `Problema ${n} associado a mais de uma topologia (cada problema só pode ir em uma).`,
        });
        return;
      }
      seen.set(n, t.id);

      if (n === expected) {
        input?.classList.add('ok');
        card?.classList.add('ok');
        if (fb) {
          fb.hidden = false;
          fb.classList.add('ok');
          fb.textContent = `Correto — problema ${n} encaixa em ${t.name}.`;
        }
        okItems.push({
          level: 'ok',
          msg: `Problema ${n} → ${t.name}`,
        });
      } else {
        allCorrect = false;
        input?.classList.add('err');
        card?.classList.add('err');
        if (fb) {
          fb.hidden = false;
          fb.classList.add('err');
          fb.textContent = `O problema ${n} não corresponde a esta topologia. Revise o enunciado.`;
        }
        issues.push({
          level: 'err',
          msg: `[${t.name}] Problema ${n} não é a associação correta. Releia o cenário.`,
        });
      }
    });

    // problemas não usados
    if (allFilled) {
      for (let n = 1; n <= PROBLEMS.length; n++) {
        if (!seen.has(n)) {
          allCorrect = false;
          issues.push({
            level: 'warn',
            msg: `Problema ${n} não foi associado a nenhuma topologia.`,
          });
        }
      }
    }

    renderValidation(issues, okItems);

    if (allFilled && allCorrect && issues.filter((i) => i.level === 'err').length === 0) {
      passedOnce = true;
      persistSession();
      $('#success-banner')?.classList.add('show');

      const details = {
        matches: TOPOLOGIES.map((t) => ({
          topology: t.name,
          problem: Number(answers[t.id]),
        })),
      };

      try {
        R.markExerciseComplete(teamName, EXERCISE_ID, {
          score: 100,
          title: EXERCISE_TITLE,
          members: teamMembers,
          details,
        });
        showToast('Exercício concluído! Registrado no painel do instrutor.', 'ok');
      } catch (err) {
        showToast('Validou, mas falhou ao gravar no painel: ' + err.message, 'warn');
      }
      return true;
    }

    const errCount = issues.filter((i) => i.level === 'err').length;
    showToast(
      errCount
        ? `${errCount} erro(s) na associação. Corrija e valide de novo.`
        : 'Ainda há pendências.',
      'warn'
    );
    return false;
  }

  function renderValidation(issues, okItems) {
    const panel = $('#validation-panel');
    const list = $('#validation-list');
    const summary = $('#validation-summary');
    if (!panel || !list) return;

    panel.classList.add('show');
    const errs = issues.filter((i) => i.level === 'err').length;
    const warns = issues.filter((i) => i.level === 'warn').length;

    if (summary) {
      if (errs === 0 && warns === 0 && okItems.length === TOPOLOGIES.length) {
        summary.textContent = 'Todas as associações estão corretas.';
        summary.className = 'val-summary ok';
      } else {
        summary.textContent = `${errs} erro(s)${warns ? `, ${warns} aviso(s)` : ''} · ${okItems.length} acerto(s).`;
        summary.className = 'val-summary err';
      }
    }

    const items = [
      ...okItems.map(
        (i) => `<li class="val-ok"><span class="dot"></span>${esc(i.msg)}</li>`
      ),
      ...issues.map(
        (i) =>
          `<li class="val-${i.level === 'warn' ? 'warn' : 'err'}"><span class="dot"></span>${esc(i.msg)}</li>`
      ),
    ];
    list.innerHTML = items.join('') || '<li class="val-warn">Nada para exibir.</li>';
  }

  function showToast(msg, type = 'ok') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      el.classList.remove('show');
    }, 3200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
