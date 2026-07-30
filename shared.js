/**
 * SFT Redes — utilitários compartilhados (IP, progresso, painel)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sft_redes_progress_v1';
  const TEAM_KEY = 'sft_redes_current_team_v1';
  const CHANNEL_NAME = 'sft_redes_progress';
  const TEST_ID = 'teste-redes-uc1';
  /** API do server.js (mesma origem quando roda com node server.js) */
  const API_PROGRESS = '/api/progress';
  const API_HEALTH = '/api/health';

  let networkMode = null; // null = ainda não testou, true/false após probe
  let syncInFlight = null;

  // ---------- IP helpers ----------
  function parseIP(ip) {
    if (typeof ip !== 'string') return null;
    const parts = ip.trim().split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map((p) => {
      if (!/^\d+$/.test(p)) return NaN;
      return Number(p);
    });
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    return ((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
  }

  function intToIP(n) {
    n = n >>> 0;
    return [
      (n >>> 24) & 255,
      (n >>> 16) & 255,
      (n >>> 8) & 255,
      n & 255,
    ].join('.');
  }

  function isValidIP(ip) {
    return parseIP(ip) !== null;
  }

  function cidrToMask(cidr) {
    const c = Number(cidr);
    if (!Number.isInteger(c) || c < 0 || c > 32) return null;
    if (c === 0) return 0;
    return (0xffffffff << (32 - c)) >>> 0;
  }

  function maskToCidr(mask) {
    const m = typeof mask === 'number' ? mask : parseIP(mask);
    if (m === null) return null;
    // máscara contígua?
    const inv = (~m) >>> 0;
    if ((inv & (inv + 1)) !== 0) return null;
    let bits = 0;
    let x = m;
    for (let i = 0; i < 32; i++) {
      if (x & 0x80000000) bits++;
      else break;
      x = (x << 1) >>> 0;
    }
    // verificar se o resto é zero
    if (bits < 32 && (m << bits) >>> 0 !== 0) return null;
    return bits;
  }

  function networkOf(ip, cidrOrMask) {
    const ipInt = typeof ip === 'number' ? ip : parseIP(ip);
    if (ipInt === null) return null;
    let mask;
    if (typeof cidrOrMask === 'number' && cidrOrMask <= 32) {
      mask = cidrToMask(cidrOrMask);
    } else {
      mask = typeof cidrOrMask === 'number' ? cidrOrMask : parseIP(cidrOrMask);
      if (mask === null || maskToCidr(mask) === null) return null;
    }
    return (ipInt & mask) >>> 0;
  }

  function broadcastOf(ip, cidrOrMask) {
    const net = networkOf(ip, cidrOrMask);
    if (net === null) return null;
    let mask;
    if (typeof cidrOrMask === 'number' && cidrOrMask <= 32) {
      mask = cidrToMask(cidrOrMask);
    } else {
      mask = typeof cidrOrMask === 'number' ? cidrOrMask : parseIP(cidrOrMask);
    }
    const hostBits = (~mask) >>> 0;
    return (net | hostBits) >>> 0;
  }

  function hostCapacity(cidr) {
    const c = Number(cidr);
    if (!Number.isInteger(c) || c < 0 || c > 32) return null;
    if (c >= 31) return c === 31 ? 2 : 1; // /31 ponto-a-ponto, /32 host
    return Math.pow(2, 32 - c) - 2;
  }

  function sameSubnet(ip1, ip2, maskOrCidr) {
    const n1 = networkOf(ip1, maskOrCidr);
    const n2 = networkOf(ip2, maskOrCidr);
    if (n1 === null || n2 === null) return false;
    return n1 === n2;
  }

  function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  function subnetContains(parentNet, parentCidr, childNet, childCidr) {
    if (childCidr < parentCidr) return false;
    const pStart = networkOf(parentNet, parentCidr);
    const pEnd = broadcastOf(parentNet, parentCidr);
    const cStart = networkOf(childNet, childCidr);
    const cEnd = broadcastOf(childNet, childCidr);
    if (pStart === null || cStart === null) return false;
    return cStart >= pStart && cEnd <= pEnd;
  }

  // ---------- Progresso / equipes ----------
  function emptyProgress() {
    return { testId: TEST_ID, teams: {}, updatedAt: null };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyProgress();
      const data = JSON.parse(raw);
      if (!data.teams) data.teams = {};
      return data;
    } catch {
      return emptyProgress();
    }
  }

  /** Mescla dois snapshots (equipes de notebooks diferentes) */
  function mergeProgress(base, incoming) {
    const out = {
      testId: (incoming && incoming.testId) || (base && base.testId) || TEST_ID,
      teams: {},
      updatedAt: null,
    };
    const bTeams = (base && base.teams) || {};
    const iTeams = (incoming && incoming.teams) || {};
    const names = new Set([...Object.keys(bTeams), ...Object.keys(iTeams)]);

    for (const name of names) {
      const a = bTeams[name];
      const b = iTeams[name];
      if (!a) {
        out.teams[name] = JSON.parse(JSON.stringify(b));
        continue;
      }
      if (!b) {
        out.teams[name] = JSON.parse(JSON.stringify(a));
        continue;
      }

      const completed = {};
      const ids = new Set([
        ...Object.keys(a.completed || {}),
        ...Object.keys(b.completed || {}),
      ]);
      for (const id of ids) {
        const ca = (a.completed || {})[id];
        const cb = (b.completed || {})[id];
        if (ca && cb) {
          const ta = Date.parse(ca.at || 0) || 0;
          const tb = Date.parse(cb.at || 0) || 0;
          completed[id] = tb >= ta ? cb : ca;
        } else {
          completed[id] = ca || cb;
        }
      }

      const lastA = a.lastActivity || a.startedAt || null;
      const lastB = b.lastActivity || b.startedAt || null;
      let lastActivity = lastA || lastB;
      if (lastA && lastB) {
        lastActivity =
          (Date.parse(lastB) || 0) >= (Date.parse(lastA) || 0) ? lastB : lastA;
      }

      let startedAt = a.startedAt || b.startedAt || null;
      if (a.startedAt && b.startedAt) {
        startedAt =
          (Date.parse(a.startedAt) || 0) <= (Date.parse(b.startedAt) || 0)
            ? a.startedAt
            : b.startedAt;
      }

      out.teams[name] = {
        name,
        members: b.members || a.members || '',
        completed,
        startedAt,
        lastActivity,
      };
    }

    const tBase = base && base.updatedAt ? Date.parse(base.updatedAt) || 0 : 0;
    const tIn = incoming && incoming.updatedAt ? Date.parse(incoming.updatedAt) || 0 : 0;
    out.updatedAt = new Date(Math.max(tBase, tIn, Date.now())).toISOString();
    return out;
  }

  function writeLocalProgress(data) {
    data.updatedAt = data.updatedAt || new Date().toISOString();
    data.testId = data.testId || TEST_ID;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    broadcastProgress(data);
    return data;
  }

  function saveProgress(data) {
    data.updatedAt = new Date().toISOString();
    data.testId = data.testId || TEST_ID;
    writeLocalProgress(data);
    // envia ao servidor em rede (se existir) sem bloquear a UI
    pushProgressToServer(data);
    return data;
  }

  async function probeNetworkMode() {
    if (networkMode !== null) return networkMode;
    // file:// nunca tem API
    if (typeof location !== 'undefined' && location.protocol === 'file:') {
      networkMode = false;
      return false;
    }
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const t = ctrl ? setTimeout(() => ctrl.abort(), 1500) : null;
      const res = await fetch(API_HEALTH, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl ? ctrl.signal : undefined,
      });
      if (t) clearTimeout(t);
      networkMode = !!(res && res.ok);
    } catch {
      networkMode = false;
    }
    return networkMode;
  }

  async function pushProgressToServer(data) {
    try {
      const ok = await probeNetworkMode();
      if (!ok) return null;
      const res = await fetch(API_PROGRESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || loadProgress()),
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const remote = await res.json();
      // servidor devolve o merge global — atualiza cache local
      if (remote && remote.teams) {
        writeLocalProgress(remote);
        return remote;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Busca progresso do servidor e mescla com o local.
   * Use no painel (polling) e ao abrir o site.
   * @returns {Promise<object>} progresso atualizado
   */
  async function syncFromServer() {
    if (syncInFlight) return syncInFlight;
    syncInFlight = (async () => {
      try {
        const ok = await probeNetworkMode();
        if (!ok) return loadProgress();
        const res = await fetch(API_PROGRESS, { method: 'GET', cache: 'no-store' });
        if (!res.ok) return loadProgress();
        const remote = await res.json();
        const local = loadProgress();
        const merged = mergeProgress(local, remote);
        writeLocalProgress(merged);
        // se o local tinha algo a mais, reenvia
        const localNames = Object.keys(local.teams || {});
        const remoteNames = Object.keys(remote.teams || {});
        const localHasExtra =
          localNames.some((n) => !remote.teams[n]) ||
          localNames.some((n) => {
            const lc = Object.keys((local.teams[n] && local.teams[n].completed) || {});
            const rc = Object.keys((remote.teams[n] && remote.teams[n].completed) || {});
            return lc.some((id) => !rc.includes(id));
          });
        if (localHasExtra || localNames.length > remoteNames.length) {
          await pushProgressToServer(merged);
        }
        return loadProgress();
      } catch {
        return loadProgress();
      } finally {
        syncInFlight = null;
      }
    })();
    return syncInFlight;
  }

  function isNetworkMode() {
    return networkMode === true;
  }

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }

  function broadcastProgress(data) {
    if (channel) {
      try {
        channel.postMessage({ type: 'progress', data });
      } catch {
        /* ignore */
      }
    }
    // fallback storage event já cobre outras abas no mesmo origin
  }

  function onProgressChange(cb) {
    if (channel) {
      channel.onmessage = (ev) => {
        if (ev.data && ev.data.type === 'progress') cb(ev.data.data);
      };
    }
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          cb(JSON.parse(e.newValue));
        } catch {
          /* ignore */
        }
      }
    });
  }

  /**
   * Marca exercício concluído para a equipe.
   * @param {string} teamName
   * @param {string} exerciseId ex: 'q10'
   * @param {object} meta { score, details, members }
   */
  function markExerciseComplete(teamName, exerciseId, meta = {}) {
    const name = String(teamName || '').trim();
    if (!name) throw new Error('Nome da equipe é obrigatório.');
    const data = loadProgress();
    if (!data.teams[name]) {
      data.teams[name] = {
        name,
        members: meta.members || '',
        completed: {},
        startedAt: new Date().toISOString(),
      };
    }
    const team = data.teams[name];
    if (meta.members) team.members = meta.members;
    team.completed[exerciseId] = {
      at: new Date().toISOString(),
      score: meta.score ?? 100,
      title: meta.title || exerciseId,
      details: meta.details || {},
      passed: true,
    };
    team.lastActivity = new Date().toISOString();
    return saveProgress(data);
  }

  function registerTeam(teamName, members = '') {
    const name = String(teamName || '').trim();
    if (!name) throw new Error('Nome da equipe é obrigatório.');
    const data = loadProgress();
    if (!data.teams[name]) {
      data.teams[name] = {
        name,
        members: members || '',
        completed: {},
        startedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      };
    } else if (members) {
      data.teams[name].members = members;
      data.teams[name].lastActivity = new Date().toISOString();
    } else {
      data.teams[name].lastActivity = new Date().toISOString();
    }
    saveProgress(data);
    setCurrentTeam(name, members || data.teams[name].members || '');
    return data;
  }

  /** Equipe logada neste navegador (vale para todas as questões) */
  function getCurrentTeam() {
    try {
      const raw = localStorage.getItem(TEAM_KEY);
      if (!raw) return null;
      const t = JSON.parse(raw);
      if (!t || !t.name) return null;
      return { name: String(t.name), members: String(t.members || '') };
    } catch {
      return null;
    }
  }

  function setCurrentTeam(name, members = '') {
    const team = {
      name: String(name || '').trim(),
      members: String(members || '').trim(),
      at: new Date().toISOString(),
    };
    if (!team.name) {
      localStorage.removeItem(TEAM_KEY);
      return null;
    }
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
    return team;
  }

  function clearCurrentTeam() {
    localStorage.removeItem(TEAM_KEY);
  }

  /**
   * Garante equipe cadastrada no index. Se faltar, redireciona para index.html.
   * @returns {{ name: string, members: string } | null}
   */
  function requireCurrentTeam(options = {}) {
    const team = getCurrentTeam();
    if (team && team.name) return team;
    if (options.redirect !== false) {
      const here = (location.pathname.split('/').pop() || 'index.html') + (location.search || '');
      location.href = 'index.html?needTeam=1&from=' + encodeURIComponent(here);
    }
    return null;
  }

  function clearProgress() {
    const empty = emptyProgress();
    empty.updatedAt = new Date().toISOString();
    writeLocalProgress(empty);
    // limpa também no servidor (rede)
    (async () => {
      try {
        const ok = await probeNetworkMode();
        if (!ok) return;
        await fetch(API_PROGRESS, { method: 'DELETE', cache: 'no-store' });
      } catch {
        /* ignore */
      }
    })();
    return empty;
  }

  function listTeams() {
    const data = loadProgress();
    return Object.values(data.teams).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR');
    } catch {
      return iso;
    }
  }

  // Catálogo de exercícios do teste
  const EXERCISES = [
    { id: 'q1', number: 1, title: 'Rede cliente–servidor (figuras)', file: 'questao-01.html' },
    { id: 'q2', number: 2, title: 'Métodos de transmissão de dados', file: 'questao-02.html' },
    { id: 'q3', number: 3, title: 'Problemas × topologias de rede', file: 'questao-03.html' },
    { id: 'q4', number: 4, title: 'Comunicação nas 7 camadas OSI', file: 'questao-04.html' },
    { id: 'q5', number: 5, title: 'Identificação de endereços IP (3 exercícios)', file: 'questao-05.html' },
    { id: 'q6', number: 6, title: 'Máscaras de rede e CIDR', file: 'questao-06.html' },
    { id: 'q7', number: 7, title: 'Listar sub-redes a partir da rede', file: 'questao-07.html' },
    { id: 'q8', number: 8, title: 'Tipos de rede por abrangência (PAN, LAN, MAN, WAN)', file: 'questao-08.html' },
    { id: 'q9', number: 9, title: 'Duas redes interligadas por roteadores', file: 'questao-09.html' },
    { id: 'q10', number: 10, title: 'Sub-redes por departamento (VLSM)', file: 'questao-10.html' },
  ];

  global.SFTRedes = {
    STORAGE_KEY,
    TEAM_KEY,
    TEST_ID,
    EXERCISES,
    parseIP,
    intToIP,
    isValidIP,
    cidrToMask,
    maskToCidr,
    networkOf,
    broadcastOf,
    hostCapacity,
    sameSubnet,
    rangesOverlap,
    subnetContains,
    loadProgress,
    saveProgress,
    mergeProgress,
    onProgressChange,
    markExerciseComplete,
    registerTeam,
    getCurrentTeam,
    setCurrentTeam,
    clearCurrentTeam,
    requireCurrentTeam,
    clearProgress,
    listTeams,
    formatDate,
    syncFromServer,
    pushProgressToServer,
    probeNetworkMode,
    isNetworkMode,
  };

  // Ao carregar qualquer página servida pelo server.js, puxa o progresso da rede
  if (typeof document !== 'undefined') {
    const bootSync = () => {
      syncFromServer().catch(() => {});
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bootSync);
    } else {
      bootSync();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
