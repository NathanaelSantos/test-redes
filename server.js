/**
 * Servidor local — Teste de Redes (SFT)
 *
 * Serve os arquivos estáticos e guarda o progresso de TODAS as equipes
 * em um único arquivo (data/progress.json), para o painel do instrutor
 * ver notebooks na mesma rede.
 *
 * Uso:
 *   node server.js
 *   Depois compartilhe: http://SEU-IP:3000
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'progress.json');
const TEST_ID = 'teste-redes-uc1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function emptyProgress() {
  return { testId: TEST_ID, teams: {}, updatedAt: null };
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(emptyProgress(), null, 2), 'utf8');
  }
}

function readProgress() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return emptyProgress();
    if (!data.teams || typeof data.teams !== 'object') data.teams = {};
    data.testId = data.testId || TEST_ID;
    return data;
  } catch {
    return emptyProgress();
  }
}

function writeProgress(data) {
  ensureDataFile();
  const out = {
    testId: data.testId || TEST_ID,
    teams: data.teams || {},
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(out, null, 2), 'utf8');
  return out;
}

/** Mescla progresso de vários clientes sem perder equipes/exercícios */
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
      out.teams[name] = structuredClone(b);
      continue;
    }
    if (!b) {
      out.teams[name] = structuredClone(a);
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

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX = 2 * 1024 * 1024;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function safePath(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  // impede path traversal
  const resolved = path.normalize(path.join(ROOT, p));
  if (!resolved.startsWith(ROOT)) return null;
  // não servir a pasta data/ nem server.js por engano via path estranho — ok servir server se quiser, mas data não
  if (resolved.startsWith(DATA_DIR)) return null;
  return resolved;
}

async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // GET /api/progress — progresso global
  if (pathname === '/api/progress' && req.method === 'GET') {
    sendJson(res, 200, readProgress());
    return;
  }

  // POST /api/progress — mescla e grava (cliente envia snapshot completo ou parcial)
  if (pathname === '/api/progress' && (req.method === 'POST' || req.method === 'PUT')) {
    try {
      const body = await readBody(req);
      if (!body || typeof body !== 'object') {
        sendJson(res, 400, { error: 'JSON inválido' });
        return;
      }
      const current = readProgress();
      const merged = mergeProgress(current, body);
      const saved = writeProgress(merged);
      sendJson(res, 200, saved);
    } catch (e) {
      sendJson(res, 400, { error: e.message || 'Erro ao processar' });
    }
    return;
  }

  // DELETE /api/progress — limpa tudo (instrutor)
  if (pathname === '/api/progress' && req.method === 'DELETE') {
    const saved = writeProgress(emptyProgress());
    sendJson(res, 200, saved);
    return;
  }

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      mode: 'network-sync',
      teams: Object.keys(readProgress().teams || {}).length,
      time: new Date().toISOString(),
    });
    return;
  }

  sendJson(res, 404, { error: 'API não encontrada' });
}

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — arquivo não encontrado');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': ext === '.html' || ext === '.js' ? 'no-cache' : 'public, max-age=3600',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url || '/').split('?')[0];

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed');
      return;
    }

    const filePath = safePath(pathname);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    serveStatic(req, res, filePath);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno');
    }
  }
});

function localIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

ensureDataFile();

server.listen(PORT, HOST, () => {
  const ips = localIPs();
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   Teste de Redes · servidor com sync em rede     ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Local:     http://127.0.0.1:${PORT}`);
  if (ips.length) {
    ips.forEach((ip) => {
      console.log(`  Na rede:   http://${ip}:${PORT}`);
    });
  } else {
    console.log('  Na rede:   (não achei IP — confira o Wi‑Fi/Ethernet)');
  }
  console.log('');
  console.log('  → Alunos abrem o link "Na rede" no notebook.');
  console.log('  → Instrutor abre o mesmo link + /painel.html');
  console.log('  → Progresso fica em data/progress.json');
  console.log('');
  console.log('  Ctrl+C para parar.');
  console.log('');
});
