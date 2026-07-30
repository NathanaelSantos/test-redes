/**
 * Questão 10 — Sub-redes por departamento (VLSM)
 * A equipe configura a rede da empresa e valida no final.
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const EXERCISE_ID = 'q10';
  const EXERCISE_TITLE = 'Sub-redes por departamento (VLSM)';

  /**
   * Cenário da empresa TechNova
   * Rede base: 192.168.10.0/24 (256 endereços)
   * A equipe deve particionar em sub-redes sem sobreposição,
   * com capacidade mínima de hosts por departamento.
   */
  const SCENARIO = {
    company: 'TechNova Soluções',
    baseNetwork: '192.168.10.0',
    baseCidr: 24,
    departments: [
      { id: 'ti', name: 'TI', hosts: 50, color: '#22d3ee', hint: 'Maior departamento — precisa de /26 ou maior' },
      { id: 'vendas', name: 'Vendas', hosts: 25, color: '#a78bfa', hint: 'Precisa de pelo menos /27' },
      { id: 'rh', name: 'RH', hosts: 12, color: '#34d399', hint: 'Precisa de pelo menos /28' },
      { id: 'financeiro', name: 'Financeiro', hosts: 10, color: '#fbbf24', hint: 'Precisa de pelo menos /28' },
      { id: 'diretoria', name: 'Diretoria', hosts: 5, color: '#f472b6', hint: 'Pode usar /29' },
    ],
  };

  // Referência opcional (VLSM clássico) — usada só na dica pós-validação
  const EXAMPLE_PLAN = [
    { id: 'ti', network: '192.168.10.0', cidr: 26 },
    { id: 'vendas', network: '192.168.10.64', cidr: 27 },
    { id: 'rh', network: '192.168.10.96', cidr: 28 },
    { id: 'financeiro', network: '192.168.10.112', cidr: 28 },
    { id: 'diretoria', network: '192.168.10.128', cidr: 29 },
  ];

  let teamName = '';
  let teamMembers = '';
  let config = {}; // deptId -> fields
  let passedOnce = false;

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function init() {
    if (!loadTeam()) return;
    restoreSession();
    renderScenario();
    renderConfigTable();
    bindEvents();
    updateTeamUI();
    updateTopologyPreview();
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
      const raw = sessionStorage.getItem('sft_q10_session');
      if (raw) {
        const s = JSON.parse(raw);
        config = s.config || {};
        passedOnce = !!s.passedOnce;
      }
    } catch {
      /* ignore */
    }
  }

  function persistSession() {
    sessionStorage.setItem(
      'sft_q10_session',
      JSON.stringify({ config, passedOnce })
    );
  }

  function renderScenario() {
    const list = $('#dept-list');
    if (!list) return;
    list.innerHTML = SCENARIO.departments
      .map(
        (d) => `
      <div class="dept-card" style="--dept-color:${d.color}">
        <div class="dept-icon">${d.name.slice(0, 2).toUpperCase()}</div>
        <div class="dept-info">
          <strong>${d.name}</strong>
          <span>${d.hosts} hosts úteis mínimos</span>
        </div>
      </div>`
      )
      .join('');

    const baseLabel = `${SCENARIO.baseNetwork}/${SCENARIO.baseCidr}`;
    if ($('#base-network')) $('#base-network').textContent = baseLabel;
    if ($('#base-network-kpi')) $('#base-network-kpi').textContent = baseLabel;
    if ($('#company-name')) $('#company-name').textContent = SCENARIO.company;
    if ($('#company-name-inline')) $('#company-name-inline').textContent = SCENARIO.company;
    const totalHosts = SCENARIO.departments.reduce((s, d) => s + d.hosts, 0);
    if ($('#total-hosts')) $('#total-hosts').textContent = String(totalHosts);
  }

  function emptyDeptConfig() {
    return {
      network: '',
      cidr: '',
      mask: '',
      first: '',
      last: '',
      broadcast: '',
      gateway: '',
    };
  }

  function getDeptConfig(id) {
    if (!config[id]) config[id] = emptyDeptConfig();
    return config[id];
  }

  function renderConfigTable() {
    const tbody = $('#config-tbody');
    if (!tbody) return;
    tbody.innerHTML = SCENARIO.departments
      .map((d) => {
        const c = getDeptConfig(d.id);
        return `
        <tr data-dept="${d.id}" style="--dept-color:${d.color}">
          <td class="dept-cell">
            <span class="dot"></span>
            <div>
              <strong>${d.name}</strong>
              <small>≥ ${d.hosts} hosts</small>
            </div>
          </td>
          <td><input type="text" data-field="network" value="${esc(c.network)}" placeholder="192.168.10.x" autocomplete="off" spellcheck="false" /></td>
          <td><input type="number" data-field="cidr" value="${esc(c.cidr)}" min="24" max="30" placeholder="/xx" /></td>
          <td><input type="text" data-field="mask" value="${esc(c.mask)}" placeholder="255.255.255.x" autocomplete="off" spellcheck="false" /></td>
          <td><input type="text" data-field="first" value="${esc(c.first)}" placeholder="1º útil" autocomplete="off" spellcheck="false" /></td>
          <td><input type="text" data-field="last" value="${esc(c.last)}" placeholder="Último útil" autocomplete="off" spellcheck="false" /></td>
          <td><input type="text" data-field="broadcast" value="${esc(c.broadcast)}" placeholder="Broadcast" autocomplete="off" spellcheck="false" /></td>
          <td><input type="text" data-field="gateway" value="${esc(c.gateway)}" placeholder="Gateway" autocomplete="off" spellcheck="false" /></td>
          <td class="actions-cell">
            <button type="button" class="btn-mini" data-action="calc" title="Preencher 1º/último/broadcast a partir da rede e CIDR">⚙ Auto</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function bindEvents() {
    $('#btn-validate')?.addEventListener('click', () => runValidation(true));
    $('#btn-reset')?.addEventListener('click', resetConfig);
    $('#btn-fill-example')?.addEventListener('click', fillExample);
    $('#btn-toggle-hint')?.addEventListener('click', () => {
      $('#hint-box')?.classList.toggle('open');
    });

    $('#config-tbody')?.addEventListener('input', (e) => {
      const tr = e.target.closest('tr[data-dept]');
      if (!tr) return;
      const dept = tr.dataset.dept;
      const field = e.target.dataset.field;
      if (!field) return;
      const c = getDeptConfig(dept);
      c[field] = e.target.value.trim();

      // Sincroniza máscara a partir do CIDR
      if (field === 'cidr' && c.cidr !== '') {
        const maskInt = R.cidrToMask(Number(c.cidr));
        if (maskInt !== null) {
          c.mask = R.intToIP(maskInt);
          const maskInput = tr.querySelector('[data-field="mask"]');
          if (maskInput) maskInput.value = c.mask;
        }
      }
      // Sincroniza CIDR a partir da máscara
      if (field === 'mask' && R.isValidIP(c.mask)) {
        const cidr = R.maskToCidr(c.mask);
        if (cidr !== null) {
          c.cidr = String(cidr);
          const cidrInput = tr.querySelector('[data-field="cidr"]');
          if (cidrInput) cidrInput.value = c.cidr;
        }
      }

      persistSession();
      updateTopologyPreview();
      clearFieldError(e.target);
    });

    $('#config-tbody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="calc"]');
      if (!btn) return;
      const tr = btn.closest('tr[data-dept]');
      if (!tr) return;
      autoFillRow(tr.dataset.dept);
    });
  }

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
    if (passedOnce) {
      $('#success-banner')?.classList.add('show');
    }
  }

  function autoFillRow(deptId) {
    const c = getDeptConfig(deptId);
    const tr = document.querySelector(`tr[data-dept="${deptId}"]`);
    if (!R.isValidIP(c.network) || c.cidr === '') {
      showToast('Informe rede e CIDR válidos antes de usar o Auto.', 'warn');
      return;
    }
    const cidr = Number(c.cidr);
    if (!Number.isInteger(cidr) || cidr < 1 || cidr > 30) {
      showToast('CIDR inválido (use entre 1 e 30).', 'warn');
      return;
    }
    const net = R.networkOf(c.network, cidr);
    const bcast = R.broadcastOf(c.network, cidr);
    if (net === null || bcast === null) return;

    // Alinha o endereço de rede
    c.network = R.intToIP(net);
    c.mask = R.intToIP(R.cidrToMask(cidr));
    c.first = R.intToIP(net + 1);
    c.last = R.intToIP(bcast - 1);
    c.broadcast = R.intToIP(bcast);
    c.gateway = c.first; // padrão: primeiro host = gateway do roteador

    if (tr) {
      tr.querySelector('[data-field="network"]').value = c.network;
      tr.querySelector('[data-field="mask"]').value = c.mask;
      tr.querySelector('[data-field="first"]').value = c.first;
      tr.querySelector('[data-field="last"]').value = c.last;
      tr.querySelector('[data-field="broadcast"]').value = c.broadcast;
      tr.querySelector('[data-field="gateway"]').value = c.gateway;
    }
    persistSession();
    updateTopologyPreview();
    showToast(`Campos de ${deptId.toUpperCase()} calculados.`, 'ok');
  }

  function fillExample() {
    if (!confirm('Preencher com um plano VLSM de exemplo? Isso substitui a configuração atual.')) return;
    EXAMPLE_PLAN.forEach((p) => {
      const c = getDeptConfig(p.id);
      c.network = p.network;
      c.cidr = String(p.cidr);
      c.mask = R.intToIP(R.cidrToMask(p.cidr));
      const net = R.networkOf(p.network, p.cidr);
      const bcast = R.broadcastOf(p.network, p.cidr);
      c.first = R.intToIP(net + 1);
      c.last = R.intToIP(bcast - 1);
      c.broadcast = R.intToIP(bcast);
      c.gateway = c.first;
    });
    renderConfigTable();
    persistSession();
    updateTopologyPreview();
    showToast('Plano de exemplo carregado. Ainda é preciso validar.', 'ok');
  }

  function resetConfig() {
    if (!confirm('Limpar toda a configuração das sub-redes?')) return;
    config = {};
    passedOnce = false;
    SCENARIO.departments.forEach((d) => getDeptConfig(d.id));
    renderConfigTable();
    persistSession();
    updateTopologyPreview();
    $('#validation-panel')?.classList.remove('show');
    $('#success-banner')?.classList.remove('show');
    showToast('Configuração limpa.', 'ok');
  }

  function clearFieldError(el) {
    el?.classList.remove('invalid');
  }

  function markField(deptId, field, invalid) {
    const input = document.querySelector(`tr[data-dept="${deptId}"] [data-field="${field}"]`);
    if (!input) return;
    if (invalid) input.classList.add('invalid');
    else input.classList.remove('invalid');
  }

  // ---------- Validação ----------
  function runValidation(logToPanel) {
    // limpa destaques
    $$('#config-tbody input').forEach((el) => el.classList.remove('invalid'));

    const issues = [];
    const okItems = [];

    if (!teamName) {
      issues.push({
        level: 'err',
        msg: 'Cadastre a equipe no início do teste (index).',
      });
      renderValidation(issues, okItems);
      showToast('Cadastre a equipe no início do teste.', 'warn');
      return false;
    }

    const baseNet = R.parseIP(SCENARIO.baseNetwork);
    const baseCidr = SCENARIO.baseCidr;
    const baseStart = R.networkOf(baseNet, baseCidr);
    const baseEnd = R.broadcastOf(baseNet, baseCidr);

    const parsed = [];

    SCENARIO.departments.forEach((dept) => {
      const c = getDeptConfig(dept.id);
      const prefix = `[${dept.name}]`;

      // Campos obrigatórios
      const required = ['network', 'cidr', 'mask', 'first', 'last', 'broadcast', 'gateway'];
      let empty = false;
      required.forEach((f) => {
        if (!String(c[f] ?? '').trim()) {
          markField(dept.id, f, true);
          empty = true;
        }
      });
      if (empty) {
        issues.push({ level: 'err', msg: `${prefix} Preencha todos os campos.` });
        return;
      }

      const cidr = Number(c.cidr);
      if (!Number.isInteger(cidr) || cidr < baseCidr || cidr > 30) {
        markField(dept.id, 'cidr', true);
        issues.push({
          level: 'err',
          msg: `${prefix} CIDR inválido (use ${baseCidr}–30, sub-rede da base /${baseCidr}).`,
        });
        return;
      }

      if (!R.isValidIP(c.network)) {
        markField(dept.id, 'network', true);
        issues.push({ level: 'err', msg: `${prefix} Endereço de rede inválido.` });
        return;
      }
      if (!R.isValidIP(c.mask)) {
        markField(dept.id, 'mask', true);
        issues.push({ level: 'err', msg: `${prefix} Máscara inválida.` });
        return;
      }

      const maskCidr = R.maskToCidr(c.mask);
      if (maskCidr === null) {
        markField(dept.id, 'mask', true);
        issues.push({ level: 'err', msg: `${prefix} Máscara não é contígua (ex.: 255.255.255.192).` });
        return;
      }
      if (maskCidr !== cidr) {
        markField(dept.id, 'mask', true);
        markField(dept.id, 'cidr', true);
        issues.push({
          level: 'err',
          msg: `${prefix} Máscara ${c.mask} não corresponde ao /${cidr} (deveria ser ${R.intToIP(R.cidrToMask(cidr))}).`,
        });
        return;
      }

      const netInt = R.networkOf(c.network, cidr);
      const bcastInt = R.broadcastOf(c.network, cidr);
      const aligned = R.parseIP(c.network) === netInt;

      if (!aligned) {
        markField(dept.id, 'network', true);
        issues.push({
          level: 'err',
          msg: `${prefix} ${c.network} não é o endereço de rede de /${cidr}. Correto: ${R.intToIP(netInt)}.`,
        });
        return;
      }

      // Dentro da rede base
      if (!R.subnetContains(baseStart, baseCidr, netInt, cidr)) {
        markField(dept.id, 'network', true);
        issues.push({
          level: 'err',
          msg: `${prefix} Sub-rede fora da rede base ${SCENARIO.baseNetwork}/${baseCidr}.`,
        });
        return;
      }

      // Capacidade de hosts
      const capacity = R.hostCapacity(cidr);
      if (capacity < dept.hosts) {
        markField(dept.id, 'cidr', true);
        issues.push({
          level: 'err',
          msg: `${prefix} /${cidr} comporta ${capacity} hosts, mas precisa de ≥ ${dept.hosts}.`,
        });
        return;
      }
      okItems.push(`${prefix} Capacidade OK (${capacity} hosts ≥ ${dept.hosts}).`);

      // first / last / broadcast / gateway
      const expectedFirst = netInt + 1;
      const expectedLast = bcastInt - 1;
      const expectedBcast = bcastInt;

      if (!R.isValidIP(c.first) || R.parseIP(c.first) !== expectedFirst) {
        markField(dept.id, 'first', true);
        issues.push({
          level: 'err',
          msg: `${prefix} 1º host útil incorreto. Esperado: ${R.intToIP(expectedFirst)}.`,
        });
      } else {
        okItems.push(`${prefix} 1º host útil correto.`);
      }

      if (!R.isValidIP(c.last) || R.parseIP(c.last) !== expectedLast) {
        markField(dept.id, 'last', true);
        issues.push({
          level: 'err',
          msg: `${prefix} Último host útil incorreto. Esperado: ${R.intToIP(expectedLast)}.`,
        });
      } else {
        okItems.push(`${prefix} Último host útil correto.`);
      }

      if (!R.isValidIP(c.broadcast) || R.parseIP(c.broadcast) !== expectedBcast) {
        markField(dept.id, 'broadcast', true);
        issues.push({
          level: 'err',
          msg: `${prefix} Broadcast incorreto. Esperado: ${R.intToIP(expectedBcast)}.`,
        });
      } else {
        okItems.push(`${prefix} Broadcast correto.`);
      }

      if (!R.isValidIP(c.gateway)) {
        markField(dept.id, 'gateway', true);
        issues.push({ level: 'err', msg: `${prefix} Gateway inválido.` });
      } else {
        const gw = R.parseIP(c.gateway);
        if (gw < expectedFirst || gw > expectedLast) {
          markField(dept.id, 'gateway', true);
          issues.push({
            level: 'err',
            msg: `${prefix} Gateway deve estar entre ${R.intToIP(expectedFirst)} e ${R.intToIP(expectedLast)}.`,
          });
        } else {
          okItems.push(`${prefix} Gateway na faixa útil.`);
        }
      }

      parsed.push({
        dept,
        netInt,
        bcastInt,
        cidr,
        capacity,
        gateway: c.gateway,
        network: R.intToIP(netInt),
      });
    });

    // Sobreposição
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const a = parsed[i];
        const b = parsed[j];
        if (R.rangesOverlap(a.netInt, a.bcastInt, b.netInt, b.bcastInt)) {
          issues.push({
            level: 'err',
            msg: `Sobreposição: ${a.dept.name} (${a.network}/${a.cidr}) e ${b.dept.name} (${b.network}/${b.cidr}).`,
          });
          markField(a.dept.id, 'network', true);
          markField(b.dept.id, 'network', true);
        }
      }
    }

    if (parsed.length === SCENARIO.departments.length && issues.filter((i) => i.level === 'err').length === 0) {
      okItems.push('Nenhuma sobreposição entre sub-redes.');
      okItems.push(`Todas as sub-redes estão dentro de ${SCENARIO.baseNetwork}/${baseCidr}.`);
    }

    const errors = issues.filter((i) => i.level === 'err');
    const passed = errors.length === 0 && parsed.length === SCENARIO.departments.length;

    if (logToPanel) renderValidation(issues, okItems, passed);

    if (passed) {
      onPass(parsed);
    } else if (logToPanel) {
      showToast(`${errors.length} erro(s) encontrado(s). Corrija e valide novamente.`, 'err');
    }

    return passed;
  }

  function onPass(parsed) {
    passedOnce = true;
    persistSession();

    const details = {};
    parsed.forEach((p) => {
      details[p.dept.id] = {
        name: p.dept.name,
        network: `${p.network}/${p.cidr}`,
        capacity: p.capacity,
        gateway: p.gateway,
      };
    });

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
    updateTopologyPreview(true);
    showToast('Exercício concluído! O painel do instrutor já mostra sua equipe.', 'ok');
  }

  function renderValidation(issues, okItems, passed) {
    const panel = $('#validation-panel');
    const list = $('#validation-list');
    const summary = $('#validation-summary');
    if (!panel || !list) return;

    panel.classList.add('show');
    const errors = issues.filter((i) => i.level === 'err');
    const warns = issues.filter((i) => i.level === 'warn');

    if (summary) {
      if (passed) {
        summary.className = 'val-summary ok';
        summary.textContent = '✓ Validação aprovada — todas as sub-redes estão corretas.';
      } else {
        summary.className = 'val-summary err';
        summary.textContent = `✗ ${errors.length} erro(s)${warns.length ? `, ${warns.length} aviso(s)` : ''} — corrija e valide de novo.`;
      }
    }

    const parts = [];
    issues.forEach((i) => {
      parts.push(`<div class="val-item ${i.level}">${esc(i.msg)}</div>`);
    });
    if (passed && okItems.length) {
      okItems.forEach((m) => {
        parts.push(`<div class="val-item ok">${esc(m)}</div>`);
      });
    }
    list.innerHTML = parts.join('') || '<div class="val-item">Nenhum item.</div>';
  }

  // ---------- Preview visual ----------
  function updateTopologyPreview(allOk) {
    const el = $('#topo-preview');
    if (!el) return;

    const base = `
      <div class="topo-node router">
        <div class="topo-icon">📡</div>
        <div class="topo-label">Roteador</div>
        <div class="topo-meta">${SCENARIO.baseNetwork}/${SCENARIO.baseCidr}</div>
      </div>
      <div class="topo-links">`;

    const cards = SCENARIO.departments
      .map((d) => {
        const c = getDeptConfig(d.id);
        const hasNet = R.isValidIP(c.network) && c.cidr;
        const cidr = Number(c.cidr);
        let status = 'empty';
        let meta = 'não configurado';
        if (hasNet && Number.isInteger(cidr)) {
          const net = R.networkOf(c.network, cidr);
          if (net !== null) {
            meta = `${R.intToIP(net)}/${cidr}`;
            const cap = R.hostCapacity(cidr);
            status = cap >= d.hosts ? 'ok' : 'warn';
            if (allOk) status = 'ok';
          }
        }
        return `
        <div class="topo-node dept ${status}" style="--dept-color:${d.color}">
          <div class="topo-icon">💻</div>
          <div class="topo-label">${d.name}</div>
          <div class="topo-meta">${meta}</div>
          <div class="topo-hosts">≥ ${d.hosts} hosts</div>
        </div>`;
      })
      .join('');

    el.innerHTML = base + cards + '</div>';
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
    showToast._timer = setTimeout(() => t.classList.remove('show'), 4200);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
