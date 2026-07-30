/**
 * Questão 6 — Máscaras de rede e CIDR
 * 3 blocos: CIDR→máscara, máscara→CIDR, hosts necessários→prefixo
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q6';
  const EXERCISE_TITLE = 'Máscaras de rede e CIDR';
  const SESSION_KEY = 'sft_q6_session';

  /** Bloco A: dado o CIDR, informar máscara e hosts úteis */
  const BLOCK_A = [
    { id: 'a1', cidr: 24, mask: '255.255.255.0', hosts: 254 },
    { id: 'a2', cidr: 26, mask: '255.255.255.192', hosts: 62 },
    { id: 'a3', cidr: 30, mask: '255.255.255.252', hosts: 2 },
    { id: 'a4', cidr: 16, mask: '255.255.0.0', hosts: 65534 },
  ];

  /** Bloco B: dada a máscara, informar CIDR e hosts úteis */
  const BLOCK_B = [
    { id: 'b1', mask: '255.255.255.0', cidr: 24, hosts: 254 },
    { id: 'b2', mask: '255.255.255.128', cidr: 25, hosts: 126 },
    { id: 'b3', mask: '255.255.255.240', cidr: 28, hosts: 14 },
    { id: 'b4', mask: '255.255.255.252', cidr: 30, hosts: 2 },
  ];

  /**
   * Bloco C: quantos hosts a empresa precisa → menor CIDR que cabe
   * (prefixo mais longo possível que ainda atende a capacidade)
   */
  const BLOCK_C = [
    {
      id: 'c1',
      need: 50,
      cidr: 26,
      mask: '255.255.255.192',
      hint: 'Precisa de pelo menos 50 hosts úteis',
    },
    {
      id: 'c2',
      need: 10,
      cidr: 28,
      mask: '255.255.255.240',
      hint: 'Precisa de pelo menos 10 hosts úteis',
    },
    {
      id: 'c3',
      need: 2,
      cidr: 30,
      mask: '255.255.255.252',
      hint: 'Enlace ponto a ponto (2 hosts)',
    },
    {
      id: 'c4',
      need: 300,
      cidr: 23,
      mask: '255.255.254.0',
      hint: 'Precisa de pelo menos 300 hosts (/24 só tem 254)',
    },
  ];

  let teamName = '';
  let teamMembers = '';
  /** answers: { a1: { mask, hosts }, b1: { cidr, hosts }, c1: { cidr, mask } } */
  let answers = {};
  let blockPassed = { a: false, b: false, c: false };
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

  function ensureAnswers() {
    BLOCK_A.forEach((r) => {
      if (!answers[r.id]) answers[r.id] = { mask: '', hosts: '' };
    });
    BLOCK_B.forEach((r) => {
      if (!answers[r.id]) answers[r.id] = { cidr: '', hosts: '' };
    });
    BLOCK_C.forEach((r) => {
      if (!answers[r.id]) answers[r.id] = { cidr: '', mask: '' };
    });
  }

  function restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      answers = s.answers || {};
      blockPassed = s.blockPassed || { a: false, b: false, c: false };
      allPassedOnce = !!s.allPassedOnce;
    } catch {
      /* ignore */
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ answers, blockPassed, allPassedOnce })
    );
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function norm(s) {
    return String(s ?? '').trim().replace(/\s+/g, '');
  }

  function parseCidrInput(raw) {
    const t = norm(raw).replace(/^\//, '');
    if (!/^\d{1,2}$/.test(t)) return null;
    const n = Number(t);
    if (!Number.isInteger(n) || n < 0 || n > 32) return null;
    return n;
  }

  function parseHostsInput(raw) {
    const t = norm(raw).replace(/\./g, ''); // 65.534 aceito como 65534 se quiserem ponto
    // também aceita 65.534 estilo BR? vamos aceitar só dígitos e opcional ponto milhar
    const cleaned = norm(raw).replace(/\./g, '').replace(/,/g, '');
    if (!/^\d+$/.test(cleaned)) return null;
    return Number(cleaned);
  }

  function masksMatch(input, expectedMask) {
    const raw = norm(input);
    if (!raw) return false;
    if (raw === expectedMask) return true;
    // /CIDR equivalente
    const c = parseCidrInput(raw);
    if (c !== null) {
      const m = R.cidrToMask(c);
      return m !== null && R.intToIP(m) === expectedMask;
    }
    // máscara com espaços
    const parts = raw.split('.').map((p) => p.trim());
    if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
      return parts.map(Number).join('.') === expectedMask;
    }
    return false;
  }

  function renderAll() {
    renderBlockA();
    renderBlockB();
    renderBlockC();
    updateProgressUI();
    if (allPassedOnce) $('#success-banner')?.classList.add('show');
  }

  function inputHtml(id, field, placeholder, value) {
    return `<input type="text" class="cell-input" data-id="${esc(id)}" data-field="${esc(field)}"
      value="${esc(value || '')}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false" />`;
  }

  function renderBlockA() {
    const tbody = $('#tbody-a');
    if (!tbody) return;
    tbody.innerHTML = BLOCK_A.map((r) => {
      const a = answers[r.id] || {};
      return `<tr data-row="${esc(r.id)}">
        <td class="given"><code>/${r.cidr}</code></td>
        <td>${inputHtml(r.id, 'mask', '255.255.255.0', a.mask)}</td>
        <td>${inputHtml(r.id, 'hosts', '254', a.hosts)}</td>
      </tr>`;
    }).join('');
    setBlockBadge('a', blockPassed.a);
  }

  function renderBlockB() {
    const tbody = $('#tbody-b');
    if (!tbody) return;
    tbody.innerHTML = BLOCK_B.map((r) => {
      const a = answers[r.id] || {};
      return `<tr data-row="${esc(r.id)}">
        <td class="given"><code>${esc(r.mask)}</code></td>
        <td>${inputHtml(r.id, 'cidr', '24 ou /24', a.cidr)}</td>
        <td>${inputHtml(r.id, 'hosts', '254', a.hosts)}</td>
      </tr>`;
    }).join('');
    setBlockBadge('b', blockPassed.b);
  }

  function renderBlockC() {
    const tbody = $('#tbody-c');
    if (!tbody) return;
    tbody.innerHTML = BLOCK_C.map((r) => {
      const a = answers[r.id] || {};
      return `<tr data-row="${esc(r.id)}">
        <td class="given">
          <strong>≥ ${r.need} hosts</strong>
          <div class="row-hint">${esc(r.hint)}</div>
        </td>
        <td>${inputHtml(r.id, 'cidr', '26 ou /26', a.cidr)}</td>
        <td>${inputHtml(r.id, 'mask', '255.255.255.192', a.mask)}</td>
      </tr>`;
    }).join('');
    setBlockBadge('c', blockPassed.c);
  }

  function setBlockBadge(block, ok) {
    const el = $(`#badge-${block}`);
    if (!el) return;
    el.textContent = ok ? 'Correto' : 'Pendente';
    el.className = 'block-badge ' + (ok ? 'ok' : 'wait');
    $(`#block-${block}`)?.classList.toggle('passed', !!ok);
  }

  function bindEvents() {
    document.addEventListener('input', (e) => {
      const input = e.target.closest('.cell-input');
      if (!input) return;
      const id = input.dataset.id;
      const field = input.dataset.field;
      if (!answers[id]) answers[id] = {};
      answers[id][field] = input.value;
      input.classList.remove('ok', 'err');
      // invalidar bloco correspondente
      if (id.startsWith('a')) blockPassed.a = false;
      if (id.startsWith('b')) blockPassed.b = false;
      if (id.startsWith('c')) blockPassed.c = false;
      allPassedOnce = false;
      setBlockBadge('a', blockPassed.a);
      setBlockBadge('b', blockPassed.b);
      setBlockBadge('c', blockPassed.c);
      updateProgressUI();
      persistSession();
    });

    $('#btn-validate-a')?.addEventListener('click', () => validateBlock('a'));
    $('#btn-validate-b')?.addEventListener('click', () => validateBlock('b'));
    $('#btn-validate-c')?.addEventListener('click', () => validateBlock('c'));
    $('#btn-validate-all')?.addEventListener('click', validateAll);
    $('#btn-submit')?.addEventListener('click', submitResult);
    $('#btn-reset')?.addEventListener('click', resetAll);
  }

  function markCell(id, field, ok) {
    const input = document.querySelector(`.cell-input[data-id="${id}"][data-field="${field}"]`);
    if (!input) return;
    input.classList.remove('ok', 'err');
    input.classList.add(ok ? 'ok' : 'err');
  }

  function validateBlock(block, silent) {
    const issues = [];
    let ok = true;

    if (block === 'a') {
      BLOCK_A.forEach((r) => {
        const a = answers[r.id] || {};
        const maskOk = masksMatch(a.mask, r.mask);
        const hostsOk = parseHostsInput(a.hosts) === r.hosts;
        markCell(r.id, 'mask', maskOk);
        markCell(r.id, 'hosts', hostsOk);
        if (!maskOk) {
          ok = false;
          issues.push(`/${r.cidr}: máscara incorreta (esp. ${r.mask}).`);
        }
        if (!hostsOk) {
          ok = false;
          issues.push(`/${r.cidr}: hosts úteis incorretos (esp. ${r.hosts}).`);
        }
      });
    }

    if (block === 'b') {
      BLOCK_B.forEach((r) => {
        const a = answers[r.id] || {};
        const cidrOk = parseCidrInput(a.cidr) === r.cidr;
        const hostsOk = parseHostsInput(a.hosts) === r.hosts;
        markCell(r.id, 'cidr', cidrOk);
        markCell(r.id, 'hosts', hostsOk);
        if (!cidrOk) {
          ok = false;
          issues.push(`${r.mask}: CIDR incorreto (esp. /${r.cidr}).`);
        }
        if (!hostsOk) {
          ok = false;
          issues.push(`${r.mask}: hosts úteis incorretos (esp. ${r.hosts}).`);
        }
      });
    }

    if (block === 'c') {
      BLOCK_C.forEach((r) => {
        const a = answers[r.id] || {};
        const cidrOk = parseCidrInput(a.cidr) === r.cidr;
        const maskOk = masksMatch(a.mask, r.mask);
        markCell(r.id, 'cidr', cidrOk);
        markCell(r.id, 'mask', maskOk);
        if (!cidrOk) {
          ok = false;
          issues.push(`≥${r.need} hosts: CIDR incorreto (menor prefixo adequado: /${r.cidr}).`);
        }
        if (!maskOk) {
          ok = false;
          issues.push(`≥${r.need} hosts: máscara incorreta (esp. ${r.mask}).`);
        }
      });
    }

    blockPassed[block] = ok;
    persistSession();
    setBlockBadge(block, ok);
    showBlockResult(block, ok, issues);
    updateProgressUI();

    if (!silent) {
      const names = { a: 'Bloco A', b: 'Bloco B', c: 'Bloco C' };
      showToast(
        ok ? `${names[block]} correto!` : `${names[block]}: ${issues.length} erro(s).`,
        ok ? 'ok' : 'warn'
      );
    }
    return ok;
  }

  function showBlockResult(block, ok, issues) {
    const el = $(`#result-${block}`);
    if (!el) return;
    el.hidden = false;
    el.className = 'block-result ' + (ok ? 'ok' : 'err');
    if (ok) {
      el.innerHTML = `<strong>✓ Bloco ${block.toUpperCase()} validado com sucesso.</strong>`;
    } else {
      el.innerHTML = `
        <strong>✗ Ainda há erros neste bloco.</strong>
        <ul>${issues.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`;
    }
  }

  function validateAll() {
    const a = validateBlock('a', true);
    const b = validateBlock('b', true);
    const c = validateBlock('c', true);
    if (a && b && c) {
      showToast('Os 3 blocos estão corretos! Pode enviar o resultado.', 'ok');
    } else {
      showToast('Alguns blocos ainda têm erros.', 'warn');
    }
    updateProgressUI();
  }

  function updateProgressUI() {
    const n = ['a', 'b', 'c'].filter((k) => blockPassed[k]).length;
    const pill = $('#progress-pill');
    if (pill) pill.textContent = `${n} / 3 blocos corretos`;
    const btn = $('#btn-submit');
    if (btn) btn.disabled = n < 3 && !allPassedOnce;
    $('#ready-note')?.classList.toggle('show', n === 3);
  }

  function resetAll() {
    if (!confirm('Limpar todas as respostas dos 3 blocos?')) return;
    answers = {};
    blockPassed = { a: false, b: false, c: false };
    allPassedOnce = false;
    ensureAnswers();
    persistSession();
    $('#success-banner')?.classList.remove('show');
    ['a', 'b', 'c'].forEach((k) => {
      const el = $(`#result-${k}`);
      if (el) {
        el.hidden = true;
        el.innerHTML = '';
      }
    });
    renderAll();
    showToast('Tudo limpo.', 'ok');
  }

  function submitResult() {
    const a = validateBlock('a', true);
    const b = validateBlock('b', true);
    const c = validateBlock('c', true);
    if (!a || !b || !c) {
      showToast('Os 3 blocos precisam estar corretos para enviar.', 'warn');
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
          blocks: {
            a: BLOCK_A.map((r) => ({ cidr: r.cidr, mask: r.mask, hosts: r.hosts })),
            b: BLOCK_B.map((r) => ({ mask: r.mask, cidr: r.cidr, hosts: r.hosts })),
            c: BLOCK_C.map((r) => ({ need: r.need, cidr: r.cidr, mask: r.mask })),
          },
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
