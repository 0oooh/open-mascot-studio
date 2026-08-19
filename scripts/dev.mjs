import { createReadStream, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const root = process.cwd()
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requested = pathname === '/' ? '/examples/web/index.html' : pathname
  const candidate = path.resolve(root, `.${requested}`)
  if (!candidate.startsWith(root)) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    const file = statSync(candidate).isDirectory() ? path.join(candidate, 'index.html') : candidate
    response.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
})

server.listen(4180, '127.0.0.1', () => {
  console.log('Open Mascot demo: http://127.0.0.1:4180/')
})
