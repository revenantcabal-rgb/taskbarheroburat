'use strict';
/* Minimal static file server for the Playwright E2E run — node-only, ZERO deps, portable (Windows + CI ubuntu).
   Serves the repo root so the renderer (dashboard.html) loads exactly as it does in the browser/desktop build. */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..', '..');
const port = +process.env.PORT || 8778;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.es3': 'application/octet-stream', '.log': 'text/plain', '.woff2': 'font/woff2' };

http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/dashboard.html';
  const fp = path.normalize(path.join(root, u));
  if (!fp.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(fp, (e, buf) => {
    if (e) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(port, '127.0.0.1', () => console.log('e2e static server on http://127.0.0.1:' + port));
