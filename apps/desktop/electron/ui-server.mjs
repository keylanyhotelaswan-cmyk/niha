import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

/** @type {import('node:http').Server | null} */
let server = null;
let port = 0;

const MIME_BY_EXT = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * @param {import('node:http').ServerResponse} res
 * @param {string} filePath
 */
async function sendFile(res, filePath) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream');
  res.setHeader('Content-Length', fileStat.size);
  createReadStream(filePath).pipe(res);
}

export function getUiServerPort() {
  return port;
}

/**
 * @param {string} webDist
 */
export async function startUiServer(webDist) {
  if (server) return port;

  await new Promise((resolve, reject) => {
    server = createServer(async (req, res) => {
      try {
        const urlPath = (req.url ?? '/').split('?')[0] || '/';
        const relativePath = decodeURIComponent(urlPath);
        const safePath = relativePath.replace(/^\/+/, '');
        let filePath = join(webDist, safePath);

        try {
          const fileStat = await stat(filePath);
          if (fileStat.isDirectory()) {
            filePath = join(filePath, 'index.html');
          }
          await sendFile(res, filePath);
          return;
        } catch {
          // fall through to SPA index.html
        }

        await sendFile(res, join(webDist, 'index.html'));
      } catch {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server?.address();
      port = typeof address === 'object' && address ? address.port : 0;
      resolve(undefined);
    });
  });

  return port;
}

export function stopUiServer() {
  if (!server) return;
  server.close();
  server = null;
  port = 0;
}
