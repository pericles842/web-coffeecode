// Servidor local de desarrollo (sin dependencias): node dev-server.js
// Sirve la web estática y emula /api/* de Vercel leyendo el .env local.
const http = require('http');
const fs = require('fs');
const path = require('path');

try { process.loadEnvFile('.env'); } catch (e) { console.warn('No se encontró .env'); }

const PORT = process.env.PORT || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname.startsWith('/api/')) {
    const file = path.join(__dirname, pathname + '.js');
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    res.status(200);
    const handler = require(file);
    return Promise.resolve(handler(req, res)).catch(() => { res.statusCode = 500; res.end('Error'); });
  }

  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(__dirname, rel);
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
