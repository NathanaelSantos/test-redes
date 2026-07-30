/**
 * Questão 7 — Dada a rede, listar as sub-redes
 * 3 cenários de subnetting igual (FLSM)
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q7';
  const EXERCISE_TITLE = 'Listar sub-redes a partir da rede';
  const SESSION_KEY = 'sft_q7_session';

  /**
   * Cada cenário: rede base + novo CIDR (divisão igual).
   * A equipe preenche cada sub-rede: endereço de rede, 1º host, último host, broadcast.
   * Máscara/CIDR da sub-rede é o mesmo para todas (também validado no topo).
   */
  const SCENARIOS = [
    {
      id: 's1',
      number: 1,
      title: 'LAN /24 em 4 sub-redes',
      story:
        'A rede 192.168.10.0/24 será dividida de forma igual em 4 sub-redes. Cada uma usa /26. Liste as 4 sub-redes.',
      baseNetwork: '192.168.10.0',
      baseCidr: 24,
      newCidr: 26,
      color: '#22d3ee',
    },
    {
      id: 's2',
      number: 2,
      title: 'Escritório /24 em 8 sub-redes',
      story:
        'A rede 172.16.5.0/24 será particionada em 8 sub-redes iguais (/27). Liste as 8 sub-redes na ordem.',
      baseNetwork: '172.16.5.0',
      baseCidr: 24,
      newCidr: 27,
      color: '#a78bfa',
    },
    {
      id: 's3',
      number: 3,
      title: 'Bloco /16 em 4 super-redes /18',
      story:
        'O bloco 10.0.0.0/16 será dividido em 4 sub-redes iguais com prefixo /18. Liste as 4 sub-redes.',
      baseNetwork: '10.0.0.0',
      baseCidr: 16,
      newCidr: 18,
      color: '#34d399',
    },
  ];

  function buildSubnets(baseNetwork, baseCidr, newCidr) {
    const baseNet = R.networkOf(baseNetwork, baseCidr);
    if (baseNet === null) return [];
    const bits = newCidr - baseCidr;
    if (bits < 0) return [];
    const count = Math.pow(2, bits);
    const blockSize = Math.pow(2, 32 - newCidr);
    const mask = R.intToIP(R.cidrToMask(newCidr));
    const list = [];
    for (let i = 0; i < count; i++) {
      const net = (baseNet + i * blockSize) >>> 0;
      const bcast = (net + blockSize - 1) >>> 0;
      list.push({
        index: i,
        network: R.intToIP(net),
        first: R.intToIP(net + 1),
        last: R.intToIP(bcast - 1),
        broadcast: R.intToIP(bcast),
        mask,
        cidr: newCidr,
      });
    }
    return list;
  }

  // pré-calcula respostas
  SCENARIOS.forEach((s) => {
    s.subnets = buildSubnets(s.baseNetwork, s.baseCidr, s.newCidr);
    s.subnetCount = s.subnets.length;
    s.subnetMask = s.subnets[0]?.mask || '';
  });

  let teamName = '';
  let teamMembers = '';
  /**
   * answers[scenarioId] = {
   *   mask: '',
   *   rows: [ { network, first, last, broadcast }, ... ]
   * }
   */
  let answers = {};
  let passed = {};
  let allPassedOnce = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    ensureAnswers();
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

  function emptyRow() {
    return { network: '', first: '', last: '', broadcast: '' };
  }

  function ensureAnswers() {
    SCENARIOS.forEach((s) => {
      if (!answers[s.id]) {
        answers[s.id] = {
          mask: '',
          rows: Array.from({ length: s.subnetCount }, () => emptyRow()),
        };
      } else {
        if (!Array.isArray(answers[s.id].rows)) answers[s.id].rows = [];
        while (answers[s.id].rows.length < s.subnetCount) {
          answers[s.id].rows.push(emptyRow());
        }
        answers[s.id].rows = answers[s.id].rows.slice(0, s.subnetCount).map((r) => ({
          network: r?.network || '',
          first: r?.first || '',
          last: r?.last || '',
          broadcast: r?.broadcast || '',
        }));
        if (answers[s.id].mask == null) answers[s.id].mask = '';
      }
    });
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
    return String(s ?? '').trim().replace(/\s+/g, '');
  }

  function ipsEqual(a, b) {
    const pa = R.parseIP(normIp(a));
    const pb = R.parseIP(normIp(b));
    if (pa === null || pb === null) return false;
    return pa === pb;
  }

  function masksEqual(input, expectedMask, expectedCidr) {
    const raw = normIp(input);
    if (!raw) return false;
    if (ipsEqual(raw, expectedMask)) return true;
    const m = raw.match(/^\/?(\d{1,2})$/);
    if (m) return Number(m[1]) === expectedCidr;
    const cidr = R.maskToCidr(raw);
    return cidr === expectedCidr;
  }

  function renderAll() {
    const root = $('#scenarios-root');
    if (!root) return;
    root.innerHTML = SCENARIOS.map((s) => renderScenario(s)).join('');
    updateProgressUI();
    if (allPassedOnce) $('#success-banner')?.classList.add('show');
  }

  function renderScenario(s) {
    const ans = answers[s.id] || { mask: '', rows: [] };
    const ok = !!passed[s.id];
    const bits = s.newCidr - s.baseCidr;
    const blockSize = Math.pow(2, 32 - s.newCidr);

    const rowsHtml = s.subnets
      .map((sub, i) => {
        const row = ans.rows[i] || emptyRow();
        return `
        <tr data-s="${esc(s.id)}" data-i="${i}">
          <td class="idx">#${i}</td>
          <td><input class="cell" data-s="${esc(s.id)}" data-i="${i}" data-f="network"
            value="${esc(row.network)}" placeholder="x.x.x.x" autocomplete="off" spellcheck="false" /></td>
          <td><input class="cell" data-s="${esc(s.id)}" data-i="${i}" data-f="first"
            value="${esc(row.first)}" placeholder="x.x.x.x" autocomplete="off" spellcheck="false" /></td>
          <td><input class="cell" data-s="${esc(s.id)}" data-i="${i}" data-f="last"
            value="${esc(row.last)}" placeholder="x.x.x.x" autocomplete="off" spellcheck="false" /></td>
          <td><input class="cell" data-s="${esc(s.id)}" data-i="${i}" data-f="broadcast"
            value="${esc(row.broadcast)}" placeholder="x.x.x.x" autocomplete="off" spellcheck="false" /></td>
        </tr>`;
      })
      .join('');

    return `
      <article class="sc-card ${ok ? 'passed' : ''}" id="card-${esc(s.id)}" style="--sc-color:${s.color}">
        <header class="sc-head">
          <div class="sc-num">${s.number}</div>
          <div class="sc-titles">
            <h2>${esc(s.title)}</h2>
            <p>${esc(s.story)}</p>
          </div>
          <span class="sc-badge ${ok ? 'ok' : 'wait'}">${ok ? 'Correto' : 'Pendente'}</span>
        </header>

        <div class="given-row">
          <div class="given">
            <label>Rede base</label>
            <code>${esc(s.baseNetwork)}/${s.baseCidr}</code>
          </div>
          <div class="given">
            <label>Novo prefixo</label>
            <code>/${s.newCidr}</code>
          </div>
          <div class="given">
            <label>Qtd. de sub-redes</label>
            <code>2<sup>${bits}</sup> = ${s.subnetCount}</code>
          </div>
          <div class="given">
            <label>Tamanho do bloco</label>
            <code>${blockSize} endereços</code>
          </div>
        </div>

        <div class="mask-row">
          <label for="mask-${esc(s.id)}">Máscara de cada sub-rede</label>
          <input id="mask-${esc(s.id)}" class="cell mask-input" data-s="${esc(s.id)}" data-f="mask"
            value="${esc(ans.mask)}" placeholder="ex.: 255.255.255.192 ou /26"
            autocomplete="off" spellcheck="false" />
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Endereço de rede</th>
                <th>1º host</th>
                <th>Último host</th>
                <th>Broadcast</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="sc-actions">
          <button type="button" class="btn btn-primary" data-action="validate" data-s="${esc(s.id)}">
            Validar cenário ${s.number}
          </button>
          <button type="button" class="btn btn-outline" data-action="clear" data-s="${esc(s.id)}">
            Limpar
          </button>
        </div>
        <div class="sc-result" id="result-${esc(s.id)}" hidden></div>
      </article>`;
  }

  function bindEvents() {
    $('#scenarios-root')?.addEventListener('input', (e) => {
      const input = e.target.closest('.cell');
      if (!input) return;
      const sid = input.dataset.s;
      if (!answers[sid]) ensureAnswers();

      if (input.dataset.f === 'mask') {
        answers[sid].mask = input.value;
      } else {
        const i = Number(input.dataset.i);
        const f = input.dataset.f;
        if (!answers[sid].rows[i]) answers[sid].rows[i] = emptyRow();
        answers[sid].rows[i][f] = input.value;
      }

      if (passed[sid]) {
        passed[sid] = false;
        allPassedOnce = false;
        const card = $(`#card-${sid}`);
        card?.classList.remove('passed');
        const badge = card?.querySelector('.sc-badge');
        if (badge) {
          badge.textContent = 'Pendente';
          badge.className = 'sc-badge wait';
        }
        updateProgressUI();
      }
      input.classList.remove('ok', 'err');
      persistSession();
    });

    $('#scenarios-root')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const sid = btn.dataset.s;
      if (btn.dataset.action === 'validate') validateOne(sid);
      if (btn.dataset.action === 'clear') clearOne(sid);
    });

    $('#btn-validate-all')?.addEventListener('click', validateAll);
    $('#btn-submit')?.addEventListener('click', submitResult);
    $('#btn-reset')?.addEventListener('click', resetAll);
  }

  function clearOne(sid) {
    const s = SCENARIOS.find((x) => x.id === sid);
    if (!s) return;
    answers[sid] = {
      mask: '',
      rows: Array.from({ length: s.subnetCount }, () => emptyRow()),
    };
    passed[sid] = false;
    allPassedOnce = false;
    persistSession();
    renderAll();
    showToast('Cenário limpo.', 'ok');
  }

  function resetAll() {
    if (!confirm('Limpar os 3 cenários?')) return;
    answers = {};
    passed = {};
    allPassedOnce = false;
    ensureAnswers();
    persistSession();
    $('#success-banner')?.classList.remove('show');
    renderAll();
    showToast('Tudo limpo.', 'ok');
  }

  function markCell(sid, i, field, ok) {
    const sel =
      field === 'mask'
        ? `.cell.mask-input[data-s="${sid}"]`
        : `.cell[data-s="${sid}"][data-i="${i}"][data-f="${field}"]`;
    const input = document.querySelector(sel);
    if (!input) return;
    input.classList.remove('ok', 'err');
    input.classList.add(ok ? 'ok' : 'err');
  }

  function validateOne(sid, silent) {
    const s = SCENARIOS.find((x) => x.id === sid);
    if (!s) return false;
    const ans = answers[sid] || { mask: '', rows: [] };
    const issues = [];
    const oks = [];

    // limpa destaques
    document.querySelectorAll(`.cell[data-s="${sid}"]`).forEach((el) => {
      el.classList.remove('ok', 'err');
    });

    // máscara
    const maskOk = masksEqual(ans.mask, s.subnetMask, s.newCidr);
    markCell(sid, 0, 'mask', maskOk);
    if (!maskOk) {
      issues.push(`Máscara das sub-redes incorreta (esp. ${s.subnetMask} = /${s.newCidr}).`);
    } else {
      oks.push(`Máscara correta: ${s.subnetMask} (/ ${s.newCidr}).`);
    }

    const fields = [
      { key: 'network', label: 'Rede' },
      { key: 'first', label: '1º host' },
      { key: 'last', label: 'Último host' },
      { key: 'broadcast', label: 'Broadcast' },
    ];

    s.subnets.forEach((exp, i) => {
      const row = ans.rows[i] || emptyRow();
      fields.forEach((f) => {
        const raw = normIp(row[f.key]);
        let ok = false;
        if (!raw) {
          issues.push(`Sub-rede #${i}: ${f.label} vazio.`);
        } else if (!R.isValidIP(raw)) {
          issues.push(`Sub-rede #${i}: ${f.label} inválido.`);
        } else if (!ipsEqual(raw, exp[f.key])) {
          issues.push(`Sub-rede #${i}: ${f.label} incorreto.`);
        } else {
          ok = true;
        }
        markCell(sid, i, f.key, ok);
      });
    });

    // checar se redes estão em ordem sem “pular” — já coberto por match exato por índice

    const ok = issues.length === 0;
    passed[sid] = ok;
    persistSession();

    const card = $(`#card-${sid}`);
    if (card) {
      card.classList.toggle('passed', ok);
      const badge = card.querySelector('.sc-badge');
      if (badge) {
        badge.textContent = ok ? 'Correto' : 'Pendente';
        badge.className = 'sc-badge ' + (ok ? 'ok' : 'wait');
      }
    }

    const resultEl = $(`#result-${sid}`);
    if (resultEl) {
      resultEl.hidden = false;
      resultEl.className = 'sc-result ' + (ok ? 'ok' : 'err');
      if (ok) {
        resultEl.innerHTML = `
          <strong>✓ Cenário ${s.number}: todas as ${s.subnetCount} sub-redes estão corretas.</strong>
          <p class="tip">Incremento entre redes = ${Math.pow(2, 32 - s.newCidr)} (tamanho do bloco).</p>`;
      } else {
        // limita mensagens na UI
        const show = issues.slice(0, 12);
        const more = issues.length > 12 ? `<li>… e mais ${issues.length - 12} erro(s).</li>` : '';
        resultEl.innerHTML = `
          <strong>✗ Cenário ${s.number}: ${issues.length} erro(s).</strong>
          <ul>${show.map((m) => `<li>${esc(m)}</li>`).join('')}${more}</ul>
          <p class="tip">Dica: 1ª rede = rede base alinhada. Próxima = anterior + tamanho do bloco. 1º host = rede+1 · último = broadcast−1.</p>`;
      }
    }

    updateProgressUI();
    if (!silent) {
      showToast(
        ok
          ? `Cenário ${s.number} validado!`
          : `Cenário ${s.number}: ${issues.length} erro(s).`,
        ok ? 'ok' : 'warn'
      );
    }
    return ok;
  }

  function validateAll() {
    let all = true;
    SCENARIOS.forEach((s) => {
      if (!validateOne(s.id, true)) all = false;
    });
    showToast(
      all ? 'Os 3 cenários estão corretos! Pode enviar.' : 'Ainda há erros em algum cenário.',
      all ? 'ok' : 'warn'
    );
    updateProgressUI();
  }

  function updateProgressUI() {
    const n = SCENARIOS.filter((s) => passed[s.id]).length;
    const el = $('#progress-pill');
    if (el) el.textContent = `${n} / 3 cenários corretos`;
    const btn = $('#btn-submit');
    if (btn) btn.disabled = n < 3 && !allPassedOnce;
    $('#ready-note')?.classList.toggle('show', n === 3);
  }

  function submitResult() {
    let all = true;
    SCENARIOS.forEach((s) => {
      if (!validateOne(s.id, true)) all = false;
    });
    if (!all) {
      showToast('Os 3 cenários precisam estar corretos para enviar.', 'warn');
      updateProgressUI();
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
          scenarios: SCENARIOS.map((s) => ({
            title: s.title,
            base: `${s.baseNetwork}/${s.baseCidr}`,
            newCidr: s.newCidr,
            count: s.subnetCount,
            networks: s.subnets.map((x) => x.network),
          })),
        },
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
