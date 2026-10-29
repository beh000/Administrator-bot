// HTTP-сервер мини-приложения: статика из webapp/ и JSON API /api/*.
// Работает в том же процессе, что и бот: та же база, тот же bot.api для уведомлений.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { verifyInitData } = require('./auth');
const { handle, ApiError } = require('./api');

const STATIC_DIR = path.join(__dirname, '..', 'webapp');
const MAX_BODY = 16 * 1024;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        // дальше не копим, но дочитываем — иначе клиент не получит ответ
        req.removeAllListeners('data');
        req.resume();
        reject(new ApiError(413, 'too_large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return undefined;
      if (!chunks.length) return resolve({});
      try {
        const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(data && typeof data === 'object' && !Array.isArray(data) ? data : {});
      } catch {
        reject(new ApiError(400, 'bad_json'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.normalize(path.join(STATIC_DIR, rel));
  if (!file.startsWith(STATIC_DIR + path.sep) || !TYPES[path.extname(file)]) {
    res.writeHead(404, SECURITY_HEADERS);
    return res.end('Not found');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, SECURITY_HEADERS);
      return res.end('Not found');
    }
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': TYPES[path.extname(file)],
      // после деплоя мастер сразу видит новую версию
      'Cache-Control': 'no-cache',
    });
    return res.end(req.method === 'HEAD' ? undefined : data);
  });
  return undefined;
}

function createServer({ botToken, api, getBotUsername, onError = () => {} }) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, SECURITY_HEADERS);
        return res.end();
      }
      if (url.pathname === '/health') {
        res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain' });
        return res.end('ok');
      }
      return serveStatic(req, res, url.pathname);
    }
    try {
      const auth = String(req.headers.authorization || '');
      const tgUser = auth.startsWith('tma ') ? verifyInitData(auth.slice(4), botToken) : null;
      if (!tgUser) throw new ApiError(401, 'unauthorized');
      const body = req.method === 'POST' ? await readBody(req) : {};
      const data = await handle({
        method: req.method,
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        body,
        tgUser,
        api,
        botUsername: getBotUsername(),
      });
      return sendJson(res, 200, data);
    } catch (err) {
      if (err instanceof ApiError) return sendJson(res, err.status, { error: err.code });
      console.error('[web] Ошибка API:', err);
      onError(err);
      return sendJson(res, 500, { error: 'server_error' });
    }
  });
}

module.exports = { createServer };
