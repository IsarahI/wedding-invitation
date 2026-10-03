// server.mjs — 청첩장 정적 서빙 + 축하 한마디 API (Node 22.13+ / 24, 외부 패키지 없음)
//
//  시작할 때   static/build.sh 로 dist/ 를 만듭니다. (invitation.conf → dist/, GUESTBOOK_API_BASE=/api)
//  요청마다    dist/ 의 파일을 내보내고, /api/guestbook 은 SQLite 에 저장·조회합니다.
//
// 환경 변수
//   PORT          기본 8080
//   CONF_PATH     기본 /conf/invitation.conf
//   APP_DIR       기본 /app          (static/ 과 dist/ 가 있는 곳)
//   DATA_DIR      기본 /data         (guestbook.db 가 저장되는 곳 — docker volume)
//   ADMIN_TOKEN   설정하면 DELETE /api/guestbook/:id 로 부적절한 글을 지울 수 있습니다.
//   TRUST_PROXY   1 이면 X-Forwarded-For 의 IP 를 씁니다. (nginx, Caddy 같은 reverse proxy 뒤에서만)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT) || 8080;
const APP = process.env.APP_DIR || '/app';
const CONF = process.env.CONF_PATH || '/conf/invitation.conf';
const DATA = process.env.DATA_DIR || '/data';
const DIST = path.join(APP, 'dist');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const MAX_MSG = 200, MAX_NAME = 20, PAGE_MAX = 30;
const RATE_LIMIT = 5, RATE_WINDOW_MS = 10 * 60 * 1000;   // IP 하나당 10분에 5개

/* ---------- 1. dist/ 만들기 ---------- */
if (!fs.existsSync(CONF)) {
  console.error(`설정 파일이 없습니다: ${CONF}\n  with-guestbook/invitation.conf 를 만들고 docker-compose.yml 의 volume 으로 연결하세요.`);
  process.exit(1);
}
const build = spawnSync('sh', [path.join(APP, 'static/build.sh'), '--conf', CONF, '--out', DIST, '--set', 'GUESTBOOK_API_BASE=/api'], { stdio: 'inherit' });
if (build.status !== 0) { console.error('build.sh 가 실패했습니다.'); process.exit(1); }

/* ---------- 2. 데이터베이스 ---------- */
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'guestbook.db'));
db.exec(`CREATE TABLE IF NOT EXISTS messages (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  ts   INTEGER NOT NULL,
  name TEXT    NOT NULL,
  msg  TEXT    NOT NULL
)`);
const qInsert = db.prepare('INSERT INTO messages (ts, name, msg) VALUES (?, ?, ?)');
const qFirst = db.prepare('SELECT id, ts, name, msg FROM messages ORDER BY id DESC LIMIT ?');
const qBefore = db.prepare('SELECT id, ts, name, msg FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?');
const qCount = db.prepare('SELECT COUNT(*) AS n FROM messages');
const qDelete = db.prepare('DELETE FROM messages WHERE id = ?');

/* ---------- 3. 도우미 ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const SECURITY = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY });
  res.end(JSON.stringify(body));
}
function clientIp(req) {
  if (TRUST_PROXY) { const xf = req.headers['x-forwarded-for']; if (xf) return String(xf).split(',')[0].trim(); }
  return req.socket.remoteAddress || 'unknown';
}
const hits = new Map();   // ip → [timestamp...]
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) { hits.set(ip, arr); return true; }
  arr.push(now); hits.set(ip, arr); return false;
}
setInterval(() => { const now = Date.now(); for (const [ip, a] of hits) if (!a.some(t => now - t < RATE_WINDOW_MS)) hits.delete(ip); }, 60 * 1000).unref();

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const clean = (s, max) => [...String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()].slice(0, max).join('');
const row = r => ({ id: Number(r.id), ts: Number(r.ts), name: r.name, msg: r.msg });

/* ---------- 4. 축하 API ---------- */
//  GET    /api/guestbook?limit=10&before=<id>   → { count, recent:[{id,ts,name,msg}], next:<id|null> }
//  POST   /api/guestbook   { name?, msg }       → 201 { ok:true, item:{...} }
//  DELETE /api/guestbook/:id   (x-admin-token)  → { ok:true }
async function api(req, res, url) {
  if (url.pathname === '/api/guestbook' && req.method === 'GET') {
    const limit = Math.min(PAGE_MAX, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 10));
    const before = parseInt(url.searchParams.get('before'), 10);
    const rows = (Number.isFinite(before) ? qBefore.all(before, limit + 1) : qFirst.all(limit + 1)).map(row);
    const more = rows.length > limit; const recent = more ? rows.slice(0, limit) : rows;
    return sendJson(res, 200, { count: Number(qCount.get().n), recent, next: more ? recent[recent.length - 1].id : null });
  }
  if (url.pathname === '/api/guestbook' && req.method === 'POST') {
    if (limited(clientIp(req))) return sendJson(res, 429, { error: '잠시 후 다시 남겨 주세요. (너무 자주 보냈습니다)' });
    let data;
    try { data = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: '요청 형식이 올바르지 않습니다.' }); }
    const msg = clean(data?.msg, MAX_MSG), name = clean(data?.name, MAX_NAME) || '익명';
    if (!msg) return sendJson(res, 400, { error: '한마디를 적어 주세요.' });
    const ts = Date.now();
    const { lastInsertRowid } = qInsert.run(ts, name, msg);
    return sendJson(res, 201, { ok: true, item: { id: Number(lastInsertRowid), ts, name, msg } });
  }
  const del = url.pathname.match(/^\/api\/guestbook\/(\d+)$/);
  if (del && req.method === 'DELETE') {
    if (!ADMIN_TOKEN || req.headers['x-admin-token'] !== ADMIN_TOKEN) return sendJson(res, 401, { error: 'unauthorized' });
    qDelete.run(Number(del[1]));
    return sendJson(res, 200, { ok: true });
  }
  return sendJson(res, 404, { error: 'not found' });
}

/* ---------- 5. 정적 파일 ---------- */
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(DIST, rel));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY }); return res.end('404'); }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' || file.endsWith('data.js') ? 'no-cache' : 'public, max-age=86400',
      ...SECURITY
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') return sendJson(res, 200, { ok: true });
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: 'server error' }); else res.end();
  }
}).listen(PORT, () => console.log(`청첩장 서버: http://localhost:${PORT}`));
