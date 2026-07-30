/**
 * Painel do instrutor — equipes × exercícios (acesso com senha)
 */
(function () {
  'use strict';

  const R = window.SFTRedes;
  const $ = (sel) => document.querySelector(sel);

  /** Senha do painel (apenas instrutor) */
  const PANEL_PASSWORD = '123321';
  const AUTH_KEY = 'sft_redes_panel_auth_v1';

  let panelReady = false;

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1';
    } catch {
      return false;
    }
  }

  function setAuthenticated(ok) {
    try {
      if (ok) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  }

  function showLogin() {
    const gate = $('#auth-gate');
    const app = $('#app-shell');
    if (gate) gate.hidden = false;
    if (app) app.hidden = true;
    const input = $('#panel-password');
    if (input) {
      input.value = '';
      input.classList.remove('invalid');
      setTimeout(() => input.focus(), 50);
    }
    const err = $('#login-error');
    if (err) err.textContent = '';
  }

  function showApp() {
    const gate = $('#auth-gate');
    const app = $('#app-shell');
    if (gate) gate.hidden = true;
    if (app) app.hidden = false;
    if (!panelReady) {
      panelReady = true;
      initPanel();
    } else {
      render();
    }
  }

  function tryLogin(password) {
    const err = $('#login-error');
    const input = $('#panel-password');
    if (password === PANEL_PASSWORD) {
      setAuthenticated(true);
      if (err) err.textContent = '';
      if (input) input.classList.remove('invalid');
      showApp();
      return true;
    }
    if (input) {
      input.classList.add('invalid');
      input.select();
    }
    if (err) err.textContent = 'Senha incorreta. Tente novamente.';
    return false;
  }

  function logout() {
    setAuthenticated(false);
    showLogin();
  }

  function initAuth() {
    $('#login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pwd = ($('#panel-password')?.value || '').trim();
      tryLogin(pwd);
    });

    $('#btn-logout')?.addEventListener('click', logout);

    if (isAuthenticated()) {
      showApp();
    } else {
      showLogin();
    }
  }

  function initPanel() {
    renderTableHead();
    render();
    R.onProgressChange(() => {
      if (isAuthenticated()) render();
    });
    $('#btn-refresh')?.addEventListener('click', render);
    $('#btn-clear')?.addEventListener('click', () => {
      if (!confirm('Apagar todo o progresso de todas as equipes neste navegador?')) return;
      R.clearProgress();
      render();
    });
    $('#btn-export')?.addEventListener('click', exportJson);
    setInterval(updateClock, 30000);
  }

  function renderTableHead() {
    const row = $('#teams-thead-row');
    if (!row) return;
    const exHeads = R.EXERCISES.map(
      (ex) => `<th>Q${ex.number} — ${esc(shortTitle(ex.title))}</th>`
    ).join('');
    row.innerHTML = `<th>Equipe</th>${exHeads}<th>Última atividade</th>`;
  }

  function shortTitle(title) {
    const t = String(title || '');
    if (t.length <= 22) return t;
    return t.slice(0, 20) + '…';
  }

  function updateClock() {
    if (!isAuthenticated()) return;
    const data = R.loadProgress();
    const el = $('#last-sync');
    if (el) el.textContent = data.updatedAt ? R.formatDate(data.updatedAt) : '—';
  }

  function render() {
    if (!isAuthenticated()) return;

    const data = R.loadProgress();
    const teams = Object.values(data.teams || {}).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
    const exercises = R.EXERCISES;

    $('#team-count').textContent = String(teams.length);
    const countDone = (id) =>
      teams.filter((t) => t.completed && t.completed[id] && t.completed[id].passed).length;
    if ($('#done-q1')) $('#done-q1').textContent = String(countDone('q1'));
    if ($('#done-q2')) $('#done-q2').textContent = String(countDone('q2'));
    if ($('#done-q3')) $('#done-q3').textContent = String(countDone('q3'));
    if ($('#done-q4')) $('#done-q4').textContent = String(countDone('q4'));
    if ($('#done-q5')) $('#done-q5').textContent = String(countDone('q5'));
    if ($('#done-q6')) $('#done-q6').textContent = String(countDone('q6'));
    if ($('#done-q7')) $('#done-q7').textContent = String(countDone('q7'));
    if ($('#done-q8')) $('#done-q8').textContent = String(countDone('q8'));
    if ($('#done-q9')) $('#done-q9').textContent = String(countDone('q9'));
    if ($('#done-q10')) $('#done-q10').textContent = String(countDone('q10'));
    // compat se HTML antigo ainda tiver esses ids
    if ($('#done-count')) $('#done-count').textContent = String(countDone('q10'));
    if ($('#pending-count')) {
      $('#pending-count').textContent = String(Math.max(0, teams.length - countDone('q10')));
    }
    updateClock();

    const tbody = $('#teams-tbody');
    const empty = $('#empty-state');

    if (!teams.length) {
      if (tbody) tbody.innerHTML = '';
      if (empty) empty.hidden = false;
      renderCards([]);
      return;
    }
    if (empty) empty.hidden = true;

    if (tbody) {
      tbody.innerHTML = teams
        .map((team) => {
          const cells = exercises
            .map((ex) => {
              const c = team.completed && team.completed[ex.id];
              if (c && c.passed) {
                return `<td class="status done" title="${esc(R.formatDate(c.at))}">
                  <span class="pill ok">Concluído</span>
                  <small>${esc(R.formatDate(c.at))}</small>
                </td>`;
              }
              return `<td class="status pending"><span class="pill wait">Pendente</span></td>`;
            })
            .join('');

          return `<tr>
            <td class="team-name">
              <strong>${esc(team.name)}</strong>
              ${team.members ? `<small>${esc(team.members)}</small>` : ''}
            </td>
            ${cells}
            <td class="muted">${esc(R.formatDate(team.lastActivity || team.startedAt))}</td>
          </tr>`;
        })
        .join('');
    }

    renderCards(teams);
  }

  function formatExerciseDetails(exId, completed) {
    if (!completed || !completed.details) return '';
    const d = completed.details;

    if (exId === 'q10') {
      const rows = Object.values(d)
        .filter((x) => x && x.name && x.network)
        .map(
          (item) =>
            `<li><span>${esc(item.name)}</span><code>${esc(item.network)}</code> <em>gw ${esc(item.gateway)}</em></li>`
        )
        .join('');
      return rows ? `<ul class="detail-list">${rows}</ul>` : '';
    }

    if (exId === 'q9') {
      const parts = [];
      if (Array.isArray(d.lans)) {
        d.lans.forEach((lan) => {
          parts.push(
            `<li><span>${esc(lan.router)}</span><code>${esc(lan.network)}</code> <em>gw ${esc(lan.gateway)}</em></li>`
          );
        });
      }
      if (d.link) {
        parts.push(`<li><span>Enlace</span><code>${esc(d.link)}</code></li>`);
      }
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    if (exId === 'q3') {
      const rows = (Array.isArray(d.matches) ? d.matches : [])
        .map(
          (m) =>
            `<li><span>P${esc(m.problem)}</span><code>${esc(m.topology)}</code></li>`
        )
        .join('');
      return rows ? `<ul class="detail-list">${rows}</ul>` : '';
    }

    if (exId === 'q4') {
      const em = Array.isArray(d.emitter) ? d.emitter.join(' → ') : '';
      const rc = Array.isArray(d.receptor) ? d.receptor.join(' → ') : '';
      const parts = [];
      if (em) parts.push(`<li><span>Emissor</span><code>${esc(em)}</code></li>`);
      if (rc) parts.push(`<li><span>Receptor</span><code>${esc(rc)}</code></li>`);
      if (d.flow) parts.push(`<li><span>Fluxo</span><code>${esc(d.flow)}</code></li>`);
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    if (exId === 'q5') {
      const rows = (Array.isArray(d.exercises) ? d.exercises : [])
        .map(
          (ex) =>
            `<li><span>${esc(ex.title || ex.id)}</span><code>${esc(ex.network)}/${esc(ex.cidr)}</code> <em>${esc(ex.first)}–${esc(ex.last)}</em></li>`
        )
        .join('');
      return rows ? `<ul class="detail-list">${rows}</ul>` : '';
    }

    if (exId === 'q6') {
      const b = d.blocks || {};
      const parts = [];
      if (Array.isArray(b.a)) {
        parts.push(
          `<li><span>A CIDR→máscara</span><code>${b.a.length} itens</code></li>`
        );
      }
      if (Array.isArray(b.b)) {
        parts.push(
          `<li><span>B máscara→CIDR</span><code>${b.b.length} itens</code></li>`
        );
      }
      if (Array.isArray(b.c)) {
        parts.push(
          `<li><span>C hosts→prefixo</span><code>${b.c.map((x) => '≥' + x.need + '→/' + x.cidr).join(', ')}</code></li>`
        );
      }
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    if (exId === 'q7') {
      const rows = (Array.isArray(d.scenarios) ? d.scenarios : [])
        .map(
          (sc) =>
            `<li><span>${esc(sc.title)}</span><code>${esc(sc.base)}→/${esc(sc.newCidr)}</code> <em>${esc(sc.count)} sub-redes</em></li>`
        )
        .join('');
      return rows ? `<ul class="detail-list">${rows}</ul>` : '';
    }

    if (exId === 'q8') {
      const c = d.counts || {};
      const parts = ['PAN', 'LAN', 'MAN', 'WAN']
        .filter((k) => c[k] != null)
        .map((k) => `<li><span>${k}</span><code>${esc(c[k])} cenário(s)</code></li>`);
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    if (exId === 'q2') {
      const c = d.counts || {};
      const labels = [
        ['simplex', 'Simplex'],
        ['half', 'Half-duplex'],
        ['full', 'Full-duplex'],
        ['serial', 'Serial'],
        ['parallel', 'Paralela'],
      ];
      const parts = labels
        .filter(([k]) => c[k] != null)
        .map(([k, label]) => `<li><span>${esc(label)}</span><code>${esc(c[k])}</code></li>`);
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    if (exId === 'q1') {
      const parts = [];
      if (d.clients != null) parts.push(`<li><span>Clientes</span><code>${esc(d.clients)}</code></li>`);
      if (d.server != null) parts.push(`<li><span>Servidor</span><code>${esc(d.server)}</code></li>`);
      if (d.switch != null) parts.push(`<li><span>Switch</span><code>${esc(d.switch)}</code></li>`);
      if (d.links != null) parts.push(`<li><span>Cabos</span><code>${esc(d.links)}</code></li>`);
      return parts.length ? `<ul class="detail-list">${parts.join('')}</ul>` : '';
    }

    return '';
  }

  function renderCards(teams) {
    const grid = $('#cards-grid');
    if (!grid) return;

    if (!teams.length) {
      grid.innerHTML = '';
      return;
    }

    const exercises = R.EXERCISES;

    grid.innerHTML = teams
      .map((team) => {
        const anyDone = exercises.some((ex) => team.completed && team.completed[ex.id] && team.completed[ex.id].passed);
        const pills = exercises
          .map((ex) => {
            const c = team.completed && team.completed[ex.id];
            const ok = c && c.passed;
            return `<span class="pill ${ok ? 'ok' : 'wait'}">Q${ex.number} ${ok ? '✓' : '…'}</span>`;
          })
          .join(' ');

        const blocks = exercises
          .map((ex) => {
            const c = team.completed && team.completed[ex.id];
            if (c && c.passed) {
              return `
              <div class="ex-block">
                <p class="when">Q${ex.number} · ${esc(ex.title)} · ${esc(R.formatDate(c.at))} · nota ${c.score ?? 100}</p>
                ${formatExerciseDetails(ex.id, c)}
              </div>`;
            }
            return `<p class="when muted">Q${ex.number} · ainda não concluída</p>`;
          })
          .join('');

        return `
        <article class="team-card ${anyDone ? 'done' : 'pending'}">
          <div class="team-card-head">
            <div>
              <h3>${esc(team.name)}</h3>
              ${team.members ? `<p class="members">${esc(team.members)}</p>` : ''}
            </div>
            <div class="pill-stack">${pills}</div>
          </div>
          ${blocks}
        </article>`;
      })
      .join('');
  }

  function exportJson() {
    if (!isAuthenticated()) return;
    const data = R.loadProgress();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progresso-teste-redes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  document.addEventListener('DOMContentLoaded', initAuth);
})();
