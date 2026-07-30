/**
 * Questão 5 — Identificar IP: máscara, rede, 1º/último host e broadcast
 * Três exercícios independentes; todos devem estar corretos para concluir.
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q5';
  const EXERCISE_TITLE = 'Identificação de endereços IP (3 exercícios)';
  const SESSION_KEY = 'sft_q5_session';

  /**
   * Cada exercício dá um IP de host + CIDR.
   * A equipe preenche: máscara, rede, 1º host, último host, broadcast.
   * (O IP do host fica exibido; também pedimos que confira digitando.)
   */
  const EXERCISES = [
    {
      id: 'ex1',
      number: 1,
      title: 'LAN do escritório',
      story:
        'Um PC do escritório recebeu o endereço abaixo. Complete a identificação da sub-rede /24.',
      hostIp: '192.168.10.45',
      cidr: 24,
      color: '#22d3ee',
    },
    {
      id: 'ex2',
      number: 2,
      title: 'Setor de vendas',
      story:
        'O servidor de impressão está com o IP abaixo em uma sub-rede /26. Identifique rede, hosts e broadcast.',
      hostIp: '172.16.5.100',
      cidr: 26,
      color: '#a78bfa',
    },
    {
      id: 'ex3',
      number: 3,
      title: 'Link de gestão',
      story:
        'Um equipamento de gerenciamento usa o IP abaixo em /28. Calcule a faixa completa da sub-rede.',
      hostIp: '10.0.0.130',
      cidr: 28,
      color: '#34d399',
    },
  ];

  const FIELDS = [
    { key: 'hostIp', label: 'Endereço IP (host)', placeholder: 'ex.: 192.168.10.45', hint: 'IP do host do enunciado' },
    { key: 'mask', label: 'Máscara', placeholder: 'ex.: 255.255.255.0', hint: 'Máscara decimal pontilhada' },
    { key: 'network', label: 'Endereço de rede', placeholder: 'ex.: 192.168.10.0', hint: 'Endereço da rede (network)' },
    { key: 'first', label: 'Primeiro host', placeholder: 'ex.: 192.168.10.1', hint: 'Primeiro IP utilizável' },
    { key: 'last', label: 'Último host', placeholder: 'ex.: 192.168.10.254', hint: 'Último IP utilizável' },
    { key: 'broadcast', label: 'Broadcast', placeholder: 'ex.: 192.168.10.255', hint: 'Endereço de broadcast' },
  ];

  function expectedFor(ex) {
    const net = R.networkOf(ex.hostIp, ex.cidr);
    const bcast = R.broadcastOf(ex.hostIp, ex.cidr);
    const mask = R.cidrToMask(ex.cidr);
    return {
      hostIp: ex.hostIp,
      mask: R.intToIP(mask),
      network: R.intToIP(net),
      first: R.intToIP(net + 1),
      last: R.intToIP(bcast - 1),
      broadcast: R.intToIP(bcast),
      cidr: ex.cidr,
    };
  }

  let teamName = '';
  let teamMembers = '';
  /** answers[exId][field] = string */
  let answers = {};
  /** passed[exId] = boolean after individual validate */
  let passed = {};
  let allPassedOnce = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    EXERCISES.forEach((ex) => {
      if (!answers[ex.id]) answers[ex.id] = emptyAnswers();
    });
    renderAll();
    bindEvents();
    updateTeamUI();
  }

  function emptyAnswers() {
    return { hostIp: '', mask: '', network: '', first: '', last: '', broadcast: '' };
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
      passed = s.passed || {};
      allPassedOnce = !!s.allPassedOnce;
    } catch {
      /* ignore */
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ answers, passed, allPassedOnce })
    );
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function normIp(s) {
    if (typeof s !== 'string') return '';
    return s.trim().replace(/\s+/g, '');
  }

  function ipsEqual(a, b) {
    const pa = R.parseIP(normIp(a));
    const pb = R.parseIP(normIp(b));
    if (pa === null || pb === null) return false;
    return pa === pb;
  }

  /** Aceita máscara pontilhada ou /CIDR ou só número CIDR */
  function masksEqual(input, expectedMaskIp, expectedCidr) {
    const raw = normIp(input);
    if (!raw) return false;
    if (ipsEqual(raw, expectedMaskIp)) return true;
    // /24 ou 24
    let m = raw.match(/^\/?(\d{1,2})$/);
    if (m) {
      const c = Number(m[1]);
      return c === expectedCidr;
    }
    // 255.255.255.0/24
    m = raw.match(/^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d{1,2})$/);
    if (m) {
      return ipsEqual(m[1], expectedMaskIp) || Number(m[2]) === expectedCidr;
    }
    const cidr = R.maskToCidr(raw);
    return cidr === expectedCidr;
  }

  function renderAll() {
    const root = $('#exercises-root');
    if (!root) return;
    root.innerHTML = EXERCISES.map((ex) => renderCard(ex)).join('');
    updateProgressUI();
    if (allPassedOnce) $('#success-banner')?.classList.add('show');
  }

  function renderCard(ex) {
    const exp = expectedFor(ex);
    const ans = answers[ex.id] || emptyAnswers();
    const ok = !!passed[ex.id];
    const fieldsHtml = FIELDS.map((f) => {
      const val = ans[f.key] || '';
      return `
        <label class="field">
          <span class="field-label">${esc(f.label)}</span>
          <input
            type="text"
            class="field-input"
            data-ex="${esc(ex.id)}"
            data-field="${esc(f.key)}"
            value="${esc(val)}"
            placeholder="${esc(f.placeholder)}"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="field-hint">${esc(f.hint)}</span>
        </label>`;
    }).join('');

    return `
      <article class="ex-card ${ok ? 'passed' : ''}" id="card-${esc(ex.id)}" style="--ex-color:${ex.color}">
        <header class="ex-head">
          <div class="ex-num">${ex.number}</div>
          <div class="ex-titles">
            <h2>${esc(ex.title)}</h2>
            <p>${esc(ex.story)}</p>
          </div>
          <span class="ex-badge ${ok ? 'ok' : 'wait'}">${ok ? 'Correto' : 'Pendente'}</span>
        </header>

        <div class="given">
          <div class="given-item">
            <label>IP fornecido</label>
            <code>${esc(ex.hostIp)}</code>
          </div>
          <div class="given-item">
            <label>Prefixo (CIDR)</label>
            <code>/${ex.cidr}</code>
          </div>
          <div class="given-item muted-note">
            <label>Dica</label>
            <span>Hosts úteis nesta sub-rede: <strong>${R.hostCapacity(ex.cidr)}</strong></span>
          </div>
        </div>

        <div class="fields-grid">
          ${fieldsHtml}
        </div>

        <div class="ex-actions">
          <button type="button" class="btn btn-primary" data-action="validate" data-ex="${esc(ex.id)}">
            Validar exercício ${ex.number}
          </button>
          <button type="button" class="btn btn-outline" data-action="clear" data-ex="${esc(ex.id)}">
            Limpar
          </button>
          <button type="button" class="btn btn-ghost" data-action="fill-host" data-ex="${esc(ex.id)}" title="Copia o IP do enunciado">
            Copiar IP do enunciado
          </button>
        </div>

        <div class="ex-result" id="result-${esc(ex.id)}" hidden></div>
      </article>`;
  }

  function bindEvents() {
    $('#exercises-root')?.addEventListener('input', (e) => {
      const input = e.target.closest('.field-input');
      if (!input) return;
      const exId = input.dataset.ex;
      const field = input.dataset.field;
      if (!answers[exId]) answers[exId] = emptyAnswers();
      answers[exId][field] = input.value;
      // se mudou resposta, invalida o "passed" daquele exercício
      if (passed[exId]) {
        passed[exId] = false;
        allPassedOnce = false;
        const card = $(`#card-${exId}`);
        card?.classList.remove('passed');
        const badge = card?.querySelector('.ex-badge');
        if (badge) {
          badge.textContent = 'Pendente';
          badge.className = 'ex-badge wait';
        }
        updateProgressUI();
      }
      input.classList.remove('ok', 'err');
      persistSession();
    });

    $('#exercises-root')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const exId = btn.dataset.ex;
      const action = btn.dataset.action;
      if (action === 'validate') validateOne(exId);
      if (action === 'clear') clearOne(exId);
      if (action === 'fill-host') {
        const ex = EXERCISES.find((x) => x.id === exId);
        if (!ex) return;
        if (!answers[exId]) answers[exId] = emptyAnswers();
        answers[exId].hostIp = ex.hostIp;
        const input = document.querySelector(`.field-input[data-ex="${exId}"][data-field="hostIp"]`);
        if (input) input.value = ex.hostIp;
        persistSession();
        showToast(`IP do exercício ${ex.number} copiado para o campo.`, 'ok');
      }
    });

    $('#btn-validate-all')?.addEventListener('click', validateAll);
    $('#btn-reset-all')?.addEventListener('click', resetAll);
    $('#btn-submit')?.addEventListener('click', submitResult);
  }

  function clearOne(exId) {
    answers[exId] = emptyAnswers();
    passed[exId] = false;
    allPassedOnce = false;
    persistSession();
    renderAll();
    showToast('Exercício limpo.', 'ok');
  }

  function resetAll() {
    if (!confirm('Limpar os 3 exercícios?')) return;
    answers = {};
    passed = {};
    allPassedOnce = false;
    EXERCISES.forEach((ex) => {
      answers[ex.id] = emptyAnswers();
    });
    persistSession();
    $('#success-banner')?.classList.remove('show');
    renderAll();
    showToast('Tudo limpo.', 'ok');
  }

  function validateOne(exId, silent) {
    const ex = EXERCISES.find((x) => x.id === exId);
    if (!ex) return false;
    const exp = expectedFor(ex);
    const ans = answers[exId] || emptyAnswers();
    const resultEl = $(`#result-${exId}`);
    const issues = [];
    const oks = [];

    // limpa classes
    FIELDS.forEach((f) => {
      const input = document.querySelector(`.field-input[data-ex="${exId}"][data-field="${f.key}"]`);
      input?.classList.remove('ok', 'err');
    });

    function checkIpField(key, expected, label) {
      const raw = normIp(ans[key]);
      const input = document.querySelector(`.field-input[data-ex="${exId}"][data-field="${key}"]`);
      if (!raw) {
        input?.classList.add('err');
        issues.push(`${label}: campo vazio.`);
        return false;
      }
      if (!R.isValidIP(raw)) {
        input?.classList.add('err');
        issues.push(`${label}: IP inválido.`);
        return false;
      }
      if (!ipsEqual(raw, expected)) {
        input?.classList.add('err');
        issues.push(`${label}: valor incorreto.`);
        return false;
      }
      input?.classList.add('ok');
      oks.push(`${label}: correto (${expected}).`);
      return true;
    }

    // host IP
    checkIpField('hostIp', exp.hostIp, 'Endereço IP (host)');

    // mask
    {
      const raw = normIp(ans.mask);
      const input = document.querySelector(`.field-input[data-ex="${exId}"][data-field="mask"]`);
      if (!raw) {
        input?.classList.add('err');
        issues.push('Máscara: campo vazio.');
      } else if (!masksEqual(raw, exp.mask, exp.cidr)) {
        input?.classList.add('err');
        issues.push('Máscara: valor incorreto (use decimal, ex. 255.255.255.0, ou /CIDR).');
      } else {
        input?.classList.add('ok');
        oks.push(`Máscara: correta (${exp.mask} = /${exp.cidr}).`);
      }
    }

    checkIpField('network', exp.network, 'Endereço de rede');
    checkIpField('first', exp.first, 'Primeiro host');
    checkIpField('last', exp.last, 'Último host');
    checkIpField('broadcast', exp.broadcast, 'Broadcast');

    const ok = issues.length === 0;
    passed[exId] = ok;
    persistSession();

    // update card badge without full re-render (keep focus)
    const card = $(`#card-${exId}`);
    if (card) {
      card.classList.toggle('passed', ok);
      const badge = card.querySelector('.ex-badge');
      if (badge) {
        badge.textContent = ok ? 'Correto' : 'Pendente';
        badge.className = 'ex-badge ' + (ok ? 'ok' : 'wait');
      }
    }

    if (resultEl) {
      resultEl.hidden = false;
      resultEl.className = 'ex-result ' + (ok ? 'ok' : 'err');
      if (ok) {
        resultEl.innerHTML = `
          <strong>✓ Exercício ${ex.number} correto.</strong>
          <ul>${oks.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
      } else {
        resultEl.innerHTML = `
          <strong>✗ Ainda há erros no exercício ${ex.number}.</strong>
          <ul>${issues.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          <p class="result-tip">Revise: rede = IP AND máscara · 1º host = rede+1 · último = broadcast−1 · broadcast = rede OR (bits de host).</p>`;
      }
    }

    updateProgressUI();
    if (!silent) {
      showToast(
        ok
          ? `Exercício ${ex.number} validado com sucesso.`
          : `Exercício ${ex.number}: ${issues.length} erro(s).`,
        ok ? 'ok' : 'warn'
      );
    }
    return ok;
  }

  function validateAll() {
    let all = true;
    EXERCISES.forEach((ex) => {
      if (!validateOne(ex.id, true)) all = false;
    });
    if (all) {
      showToast('Os 3 exercícios estão corretos! Você pode enviar o resultado.', 'ok');
    } else {
      showToast('Alguns exercícios ainda estão incorretos.', 'warn');
    }
    updateProgressUI();
  }

  function updateProgressUI() {
    const n = EXERCISES.filter((ex) => passed[ex.id]).length;
    const el = $('#progress-pill');
    if (el) el.textContent = `${n} / 3 exercícios corretos`;
    const btn = $('#btn-submit');
    if (btn) btn.disabled = n < 3 && !allPassedOnce;
    if (n === 3) {
      $('#ready-note')?.classList.add('show');
    } else {
      $('#ready-note')?.classList.remove('show');
    }
  }

  function submitResult() {
    // revalida tudo
    let all = true;
    EXERCISES.forEach((ex) => {
      if (!validateOne(ex.id, true)) all = false;
    });
    if (!all) {
      showToast('Os 3 exercícios precisam estar corretos para enviar.', 'warn');
      updateProgressUI();
      return;
    }

    allPassedOnce = true;
    persistSession();
    $('#success-banner')?.classList.add('show');

    const details = {
      exercises: EXERCISES.map((ex) => {
        const exp = expectedFor(ex);
        return {
          id: ex.id,
          title: ex.title,
          hostIp: exp.hostIp,
          cidr: exp.cidr,
          network: exp.network,
          mask: exp.mask,
          first: exp.first,
          last: exp.last,
          broadcast: exp.broadcast,
        };
      }),
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
    updateProgressUI();
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
    showToast._t = setTimeout(() => el.classList.remove('show'), 3500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
