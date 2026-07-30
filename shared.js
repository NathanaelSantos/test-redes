/**
 * SFT Redes — utilitários compartilhados (IP, progresso, painel)
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sft_redes_progress_v1';
  const TEAM_KEY = 'sft_redes_current_team_v1';
  const CHANNEL_NAME = 'sft_redes_progress';
  const TEST_ID = 'teste-redes-uc1';

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
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { testId: TEST_ID, teams: {}, updatedAt: null };
      }
      const data = JSON.parse(raw);
      if (!data.teams) data.teams = {};
      return data;
    } catch {
      return { testId: TEST_ID, teams: {}, updatedAt: null };
    }
  }

  function saveProgress(data) {
    data.updatedAt = new Date().toISOString();
    data.testId = data.testId || TEST_ID;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    broadcastProgress(data);
    return data;
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
    const empty = { testId: TEST_ID, teams: {}, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(empty));
    broadcastProgress(empty);
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
